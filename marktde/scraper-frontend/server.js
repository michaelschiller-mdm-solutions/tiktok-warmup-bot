/*
 * Marktde Scraper Frontend Server
 * Simple Express server that provides web interface for the premium scraper
 */

const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const SCRAPER_DIR = path.join(__dirname, 'scraper');
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure directories exist
[DATA_DIR, UPLOADS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Global state
let currentScraperProcess = null;
let scraperStatus = 'idle'; // idle, running, completed, error
let scraperLogs = [];

// WebSocket server for real-time updates
const wss = new WebSocket.Server({ port: 3001 });

function broadcastUpdate(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// Middleware
app.use(express.static('public'));
app.use(express.json());

// File upload configuration
const upload = multer({
    dest: UPLOADS_DIR,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'));
        }
    }
});

// Routes

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Upload target accounts CSV
app.post('/upload-targets', upload.single('targetFile'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Move uploaded file to scraper directory
        const targetPath = path.join(SCRAPER_DIR, 'target_accounts.csv');
        fs.copyFileSync(req.file.path, targetPath);
        fs.unlinkSync(req.file.path); // Clean up temp file

        // Count accounts
        const content = fs.readFileSync(targetPath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        const accountCount = Math.max(0, lines.length - 1); // Subtract header

        res.json({ 
            success: true, 
            message: `Uploaded ${accountCount} target accounts`,
            accountCount 
        });

        broadcastUpdate({
            type: 'file_uploaded',
            accountCount,
            message: `Target accounts uploaded: ${accountCount} accounts`
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start scraper
app.post('/start-scraper', (req, res) => {
    try {
        if (currentScraperProcess) {
            return res.status(400).json({ error: 'Scraper is already running' });
        }

        const { headless = true, maxAccounts = null, sessionSize = 50 } = req.body;

        // Build command arguments
        const args = ['premium-followed-scraper.js'];
        if (headless) args.push('--headless');
        if (!headless) args.push('--visible');
        if (maxAccounts) args.push(`--max=${maxAccounts}`);
        if (sessionSize !== 50) args.push(`--session-size=${sessionSize}`);

        // Clear previous logs
        scraperLogs = [];
        scraperStatus = 'running';

        // Start scraper process
        currentScraperProcess = spawn('node', args, {
            cwd: SCRAPER_DIR,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        // Handle stdout
        currentScraperProcess.stdout.on('data', (data) => {
            const message = data.toString();
            scraperLogs.push({ type: 'info', message, timestamp: new Date().toISOString() });
            
            broadcastUpdate({
                type: 'log',
                log: { type: 'info', message, timestamp: new Date().toISOString() }
            });
        });

        // Handle stderr
        currentScraperProcess.stderr.on('data', (data) => {
            const message = data.toString();
            scraperLogs.push({ type: 'error', message, timestamp: new Date().toISOString() });
            
            broadcastUpdate({
                type: 'log',
                log: { type: 'error', message, timestamp: new Date().toISOString() }
            });
        });

        // Handle process completion
        currentScraperProcess.on('close', (code) => {
            scraperStatus = code === 0 ? 'completed' : 'error';
            currentScraperProcess = null;

            const message = code === 0 ? 'Scraper completed successfully' : `Scraper failed with code ${code}`;
            scraperLogs.push({ type: code === 0 ? 'success' : 'error', message, timestamp: new Date().toISOString() });

            broadcastUpdate({
                type: 'status_change',
                status: scraperStatus,
                message
            });
        });

        res.json({ 
            success: true, 
            message: 'Scraper started successfully',
            status: 'running'
        });

        broadcastUpdate({
            type: 'status_change',
            status: 'running',
            message: 'Scraper started'
        });

    } catch (error) {
        console.error('Start scraper error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Stop scraper
app.post('/stop-scraper', (req, res) => {
    try {
        if (!currentScraperProcess) {
            return res.status(400).json({ error: 'No scraper is running' });
        }

        currentScraperProcess.kill('SIGTERM');
        currentScraperProcess = null;
        scraperStatus = 'idle';

        res.json({ success: true, message: 'Scraper stopped' });

        broadcastUpdate({
            type: 'status_change',
            status: 'idle',
            message: 'Scraper stopped by user'
        });

    } catch (error) {
        console.error('Stop scraper error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get scraper status
app.get('/status', (req, res) => {
    res.json({
        status: scraperStatus,
        isRunning: currentScraperProcess !== null,
        logs: scraperLogs.slice(-50) // Last 50 log entries
    });
});

// Get progress
app.get('/progress', (req, res) => {
    try {
        // Run the progress checker script
        const progressProcess = spawn('node', ['check-premium-progress.js'], {
            cwd: SCRAPER_DIR,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        let error = '';

        progressProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        progressProcess.stderr.on('data', (data) => {
            error += data.toString();
        });

        progressProcess.on('close', (code) => {
            if (code === 0) {
                // Parse the progress output
                const progress = parseProgressOutput(output);
                res.json({ success: true, progress, rawOutput: output });
            } else {
                res.status(500).json({ error: error || 'Failed to get progress' });
            }
        });

    } catch (error) {
        console.error('Progress error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Download results
app.get('/download/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const allowedFiles = [
            'premium_followed_by.csv',
            'premium_processed_targets.csv',
            'target_accounts.csv'
        ];

        if (!allowedFiles.includes(filename)) {
            return res.status(400).json({ error: 'File not allowed' });
        }

        const filePath = path.join(SCRAPER_DIR, filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.download(filePath, filename);

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get file info
app.get('/files', (req, res) => {
    try {
        const files = [
            'target_accounts.csv',
            'premium_followed_by.csv',
            'premium_processed_targets.csv'
        ];

        const fileInfo = files.map(filename => {
            const filePath = path.join(SCRAPER_DIR, filename);
            const exists = fs.existsSync(filePath);
            
            let stats = null;
            let lineCount = 0;
            
            if (exists) {
                stats = fs.statSync(filePath);
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    lineCount = content.split('\n').filter(line => line.trim()).length - 1; // Subtract header
                } catch (e) {
                    lineCount = 0;
                }
            }

            return {
                filename,
                exists,
                size: exists ? stats.size : 0,
                modified: exists ? stats.mtime : null,
                lineCount: Math.max(0, lineCount)
            };
        });

        res.json({ files: fileInfo });

    } catch (error) {
        console.error('Files error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Utility function to parse progress output
function parseProgressOutput(output) {
    const progress = {
        totalTargets: 0,
        processed: 0,
        remaining: 0,
        percentage: 0,
        premiumAccounts: 0,
        normalAccounts: 0
    };

    try {
        // Extract numbers from the progress output
        const totalMatch = output.match(/Total target accounts:\s*(\d+)/);
        const processedMatch = output.match(/Processed accounts:\s*(\d+)/);
        const remainingMatch = output.match(/Remaining accounts:\s*(\d+)/);
        const percentMatch = output.match(/Progress:\s*([\d.]+)%/);
        const premiumMatch = output.match(/Premium accounts:\s*(\d+)/);
        const normalMatch = output.match(/Normal accounts.*?:\s*(\d+)/);

        if (totalMatch) progress.totalTargets = parseInt(totalMatch[1]);
        if (processedMatch) progress.processed = parseInt(processedMatch[1]);
        if (remainingMatch) progress.remaining = parseInt(remainingMatch[1]);
        if (percentMatch) progress.percentage = parseFloat(percentMatch[1]);
        if (premiumMatch) progress.premiumAccounts = parseInt(premiumMatch[1]);
        if (normalMatch) progress.normalAccounts = parseInt(normalMatch[1]);

    } catch (error) {
        console.error('Error parsing progress:', error);
    }

    return progress;
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Marktde Scraper Frontend running on port ${PORT}`);
    console.log(`Access the web interface at: http://localhost:${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    if (currentScraperProcess) {
        currentScraperProcess.kill('SIGTERM');
    }
    process.exit(0);
});