#!/usr/bin/env python3
"""
Financial Year Sync Manager
Handles Balance Sheet, P&L, and Trial Balance syncing with:
- Full dump from sync start date to current date
- Financial year-wise syncing (e.g., 2021-22, 22-23, etc.)
- Automatic financial year identification
"""

import os
import sys
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import requests
import xml.etree.ElementTree as ET

from sync_logger import get_sync_logger

logger = get_sync_logger()


class FinancialYear:
    """Represents an Indian financial year (Apr 1 - Mar 31)"""
    
    def __init__(self, start_year: int):
        """
        Initialize financial year
        Args:
            start_year: Calendar year when FY starts (e.g., 2024 for FY 2024-25)
        """
        self.start_year = start_year
        self.end_year = start_year + 1
        self.start_date = f"{start_year}0401"
        self.end_date = f"{self.end_year}0331"
        self.display_name = f"{start_year}-{str(end_year)[-2:]}"
    
    def __repr__(self):
        return self.display_name
    
    @staticmethod
    def from_date(date_str: str) -> 'FinancialYear':
        """Get FY from a date string (YYYYMMDD format)"""
        year = int(date_str[:4])
        month = int(date_str[4:6])
        fy_start = year if month >= 4 else year - 1
        return FinancialYear(fy_start)
    
    @staticmethod
    def get_all_years(start_date: str, end_date: str) -> List['FinancialYear']:
        """Get all financial years between two dates"""
        start_fy = FinancialYear.from_date(start_date)
        end_fy = FinancialYear.from_date(end_date)
        
        years = []
        current = start_fy.start_year
        while current <= end_fy.start_year:
            years.append(FinancialYear(current))
            current += 1
        
        return years
    
    def clip_dates(self, start_date: str, end_date: str) -> Tuple[str, str]:
        """Clip given dates to this FY's boundaries"""
        clipped_start = max(start_date, self.start_date)
        clipped_end = min(end_date, self.end_date)
        return (clipped_start, clipped_end)


class CompanyFinancialConfig:
    """Configuration for a company's financial sync"""
    
    def __init__(self, company_id: int, company_name: str, cmp_guid: str):
        self.company_id = company_id
        self.company_name = company_name
        self.cmp_guid = cmp_guid
        self.sync_start_date = None
        self.sync_interval = "MONTHLY"  # MONTHLY, YEARLY, QUARTERLY
        self.last_sync_date = None
    
    def to_dict(self) -> Dict:
        return {
            'companyId': self.company_id,
            'companyName': self.company_name,
            'cmpGuid': self.cmp_guid,
            'syncStartDate': self.sync_start_date,
            'syncInterval': self.sync_interval,
            'lastSyncDate': self.last_sync_date
        }


class FinancialYearSyncManager:
    """
    Manages financial data syncing with financial year tracking
    Supports Balance Sheet, P&L, and Trial Balance
    """
    
    def __init__(self, backend_url: str, auth_token: str, device_token: str, 
                 tally_host: str = 'localhost', tally_port: int = 9000):
        self.backend_url = backend_url.rstrip('/')
        self.auth_token = auth_token
        self.device_token = device_token
        self.tally_url = f"http://{tally_host}:{tally_port}"
        
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {auth_token}',
            'X-Device-Token': device_token
        }
    
    def get_company_sync_config(self, company_id: int) -> Optional[CompanyFinancialConfig]:
        """Fetch company's sync configuration from backend"""
        try:
            url = f"{self.backend_url}/companies/{company_id}/financial-config"
            resp = requests.get(url, headers=self.headers, timeout=10)
            
            if resp.status_code == 200:
                data = resp.json()
                config = CompanyFinancialConfig(
                    company_id=data['companyId'],
                    company_name=data['companyName'],
                    cmp_guid=data.get('cmpGuid', '')
                )
                config.sync_start_date = data.get('syncStartDate') or '20210401'
                config.last_sync_date = data.get('lastSyncDate')
                return config
        except Exception as e:
            logger.warning(f"Could not fetch company config: {e}")
        
        return None
    
    def sync_financial_reports(self, company_id: int, company_name: str, 
                               report_types: List[str], full_dump: bool = False) -> Dict:
        """
        Sync financial reports with financial year tracking
        
        Args:
            company_id: Company ID
            company_name: Company name in Tally
            report_types: ['balancesheet', 'profitloss', 'trailbalance']
            full_dump: If True, fetch from sync start date; else from current FY only
        
        Returns:
            Sync result with status for each report type
        """
        
        # Get company config (sync start date)
        config = self.get_company_sync_config(company_id)
        
        if not config or not config.sync_start_date:
            logger.warning(f"Company {company_id} has no sync start date configured")
            sync_from = '20210401'  # Default fallback
        else:
            sync_from = config.sync_start_date
        
        today = datetime.now().strftime('%Y%m%d')
        
        # Determine date ranges
        if full_dump:
            logger.info(f"Full dump sync: {sync_from} to {today}")
            date_ranges = [{'start': sync_from, 'end': today, 'fy': 'FULL_DUMP', 'label': 'Full Data'}]
        else:
            # Get all financial years in range
            fys = FinancialYear.get_all_years(sync_from, today)
            date_ranges = []
            
            for fy in fys:
                fy_start, fy_end = fy.clip_dates(sync_from, today)
                date_ranges.append({
                    'start': fy_start,
                    'end': fy_end,
                    'fy': fy.start_year,
                    'label': str(fy)
                })
        
        results = {
            'company_id': company_id,
            'company_name': company_name,
            'sync_date': datetime.now().isoformat(),
            'date_ranges': date_ranges,
            'reports': {}
        }
        
        # Sync each report type for each date range
        for report_type in report_types:
            logger.info(f"\n📊 Syncing {report_type}...")
            
            report_results = []
            for date_range in date_ranges:
                logger.info(f"  📅 Period: {date_range['label']} ({date_range['start']} - {date_range['end']})")
                
                if report_type == 'balancesheet':
                    result = self._sync_balance_sheet(
                        company_name, date_range['start'], date_range['end'],
                        financial_year=date_range['fy']
                    )
                elif report_type == 'profitloss':
                    result = self._sync_profit_loss(
                        company_name, date_range['start'], date_range['end'],
                        financial_year=date_range['fy']
                    )
                elif report_type == 'trailbalance':
                    result = self._sync_trial_balance(
                        company_name, date_range['start'], date_range['end'],
                        financial_year=date_range['fy']
                    )
                else:
                    result = {'success': False, 'error': f'Unknown report type: {report_type}'}
                
                report_results.append({
                    'period': date_range['label'],
                    'fy': date_range['fy'],
                    **result
                })
            
            results['reports'][report_type] = report_results
        
        return results
    
    def _sync_balance_sheet(self, company_name: str, from_date: str, to_date: str, 
                            financial_year: int = None) -> Dict:
        """Sync Balance Sheet for a date range"""
        try:
            logger.info(f"  📥 Fetching Balance Sheet...")
            
            # TDL to fetch balance sheet
            tdl = self._get_balance_sheet_tdl(company_name, from_date, to_date)
            resp = requests.post(self.tally_url, data=tdl.encode('utf-8'), timeout=60)
            
            if resp.status_code != 200:
                return {
                    'success': False,
                    'error': f'Tally error: {resp.status_code}',
                    'records_count': 0
                }
            
            # Parse XML response
            xml_data = self._clean_xml(resp.text)
            parsed_data = self._parse_balance_sheet_xml(xml_data, financial_year)
            
            # Sync to backend
            endpoint = f"{self.backend_url}/reports/balancesheet/sync"
            sync_resp = requests.post(endpoint, json=parsed_data, headers=self.headers, timeout=30)
            
            if sync_resp.status_code in [200, 201]:
                return {
                    'success': True,
                    'records_count': len(parsed_data),
                    'message': f'Synced {len(parsed_data)} balance sheet records'
                }
            else:
                return {
                    'success': False,
                    'error': f'Backend error: {sync_resp.status_code}',
                    'records_count': len(parsed_data)
                }
        
        except Exception as e:
            logger.error(f"Balance Sheet sync error: {e}")
            return {'success': False, 'error': str(e), 'records_count': 0}
    
    def _sync_profit_loss(self, company_name: str, from_date: str, to_date: str, 
                          financial_year: int = None) -> Dict:
        """Sync P&L for a date range"""
        try:
            logger.info(f"  📥 Fetching Profit & Loss...")
            
            tdl = self._get_profit_loss_tdl(company_name, from_date, to_date)
            resp = requests.post(self.tally_url, data=tdl.encode('utf-8'), timeout=60)
            
            if resp.status_code != 200:
                return {
                    'success': False,
                    'error': f'Tally error: {resp.status_code}',
                    'records_count': 0
                }
            
            xml_data = self._clean_xml(resp.text)
            parsed_data = self._parse_profit_loss_xml(xml_data, financial_year)
            
            endpoint = f"{self.backend_url}/reports/profitloss/sync"
            sync_resp = requests.post(endpoint, json=parsed_data, headers=self.headers, timeout=30)
            
            if sync_resp.status_code in [200, 201]:
                return {
                    'success': True,
                    'records_count': len(parsed_data),
                    'message': f'Synced {len(parsed_data)} P&L records'
                }
            else:
                return {
                    'success': False,
                    'error': f'Backend error: {sync_resp.status_code}',
                    'records_count': len(parsed_data)
                }
        
        except Exception as e:
            logger.error(f"P&L sync error: {e}")
            return {'success': False, 'error': str(e), 'records_count': 0}
    
    def _sync_trial_balance(self, company_name: str, from_date: str, to_date: str, 
                            financial_year: int = None) -> Dict:
        """Sync Trial Balance for a date range"""
        try:
            logger.info(f"  📥 Fetching Trial Balance...")
            
            tdl = self._get_trial_balance_tdl(company_name, from_date, to_date)
            resp = requests.post(self.tally_url, data=tdl.encode('utf-8'), timeout=60)
            
            if resp.status_code != 200:
                return {
                    'success': False,
                    'error': f'Tally error: {resp.status_code}',
                    'records_count': 0
                }
            
            xml_data = self._clean_xml(resp.text)
            parsed_data = self._parse_trial_balance_xml(xml_data, financial_year)
            
            endpoint = f"{self.backend_url}/reports/trailbalance/sync"
            sync_resp = requests.post(endpoint, json=parsed_data, headers=self.headers, timeout=30)
            
            if sync_resp.status_code in [200, 201]:
                return {
                    'success': True,
                    'records_count': len(parsed_data),
                    'message': f'Synced {len(parsed_data)} trial balance records'
                }
            else:
                return {
                    'success': False,
                    'error': f'Backend error: {sync_resp.status_code}',
                    'records_count': len(parsed_data)
                }
        
        except Exception as e:
            logger.error(f"Trial Balance sync error: {e}")
            return {'success': False, 'error': str(e), 'records_count': 0}
    
    def _get_balance_sheet_tdl(self, company_name: str, from_date: str, to_date: str) -> str:
        """Generate TDL query for Balance Sheet"""
        return f"""<ENVELOPE>
            <HEADER>
                <VERSION>1</VERSION>
                <TALLYREQUEST>Export</TALLYREQUEST>
                <TYPE>Data</TYPE>
            </HEADER>
            <BODY>
                <DESC>
                    <STATICVARIABLES>
                        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                        <SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>
                        <SVFROMDATE TYPE='Date'>{from_date}</SVFROMDATE>
                        <SVTODATE TYPE='Date'>{to_date}</SVTODATE>
                    </STATICVARIABLES>
                    <TDL>
                        <TDLMESSAGE>
                            <REPORT NAME='Balance Sheet' ISMODIFY='No' ISFIXED='No'>
                                <VARIABLE>SVFROMDATE,SVTODATE,SVEXPORTFORMAT,SVCURRENTCOMPANY</VARIABLE>
                                <USE>Balance Sheet</USE>
                            </REPORT>
                        </TDLMESSAGE>
                    </TDL>
                </DESC>
            </BODY>
        </ENVELOPE>"""
    
    def _get_profit_loss_tdl(self, company_name: str, from_date: str, to_date: str) -> str:
        """Generate TDL query for Profit & Loss"""
        return f"""<ENVELOPE>
            <HEADER>
                <VERSION>1</VERSION>
                <TALLYREQUEST>Export</TALLYREQUEST>
                <TYPE>Data</TYPE>
            </HEADER>
            <BODY>
                <DESC>
                    <STATICVARIABLES>
                        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                        <SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>
                        <SVFROMDATE TYPE='Date'>{from_date}</SVFROMDATE>
                        <SVTODATE TYPE='Date'>{to_date}</SVTODATE>
                    </STATICVARIABLES>
                    <TDL>
                        <TDLMESSAGE>
                            <REPORT NAME='Profit and Loss' ISMODIFY='No' ISFIXED='No'>
                                <VARIABLE>SVFROMDATE,SVTODATE,SVEXPORTFORMAT,SVCURRENTCOMPANY</VARIABLE>
                                <USE>Profit and Loss</USE>
                            </REPORT>
                        </TDLMESSAGE>
                    </TDL>
                </DESC>
            </BODY>
        </ENVELOPE>"""
    
    def _get_trial_balance_tdl(self, company_name: str, from_date: str, to_date: str) -> str:
        """Generate TDL query for Trial Balance"""
        return f"""<ENVELOPE>
            <HEADER>
                <VERSION>1</VERSION>
                <TALLYREQUEST>Export</TALLYREQUEST>
                <TYPE>Data</TYPE>
            </HEADER>
            <BODY>
                <DESC>
                    <STATICVARIABLES>
                        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                        <SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>
                        <SVFROMDATE TYPE='Date'>{from_date}</SVFROMDATE>
                        <SVTODATE TYPE='Date'>{to_date}</SVTODATE>
                    </STATICVARIABLES>
                    <TDL>
                        <TDLMESSAGE>
                            <REPORT NAME='Trial Balance' ISMODIFY='No' ISFIXED='No'>
                                <VARIABLE>SVFROMDATE,SVTODATE,SVEXPORTFORMAT,SVCURRENTCOMPANY</VARIABLE>
                                <USE>Trial Balance</USE>
                            </REPORT>
                        </TDLMESSAGE>
                    </TDL>
                </DESC>
            </BODY>
        </ENVELOPE>"""
    
    @staticmethod
    def _clean_xml(xml_text: str) -> str:
        """Clean invalid XML characters"""
        invalid_chars = ['&#4;', '&#3;', '&#2;', '&#1;', '&#0;']
        for char in invalid_chars:
            xml_text = xml_text.replace(char, '')
        return xml_text
    
    @staticmethod
    def _parse_balance_sheet_xml(xml_data: str, financial_year: int = None) -> List[Dict]:
        """Parse Balance Sheet XML and add financial year field"""
        parsed = []
        try:
            root = ET.fromstring(xml_data)
            for elem in root:
                record = {
                    'name': elem.findtext('DSPDISPNAME', ''),
                    'guid': elem.findtext('GUID', ''),
                    'isGroup': elem.findtext('ISGROUP', ''),
                    'parentGroup': elem.findtext('PARENTGRP', ''),
                    'debitAmount': elem.findtext('BSSUBAMT', ''),
                    'creditAmount': elem.findtext('BSMAINAMT', '')
                }
                if financial_year:
                    record['financialYear'] = financial_year
                parsed.append(record)
        except Exception as e:
            logger.error(f"Error parsing Balance Sheet: {e}")
        
        return parsed
    
    @staticmethod
    def _parse_profit_loss_xml(xml_data: str, financial_year: int = None) -> List[Dict]:
        """Parse P&L XML and add financial year field"""
        parsed = []
        try:
            root = ET.fromstring(xml_data)
            for elem in root:
                record = {
                    'name': elem.findtext('DSPDISPNAME', ''),
                    'guid': elem.findtext('GUID', ''),
                    'isGroup': elem.findtext('ISGROUP', ''),
                    'parentGroup': elem.findtext('PARENTGRP', ''),
                    'subAmount': elem.findtext('PLSUBAMT', ''),
                    'mainAmount': elem.findtext('PLMAINAMT', '')
                }
                if financial_year:
                    record['financialYear'] = financial_year
                parsed.append(record)
        except Exception as e:
            logger.error(f"Error parsing P&L: {e}")
        
        return parsed
    
    @staticmethod
    def _parse_trial_balance_xml(xml_data: str, financial_year: int = None) -> List[Dict]:
        """Parse Trial Balance XML and add financial year field"""
        parsed = []
        try:
            root = ET.fromstring(xml_data)
            for elem in root:
                record = {
                    'name': elem.findtext('DSPDISPNAME', ''),
                    'guid': elem.findtext('GUID', ''),
                    'isGroup': elem.findtext('ISGROUP', ''),
                    'parentGroup': elem.findtext('PARENTGRP', ''),
                    'debitAmount': elem.findtext('DSPCLDRAMTA', ''),
                    'creditAmount': elem.findtext('DSPCLCRAMTA', '')
                }
                if financial_year:
                    record['financialYear'] = financial_year
                parsed.append(record)
        except Exception as e:
            logger.error(f"Error parsing Trial Balance: {e}")
        
        return parsed
