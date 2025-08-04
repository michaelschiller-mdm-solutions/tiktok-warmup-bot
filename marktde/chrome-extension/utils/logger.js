/*
 * Logger - Centralized logging system for the Markt.de Chrome Extension
 * Provides different log levels, persistence, and export functionality
 */

// Prevent duplicate class declarations
if (typeof window.Logger === 'undefined') {

window.Logger = class Logger {
  constructor(component = 'Extension') {
    this.component = component;
    this.logs = [];
    this.maxLogs = 1000;
    
    this.logLevels = {
      DEBUG: 0,
      INFO: 1,
      SUCCESS: 2,
      WARNING: 3,
      ERROR: 4,
      DM: 5,
      LOGIN: 6
    };

    this.currentLevel = this.logLevels.INFO;
    
    this.logEmojis = {
      DEBUG: '🔍',
      INFO: 'ℹ️',
      SUCCESS: '✅',
      WARNING: '⚠️',
      ERROR: '❌',
      DM: '💬',
      LOGIN: '🔐'
    };

    // Initialize from storage if available
    this.loadLogs();
  }

  // Create log entry
  createLogEntry(level, message, data = null, error = null) {
    const timestamp = new Date().toISOString();
    const entry = {
      id: Date.now() + Math.random(),
      timestamp,
      level,
      component: this.component,
      message,
      data: data ? JSON.stringify(data) : null,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : null
    };

    return entry;
  }

  // Add log entry to collection
  addLogEntry(entry) {
    this.logs.push(entry);
    
    // Trim logs if exceeding max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output
    this.outputToConsole(entry);
    
    // Save to storage
    this.saveLogs();
    
    // Notify listeners
    this.notifyListeners(entry);
  }

  // Output to browser console
  outputToConsole(entry) {
    const emoji = this.logEmojis[entry.level] || 'ℹ️';
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const prefix = `[${timestamp}] ${this.component}: ${emoji}`;
    
    const consoleMethod = this.getConsoleMethod(entry.level);
    
    if (entry.error) {
      console[consoleMethod](`${prefix} ${entry.message}`, entry.error);
    } else if (entry.data) {
      console[consoleMethod](`${prefix} ${entry.message}`, JSON.parse(entry.data));
    } else {
      console[consoleMethod](`${prefix} ${entry.message}`);
    }
  }

  // Get appropriate console method for log level
  getConsoleMethod(level) {
    switch (level) {
      case 'DEBUG':
        return 'debug';
      case 'WARNING':
        return 'warn';
      case 'ERROR':
        return 'error';
      case 'SUCCESS':
      case 'DM':
      case 'LOGIN':
        return 'info';
      default:
        return 'log';
    }
  }

  // Logging methods
  debug(message, data = null) {
    if (this.currentLevel <= this.logLevels.DEBUG) {
      const entry = this.createLogEntry('DEBUG', message, data);
      this.addLogEntry(entry);
    }
  }

  info(message, data = null) {
    if (this.currentLevel <= this.logLevels.INFO) {
      const entry = this.createLogEntry('INFO', message, data);
      this.addLogEntry(entry);
    }
  }

  success(message, data = null) {
    if (this.currentLevel <= this.logLevels.SUCCESS) {
      const entry = this.createLogEntry('SUCCESS', message, data);
      this.addLogEntry(entry);
    }
  }

  warning(message, data = null) {
    if (this.currentLevel <= this.logLevels.WARNING) {
      const entry = this.createLogEntry('WARNING', message, data);
      this.addLogEntry(entry);
    }
  }

  error(message, error = null, data = null) {
    if (this.currentLevel <= this.logLevels.ERROR) {
      const entry = this.createLogEntry('ERROR', message, data, error);
      this.addLogEntry(entry);
    }
  }

  dm(message, data = null) {
    if (this.currentLevel <= this.logLevels.DM) {
      const entry = this.createLogEntry('DM', message, data);
      this.addLogEntry(entry);
    }
  }

  login(message, data = null) {
    if (this.currentLevel <= this.logLevels.LOGIN) {
      const entry = this.createLogEntry('LOGIN', message, data);
      this.addLogEntry(entry);
    }
  }

  // Load logs from storage with context validation
  async loadLogs() {
    if (!this.isContextValid()) {
      // Context is invalid, skip loading
      return;
    }

    try {
      const result = await chrome.storage.local.get(['extensionLogs']);
      if (result.extensionLogs) {
        this.logs = result.extensionLogs;
      }
    } catch (error) {
      if (error.message.includes('Extension context invalidated')) {
        // Context was invalidated during load, ignore silently
        return;
      }
      console.error('Failed to load logs from storage:', error);
    }
  }

  // Check if chrome extension context is valid
  isContextValid() {
    try {
      return typeof chrome !== 'undefined' && 
             chrome.storage && 
             chrome.storage.local &&
             !chrome.runtime.lastError;
    } catch (error) {
      return false;
    }
  }

  // Save logs to storage with context validation
  async saveLogs() {
    if (!this.isContextValid()) {
      // Context is invalid, skip saving to avoid errors
      return;
    }

    try {
      await chrome.storage.local.set({ extensionLogs: this.logs });
    } catch (error) {
      if (error.message.includes('Extension context invalidated')) {
        // Context was invalidated during save, ignore silently
        return;
      }
      console.error('Failed to save logs to storage:', error);
    }
  }

  // Get recent logs
  getRecentLogs(count = 50) {
    return this.logs.slice(-count);
  }

  // Get logs by level
  getLogsByLevel(level) {
    return this.logs.filter(log => log.level === level);
  }

  // Get logs by time range
  getLogsByTimeRange(startTime, endTime) {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    
    return this.logs.filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      return logTime >= start && logTime <= end;
    });
  }

  // Get logs by component
  getLogsByComponent(component) {
    return this.logs.filter(log => log.component === component);
  }

  // Search logs
  searchLogs(query) {
    const lowerQuery = query.toLowerCase();
    return this.logs.filter(log => 
      log.message.toLowerCase().includes(lowerQuery) ||
      (log.data && log.data.toLowerCase().includes(lowerQuery)) ||
      (log.error && log.error.message.toLowerCase().includes(lowerQuery))
    );
  }

  // Get log statistics
  getLogStats() {
    const stats = {
      total: this.logs.length,
      byLevel: {},
      byComponent: {},
      timeRange: null,
      errorCount: 0,
      warningCount: 0
    };

    // Count by level
    for (const level of Object.keys(this.logLevels)) {
      stats.byLevel[level] = this.logs.filter(log => log.level === level).length;
    }

    // Count by component
    const components = [...new Set(this.logs.map(log => log.component))];
    for (const component of components) {
      stats.byComponent[component] = this.logs.filter(log => log.component === component).length;
    }

    // Time range
    if (this.logs.length > 0) {
      const timestamps = this.logs.map(log => new Date(log.timestamp).getTime());
      stats.timeRange = {
        start: new Date(Math.min(...timestamps)).toISOString(),
        end: new Date(Math.max(...timestamps)).toISOString()
      };
    }

    // Error and warning counts
    stats.errorCount = stats.byLevel.ERROR || 0;
    stats.warningCount = stats.byLevel.WARNING || 0;

    return stats;
  }

  // Export logs
  async exportLogs(format = 'json') {
    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        component: this.component,
        totalLogs: this.logs.length,
        stats: this.getLogStats(),
        logs: this.logs
      };

      let content, filename, mimeType;

      switch (format.toLowerCase()) {
        case 'json':
          content = JSON.stringify(exportData, null, 2);
          filename = `markt-de-extension-logs-${Date.now()}.json`;
          mimeType = 'application/json';
          break;
          
        case 'csv':
          content = this.exportToCSV();
          filename = `markt-de-extension-logs-${Date.now()}.csv`;
          mimeType = 'text/csv';
          break;
          
        case 'txt':
          content = this.exportToText();
          filename = `markt-de-extension-logs-${Date.now()}.txt`;
          mimeType = 'text/plain';
          break;
          
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      return {
        content,
        filename,
        mimeType
      };
    } catch (error) {
      this.error('Failed to export logs', error);
      throw error;
    }
  }

  // Export to CSV format
  exportToCSV() {
    const headers = ['Timestamp', 'Level', 'Component', 'Message', 'Data', 'Error'];
    const rows = [headers.join(',')];

    for (const log of this.logs) {
      const row = [
        `"${log.timestamp}"`,
        `"${log.level}"`,
        `"${log.component}"`,
        `"${log.message.replace(/"/g, '""')}"`,
        log.data ? `"${log.data.replace(/"/g, '""')}"` : '""',
        log.error ? `"${log.error.message.replace(/"/g, '""')}"` : '""'
      ];
      rows.push(row.join(','));
    }

    return rows.join('\n');
  }

  // Export to text format
  exportToText() {
    const lines = [`Markt.de Extension Logs - ${new Date().toISOString()}`, ''];
    
    for (const log of this.logs) {
      const timestamp = new Date(log.timestamp).toLocaleString();
      const emoji = this.logEmojis[log.level] || 'ℹ️';
      
      lines.push(`[${timestamp}] ${log.component}: ${emoji} ${log.message}`);
      
      if (log.data) {
        lines.push(`  Data: ${log.data}`);
      }
      
      if (log.error) {
        lines.push(`  Error: ${log.error.message}`);
        if (log.error.stack) {
          lines.push(`  Stack: ${log.error.stack}`);
        }
      }
      
      lines.push('');
    }

    return lines.join('\n');
  }

  // Download logs
  downloadLogs(format = 'json') {
    try {
      const exportData = this.exportLogs(format);
      
      const blob = new Blob([exportData.content], { type: exportData.mimeType });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = exportData.filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      this.success(`Logs exported as ${format.toUpperCase()}`);
      return true;
    } catch (error) {
      this.error('Failed to download logs', error);
      return false;
    }
  }

  // Clear logs
  async clearLogs() {
    try {
      this.logs = [];
      await this.saveLogs();
      this.info('Logs cleared');
      return true;
    } catch (error) {
      this.error('Failed to clear logs', error);
      return false;
    }
  }

  // Set log level
  setLogLevel(level) {
    if (typeof level === 'string') {
      level = this.logLevels[level.toUpperCase()];
    }
    
    if (level !== undefined && level >= 0 && level <= 6) {
      this.currentLevel = level;
      this.info(`Log level set to ${Object.keys(this.logLevels)[level]}`);
    } else {
      this.warning(`Invalid log level: ${level}`);
    }
  }

  // Get current log level
  getLogLevel() {
    return Object.keys(this.logLevels)[this.currentLevel];
  }

  // Event listeners for real-time log updates
  listeners = [];

  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  notifyListeners(logEntry) {
    for (const listener of this.listeners) {
      try {
        listener(logEntry);
      } catch (error) {
        console.error('Error in log listener:', error);
      }
    }
  }

  // Format log entry for display
  formatLogEntry(entry, includeData = false) {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const emoji = this.logEmojis[entry.level] || 'ℹ️';
    
    let formatted = `[${timestamp}] ${emoji} ${entry.message}`;
    
    if (includeData && entry.data) {
      formatted += `\nData: ${entry.data}`;
    }
    
    if (entry.error) {
      formatted += `\nError: ${entry.error.message}`;
    }
    
    return formatted;
  }

  // Get logs formatted for UI display
  getFormattedLogs(count = 50, includeData = false) {
    return this.getRecentLogs(count).map(entry => ({
      ...entry,
      formatted: this.formatLogEntry(entry, includeData),
      emoji: this.logEmojis[entry.level] || 'ℹ️'
    }));
  }

  // Cleanup old logs
  async cleanup(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days default
    try {
      const cutoffTime = Date.now() - maxAge;
      const initialCount = this.logs.length;
      
      this.logs = this.logs.filter(log => 
        new Date(log.timestamp).getTime() > cutoffTime
      );
      
      const removedCount = initialCount - this.logs.length;
      
      if (removedCount > 0) {
        await this.saveLogs();
        this.info(`Cleaned up ${removedCount} old log entries`);
      }
      
      return removedCount;
    } catch (error) {
      this.error('Failed to cleanup logs', error);
      return 0;
    }
  }
}; // End of class definition

} // End of duplicate prevention check

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.Logger;
}

} // End of duplicate prevention check