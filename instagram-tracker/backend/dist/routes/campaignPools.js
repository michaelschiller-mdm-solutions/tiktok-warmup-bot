"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const CampaignPoolService_1 = require("../services/CampaignPoolService");
const PoolAssignmentService_1 = require("../services/PoolAssignmentService");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const router = express_1.default.Router();
const campaignPoolService = new CampaignPoolService_1.CampaignPoolService();
const poolAssignmentService = new PoolAssignmentService_1.PoolAssignmentService();
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path_1.default.join(__dirname, '../../uploads/pools');
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi/;
        const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        else {
            cb(new Error('Only image and video files are allowed'));
        }
    }
});
async function ensureUploadDir() {
    const uploadPath = path_1.default.join(__dirname, '../../uploads/pools');
    try {
        await promises_1.default.access(uploadPath);
    }
    catch {
        await promises_1.default.mkdir(uploadPath, { recursive: true });
    }
}
ensureUploadDir();
router.get('/', async (req, res) => {
    const client = req.app.locals.db;
    try {
        const filters = {
            search: req.query.search,
            pool_type: req.query.pool_type,
            content_format: req.query.content_format,
            blocked_by_sprint: req.query.blocked_by_sprint,
            sort_by: req.query.sort_by || 'created_at',
            sort_order: req.query.sort_order || 'desc',
            limit: parseInt(req.query.limit) || 20,
            offset: parseInt(req.query.offset) || 0
        };
        let query = `
      SELECT 
        cp.*,
        COUNT(cpc.id) as content_count
      FROM campaign_pools cp
      LEFT JOIN campaign_pool_content cpc ON cp.id = cpc.pool_id
      WHERE 1=1
    `;
        const queryParams = [];
        let paramIndex = 1;
        if (filters.search) {
            query += ` AND (cp.name ILIKE $${paramIndex} OR cp.description ILIKE $${paramIndex})`;
            queryParams.push(`%${filters.search}%`);
            paramIndex++;
        }
        if (filters.pool_type && filters.pool_type !== 'all') {
            query += ` AND cp.pool_type = $${paramIndex}`;
            queryParams.push(filters.pool_type);
            paramIndex++;
        }
        if (filters.content_format && filters.content_format !== 'all') {
            query += ` AND cp.content_format = $${paramIndex}`;
            queryParams.push(filters.content_format);
            paramIndex++;
        }
        query += ` GROUP BY cp.id`;
        const sortMap = {
            'name': 'cp.name',
            'created_at': 'cp.created_at',
            'pool_type': 'cp.pool_type',
            'content_count': 'COUNT(cpc.id)'
        };
        if (sortMap[filters.sort_by]) {
            query += ` ORDER BY ${sortMap[filters.sort_by]} ${filters.sort_order?.toUpperCase()}`;
        }
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        queryParams.push(filters.limit, filters.offset);
        const result = await client.query(query, queryParams);
        const countQuery = `
      SELECT COUNT(DISTINCT cp.id) as total
      FROM campaign_pools cp
      WHERE 1=1
      ${filters.search ? `AND (cp.name ILIKE '%${filters.search}%' OR cp.description ILIKE '%${filters.search}%')` : ''}
      ${filters.pool_type && filters.pool_type !== 'all' ? `AND cp.pool_type = '${filters.pool_type}'` : ''}
      ${filters.content_format && filters.content_format !== 'all' ? `AND cp.content_format = '${filters.content_format}'` : ''}
    `;
        const countResult = await client.query(countQuery);
        const totalCount = parseInt(countResult.rows[0].total);
        const pools = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            description: row.description,
            pool_type: row.pool_type,
            content_format: row.content_format,
            highlight_caption: row.highlight_caption,
            content_order: row.content_order,
            default_delay_hours: row.default_delay_hours,
            max_items_per_batch: row.max_items_per_batch,
            auto_add_to_highlights: row.auto_add_to_highlights,
            target_highlight_groups: row.target_highlight_groups || [],
            blocked_by_sprint_types: row.blocked_by_sprint_types || [],
            created_at: row.created_at,
            updated_at: row.updated_at
        }));
        const response = {
            pools,
            total_count: totalCount,
            has_next: (filters.offset + filters.limit) < totalCount,
            has_previous: filters.offset > 0
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error fetching campaign pools:', error);
        res.status(500).json({ error: 'Failed to fetch campaign pools' });
    }
});
router.post('/', async (req, res) => {
    const client = req.app.locals.db;
    try {
        const poolData = req.body;
        if (!poolData.name || !poolData.pool_type) {
            return res.status(400).json({ error: 'Name and pool_type are required' });
        }
        if (!['story', 'post', 'highlight'].includes(poolData.pool_type)) {
            return res.status(400).json({ error: 'Invalid pool_type. Must be story, post, or highlight' });
        }
        const defaults = {
            content_order: poolData.pool_type === 'highlight' ? (poolData.content_order || 'chronological') : 'chronological',
            default_delay_hours: poolData.default_delay_hours || 24,
            max_items_per_batch: poolData.max_items_per_batch || 20,
            auto_add_to_highlights: poolData.auto_add_to_highlights || false,
            target_highlight_groups: poolData.target_highlight_groups || [],
            blocked_by_sprint_types: poolData.blocked_by_sprint_types || []
        };
        const query = `
      INSERT INTO campaign_pools (
        name, description, pool_type, content_format, highlight_caption,
        content_order, default_delay_hours, max_items_per_batch,
        auto_add_to_highlights, target_highlight_groups, blocked_by_sprint_types
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
        const result = await client.query(query, [
            poolData.name,
            poolData.description,
            poolData.pool_type,
            poolData.content_format,
            poolData.highlight_caption,
            defaults.content_order,
            defaults.default_delay_hours,
            defaults.max_items_per_batch,
            defaults.auto_add_to_highlights,
            defaults.target_highlight_groups,
            defaults.blocked_by_sprint_types
        ]);
        const newPool = result.rows[0];
        res.status(201).json(newPool);
    }
    catch (error) {
        console.error('Error creating campaign pool:', error);
        res.status(500).json({ error: 'Failed to create campaign pool' });
    }
});
router.get('/:id', async (req, res) => {
    const client = req.app.locals.db;
    const poolId = parseInt(req.params.id);
    try {
        const query = `
      SELECT 
        cp.*,
        COUNT(cpc.id) as content_count
      FROM campaign_pools cp
      LEFT JOIN campaign_pool_content cpc ON cp.id = cpc.pool_id
      WHERE cp.id = $1
      GROUP BY cp.id
    `;
        const result = await client.query(query, [poolId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Campaign pool not found' });
        }
        const pool = result.rows[0];
        res.json(pool);
    }
    catch (error) {
        console.error('Error fetching campaign pool:', error);
        res.status(500).json({ error: 'Failed to fetch campaign pool' });
    }
});
router.put('/:id', async (req, res) => {
    const client = req.app.locals.db;
    const poolId = parseInt(req.params.id);
    try {
        const updateData = req.body;
        const updateFields = [];
        const queryParams = [];
        let paramIndex = 1;
        Object.entries(updateData).forEach(([key, value]) => {
            if (value !== undefined) {
                updateFields.push(`${key} = $${paramIndex}`);
                queryParams.push(value);
                paramIndex++;
            }
        });
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        const query = `
      UPDATE campaign_pools 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
        queryParams.push(poolId);
        const result = await client.query(query, queryParams);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Campaign pool not found' });
        }
        const updatedPool = result.rows[0];
        res.json(updatedPool);
    }
    catch (error) {
        console.error('Error updating campaign pool:', error);
        res.status(500).json({ error: 'Failed to update campaign pool' });
    }
});
router.delete('/:id', async (req, res) => {
    const client = req.app.locals.db;
    const poolId = parseInt(req.params.id);
    try {
        const contentCheck = await client.query('SELECT COUNT(*) as count FROM campaign_pool_content WHERE pool_id = $1', [poolId]);
        const contentCount = parseInt(contentCheck.rows[0].count);
        if (contentCount > 0) {
            return res.status(400).json({
                error: `Cannot delete pool with ${contentCount} content items. Delete content first.`
            });
        }
        const result = await client.query('DELETE FROM campaign_pools WHERE id = $1 RETURNING id', [poolId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Campaign pool not found' });
        }
        res.json({ message: 'Campaign pool deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting campaign pool:', error);
        res.status(500).json({ error: 'Failed to delete campaign pool' });
    }
});
router.get('/:id/content', async (req, res) => {
    const client = req.app.locals.db;
    const poolId = parseInt(req.params.id);
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    try {
        const poolQuery = 'SELECT name, pool_type, content_format FROM campaign_pools WHERE id = $1';
        const poolResult = await client.query(poolQuery, [poolId]);
        if (poolResult.rows.length === 0) {
            return res.status(404).json({ error: 'Campaign pool not found' });
        }
        const poolInfo = poolResult.rows[0];
        const contentQuery = `
      SELECT * FROM campaign_pool_content 
      WHERE pool_id = $1 
      ORDER BY content_order ASC, created_at ASC
      LIMIT $2 OFFSET $3
    `;
        const contentResult = await client.query(contentQuery, [poolId, limit, offset]);
        const countResult = await client.query('SELECT COUNT(*) as total FROM campaign_pool_content WHERE pool_id = $1', [poolId]);
        const totalCount = parseInt(countResult.rows[0].total);
        const contentItems = contentResult.rows.map(row => ({
            id: row.id,
            pool_id: row.pool_id,
            file_path: row.file_path,
            file_name: row.file_name,
            caption: row.caption,
            content_order: row.content_order,
            custom_delay_hours: row.custom_delay_hours,
            content_type: row.content_type,
            post_group_id: row.post_group_id,
            batch_number: row.batch_number,
            add_to_highlights: row.add_to_highlights,
            story_only: row.story_only,
            created_at: row.created_at
        }));
        const response = {
            content_items: contentItems,
            total_count: totalCount,
            pool_info: {
                name: poolInfo.name,
                pool_type: poolInfo.pool_type,
                content_format: poolInfo.content_format
            }
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error fetching pool content:', error);
        res.status(500).json({ error: 'Failed to fetch pool content' });
    }
});
router.post('/:id/content', upload.single('file'), async (req, res) => {
    const client = req.app.locals.db;
    const poolId = parseInt(req.params.id);
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const poolCheck = await client.query('SELECT id, pool_type FROM campaign_pools WHERE id = $1', [poolId]);
        if (poolCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Campaign pool not found' });
        }
        const poolType = poolCheck.rows[0].pool_type;
        const orderResult = await client.query('SELECT COALESCE(MAX(content_order), 0) + 1 as next_order FROM campaign_pool_content WHERE pool_id = $1', [poolId]);
        const nextOrder = orderResult.rows[0].next_order;
        const contentData = {
            pool_id: poolId,
            file_path: `/uploads/pools/${req.file.filename}`,
            file_name: req.file.originalname,
            caption: req.body.caption,
            content_order: parseInt(req.body.content_order) || nextOrder,
            custom_delay_hours: req.body.custom_delay_hours ? parseInt(req.body.custom_delay_hours) : null,
            content_type: req.body.content_type || poolType,
            post_group_id: req.body.post_group_id ? parseInt(req.body.post_group_id) : null,
            batch_number: req.body.batch_number ? parseInt(req.body.batch_number) : null,
            add_to_highlights: req.body.add_to_highlights === 'true',
            story_only: req.body.story_only === 'true'
        };
        const query = `
      INSERT INTO campaign_pool_content (
        pool_id, file_path, file_name, caption, content_order,
        custom_delay_hours, content_type, post_group_id, batch_number,
        add_to_highlights, story_only
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
        const result = await client.query(query, [
            contentData.pool_id,
            contentData.file_path,
            contentData.file_name,
            contentData.caption,
            contentData.content_order,
            contentData.custom_delay_hours,
            contentData.content_type,
            contentData.post_group_id,
            contentData.batch_number,
            contentData.add_to_highlights,
            contentData.story_only
        ]);
        const newContent = result.rows[0];
        res.status(201).json(newContent);
    }
    catch (error) {
        console.error('Error adding content to pool:', error);
        res.status(500).json({ error: 'Failed to add content to pool' });
    }
});
router.get('/stats/overview', async (req, res) => {
    const client = req.app.locals.db;
    try {
        const queries = await Promise.all([
            client.query(`
        SELECT 
          COUNT(*) as total_pools,
          COUNT(CASE WHEN pool_type = 'story' THEN 1 END) as story_pools,
          COUNT(CASE WHEN pool_type = 'post' THEN 1 END) as post_pools,
          COUNT(CASE WHEN pool_type = 'highlight' THEN 1 END) as highlight_pools
        FROM campaign_pools
      `),
            client.query(`
        SELECT 
          COUNT(*) as total_content,
          COUNT(CASE WHEN content_type = 'story' THEN 1 END) as story_content,
          COUNT(CASE WHEN content_type = 'post' THEN 1 END) as post_content,
          COUNT(CASE WHEN content_type = 'highlight' THEN 1 END) as highlight_content
        FROM campaign_pool_content
      `),
            client.query(`
        SELECT AVG(content_count) as avg_items
        FROM (
          SELECT COUNT(cpc.id) as content_count
          FROM campaign_pools cp
          LEFT JOIN campaign_pool_content cpc ON cp.id = cpc.pool_id
          GROUP BY cp.id
        ) as pool_counts
      `),
            client.query(`
        SELECT pool_type, COUNT(*) as count
        FROM campaign_pools
        GROUP BY pool_type
        ORDER BY count DESC
        LIMIT 1
      `)
        ]);
        const poolStats = queries[0].rows[0];
        const contentStats = queries[1].rows[0];
        const avgItems = queries[2].rows[0].avg_items || 0;
        const mostUsedType = queries[3].rows[0]?.pool_type || 'story';
        const stats = {
            total_pools: parseInt(poolStats.total_pools),
            pools_by_type: {
                story: parseInt(poolStats.story_pools),
                post: parseInt(poolStats.post_pools),
                highlight: parseInt(poolStats.highlight_pools)
            },
            total_content_items: parseInt(contentStats.total_content),
            content_by_type: {
                story: parseInt(contentStats.story_content),
                post: parseInt(contentStats.post_content),
                highlight: parseInt(contentStats.highlight_content)
            },
            average_items_per_pool: parseFloat(avgItems),
            most_used_pool_type: mostUsedType
        };
        res.json(stats);
    }
    catch (error) {
        console.error('Error fetching pool stats:', error);
        res.status(500).json({ error: 'Failed to fetch pool statistics' });
    }
});
exports.default = router;
//# sourceMappingURL=campaignPools.js.map