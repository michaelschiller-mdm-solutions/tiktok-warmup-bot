# Standalone Instagram Token Fetcher

A standalone HTML file for fetching Instagram tokens without database access. Perfect for VPS deployment.

## Files

- `standalone-token-fetcher.html` - The main HTML application
- `export-accounts.js` - Script to export accounts from your database
- `accounts-export-2025-08-04.json` - Your exported accounts data

## How to Use

### 1. Export Data from Your Database
```bash
node backend/export-accounts.js
```
This creates:
- `accounts-export-YYYY-MM-DD.json` (JSON format)
- `accounts-export-YYYY-MM-DD.csv` (CSV format)

### 2. Deploy to VPS
1. Upload `standalone-token-fetcher.html` to your VPS
2. Upload the exported accounts file (JSON or CSV)
3. Serve the HTML file with a web server

### 3. Use the Application
1. **Import Data**: Click "Import Accounts" and select your exported file
2. **Fetch Tokens**: Use "Get Token" for individual accounts or "Fetch All Tokens" for bulk
3. **Export Results**: Click "Export Data" to download the updated data with tokens

## Features

### 📊 Account Management
- Import JSON or CSV files
- Display all accounts in a table
- Real-time statistics (total, tokens, pending)

### 🔐 Token Fetching
- Individual token fetching with "Get Token" button
- Bulk token fetching with progress bar
- Automatic clipboard copying
- Token display with click-to-view modal

### 💾 Data Export
- Export updated data with tokens
- JSON format with timestamps
- Automatic file naming with dates

### 🎨 User Interface
- Modern, responsive design
- Progress indicators
- Status notifications
- Token security (masked display)

## API Configuration

The HTML file currently uses these endpoints:
- `POST /automation/fetch-manual-token` - Fetch token for an account

**To use with your VPS:**
1. Update the API endpoint URLs in the HTML file
2. Ensure your VPS has access to the token fetching API
3. Or modify the fetch calls to use your specific API structure

## Data Format

### Import Format (JSON)
```json
{
  "exported_at": "2025-08-04T...",
  "total_accounts": 154,
  "accounts": [
    {
      "id": 60,
      "username": "mamah22hh",
      "email": "pthzchqona@rambler.ru",
      "password": "Tigermoon87",
      "email_password": "6273485MlweDA",
      "status": "active",
      "lifecycle_state": "ready"
    }
  ]
}
```

### Import Format (CSV)
```csv
id,username,email,password,email_password,status,lifecycle_state
60,mamah22hh,pthzchqona@rambler.ru,Tigermoon87,6273485MlweDA,active,ready
```

## Security Notes

- Tokens are masked in the display (••••••••••••••••••••••••••••••••••••••••)
- Click tokens to view full value in modal
- Data is processed client-side (no server storage)
- Export files contain sensitive data - handle securely

## Deployment Options

### Simple HTTP Server
```bash
# Python 3
python -m http.server 8000

# Node.js
npx http-server

# PHP
php -S localhost:8000
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        root /path/to/your/files;
        index standalone-token-fetcher.html;
    }
}
```

## Troubleshooting

### Import Issues
- Ensure file format is JSON or CSV
- Check that required fields (email, password) are present
- Verify file encoding is UTF-8

### Token Fetching Issues
- Update API endpoint URLs in the HTML file
- Check network connectivity to your API
- Verify account credentials are correct

### Export Issues
- Ensure browser allows downloads
- Check available disk space
- Verify file permissions on VPS

## Customization

### Modify API Endpoints
Edit the `fetchToken` and `fetchAllTokens` functions in the HTML file to match your API structure.

### Add More Fields
Update the table headers and rendering logic to display additional account fields.

### Change Styling
Modify the CSS in the `<style>` section to match your brand or preferences. 