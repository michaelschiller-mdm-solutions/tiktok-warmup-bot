/**
 * Comprehensive Bulk Content Assignment Script
 * 
 * This script assigns content to ALL warmup phases for accounts ready for bot assignment.
 * It handles all phase types including bio, username, highlights, posts, and stories.
 */

const { db } = require('../database.ts');

async function assignContentToAllPhases(accountId) {
  try {
    console.log(`📝 Assigning content to ALL phases for account ${accountId}...`);
    
    // Get ALL phases that need content assignment (not just missing ones)
    const phasesResult = await db.query(`
      SELECT id, phase, assigned_content_id, assigned_text_id
      FROM account_warmup_phases 
      WHERE account_id = $1 
        AND phase NOT IN ('manual_setup', 'gender', 'set_to_private', 'instagram_set_private')
    `, [accountId]);
    
    const phases = phasesResult.rows;
    console.log(`   Found ${phases.length} phases to process`);
    
    let assignedCount = 0;
    
    for (const phase of phases) {
      let contentId = phase.assigned_content_id;
      let textId = phase.assigned_text_id;
      let needsUpdate = false;
      
      // Assign content based on phase type
      switch (phase.phase) {
        case 'bio':
          if (!textId) {
            const bioResult = await db.query(`
              SELECT id FROM central_text_content 
              WHERE categories @> '["bio"]'::jsonb 
                AND status = 'active'
              ORDER BY RANDOM() 
              LIMIT 1
            `);
            if (bioResult.rows.length > 0) {
              textId = bioResult.rows[0].id;
              needsUpdate = true;
            }
          }
          break;
          
        case 'name':
          if (!textId) {
            const nameResult = await db.query(`
              SELECT id FROM central_text_content 
              WHERE categories @> '["bio"]'::jsonb 
                AND status = 'active'
              ORDER BY RANDOM() 
              LIMIT 1
            `);
            if (nameResult.rows.length > 0) {
              textId = nameResult.rows[0].id;
              needsUpdate = true;
            }
          }
          break;
          
        case 'username':
          if (!textId) {
            const usernameResult = await db.query(`
              SELECT id FROM central_text_content 
              WHERE categories @> '["username"]'::jsonb 
                AND status = 'active'
              ORDER BY RANDOM() 
              LIMIT 1
            `);
            if (usernameResult.rows.length > 0) {
              textId = usernameResult.rows[0].id;
              needsUpdate = true;
            }
          }
          break;
          
        case 'first_highlight':
          // Assign highlight image if missing
          if (!contentId) {
            const highlightContentResult = await db.query(`
              SELECT id FROM central_content 
              WHERE (categories @> '["highlight"]'::jsonb OR categories @> '["post","highlight","story"]'::jsonb)
                AND status = 'active'
              ORDER BY RANDOM() 
              LIMIT 1
            `);
            if (highlightContentResult.rows.length > 0) {
              contentId = highlightContentResult.rows[0].id;
              needsUpdate = true;
            }
          }
          
          // IMPORTANT: First highlight is ALWAYS named "Me"
          if (!textId) {
            // Try to find existing "Me" text content
            let meTextResult = await db.query(`
              SELECT id FROM central_text_content 
              WHERE LOWER(text_content) = 'me' 
                AND categories @> '["highlight"]'::jsonb 
                AND status = 'active'
              LIMIT 1
            `);
            
            // If "Me" doesn't exist, create it
            if (meTextResult.rows.length === 0) {
              const createMeResult = await db.query(`
                INSERT INTO central_text_content (text_content, categories, template_name, status)
                VALUES ('Me', '["highlight", "highlight_group_name"]'::jsonb, 'First Highlight - Me', 'active')
                RETURNING id
              `);
              textId = createMeResult.rows[0].id;
            } else {
              textId = meTextResult.rows[0].id;
            }
            needsUpdate = true;
          }
          break;
          
        case 'new_highlight':
          // Assign highlight image if missing
          if (!contentId) {
            const highlightContentResult = await db.query(`
              SELECT id FROM central_content 
              WHERE (categories @> '["highlight"]'::jsonb OR categories @> '["post","highlight","story"]'::jsonb)
                AND status = 'active'
              ORDER BY RANDOM() 
              LIMIT 1
            `);
            if (highlightContentResult.rows.length > 0) {
              contentId = highlightContentResult.rows[0].id;
              needsUpdate = true;
            }
          }
          
          // Assign random highlight text (NOT "Me" - that's reserved for first_highlight)
          if (!textId) {
            const highlightTextResult = await db.query(`
              SELECT id FROM central_text_content 
              WHERE categories @> '["highlight"]'::jsonb 
                AND status = 'active'
                AND LOWER(text_content) != 'me'  -- Exclude "Me" for new highlights
              ORDER BY RANDOM() 
              LIMIT 1
            `);
            if (highlightTextResult.rows.length > 0) {
              textId = highlightTextResult.rows[0].id;
              needsUpdate = true;
            }
          }
          break;
          
        case 'post_caption':
          // Assign post image if missing
          if (!contentId) {
            const postContentResult = await db.query(`
              SELECT id FROM central_content 
              WHERE (categories @> '["post"]'::jsonb OR categories @> '["post","highlight","story"]'::jsonb)
                AND status = 'active'
              ORDER BY RANDOM() 
              LIMIT 1
            `);
            if (postContentResult.rows.length > 0) {
              contentId = postContentResult.rows[0].id;
              needsUpdate = true;
            }
          }
          
          // Assign post text if missing (optional for captions)
          if (!textId) {
            const postTextResult = await db.query(`
              SELECT id FROM central_text_content 
              WHERE categories @> '["bio"]'::jsonb 
                AND status = 'active'
              ORDER BY RANDOM() 
              LIMIT 1
            `);
            if (postTextResult.rows.length > 0) {
              textId = postTextResult.rows[0].id;
              needsUpdate = true;
            }
          }
          break;
          
        case 'post_no_caption':
          // Assign only post image
          if (!contentId) {
            const postContentResult = await db.query(`
              SELECT id FROM central_content 
              WHERE (categories @> '["post"]'::jsonb OR categories @> '["post","highlight","story"]'::jsonb)
                AND status = 'active'
              ORDER BY RANDOM() 
              LIMIT 1
            `);
            if (postContentResult.rows.length > 0) {
              contentId = postContentResult.rows[0].id;
              needsUpdate = true;
            }
          }
          break;
          
        case 'story_caption':
          // Assign story image if missing
          if (!contentId) {
            const storyContentResult = await db.query(`
              SELECT id FROM central_content 
              WHERE (categories @> '["story"]'::jsonb OR categories @> '["post","highlight","story"]'::jsonb)
                AND status = 'active'
              ORDER BY RANDOM() 
              LIMIT 1
            `);
            if (storyContentResult.rows.length > 0) {
              contentId = storyContentResult.rows[0].id;
              needsUpdate = true;
            }
          }
          
          // Assign story text if missing (optional for captions)
          if (!textId) {
            const storyTextResult = await db.query(`
              SELECT id FROM central_text_content 
              WHERE categories @> '["bio"]'::jsonb 
                AND status = 'active'
              ORDER BY RANDOM() 
              LIMIT 1
            `);
            if (storyTextResult.rows.length > 0) {
              textId = storyTextResult.rows[0].id;
              needsUpdate = true;
            }
          }
          break;
          
        case 'story_no_caption':
          // Assign only story image
          if (!contentId) {
            const storyContentResult = await db.query(`
              SELECT id FROM central_content 
              WHERE (categories @> '["story"]'::jsonb OR categories @> '["post","highlight","story"]'::jsonb)
                AND status = 'active'
              ORDER BY RANDOM() 
              LIMIT 1
            `);
            if (storyContentResult.rows.length > 0) {
              contentId = storyContentResult.rows[0].id;
              needsUpdate = true;
            }
          }
          break;
          
        default:
          console.log(`   ⚠️  Unknown phase: ${phase.phase}`);
          continue;
      }
      
      // Update the phase with assigned content if needed
      if (needsUpdate) {
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
        console.log(`   ℹ️  ${phase.phase}: already has content (content=${contentId}, text=${textId})`);
      }
    }
    
    return assignedCount;
    
  } catch (error) {
    console.error(`❌ Error assigning content to account ${accountId}:`, error.message);
    throw error;
  }
}

async function bulkAssignAllContent() {
  try {
    console.log('🚀 Starting comprehensive bulk content assignment...');
    
    // Get ALL accounts that are ready for warmup
    const accountsResult = await db.query(`
      SELECT 
        a.id, 
        a.username, 
        a.lifecycle_state, 
        a.container_number,
        COUNT(awp.id) as total_phases,
        COUNT(CASE WHEN awp.assigned_content_id IS NOT NULL OR awp.assigned_text_id IS NOT NULL THEN 1 END) as assigned_phases
      FROM accounts a
      LEFT JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE a.lifecycle_state IN ('ready', 'ready_for_bot_assignment')
        AND a.container_number IS NOT NULL
      GROUP BY a.id, a.username, a.lifecycle_state, a.container_number
      ORDER BY a.created_at DESC
    `);
    
    const accounts = accountsResult.rows;
    console.log(`📊 Found ${accounts.length} accounts to process`);
    
    let successCount = 0;
    let failedCount = 0;
    let totalAssigned = 0;
    
    for (const account of accounts) {
      try {
        console.log(`\n📝 Processing account ${account.id} (${account.username})...`);
        console.log(`   Current: ${account.assigned_phases}/${account.total_phases} phases have content`);
        
        const assignedCount = await assignContentToAllPhases(account.id);
        totalAssigned += assignedCount;
        
        console.log(`✅ Account ${account.id}: ${assignedCount} new assignments made`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to assign content to account ${account.id}:`, error.message);
        failedCount++;
      }
    }
    
    console.log(`\n🎉 Comprehensive bulk assignment completed!`);
    console.log(`   ✅ Successful accounts: ${successCount}`);
    console.log(`   ❌ Failed accounts: ${failedCount}`);
    console.log(`   📊 Total accounts processed: ${accounts.length}`);
    console.log(`   🎯 Total new assignments made: ${totalAssigned}`);
    
    // Show final status
    console.log(`\n📈 Final Status Check:`);
    const finalStatusResult = await db.query(`
      SELECT 
        a.lifecycle_state,
        COUNT(a.id) as total_accounts,
        AVG(CASE 
          WHEN awp_summary.total_phases > 0 THEN 
            (awp_summary.assigned_phases::decimal / awp_summary.total_phases) * 100
          ELSE 100 
        END) as avg_completion_percent
      FROM accounts a
      LEFT JOIN (
        SELECT 
          account_id,
          COUNT(*) as total_phases,
          COUNT(CASE WHEN assigned_content_id IS NOT NULL OR assigned_text_id IS NOT NULL THEN 1 END) as assigned_phases
        FROM account_warmup_phases 
        WHERE phase NOT IN ('manual_setup', 'gender', 'set_to_private', 'instagram_set_private')
        GROUP BY account_id
      ) awp_summary ON a.id = awp_summary.account_id
      WHERE a.lifecycle_state IN ('ready', 'ready_for_bot_assignment')
      GROUP BY a.lifecycle_state
    `);
    
    finalStatusResult.rows.forEach(row => {
      console.log(`   ${row.lifecycle_state}: ${row.total_accounts} accounts, ${Math.round(row.avg_completion_percent)}% avg completion`);
    });
    
  } catch (error) {
    console.error('💥 Bulk assignment failed:', error.message);
  } finally {
    await db.end();
  }
}

// Run the script
if (require.main === module) {
  bulkAssignAllContent().catch(console.error);
}

module.exports = { assignContentToAllPhases, bulkAssignAllContent };