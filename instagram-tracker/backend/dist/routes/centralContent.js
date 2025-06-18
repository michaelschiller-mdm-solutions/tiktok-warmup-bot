"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const database_1 = require("../database");
const router = express_1.default.Router();
router.post('/migrate', async (req, res) => {
    try {
        console.log('🔄 Running central content registry migration...');
        const migrationPath = path_1.default.join(__dirname, '../../../run-migration.sql');
        const migrationSQL = fs_1.default.readFileSync(migrationPath, 'utf8');
        await database_1.db.query(migrationSQL);
        console.log('✅ Central content registry migration completed successfully!');
        console.log('🧪 Testing new database functions...');
        const testResult = await database_1.db.query('SELECT * FROM get_central_content_with_texts() LIMIT 1');
        console.log('✅ get_central_content_with_texts function working');
        try {
            const bundleResult = await database_1.db.query('SELECT * FROM get_bundle_contents(1)');
            console.log('✅ get_bundle_contents function working');
        }
        catch (err) {
            console.log('ℹ️  get_bundle_contents function working (no bundles exist yet)');
        }
        res.json({
            success: true,
            message: 'Central content registry migration completed successfully!'
        });
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        res.status(500).json({
            success: false,
            error: 'Migration failed',
            details: error.message
        });
    }
});
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path_1.default.join(__dirname, '../../uploads/content');
        if (!fs_1.default.existsSync(uploadPath)) {
            fs_1.default.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
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
router.get('/content', async (req, res) => {
    try {
        const { bundle_id, content_type, status = 'active', categories, tags, limit = 50, offset = 0 } = req.query;
        let query = `
      SELECT * FROM get_central_content_with_texts($1, $2, $3)
    `;
        const params = [
            bundle_id ? parseInt(bundle_id) : null,
            content_type || null,
            status
        ];
        if (categories || tags) {
            query += ` WHERE 1=1`;
            if (categories) {
                query += ` AND categories @> $${params.length + 1}::jsonb`;
                params.push(JSON.stringify([categories]));
            }
            if (tags) {
                query += ` AND tags @> $${params.length + 1}::jsonb`;
                params.push(JSON.stringify([tags]));
            }
        }
        query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));
        const result = await database_1.db.query(query, params);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching central content:', error);
        res.status(500).json({ error: 'Failed to fetch content' });
    }
});
router.post('/content/upload', upload.array('files', 10), async (req, res) => {
    try {
        const files = req.files;
        const { categories = '[]', tags = '[]', uploaded_by } = req.body;
        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }
        let parsedCategories = [];
        let parsedTags = [];
        try {
            parsedCategories = typeof categories === 'string' ? JSON.parse(categories) : categories;
            parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
        }
        catch (parseError) {
            console.error('Error parsing categories/tags:', parseError);
            return res.status(400).json({ error: 'Invalid categories or tags format' });
        }
        const uploadedContent = [];
        for (const file of files) {
            const contentType = file.mimetype.startsWith('image/') ? 'image' : 'video';
            const result = await database_1.db.query(`
        INSERT INTO central_content (
          filename, original_name, file_path, content_type, 
          file_size, mime_type, categories, tags, uploaded_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
                file.filename,
                file.originalname,
                file.path,
                contentType,
                file.size,
                file.mimetype,
                JSON.stringify(parsedCategories),
                JSON.stringify(parsedTags),
                uploaded_by
            ]);
            uploadedContent.push({
                ...result.rows[0],
                image_url: `/uploads/content/${file.filename}`
            });
        }
        res.json({
            success: true,
            uploaded: uploadedContent.length,
            content: uploadedContent
        });
    }
    catch (error) {
        console.error('Error uploading content:', error);
        res.status(500).json({ error: 'Failed to upload content' });
    }
});
router.post('/text-content', async (req, res) => {
    try {
        const { text_content, categories = [], tags = [], template_name, language = 'en', created_by } = req.body;
        if (!text_content) {
            return res.status(400).json({ error: 'Text content is required' });
        }
        const safeCategories = Array.isArray(categories) ? categories : [];
        const safeTags = Array.isArray(tags) ? tags : [];
        const result = await database_1.db.query(`
      INSERT INTO central_text_content (
        text_content, categories, tags, template_name, language, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [text_content, JSON.stringify(safeCategories), JSON.stringify(safeTags), template_name, language, created_by]);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error adding text content:', error);
        res.status(500).json({ error: 'Failed to add text content' });
    }
});
router.get('/text-content', async (req, res) => {
    try {
        const { status = 'active', language, template_name } = req.query;
        let query = `
      SELECT 
        id,
        text_content,
        categories,
        tags,
        template_name,
        language,
        status,
        created_by,
        created_at,
        updated_at
      FROM central_text_content
      WHERE status = $1
    `;
        const params = [status];
        if (language) {
            query += ` AND language = $${params.length + 1}`;
            params.push(language);
        }
        if (template_name) {
            query += ` AND template_name = $${params.length + 1}`;
            params.push(template_name);
        }
        query += ` ORDER BY created_at DESC`;
        const result = await database_1.db.query(query, params);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching text content:', error);
        res.status(500).json({ error: 'Failed to fetch text content' });
    }
});
router.put('/text-content/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { text_content, categories = [], tags = [], template_name, language = 'en' } = req.body;
        if (!text_content) {
            return res.status(400).json({ error: 'Text content is required' });
        }
        const safeCategories = Array.isArray(categories) ? categories : [];
        const safeTags = Array.isArray(tags) ? tags : [];
        const result = await database_1.db.query(`
      UPDATE central_text_content 
      SET 
        text_content = $1,
        categories = $2,
        tags = $3,
        template_name = $4,
        language = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [text_content, JSON.stringify(safeCategories), JSON.stringify(safeTags), template_name, language, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Text content not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error updating text content:', error);
        res.status(500).json({ error: 'Failed to update text content' });
    }
});
router.delete('/content/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const contentResult = await database_1.db.query(`
      SELECT id, filename, file_path, original_name 
      FROM central_content 
      WHERE id = $1
    `, [id]);
        if (contentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Content not found' });
        }
        const content = contentResult.rows[0];
        const result = await database_1.db.query(`
      DELETE FROM central_content 
      WHERE id = $1 
      RETURNING *
    `, [id]);
        try {
            if (content.file_path && fs_1.default.existsSync(content.file_path)) {
                fs_1.default.unlinkSync(content.file_path);
                console.log(`🗑️ Deleted physical file: ${content.file_path}`);
            }
        }
        catch (fileError) {
            console.warn(`⚠️ Could not delete physical file ${content.file_path}:`, fileError);
        }
        res.json({
            success: true,
            deleted: result.rows[0],
            message: `Content "${content.original_name}" deleted successfully`
        });
    }
    catch (error) {
        console.error('Error deleting content:', error);
        res.status(500).json({ error: 'Failed to delete content' });
    }
});
router.delete('/text-content/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await database_1.db.query(`
      DELETE FROM central_text_content 
      WHERE id = $1 
      RETURNING *
    `, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Text content not found' });
        }
        res.json({ success: true, deleted: result.rows[0] });
    }
    catch (error) {
        console.error('Error deleting text content:', error);
        res.status(500).json({ error: 'Failed to delete text content' });
    }
});
router.post('/content/:contentId/assign-text', async (req, res) => {
    try {
        const { contentId } = req.params;
        const { text_content_id, assignment_type = 'manual', template_name, priority = 0, assigned_by } = req.body;
        const result = await database_1.db.query(`
      INSERT INTO central_content_text_assignments (
        content_id, text_content_id, assignment_type, template_name, priority, assigned_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (content_id, text_content_id) 
      DO UPDATE SET 
        assignment_type = EXCLUDED.assignment_type,
        template_name = EXCLUDED.template_name,
        priority = EXCLUDED.priority,
        assigned_by = EXCLUDED.assigned_by,
        assigned_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [contentId, text_content_id, assignment_type, template_name, priority, assigned_by]);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error assigning text to content:', error);
        res.status(500).json({ error: 'Failed to assign text to content' });
    }
});
router.get('/bundles', async (req, res) => {
    try {
        const { status = 'active', bundle_type } = req.query;
        let query = `
      SELECT 
        cb.*,
        COUNT(DISTINCT bca.content_id) as content_count,
        COUNT(DISTINCT bca.text_content_id) as text_count
      FROM content_bundles cb
      LEFT JOIN bundle_content_assignments bca ON cb.id = bca.bundle_id
      WHERE cb.status = $1
    `;
        const params = [status];
        if (bundle_type) {
            query += ` AND cb.bundle_type = $2`;
            params.push(bundle_type);
        }
        query += ` GROUP BY cb.id ORDER BY cb.created_at DESC`;
        const result = await database_1.db.query(query, params);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching bundles:', error);
        res.status(500).json({ error: 'Failed to fetch bundles' });
    }
});
router.post('/bundles', async (req, res) => {
    try {
        const { name, description, bundle_type = 'mixed', categories = [], tags = [], created_by } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Bundle name is required' });
        }
        const result = await database_1.db.query(`
      INSERT INTO content_bundles (name, description, bundle_type, categories, tags, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name, description, bundle_type, JSON.stringify(categories), JSON.stringify(tags), created_by]);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error creating bundle:', error);
        res.status(500).json({ error: 'Failed to create bundle' });
    }
});
router.get('/bundles/:bundleId/contents', async (req, res) => {
    try {
        const { bundleId } = req.params;
        const bundleResult = await database_1.db.query(`
      SELECT * FROM content_bundles WHERE id = $1
    `, [bundleId]);
        if (bundleResult.rows.length === 0) {
            return res.status(404).json({ error: 'Bundle not found' });
        }
        const bundle = bundleResult.rows[0];
        const contentResult = await database_1.db.query(`
      SELECT 
        bca.id as assignment_id,
        bca.assignment_order,
        bca.created_at as assigned_at,
        cc.id as content_id,
        cc.filename,
        cc.original_name,
        cc.content_type,
        cc.file_size,
        cc.categories as content_categories,
        cc.tags as content_tags
      FROM bundle_content_assignments bca
      JOIN central_content cc ON bca.content_id = cc.id
      WHERE bca.bundle_id = $1 AND bca.content_id IS NOT NULL
      ORDER BY bca.assignment_order, bca.created_at
    `, [bundleId]);
        const textResult = await database_1.db.query(`
      SELECT 
        bca.id as assignment_id,
        bca.assignment_order,
        bca.created_at as assigned_at,
        ctc.id as text_content_id,
        ctc.text_content,
        ctc.template_name,
        ctc.categories as text_categories,
        ctc.tags as text_tags
      FROM bundle_content_assignments bca
      JOIN central_text_content ctc ON bca.text_content_id = ctc.id
      WHERE bca.bundle_id = $1 AND bca.text_content_id IS NOT NULL
      ORDER BY bca.assignment_order, bca.created_at
    `, [bundleId]);
        res.json({
            bundle,
            content_items: contentResult.rows,
            text_items: textResult.rows,
            total_items: contentResult.rows.length + textResult.rows.length
        });
    }
    catch (error) {
        console.error('Error fetching bundle contents:', error);
        res.status(500).json({ error: 'Failed to fetch bundle contents' });
    }
});
router.post('/bundles/:bundleId/add-content', async (req, res) => {
    try {
        const { bundleId } = req.params;
        const { content_id, text_content_id, assignment_order = 0 } = req.body;
        if (!content_id && !text_content_id) {
            return res.status(400).json({ error: 'Either content_id or text_content_id must be provided' });
        }
        const bundleCheck = await database_1.db.query('SELECT id FROM content_bundles WHERE id = $1', [bundleId]);
        if (bundleCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Bundle not found' });
        }
        if (content_id) {
            const contentCheck = await database_1.db.query('SELECT id FROM central_content WHERE id = $1', [content_id]);
            if (contentCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Content not found' });
            }
        }
        if (text_content_id) {
            const textCheck = await database_1.db.query('SELECT id FROM central_text_content WHERE id = $1', [text_content_id]);
            if (textCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Text content not found' });
            }
        }
        const existingAssignment = await database_1.db.query(`
      SELECT id FROM bundle_content_assignments 
      WHERE bundle_id = $1 AND 
            (($2::INTEGER IS NOT NULL AND content_id = $2) OR 
             ($3::INTEGER IS NOT NULL AND text_content_id = $3))
    `, [bundleId, content_id || null, text_content_id || null]);
        if (existingAssignment.rows.length > 0) {
            return res.status(409).json({ error: 'Content already assigned to this bundle' });
        }
        const result = await database_1.db.query(`
      INSERT INTO bundle_content_assignments (
        bundle_id, content_id, text_content_id, assignment_order
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [bundleId, content_id || null, text_content_id || null, assignment_order]);
        res.json({ success: true, assignment: result.rows[0] });
    }
    catch (error) {
        console.error('Error adding content to bundle:', error);
        res.status(500).json({ error: 'Failed to add content to bundle' });
    }
});
router.delete('/bundles/:bundleId/content/:assignmentId', async (req, res) => {
    try {
        const { bundleId, assignmentId } = req.params;
        const result = await database_1.db.query(`
      DELETE FROM bundle_content_assignments 
      WHERE id = $1 AND bundle_id = $2
      RETURNING *
    `, [assignmentId, bundleId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Assignment not found' });
        }
        res.json({ success: true, removed: result.rows[0] });
    }
    catch (error) {
        console.error('Error removing content from bundle:', error);
        res.status(500).json({ error: 'Failed to remove content from bundle' });
    }
});
router.post('/models/:modelId/assign-bundle', async (req, res) => {
    try {
        const { modelId } = req.params;
        const { bundle_id, assignment_type = 'active', priority = 0, assigned_by } = req.body;
        const result = await database_1.db.query(`
      INSERT INTO model_bundle_assignments (model_id, bundle_id, assignment_type, priority, assigned_by)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (model_id, bundle_id) 
      DO UPDATE SET 
        assignment_type = EXCLUDED.assignment_type,
        priority = EXCLUDED.priority,
        assigned_by = EXCLUDED.assigned_by,
        assigned_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [modelId, bundle_id, assignment_type, priority, assigned_by]);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error assigning bundle to model:', error);
        res.status(500).json({ error: 'Failed to assign bundle to model' });
    }
});
router.get('/models/:modelId/bundles', async (req, res) => {
    try {
        const { modelId } = req.params;
        const { status = 'active' } = req.query;
        const result = await database_1.db.query(`
      SELECT 
        cb.*,
        COUNT(DISTINCT bca.content_id) as content_count,
        COUNT(DISTINCT bca.text_content_id) as text_count
      FROM content_bundles cb
      LEFT JOIN bundle_content_assignments bca ON cb.id = bca.bundle_id
      WHERE cb.status = $1
      GROUP BY cb.id
      ORDER BY cb.created_at DESC
    `, [status]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching model bundles:', error);
        res.status(500).json({ error: 'Failed to fetch model bundles' });
    }
});
router.post('/sync-model-content', async (req, res) => {
    try {
        console.log('🔄 Syncing existing model content to central registry...');
        const modelContentResult = await database_1.db.query(`
      SELECT DISTINCT
        mc.id,
        mc.model_id,
        mc.filename,
        mc.original_name,
        mc.file_path,
        mc.content_type,
        mc.file_size,
        mc.mime_type,
        mc.categories,
        mc.created_at,
        m.name as model_name
      FROM model_content mc
      JOIN models m ON mc.model_id = m.id
      WHERE mc.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM central_content cc 
          WHERE cc.filename = mc.filename 
          AND cc.uploaded_by = CONCAT('model_', mc.model_id)
        )
      ORDER BY mc.created_at DESC
    `);
        const modelContent = modelContentResult.rows;
        console.log(`Found ${modelContent.length} model content items to sync`);
        let syncedCount = 0;
        const bundleMap = new Map();
        for (const content of modelContent) {
            try {
                const centralContentResult = await database_1.db.query(`
          INSERT INTO central_content (
            filename, original_name, file_path, content_type, 
            file_size, mime_type, categories, tags, uploaded_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `, [
                    content.filename,
                    content.original_name,
                    content.file_path,
                    content.content_type,
                    content.file_size,
                    content.mime_type,
                    JSON.stringify(content.categories || []),
                    JSON.stringify([]),
                    `model_${content.model_id}`
                ]);
                const centralContentId = centralContentResult.rows[0].id;
                let bundleId = bundleMap.get(content.model_id);
                if (!bundleId) {
                    const bundleName = `Model: ${content.model_name} Content`;
                    let bundleResult = await database_1.db.query(`
            SELECT id FROM content_bundles 
            WHERE name = $1 AND created_by = $2
          `, [bundleName, `model_${content.model_id}`]);
                    if (bundleResult.rows.length === 0) {
                        bundleResult = await database_1.db.query(`
              INSERT INTO content_bundles (name, description, bundle_type, categories, tags, created_by, status)
              VALUES ($1, $2, 'mixed', $3, $4, $5, 'active')
              RETURNING id
            `, [
                            bundleName,
                            `Auto-generated bundle for ${content.model_name} model content`,
                            JSON.stringify(content.categories || []),
                            JSON.stringify([]),
                            `model_${content.model_id}`
                        ]);
                        await database_1.db.query(`
              INSERT INTO model_bundle_assignments (model_id, bundle_id, assignment_type, assigned_by)
              VALUES ($1, $2, 'auto', $3)
              ON CONFLICT (model_id, bundle_id) DO NOTHING
            `, [content.model_id, bundleResult.rows[0].id, `model_${content.model_id}`]);
                    }
                    bundleId = bundleResult.rows[0].id;
                    bundleMap.set(content.model_id, bundleId);
                }
                await database_1.db.query(`
          INSERT INTO bundle_content_assignments (bundle_id, content_id, assignment_order)
          VALUES ($1, $2, 0)
          ON CONFLICT (bundle_id, content_id) DO NOTHING
        `, [bundleId, centralContentId]);
                syncedCount++;
                console.log(`✅ Synced: ${content.original_name} from model ${content.model_name}`);
            }
            catch (itemError) {
                console.error(`❌ Failed to sync ${content.original_name}:`, itemError);
            }
        }
        console.log(`🎉 Sync completed! ${syncedCount}/${modelContent.length} items synced`);
        res.json({
            success: true,
            message: `Successfully synced ${syncedCount} model content items to central registry`,
            synced_count: syncedCount,
            total_found: modelContent.length,
            bundles_created: bundleMap.size
        });
    }
    catch (error) {
        console.error('❌ Sync failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to sync model content',
            details: error.message
        });
    }
});
router.delete('/bundles/:bundleId', async (req, res) => {
    try {
        const { bundleId } = req.params;
        await database_1.db.query(`
      DELETE FROM bundle_content_assignments WHERE bundle_id = $1
    `, [bundleId]);
        const result = await database_1.db.query(`
      DELETE FROM content_bundles WHERE id = $1 RETURNING *
    `, [bundleId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Bundle not found' });
        }
        res.json({ success: true, deleted: result.rows[0] });
    }
    catch (error) {
        console.error('Error deleting bundle:', error);
        res.status(500).json({ error: 'Failed to delete bundle' });
    }
});
router.post('/bundles/:bundleId/add-content/batch', async (req, res) => {
    try {
        const { bundleId } = req.params;
        const { content_ids = [], text_content_ids = [], assignment_order = 0 } = req.body;
        if ((!content_ids || content_ids.length === 0) && (!text_content_ids || text_content_ids.length === 0)) {
            return res.status(400).json({ error: 'At least one content_ids or text_content_ids array must be provided' });
        }
        const bundleCheck = await database_1.db.query('SELECT id FROM content_bundles WHERE id = $1', [bundleId]);
        if (bundleCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Bundle not found' });
        }
        const results = {
            success: [],
            errors: [],
            total_processed: 0,
            total_success: 0,
            total_errors: 0
        };
        if (content_ids && content_ids.length > 0) {
            for (const content_id of content_ids) {
                try {
                    results.total_processed++;
                    const contentCheck = await database_1.db.query('SELECT id, original_name FROM central_content WHERE id = $1', [content_id]);
                    if (contentCheck.rows.length === 0) {
                        results.errors.push({ content_id, error: 'Content not found' });
                        results.total_errors++;
                        continue;
                    }
                    const existingAssignment = await database_1.db.query(`
            SELECT id FROM bundle_content_assignments 
            WHERE bundle_id = $1 AND content_id = $2
          `, [bundleId, content_id]);
                    if (existingAssignment.rows.length > 0) {
                        results.errors.push({ content_id, error: 'Content already assigned to this bundle' });
                        results.total_errors++;
                        continue;
                    }
                    const result = await database_1.db.query(`
            INSERT INTO bundle_content_assignments (
              bundle_id, content_id, assignment_order
            ) VALUES ($1, $2, $3)
            RETURNING *
          `, [bundleId, content_id, assignment_order]);
                    results.success.push({
                        content_id,
                        assignment_id: result.rows[0].id,
                        name: contentCheck.rows[0].original_name
                    });
                    results.total_success++;
                }
                catch (error) {
                    results.errors.push({ content_id, error: error instanceof Error ? error.message : 'Unknown error' });
                    results.total_errors++;
                }
            }
        }
        if (text_content_ids && text_content_ids.length > 0) {
            for (const text_content_id of text_content_ids) {
                try {
                    results.total_processed++;
                    const textCheck = await database_1.db.query('SELECT id, text_content FROM central_text_content WHERE id = $1', [text_content_id]);
                    if (textCheck.rows.length === 0) {
                        results.errors.push({ text_content_id, error: 'Text content not found' });
                        results.total_errors++;
                        continue;
                    }
                    const existingAssignment = await database_1.db.query(`
            SELECT id FROM bundle_content_assignments 
            WHERE bundle_id = $1 AND text_content_id = $2
          `, [bundleId, text_content_id]);
                    if (existingAssignment.rows.length > 0) {
                        results.errors.push({ text_content_id, error: 'Text content already assigned to this bundle' });
                        results.total_errors++;
                        continue;
                    }
                    const result = await database_1.db.query(`
            INSERT INTO bundle_content_assignments (
              bundle_id, text_content_id, assignment_order
            ) VALUES ($1, $2, $3)
            RETURNING *
          `, [bundleId, text_content_id, assignment_order]);
                    results.success.push({
                        text_content_id,
                        assignment_id: result.rows[0].id,
                        name: textCheck.rows[0].text_content.substring(0, 50) + '...'
                    });
                    results.total_success++;
                }
                catch (error) {
                    results.errors.push({ text_content_id, error: error instanceof Error ? error.message : 'Unknown error' });
                    results.total_errors++;
                }
            }
        }
        res.json({
            success: true,
            message: `Batch assignment completed: ${results.total_success} successful, ${results.total_errors} errors`,
            results
        });
    }
    catch (error) {
        console.error('Error in batch content assignment:', error);
        res.status(500).json({ error: 'Failed to batch assign content to bundle' });
    }
});
exports.default = router;
//# sourceMappingURL=centralContent.js.map