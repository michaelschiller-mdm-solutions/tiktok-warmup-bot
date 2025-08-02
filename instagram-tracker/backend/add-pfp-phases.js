// Add profile_picture phases to existing accounts
const { db } = require('./dist/database');

(async () => {
  try {
    const client = await db.connect();
    
    console.log('🔄 Adding profile_picture phases to existing accounts...');
    
    // Get all accounts in warmup lifecycle state
    const accounts = await client.query(`
      SELECT a.id, a.username, a.model_id
      FROM accounts a
      WHERE a.lifecycle_state = 'warmup'
      ORDER BY a.username
    `);
    
    console.log(`📋 Found ${accounts.rows.length} accounts in warmup state`);
    
    let phaseCount = 0;
    
    for (const account of accounts.rows) {
      // Check if profile_picture phase already exists for this account
      const existingPhase = await client.query(`
        SELECT 1 FROM account_warmup_phases 
        WHERE account_id = $1 AND phase = 'profile_picture'
      `, [account.id]);
      
      if (existingPhase.rows.length === 0) {
        // Get a random pfp content for this account
        const pfpContent = await client.query(`
          SELECT cc.id
          FROM central_content cc
          WHERE cc.categories ? 'pfp' 
          AND cc.status = 'active'
          ORDER BY RANDOM()
          LIMIT 1
        `);
        
        const assignedContentId = pfpContent.rows.length > 0 ? pfpContent.rows[0].id : null;
        
        // Get the phase order for username phase
        const usernamePhase = await client.query(`
          SELECT phase_order
          FROM account_warmup_phases 
          WHERE account_id = $1 AND phase = 'username'
        `, [account.id]);
        
        // Get the phase order for first_highlight phase
        const firstHighlightPhase = await client.query(`
          SELECT phase_order
          FROM account_warmup_phases 
          WHERE account_id = $1 AND phase = 'first_highlight'
        `, [account.id]);
        
        let newPhaseOrder;
        
        // Calculate new phase order (between username and first_highlight)
        if (usernamePhase.rows.length > 0 && firstHighlightPhase.rows.length > 0) {
          newPhaseOrder = usernamePhase.rows[0].phase_order + 1;
          
          // Update subsequent phases to make room
          await client.query(`
            UPDATE account_warmup_phases 
            SET phase_order = phase_order + 1
            WHERE account_id = $1 
            AND phase_order >= $2
          `, [account.id, newPhaseOrder]);
        } else {
          // Fallback: use max phase order + 1
          const maxOrder = await client.query(`
            SELECT COALESCE(MAX(phase_order), 0) + 1 as max_order
            FROM account_warmup_phases 
            WHERE account_id = $1
          `, [account.id]);
          
          newPhaseOrder = maxOrder.rows[0].max_order;
        }
        
        // Insert the profile_picture phase
        await client.query(`
          INSERT INTO account_warmup_phases (
            account_id,
            phase,
            status,
            phase_order,
            available_at,
            assigned_content_id,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          account.id,
          'profile_picture',
          'pending',
          newPhaseOrder,
          new Date(Date.now() + (15 + Math.random() * 9) * 60 * 60 * 1000), // Random 15-24 hour delay
          assignedContentId,
          new Date(),
          new Date()
        ]);
        
        phaseCount++;
        
        console.log(`✅ Added profile_picture phase for ${account.username} (order: ${newPhaseOrder}, content: ${assignedContentId})`);
      } else {
        console.log(`⏭️  ${account.username} already has profile_picture phase`);
      }
    }
    
    console.log(`\n✅ Added ${phaseCount} profile_picture phases`);
    
    // Verify the phases were created
    const totalPfpPhases = await client.query(`
      SELECT COUNT(*) as count 
      FROM account_warmup_phases 
      WHERE phase = 'profile_picture'
    `);
    
    console.log(`✅ Total profile_picture phases in database: ${totalPfpPhases.rows[0].count}`);
    
    // Show sample phases
    const samplePhases = await client.query(`
      SELECT 
        awp.account_id,
        a.username,
        awp.phase_order,
        awp.status,
        awp.assigned_content_id,
        cc.filename
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      LEFT JOIN central_content cc ON awp.assigned_content_id = cc.id
      WHERE awp.phase = 'profile_picture'
      ORDER BY a.username
      LIMIT 5
    `);
    
    console.log('\n📋 Sample profile picture phases:');
    samplePhases.rows.forEach(row => {
      console.log(`  - ${row.username}: order ${row.phase_order}, status ${row.status}, content: ${row.filename || 'none'}`);
    });
    
    client.release();
    console.log('\n🎉 Profile picture phases added successfully!');
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Failed to add profile picture phases:', err);
    process.exit(1);
  }
})();