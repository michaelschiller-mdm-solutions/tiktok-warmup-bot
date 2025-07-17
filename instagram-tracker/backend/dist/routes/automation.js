"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupWebSocket = setupWebSocket;
const express_1 = __importDefault(require("express"));
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const ws_1 = require("ws");
const database_1 = require("../database");
const router = express_1.default.Router();
let wss;
const activeSessions = new Map();
const sessionClients = new Map();
function setupWebSocket(server) {
    wss = new ws_1.WebSocketServer({ server });
    console.log('🚀 WebSocket server is set up and listening');
    wss.on('connection', (ws) => {
        console.log('ℹ️ WebSocket client connected');
        ws.on('message', (message) => {
            try {
                const parsedMessage = JSON.parse(message);
                if (parsedMessage.type === 'register' && parsedMessage.sessionId) {
                    const sessionId = parsedMessage.sessionId;
                    sessionClients.set(sessionId, ws);
                    console.log(`✅ Client registered for session: ${sessionId}`);
                    const session = activeSessions.get(sessionId);
                    if (session) {
                        ws.send(JSON.stringify({ type: 'session_status', data: session }));
                    }
                }
            }
            catch (error) {
                console.error('❌ Failed to parse WebSocket message:', error);
            }
        });
        ws.on('close', () => {
            console.log('ℹ️ WebSocket client disconnected');
            for (const [sessionId, client] of sessionClients.entries()) {
                if (client === ws) {
                    sessionClients.delete(sessionId);
                    console.log(`🧹 Cleaned up client for session: ${sessionId}`);
                    break;
                }
            }
        });
    });
}
function processAccount(session, account) {
    return new Promise((resolve, reject) => {
        const payloadForScript = {
            ...account,
            sessionId: session.sessionId
        };
        const automationData = JSON.stringify(payloadForScript);
        const scriptPath = path_1.default.join(process.cwd(), '../bot/scripts/api/account_setup.js');
        console.log(`[${session.sessionId}] 🤖 Starting automation for account ${account.accountId}`);
        const child = (0, child_process_1.spawn)('node', [scriptPath, automationData], {
            cwd: path_1.default.join(process.cwd(), '../bot'),
            detached: false,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        session.currentProcess = child;
        child.stdout.on('data', (data) => {
            const messageStr = data.toString();
            messageStr.split('\\n').forEach((line) => {
                if (line.trim()) {
                    try {
                        const message = JSON.parse(line);
                        const client = sessionClients.get(session.sessionId);
                        if (client && client.readyState === ws_1.WebSocket.OPEN) {
                            client.send(JSON.stringify(message));
                        }
                    }
                    catch (error) {
                        console.log(`[Automation][${account.accountId}][stdout] ${line}`);
                    }
                }
            });
        });
        child.stderr.on('data', (data) => {
            console.error(`[Automation Error][${account.accountId}] ${data.toString()}`);
        });
        child.on('close', (code) => {
            console.log(`[${session.sessionId}] ✅ Process for account ${account.accountId} exited with code ${code}`);
            session.currentProcess = null;
            if (code === 0) {
                session.results.push({ accountId: account.accountId, status: 'completed' });
            }
            else {
                session.results.push({ accountId: account.accountId, status: 'failed', errorCode: code });
                const client = sessionClients.get(session.sessionId);
                if (client) {
                    client.send(JSON.stringify({
                        type: 'session_completed',
                        data: {
                            sessionId: session.sessionId,
                            accountId: account.accountId,
                            status: 'failed',
                            error: `Process exited with code ${code}`
                        }
                    }));
                }
            }
            resolve();
        });
        child.on('error', (error) => {
            console.error(`[${session.sessionId}] ❌ Failed to start process for account ${account.accountId}:`, error);
            session.currentProcess = null;
            session.results.push({ accountId: account.accountId, status: 'failed', error: error.message });
            reject(error);
        });
    });
}
async function runSession(session) {
    for (let i = session.currentAccountIndex + 1; i < session.accounts.length; i++) {
        if (session.status === 'paused') {
            console.log(`[${session.sessionId}] Session paused.`);
            return;
        }
        session.currentAccountIndex = i;
        const account = session.accounts[i];
        console.log(`[${session.sessionId}] Processing account ${i + 1}/${session.accounts.length}: ${account.username}`);
        try {
            await processAccount(session, account);
            console.log(`[${session.sessionId}] ✅ Account ${account.username} processed successfully`);
        }
        catch (error) {
            console.error(`[${session.sessionId}] ❌ Error processing account ${account.username}:`, error.message);
            session.results.push({
                accountId: account.accountId,
                status: 'failed',
                error: error.message,
                errorType: error.message?.includes('token') ? 'no_token_found' : 'technical'
            });
            const client = sessionClients.get(session.sessionId);
            if (client && client.readyState === ws_1.WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'session_completed',
                    data: {
                        sessionId: session.sessionId,
                        accountId: account.accountId,
                        username: account.username,
                        status: 'failed',
                        error: error.message,
                        errorType: error.message?.includes('token') ? 'no_token_found' : 'technical'
                    }
                }));
            }
            console.log(`[${session.sessionId}] Continuing to next account...`);
        }
        if (i < session.accounts.length - 1) {
            console.log(`[${session.sessionId}] Waiting 3 seconds before next account...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    session.status = 'completed';
    console.log(`[${session.sessionId}] 🎉 Session completed. Results: ${session.results.filter(r => r.status === 'completed').length} successful, ${session.results.filter(r => r.status === 'failed').length} failed`);
    const client = sessionClients.get(session.sessionId);
    if (client && client.readyState === ws_1.WebSocket.OPEN) {
        client.send(JSON.stringify({
            type: 'session_status',
            data: session
        }));
    }
    setTimeout(() => {
        activeSessions.delete(session.sessionId);
        sessionClients.delete(session.sessionId);
        console.log(`[${session.sessionId}] Session cleaned up`);
    }, 300000);
}
router.post('/start-account-setup', async (req, res) => {
    try {
        const accounts = req.body;
        if (!Array.isArray(accounts) || accounts.length === 0) {
            return res.status(400).json({ error: 'Request body must be a non-empty array of accounts.' });
        }
        for (const acc of accounts) {
            if (!acc.accountId || !acc.containerNumber || !acc.username || !acc.password || !acc.email) {
                return res.status(400).json({
                    error: `Missing required fields for an account in the batch. Required: accountId, containerNumber, username, password, email.`,
                    account: acc
                });
            }
        }
        const sessionId = (0, uuid_1.v4)();
        const session = {
            sessionId,
            accounts,
            status: 'queued',
            currentAccountIndex: -1,
            currentProcess: null,
            results: [],
        };
        activeSessions.set(sessionId, session);
        res.status(202).json({
            success: true,
            message: 'Automation session started successfully.',
            sessionId: sessionId,
            totalAccounts: accounts.length
        });
        session.status = 'in_progress';
        runSession(session).catch(err => {
            console.error(`[${sessionId}] Session execution failed:`, err);
            session.status = 'failed';
        });
    }
    catch (error) {
        console.error('Error starting automation session:', error);
        res.status(500).json({
            error: 'Failed to start automation session',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/status/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = activeSessions.get(sessionId);
        if (!session) {
            return res.status(404).json({ hasActiveSession: false, message: 'No active automation session found for that ID.' });
        }
        const currentAccount = session.currentAccountIndex !== -1 ? session.accounts[session.currentAccountIndex] : null;
        res.json({
            hasActiveSession: true,
            sessionId: session.sessionId,
            status: session.status,
            totalAccounts: session.accounts.length,
            processedCount: session.results.length,
            currentAccount: currentAccount ? {
                accountId: currentAccount.accountId,
                username: currentAccount.username,
                index: session.currentAccountIndex
            } : null,
            results: session.results
        });
    }
    catch (error) {
        console.error('Error getting automation status:', error);
        res.status(500).json({ error: 'Failed to get automation status' });
    }
});
router.post('/fetch-manual-token', (req, res) => {
    const { email, email_password } = req.body;
    if (!email || !email_password) {
        return res.status(400).json({ error: 'Email and email_password are required.' });
    }
    const scriptPath = path_1.default.join(process.cwd(), '../bot/scripts/api/manual_token_fetcher.js');
    console.log(`[API] Spawning token fetcher for ${email}`);
    const childProcess = (0, child_process_1.spawn)('node', [scriptPath, email, email_password], {
        cwd: path_1.default.join(process.cwd(), '../bot'),
        detached: false,
        stdio: ['pipe', 'pipe', 'pipe']
    });
    let token = '';
    let errorMessage = '';
    childProcess.stdout.on('data', (data) => {
        const output = data.toString();
        const match = output.match(/\b\d{6}\b/);
        if (match) {
            token = match[0];
        }
        console.log(`[TokenFetcher Script STDOUT]: ${output}`);
    });
    childProcess.stderr.on('data', (data) => {
        errorMessage += data.toString();
        console.error(`[TokenFetcher Script STDERR]: ${data.toString()}`);
    });
    childProcess.on('close', (code) => {
        if (code === 0 && token) {
            console.log(`[API] Successfully fetched token for ${email}`);
            res.json({ token: token.trim() });
        }
        else {
            console.error(`[API] Token fetch failed for ${email} with exit code ${code}`);
            const friendlyError = errorMessage.includes('Timeout')
                ? 'Failed to find a token within 60 seconds. Please try again.'
                : 'Could not fetch token. Please check email credentials and try again.';
            res.status(500).json({ error: friendlyError, details: errorMessage });
        }
    });
    childProcess.on('error', (error) => {
        console.error(`[API] Failed to start token fetcher script:`, error);
        res.status(500).json({
            error: 'Failed to start token fetcher script',
            details: error.message
        });
    });
});
router.post('/copy-to-iphone-clipboard', async (req, res) => {
    const { text, iphone_id } = req.body;
    if (!text) {
        return res.status(400).json({ error: 'Text is required.' });
    }
    try {
        let iphoneQuery = `
      SELECT ip_address, xxtouch_port, name 
      FROM iphones 
      WHERE 1=1
    `;
        const queryParams = [];
        if (iphone_id) {
            iphoneQuery += ` AND id = $1`;
            queryParams.push(iphone_id);
        }
        else {
            iphoneQuery += ` ORDER BY last_seen DESC NULLS LAST LIMIT 1`;
        }
        const { db } = await Promise.resolve().then(() => __importStar(require('../database')));
        const iphoneResult = await db.query(iphoneQuery, queryParams);
        if (iphoneResult.rows.length === 0) {
            const errorMsg = iphone_id
                ? `iPhone with ID ${iphone_id} not found or not active`
                : 'No active iPhone found. Please register and activate an iPhone in the iPhone management section.';
            return res.status(404).json({
                error: errorMsg,
                hint: 'Make sure your iPhone is registered and set to "active" status in iPhone Management.'
            });
        }
        const iphone = iphoneResult.rows[0];
        const iphoneUrl = `http://${iphone.ip_address}:${iphone.xxtouch_port || 46952}`;
        const scriptPath = path_1.default.join(process.cwd(), '../bot/scripts/api/clipboard.js');
        console.log(`[API] Copying text to iPhone "${iphone.name}" (${iphone.ip_address}): "${text}"`);
        const childProcess = (0, child_process_1.spawn)('node', [scriptPath, text, iphoneUrl], {
            cwd: path_1.default.join(process.cwd(), '../bot'),
            detached: false,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        let successMessage = '';
        let errorMessage = '';
        let timeoutHandle = null;
        let responded = false;
        const safeJson = (statusCode, payload) => {
            if (responded)
                return;
            responded = true;
            if (timeoutHandle)
                clearTimeout(timeoutHandle);
            if (statusCode === 200) {
                res.json(payload);
            }
            else {
                res.status(statusCode).json(payload);
            }
        };
        childProcess.stdout.on('data', (data) => {
            const output = data.toString();
            successMessage += output;
            console.log(`[Clipboard Script STDOUT]: ${output}`);
        });
        childProcess.stderr.on('data', (data) => {
            errorMessage += data.toString();
            console.error(`[Clipboard Script STDERR]: ${data.toString()}`);
        });
        childProcess.on('close', (code) => {
            if (code === 0) {
                console.log(`[API] Successfully copied text to iPhone "${iphone.name}" clipboard`);
                safeJson(200, {
                    success: true,
                    message: `Text copied to iPhone "${iphone.name}" clipboard successfully`,
                    iphone: {
                        name: iphone.name,
                        ip_address: iphone.ip_address
                    },
                    text: text.substring(0, 50) + (text.length > 50 ? '...' : '')
                });
            }
            else {
                console.error(`[API] Clipboard copy failed with exit code ${code}`);
                const friendlyError = errorMessage.includes('connect')
                    ? `Failed to connect to iPhone "${iphone.name}" at ${iphone.ip_address}. Please check if XXTouch Elite is running and accessible.`
                    : `Could not copy text to iPhone "${iphone.name}" clipboard. Please try again.`;
                safeJson(500, {
                    error: friendlyError,
                    details: errorMessage,
                    iphone: {
                        name: iphone.name,
                        ip_address: iphone.ip_address
                    }
                });
            }
        });
        childProcess.on('error', (error) => {
            console.error(`[API] Failed to start clipboard script:`, error);
            safeJson(500, {
                error: 'Failed to start clipboard script',
                details: error.message
            });
        });
        timeoutHandle = setTimeout(() => {
            if (!childProcess.killed) {
                childProcess.kill();
                safeJson(408, {
                    error: `Timeout: Clipboard operation to iPhone "${iphone.name}" took too long.`
                });
            }
        }, 10000);
    }
    catch (error) {
        console.error('Error getting iPhone details:', error);
        res.status(500).json({
            error: 'Failed to get iPhone details',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/switch-container', async (req, res) => {
    const { container_number, iphone_id } = req.body;
    if (!container_number || container_number < 1) {
        return res.status(400).json({ error: 'Valid container_number is required (1 or greater).' });
    }
    try {
        let iphoneQuery = `
      SELECT ip_address, xxtouch_port, name 
      FROM iphones 
      WHERE 1=1
    `;
        const queryParams = [];
        if (iphone_id) {
            iphoneQuery += ` AND id = $1`;
            queryParams.push(iphone_id);
        }
        else {
            iphoneQuery += ` ORDER BY last_seen DESC NULLS LAST, id ASC`;
        }
        iphoneQuery += ` LIMIT 1`;
        const iphoneResult = await database_1.db.query(iphoneQuery, queryParams);
        if (iphoneResult.rows.length === 0) {
            return res.status(404).json({
                error: iphone_id ? 'iPhone not found' : 'No iPhones available',
                details: iphone_id ? `iPhone ID ${iphone_id} not found` : 'Register an iPhone first'
            });
        }
        const { ip_address, xxtouch_port, name } = iphoneResult.rows[0];
        const iphoneUrl = `http://${ip_address}:${xxtouch_port || 46952}`;
        console.log(`[Container Switch] Using iPhone "${name}" at ${iphoneUrl} for container ${container_number}`);
        const path = require('path');
        const automationBridgePath = path.join(process.cwd(), '../bot/services/AutomationBridge.js');
        try {
            const AutomationBridge = require(automationBridgePath);
            const bridge = new AutomationBridge({
                iphoneIP: ip_address,
                iphonePort: xxtouch_port || 46952,
                maxContainers: 500
            });
            console.log(`[Container Switch] Starting container selection for container ${container_number}`);
            const success = await bridge.selectContainer(container_number);
            if (success) {
                console.log(`[Container Switch] ✅ Successfully switched to container ${container_number}`);
                res.json({
                    success: true,
                    message: `Successfully switched to container ${container_number}`,
                    iphone: name,
                    container_number: container_number
                });
            }
            else {
                console.log(`[Container Switch] ❌ Failed to switch to container ${container_number}`);
                res.status(500).json({
                    success: false,
                    error: 'Container switch failed',
                    message: `Failed to switch to container ${container_number}. Check iPhone connection and container number.`
                });
            }
        }
        catch (bridgeError) {
            console.error('[Container Switch] AutomationBridge error:', bridgeError);
            res.status(500).json({
                success: false,
                error: 'AutomationBridge initialization failed',
                message: bridgeError.message,
                details: 'Make sure the bot AutomationBridge service is available'
            });
        }
    }
    catch (error) {
        console.error('[Container Switch] Database error:', error);
        res.status(500).json({
            success: false,
            error: 'Database error',
            message: error.message
        });
    }
});
router.post('/pause/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = activeSessions.get(sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }
        if (session.status !== 'in_progress') {
            return res.status(400).json({
                success: false,
                error: 'Can only pause sessions that are in progress'
            });
        }
        session.status = 'paused';
        if (session.currentProcess) {
            try {
                session.currentProcess.kill();
                session.currentProcess = null;
            }
            catch (error) {
                console.warn(`[${sessionId}] Warning: Failed to kill current process:`, error.message);
            }
        }
        console.log(`[${sessionId}] Session paused by user request`);
        const client = sessionClients.get(sessionId);
        if (client && client.readyState === ws_1.WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'session_status',
                data: session
            }));
        }
        res.json({
            success: true,
            message: 'Session paused successfully',
            sessionId: sessionId,
            status: session.status
        });
    }
    catch (error) {
        console.error('Error pausing automation session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to pause automation session'
        });
    }
});
router.post('/stop/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = activeSessions.get(sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }
        if (session.currentProcess) {
            try {
                session.currentProcess.kill();
                session.currentProcess = null;
            }
            catch (error) {
                console.warn(`[${sessionId}] Warning: Failed to kill current process:`, error.message);
            }
        }
        session.status = 'failed';
        console.log(`[${sessionId}] Session stopped by user request`);
        const client = sessionClients.get(sessionId);
        if (client && client.readyState === ws_1.WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'session_status',
                data: session
            }));
        }
        activeSessions.delete(sessionId);
        sessionClients.delete(sessionId);
        res.json({
            success: true,
            message: 'Session stopped successfully',
            sessionId: sessionId
        });
    }
    catch (error) {
        console.error('Error stopping automation session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to stop automation session'
        });
    }
});
router.post('/resume/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = activeSessions.get(sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }
        if (session.status !== 'paused') {
            return res.status(400).json({
                success: false,
                error: 'Can only resume paused sessions'
            });
        }
        session.status = 'in_progress';
        console.log(`[${sessionId}] Session resumed by user request`);
        const client = sessionClients.get(sessionId);
        if (client && client.readyState === ws_1.WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'session_status',
                data: session
            }));
        }
        runSession(session).catch(err => {
            console.error(`[${sessionId}] Session execution failed after resume:`, err);
            session.status = 'failed';
        });
        res.json({
            success: true,
            message: 'Session resumed successfully',
            sessionId: sessionId,
            status: session.status
        });
    }
    catch (error) {
        console.error('Error resuming automation session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to resume automation session'
        });
    }
});
router.post('/pre-verify-email', async (req, res) => {
    try {
        const { accounts } = req.body;
        if (!Array.isArray(accounts) || accounts.length === 0) {
            return res.status(400).json({ error: 'Request body must contain a non-empty array of accounts.' });
        }
        for (const acc of accounts) {
            if (!acc.id || !acc.email || !acc.email_password) {
                return res.status(400).json({
                    error: `Missing required fields for account. Required: id, email, email_password.`,
                    account: acc
                });
            }
        }
        const scriptPath = path_1.default.join(process.cwd(), '../bot/scripts/api/pre_verify_email.js');
        console.log(`[API] Starting pre-verification for ${accounts.length} accounts`);
        const verificationPromises = accounts.map(account => {
            return new Promise((resolve) => {
                const childProcess = (0, child_process_1.spawn)('node', [scriptPath, JSON.stringify(account)], {
                    cwd: path_1.default.join(process.cwd(), '../bot'),
                    detached: false,
                    stdio: ['pipe', 'pipe', 'pipe']
                });
                let resultOutput = '';
                let errorOutput = '';
                childProcess.stdout.on('data', (data) => {
                    resultOutput += data.toString();
                });
                childProcess.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });
                childProcess.on('close', (code) => {
                    try {
                        if (code === 0 && resultOutput.trim()) {
                            const result = JSON.parse(resultOutput.trim());
                            resolve(result);
                        }
                        else {
                            resolve({
                                accountId: account.id,
                                success: false,
                                error: errorOutput || 'Unknown error occurred',
                                action: 'none'
                            });
                        }
                    }
                    catch (parseError) {
                        resolve({
                            accountId: account.id,
                            success: false,
                            error: 'Failed to parse verification result',
                            action: 'none'
                        });
                    }
                });
                childProcess.on('error', (error) => {
                    resolve({
                        accountId: account.id,
                        success: false,
                        error: error.message,
                        action: 'none'
                    });
                });
                setTimeout(() => {
                    if (!childProcess.killed) {
                        childProcess.kill();
                        resolve({
                            accountId: account.id,
                            success: false,
                            error: 'Verification timeout',
                            action: 'none'
                        });
                    }
                }, 30000);
            });
        });
        const results = await Promise.all(verificationPromises);
        const summary = {
            total: accounts.length,
            verified: results.filter(r => r.action === 'mark_ready').length,
            invalid: results.filter(r => r.action === 'mark_invalid').length,
            unchanged: results.filter(r => r.action === 'none').length,
            errors: results.filter(r => !r.success).length
        };
        console.log(`[API] Pre-verification completed:`, summary);
        res.json({
            success: true,
            message: `Pre-verification completed for ${accounts.length} accounts`,
            summary,
            results
        });
    }
    catch (error) {
        console.error('Error during pre-verification:', error);
        res.status(500).json({
            error: 'Failed to perform pre-verification',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=automation.js.map