import express from 'express';
import { db } from '../database';
import path from 'path';
import fs from 'fs';

const router = express.Router();

/**
 * POST /api/warmup-content-assignment/bulk-assign
 * Bulk assign content to all accounts ready for warmup
 */
router.post('/bulk-assign', async (req: any, res: any) => {
  try {
    const { 
      lifecycle_states = ['ready', 'ready_for_bot_assignment'],
      force_reassign = false 
    } = req.body;

    console.log('🚀 Starting bulk content assignment...');

    // Get accounts that need content assignment
    const accountsQuery = `
      SELECT 
        a.id, 
        a.username, 
        a.lifecycle_state, 
        a.container_number,
        a.model_id,
        COUNT(awp.id) as total_phases,
        COUNT(CASE WHEN awp.assigned_content_id IS NOT NULL OR awp.assigned_text_id IS NOT NULL THEN 1 END) as assigned_phases
      FROM accounts a
      LEFT JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE a.lifecycle_state = ANY($1)
        AND a.container_number IS NOT NULL
      GROUP BY a.id, a.username, a.lifecycle_state, a.container_number, a.model_id
      ${force_reassign ? '' : 'HAVING COUNT(CASE WHEN awp.assigned_content_id IS NOT NULL OR awp.assigned_text_id IS NOT NULL THEN 1 END) < COUNT(awp.id)'}
      ORDER BY a.created_at DESC
    `;

    const accountsResult = await db.query(accountsQuery, [lifecycle_states]);
    const accounts = accountsResult.rows;

    console.log(`📊 Found ${accounts.length} accounts needing content assignment`);

    const results = [];
    let successCount = 0;
    let failedCount = 0;

    for (const account of accounts) {
      try {
        console.log(`📝 Processing account ${account.id} (${account.username})...`);

        // First, ensure warmup phases exist for this account
        // Manual setup should already be completed (that's how they got to ready_for_bot_assignment)
        // set_to_private should be LAST phase, so it starts as pending
        
        console.log(`[Content Assignment] Found ${account.total_phases} existing phases for account ${account.id}`);
        
        // Create phases one by one to handle enum casting properly
        const phasesToCreate = [
          'manual_setup',
          'bio', 
          'gender',
          'name',
          'username', 
          'first_highlight',
          'new_highlight',
          'post_caption',
          'post_no_caption', 
          'story_caption',
          'story_no_caption',
          'set_to_private'
        ];
        
        for (const phaseName of phasesToCreate) {
          try {
            const phaseStatus = phaseName === 'manual_setup' ? 'completed' : 
                              phaseName === 'bio' ? 'available' :
                              phaseName === 'set_to_private' ? 'pending' : 'pending';
                              
            await db.query(`
              INSERT INTO account_warmup_phases (account_id, phase, status, created_at)
              VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
              ON CONFLICT (account_id, phase) DO NOTHING
            `, [account.id, phaseName, phaseStatus]);
          } catch (phaseError: any) {
            console.log(`[Content Assignment] Warning: Could not create phase ${phaseName} for account ${account.id}: ${phaseError.message}`);
          }
        }
        
        // Verify phases were created
        const verifyResult = await db.query(`
          SELECT phase, status FROM account_warmup_phases 
          WHERE account_id = $1 
          ORDER BY phase
        `, [account.id]);
        
        console.log(`[Content Assignment] Account ${account.id} now has ${verifyResult.rows.length} phases:`, 
          verifyResult.rows.map(r => `${r.phase}(${r.status})`).join(', '));

        // Get assignment count using the JavaScript function instead of SQL function
        const { assignContentToAccount } = require('../scripts/assign-content-simple.js');
        const assignedCount = await assignContentToAccount(account.id);
        
        console.log(`[Content Assignment] Account ${account.id}: ${assignedCount} phases assigned content`);

        results.push({
          account_id: account.id,
          username: account.username,
          success: true,
          assigned_phases: assignedCount,
          message: `Assigned content to ${assignedCount} phases`
        });

        successCount++;
        console.log(`✅ Account ${account.id}: ${assignedCount} phases assigned`);

      } catch (error: any) {
        console.error(`❌ Failed to assign content to account ${account.id}:`, error);
        
        results.push({
          account_id: account.id,
          username: account.username,
          success: false,
          error: error.message,
          message: 'Content assignment failed'
        });

        failedCount++;
      }
    }

    console.log(`🎉 Bulk assignment completed: ${successCount} successful, ${failedCount} failed`);

    res.json({
      success: true,
      message: `Bulk content assignment completed: ${successCount} successful, ${failedCount} failed`,
      data: {
        total_processed: accounts.length,
        successful: successCount,
        failed: failedCount,
        results: results
      }
    });

  } catch (error: any) {
    console.error('Bulk content assignment error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message || 'Failed to perform bulk content assignment'
    });
  }
});

/**
 * GET /api/warmup-content-assignment/status
 * Get content assignment status for all accounts
 */
router.get('/status', async (req: any, res: any) => {
  try {
    const { 
      lifecycle_states = ['ready', 'ready_for_bot_assignment', 'warmup'],
      page = 1,
      limit = 100
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const query = `
      SELECT 
        a.id as account_id,
        a.username,
        a.lifecycle_state,
        a.container_number,
        a.model_id,
        m.name as model_name,
        
        -- Phase counts
        COUNT(awp.id) as total_phases,
        COUNT(CASE WHEN awp.phase NOT IN ('manual_setup', 'gender') THEN 1 END) as content_requiring_phases,
        
        -- Content assignment status
        COUNT(CASE 
          WHEN awp.phase IN ('bio', 'name', 'username') AND awp.assigned_text_id IS NOT NULL THEN 1
          WHEN awp.phase IN ('first_highlight', 'new_highlight', 'post_caption', 'story_caption') 
               AND awp.assigned_content_id IS NOT NULL AND awp.assigned_text_id IS NOT NULL THEN 1
          WHEN awp.phase IN ('post_no_caption', 'story_no_caption') AND awp.assigned_content_id IS NOT NULL THEN 1
          WHEN awp.phase IN ('manual_setup', 'gender') THEN 1  -- These don't need content
        END) as phases_with_content_assigned,
        
        -- Calculate completion percentage
        CASE 
          WHEN COUNT(CASE WHEN awp.phase NOT IN ('manual_setup', 'gender') THEN 1 END) > 0 THEN
            ROUND((COUNT(CASE 
              WHEN awp.phase IN ('bio', 'name', 'username') AND awp.assigned_text_id IS NOT NULL THEN 1
              WHEN awp.phase IN ('first_highlight', 'new_highlight', 'post_caption', 'story_caption') 
                   AND awp.assigned_content_id IS NOT NULL AND awp.assigned_text_id IS NOT NULL THEN 1
              WHEN awp.phase IN ('post_no_caption', 'story_no_caption') AND awp.assigned_content_id IS NOT NULL THEN 1
            END)::decimal / COUNT(CASE WHEN awp.phase NOT IN ('manual_setup', 'gender') THEN 1 END)) * 100, 2)
          ELSE 100.00  -- If no content-requiring phases, consider it 100% complete
        END as content_assignment_percent,
        
        -- Status flag
        (COUNT(CASE 
          WHEN awp.phase IN ('bio', 'name', 'username') AND awp.assigned_text_id IS NOT NULL THEN 1
          WHEN awp.phase IN ('first_highlight', 'new_highlight', 'post_caption', 'story_caption') 
               AND awp.assigned_content_id IS NOT NULL AND awp.assigned_text_id IS NOT NULL THEN 1
          WHEN awp.phase IN ('post_no_caption', 'story_no_caption') AND awp.assigned_content_id IS NOT NULL THEN 1
          WHEN awp.phase IN ('manual_setup', 'gender') THEN 1
        END) = COUNT(awp.id)) as is_assignment_complete,
        
        -- Last assignment timestamp
        MAX(awp.content_assigned_at) as last_content_assignment_at
        
      FROM accounts a
      LEFT JOIN models m ON a.model_id = m.id
      LEFT JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE a.lifecycle_state = ANY($1)
      GROUP BY a.id, a.username, a.lifecycle_state, a.container_number, a.model_id, m.name
      ORDER BY a.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await db.query(query, [lifecycle_states, parseInt(limit), offset]);

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT a.id) as total_count
      FROM accounts a
      WHERE a.lifecycle_state = ANY($1)
    `;
    const countResult = await db.query(countQuery, [lifecycle_states]);
    const totalCount = parseInt(countResult.rows[0].total_count);

    res.json({
      success: true,
      data: result.rows,
      metadata: {
        total_records: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(totalCount / parseInt(limit)),
        has_next: (parseInt(page) * parseInt(limit)) < totalCount,
        has_previous: parseInt(page) > 1
      }
    });

  } catch (error: any) {
    console.error('Error fetching content assignment status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message || 'Failed to fetch content assignment status'
    });
  }
});

/**
 * POST /api/warmup-content-assignment/prepare-for-iphone/:accountId
 * Prepare content and text data for iPhone automation
 */
router.post('/prepare-for-iphone/:accountId', async (req: any, res: any) => {
  try {
    const { accountId } = req.params;
    const { phase } = req.body;

    console.log(`📱 Preparing iPhone data for account ${accountId}, phase: ${phase || 'all'}`);

    // Get account info
    const accountResult = await db.query(
      'SELECT id, username, container_number FROM accounts WHERE id = $1',
      [accountId]
    );

    if (accountResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    const account = accountResult.rows[0];

    // Get warmup phases with content
    let phaseQuery = `
      SELECT 
        awp.id,
        awp.phase,
        awp.status,
        awp.assigned_content_id,
        awp.assigned_text_id,
        
        -- Content info
        cc.filename as content_filename,
        cc.file_path as content_file_path,
        cc.original_name as content_original_name,
        
        -- Text content info
        ctc.text_content,
        ctc.categories as text_categories
        
      FROM account_warmup_phases awp
      LEFT JOIN central_content cc ON awp.assigned_content_id = cc.id
      LEFT JOIN central_text_content ctc ON awp.assigned_text_id = ctc.id
      WHERE awp.account_id = $1
    `;

    const params = [accountId];

    if (phase) {
      phaseQuery += ' AND awp.phase = $2';
      params.push(phase);
    }

    phaseQuery += ' ORDER BY awp.phase';

    const phasesResult = await db.query(phaseQuery, params);
    const phases = phasesResult.rows;

    // Prepare iPhone automation data
    const iphoneData = {
      account: {
        id: account.id,
        username: account.username,
        container_number: account.container_number
      },
      phases: phases.map(phase => {
        const phaseData: any = {
          id: phase.id,
          phase: phase.phase,
          status: phase.status,
          content: null,
          text: null
        };

        // Add content file path if exists
        if (phase.content_file_path) {
          const fullPath = path.resolve(__dirname, '../../uploads', phase.content_file_path);
          phaseData.content = {
            id: phase.assigned_content_id,
            filename: phase.content_filename,
            original_name: phase.content_original_name,
            file_path: phase.content_file_path,
            full_path: fullPath,
            exists: fs.existsSync(fullPath)
          };
        }

        // Add text content if exists
        if (phase.text_content) {
          phaseData.text = {
            id: phase.assigned_text_id,
            content: phase.text_content,
            categories: phase.text_categories
          };
        }

        return phaseData;
      })
    };

    res.json({
      success: true,
      message: `iPhone data prepared for account ${account.username}`,
      data: iphoneData
    });

  } catch (error: any) {
    console.error('Error preparing iPhone data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message || 'Failed to prepare iPhone data'
    });
  }
});

/**
 * POST /api/warmup-content-assignment/send-to-iphone/:accountId/:phase
 * Send specific content to iPhone for a warmup phase
 */
router.post('/send-to-iphone/:accountId/:phase', async (req: any, res: any) => {
  try {
    const { accountId, phase } = req.params;
    const { 
      iphone_ip = '192.168.178.65', 
      iphone_port = 46952,
      use_nuclear_cleaner = true  // Nuclear cleaner is the only one that works
    } = req.body;

    console.log(`📱 Sending content to iPhone for account ${accountId}, phase: ${phase}`);

    // Get phase data
    const phaseResult = await db.query(`
      SELECT 
        awp.id,
        awp.phase,
        awp.assigned_content_id,
        awp.assigned_text_id,
        cc.file_path as content_file_path,
        ctc.text_content
      FROM account_warmup_phases awp
      LEFT JOIN central_content cc ON awp.assigned_content_id = cc.id
      LEFT JOIN central_text_content ctc ON awp.assigned_text_id = ctc.id
      WHERE awp.account_id = $1 AND awp.phase = $2
    `, [accountId, phase]);

    if (phaseResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Phase not found for account'
      });
    }

    const phaseData = phaseResult.rows[0];
    const results: any = {
      phase: phase,
      content_sent: false,
      text_sent: false,
      errors: []
    };

    // Import the API modules
    const ClipboardAPI = require('../../../bot/scripts/api/clipboard.js');
    const GalleryAPI = require('../../../bot/scripts/api/gallery.js');
    const SimplePhotoCleaner = require('../../../bot/scripts/api/simple_photo_cleaner.js');
    const iOS16PhotoCleaner = require('../../../bot/scripts/api/ios16_photo_cleaner.js');

    const baseUrl = `http://${iphone_ip}:${iphone_port}`;

    // Send text content to clipboard if exists
    if (phaseData.text_content) {
      try {
        const clipboard = new ClipboardAPI(baseUrl);
        const clipboardResult = await clipboard.setText(phaseData.text_content);
        
        if (clipboardResult.success) {
          results.text_sent = true;
          results.text_data = {
            content: phaseData.text_content,
            length: phaseData.text_content.length
          };
          console.log(`✅ Text sent to iPhone clipboard: "${phaseData.text_content.substring(0, 50)}..."`);
        } else {
          results.errors.push(`Failed to send text to clipboard: ${clipboardResult.error}`);
        }
      } catch (error: any) {
        results.errors.push(`Clipboard API error: ${error.message}`);
      }
    }

    // Send image content to gallery if exists
    if (phaseData.content_file_path) {
      try {
        const fullPath = path.resolve(__dirname, '../../uploads', phaseData.content_file_path);
        
        if (fs.existsSync(fullPath)) {
          // IMPORTANT: Clean iPhone gallery before sending new images
          console.log(`🧹 Cleaning iPhone gallery before sending image...`);
          try {
            // Use nuclear cleaner (only one that works reliably)
            const photoCleaner = use_nuclear_cleaner ? new iOS16PhotoCleaner() : new SimplePhotoCleaner();
            
            if (use_nuclear_cleaner) {
              console.log(`💥 Using nuclear cleaner (will cause iPhone respring)...`);
              await photoCleaner.performiOS16Cleanup();
              
              // Wait for iPhone respring to complete
              console.log(`⏳ Waiting 15 seconds for iPhone respring to complete...`);
              await new Promise(resolve => setTimeout(resolve, 15000));
              
              // Execute wake_up.lua to ensure iPhone is responsive
              console.log(`📱 Executing wake_up.lua to wake up iPhone after respring...`);
              try {
                const AutomationBridge = require('../../../bot/services/AutomationBridge');
                const bridge = new AutomationBridge({
                  iphoneIP: iphone_ip,
                  iphonePort: iphone_port
                });
                
                // Set a shorter timeout to prevent hanging
                const wakeUpResult = await Promise.race([
                  bridge.executeScript('wake_up.lua', {
                    timeout: 15000,
                    retries: 2
                  }),
                  new Promise(resolve => setTimeout(() => resolve(false), 20000)) // 20s max wait
                ]);
                
                if (wakeUpResult) {
                  console.log(`✅ iPhone wake-up completed successfully`);
                  // Additional wait for iPhone to be fully ready
                  console.log(`⏳ Waiting additional 3 seconds for iPhone to be fully ready...`);
                  await new Promise(resolve => setTimeout(resolve, 3000));
                } else {
                  console.warn(`⚠️ iPhone wake-up may have failed or timed out, but continuing...`);
                }
              } catch (wakeUpError) {
                console.warn(`⚠️ Wake-up script failed: ${wakeUpError.message}, but continuing...`);
              }
            } else {
              console.log(`🧹 Using simple cleaner (no respring required)...`);
              await photoCleaner.performSimpleCleanup();
              // Short wait for simple cleanup
              console.log(`⏳ Waiting for Photos app to refresh...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            console.log(`✅ iPhone gallery cleaned successfully`);
            
          } catch (cleanError: any) {
            console.warn(`⚠️  Photo cleaning failed: ${cleanError.message}`);
            if (!use_nuclear_cleaner) {
              console.log(`💡 Tip: Try with nuclear cleaner if simple cleaning fails repeatedly`);
            }
            results.errors.push(`Photo cleaning failed: ${cleanError.message}`);
            // Continue anyway - cleaning failure shouldn't stop the process
          }
          
          // Now send the image
          console.log(`📤 Sending image to cleaned gallery...`);
          const gallery = new GalleryAPI(baseUrl);
          const galleryResult = await gallery.addImage(fullPath);
          
          if (galleryResult.success) {
            results.content_sent = true;
            results.content_data = {
              filename: galleryResult.fileName,
              file_size_kb: galleryResult.fileSizeKB,
              file_path: fullPath
            };
            console.log(`✅ Image sent to iPhone gallery: ${galleryResult.fileName}`);
          } else {
            results.errors.push(`Failed to send image to gallery: ${galleryResult.error}`);
          }
        } else {
          results.errors.push(`Image file not found: ${fullPath}`);
        }
      } catch (error: any) {
        results.errors.push(`Gallery API error: ${error.message}`);
      }
    }

    const success = (results.content_sent || results.text_sent) && results.errors.length === 0;

    res.json({
      success: success,
      message: success ? 
        `Content successfully sent to iPhone for phase ${phase}` : 
        `Failed to send content to iPhone: ${results.errors.join(', ')}`,
      data: results
    });

  } catch (error: any) {
    console.error('Error sending content to iPhone:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message || 'Failed to send content to iPhone'
    });
  }
});

/**
 * POST /api/warmup-content-assignment/transition-to-warmup
 * Transition accounts from ready_for_bot_assignment to warmup state
 */
router.post('/transition-to-warmup', async (req: any, res: any) => {
  try {
    const { account_ids = [] } = req.body;

    console.log('🔄 Transitioning accounts to warmup state...');

    let accountsToProcess = [];

    if (account_ids.length > 0) {
      // Process specific accounts
      const accountsResult = await db.query(`
        SELECT id, username, lifecycle_state 
        FROM accounts 
        WHERE id = ANY($1) AND lifecycle_state = 'ready_for_bot_assignment'
      `, [account_ids]);
      accountsToProcess = accountsResult.rows;
    } else {
      // Process all accounts that are ready and have complete content assignment
      const accountsResult = await db.query(`
        SELECT DISTINCT
          a.id, 
          a.username, 
          a.lifecycle_state
        FROM accounts a
        LEFT JOIN account_warmup_phases awp ON a.id = awp.account_id
        WHERE a.lifecycle_state = 'ready_for_bot_assignment'
          AND a.container_number IS NOT NULL
        GROUP BY a.id, a.username, a.lifecycle_state
        HAVING COUNT(CASE 
          WHEN awp.phase IN ('bio', 'name', 'username') AND awp.assigned_text_id IS NOT NULL THEN 1
          WHEN awp.phase IN ('first_highlight', 'new_highlight', 'post_caption', 'story_caption') 
               AND awp.assigned_content_id IS NOT NULL THEN 1
          WHEN awp.phase IN ('post_no_caption', 'story_no_caption') AND awp.assigned_content_id IS NOT NULL THEN 1
          WHEN awp.phase IN ('manual_setup', 'gender', 'set_to_private') THEN 1
        END) = COUNT(awp.id)
      `);
      accountsToProcess = accountsResult.rows;
    }

    console.log(`📊 Found ${accountsToProcess.length} accounts to transition to warmup`);

    const results = [];
    let successCount = 0;
    let failedCount = 0;

    for (const account of accountsToProcess) {
      try {
        // Update account lifecycle state to warmup
        await db.query(`
          UPDATE accounts 
          SET lifecycle_state = 'warmup',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [account.id]);

        // Mark manual_setup as completed (since user already did it to get to ready_for_bot_assignment)
        // and ensure bio phase is available as the first bot phase
        await db.query(`
          UPDATE account_warmup_phases 
          SET status = CASE 
                WHEN phase = 'manual_setup' THEN 'completed'::warmup_phase_status
                WHEN phase = 'bio' THEN 'available'::warmup_phase_status
                ELSE status
              END,
              completed_at = CASE 
                WHEN phase = 'manual_setup' THEN CURRENT_TIMESTAMP
                ELSE completed_at
              END,
              available_at = CASE 
                WHEN phase = 'bio' THEN CURRENT_TIMESTAMP
                ELSE available_at
              END,
              updated_at = CURRENT_TIMESTAMP
          WHERE account_id = $1 AND phase IN ('manual_setup', 'bio')
        `, [account.id]);

        results.push({
          account_id: account.id,
          username: account.username,
          success: true,
          message: 'Successfully transitioned to warmup state'
        });

        successCount++;
        console.log(`✅ Account ${account.id} (${account.username}): transitioned to warmup`);

      } catch (error: any) {
        console.error(`❌ Failed to transition account ${account.id}:`, error);
        
        results.push({
          account_id: account.id,
          username: account.username,
          success: false,
          error: error.message,
          message: 'Failed to transition to warmup state'
        });

        failedCount++;
      }
    }

    console.log(`🎉 Transition completed: ${successCount} successful, ${failedCount} failed`);

    res.json({
      success: true,
      message: `Account transition completed: ${successCount} successful, ${failedCount} failed`,
      data: {
        total_processed: accountsToProcess.length,
        successful: successCount,
        failed: failedCount,
        results: results
      }
    });

  } catch (error: any) {
    console.error('Account transition error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message || 'Failed to transition accounts to warmup state'
    });
  }
});

export default router;