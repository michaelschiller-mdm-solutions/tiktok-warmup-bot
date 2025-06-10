import express from 'express';
import { pool } from '../database';

const router = express.Router();

// Get overall system analytics
router.get('/overview', async (req, res) => {
  try {
    const [
      modelStatsResult,
      accountStatsResult,
      followStatsResult,
      recentActivityResult
    ] = await Promise.all([
      // Model statistics
      pool.query(`
        SELECT 
          COUNT(*) as total_models,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_models,
          COUNT(CASE WHEN status = 'paused' THEN 1 END) as paused_models,
          COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_models
        FROM models
      `),
      
      // Account statistics
      pool.query(`
        SELECT 
          COUNT(*) as total_accounts,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_accounts,
          COUNT(CASE WHEN status = 'banned' THEN 1 END) as banned_accounts,
          COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended_accounts
        FROM accounts
      `),
      
      // Follow statistics
      pool.query(`
        SELECT 
          COUNT(*) as total_follows,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_follows,
          COUNT(CASE WHEN status = 'unfollowed' THEN 1 END) as unfollowed_follows,
          AVG(CASE WHEN unfollowed_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (unfollowed_at - followed_at))/86400 
          END) as avg_follow_duration_days
        FROM model_target_follows
      `),
      
      // Recent activity
      pool.query(`
        SELECT 
          action_type,
          COUNT(*) as action_count,
          MAX(created_at) as last_action
        FROM activity_logs 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY action_type
        ORDER BY action_count DESC
      `)
    ]);

    res.json({
      success: true,
      data: {
        models: modelStatsResult.rows[0],
        accounts: accountStatsResult.rows[0],
        follows: followStatsResult.rows[0],
        recent_activity: recentActivityResult.rows
      }
    });

  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch analytics overview'
    });
  }
});

// Get time-series data for charts
router.get('/timeseries', async (req, res) => {
  try {
    const { 
      metric = 'follows', 
      period = '7d',
      model_id 
    } = req.query;

    let interval = '1 hour';
    let dateRange = '7 days';
    
    switch (period) {
      case '24h':
        interval = '1 hour';
        dateRange = '24 hours';
        break;
      case '7d':
        interval = '1 day';
        dateRange = '7 days';
        break;
      case '30d':
        interval = '1 day';
        dateRange = '30 days';
        break;
      case '90d':
        interval = '1 week';
        dateRange = '90 days';
        break;
    }

    let query = '';
    let params: any[] = [];

    if (metric === 'follows') {
      query = `
        SELECT 
          DATE_TRUNC($1, followed_at) as period,
          COUNT(*) as follows_count,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_follows,
          COUNT(CASE WHEN status = 'unfollowed' THEN 1 END) as unfollowed_follows
        FROM model_target_follows 
        WHERE followed_at >= NOW() - INTERVAL $2
        ${model_id ? 'AND model_id = $3' : ''}
        GROUP BY DATE_TRUNC($1, followed_at)
        ORDER BY period ASC
      `;
      params = [interval, dateRange];
      if (model_id) params.push(model_id);
      
    } else if (metric === 'accounts') {
      query = `
        SELECT 
          DATE_TRUNC($1, created_at) as period,
          COUNT(*) as accounts_added,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_accounts,
          COUNT(CASE WHEN status = 'banned' THEN 1 END) as banned_accounts
        FROM accounts 
        WHERE created_at >= NOW() - INTERVAL $2
        ${model_id ? 'AND model_id = $3' : ''}
        GROUP BY DATE_TRUNC($1, created_at)
        ORDER BY period ASC
      `;
      params = [interval, dateRange];
      if (model_id) params.push(model_id);
      
    } else if (metric === 'activity') {
      query = `
        SELECT 
          DATE_TRUNC($1, created_at) as period,
          action_type,
          COUNT(*) as action_count
        FROM activity_logs 
        WHERE created_at >= NOW() - INTERVAL $2
        ${model_id ? 'AND details->>'model_id' = $3' : ''}
        GROUP BY DATE_TRUNC($1, created_at), action_type
        ORDER BY period ASC, action_type
      `;
      params = [interval, dateRange];
      if (model_id) params.push(model_id);
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: {
        metric,
        period,
        interval,
        data: result.rows
      }
    });

  } catch (error) {
    console.error('Analytics timeseries error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch timeseries data'
    });
  }
});

// Get model performance comparison
router.get('/models/comparison', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        m.id,
        m.name,
        m.status,
        m.unfollow_ratio,
        m.daily_follow_limit,
        COUNT(DISTINCT a.id) as account_count,
        COUNT(DISTINCT CASE WHEN a.status = 'active' THEN a.id END) as active_accounts,
        COUNT(DISTINCT f.id) as total_follows,
        COUNT(DISTINCT CASE WHEN f.status = 'active' THEN f.id END) as active_follows,
        AVG(CASE WHEN f.unfollowed_at IS NOT NULL THEN 
          EXTRACT(EPOCH FROM (f.unfollowed_at - f.followed_at))/86400 
        END) as avg_follow_duration_days,
        COUNT(DISTINCT CASE WHEN f.followed_at >= NOW() - INTERVAL '7 days' THEN f.id END) as follows_last_7d,
        COUNT(DISTINCT CASE WHEN f.unfollowed_at >= NOW() - INTERVAL '7 days' THEN f.id END) as unfollows_last_7d
      FROM models m
      LEFT JOIN accounts a ON m.id = a.model_id
      LEFT JOIN model_target_follows f ON m.id = f.model_id
      GROUP BY m.id, m.name, m.status, m.unfollow_ratio, m.daily_follow_limit
      ORDER BY total_follows DESC, active_accounts DESC
    `);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Model comparison error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch model comparison data'
    });
  }
});

// Get activity feed for monitoring
router.get('/activity-feed', async (req, res) => {
  try {
    const { limit = 50, offset = 0, model_id } = req.query;

    let query = `
      SELECT 
        al.*,
        m.name as model_name,
        a.username as account_username
      FROM activity_logs al
      LEFT JOIN models m ON (al.details->>'model_id')::integer = m.id
      LEFT JOIN accounts a ON (al.details->>'account_id')::integer = a.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    if (model_id) {
      query += ` AND (al.details->>'model_id')::integer = $${params.length + 1}`;
      params.push(model_id);
    }

    query += ` ORDER BY al.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: result.rowCount
      }
    });

  } catch (error) {
    console.error('Activity feed error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch activity feed'
    });
  }
});

// Get performance metrics for a specific model
router.get('/models/:id/performance', async (req, res) => {
  try {
    const { id } = req.params;
    const { period = '30d' } = req.query;

    let dateRange = '30 days';
    switch (period) {
      case '7d': dateRange = '7 days'; break;
      case '30d': dateRange = '30 days'; break;
      case '90d': dateRange = '90 days'; break;
    }

    const [
      modelInfoResult,
      followStatsResult,
      accountStatsResult,
      dailyActivityResult
    ] = await Promise.all([
      // Model basic info
      pool.query('SELECT * FROM models WHERE id = $1', [id]),
      
      // Follow statistics
      pool.query(`
        SELECT 
          COUNT(*) as total_follows,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_follows,
          COUNT(CASE WHEN status = 'unfollowed' THEN 1 END) as unfollowed_follows,
          COUNT(CASE WHEN followed_at >= NOW() - INTERVAL $1 THEN 1 END) as recent_follows,
          AVG(CASE WHEN unfollowed_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (unfollowed_at - followed_at))/86400 
          END) as avg_follow_duration_days,
          (COUNT(CASE WHEN followed_at >= NOW() - INTERVAL $1 THEN 1 END)::float / 
           EXTRACT(EPOCH FROM INTERVAL $1)/86400) as daily_follow_rate
        FROM model_target_follows 
        WHERE model_id = $2
      `, [dateRange, id]),
      
      // Account statistics
      pool.query(`
        SELECT 
          COUNT(*) as total_accounts,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_accounts,
          COUNT(CASE WHEN status = 'banned' THEN 1 END) as banned_accounts,
          COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended_accounts,
          MAX(last_activity) as last_account_activity
        FROM accounts 
        WHERE model_id = $1
      `, [id]),
      
      // Daily activity breakdown
      pool.query(`
        SELECT 
          DATE(followed_at) as activity_date,
          COUNT(*) as follows_count,
          COUNT(DISTINCT account_id) as active_accounts
        FROM model_target_follows 
        WHERE model_id = $1 
          AND followed_at >= NOW() - INTERVAL $2
        GROUP BY DATE(followed_at)
        ORDER BY activity_date DESC
        LIMIT 30
      `, [id, dateRange])
    ]);

    if (modelInfoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Model not found'
      });
    }

    res.json({
      success: true,
      data: {
        model: modelInfoResult.rows[0],
        follow_stats: followStatsResult.rows[0],
        account_stats: accountStatsResult.rows[0],
        daily_activity: dailyActivityResult.rows,
        period
      }
    });

  } catch (error) {
    console.error('Model performance error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch model performance data'
    });
  }
});

export default router; 