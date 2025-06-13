import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../database';

const router = express.Router();

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
        JSON.parse(categories),
        JSON.parse(tags),
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

    const result = await db.query(`
      INSERT INTO central_text_content (
        text_content, categories, tags, template_name, language, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [text_content, JSON.stringify(categories), JSON.stringify(tags), template_name, language, created_by]);

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

    const result = await db.query(`
      INSERT INTO bundle_content_assignments (bundle_id, content_id, text_content_id, assignment_order)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [bundleId, content_id || null, text_content_id || null, assignment_order]);

    res.json(result.rows[0]);
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

export default router; 