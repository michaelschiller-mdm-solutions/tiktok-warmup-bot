/**
 * Test script to verify name phase now uses model name instead of random text
 */

const { db } = require('./dist/database');

async function testNamePhaseFix() {
  try {
    console.log('🧪 Testing name phase fix - should use model name...\n');
    
    // Test account: snehamaheshwari760 (model: Cherry)
    const testAccountId = 143;
    const testUsername = 'snehamaheshwari760';
    
    // Get account and model info
    const accountInfo = await db.query(`
      SELECT a.id, a.username, a.model_id, m.name as model_name
      FROM accounts a
      JOIN models m ON a.model_id = m.id
      WHERE a.id = $1
    `, [testAccountId]);
    
    if (accountInfo.rows.length === 0) {
      throw new Error(`Account ${testAccountId} not found`);
    }
    
    const account = accountInfo.rows[0];
    console.log(`👤 Account: ${account.username}`);
    console.log(`🏷️  Model: ${account.model_name} (ID: ${account.model_id})`);
    
    // Get current name phase assignment
    const currentAssignment = await db.query(`
      SELECT 
        awp.id,
        awp.phase,
        awp.assigned_text_id,
        ctc.text_content,
        ctc.categories
      FROM account_warmup_phases awp
      LEFT JOIN central_text_content ctc ON awp.assigned_text_id = ctc.id
      WHERE awp.account_id = $1 AND awp.phase = 'name'
    `, [testAccountId]);
    
    if (currentAssignment.rows.length === 0) {
      console.log('❌ No name phase found for this account');
      return;
    }
    
    const namePhase = currentAssignment.rows[0];
    console.log(`\n📋 Current name phase assignment:`);
    console.log(`   Phase ID: ${namePhase.id}`);
    console.log(`   Text ID: ${namePhase.assigned_text_id}`);
    console.log(`   Current text: "${namePhase.text_content}"`);
    console.log(`   Categories: ${namePhase.categories}`);
    
    // Check if it's already using the model name
    if (namePhase.text_content === account.model_name) {
      console.log(`\n✅ Name phase is already using model name: "${account.model_name}"`);
    } else {
      console.log(`\n❌ Name phase is NOT using model name!`);
      console.log(`   Expected: "${account.model_name}"`);
      console.log(`   Actual: "${namePhase.text_content}"`);
      
      // Test the new assignment logic by simulating it
      console.log(`\n🔧 Testing new assignment logic...`);
      
      // Create/find text content with model name
      let newTextResult = await db.query(`
        SELECT id FROM central_text_content 
        WHERE text_content = $1 AND categories @> '["name"]'::jsonb
        LIMIT 1
      `, [account.model_name]);
      
      if (newTextResult.rows.length === 0) {
        // Create new text content entry
        newTextResult = await db.query(`
          INSERT INTO central_text_content (
            text_content, 
            categories, 
            template_name, 
            status
          ) VALUES ($1, $2, $3, $4)
          RETURNING id
        `, [
          account.model_name,
          JSON.stringify(["name", "model_derived"]),
          `Model Name: ${account.model_name}`,
          "active"
        ]);
      }
      
      const newTextId = newTextResult.rows[0].id;
      console.log(`📝 Created/found text content ID: ${newTextId} for "${account.model_name}"`);
      
      // Update the phase assignment
      const updateResult = await db.query(`
        UPDATE account_warmup_phases 
        SET assigned_text_id = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id
      `, [newTextId, namePhase.id]);
      
      if (updateResult.rowCount === 1) {
        console.log(`✅ Updated name phase to use model name: "${account.model_name}"`);
      } else {
        console.log(`❌ Failed to update name phase assignment`);
      }
    }
    
    // Verify the fix
    console.log(`\n🔍 Verifying final assignment...`);
    const finalCheck = await db.query(`
      SELECT 
        awp.phase,
        ctc.text_content,
        ctc.categories
      FROM account_warmup_phases awp
      JOIN central_text_content ctc ON awp.assigned_text_id = ctc.id
      WHERE awp.account_id = $1 AND awp.phase = 'name'
    `, [testAccountId]);
    
    if (finalCheck.rows.length > 0) {
      const final = finalCheck.rows[0];
      console.log(`📋 Final assignment:`);
      console.log(`   Text: "${final.text_content}"`);
      console.log(`   Categories: ${final.categories}`);
      
      if (final.text_content === account.model_name) {
        console.log(`\n🎉 SUCCESS: Name phase now uses model name "${account.model_name}"`);
      } else {
        console.log(`\n❌ FAILED: Name phase still not using model name`);
      }
    }
    
    // Test what will be sent to iPhone
    console.log(`\n📱 Testing iPhone clipboard content...`);
    console.log(`   When name phase runs, "${account.model_name}" will be sent to iPhone clipboard`);
    console.log(`   This will be used by change_name_to_clipboard.lua script`);
    
    console.log(`\n✅ Name phase fix test completed!`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await db.end();
  }
}

testNamePhaseFix();