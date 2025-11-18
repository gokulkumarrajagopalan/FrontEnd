# 🚀 Tally Prime Desktop App - Quick Start Guide

## ⚡ Quick Setup

### Step 1: Ensure Backend is Running
Make sure your Spring Boot backend is running on:
```
http://localhost:8080
```

### Step 2: Install Dependencies
```bash
cd C:\Users\HP\DesktopApp
npm install
```

### Step 3: Start the Application
```bash
npm start
```

The Electron application will launch immediately!

## 📖 Navigation

### Sidebar Menu Items
| Icon | Name | Purpose |
|------|------|---------|
| 🏠 | Home | Welcome page with quick actions |
| 📊 | Dashboard | Financial overview & metrics |
| 📋 | Vouchers | Create and manage transactions |
| 📑 | Ledgers | Manage accounts |
| 👥 | Groups | Account groups (Asset, Liability, etc.) |
| 📦 | Items | Inventory management |
| 📈 | Reports | Financial statements |
| ⚙️ | Settings | Configuration |

## 🎯 Common Tasks

### Create a New Voucher
1. Click **Vouchers** from sidebar
2. Click **+ Create Voucher**
3. Fill in:
   - Voucher Type (Cash Receipt, Payment, etc.)
   - Date
   - Amount
   - Narration (optional)
4. Click **Save**

### Add a New Ledger
1. Click **Ledgers** from sidebar
2. Click **+ Add Ledger**
3. Fill in:
   - Ledger Name
   - Group (select from dropdown)
   - Opening Balance
4. Click **Save**

### Create Account Group
1. Click **Groups** from sidebar
2. Click **+ Add Group**
3. Fill in:
   - Group Name
   - Type (Assets, Liabilities, Equity, Income, Expense)
   - Description (optional)
4. Click **Save**

### Add Inventory Items
1. Click **Items** from sidebar
2. Click **+ Add Item**
3. Fill in:
   - Item Name
   - Category
   - Unit (PCS, KG, LTR, MTR, BOX)
   - Opening Stock
   - Rate
4. Click **Save**

### View Financial Reports
1. Click **Reports** from sidebar
2. Select report type:
   - Trial Balance
   - Balance Sheet
   - Profit & Loss
   - Ledger Summary
   - Inventory Report
   - Cash Flow
3. Report displays automatically

### Configure Settings
1. Click **Settings** from sidebar
2. Update:
   - Application name
   - Organization name
   - Financial year dates
   - API URL
   - Display preferences
3. Click **Save**

## 🔗 API Connection

The app connects to your Spring Boot backend. If using different port:

1. Go to **Settings**
2. Update **API Base URL** 
3. Click **Test Connection**
4. Verify success message

Default: `http://localhost:8080/api`

## 📊 Dashboard Overview

The dashboard shows:
- **Total Income**: Sum of all incoming transactions
- **Total Expenses**: Sum of all outgoing transactions
- **Net Balance**: Income minus expenses
- **Total Items**: Number of inventory items
- **Recent Vouchers**: Latest 5 transactions
- **Top Ledgers**: Summary of key accounts

## 🔍 Search & Filter

Most pages support:
- **Text Search**: Search by name or ID
- **Dropdown Filters**: Filter by category/group/type
- **Real-time Results**: Updates as you type

## 💾 Data Management

In Settings you can:
- **Export Data**: Download all data as JSON
- **Create Backup**: Save backup of database
- **Reset App**: Clear all local settings (backend data unchanged)

## ⚠️ Important Notes

1. **Backend Required**: App won't work without Spring Boot backend running
2. **Local Settings**: User preferences stored locally, not in backend
3. **Data Sync**: All business data synced with backend API
4. **Multi-user**: Each user gets their own desktop instance

## 🆘 Troubleshooting

### App won't start
- Check Node.js is installed: `node --version`
- Reinstall dependencies: `npm install`
- Check for port conflicts

### Can't connect to backend
- Verify Spring Boot is running
- Check URL in Settings: `http://localhost:8080/api`
- Check firewall settings
- Try pinging: `curl http://localhost:8080`

### No data showing
- Wait a moment for data to load
- Press F12 to check console errors
- Verify backend API is accessible

### Forms not submitting
- Check required fields (marked with *)
- Verify backend is running
- Check console for error messages

## 📞 Support

For issues, check:
1. Console errors (F12)
2. Backend logs
3. Network tab in DevTools
4. README.md for more details

## 🎓 Learn More

See **README.md** for:
- Complete feature documentation
- Technology stack details
- Development guidelines
- Building for distribution

---

**Tip**: Use F12 to open Developer Tools for debugging
**Tip**: Check Settings → Test Connection to verify backend connectivity

Enjoy using Tally Prime! 📈
