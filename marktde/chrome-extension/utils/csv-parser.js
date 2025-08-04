/*
 * CSV Parser - Handles CSV file parsing and generation for account data
 * Supports proper escaping, validation, and error handling
 */

// Prevent duplicate class declarations
if (typeof window.CSVParser === 'undefined') {

window.CSVParser = class CSVParser {
  constructor() {
    this.requiredHeaders = ['name', 'userId', 'link'];
    this.optionalHeaders = ['status', 'contactedAt', 'error', 'retryCount'];
  }

  // Main CSV parsing method
  static parseCSV(csvContent) {
    if (!csvContent || typeof csvContent !== 'string') {
      throw new Error('CSV content must be a non-empty string');
    }

    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }

    // Parse header row
    const headers = this.parseCSVLine(lines[0]);
    if (headers.length === 0) {
      throw new Error('CSV header row is empty');
    }

    // Validate headers
    this.validateCSVHeaders(headers);

    // Parse data rows
    const accounts = [];
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = this.parseCSVLine(lines[i]);
        if (values.length === 0) continue; // Skip empty lines

        const account = this.createAccountFromCSVRow(headers, values, i + 1);
        if (account) {
          accounts.push(account);
        }
      } catch (error) {
        console.warn(`Warning: Skipping row ${i + 1} due to error: ${error.message}`);
      }
    }

    if (accounts.length === 0) {
      throw new Error('No valid accounts found in CSV file');
    }

    return {
      accounts: accounts,
      totalRows: lines.length - 1,
      validRows: accounts.length,
      headers: headers
    };
  }

  // Parse a single CSV line with proper quote handling
  static parseCSVLine(line) {
    if (!line || typeof line !== 'string') {
      return [];
    }

    const result = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote within quoted field
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current.trim());
        current = '';
        i++;
      } else {
        // Regular character
        current += char;
        i++;
      }
    }

    // Add the last field
    result.push(current.trim());

    // Clean up quoted fields
    return result.map(field => {
      // Remove surrounding quotes if present
      if (field.startsWith('"') && field.endsWith('"')) {
        return field.slice(1, -1);
      }
      return field;
    });
  }

  // Validate CSV headers
  static validateCSVHeaders(headers) {
    const parser = new CSVParser();
    const lowerHeaders = headers.map(h => h.toLowerCase());
    
    // Check for required headers
    for (const required of parser.requiredHeaders) {
      if (!lowerHeaders.includes(required.toLowerCase())) {
        throw new Error(`Missing required header: ${required}`);
      }
    }

    // Check for duplicate headers
    const duplicates = headers.filter((header, index) => 
      headers.indexOf(header) !== index
    );
    
    if (duplicates.length > 0) {
      throw new Error(`Duplicate headers found: ${duplicates.join(', ')}`);
    }

    return true;
  }

  // Create account object from CSV row
  static createAccountFromCSVRow(headers, values, rowNumber) {
    if (values.length !== headers.length) {
      throw new Error(`Row ${rowNumber}: Column count mismatch. Expected ${headers.length}, got ${values.length}`);
    }

    const account = {};
    
    // Map values to headers
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].toLowerCase();
      const value = values[i];
      
      switch (header) {
        case 'name':
          account.name = value || '';
          break;
        case 'userid':
        case 'user_id':
        case 'id':
          account.userId = value || '';
          break;
        case 'link':
        case 'url':
        case 'profile_link':
          account.link = this.validateAndCleanURL(value);
          break;
        case 'status':
          account.status = value || 'pending';
          break;
        case 'contactedat':
        case 'contacted_at':
        case 'timestamp':
          account.contactedAt = value ? new Date(value).toISOString() : null;
          break;
        case 'error':
        case 'error_message':
          account.error = value || null;
          break;
        case 'retrycount':
        case 'retry_count':
        case 'retries':
          account.retryCount = parseInt(value) || 0;
          break;
        default:
          // Store unknown headers as additional data
          account[header] = value;
      }
    }

    // Validate required fields
    if (!account.name || !account.userId || !account.link) {
      throw new Error(`Row ${rowNumber}: Missing required fields (name, userId, or link)`);
    }

    // Set defaults for optional fields
    account.status = account.status || 'pending';
    account.contactedAt = account.contactedAt || null;
    account.error = account.error || null;
    account.retryCount = account.retryCount || 0;

    return account;
  }

  // Validate and clean URL
  static validateAndCleanURL(url) {
    if (!url || typeof url !== 'string') {
      throw new Error('URL is required and must be a string');
    }

    let cleanUrl = url.trim();
    
    // Add protocol if missing
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    // Validate URL format
    try {
      new URL(cleanUrl);
    } catch (error) {
      throw new Error(`Invalid URL format: ${url}`);
    }

    // Check if it's a markt.de URL
    if (!cleanUrl.includes('markt.de')) {
      throw new Error(`URL must be from markt.de domain: ${url}`);
    }

    return cleanUrl;
  }

  // Generate CSV from account data
  static generateCSV(accounts, includeHeaders = true) {
    if (!Array.isArray(accounts)) {
      throw new Error('Accounts must be an array');
    }

    if (accounts.length === 0) {
      return includeHeaders ? 'name,userId,link,status,contactedAt,error,retryCount\n' : '';
    }

    const headers = ['name', 'userId', 'link', 'status', 'contactedAt', 'error', 'retryCount'];
    let csv = '';

    // Add headers if requested
    if (includeHeaders) {
      csv += headers.join(',') + '\n';
    }

    // Add data rows
    for (const account of accounts) {
      const row = headers.map(header => {
        let value = account[header] || '';
        
        // Handle special cases
        if (header === 'contactedAt' && value) {
          value = new Date(value).toISOString();
        }
        
        return this.sanitizeForCSV(value);
      });
      
      csv += row.join(',') + '\n';
    }

    return csv;
  }

  // Sanitize text for CSV output
  static sanitizeForCSV(text) {
    if (text === null || text === undefined) {
      return '';
    }

    let sanitized = String(text);
    
    // Escape quotes by doubling them
    sanitized = sanitized.replace(/"/g, '""');
    
    // Wrap in quotes if contains comma, newline, or quote
    if (sanitized.includes(',') || sanitized.includes('\n') || sanitized.includes('"')) {
      sanitized = `"${sanitized}"`;
    }
    
    return sanitized;
  }

  // Validate account structure
  static validateAccountsData(accounts) {
    if (!Array.isArray(accounts)) {
      throw new Error('Accounts data must be an array');
    }

    const errors = [];
    const userIds = new Set();

    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      const rowNum = i + 1;

      // Check required fields
      if (!account.name) {
        errors.push(`Row ${rowNum}: Missing name`);
      }
      
      if (!account.userId) {
        errors.push(`Row ${rowNum}: Missing userId`);
      } else if (userIds.has(account.userId)) {
        errors.push(`Row ${rowNum}: Duplicate userId: ${account.userId}`);
      } else {
        userIds.add(account.userId);
      }
      
      if (!account.link) {
        errors.push(`Row ${rowNum}: Missing link`);
      } else {
        try {
          this.validateAndCleanURL(account.link);
        } catch (error) {
          errors.push(`Row ${rowNum}: ${error.message}`);
        }
      }

      // Validate optional fields
      if (account.status && !['pending', 'contacted', 'failed', 'skipped'].includes(account.status)) {
        errors.push(`Row ${rowNum}: Invalid status: ${account.status}`);
      }

      if (account.contactedAt && isNaN(new Date(account.contactedAt).getTime())) {
        errors.push(`Row ${rowNum}: Invalid contactedAt date: ${account.contactedAt}`);
      }

      if (account.retryCount && (isNaN(account.retryCount) || account.retryCount < 0)) {
        errors.push(`Row ${rowNum}: Invalid retryCount: ${account.retryCount}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation errors:\n${errors.join('\n')}`);
    }

    return true;
  }

  // Parse file from File API
  static async parseFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('No file provided'));
        return;
      }

      if (!file.name.toLowerCase().endsWith('.csv')) {
        reject(new Error('File must have .csv extension'));
        return;
      }

      if (file.size === 0) {
        reject(new Error('File is empty'));
        return;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        reject(new Error('File is too large (max 10MB)'));
        return;
      }

      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const csvContent = event.target.result;
          const result = this.parseCSV(csvContent);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  }

  // Export accounts to downloadable CSV file
  static downloadCSV(accounts, filename = 'markt_de_accounts.csv') {
    try {
      const csvContent = this.generateCSV(accounts, true);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // Create download link
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Error downloading CSV:', error);
      return false;
    }
  }

  // Get CSV statistics
  static getCSVStats(accounts) {
    if (!Array.isArray(accounts)) {
      return null;
    }

    const stats = {
      total: accounts.length,
      pending: 0,
      contacted: 0,
      failed: 0,
      skipped: 0,
      withErrors: 0,
      duplicateUserIds: 0,
      invalidUrls: 0
    };

    const userIds = new Set();
    const duplicateIds = new Set();

    for (const account of accounts) {
      // Count by status
      switch (account.status) {
        case 'pending':
          stats.pending++;
          break;
        case 'contacted':
          stats.contacted++;
          break;
        case 'failed':
          stats.failed++;
          break;
        case 'skipped':
          stats.skipped++;
          break;
      }

      // Count errors
      if (account.error) {
        stats.withErrors++;
      }

      // Check for duplicate user IDs
      if (userIds.has(account.userId)) {
        duplicateIds.add(account.userId);
      } else {
        userIds.add(account.userId);
      }

      // Check for invalid URLs
      try {
        this.validateAndCleanURL(account.link);
      } catch (error) {
        stats.invalidUrls++;
      }
    }

    stats.duplicateUserIds = duplicateIds.size;

    return stats;
  }
}; // End of class definition

} // End of duplicate prevention check

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.CSVParser;
}

} // End of duplicate prevention check