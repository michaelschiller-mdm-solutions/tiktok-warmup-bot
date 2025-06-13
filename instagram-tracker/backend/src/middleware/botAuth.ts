import { Request, Response, NextFunction } from 'express';
import { db } from '../database';
import crypto from 'crypto';

interface BotRequest extends Request {
  botId?: string;
  sessionId?: string;
  botSession?: any;
}

/**
 * Bot authentication middleware
 * Validates bot API key and manages bot sessions
 */
export const botAuthMiddleware = async (req: BotRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const botId = req.headers['x-bot-id'] as string;
    const sessionId = req.headers['x-session-id'] as string;

    // Check for required headers
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

    // Extract API key
    const apiKey = authHeader.substring(4);

    // Validate API key (simple validation - in production use proper JWT or similar)
    if (!isValidApiKey(apiKey)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    // Check or create bot session
    const botSession = await getOrCreateBotSession(botId, sessionId, req);

    if (!botSession) {
      return res.status(401).json({
        success: false,
        error: 'Failed to create or validate bot session'
      });
    }

    // Check if session is still active
    const isActive = await isSessionActive(sessionId);
    
    if (!isActive) {
      return res.status(401).json({
        success: false,
        error: 'Bot session has expired or been terminated'
      });
    }

    // Update session heartbeat
    await updateSessionHeartbeat(sessionId);

    // Attach bot info to request
    req.botId = botId;
    req.sessionId = sessionId;
    req.botSession = botSession;

    next();

  } catch (error) {
    console.error('Bot authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal authentication error'
    });
  }
};

/**
 * Validate API key (simplified validation)
 * In production, use proper JWT tokens or database-stored keys
 */
function isValidApiKey(apiKey: string): boolean {
  // Simple validation - check if it's a valid format
  // In production, validate against database or JWT
  const apiKeyPattern = /^bot_[a-f0-9]{32}$/i;
  
  // For development, accept a few predefined keys
  const validKeys = [
    'bot_development_key_123456789',
    'bot_testing_key_987654321',
    process.env.BOT_API_KEY
  ].filter(Boolean);

  return apiKeyPattern.test(apiKey) || validKeys.includes(apiKey);
}

/**
 * Get existing bot session or create new one
 */
async function getOrCreateBotSession(botId: string, sessionId: string, req: BotRequest): Promise<any> {
  try {
    // Check if session already exists
    const existingSession = await db.query(
      'SELECT * FROM bot_sessions WHERE session_id = $1',
      [sessionId]
    );

    if (existingSession.rows.length > 0) {
      const session = existingSession.rows[0];
      
      // Verify bot ID matches
      if (session.bot_id !== botId) {
        throw new Error('Session belongs to different bot');
      }

      return session;
    }

    // Create new session
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
    
    const newSession = await db.query(`
      INSERT INTO bot_sessions (
        bot_id, session_id, bot_type, user_agent, ip_address,
        system_info, max_accounts_per_session, session_timeout_minutes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      botId,
      sessionId,
      'warmup', // default bot type
      userAgent,
      ipAddress,
      JSON.stringify({
        user_agent: userAgent,
        ip_address: ipAddress,
        created_at: new Date().toISOString()
      }),
      10, // max accounts per session
      120 // 2 hour timeout
    ]);

    return newSession.rows[0];

  } catch (error) {
    console.error('Error managing bot session:', error);
    return null;
  }
}

/**
 * Check if bot session is still active
 */
async function isSessionActive(sessionId: string): Promise<boolean> {
  try {
    const result = await db.query(
      'SELECT is_bot_session_active($1) as is_active',
      [sessionId]
    );
    
    return result.rows[0]?.is_active || false;
  } catch (error) {
    console.error('Error checking session status:', error);
    return false;
  }
}

/**
 * Update session heartbeat
 */
async function updateSessionHeartbeat(sessionId: string): Promise<void> {
  try {
    await db.query(`
      UPDATE bot_sessions 
      SET last_heartbeat = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE session_id = $1
    `, [sessionId]);
  } catch (error) {
    console.error('Error updating session heartbeat:', error);
  }
}

/**
 * Generate session ID (helper function for bots)
 */
export function generateSessionId(botId: string): string {
  const timestamp = Date.now().toString();
  const random = crypto.randomBytes(16).toString('hex');
  return `${botId}_${timestamp}_${random}`;
}

/**
 * Generate API key (helper function for bot registration)
 */
export function generateApiKey(): string {
  const random = crypto.randomBytes(16).toString('hex');
  return `bot_${random}`;
}

/**
 * Middleware to log bot actions
 */
export const logBotAction = (actionType: string) => {
  return async (req: BotRequest, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // Continue with request
    next();
    
    // Log action after response (fire and forget)
    setImmediate(async () => {
      try {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        const accountId = req.params.id ? parseInt(req.params.id) : null;
        const phase = req.params.phase || null;
        
        await db.query(`
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
      } catch (error) {
        console.error('Error logging bot action:', error);
      }
    });
  };
}; 