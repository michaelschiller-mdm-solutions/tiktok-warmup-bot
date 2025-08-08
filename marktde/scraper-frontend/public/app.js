/*
 * Marktde Scraper Frontend JavaScript
 * Handles UI interactions and WebSocket communication
 */

class ScraperApp {
    constructor() {
        this.ws = null;
        this.autoScroll = true;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupWebSocket();
        this.loadInitialData();
    }

    setupEventListeners() {
        // File upload
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('file-input');

        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // Controls
        document.getElementById('start-btn').addEventListener('click', this.startScraper.bind(this));
        document.getElementById('stop-btn').addEventListener('click', this.stopScraper.bind(this));
        document.getElementById('refresh-progress').addEventListener('click', this.refreshProgress.bind(this));

        // Logs
        document.getElementById('clear-logs').addEventListener('click', this.clearLogs.bind(this));
        document.getElementById('auto-scroll').addEventListener('click', this.toggleAutoScroll.bind(this));
    }

    setupWebSocket() {
        try {
            this.ws = new WebSocket(`ws://${window.location.hostname}:3001`);
            
            this.ws.onopen = () => {
                console.log('WebSocket connected');
            };

            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            };

            this.ws.onclose = () => {
                console.log('WebSocket disconnected, attempting to reconnect...');
                setTimeout(() => this.setupWebSocket(), 5000);
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        } catch (error) {
            console.error('Failed to setup WebSocket:', error);
        }
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'status_change':
                this.updateStatus(data.status, data.message);
                break;
            case 'log':
                this.addLogEntry(data.log);
                break;
            case 'file_uploaded':
                this.showUploadStatus(data.message, 'success');
                this.updateStartButton();
                this.loadFiles();
                break;
            case 'progress_update':
                this.updateProgress(data.progress);
                break;
        }
    }

    async loadInitialData() {
        await this.loadStatus();
        await this.loadFiles();
        await this.refreshProgress();
    }

    async loadStatus() {
        try {
            const response = await fetch('/status');
            const data = await response.json();
            
            this.updateStatus(data.status);
            
            // Load existing logs
            if (data.logs && data.logs.length > 0) {
                data.logs.forEach(log => this.addLogEntry(log));
            }
        } catch (error) {
            console.error('Failed to load status:', error);
        }
    }

    updateStatus(status, message = null) {
        const statusText = document.getElementById('status-text');
        const statusDot = document.getElementById('status-dot');
        const startBtn = document.getElementById('start-btn');
        const stopBtn = document.getElementById('stop-btn');

        // Update status display
        statusDot.className = `status-dot ${status}`;
        
        switch (status) {
            case 'idle':
                statusText.textContent = 'Ready';
                startBtn.disabled = false;
                stopBtn.disabled = true;
                break;
            case 'running':
                statusText.textContent = 'Scraping...';
                startBtn.disabled = true;
                stopBtn.disabled = false;
                break;
            case 'completed':
                statusText.textContent = 'Completed';
                startBtn.disabled = false;
                stopBtn.disabled = true;
                this.loadFiles(); // Refresh files after completion
                break;
            case 'error':
                statusText.textContent = 'Error';
                startBtn.disabled = false;
                stopBtn.disabled = true;
                break;
        }

        if (message) {
            this.addLogEntry({
                type: status === 'error' ? 'error' : 'info',
                message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // File upload handlers
    handleDragOver(e) {
        e.preventDefault();
        document.getElementById('upload-area').classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        document.getElementById('upload-area').classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        document.getElementById('upload-area').classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.uploadFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            this.uploadFile(files[0]);
        }
    }

    async uploadFile(file) {
        if (!file.name.endsWith('.csv')) {
            this.showUploadStatus('Please select a CSV file', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('targetFile', file);

        try {
            this.showUploadStatus('Uploading...', 'info');
            
            const response = await fetch('/upload-targets', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                this.showUploadStatus(data.message, 'success');
                this.updateStartButton();
                this.loadFiles();
            } else {
                this.showUploadStatus(data.error || 'Upload failed', 'error');
            }
        } catch (error) {
            this.showUploadStatus('Upload failed: ' + error.message, 'error');
        }
    }

    showUploadStatus(message, type) {
        const statusDiv = document.getElementById('upload-status');
        statusDiv.textContent = message;
        statusDiv.className = `upload-status ${type}`;
        statusDiv.style.display = 'block';

        if (type === 'success') {
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 3000);
        }
    }

    updateStartButton() {
        const startBtn = document.getElementById('start-btn');
        // Enable start button if we have target accounts and scraper is not running
        startBtn.disabled = false;
    }

    // Scraper controls
    async startScraper() {
        const settings = {
            headless: document.getElementById('headless-mode').checked,
            maxAccounts: document.getElementById('max-accounts').value || null,
            sessionSize: parseInt(document.getElementById('session-size').value) || 50
        };

        try {
            const response = await fetch('/start-scraper', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });

            const data = await response.json();

            if (data.success) {
                this.updateStatus('running', 'Scraper started');
            } else {
                this.addLogEntry({
                    type: 'error',
                    message: data.error || 'Failed to start scraper',
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            this.addLogEntry({
                type: 'error',
                message: 'Failed to start scraper: ' + error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async stopScraper() {
        try {
            const response = await fetch('/stop-scraper', {
                method: 'POST'
            });

            const data = await response.json();

            if (data.success) {
                this.updateStatus('idle', 'Scraper stopped');
            } else {
                this.addLogEntry({
                    type: 'error',
                    message: data.error || 'Failed to stop scraper',
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            this.addLogEntry({
                type: 'error',
                message: 'Failed to stop scraper: ' + error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Progress
    async refreshProgress() {
        try {
            const response = await fetch('/progress');
            const data = await response.json();

            if (data.success) {
                this.updateProgress(data.progress);
            }
        } catch (error) {
            console.error('Failed to refresh progress:', error);
        }
    }

    updateProgress(progress) {
        document.getElementById('total-targets').textContent = progress.totalTargets || '-';
        document.getElementById('processed-count').textContent = progress.processed || '-';
        document.getElementById('remaining-count').textContent = progress.remaining || '-';
        document.getElementById('premium-count').textContent = progress.premiumAccounts || '-';

        const percentage = progress.percentage || 0;
        document.getElementById('progress-fill').style.width = `${percentage}%`;
        document.getElementById('progress-percent').textContent = `${percentage.toFixed(1)}%`;
    }

    // Logs
    addLogEntry(log) {
        const logsContainer = document.getElementById('logs');
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${log.type}`;

        const timestamp = new Date(log.timestamp).toLocaleTimeString();
        logEntry.innerHTML = `
            <span class="log-timestamp">[${timestamp}]</span>
            ${this.escapeHtml(log.message)}
        `;

        logsContainer.appendChild(logEntry);

        // Auto-scroll if enabled
        if (this.autoScroll) {
            logsContainer.scrollTop = logsContainer.scrollHeight;
        }

        // Limit log entries to prevent memory issues
        const maxLogs = 500;
        while (logsContainer.children.length > maxLogs) {
            logsContainer.removeChild(logsContainer.firstChild);
        }
    }

    clearLogs() {
        document.getElementById('logs').innerHTML = '';
    }

    toggleAutoScroll() {
        this.autoScroll = !this.autoScroll;
        const btn = document.getElementById('auto-scroll');
        btn.classList.toggle('active', this.autoScroll);
        btn.textContent = this.autoScroll ? 'Auto Scroll' : 'Manual Scroll';
    }

    // Files
    async loadFiles() {
        try {
            const response = await fetch('/files');
            const data = await response.json();

            this.renderFiles(data.files);
        } catch (error) {
            console.error('Failed to load files:', error);
        }
    }

    renderFiles(files) {
        const container = document.getElementById('files-list');
        
        if (!files || files.length === 0) {
            container.innerHTML = '<div class="loading">No files available</div>';
            return;
        }

        container.innerHTML = files.map(file => {
            const sizeText = file.exists ? this.formatFileSize(file.size) : 'Not found';
            const dateText = file.exists && file.modified ? 
                new Date(file.modified).toLocaleString() : '-';
            const recordsText = file.exists ? `${file.lineCount} records` : '-';

            return `
                <div class="file-item ${file.exists ? '' : 'not-exists'}">
                    <div class="file-info">
                        <div class="file-name">${file.filename}</div>
                        <div class="file-details">
                            ${sizeText} • ${recordsText} • Modified: ${dateText}
                        </div>
                    </div>
                    <div class="file-actions">
                        ${file.exists ? 
                            `<a href="/download/${file.filename}" class="btn btn-secondary" download>Download</a>` :
                            '<span class="btn btn-secondary" style="opacity: 0.5;">Not Available</span>'
                        }
                    </div>
                </div>
            `;
        }).join('');
    }

    // Utility functions
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ScraperApp();
});