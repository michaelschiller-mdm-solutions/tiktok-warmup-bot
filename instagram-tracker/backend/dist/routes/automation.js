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
const AccountLifecycleService_1 = require("../services/AccountLifecycleService");
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
    return new Promise(async (resolve, reject) => {
        try {
            console.log(`[${session.sessionId}] 🔍 Running pre-verification for account ${account.accountId} (${account.username})`);
            const preVerifyResult = await runPreVerification(account);
            if (preVerifyResult.action === 'mark_invalid') {
                console.log(`[${session.sessionId}] ❌ Account ${account.username} marked invalid due to email connection failure`);
                session.results.push({
                    accountId: account.accountId,
                    status: 'invalid',
                    error: preVerifyResult.message,
                    errorType: 'email_connection_failed'
                });
                const client = sessionClients.get(session.sessionId);
                if (client && client.readyState === ws_1.WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'session_completed',
                        data: {
                            sessionId: session.sessionId,
                            accountId: account.accountId,
                            username: account.username,
                            status: 'invalid',
                            error: preVerifyResult.message,
                            errorType: 'email_connection_failed'
                        }
                    }));
                }
                resolve();
                return;
            }
            else if (preVerifyResult.action === 'mark_ready') {
                console.log(`[${session.sessionId}] ✅ Account ${account.username} already has verification code - ready for bot assignment`);
                await AccountLifecycleService_1.AccountLifecycleService.transitionAccountState({
                    account_id: account.accountId,
                    to_state: AccountLifecycleService_1.AccountLifecycleState.READY_FOR_BOT_ASSIGNMENT,
                    reason: 'Pre-verification found existing token',
                    changed_by: 'automation_system'
                });
                session.results.push({
                    accountId: account.accountId,
                    status: 'completed_pre_verified',
                    message: preVerifyResult.message,
                    token: preVerifyResult.token
                });
                const client = sessionClients.get(session.sessionId);
                if (client && client.readyState === ws_1.WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'session_completed',
                        data: {
                            sessionId: session.sessionId,
                            accountId: account.accountId,
                            username: account.username,
                            status: 'completed_pre_verified',
                            message: `Pre-verification found existing token: ${preVerifyResult.token}`,
                            token: preVerifyResult.token
                        }
                    }));
                }
                resolve();
                return;
            }
            console.log(`[${session.sessionId}] 📱 No existing verification code found for ${account.username} - proceeding with full automation`);
            const payloadForScript = {
                ...account,
                sessionId: session.sessionId,
                verificationConfig: session.verificationConfig || {
                    requireManualVerification: true,
                    skipVerification: false,
                    requireScreenshot: true,
                    autoCompleteOnSuccess: false
                }
            };
            const automationData = JSON.stringify(payloadForScript);
            const scriptPath = path_1.default.join(process.cwd(), '../bot/scripts/api/account_setup.js');
            console.log(`[${session.sessionId}] 🤖 Starting full automation for account ${account.accountId}`);
            const child = (0, child_process_1.spawn)('node', [scriptPath, automationData], {
                cwd: path_1.default.join(process.cwd(), '../bot'),
                detached: false,
                stdio: ['pipe', 'pipe', 'pipe']
            });
            session.currentProcess = child;
            let finalOutput = '';
            child.stdout.on('data', (data) => {
                const messageStr = data.toString();
                finalOutput += messageStr;
                messageStr.split('\n').forEach((line) => {
                    if (line.trim()) {
                        try {
                            const message = JSON.parse(line);
                            const client = sessionClients.get(session.sessionId);
                            if (client && client.readyState === ws_1.WebSocket.OPEN) {
                                console.log(`[WebSocket] Sending progress update:`, message.type, message.data?.stepName || message.data?.status);
                                client.send(JSON.stringify(message));
                            }
                            else {
                                console.warn(`[WebSocket] No client connected for session ${session.sessionId}`);
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
                    try {
                        const lines = finalOutput.split('\n').filter(line => line.trim());
                        const lastLine = lines[lines.length - 1];
                        if (lastLine && lastLine.includes('Setup result:')) {
                            const resultStart = lastLine.indexOf('{');
                            if (resultStart !== -1) {
                                const jsonStr = lastLine.substring(resultStart);
                                const finalResult = JSON.parse(jsonStr);
                                if (finalResult.requiresManualVerification) {
                                    console.log(`[${session.sessionId}] 📸 Account ${account.accountId} requires manual verification, pausing session.`);
                                    session.status = 'paused';
                                    updateAccountWithVerificationData(account.accountId, {
                                        requiresManualVerification: true,
                                        screenshotCaptured: finalResult.screenshotCaptured,
                                        token: finalResult.token
                                    }).catch(error => {
                                        console.error(`Failed to update verification data for account ${account.accountId}:`, error);
                                    });
                                    const client = sessionClients.get(session.sessionId);
                                    if (client && client.readyState === ws_1.WebSocket.OPEN) {
                                        client.send(JSON.stringify({
                                            type: 'session_paused_for_verification',
                                            data: {
                                                sessionId: session.sessionId,
                                                accountId: account.accountId,
                                                username: account.username,
                                                message: 'Session paused, manual verification required.',
                                                screenshotPath: finalResult.screenshotPath,
                                                token: finalResult.token
                                            }
                                        }));
                                    }
                                    reject(new Error(`Session paused for manual verification of account ${account.username}`));
                                    return;
                                }
                                else {
                                    console.log(`[${session.sessionId}] ✅ Account ${account.accountId} completed without verification - ready for bot assignment`);
                                    AccountLifecycleService_1.AccountLifecycleService.transitionAccountState({
                                        account_id: account.accountId,
                                        to_state: AccountLifecycleService_1.AccountLifecycleState.READY_FOR_BOT_ASSIGNMENT,
                                        reason: 'Automation completed successfully without verification requirement',
                                        changed_by: 'automation_system'
                                    }).catch(error => {
                                        console.error(`Failed to transition account ${account.accountId} to ready state:`, error);
                                    });
                                }
                            }
                        }
                    }
                    catch (parseError) {
                        console.warn(`[${session.sessionId}] Failed to parse completion data for account ${account.accountId}:`, parseError);
                        updateAccountWithVerificationData(account.accountId, {
                            requiresManualVerification: true,
                            screenshotCaptured: false,
                            token: ''
                        }).catch(error => {
                            console.error(`Failed to update verification data for account ${account.accountId}:`, error);
                        });
                    }
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
        }
        catch (error) {
            console.error(`[${session.sessionId}] ❌ Error in processAccount for ${account.username}:`, error);
            session.results.push({ accountId: account.accountId, status: 'failed', error: error.message });
            reject(error);
        }
    });
}
async function runPreVerification(account) {
    return new Promise((resolve) => {
        const scriptPath = path_1.default.join(process.cwd(), '../bot/scripts/api/pre_verify_email.js');
        const accountData = {
            id: account.accountId,
            email: account.email,
            email_password: account.email_password,
            username: account.username
        };
        const childProcess = (0, child_process_1.spawn)('node', [scriptPath, JSON.stringify(accountData)], {
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
                        accountId: account.accountId,
                        success: false,
                        message: errorOutput || 'Unknown error occurred',
                        action: 'none'
                    });
                }
            }
            catch (parseError) {
                resolve({
                    accountId: account.accountId,
                    success: false,
                    message: 'Failed to parse verification result',
                    action: 'none'
                });
            }
        });
        childProcess.on('error', (error) => {
            resolve({
                accountId: account.accountId,
                success: false,
                message: error.message,
                action: 'none'
            });
        });
        setTimeout(() => {
            if (!childProcess.killed) {
                childProcess.kill();
                resolve({
                    accountId: account.accountId,
                    success: false,
                    message: 'Pre-verification timeout',
                    action: 'none'
                });
            }
        }, 15000);
    });
}
async function runSession(session) {
    for (let i = session.currentAccountIndex + 1; i < session.accounts.length; i++) {
        if (session.status !== 'in_progress') {
            console.log(`[${session.sessionId}] Session is not in progress (current status: ${session.status}). Halting execution.`);
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
                errorType: error.message?.includes('token') ? 'no_token_found' :
                    error.message?.includes('paused for manual verification') ? 'paused_for_verification' : 'technical'
            });
            if (error.message?.includes('paused for manual verification')) {
                console.log(`[${session.sessionId}] Session halted for manual verification.`);
                return;
            }
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
        let accounts;
        let verificationConfig = {
            requireManualVerification: true,
            skipVerification: false,
            requireScreenshot: true,
            autoCompleteOnSuccess: false
        };
        if (Array.isArray(req.body)) {
            accounts = req.body;
        }
        else if (req.body.accounts && Array.isArray(req.body.accounts)) {
            accounts = req.body.accounts;
            if (req.body.verificationConfig) {
                verificationConfig = { ...verificationConfig, ...req.body.verificationConfig };
            }
        }
        else {
            return res.status(400).json({ error: 'Request body must be either an array of accounts or an object with accounts and verificationConfig.' });
        }
        if (accounts.length === 0) {
            return res.status(400).json({ error: 'Request must contain at least one account.' });
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
            verificationConfig,
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
            currentAccountIndex: session.currentAccountIndex,
            accounts: session.accounts,
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
                console.log(`[${sessionId}] Stopping current process (PID: ${session.currentProcess.pid})`);
                session.currentProcess.kill('SIGTERM');
                setTimeout(() => {
                    if (session.currentProcess && !session.currentProcess.killed) {
                        console.log(`[${sessionId}] Force killing process after timeout`);
                        session.currentProcess.kill('SIGKILL');
                    }
                }, 5000);
                session.currentProcess = null;
            }
            catch (error) {
                console.warn(`[${sessionId}] Warning: Failed to kill current process:`, error.message);
            }
        }
        try {
            if (session.accounts && session.currentAccountIndex >= 0) {
                const currentAccount = session.accounts[session.currentAccountIndex];
                if (currentAccount && currentAccount.containerNumber) {
                    console.log(`[${sessionId}] Attempting to stop device scripts for container ${currentAccount.containerNumber}`);
                    const iphoneQuery = `
             SELECT ip_address, xxtouch_port 
             FROM iphones 
             ORDER BY last_seen DESC NULLS LAST, id ASC 
             LIMIT 1
           `;
                    const iphoneResult = await database_1.db.query(iphoneQuery);
                    if (iphoneResult.rows.length > 0) {
                        const { ip_address, xxtouch_port } = iphoneResult.rows[0];
                        const stopUrl = `http://${ip_address}:${xxtouch_port || 46952}/stop_script_file`;
                        const axios = require('axios');
                        const stopResponse = await axios.post(stopUrl, {}, {
                            timeout: 3000
                        });
                        if (stopResponse.status === 200) {
                            console.log(`[${sessionId}] ✅ Successfully stopped device scripts`);
                        }
                        else {
                            console.log(`[${sessionId}] ⚠️ Device script stop response: ${stopResponse.status}`);
                        }
                    }
                }
            }
        }
        catch (deviceError) {
            console.warn(`[${sessionId}] Could not stop device scripts (this is often okay):`, deviceError.message);
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
            status: session.status,
            device_script_stopped: true
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
                console.log(`[${sessionId}] Stopping current process (PID: ${session.currentProcess.pid})`);
                session.currentProcess.kill('SIGTERM');
                setTimeout(() => {
                    if (session.currentProcess && !session.currentProcess.killed) {
                        console.log(`[${sessionId}] Force killing process after timeout`);
                        session.currentProcess.kill('SIGKILL');
                    }
                }, 3000);
                session.currentProcess = null;
            }
            catch (error) {
                console.warn(`[${sessionId}] Warning: Failed to kill current process:`, error.message);
            }
        }
        try {
            if (session.accounts && session.currentAccountIndex >= 0) {
                const currentAccount = session.accounts[session.currentAccountIndex];
                if (currentAccount && currentAccount.containerNumber) {
                    console.log(`[${sessionId}] Attempting to stop device scripts for container ${currentAccount.containerNumber}`);
                    const iphoneQuery = `
            SELECT ip_address, xxtouch_port 
            FROM iphones 
            ORDER BY last_seen DESC NULLS LAST, id ASC 
            LIMIT 1
          `;
                    const iphoneResult = await database_1.db.query(iphoneQuery);
                    if (iphoneResult.rows.length > 0) {
                        const { ip_address, xxtouch_port } = iphoneResult.rows[0];
                        const stopUrl = `http://${ip_address}:${xxtouch_port || 46952}/stop_script_file`;
                        const axios = require('axios');
                        const stopResponse = await axios.post(stopUrl, {}, {
                            timeout: 2000
                        });
                        if (stopResponse.status === 200) {
                            console.log(`[${sessionId}] ✅ Successfully stopped device scripts`);
                        }
                    }
                }
            }
        }
        catch (deviceError) {
            console.warn(`[${sessionId}] Could not stop device scripts (this is often okay):`, deviceError.message);
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
            sessionId: sessionId,
            device_script_stopped: true
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
            console.log(`[API] Validating account:`, JSON.stringify(acc, null, 2));
            if (!acc.id || !acc.email || !acc.email_password) {
                console.log(`[API] ❌ Validation failed for account:`, acc);
                return res.status(400).json({
                    error: `Missing required fields for account. Required: id, email, email_password.`,
                    account: acc
                });
            }
            console.log(`[API] ✅ Account ${acc.id} validation passed`);
        }
        const scriptPath = path_1.default.join(process.cwd(), '../bot/scripts/api/pre_verify_email.js');
        console.log(`[API] Starting pre-verification for ${accounts.length} accounts`);
        const BATCH_SIZE = 5;
        const results = [];
        const totalBatches = Math.ceil(accounts.length / BATCH_SIZE);
        for (let i = 0; i < accounts.length; i += BATCH_SIZE) {
            const batch = accounts.slice(i, i + BATCH_SIZE);
            const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
            console.log(`[API] Processing batch ${batchNumber}/${totalBatches} (${batch.length} accounts)`);
            const batchPromises = batch.map(account => {
                return new Promise((resolve) => {
                    console.log(`[API] 🚀 Starting pre-verification for account ${account.id} (${account.email})`);
                    console.log(`[API] 📤 Spawning: node ${scriptPath} '${JSON.stringify(account)}'`);
                    const childProcess = (0, child_process_1.spawn)('node', [scriptPath, JSON.stringify(account)], {
                        cwd: path_1.default.join(process.cwd(), '../bot'),
                        detached: false,
                        stdio: ['pipe', 'pipe', 'pipe']
                    });
                    let resultOutput = '';
                    let errorOutput = '';
                    childProcess.stdout.on('data', (data) => {
                        const chunk = data.toString();
                        console.log(`[API] 📥 Account ${account.id} STDOUT:`, chunk.trim());
                        resultOutput += chunk;
                    });
                    childProcess.stderr.on('data', (data) => {
                        const chunk = data.toString();
                        console.log(`[API] 🔍 Account ${account.id} STDERR:`, chunk.trim());
                        errorOutput += chunk;
                    });
                    childProcess.on('close', (code) => {
                        console.log(`[API] 🏁 Account ${account.id} process closed with code:`, code);
                        console.log(`[API] 📊 Account ${account.id} full stdout:`, resultOutput);
                        console.log(`[API] 📊 Account ${account.id} full stderr:`, errorOutput);
                        try {
                            if (code === 0 && resultOutput.trim()) {
                                const result = JSON.parse(resultOutput.trim());
                                console.log(`[API] ✅ Account ${account.id} parsed result:`, result);
                                resolve(result);
                            }
                            else {
                                console.log(`[API] ❌ Account ${account.id} failed - code: ${code}, output: ${resultOutput}`);
                                resolve({
                                    accountId: account.id,
                                    success: false,
                                    error: errorOutput || `Process failed with code ${code}`,
                                    action: 'none'
                                });
                            }
                        }
                        catch (parseError) {
                            console.log(`[API] ❌ Account ${account.id} JSON parse error:`, parseError);
                            resolve({
                                accountId: account.id,
                                success: false,
                                error: `Failed to parse verification result: ${parseError}`,
                                action: 'none'
                            });
                        }
                    });
                    childProcess.on('error', (error) => {
                        console.log(`[API] ❌ Account ${account.id} spawn error:`, error);
                        resolve({
                            accountId: account.id,
                            success: false,
                            error: error.message,
                            action: 'none'
                        });
                    });
                    setTimeout(() => {
                        if (!childProcess.killed) {
                            console.log(`[API] ⏰ Account ${account.id} timeout after 45s, killing process`);
                            childProcess.kill();
                            resolve({
                                accountId: account.id,
                                success: false,
                                error: 'Verification timeout (45s)',
                                action: 'none'
                            });
                        }
                    }, 45000);
                });
            });
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            if (i + BATCH_SIZE < accounts.length) {
                console.log(`[API] Waiting 2 seconds before next batch...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
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
router.post('/assign-content-ready-accounts', async (req, res) => {
    try {
        console.log('[Content Assignment] Starting content assignment for ready accounts');
        const accounts = await AccountLifecycleService_1.AccountLifecycleService.getAccountsByState(AccountLifecycleService_1.AccountLifecycleState.READY_FOR_BOT_ASSIGNMENT, 1000, 0);
        if (accounts.length === 0) {
            return res.json({
                success: true,
                message: 'No accounts found in ready for bot assignment state',
                processed: 0
            });
        }
        console.log(`[Content Assignment] Found ${accounts.length} accounts ready for bot assignment`);
        const results = [];
        let processed = 0;
        let failed = 0;
        for (const account of accounts) {
            try {
                console.log(`[Content Assignment] Processing account ${account.id} (${account.username})`);
                await assignContentToAccount(account.id, account.model_id);
                await AccountLifecycleService_1.AccountLifecycleService.transitionAccountState({
                    account_id: account.id,
                    to_state: AccountLifecycleService_1.AccountLifecycleState.WARMUP,
                    reason: 'Content assigned, ready for warmup phases',
                    changed_by: 'content_assignment_system'
                });
                await initializeWarmupPhasesWithContent(account.id);
                results.push({
                    accountId: account.id,
                    username: account.username,
                    status: 'success',
                    message: 'Content assigned and warmup initialized'
                });
                processed++;
                console.log(`[Content Assignment] ✅ Successfully processed account ${account.id}`);
            }
            catch (error) {
                console.error(`[Content Assignment] ❌ Failed to process account ${account.id}:`, error.message);
                results.push({
                    accountId: account.id,
                    username: account.username,
                    status: 'failed',
                    error: error.message
                });
                failed++;
            }
        }
        console.log(`[Content Assignment] Completed: ${processed} successful, ${failed} failed`);
        res.json({
            success: true,
            message: `Content assignment completed: ${processed} successful, ${failed} failed`,
            processed,
            failed,
            results
        });
    }
    catch (error) {
        console.error('[Content Assignment] Error during bulk content assignment:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to assign content to ready accounts',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
async function setAccountPrivate(containerNumber) {
    return new Promise((resolve, reject) => {
        const scriptPath = path_1.default.join(process.cwd(), '../bot/scripts/api/lua_executor.js');
        const commands = [
            {
                script: 'open_settings.lua',
                description: 'Open container settings'
            },
            {
                script: 'scroll_to_top_container.lua',
                description: 'Scroll to top of container list'
            },
            {
                script: `select_container_${containerNumber}.lua`,
                description: `Select container ${containerNumber}`
            },
            {
                script: 'set_account_private.lua',
                description: 'Set account to private'
            }
        ];
        let currentCommand = 0;
        function executeNextCommand() {
            if (currentCommand >= commands.length) {
                resolve();
                return;
            }
            const command = commands[currentCommand];
            console.log(`[Set Private] Executing: ${command.description}`);
            const childProcess = (0, child_process_1.spawn)('node', [scriptPath, command.script], {
                cwd: path_1.default.join(process.cwd(), '../bot'),
                detached: false,
                stdio: ['pipe', 'pipe', 'pipe']
            });
            let output = '';
            let errorOutput = '';
            childProcess.stdout.on('data', (data) => {
                output += data.toString();
            });
            childProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });
            childProcess.on('close', (code) => {
                if (code === 0) {
                    console.log(`[Set Private] ✅ ${command.description} completed`);
                    currentCommand++;
                    setTimeout(executeNextCommand, 2000);
                }
                else {
                    console.error(`[Set Private] ❌ ${command.description} failed with code ${code}`);
                    reject(new Error(`Failed to execute ${command.description}: ${errorOutput}`));
                }
            });
            childProcess.on('error', (error) => {
                reject(new Error(`Failed to start ${command.description}: ${error.message}`));
            });
        }
        executeNextCommand();
    });
}
async function assignContentToAccount(accountId, modelId) {
    const bundleQuery = `
    SELECT DISTINCT cb.id as bundle_id, cb.name
    FROM content_bundles cb
    JOIN model_bundle_assignments mba ON cb.id = mba.bundle_id
    WHERE mba.model_id = $1 AND cb.status = 'active'
  `;
    const bundleResult = await database_1.db.query(bundleQuery, [modelId]);
    if (bundleResult.rows.length === 0) {
        throw new Error(`No content bundles assigned to model ${modelId}`);
    }
    console.log(`[Content Assignment] Found ${bundleResult.rows.length} content bundles for model ${modelId}`);
    const bundleIds = bundleResult.rows.map(row => row.bundle_id);
    const modelQuery = `SELECT name FROM models WHERE id = $1`;
    const modelResult = await database_1.db.query(modelQuery, [modelId]);
    const modelName = modelResult.rows[0]?.name || 'Model';
    const phaseContentRules = {
        'bio': { textCategories: ['bio'], required: 'text_only' },
        'gender': { required: 'none' },
        'name': { text: modelName, required: 'fixed_text' },
        'username': { textCategories: ['username'], required: 'text_only' },
        'first_highlight': {
            imageCategories: ['highlight'],
            textCategories: ['me'],
            required: 'image_and_text'
        },
        'new_highlight': {
            imageCategories: ['highlight'],
            textCategories: ['highlight_group_name'],
            required: 'image_and_text'
        },
        'post_caption': {
            imageCategories: ['post'],
            textCategories: ['post'],
            required: 'image_and_text'
        },
        'post_no_caption': {
            imageCategories: ['post'],
            required: 'image_only'
        },
        'story_caption': {
            imageCategories: ['story'],
            textCategories: ['story'],
            required: 'image_and_text'
        },
        'story_no_caption': {
            imageCategories: ['story'],
            required: 'image_only'
        }
    };
    for (const [phase, rules] of Object.entries(phaseContentRules)) {
        if (rules.required === 'none')
            continue;
        console.log(`[Content Assignment] Assigning content for phase: ${phase}`);
        let imageContentId = null;
        let textContentId = null;
        let textContent = null;
        if (rules.required === 'fixed_text') {
            textContent = rules.text;
        }
        else if (phase === 'first_highlight') {
            textContent = 'Me';
        }
        if (rules.imageCategories && (rules.required === 'image_only' || rules.required === 'image_and_text')) {
            const imageQuery = `
        SELECT DISTINCT cc.id
        FROM central_content cc
        JOIN bundle_content_assignments bca ON cc.id = bca.content_id
        WHERE bca.bundle_id = ANY($1)
          AND cc.status = 'active'
          AND cc.content_type = 'image'
          AND cc.categories ?| $2
        ORDER BY RANDOM()
        LIMIT 1
      `;
            const imageResult = await database_1.db.query(imageQuery, [bundleIds, rules.imageCategories]);
            if (imageResult.rows.length > 0) {
                imageContentId = imageResult.rows[0].id;
            }
        }
        if (rules.textCategories && rules.required === 'text_only') {
            const textQuery = `
        SELECT DISTINCT ctc.id, ctc.text_content
        FROM central_text_content ctc
        JOIN bundle_content_assignments bca ON ctc.id = bca.text_content_id
        WHERE bca.bundle_id = ANY($1)
          AND ctc.status = 'active'
          AND ctc.categories ?| $2
        ORDER BY RANDOM()
        LIMIT 1
      `;
            const textResult = await database_1.db.query(textQuery, [bundleIds, rules.textCategories]);
            if (textResult.rows.length > 0) {
                textContentId = textResult.rows[0].id;
                textContent = textResult.rows[0].text_content;
            }
        }
        else if (rules.textCategories && rules.required === 'image_and_text' && !textContent) {
            const textQuery = `
        SELECT DISTINCT ctc.id, ctc.text_content
        FROM central_text_content ctc
        JOIN bundle_content_assignments bca ON ctc.id = bca.text_content_id
        WHERE bca.bundle_id = ANY($1)
          AND ctc.status = 'active'
          AND ctc.categories ?| $2
        ORDER BY RANDOM()
        LIMIT 1
      `;
            const textResult = await database_1.db.query(textQuery, [bundleIds, rules.textCategories]);
            if (textResult.rows.length > 0) {
                textContentId = textResult.rows[0].id;
                textContent = textResult.rows[0].text_content;
            }
        }
        const updatePhaseQuery = `
      UPDATE account_warmup_phases 
      SET 
        assigned_content_id = $2,
        assigned_text_id = $3,
        content_assigned_at = CURRENT_TIMESTAMP
      WHERE account_id = $1 AND phase = $4
    `;
        await database_1.db.query(updatePhaseQuery, [accountId, imageContentId, textContentId, phase]);
        console.log(`[Content Assignment] ✅ Assigned content for ${phase}: image=${imageContentId}, text=${textContentId}`);
    }
}
async function initializeWarmupPhasesWithContent(accountId) {
    const initQuery = `SELECT initialize_warmup_phases($1)`;
    await database_1.db.query(initQuery, [accountId]);
    console.log(`[Content Assignment] ✅ Warmup phases initialized for account ${accountId}`);
}
async function updateAccountWithVerificationData(accountId, data) {
    try {
        const updateQuery = `
      UPDATE accounts
      SET
        verification_required = $1,
        verification_status = CASE 
          WHEN $1 = true THEN 'pending_verification'
          ELSE 'not_required'
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
        await database_1.db.query(updateQuery, [data.requiresManualVerification, accountId]);
        console.log(`[Verification] Updated account ${accountId} with verification requirements: ${data.requiresManualVerification}`);
    }
    catch (error) {
        console.error(`Failed to update verification data for account ${accountId}:`, error);
        throw error;
    }
}
exports.default = router;
//# sourceMappingURL=automation.js.map