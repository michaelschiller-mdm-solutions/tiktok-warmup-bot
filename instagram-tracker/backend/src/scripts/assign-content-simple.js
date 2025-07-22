/**
 * Simple Content Assignment Script
 * 
 * Assigns content to warmup phases using JavaScript instead of SQL functions
 */

const { db } = require('../database.ts');

async function assignContentToAccount(accountId) {
  try {
    console.log(`📝 Assigning content to account ${accountId}...`);
    
    // Get account model info
    const accountResult = await db.query(`
      SELECT a.id, a.model_id, m.name as model_name
      FROM accounts a
      LEFT JOIN models m ON a.model_id = m.id
      WHERE a.id = $1
    `, [accountId]);
    
    if (accountResult.rows.length === 0) {
      console.log(`   ❌ Account ${accountId} not found`);
      return 0;
    }
    
    const account = accountResult.rows[0];
    console.log(`   Account belongs to model ${account.model_id} (${account.model_name})`);
    
    // Check what content is available for this model via bundles
    const modelBundlesResult = await db.query(`
      SELECT cb.name as bundle_name, 
             COUNT(DISTINCT bca.content_id) as content_count, 
             COUNT(DISTINCT bca.text_content_id) as text_count
      FROM model_bundle_assignments mba
      JOIN content_bundles cb ON mba.bundle_id = cb.id
      LEFT JOIN bundle_content_assignments bca ON cb.id = bca.bundle_id
      WHERE mba.model_id = $1
      GROUP BY cb.id, cb.name
    `, [account.model_id]);
    
    // Check direct model content (legacy)
    const modelContentResult = await db.query(`
      SELECT categories, COUNT(*) as count
      FROM model_content 
      WHERE model_id = $1 AND status = 'active'
      GROUP BY categories
    `, [account.model_id]);
    
    const modelTextResult = await db.query(`
      SELECT categories, COUNT(*) as count
      FROM model_text_content 
      WHERE model_id = $1 AND status = 'active'
      GROUP BY categories
    `, [account.model_id]);
    
    console.log(`   Model bundles available:`, modelBundlesResult.rows.map(r => `${r.bundle_name}(content:${r.content_count}, text:${r.text_count})`).join(', ') || 'none');
    console.log(`   Model direct content:`, modelContentResult.rows.map(r => `${JSON.stringify(r.categories)}(${r.count})`).join(', ') || 'none');
    console.log(`   Model direct text:`, modelTextResult.rows.map(r => `${JSON.stringify(r.categories)}(${r.count})`).join(', ') || 'none');
    
    // Get phases that need content assignment
    const phasesResult = await db.query(`
      SELECT id, phase 
      FROM account_warmup_phases 
      WHERE account_id = $1 
        AND assigned_content_id IS NULL 
        AND assigned_text_id IS NULL
        AND phase NOT IN ('manual_setup', 'gender')
    `, [accountId]);
    
    const phases = phasesResult.rows;
    console.log(`   Found ${phases.length} phases needing content`);
    
    if (phases.length === 0) {
      console.log(`   ℹ️  No phases need content assignment for account ${accountId}`);
      return 0;
    }
    
    console.log(`   Phases to process: ${phases.map(p => p.phase).join(', ')}`);
    
    let assignedCount = 0;
    
    for (const phase of phases) {
      let contentId = null;
      let textId = null;
      
      // Assign content based on phase type
      switch (phase.phase) {
        case 'pfp':
        case 'profile_picture':
          // Assign profile picture from model's bundle assignments - specifically the "Profilbilder" bundle
          let pfpResult = await db.query(`
            SELECT cc.id 
            FROM model_bundle_assignments mba
            JOIN content_bundles cb ON mba.bundle_id = cb.id
            JOIN bundle_content_assignments bca ON cb.id = bca.bundle_id
            JOIN central_content cc ON bca.content_id = cc.id
            WHERE mba.model_id = $1
              AND (cb.name = 'Profilbilder' OR cc.categories @> '["pfp"]'::jsonb)
              AND cc.status = 'active'
            ORDER BY RANDOM() 
            LIMIT 1
          `, [account.model_id]);
          
          // Fallback to central content if model doesn't have pfp content
          if (pfpResult.rows.length === 0) {
            console.log(`   ℹ️  No model-specific pfp content, using central content`);
            pfpResult = await db.query(`
              SELECT id FROM central_content 
              WHERE categories @> '["pfp"]'::jsonb 
                AND status = 'active'
              ORDER BY RANDOM() 
              LIMIT 1
            `);
          }
          
          if (pfpResult.rows.length > 0) {
            contentId = pfpResult.rows[0].id;
          }
          break;
          
        case 'bio':
          // Assign bio text content from model's bundle assignments
          let bioResult = await db.query(`
            SELECT ctc.id 
            FROM model_bundle_assignments mba
            JOIN content_bundles cb ON mba.bundle_id = cb.id
            JOIN bundle_content_assignments bca ON cb.id = bca.bundle_id
            JOIN central_text_content ctc ON bca.text_content_id = ctc.id
            WHERE mba.model_id = $1
              AND (cb.categories @> '["bio"]'::jsonb OR ctc.categories @> '["bio"]'::jsonb)
              AND ctc.status = 'active'
            ORDER BY RANDOM() 
            LIMIT 1
          `, [account.model_id]);
          
          // Fallback to central content if model doesn't have bio content
          if (bioResult.rows.length === 0) {
            console.log(`   ℹ️  No model-specific bio content, using central content`);
            bioResult = await db.query(`
              SELECT id FROM central_text_content 
              WHERE categories @> '["bio"]'::jsonb 
                AND status = 'active'
              ORDER BY RANDOM() 
              LIMIT 1
            `);
          }
          
          if (bioResult.rows.length > 0) {
            textId = bioResult.rows[0].id;
          } else {
            console.log(`   ⚠️  No bio text content available for model ${account.model_id}`);
          }
          break;
          
        case 'name':
          // Assign name text content from model's bundle assignments
          // For name, we can use bio content if no specific name content exists
          let nameResult = await db.query(`
            SELECT ctc.id 
            FROM model_bundle_assignments mba
            JOIN content_bundles cb ON mba.bundle_id = cb.id
            JOIN bundle_content_assignments bca ON cb.id = bca.bundle_id
            JOIN central_text_content ctc ON bca.text_content_id = ctc.id
            WHERE mba.model_id = $1
              AND (ctc.categories @> '["name"]'::jsonb OR ctc.categories @> '["bio"]'::jsonb)
              AND ctc.status = 'active'
            ORDER BY RANDOM() 
            LIMIT 1
          `, [account.model_id]);
          
          // Fallback to central content if model doesn't have name content
          if (nameResult.rows.length === 0) {
            console.log(`   ℹ️  No model-specific name content, using central content`);
            nameResult = await db.query(`
              SELECT id FROM central_text_content 
              WHERE (categories @> '["name"]'::jsonb OR categories @> '["bio"]'::jsonb)
                AND status = 'active'
              ORDER BY RANDOM() 
              LIMIT 1
            `);
          }
          
          if (nameResult.rows.length > 0) {
            textId = nameResult.rows[0].id;
          } else {
            console.log(`   ⚠️  No name text content available for model ${account.model_id}`);
          }
          break;
          
        case 'username':
          // Assign username text content from model's bundle assignments
          let usernameResult = await db.query(`
            SELECT ctc.id 
            FROM model_bundle_assignments mba
            JOIN content_bundles cb ON mba.bundle_id = cb.id
            JOIN bundle_content_assignments bca ON cb.id = bca.bundle_id
            JOIN central_text_content ctc ON bca.text_content_id = ctc.id
            WHERE mba.model_id = $1
              AND (cb.name = 'usernames' OR ctc.categories @> '["username"]'::jsonb)
              AND ctc.status = 'active'
            ORDER BY RANDOM() 
            LIMIT 1
          `, [account.model_id]);
          
          // Fallback to central content if model doesn't have username content
          if (usernameResult.rows.length === 0) {
            console.log(`   ℹ️  No model-specific username content, using central content`);
            usernameResult = await db.query(`
              SELECT id FROM central_text_content 
              WHERE categories @> '["username"]'::jsonb 
                AND status = 'active'
              ORDER BY RANDOM() 
              LIMIT 1
            `);
          }
          
          if (usernameResult.rows.length > 0) {
            textId = usernameResult.rows[0].id;
          } else {
            console.log(`   ⚠️  No username text content available for model ${account.model_id}`);
          }
          break;
          
        case 'first_highlight':
          // Assign highlight image from model's bundle assignments - specifically the "Me" bundle
          let firstHighlightContentResult = await db.query(`
            SELECT cc.id 
            FROM model_bundle_assignments mba
            JOIN content_bundles cb ON mba.bundle_id = cb.id
            JOIN bundle_content_assignments bca ON cb.id = bca.bundle_id
            JOIN central_content cc ON bca.content_id = cc.id
            WHERE mba.model_id = $1
              AND cb.name = 'Me'
              AND cc.status = 'active'
            ORDER BY RANDOM() 
            LIMIT 1
          `, [account.model_id]);
          
          // Fallback to any highlight content from model bundles
          if (firstHighlightContentResult.rows.length === 0) {
            console.log(`   ℹ️  No model-specific "Me" bundle content, trying other highlight content`);
            firstHighlightContentResult = await db.query(`
              SELECT cc.id 
              FROM model_bundle_assignments mba
              JOIN content_bundles cb ON mba.bundle_id = cb.id
              JOIN bundle_content_assignments bca ON cb.id = bca.bundle_id
              JOIN central_content cc ON bca.content_id = cc.id
              WHERE mba.model_id = $1
                AND (cc.categories @> '["highlight"]'::jsonb OR cc.categories @> '["post","highlight","story"]'::jsonb)
                AND cc.status = 'active'
              ORDER BY RANDOM() 
              LIMIT 1
            `, [account.model_id]);
          }
          
          // Final fallback to central content
          if (firstHighlightContentResult.rows.length === 0) {
            console.log(`   ℹ️  No model-specific highlight content, using central content`);
            firstHighlightContentResult = await db.query(`
              SELECT id FROM central_content 
              WHERE (categories @> '["highlight"]'::jsonb OR categories @> '["post","highlight","story"]'::jsonb)
                AND status = 'active'
              ORDER BY RANDOM() 
              LIMIT 1
            `);
          }
          
          if (firstHighlightContentResult.rows.length > 0) {
            contentId = firstHighlightContentResult.rows[0].id;
          }
          
          // IMPORTANT: First highlight is ALWAYS named "Me"
          // Try model-specific "Me" text from the "Me" bundle
          let meTextResult = await db.query(`
            SELECT ctc.id 
            FROM model_bundle_assignments mba
            JOIN content_bundles cb ON mba.bundle_id = cb.id
            JOIN bundle_content_assignments bca ON cb.id = bca.bundle_id
            JOIN central_text_content ctc ON bca.text_content_id = ctc.id
            WHERE mba.model_id = $1
              AND cb.name = 'Me'
              AND LOWER(ctc.text_content) = 'me'
              AND ctc.status = 'active'
            LIMIT 1
          `, [account.model_id]);
          
          // Fallback to central "Me" text
          if (meTextResult.rows.length === 0) {
            console.log(`   ℹ️  No model-specific "Me" text, using central content`);
            meTextResult = await db.query(`
              SELECT id FROM central_text_content 
              WHERE LOWER(text_content) = 'me' 
                AND categories @> '["highlight"]'::jsonb 
                AND status = 'active'
              LIMIT 1
            `);
          }
          
          // If "Me" doesn't exist anywhere, create it in central
          if (meTextResult.rows.length === 0) {
            console.log(`   ℹ️  Creating new "Me" text content`);
            const createMeResult = await db.query(`
              INSERT INTO central_text_content (text_content, categories, template_name, status)
              VALUES ('Me', '["highlight", "highlight_group_name"]'::jsonb, 'First Highlight - Me', 'active')
              RETURNING id
            `);
            textId = createMeResult.rows[0].id;
          } else {
            textId = meTextResult.rows[0].id;
          }
          break;
          
        case 'new_highlight':
          // Assign highlight image from model's bundle assignments - but NOT from the "Me" bundle
          let newHighlightContentResult = await db.query(`
            SELECT cc.id 
            FROM model_bundle_assignments mba
            JOIN content_bundles cb ON mba.bundle_id = cb.id
            JOIN bundle_content_assignments bca ON cb.id = bca.bundle_id
            JOIN central_content cc ON bca.content_id = cc.id
            WHERE mba.model_id = $1
              AND cb.name != 'Me'  -- Exclude "Me" bundle
              AND (cc.categories @> '["highlight"]'::jsonb OR cc.categories @> '["post","highlight","story"]'::jsonb)
              AND cc.status = 'active'
            ORDER BY RANDOM() 
            LIMIT 1
          `, [account.model_id]);
          
          // If no non-Me highlight content, try any highlight content
          if (newHighlightContentResult.rows.length === 0) {
            console.log(`   ℹ️  No model-specific non-Me highlight content, trying any highlight content`);
            newHighlightContentResult = await db.query(`
              SELECT cc.id 
              FROM model_bundle_assignments mba
              JOIN content_bundles cb ON mba.bundle_id = cb.id
              JOIN bundle_content_assignments bca ON cb.id = bca.bundle_id
              JOIN central_content cc ON bca.content_id = cc.id
              WHERE mba.model_id = $1
                AND (cc.categories @> '["highlight"]'::jsonb OR cc.categories @> '["post","highlight","story"]'::jsonb)
                AND cc.status = 'active'
              ORDER BY RANDOM() 
              LIMIT 1
            `, [account.model_id]);
          }
          
          // Final fallback to central content
          if (newHighlightContentResult.rows.length === 0) {
            console.log(`   ℹ️  No model-specific highlight content, using central content`);
            newHighlightContentResult = await db.query(`
              SELECT id FROM central_content 
              WHERE (categories @> '["highlight"]'::jsonb OR categories @> '["post","highlight","story"]'::jsonb)
                AND status = 'active'
              ORDER BY RANDOM() 
              LIMIT 1
            `);
          }
          
          if (newHighlightContentResult.rows.length > 0) {
            contentId = newHighlightContentResult.rows[0].id;
          }
          
          // Assign random highlight text (NOT "Me" - that's reserved for first_highlight)
          // Try model-specific text from bundles
          let newHighlightTextResult = await db.query(`
            SELECT ctc.id 
            FROM model_bundle_assignments mba
            JOIN content_bundles cb ON mba.bundle_id = cb.id
            JOIN bundle_content_assignments bca ON cb.id = bca.bundle_id
            JOIN central_text_content ctc ON bca.text_content_id = ctc.id
            WHERE mba.model_id = $1
              AND cb.name != 'Me'  -- Exclude "Me" bundle
              AND ctc.categories @> '["highlight"]'::jsonb 
              AND ctc.status = 'active'
              AND LOWER(ctc.text_content) != 'me'  -- Exclude "Me" for new highlights
            ORDER BY RANDOM() 
            LIMIT 1
          `, [account.model_id]);
          
          // Fallback to central content
          if (newHighlightTextResult.rows.length === 0) {
            console.log(`   ℹ️  No model-specific highlight text, using central content`);
            newHighlightTextResult = await db.query(`
              SELECT id FROM central_text_content 
              WHERE categories @> '["highlight"]'::jsonb 
                AND status = 'active'
                AND LOWER(text_content) != 'me'  -- Exclude "Me" for new highlights
              ORDER BY RANDOM() 
              LIMIT 1
            `);
          }
          
          if (newHighlightTextResult.rows.length > 0) {
            textId = newHighlightTextResult.rows[0].id;
          }
          break;
          
        case 'post_caption':
        case 'post_no_caption':
          // Assign post image from model's bundle assignments
          let postContentResult = await db.query(`
            SELECT cc.id 
            FROM model_bundle_assignments mba
            JOIN content_bundles cb ON mba.bundle_id = cb.id
            JOIN bundle_content_assignments bca ON cb.id = bca.bundle_id
            JOIN central_content cc ON bca.content_id = cc.id
            WHERE mba.model_id = $1
              AND (cc.categories @> '["post"]'::jsonb OR cc.categories @> '["post","highlight","story"]'::jsonb)
              AND cc.status = 'active'
            ORDER BY RANDOM() 
            LIMIT 1
          `, [account.model_id]);
          
          // Fallback to central content if model doesn't have post content
          if (postContentResult.rows.length === 0) {
            console.log(`   ℹ️  No model-specific post content, using central content`);
            postContentResult = await db.query(`
              SELECT id FROM central_content 
              WHERE (categories @> '["post"]'::jsonb OR categories @> '["post","highlight","story"]'::jsonb)
                AND status = 'active'
              ORDER BY RANDOM() 
              LIMIT 1
            `);
          }
          
          if (postContentResult.rows.length > 0) {
            contentId = postContentResult.rows[0].id;
          }
          
          // For post_caption, also try to assign text content
          if (phase.phase === 'post_caption') {
            // Try model-specific text from bundles
            let postTextResult = await db.query(`
              SELECT ctc.id 
              FROM model_bundle_assignments mba
              JOIN content_bundles cb ON mba.bundle_id = cb.id
              JOIN bundle_content_assignments bca ON cb.id = bca.bundle_id
              JOIN central_text_content ctc ON bca.text_content_id = ctc.id
              WHERE mba.model_id = $1
                AND ctc.categories @> '["post"]'::jsonb 
                AND ctc.status = 'active'
              ORDER BY RANDOM() 
              LIMIT 1
            `, [account.model_id]);
            
            // Fallback to central content
            if (postTextResult.rows.length === 0) {
              console.log(`   ℹ️  No model-specific post text, using central content`);
              postTextResult = await db.query(`
                SELECT id FROM central_text_content 
                WHERE categories @> '["post"]'::jsonb 
                  AND status = 'active'
                ORDER BY RANDOM() 
                LIMIT 1
              `);
            }
            
            if (postTextResult.rows.length > 0) {
              textId = postTextResult.rows[0].id;
            }
          }
          break;
          
        case 'story_caption':
        case 'story_no_caption':
          // Assign story image from model's bundle assignments
          let storyContentResult = await db.query(`
            SELECT cc.id 
            FROM model_bundle_assignments mba
            JOIN content_bundles cb ON mba.bundle_id = cb.id
            JOIN bundle_content_assignments bca ON cb.id = bca.bundle_id
            JOIN central_content cc ON bca.content_id = cc.id
            WHERE mba.model_id = $1
              AND (cc.categories @> '["story"]'::jsonb OR cc.categories @> '["post","highlight","story"]'::jsonb)
              AND cc.status = 'active'
            ORDER BY RANDOM() 
            LIMIT 1
          `, [account.model_id]);
          
          // Fallback to central content if model doesn't have story content
          if (storyContentResult.rows.length === 0) {
            console.log(`   ℹ️  No model-specific story content, using central content`);
            storyContentResult = await db.query(`
              SELECT id FROM central_content 
              WHERE (categories @> '["story"]'::jsonb OR categories @> '["post","highlight","story"]'::jsonb)
                AND status = 'active'
              ORDER BY RANDOM() 
              LIMIT 1
            `);
          }
          
          if (storyContentResult.rows.length > 0) {
            contentId = storyContentResult.rows[0].id;
          }
          
          // For story_caption, also try to assign text content
          if (phase.phase === 'story_caption') {
            // Try model-specific text from bundles
            let storyTextResult = await db.query(`
              SELECT ctc.id 
              FROM model_bundle_assignments mba
              JOIN content_bundles cb ON mba.bundle_id = cb.id
              JOIN bundle_content_assignments bca ON cb.id = bca.bundle_id
              JOIN central_text_content ctc ON bca.text_content_id = ctc.id
              WHERE mba.model_id = $1
                AND ctc.categories @> '["story"]'::jsonb 
                AND ctc.status = 'active'
              ORDER BY RANDOM() 
              LIMIT 1
            `, [account.model_id]);
            
            // Fallback to central content
            if (storyTextResult.rows.length === 0) {
              console.log(`   ℹ️  No model-specific story text, using central content`);
              storyTextResult = await db.query(`
                SELECT id FROM central_text_content 
                WHERE categories @> '["story"]'::jsonb 
                  AND status = 'active'
                ORDER BY RANDOM() 
                LIMIT 1
              `);
            }
            
            if (storyTextResult.rows.length > 0) {
              textId = storyTextResult.rows[0].id;
            }
          }
          break;
          
        default:
          console.log(`   Skipping phase ${phase.phase} (no content needed)`);
          continue;
      }
      
      // Update the phase with assigned content (if any was found)
      if (contentId || textId) {
        await db.query(`
          UPDATE account_warmup_phases 
          SET assigned_content_id = $2,
              assigned_text_id = $3,
              content_assigned_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [phase.id, contentId, textId]);
        
        assignedCount++;
        console.log(`   ✅ ${phase.phase}: content=${contentId}, text=${textId}`);
      } else {
        console.log(`   ⚠️  ${phase.phase}: no content found`);
      }
    }
    
    return assignedCount;
    
  } catch (error) {
    console.error(`❌ Error assigning content to account ${accountId}:`, error.message);
    throw error;
  }
}

async function bulkAssignContent() {
  try {
    console.log('🚀 Starting bulk content assignment...');
    
    // Get accounts that need content assignment
    const accountsResult = await db.query(`
      SELECT 
        a.id, 
        a.username, 
        a.lifecycle_state, 
        a.container_number
      FROM accounts a
      WHERE a.lifecycle_state IN ('ready', 'ready_for_bot_assignment')
        AND a.container_number IS NOT NULL
      ORDER BY a.created_at DESC
    `);
    
    const accounts = accountsResult.rows;
    console.log(`📊 Found ${accounts.length} accounts to process`);
    
    let successCount = 0;
    let failedCount = 0;
    
    for (const account of accounts) {
      try {
        const assignedCount = await assignContentToAccount(account.id);
        console.log(`✅ Account ${account.id} (${account.username}): ${assignedCount} phases assigned`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to assign content to account ${account.id}:`, error.message);
        failedCount++;
      }
    }
    
    console.log(`\n🎉 Bulk assignment completed!`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failedCount}`);
    console.log(`   📊 Total processed: ${accounts.length}`);
    
  } catch (error) {
    console.error('💥 Bulk assignment failed:', error.message);
  } finally {
    await db.end();
  }
}

// Run the script
if (require.main === module) {
  bulkAssignContent().catch(console.error);
}

module.exports = { assignContentToAccount, bulkAssignContent };