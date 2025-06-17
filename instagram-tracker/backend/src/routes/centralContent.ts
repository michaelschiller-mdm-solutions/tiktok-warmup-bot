import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../database';

const router = express.Router();

// Migration endpoint (for development only)
router.post('/migrate', async (req, res) => {
  try {
    console.log('🔄 Running central content registry migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../../../run-migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await db.query(migrationSQL);
    
    console.log('✅ Central content registry migration completed successfully!');
    
    // Test the new functions
    console.log('🧪 Testing new database functions...');
    
    // Test get_central_content_with_texts function
    const testResult = await db.query('SELECT * FROM get_central_content_with_texts() LIMIT 1');
    console.log('✅ get_central_content_with_texts function working');
    
    // Test get_bundle_contents function
    try {
      const bundleResult = await db.query('SELECT * FROM get_bundle_contents(1)');
      console.log('✅ get_bundle_contents function working');
    } catch (err) {
      console.log('ℹ️  get_bundle_contents function working (no bundles exist yet)');
    }
    
    res.json({ 
      success: true, 
      message: 'Central content registry migration completed successfully!' 
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Migration failed', 
      details: error.message 
    });
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/content');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  }
});

// Get all central content with optional filtering
router.get('/content', async (req, res) => {
  try {
    const { 
      bundle_id, 
      content_type, 
      status = 'active',
      categories,
      tags,
      limit = 50,
      offset = 0
    } = req.query;

    let query = `
      SELECT * FROM get_central_content_with_texts($1, $2, $3)
    `;
    const params = [
      bundle_id ? parseInt(bundle_id as string) : null,
      content_type || null,
      status
    ];

    // Add additional filtering if needed
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
    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching central content:', error);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

// Upload content to central registry
router.post('/content/upload', upload.array('files', 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    const { categories = '[]', tags = '[]', uploaded_by } = req.body;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Parse categories and tags safely
    let parsedCategories: string[] = [];
    let parsedTags: string[] = [];
    
    try {
      parsedCategories = typeof categories === 'string' ? JSON.parse(categories) : categories;
      parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
    } catch (parseError) {
      console.error('Error parsing categories/tags:', parseError);
      return res.status(400).json({ error: 'Invalid categories or tags format' });
    }

    const uploadedContent = [];

    for (const file of files) {
      const contentType = file.mimetype.startsWith('image/') ? 'image' : 'video';
      
      const result = await db.query(`
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
        parsedCategories,
        parsedTags,
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
  } catch (error) {
    console.error('Error uploading content:', error);
    res.status(500).json({ error: 'Failed to upload content' });
  }
});

// Add text content to central registry
router.post('/text-content', async (req, res) => {
  try {
    const { 
      text_content, 
      categories = [], 
      tags = [], 
      template_name,
      language = 'en',
      created_by 
    } = req.body;

    if (!text_content) {
      return res.status(400).json({ error: 'Text content is required' });
    }

    // Ensure categories and tags are arrays
    const safeCategories = Array.isArray(categories) ? categories : [];
    const safeTags = Array.isArray(tags) ? tags : [];

    const result = await db.query(`
      INSERT INTO central_text_content (
        text_content, categories, tags, template_name, language, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [text_content, safeCategories, safeTags, template_name, language, created_by]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error adding text content:', error);
    res.status(500).json({ error: 'Failed to add text content' });
  }
});

// Assign text to content (multiple texts per content)
router.post('/content/:contentId/assign-text', async (req, res) => {
  try {
    const { contentId } = req.params;
    const { text_content_id, assignment_type = 'manual', template_name, priority = 0, assigned_by } = req.body;

    const result = await db.query(`
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
  } catch (error) {
    console.error('Error assigning text to content:', error);
    res.status(500).json({ error: 'Failed to assign text to content' });
  }
});

// Get all content bundles
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
      params.push(bundle_type as string);
    }

    query += ` GROUP BY cb.id ORDER BY cb.created_at DESC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching bundles:', error);
    res.status(500).json({ error: 'Failed to fetch bundles' });
  }
});

// Create a new content bundle
router.post('/bundles', async (req, res) => {
  try {
    const { 
      name, 
      description, 
      bundle_type = 'mixed', 
      categories = [], 
      tags = [],
      created_by 
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Bundle name is required' });
    }

    const result = await db.query(`
      INSERT INTO content_bundles (name, description, bundle_type, categories, tags, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name, description, bundle_type, JSON.stringify(categories), JSON.stringify(tags), created_by]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating bundle:', error);
    res.status(500).json({ error: 'Failed to create bundle' });
  }
});

// Get bundle contents
router.get('/bundles/:bundleId/contents', async (req, res) => {
  try {
    const { bundleId } = req.params;
    
    const result = await db.query('SELECT * FROM get_bundle_contents($1)', [bundleId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bundle not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching bundle contents:', error);
    res.status(500).json({ error: 'Failed to fetch bundle contents' });
  }
});

// Add content to bundle
router.post('/bundles/:bundleId/add-content', async (req, res) => {
  try {
    const { bundleId } = req.params;
    const { content_id, text_content_id, assignment_order = 0 } = req.body;

    if (!content_id && !text_content_id) {
      return res.status(400).json({ error: 'Either content_id or text_content_id is required' });
    }

    // Check if bundle exists
    const bundleResult = await db.query(
      'SELECT id FROM content_bundles WHERE id = $1',
      [bundleId]
    );

    if (bundleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bundle not found' });
    }

    if (content_id) {
      // Add content to bundle
      await db.query(`
        INSERT INTO bundle_content_assignments (bundle_id, content_id, assignment_order, assigned_at, assigned_by)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 'user')
        ON CONFLICT (bundle_id, content_id) DO UPDATE SET
          assignment_order = EXCLUDED.assignment_order,
          assigned_at = CURRENT_TIMESTAMP
      `, [bundleId, content_id, assignment_order]);
    }

    if (text_content_id) {
      // Add text content to bundle
      await db.query(`
        INSERT INTO bundle_content_assignments (bundle_id, text_content_id, assignment_order, assigned_at, assigned_by)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 'user')
        ON CONFLICT (bundle_id, text_content_id) DO UPDATE SET
          assignment_order = EXCLUDED.assignment_order,
          assigned_at = CURRENT_TIMESTAMP
      `, [bundleId, text_content_id, assignment_order]);
    }

    res.json({ success: true, message: 'Content added to bundle successfully' });
  } catch (error) {
    console.error('Error adding content to bundle:', error);
    res.status(500).json({ error: 'Failed to add content to bundle' });
  }
});

// Remove content from bundle
router.delete('/bundles/:bundleId/content/:assignmentId', async (req, res) => {
  try {
    const { bundleId, assignmentId } = req.params;

    const result = await db.query(`
      DELETE FROM bundle_content_assignments 
      WHERE id = $1 AND bundle_id = $2
      RETURNING *
    `, [assignmentId, bundleId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json({ success: true, deleted: result.rows[0] });
  } catch (error) {
    console.error('Error removing content from bundle:', error);
    res.status(500).json({ error: 'Failed to remove content from bundle' });
  }
});

// Assign bundle to model
router.post('/models/:modelId/assign-bundle', async (req, res) => {
  try {
    const { modelId } = req.params;
    const { bundle_id, assignment_type = 'active', priority = 0, assigned_by } = req.body;

    const result = await db.query(`
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
  } catch (error) {
    console.error('Error assigning bundle to model:', error);
    res.status(500).json({ error: 'Failed to assign bundle to model' });
  }
});

// Get model's assigned bundles
router.get('/models/:modelId/bundles', async (req, res) => {
  try {
    const { modelId } = req.params;

    const result = await db.query(`
      SELECT 
        cb.*,
        mba.assignment_type,
        mba.priority,
        mba.assigned_at,
        COUNT(DISTINCT bca.content_id) as content_count,
        COUNT(DISTINCT bca.text_content_id) as text_count
      FROM model_bundle_assignments mba
      JOIN content_bundles cb ON mba.bundle_id = cb.id
      LEFT JOIN bundle_content_assignments bca ON cb.id = bca.bundle_id
      WHERE mba.model_id = $1 AND cb.status = 'active'
      GROUP BY cb.id, mba.assignment_type, mba.priority, mba.assigned_at
      ORDER BY mba.priority DESC, mba.assigned_at DESC
    `, [modelId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching model bundles:', error);
    res.status(500).json({ error: 'Failed to fetch model bundles' });
  }
});

// Sync existing model content to central registry
router.post('/sync-model-content', async (req, res) => {
  try {
    console.log('🔄 Syncing existing model content to central registry...');
    
    // Get all existing model content that's not in central registry
    const modelContentResult = await db.query(`
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
    const bundleMap = new Map<number, number>(); // model_id -> bundle_id

    for (const content of modelContent) {
      try {
        // Add to central content registry
        const centralContentResult = await db.query(`
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
          content.categories || [],
          [], // empty tags for model content
          `model_${content.model_id}`
        ]);

        const centralContentId = centralContentResult.rows[0].id;

        // Get or create model bundle
        let bundleId = bundleMap.get(content.model_id);
        if (!bundleId) {
          const bundleName = `Model: ${content.model_name} Content`;
          
          // Check if bundle exists
          let bundleResult = await db.query(`
            SELECT id FROM content_bundles 
            WHERE name = $1 AND created_by = $2
          `, [bundleName, `model_${content.model_id}`]);

          if (bundleResult.rows.length === 0) {
            // Create model bundle
            bundleResult = await db.query(`
              INSERT INTO content_bundles (name, description, bundle_type, categories, tags, created_by, status)
              VALUES ($1, $2, 'mixed', $3, $4, $5, 'active')
              RETURNING id
            `, [
              bundleName,
              `Auto-generated bundle for ${content.model_name} model content`,
              content.categories || [],
              [],
              `model_${content.model_id}`
            ]);

            // Assign bundle to model
            await db.query(`
              INSERT INTO model_bundle_assignments (model_id, bundle_id, assignment_type, assigned_by)
              VALUES ($1, $2, 'auto', $3)
              ON CONFLICT (model_id, bundle_id) DO NOTHING
            `, [content.model_id, bundleResult.rows[0].id, `model_${content.model_id}`]);
          }
          
          bundleId = bundleResult.rows[0].id;
          bundleMap.set(content.model_id, bundleId);
        }

        // Add content to bundle
        await db.query(`
          INSERT INTO bundle_content_assignments (bundle_id, content_id, assignment_order)
          VALUES ($1, $2, 0)
          ON CONFLICT (bundle_id, content_id) DO NOTHING
        `, [bundleId, centralContentId]);

        syncedCount++;
        console.log(`✅ Synced: ${content.original_name} from model ${content.model_name}`);

      } catch (itemError) {
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

  } catch (error) {
    console.error('❌ Sync failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to sync model content', 
      details: error.message 
    });
  }
});

export default router; 