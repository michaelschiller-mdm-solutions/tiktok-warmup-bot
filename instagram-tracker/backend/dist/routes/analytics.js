"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../database");
const router = express_1.default.Router();
router.get('/overview', async (req, res) => {
    try {
        const [modelStatsResult, accountStatsResult, followStatsResult, recentActivityResult] = await Promise.all([
            database_1.db.query(`
        SELECT 
          COUNT(*) as total_models,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_models,
          COUNT(CASE WHEN status = 'paused' THEN 1 END) as paused_models,
          COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_models
        FROM models
      `),
            database_1.db.query(`
        SELECT 
          COUNT(*) as total_accounts,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_accounts,
          COUNT(CASE WHEN status = 'banned' THEN 1 END) as banned_accounts,
          COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended_accounts
        FROM accounts
      `),
            database_1.db.query(`
        SELECT 
          COUNT(*) as total_follows,
          COUNT(CASE WHEN status = 'following' THEN 1 END) as active_follows,
          COUNT(CASE WHEN status = 'unfollowed' THEN 1 END) as unfollowed_follows,
          AVG(CASE WHEN unfollowed_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (unfollowed_at - followed_at))/86400 
          END) as avg_follow_duration_days
        FROM model_target_follows
      `),
            database_1.db.query(`
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
    }
    catch (error) {
        console.error('Analytics overview error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to fetch analytics overview'
        });
    }
});
router.get('/dashboard', async (req, res) => {
    try {
        const { model_id, date_from, date_to } = req.query;
        const dateFilter = date_from && date_to
            ? `AND created_at BETWEEN '${date_from}' AND '${date_to}'`
            : 'AND created_at >= NOW() - INTERVAL \'30 days\'';
        const modelFilter = model_id ? `AND model_id = ${model_id}` : '';
        const [followBackRateResult, profitMarginResult, conversionResult, costBreakdownResult, performanceTimelineResult, bestPerformersResult] = await Promise.all([
            database_1.db.query(`
        SELECT 
          AVG(follow_back_rate) as overall_follow_back_rate,
          COUNT(*) as total_accounts,
          SUM(total_follows) as total_follows,
          SUM(CASE WHEN follow_back_rate > 0 THEN total_follows * follow_back_rate / 100 ELSE 0 END) as total_follow_backs
        FROM accounts 
        WHERE status = 'active' ${modelFilter}
      `),
            database_1.db.query(`
        SELECT 
          SUM(total_revenue) as total_revenue,
          SUM(total_costs) as total_costs,
          SUM(net_profit) as net_profit,
          AVG(profit_margin_percentage) as avg_profit_margin
        FROM model_profit_analysis
        ${model_id ? `WHERE model_id = ${model_id}` : ''}
      `),
            database_1.db.query(`
        SELECT 
          AVG(conversion_rate) as overall_conversion_rate,
          COUNT(*) as total_accounts,
          SUM(total_conversions) as total_conversions
        FROM accounts 
        WHERE status = 'active' ${modelFilter}
      `),
            database_1.db.query(`
        SELECT 
          cc.name as category,
          SUM(
            CASE 
              WHEN mc.cost_amount IS NOT NULL THEN mc.cost_amount
              WHEN ac.cost_amount IS NOT NULL THEN ac.cost_amount
              ELSE 0
            END
          ) as total_amount
        FROM cost_categories cc
        LEFT JOIN model_costs mc ON cc.id = mc.cost_category_id AND mc.is_active = true ${model_id ? `AND mc.model_id = ${model_id}` : ''}
        LEFT JOIN account_costs ac ON cc.id = ac.cost_category_id AND ac.is_active = true
        ${model_id ? `LEFT JOIN accounts a ON ac.account_id = a.id AND a.model_id = ${model_id}` : ''}
        WHERE cc.is_active = true
        GROUP BY cc.id, cc.name
        ORDER BY total_amount DESC
      `),
            database_1.db.query(`
        SELECT 
          DATE(ps.snapshot_date) as date,
          SUM(ps.total_follows) as follows,
          SUM(ps.total_follow_backs) as follow_backs,
          SUM(ps.total_conversions) as conversions,
          SUM(ps.revenue_generated) as revenue,
          SUM(ps.costs_incurred) as costs
        FROM performance_snapshots ps
        ${model_id ? `WHERE ps.model_id = ${model_id}` : ''}
        ${model_id ? 'AND' : 'WHERE'} ps.snapshot_date >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(ps.snapshot_date)
        ORDER BY date DESC
        LIMIT 30
      `),
            database_1.db.query(`
        SELECT 
          id,
          username,
          model_name,
          follow_back_rate,
          conversion_rate,
          total_revenue,
          monthly_cost,
          net_profit,
          follow_back_rank,
          conversion_rank,
          profit_rank
        FROM account_performance_analysis
        ${model_id ? `WHERE model_id = ${model_id}` : ''}
        ORDER BY net_profit DESC
        LIMIT 10
      `)
        ]);
        const profitData = profitMarginResult.rows[0];
        const costData = costBreakdownResult.rows;
        const totalCosts = costData.reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0);
        const costBreakdownWithPercentages = costData.map(item => ({
            category: item.category,
            amount: parseFloat(item.total_amount || 0),
            percentage: totalCosts > 0 ? (parseFloat(item.total_amount || 0) / totalCosts) * 100 : 0
        }));
        res.json({
            success: true,
            data: {
                overall_follow_back_rate: parseFloat(followBackRateResult.rows[0]?.overall_follow_back_rate || 0),
                follow_back_rate_trend: 0,
                total_revenue: parseFloat(profitData?.total_revenue || 0),
                total_costs: parseFloat(profitData?.total_costs || 0),
                net_profit: parseFloat(profitData?.net_profit || 0),
                profit_margin_percentage: parseFloat(profitData?.avg_profit_margin || 0),
                overall_conversion_rate: parseFloat(conversionResult.rows[0]?.overall_conversion_rate || 0),
                conversion_trend: 0,
                cost_by_category: costBreakdownWithPercentages,
                performance_over_time: performanceTimelineResult.rows,
                best_performers: bestPerformersResult.rows
            },
            metadata: {
                date_range: {
                    from: date_from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                    to: date_to || new Date().toISOString()
                },
                model_filter: model_id || null,
                calculation_date: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('Dashboard analytics error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to fetch dashboard analytics'
        });
    }
});
router.get('/follow-back-rates', async (req, res) => {
    try {
        const { model_id, limit = 50, sort_by = 'follow_back_rate', sort_order = 'desc' } = req.query;
        const modelFilter = model_id ? 'WHERE a.model_id = $1' : '';
        const params = model_id ? [model_id] : [];
        const query = `
      SELECT 
        a.id as account_id,
        a.username,
        a.model_id,
        m.name as model_name,
        a.total_follows,
        FLOOR(a.total_follows * a.follow_back_rate / 100) as total_follow_backs,
        a.follow_back_rate,
        a.conversion_rate,
        a.total_conversions,
        -- Recent performance (last 7 days)
        COALESCE(
          json_agg(
            json_build_object(
              'date', ps.snapshot_date,
              'follows', ps.total_follows,
              'follow_backs', ps.total_follow_backs,
              'rate', ps.follow_back_rate
            ) ORDER BY ps.snapshot_date DESC
          ) FILTER (WHERE ps.snapshot_date >= NOW() - INTERVAL '7 days'), '[]'
        ) as recent_performance
      FROM accounts a
      LEFT JOIN models m ON a.model_id = m.id
      LEFT JOIN performance_snapshots ps ON a.id = ps.account_id
      ${modelFilter}
      GROUP BY a.id, a.username, a.model_id, m.name, a.total_follows, a.follow_back_rate, a.conversion_rate, a.total_conversions
      ORDER BY a.${sort_by} ${sort_order.toUpperCase()}
      LIMIT ${limit}
    `;
        const result = await database_1.db.query(query, params);
        res.json({
            success: true,
            data: result.rows,
            metadata: {
                total_records: result.rows.length,
                sort_by,
                sort_order,
                model_filter: model_id || null
            }
        });
    }
    catch (error) {
        console.error('Follow-back rates analysis error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to fetch follow-back rates analysis'
        });
    }
});
router.get('/profit-margin-breakdown', async (req, res) => {
    try {
        const { model_id } = req.query;
        const modelFilter = model_id ? `AND m.id = ${model_id}` : '';
        const query = `
      SELECT 
        cc.name as category_name,
        SUM(
          CASE 
            WHEN mc.cost_amount IS NOT NULL THEN mc.cost_amount
            WHEN ac.cost_amount IS NOT NULL THEN ac.cost_amount
            ELSE 0
          END
        ) as total_amount,
        cc.category_type,
        cc.default_unit
      FROM cost_categories cc
      LEFT JOIN model_costs mc ON cc.id = mc.cost_category_id AND mc.is_active = true
      LEFT JOIN models m ON mc.model_id = m.id ${modelFilter}
      LEFT JOIN account_costs ac ON cc.id = ac.cost_category_id AND ac.is_active = true
      LEFT JOIN accounts a ON ac.account_id = a.id ${model_id ? `AND a.model_id = ${model_id}` : ''}
      WHERE cc.is_active = true
      GROUP BY cc.id, cc.name, cc.category_type, cc.default_unit
      HAVING SUM(
        CASE 
          WHEN mc.cost_amount IS NOT NULL THEN mc.cost_amount
          WHEN ac.cost_amount IS NOT NULL THEN ac.cost_amount
          ELSE 0
        END
      ) > 0
      ORDER BY total_amount DESC
    `;
        const result = await database_1.db.query(query);
        const totalAmount = result.rows.reduce((sum, row) => sum + parseFloat(row.total_amount), 0);
        const pieChartData = result.rows.map((row, index) => ({
            category_name: row.category_name,
            total_amount: parseFloat(row.total_amount),
            percentage: totalAmount > 0 ? (parseFloat(row.total_amount) / totalAmount) * 100 : 0,
            color: `hsl(${(index * 137.5) % 360}, 70%, 50%)`,
            subcategories: []
        }));
        res.json({
            success: true,
            data: {
                breakdown: pieChartData,
                total_amount: totalAmount,
                chart_data: {
                    labels: pieChartData.map(item => item.category_name),
                    datasets: [{
                            data: pieChartData.map(item => item.total_amount),
                            backgroundColor: pieChartData.map(item => item.color),
                            label: 'Cost Breakdown'
                        }]
                }
            },
            metadata: {
                model_filter: model_id || null,
                calculation_date: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('Profit margin breakdown error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to fetch profit margin breakdown'
        });
    }
});
router.get('/conversion-funnel', async (req, res) => {
    try {
        const { model_id, account_id } = req.query;
        let whereConditions = [];
        let params = [];
        let paramIndex = 1;
        if (model_id) {
            whereConditions.push(`a.model_id = $${paramIndex}`);
            params.push(model_id);
            paramIndex++;
        }
        if (account_id) {
            whereConditions.push(`a.id = $${paramIndex}`);
            params.push(account_id);
            paramIndex++;
        }
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        const query = `
      SELECT 
        a.id as account_id,
        a.username,
        a.model_id,
        m.name as model_name,
        a.total_follows,
        FLOOR(a.total_follows * a.follow_back_rate / 100) as total_follow_backs,
        a.total_conversions,
        a.follow_back_rate,
        a.conversion_rate,
        -- Calculate follow-to-conversion rate
        CASE 
          WHEN a.total_follows > 0 THEN (a.total_conversions::decimal / a.total_follows::decimal) * 100
          ELSE 0
        END as follow_to_conversion_rate,
        -- Calculate average conversion value
        COALESCE(
          (SELECT AVG(revenue_amount) FROM revenue_events WHERE account_id = a.id), 0
        ) as average_conversion_value,
        -- Calculate total revenue
        COALESCE(
          (SELECT SUM(revenue_amount) FROM revenue_events WHERE account_id = a.id), 0
        ) as total_revenue,
        -- Calculate cost per conversion
        CASE 
          WHEN a.total_conversions > 0 THEN a.monthly_cost / a.total_conversions
          ELSE 0
        END as cost_per_conversion,
        -- Calculate ROI percentage
        CASE 
          WHEN a.monthly_cost > 0 THEN 
            ((COALESCE((SELECT SUM(revenue_amount) FROM revenue_events WHERE account_id = a.id), 0) - a.monthly_cost) / a.monthly_cost) * 100
          ELSE 0
        END as roi_percentage
      FROM accounts a
      LEFT JOIN models m ON a.model_id = m.id
      ${whereClause}
      ORDER BY total_revenue DESC
    `;
        const result = await database_1.db.query(query, params);
        res.json({
            success: true,
            data: result.rows,
            metadata: {
                total_records: result.rows.length,
                filters: {
                    model_id: model_id || null,
                    account_id: account_id || null
                }
            }
        });
    }
    catch (error) {
        console.error('Conversion funnel analysis error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to fetch conversion funnel analysis'
        });
    }
});
router.get('/best-performers', async (req, res) => {
    try {
        const { model_id, metric_type = 'profit', limit = 10, minimum_follows = 0 } = req.query;
        const modelFilter = model_id ? 'WHERE model_id = $1' : '';
        const params = model_id ? [model_id] : [];
        let orderBy = 'net_profit DESC';
        switch (metric_type) {
            case 'follow_back_rate':
                orderBy = 'follow_back_rate DESC';
                break;
            case 'conversion_rate':
                orderBy = 'conversion_rate DESC';
                break;
            case 'roi':
                orderBy = '(total_revenue - monthly_cost) / NULLIF(monthly_cost, 0) DESC';
                break;
            default:
                orderBy = 'net_profit DESC';
        }
        const query = `
      SELECT 
        id as account_id,
        username,
        model_id,
        model_name,
        '${metric_type}' as metric_type,
        CASE 
          WHEN '${metric_type}' = 'follow_back_rate' THEN follow_back_rate
          WHEN '${metric_type}' = 'conversion_rate' THEN conversion_rate
          WHEN '${metric_type}' = 'roi' THEN 
            CASE WHEN monthly_cost > 0 THEN ((total_revenue - monthly_cost) / monthly_cost) * 100 ELSE 0 END
          ELSE net_profit
        END as metric_value,
        follow_back_rank,
        conversion_rank,
        profit_rank,
        total_revenue,
        monthly_cost,
        net_profit,
        total_follows,
        total_conversions,
        follow_back_rate,
        conversion_rate
      FROM account_performance_analysis
      ${modelFilter}
      ${modelFilter ? 'AND' : 'WHERE'} total_follows >= ${minimum_follows}
      ORDER BY ${orderBy}
      LIMIT ${limit}
    `;
        const result = await database_1.db.query(query, params);
        const avgQuery = `
      SELECT 
        AVG(follow_back_rate) as avg_follow_back_rate,
        AVG(conversion_rate) as avg_conversion_rate,
        AVG(net_profit) as avg_net_profit
      FROM account_performance_analysis
      ${modelFilter}
    `;
        const avgResult = await database_1.db.query(avgQuery, params);
        const averages = avgResult.rows[0];
        const dataWithComparison = result.rows.map(row => ({
            ...row,
            comparison_to_average: (() => {
                switch (metric_type) {
                    case 'follow_back_rate':
                        return averages.avg_follow_back_rate > 0
                            ? ((row.follow_back_rate - averages.avg_follow_back_rate) / averages.avg_follow_back_rate) * 100
                            : 0;
                    case 'conversion_rate':
                        return averages.avg_conversion_rate > 0
                            ? ((row.conversion_rate - averages.avg_conversion_rate) / averages.avg_conversion_rate) * 100
                            : 0;
                    default:
                        return averages.avg_net_profit > 0
                            ? ((row.net_profit - averages.avg_net_profit) / averages.avg_net_profit) * 100
                            : 0;
                }
            })()
        }));
        res.json({
            success: true,
            data: dataWithComparison,
            metadata: {
                metric_type,
                model_filter: model_id || null,
                minimum_follows,
                averages: averages
            }
        });
    }
    catch (error) {
        console.error('Best performers analysis error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to fetch best performers analysis'
        });
    }
});
router.get('/timeseries', async (req, res) => {
    try {
        const { metric = 'follows', period = '7d', model_id } = req.query;
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
        let params = [];
        if (metric === 'follows') {
            query = `
        SELECT 
          DATE_TRUNC($1, followed_at) as period,
          COUNT(*) as follows_count,
          COUNT(CASE WHEN status = 'following' THEN 1 END) as active_follows,
          COUNT(CASE WHEN status = 'unfollowed' THEN 1 END) as unfollowed_follows
        FROM model_target_follows 
        WHERE followed_at >= NOW() - INTERVAL $2
        ${model_id ? 'AND model_id = $3' : ''}
        GROUP BY DATE_TRUNC($1, followed_at)
        ORDER BY period ASC
      `;
            params = [interval, dateRange];
            if (model_id)
                params.push(model_id);
        }
        else if (metric === 'accounts') {
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
            if (model_id)
                params.push(model_id);
        }
        else if (metric === 'activity') {
            query = `
        SELECT 
          DATE_TRUNC($1, created_at) as period,
          action_type,
          COUNT(*) as action_count
        FROM activity_logs 
        WHERE created_at >= NOW() - INTERVAL $2
        ${model_id ? "AND details->>'model_id' = $3" : ''}
        GROUP BY DATE_TRUNC($1, created_at), action_type
        ORDER BY period ASC, action_type
      `;
            params = [interval, dateRange];
            if (model_id)
                params.push(model_id);
        }
        const result = await database_1.db.query(query, params);
        res.json({
            success: true,
            data: {
                metric,
                period,
                interval,
                data: result.rows
            }
        });
    }
    catch (error) {
        console.error('Analytics timeseries error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to fetch timeseries data'
        });
    }
});
router.get('/models/comparison', async (req, res) => {
    try {
        const result = await database_1.db.query(`
      SELECT * FROM model_profit_analysis
      ORDER BY net_profit DESC
    `);
        res.json({
            success: true,
            data: result.rows
        });
    }
    catch (error) {
        console.error('Model comparison error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to fetch model comparison data'
        });
    }
});
router.get('/proxy-providers', async (req, res) => {
    try {
        const result = await database_1.db.query(`
      SELECT 
        pp.*,
        COUNT(a.id) as accounts_count,
        SUM(ac.cost_amount) as total_monthly_cost
      FROM proxy_providers pp
      LEFT JOIN accounts a ON pp.name = a.proxy_provider
      LEFT JOIN account_costs ac ON a.id = ac.account_id 
        AND ac.cost_category_id = (SELECT id FROM cost_categories WHERE name = 'Proxies')
        AND ac.is_active = true
      WHERE pp.is_active = true
      GROUP BY pp.id
      ORDER BY pp.name
    `);
        res.json({
            success: true,
            data: result.rows
        });
    }
    catch (error) {
        console.error('Proxy providers error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to fetch proxy providers'
        });
    }
});
exports.default = router;
//# sourceMappingURL=analytics.js.map