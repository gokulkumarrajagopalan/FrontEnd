/**
 * Groups Service
 * Handles all API calls related to account groups
 */

class GroupsService {
    constructor() {
        this.apiConfig = window.apiConfig;
    }

    getHeaders() {
        const token = sessionStorage.getItem('authToken');
        const deviceToken = sessionStorage.getItem('deviceToken');
        const csrfToken = sessionStorage.getItem('csrfToken');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...(deviceToken && { 'X-Device-Token': deviceToken }),
            ...(csrfToken && { 'X-CSRF-Token': csrfToken })
        };
    }

    /**
     * Get all groups
     */
    async getAllGroups() {
        const response = await fetch(this.apiConfig.getUrl('/groups'), {
            method: 'GET',
            headers: this.getHeaders()
        });
        return await response.json();
    }

    /**
     * Get groups by company ID
     */
    async getGroupsByCompany(companyId) {
        const response = await fetch(this.apiConfig.getUrl(`/groups/company/${companyId}`), {
            method: 'GET',
            headers: this.getHeaders()
        });
        return await response.json();
    }

    /**
     * Get active groups for a company
     */
    async getActiveGroups(companyId) {
        const response = await fetch(this.apiConfig.getUrl(`/groups/company/${companyId}/active`), {
            method: 'GET',
            headers: this.getHeaders()
        });
        return await response.json();
    }

    /**
     * Get group by ID
     */
    async getGroupById(groupId) {
        const response = await fetch(this.apiConfig.getUrl(`/groups/${groupId}`), {
            method: 'GET',
            headers: this.getHeaders()
        });
        return await response.json();
    }

    /**
     * Get group by GUID
     */
    async getGroupByGuid(guid) {
        const response = await fetch(this.apiConfig.getUrl(`/groups/guid/${guid}`), {
            method: 'GET',
            headers: this.getHeaders()
        });
        return await response.json();
    }

    /**
     * Get primary groups (top-level)
     */
    async getPrimaryGroups(companyId) {
        const response = await fetch(this.apiConfig.getUrl(`/groups/company/${companyId}/primary`), {
            method: 'GET',
            headers: this.getHeaders()
        });
        return await response.json();
    }

    /**
     * Get revenue groups (P&L)
     */
    async getRevenueGroups(companyId) {
        const response = await fetch(this.apiConfig.getUrl(`/groups/company/${companyId}/revenue`), {
            method: 'GET',
            headers: this.getHeaders()
        });
        return await response.json();
    }

    /**
     * Get balance sheet groups
     */
    async getBalanceSheetGroups(companyId) {
        const response = await fetch(this.apiConfig.getUrl(`/groups/company/${companyId}/balancesheet`), {
            method: 'GET',
            headers: this.getHeaders()
        });
        return await response.json();
    }

    /**
     * Get group hierarchy tree
     */
    async getGroupHierarchy(companyId) {
        const response = await fetch(this.apiConfig.getUrl(`/groups/company/${companyId}/hierarchy`), {
            method: 'GET',
            headers: this.getHeaders()
        });
        return await response.json();
    }

    /**
     * Search groups by name
     */
    async searchGroups(companyId, searchTerm) {
        const response = await fetch(this.apiConfig.getUrl(`/groups/company/${companyId}/search?term=${encodeURIComponent(searchTerm)}`), {
            method: 'GET',
            headers: this.getHeaders()
        });
        return await response.json();
    }

    /**
     * Get child groups of a parent
     */
    async getChildGroups(parentGrpId) {
        const response = await fetch(this.apiConfig.getUrl(`/groups/${parentGrpId}/children`), {
            method: 'GET',
            headers: this.getHeaders()
        });
        return await response.json();
    }

    /**
     * Create new group
     */
    async createGroup(groupData) {
        const response = await fetch(this.apiConfig.getUrl('/groups'), {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(groupData)
        });
        return await response.json();
    }

    /**
     * Sync groups from Tally (bulk upsert)
     */
    async syncGroups(groups) {
        const response = await fetch(this.apiConfig.getUrl('/groups/sync'), {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(groups)
        });
        return await response.json();
    }

    /**
     * Update existing group
     */
    async updateGroup(groupId, groupData) {
        const response = await fetch(this.apiConfig.getUrl(`/groups/${groupId}`), {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(groupData)
        });
        return await response.json();
    }

    /**
     * Soft delete group
     */
    async deleteGroup(groupId) {
        const response = await fetch(this.apiConfig.getUrl(`/groups/${groupId}`), {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        return await response.json();
    }

    /**
     * Hard delete group (permanent)
     */
    async hardDeleteGroup(groupId) {
        const response = await fetch(this.apiConfig.getUrl(`/groups/${groupId}/hard`), {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        return await response.json();
    }

    /**
     * Fetch groups from Tally Prime via XML API
     */
    async fetchGroupsFromTally() {
        // Get Tally port from settings
        const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        const tallyPort = appSettings.tallyPort || 9000;
        const tallyUrl = `http://localhost:${tallyPort}`;

        console.log(`Fetching groups from Tally at ${tallyUrl}...`);

        const response = await fetch(tallyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/xml' },
            body: `<ENVELOPE>
                <HEADER>
                    <VERSION>1</VERSION>
                    <TALLYREQUEST>Export</TALLYREQUEST>
                    <TYPE>Collection</TYPE>
                    <ID>AllGroups</ID>
                </HEADER>
                <BODY>
                    <DESC>
                        <STATICVARIABLES>
                            <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                        </STATICVARIABLES>
                        <TDL>
                            <TDLMESSAGE>
                                <COLLECTION NAME="AllGroups" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No">
                                    <TYPE>Group</TYPE>
                                    <FETCH>GUID, MASTERID, ALTERID, NAME, PARENT, ISREVENUE</FETCH>
                                </COLLECTION>
                            </TDLMESSAGE>
                        </TDL>
                    </DESC>
                </BODY>
            </ENVELOPE>`
        });

        if (!response.ok) {
            throw new Error(`Failed to connect to Tally Prime at ${tallyUrl}`);
        }

        const xmlText = await response.text();
        return this.parseGroupsXML(xmlText);
    }

    /**
     * Parse Tally XML response to extract groups
     */
    parseGroupsXML(xmlText) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const groupElements = xmlDoc.querySelectorAll('GROUP');

        return Array.from(groupElements).map(elem => {
            const getTextContent = (tag) => {
                const node = elem.querySelector(tag);
                return node ? node.textContent.trim() : '';
            };

            return {
                grpName: elem.getAttribute('NAME') || '',
                guid: getTextContent('GUID'),
                masterId: parseInt(getTextContent('MASTERID')) || 0,
                alterId: parseInt(getTextContent('ALTERID')) || 0,
                grpParent: getTextContent('PARENT') || 'Primary',
                isRevenue: getTextContent('ISREVENUE') === 'Yes',
                isActive: true
            };
        });
    }
}

// Create global instance
window.groupsService = new GroupsService();

console.log('✅ Groups Service initialized');
