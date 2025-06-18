"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logBotAction = exports.botAuthMiddleware = void 0;
exports.generateSessionId = generateSessionId;
exports.generateApiKey = generateApiKey;
const database_1 = require("../database");
const crypto_1 = __importDefault(require("crypto"));
const botAuthMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const botId = req.headers['x-bot-id'];
        const sessionId = req.headers['x-session-id'];
        if (!authHeader || !authHeader.startsWith('Bot ')) {
            return res.status(401).json({
                success: false,
                error: 'Missing or invalid authorization header. Use "Bot <api_key>"'
            });
        }
        if (!botId) {
            return res.status(401).json({
                success: false,
                error: 'Missing X-Bot-Id header'
            });
        }
        if (!sessionId) {
            return res.status(401).json({
                success: false,
                error: 'Missing X-Session-Id header'
            });
        }
        const apiKey = authHeader.substring(4);
        if (!isValidApiKey(apiKey)) {
            return res.status(401).json({
                success: false,
                error: 'Invalid API key'
            });
        }
        const botSession = await getOrCreateBotSession(botId, sessionId, req);
        if (!botSession) {
            return res.status(401).json({
                success: false,
                error: 'Failed to create or validate bot session'
            });
        }
        const isActive = await isSessionActive(sessionId);
        if (!isActive) {
            return res.status(401).json({
                success: false,
                error: 'Bot session has expired or been terminated'
            });
        }
        await updateSessionHeartbeat(sessionId);
        req.botId = botId;
        req.sessionId = sessionId;
        req.botSession = botSession;
        next();
    }
    catch (error) {
        console.error('Bot authentication error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal authentication error'
        });
    }
};
exports.botAuthMiddleware = botAuthMiddleware;
function isValidApiKey(apiKey) {
    const apiKeyPattern = /^bot_[a-f0-9]{32}$/i;
    const validKeys = [
        'bot_development_key_123456789',
        'bot_testing_key_987654321',
        process.env.BOT_API_KEY
    ].filter(Boolean);
    return apiKeyPattern.test(apiKey) || validKeys.includes(apiKey);
}
async function getOrCreateBotSession(botId, sessionId, req) {
    try {
        const existingSession = await database_1.db.query('SELECT * FROM bot_sessions WHERE session_id = $1', [sessionId]);
        if (existingSession.rows.length > 0) {
            const session = existingSession.rows[0];
            if (session.bot_id !== botId) {
                throw new Error('Session belongs to different bot');
            }
            return session;
        }
        const userAgent = req.headers['user-agent'] || 'Unknown';
        const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
        const newSession = await database_1.db.query(`
      INSERT INTO bot_sessions (
        bot_id, session_id, bot_type, user_agent, ip_address,
        system_info, max_accounts_per_session, session_timeout_minutes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
            botId,
            sessionId,
            'warmup',
            userAgent,
            ipAddress,
            JSON.stringify({
                user_agent: userAgent,
                ip_address: ipAddress,
                created_at: new Date().toISOString()
            }),
            10,
            120
        ]);
        return newSession.rows[0];
    }
    catch (error) {
        console.error('Error managing bot session:', error);
        return null;
    }
}
async function isSessionActive(sessionId) {
    try {
        const result = await database_1.db.query('SELECT is_bot_session_active($1) as is_active', [sessionId]);
        return result.rows[0]?.is_active || false;
    }
    catch (error) {
        console.error('Error checking session status:', error);
        return false;
    }
}
async function updateSessionHeartbeat(sessionId) {
    try {
        await database_1.db.query(`
      UPDATE bot_sessions 
      SET last_heartbeat = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE session_id = $1
    `, [sessionId]);
    }
    catch (error) {
        console.error('Error updating session heartbeat:', error);
    }
}
function generateSessionId(botId) {
    const timestamp = Date.now().toString();
    const random = crypto_1.default.randomBytes(16).toString('hex');
    return `${botId}_${timestamp}_${random}`;
}
function generateApiKey() {
    const random = crypto_1.default.randomBytes(16).toString('hex');
    return `bot_${random}`;
}
const logBotAction = (actionType) => {
    return async (req, res, next) => {
        const startTime = Date.now();
        next();
        setImmediate(async () => {
            try {
                const endTime = Date.now();
                const duration = endTime - startTime;
                const accountId = req.params.id ? parseInt(req.params.id) : null;
                const phase = req.params.phase || null;
                await database_1.db.query(`
          INSERT INTO bot_action_logs (
            bot_session_id, bot_id, account_id, phase_name,
            action_type, action_description, action_started_at,
            action_completed_at, action_duration_ms, status
          ) 
          SELECT 
            bs.id, $1, $2, $3, $4, $5, 
            CURRENT_TIMESTAMP - INTERVAL '${duration} milliseconds',
            CURRENT_TIMESTAMP, $6, 'completed'
          FROM bot_sessions bs 
          WHERE bs.session_id = $7
        `, [
                    req.botId,
                    accountId,
                    phase,
                    actionType,
                    `${req.method} ${req.path}`,
                    duration,
                    req.sessionId
                ]);
            }
            catch (error) {
                console.error('Error logging bot action:', error);
            }
        });
    };
};
exports.logBotAction = logBotAction;
//# sourceMappingURL=botAuth.js.map