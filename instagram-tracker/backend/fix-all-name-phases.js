/**
 * Fix all existing name phase assignments to use model names
 */

const { db } = require('./dist/database');

async function fixAllNamePhases() {
  try {
    console.log('🔧 Fixing all name phase assignments to use model names...\n');
    
    // Get all accounts with name phases that don't use model names
    const namePhases = await db.query(`
      SELECT 
        a.id as account_id,
        a.username,
        a.model_id,
        m.name as model_name,
        awp.id as phase_id,
        awp.assigned_text_id,
        ctc.text_content as current_text
      FROM accounts a
      JOIN models m ON a.model_id = m.id
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      LEFT JOIN central_text_content ctc ON awp.assigned_text_id = ctc.id
      WHERE awp.phase = 'name'
      AND a.lifecycle_state = 'warmup'
      ORDER BY a.username
    `);
    
    console.log(`📋 Found ${namePhases.rowCount} name phases to check`);
    
    let fixedCount = 0;
    let alreadyCorrectCount = 0;
    let errorCount = 0;
    
    for (const phase of namePhases.rows) {
      try {
        console.log(`\n👤 ${phase.username} (Model: ${phase.model_name})`);
        console.log(`   Current text: "${phase.current_text}"`);
        
        if (phase.current_text === phase.model_name) {
          console.log(`   ✅ Already using model name`);
          alreadyCorrectCount++;
          continue;
        }
        
        // Create/find text content with model name
        let textResult = await db.query(`
          SELECT id FROM central_text_content 
          WHERE text_content = $1 AND categories @> '["name"]'::jsonb
          LIMIT 1
        `, [phase.model_name]);
        
        if (textResult.rows.length === 0) {
          // Create new text content entry
          textResult = await db.query(`
            INSERT INTO central_text_content (
              text_content, 
              categories, 
              template_name, 
              status
            ) VALUES ($1, $2, $3, $4)
            RETURNING id
          `, [
            phase.model_name,
            JSON.stringify(["name", "model_derived"]),
            `Model Name: ${phase.model_name}`,
            "active"
          ]);
          console.log(`   📝 Created new text content for "${phase.model_name}"`);
        } else {
          console.log(`   📝 Found existing text content for "${phase.model_name}"`);
        }
        
        const newTextId = textResult.rows[0].id;
        
        // Update the phase assignment
        const updateResult = await db.query(`
          UPDATE account_warmup_phases 
          SET assigned_text_id = $1, updated_at = NOW()
          WHERE id = $2
          RETURNING id
        `, [newTextId, phase.phase_id]);
        
        if (updateResult.rowCount === 1) {
          console.log(`   ✅ Fixed: "${phase.current_text}" → "${phase.model_name}"`);
          fixedCount++;
        } else {
          console.log(`   ❌ Failed to update phase assignment`);
          errorCount++;
        }
        
      } catch (error) {
        console.error(`   ❌ Error fixing ${phase.username}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   ✅ Fixed: ${fixedCount} phases`);
    console.log(`   ✅ Already correct: ${alreadyCorrectCount} phases`);
    console.log(`   ❌ Errors: ${errorCount} phases`);
    console.log(`   📋 Total processed: ${namePhases.rowCount} phases`);
    
    if (fixedCount > 0) {
      console.log(`\n🎉 Successfully fixed ${fixedCount} name phases!`);
      console.log(`   All name phases now use their respective model names`);
      console.log(`   Next automation runs will send correct model names to iPhone clipboard`);
    }
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
  } finally {
    await db.end();
  }
}

fixAllNamePhases();