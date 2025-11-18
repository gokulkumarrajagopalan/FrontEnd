# Tally Prime - Desktop Application

Professional Accounting & ERP System built with Electron and Spring Boot.

## 📋 Project Structure

```
DesktopApp/
├── main.js              # Electron main process
├── index.html           # Main HTML entry point
├── router.js            # Page routing system
├── package.json         # Dependencies
│
├── pages/               # Page templates and scripts
│   ├── home.html/js     # Home page
│   ├── dashboard.html/js # Dashboard with financial overview
│   ├── vouchers.html/js  # Voucher management
│   ├── ledgers.html/js   # Ledger management
│   ├── groups.html/js    # Account groups
│   ├── items.html/js     # Inventory management
│   ├── reports.html/js   # Financial reports
│   └── settings.html/js  # Application settings
│
├── assets/              # Images and resources
├── styles.css           # Global styles
└── utils.js             # Utility functions
```

## 🚀 Features

### 1. **Home Screen**
- Welcome banner with key features
- Quick action buttons to navigate to different sections
- Feature overview

### 2. **Dashboard**
- Financial overview with key metrics:
  - Total Income
  - Total Expenses
  - Net Balance
  - Total Items
- Recent vouchers table
- Top ledgers summary

### 3. **Voucher Management**
- Create and manage transaction vouchers
- Voucher types: Cash Receipt, Cash Payment, Bank Receipt, Bank Payment, Journal
- Search and filter by type
- Edit and delete vouchers

### 4. **Ledger Management**
- Create and manage ledger accounts
- Link ledgers to account groups
- Track opening and closing balances
- Filter by group

### 5. **Account Groups**
- Manage account groups (Assets, Liabilities, Equity, Income, Expense)
- Organize ledgers by type
- Add descriptions

### 6. **Inventory Management (Items)**
- Manage products and inventory items
- Track stock and rates
- Support multiple units (PCS, KG, LTR, MTR, BOX)
- Monitor inventory value

### 7. **Reports**
- **Trial Balance**: Verify all ledger balances
- **Balance Sheet**: Assets vs Liabilities & Equity
- **Profit & Loss**: Income vs Expenses
- **Ledger Summary**: Individual account statements
- **Inventory Report**: Stock and item details
- **Cash Flow**: Inflow and outflow analysis

### 8. **Settings**
- Application configuration
- Backend API connection setup
- Display preferences (currency, decimal places)
- Data management (export, backup, reset)
- Application information

## 🔌 API Integration

The application connects to a Spring Boot backend at `http://localhost:8080/api`

### Available Endpoints:
- `GET/POST /api/groups` - Manage account groups
- `GET/POST /api/ledgers` - Manage ledgers
- `GET/POST /api/vouchers` - Manage vouchers
- `GET/POST /api/items` - Manage items

## 🎨 UI Components

### Navigation
- **Sidebar Navigation**: Primary navigation with all main sections
- **Top Navigation Bar**: Secondary navigation with search and tools
- **Breadcrumbs**: Show current location (can be added)

### Forms
- Modal-based forms for creating/editing records
- Form validation
- Success/error notifications

### Tables
- Responsive data tables
- Search and filter capabilities
- Edit and delete actions
- Pagination (can be added)

### Alerts
- Success, error, warning, and info alerts
- Auto-dismiss after 3 seconds
- Positioned in top-right corner

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Desktop Framework**: Electron
- **Backend**: Spring Boot (running on localhost:8080)
- **Data Storage**: Backend API

## 📦 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- Spring Boot backend running on `http://localhost:8080`

### Installation

1. **Install dependencies:**
```bash
cd C:\Users\HP\DesktopApp
npm install
```

2. **Start the application:**
```bash
npm start
```

3. **Development mode (with DevTools):**
```bash
npm run dev
```

## 🏗️ Building for Distribution

### Create installer (Windows):
```bash
npm run build
```

### Create portable executable:
```bash
npm run pack
```

## 📱 Responsive Design

The application is designed to work on:
- Desktop (primary)
- Tablet (reduced sidebar width)
- Smaller screens (collapsed navigation)

## 🔄 Data Flow

1. **User Action** → Navigation click
2. **Router** → Loads page template and script
3. **API Call** → Fetches data from Spring Boot backend
4. **Render** → Displays data in table/form
5. **User Edit** → Form submission
6. **API Update** → Sends data to backend
7. **Refresh** → Reloads data

## 🔐 Security Notes

- Context isolation enabled in Electron
- No direct Node.js integration in renderer
- API calls validated on backend
- Local storage for non-sensitive settings

## 🎯 Usage Guide

### Creating a Voucher
1. Click "Vouchers" in sidebar
2. Click "+ Create Voucher"
3. Fill in voucher details
4. Click "Save"

### Adding a Ledger
1. Click "Ledgers" in sidebar
2. Click "+ Add Ledger"
3. Select group and enter details
4. Click "Save"

### Viewing Reports
1. Click "Reports" in sidebar
2. Select desired report type
3. View generated report
4. Print or export as needed

### Configuring Settings
1. Click "Settings" in sidebar
2. Update API URL if needed
3. Test connection
4. Save preferences

## 🐛 Troubleshooting

### Backend Connection Error
- Ensure Spring Boot is running on `http://localhost:8080`
- Check firewall settings
- Test connection in Settings

### No Data Displayed
- Verify backend API is accessible
- Check browser console for errors (press F12)
- Ensure data exists in backend

### Port 8080 Already in Use
- Change backend port and update API URL in settings
- Or kill the process using port 8080

## 📝 Development Notes

### Adding a New Page
1. Create `pages/newpage.html` and `pages/newpage.js`
2. Add route in `router.js`
3. Add nav link in `index.html`
4. Implement page functionality

### Modifying Styles
- Edit styles within page HTML files
- Or update global `styles.css`
- Remember to test responsive design

### API Integration
- Use `fetch()` to call backend API
- Handle errors gracefully
- Show alerts for user feedback

## 📄 License

MIT License - See LICENSE file for details

## 👨‍💻 Author

Tally Prime Development Team

## 📞 Support

For issues or feature requests, please contact the development team.

---

**Version**: 1.0.0  
**Last Updated**: November 2025
