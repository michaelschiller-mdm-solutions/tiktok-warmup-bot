import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../database';
import { createModelSchema, updateModelSchema, modelIdSchema } from '../validation/models';

const router = express.Router();

// Configure multer for content uploads
const uploadDir = path.join(__dirname, '../../uploads/content');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and videos are allowed'));
    }
  }
});

// Middleware for validation
const validateBody = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    req.body = value; // Use validated/sanitized values
    next();
  };
};

const validateParams = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.params);
    if (error) {
      return res.status(400).json({
        error: 'Invalid parameters',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    next();
  };
};

// Get all models with statistics
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT 
        m.*,
        COUNT(a.id) as account_count,
        COUNT(CASE WHEN a.status = 'active' THEN 1 END) as active_accounts,
        COUNT(CASE WHEN a.status = 'banned' THEN 1 END) as banned_accounts,
        COUNT(CASE WHEN a.status = 'suspended' THEN 1 END) as suspended_accounts,
        MAX(a.last_activity) as last_account_activity
      FROM models m
      LEFT JOIN accounts a ON m.id = a.model_id
      GROUP BY m.id
      ORDER BY m.created_at DESC
    `);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ 
      error: 'Failed to fetch models',
      message: 'An internal server error occurred'
    });
  }
});

// Get single model with detailed statistics
router.get('/:id', validateParams(modelIdSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get model with statistics
    const modelResult = await db.query(`
      SELECT 
        m.*,
        COUNT(a.id) as account_count,
        COUNT(CASE WHEN a.status = 'active' THEN 1 END) as active_accounts,
        COUNT(CASE WHEN a.status = 'banned' THEN 1 END) as banned_accounts,
        COUNT(CASE WHEN a.status = 'suspended' THEN 1 END) as suspended_accounts,
        COUNT(mtf.id) as total_follows,
        COUNT(CASE WHEN mtf.status = 'following' THEN 1 END) as active_follows,
        MAX(a.last_activity) as last_account_activity
      FROM models m
      LEFT JOIN accounts a ON m.id = a.model_id
      LEFT JOIN model_target_follows mtf ON m.id = mtf.model_id
      WHERE m.id = $1
      GROUP BY m.id
    `, [id]);
    
    if (modelResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Model not found',
        message: `No model exists with ID ${id}`
      });
    }
    
    res.json({
      success: true,
      data: modelResult.rows[0]
    });
  } catch (error) {
    console.error('Error fetching model:', error);
    res.status(500).json({ 
      error: 'Failed to fetch model',
      message: 'An internal server error occurred'
    });
  }
});

// Create new model
router.post('/', validateBody(createModelSchema), async (req: Request, res: Response) => {
  try {
    const { name, description, unfollow_ratio, daily_follow_limit, posting_schedule, settings } = req.body;
    
    const result = await db.query(`
      INSERT INTO models (name, description, unfollow_ratio, daily_follow_limit, posting_schedule, settings)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name, description, unfollow_ratio, daily_follow_limit, posting_schedule, settings]);
    
    // Log the creation
    await db.query(`
      INSERT INTO activity_logs (model_id, action_type, details, success)
      VALUES ($1, 'model_created', $2, true)
    `, [result.rows[0].id, JSON.stringify({ model_name: name })]);
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Model created successfully'
    });
  } catch (error: any) {
    console.error('Error creating model:', error);
    
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json({ 
        error: 'Model name already exists',
        message: 'A model with this name already exists. Please choose a different name.'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to create model',
        message: 'An internal server error occurred'
      });
    }
  }
});

// Update model
router.put('/:id', validateParams(modelIdSchema), validateBody(updateModelSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;
    
    // Build dynamic update query
    const setClause = Object.keys(updateFields)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    const values = [id, ...Object.values(updateFields)];
    
    const result = await db.query(`
      UPDATE models 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Model not found',
        message: `No model exists with ID ${id}`
      });
    }
    
    // Log the update
    await db.query(`
      INSERT INTO activity_logs (model_id, action_type, details, success)
      VALUES ($1, 'model_updated', $2, true)
    `, [id, JSON.stringify({ updated_fields: Object.keys(updateFields) })]);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Model updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating model:', error);
    
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json({ 
        error: 'Model name already exists',
        message: 'A model with this name already exists. Please choose a different name.'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to update model',
        message: 'An internal server error occurred'
      });
    }
  }
});

// Delete model
router.delete('/:id', validateParams(modelIdSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if model exists and get account count
    const checkResult = await db.query(`
      SELECT m.name, COUNT(a.id) as account_count 
      FROM models m 
      LEFT JOIN accounts a ON m.id = a.model_id 
      WHERE m.id = $1 
      GROUP BY m.id, m.name
    `, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Model not found',
        message: `No model exists with ID ${id}`
      });
    }
    
    const { name, account_count } = checkResult.rows[0];
    
    // Delete the model (cascade will handle related records)
    const deleteResult = await db.query('DELETE FROM models WHERE id = $1 RETURNING *', [id]);
    
    // Log the deletion
    await db.query(`
      INSERT INTO activity_logs (action_type, details, success)
      VALUES ('model_deleted', $1, true)
    `, [JSON.stringify({ model_name: name, account_count: parseInt(account_count) })]);
    
    res.json({
      success: true,
      message: `Model "${name}" deleted successfully`,
      details: {
        deleted_accounts: parseInt(account_count),
        model_name: name
      }
    });
  } catch (error) {
    console.error('Error deleting model:', error);
    res.status(500).json({ 
      error: 'Failed to delete model',
      message: 'An internal server error occurred'
    });
  }
});

// Get content for a model
router.get('/:id/content', validateParams(modelIdSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { category, content_type, status = 'active' } = req.query;

    // Verify model exists
    const modelCheck = await db.query('SELECT id, name FROM models WHERE id = $1', [id]);
    if (modelCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Model not found',
        message: `No model exists with ID ${id}`
      });
    }

    // Build query with filters
    let whereConditions = ['model_id = $1'];
    let params = [id];
    let paramIndex = 2;

    if (status && typeof status === 'string') {
      whereConditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (content_type && typeof content_type === 'string') {
      whereConditions.push(`content_type = $${paramIndex}`);
      params.push(content_type);
      paramIndex++;
    }

    if (category && typeof category === 'string') {
      whereConditions.push(`categories @> $${paramIndex}`);
      params.push(JSON.stringify([category]));
      paramIndex++;
    }

    const query = `
      SELECT 
        id,
        filename,
        original_name,
        content_type,
        file_size,
        mime_type,
        categories,
        status,
        created_at,
        updated_at
      FROM model_content
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY created_at DESC
    `;

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: {
        model_id: parseInt(id),
        model_name: modelCheck.rows[0].name,
        content: result.rows,
        total_count: result.rows.length
      }
    });

  } catch (error: any) {
    console.error('Error fetching model content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch content',
      message: error.message || 'An internal server error occurred'
    });
  }
});

// Upload content for a model
router.post('/:id/content', validateParams(modelIdSchema), upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        message: 'Please select a file to upload'
      });
    }

    // Parse categories from request
    let categories: string[] = [];
    try {
      categories = JSON.parse(req.body.categories || '[]');
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid categories format',
        message: 'Categories must be a valid JSON array'
      });
    }

    if (categories.length === 0) {
      // Clean up uploaded file
      fs.unlinkSync(file.path);
      return res.status(400).json({
        success: false,
        error: 'No categories selected',
        message: 'Please select at least one category for the content'
      });
    }

    // Verify model exists
    const modelCheck = await db.query('SELECT id FROM models WHERE id = $1', [id]);
    if (modelCheck.rows.length === 0) {
      // Clean up uploaded file
      fs.unlinkSync(file.path);
      return res.status(404).json({
        success: false,
        error: 'Model not found',
        message: `No model exists with ID ${id}`
      });
    }

    // Determine content type
    const contentType = file.mimetype.startsWith('image/') ? 'image' : 'video';
    
    // Store content record in database
    const contentResult = await db.query(`
      INSERT INTO model_content (
        model_id, 
        filename, 
        original_name, 
        file_path, 
        content_type, 
        file_size, 
        mime_type,
        categories,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
      RETURNING *
    `, [
      id,
      file.filename,
      file.originalname,
      file.path,
      contentType,
      file.size,
      file.mimetype,
      JSON.stringify(categories)
    ]);

    // Also add to central registry and model bundle
    try {
      // Get model name for bundle
      const modelResult = await db.query('SELECT name FROM models WHERE id = $1', [id]);
      const modelName = modelResult.rows[0].name;
      const bundleName = `Model: ${modelName} Content`;

      // Add to central content registry
      const centralContentResult = await db.query(`
        INSERT INTO central_content (
          filename, original_name, file_path, content_type, 
          file_size, mime_type, categories, tags, uploaded_by, content_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
        RETURNING *
      `, [
        file.filename,
        file.originalname,
        file.path,
        contentType,
        file.size,
        file.mimetype,
        categories,
        [], // empty tags for model uploads
        `model_${id}`,
      ]);

      // Check if model bundle exists, create if not
      let bundleResult = await db.query(`
        SELECT id FROM content_bundles 
        WHERE name = $1 AND created_by = $2
      `, [bundleName, `model_${id}`]);

      let bundleId;
      if (bundleResult.rows.length === 0) {
        // Create model bundle
        bundleResult = await db.query(`
          INSERT INTO content_bundles (name, description, bundle_type, categories, tags, created_by, status)
          VALUES ($1, $2, 'mixed', $3, $4, $5, 'active')
          RETURNING id
        `, [
          bundleName,
          `Auto-generated bundle for ${modelName} model content`,
          categories,
          [],
          `model_${id}`
        ]);
        bundleId = bundleResult.rows[0].id;

        // Assign bundle to model
        await db.query(`
          INSERT INTO model_bundle_assignments (model_id, bundle_id, assignment_type, assigned_by)
          VALUES ($1, $2, 'auto', $3)
          ON CONFLICT (model_id, bundle_id) DO NOTHING
        `, [id, bundleId, `model_${id}`]);
      } else {
        bundleId = bundleResult.rows[0].id;
      }

      // Add content to bundle
      await db.query(`
        INSERT INTO bundle_content_assignments (bundle_id, content_id, assignment_order)
        VALUES ($1, $2, 0)
      `, [bundleId, centralContentResult.rows[0].id]);

    } catch (centralError) {
      console.error('Error adding to central registry:', centralError);
      // Don't fail the upload if central registry fails
    }

    // Handle text content if provided
    const textContent = req.body.textContent;
    if (textContent && textContent.trim()) {
      try {
        // Create text content record
        const textResult = await db.query(`
          INSERT INTO model_text_content (
            model_id,
            text_content,
            categories,
            template_name,
            status
          ) VALUES ($1, $2, $3, $4, 'active')
          RETURNING id
        `, [
          id,
          textContent.trim(),
          JSON.stringify(categories),
          `upload_${Date.now()}`
        ]);

        // Create assignment between content and text
        await db.query(`
          INSERT INTO content_text_assignments (
            model_id,
            content_id,
            text_content_id,
            assignment_type,
            template_name,
            assigned_at,
            assigned_by,
            status
          ) VALUES ($1, $2, $3, 'manual', $4, CURRENT_TIMESTAMP, 'upload', 'active')
        `, [
          id,
          contentResult.rows[0].id,
          textResult.rows[0].id,
          `upload_${Date.now()}`
        ]);
      } catch (textError) {
        console.error('Error creating text assignment:', textError);
        // Don't fail the upload if text assignment fails
      }
    }

    // Log the upload
    await db.query(`
      INSERT INTO activity_logs (model_id, action_type, details, success)
      VALUES ($1, 'content_uploaded', $2, true)
    `, [id, JSON.stringify({ 
      filename: file.originalname,
      content_type: contentType,
      categories: categories,
      file_size: file.size
    })]);

    res.status(201).json({
      success: true,
      data: {
        id: contentResult.rows[0].id,
        filename: file.originalname,
        content_type: contentType,
        categories: categories,
        file_size: file.size,
        uploaded_at: contentResult.rows[0].created_at
      },
      message: 'Content uploaded successfully'
    });

  } catch (error: any) {
    console.error('Error uploading content:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to upload content',
      message: error.message || 'An internal server error occurred'
    });
  }
});

// Text Content Management Endpoints

// Get text content for a model
router.get('/:id/text-content', validateParams(modelIdSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { category, template_name, status = 'active' } = req.query;

    // Verify model exists
    const modelCheck = await db.query('SELECT id, name FROM models WHERE id = $1', [id]);
    if (modelCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Model not found',
        message: `No model exists with ID ${id}`
      });
    }

    // Build query with filters
    let whereConditions = ['model_id = $1'];
    let params = [id];
    let paramIndex = 2;

    if (status && typeof status === 'string') {
      whereConditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (template_name && typeof template_name === 'string') {
      whereConditions.push(`template_name = $${paramIndex}`);
      params.push(template_name);
      paramIndex++;
    }

    if (category && typeof category === 'string') {
      whereConditions.push(`categories @> $${paramIndex}`);
      params.push(JSON.stringify([category]));
      paramIndex++;
    }

    const query = `
      SELECT 
        id,
        text_content,
        categories,
        template_name,
        status,
        metadata,
        created_at,
        updated_at
      FROM model_text_content 
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY created_at DESC
    `;

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: {
        model_id: parseInt(id),
        model_name: modelCheck.rows[0].name,
        text_content: result.rows,
        total_count: result.rows.length,
        filters: {
          category: category || null,
          template_name: template_name || null,
          status: status || 'active'
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching text content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch text content',
      message: error.message || 'An internal server error occurred'
    });
  }
});

// Upload/Create text content for a model
router.post('/:id/text-content', validateParams(modelIdSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { text_content, categories, template_name, metadata } = req.body;

    if (!text_content || typeof text_content !== 'string' || text_content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid text content',
        message: 'Text content is required and must be a non-empty string'
      });
    }

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid categories',
        message: 'Categories must be a non-empty array'
      });
    }

    // Verify model exists
    const modelCheck = await db.query('SELECT id FROM models WHERE id = $1', [id]);
    if (modelCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Model not found',
        message: `No model exists with ID ${id}`
      });
    }

    // Store text content record in database
    const textResult = await db.query(`
      INSERT INTO model_text_content (
        model_id, 
        text_content, 
        categories,
        template_name,
        metadata,
        status
      ) VALUES ($1, $2, $3, $4, $5, 'active')
      RETURNING *
    `, [
      id,
      text_content.trim(),
      JSON.stringify(categories),
      template_name || null,
      JSON.stringify(metadata || {})
    ]);

    // Log the creation
    await db.query(`
      INSERT INTO activity_logs (model_id, action_type, details, success)
      VALUES ($1, 'text_content_created', $2, true)
    `, [id, JSON.stringify({ 
      text_length: text_content.trim().length,
      categories: categories,
      template_name: template_name || null
    })]);

    res.status(201).json({
      success: true,
      data: {
        id: textResult.rows[0].id,
        text_content: text_content.trim(),
        categories: categories,
        template_name: template_name || null,
        created_at: textResult.rows[0].created_at
      },
      message: 'Text content created successfully'
    });

  } catch (error: any) {
    console.error('Error creating text content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create text content',
      message: error.message || 'An internal server error occurred'
    });
  }
});

// Bulk import text content from file or array
router.post('/:id/text-content/bulk', validateParams(modelIdSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { texts, categories, template_name, metadata } = req.body;

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid texts',
        message: 'Texts must be a non-empty array of strings'
      });
    }

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid categories',
        message: 'Categories must be a non-empty array'
      });
    }

    // Verify model exists
    const modelCheck = await db.query('SELECT id FROM models WHERE id = $1', [id]);
    if (modelCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Model not found',
        message: `No model exists with ID ${id}`
      });
    }

    const validTexts = texts.filter(text => 
      typeof text === 'string' && text.trim().length > 0
    );

    if (validTexts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid texts',
        message: 'No valid text content found in the provided array'
      });
    }

    // Insert all texts in a transaction
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      const insertedTexts = [];
      for (const text of validTexts) {
        const result = await client.query(`
          INSERT INTO model_text_content (
            model_id, 
            text_content, 
            categories,
            template_name,
            metadata,
            status
          ) VALUES ($1, $2, $3, $4, $5, 'active')
          RETURNING id, text_content, created_at
        `, [
          id,
          text.trim(),
          JSON.stringify(categories),
          template_name || null,
          JSON.stringify(metadata || {})
        ]);
        
        insertedTexts.push(result.rows[0]);
      }

      // Log the bulk import
      await client.query(`
        INSERT INTO activity_logs (model_id, action_type, details, success)
        VALUES ($1, 'text_content_bulk_imported', $2, true)
      `, [id, JSON.stringify({ 
        imported_count: insertedTexts.length,
        categories: categories,
        template_name: template_name || null
      })]);

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        data: {
          imported_count: insertedTexts.length,
          skipped_count: texts.length - validTexts.length,
          categories: categories,
          template_name: template_name || null,
          texts: insertedTexts
        },
        message: `Successfully imported ${insertedTexts.length} text content items`
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('Error bulk importing text content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import text content',
      message: error.message || 'An internal server error occurred'
    });
  }
});

// Assign texts to images randomly
router.post('/:id/assign-texts', validateParams(modelIdSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { template_name, category_filter } = req.body;

    // Verify model exists
    const modelCheck = await db.query('SELECT id, name FROM models WHERE id = $1', [id]);
    if (modelCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Model not found',
        message: `No model exists with ID ${id}`
      });
    }

    // Call the assignment function
    const result = await db.query(
      'SELECT assign_texts_randomly($1, $2, $3) as assignment_count',
      [
        id,
        template_name || null,
        category_filter ? JSON.stringify(category_filter) : null
      ]
    );

    const assignmentCount = result.rows[0].assignment_count;

    // Log the assignment
    await db.query(`
      INSERT INTO activity_logs (model_id, action_type, details, success)
      VALUES ($1, 'texts_assigned', $2, true)
    `, [id, JSON.stringify({ 
      assignment_count: assignmentCount,
      template_name: template_name || null,
      category_filter: category_filter || null
    })]);

    res.json({
      success: true,
      data: {
        model_id: parseInt(id),
        model_name: modelCheck.rows[0].name,
        assignment_count: assignmentCount,
        template_name: template_name || null,
        category_filter: category_filter || null
      },
      message: `Successfully assigned texts to ${assignmentCount} images`
    });

  } catch (error: any) {
    console.error('Error assigning texts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign texts',
      message: error.message || 'An internal server error occurred'
    });
  }
});

// Get content with assigned texts (enhanced version of GET /:id/content)
router.get('/:id/content-with-texts', validateParams(modelIdSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { category, content_type, status = 'active' } = req.query;

    // Verify model exists
    const modelCheck = await db.query('SELECT id, name FROM models WHERE id = $1', [id]);
    if (modelCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Model not found',
        message: `No model exists with ID ${id}`
      });
    }

    // Use the function to get content with texts
    const result = await db.query('SELECT * FROM get_content_with_texts($1)', [id]);
    
    // Apply filters if needed
    let filteredRows = result.rows;
    
    if (category && typeof category === 'string') {
      filteredRows = filteredRows.filter((row: any) => 
        row.categories && row.categories.includes(category)
      );
    }
    
    if (content_type && typeof content_type === 'string') {
      filteredRows = filteredRows.filter((row: any) => 
        row.content_type === content_type
      );
    }
    
    if (status && typeof status === 'string') {
      filteredRows = filteredRows.filter((row: any) => 
        row.content_status === status
      );
    }

    // Transform data to include image URLs
    const contentWithUrls = filteredRows.map((row: any) => ({
      ...row,
      image_url: row.content_type === 'image' ? `/uploads/content/${row.filename}` : null,
      video_url: row.content_type === 'video' ? `/uploads/content/${row.filename}` : null
    }));

    res.json({
      success: true,
      data: {
        model_id: parseInt(id),
        model_name: modelCheck.rows[0].name,
        content: contentWithUrls,
        total_count: contentWithUrls.length,
        filters: {
          category: category || null,
          content_type: content_type || null,
          status: status || 'active'
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching content with texts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch content with texts',
      message: error.message || 'An internal server error occurred'
    });
  }
});

export default router; 