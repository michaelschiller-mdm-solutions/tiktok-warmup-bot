/**
 * Fix profile picture phase ordering
 * 
 * The profile_picture phase currently has phase_order 100, which puts it last.
 * It should come after username phase (around order 5) in the warmup sequence.
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'instagram_tracker',
  password: process.env.DB_PASSWORD || 'password123',
  port: process.env.DB_PORT || 5432,
});

async function fixProfilePicturePhaseOrder() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing profile picture phase ordering...');
    
    // 1. Check current phase ordering
    console.log('\n📊 Current phase ordering:');
    const currentOrderQuery = `
      SELECT DISTINCT 
        phase,
        phase_order,
        COUNT(*) as account_count
      FROM account_warmup_phases
      GROUP BY phase, phase_order
      ORDER BY phase_order, phase;
    `;
    
    const currentResult = await client.query(currentOrderQuery);
    currentResult.rows.forEach(row => {
      console.log(`  ${row.phase}: order ${row.phase_order} (${row.account_count} accounts)`);
    });
    
    // 2. Check what the correct order should be
    console.log('\n🎯 Proposed new ordering:');
    const proposedOrder = {
      'bio': 1,
      'gender': 2, 
      'name': 3,
      'username': 4,
      'profile_picture': 5,  // Move from 100 to 5
      'first_highlight': 6,
      'new_highlight': 7,
      'post_caption': 8,
      'post_no_caption': 9,
      'story_caption': 10,
      'story_no_caption': 11,
      'set_to_private': 12
    };
    
    Object.entries(proposedOrder).forEach(([phase, order]) => {
      console.log(`  ${phase}: order ${order}`);
    });
    
    // 3. Begin transaction to update phase ordering
    console.log('\n🔄 Updating phase ordering...');
    await client.query('BEGIN');
    
    let updatedPhases = 0;
    
    for (const [phase, newOrder] of Object.entries(proposedOrder)) {
      const updateQuery = `
        UPDATE account_warmup_phases 
        SET phase_order = $1,
            updated_at = NOW()
        WHERE phase = $2;
      `;
      
      const result = await client.query(updateQuery, [newOrder, phase]);
      const rowsUpdated = result.rowCount;
      
      if (rowsUpdated > 0) {
        console.log(`  ✅ Updated ${phase}: ${rowsUpdated} accounts`);
        updatedPhases++;
      }
    }
    
    // Commit the changes
    await client.query('COMMIT');
    
    console.log(`\n📈 Update Summary:`);
    console.log(`  ✅ Updated ${updatedPhases} different phases`);
    
    // 4. Verify the changes
    console.log('\n🔍 Verifying new phase ordering...');
    const verifyResult = await client.query(currentOrderQuery);
    
    console.log('New phase ordering:');
    verifyResult.rows.forEach(row => {
      console.log(`  ${row.phase}: order ${row.phase_order} (${row.account_count} accounts)`);
    });
    
    // 5. Check how many accounts now have profile_picture as current phase
    console.log('\n🎯 Checking accounts with profile_picture as current phase...');
    
    const currentProfilePictureQuery = `
      SELECT 
        a.id,
        a.username,
        awp.status,
        awp.available_at
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE a.lifecycle_state = 'warmup'
      AND awp.phase = 'profile_picture'
      AND awp.status IN ('pending', 'available', 'in_progress')
      AND NOT EXISTS (
        SELECT 1 FROM account_warmup_phases awp2 
        WHERE awp2.account_id = a.id 
        AND awp2.status IN ('pending', 'available', 'in_progress')
        AND awp2.phase_order < awp.phase_order
      )
      ORDER BY awp.status, a.username
      LIMIT 10;
    `;
    
    const currentResult2 = await client.query(currentProfilePictureQuery);
    
    if (currentResult2.rows.length === 0) {
      console.log('  ⚠️  Still no accounts have profile_picture as current phase');
      console.log('  This means other phases are still blocking progression');
    } else {
      console.log(`  🎉 Found ${currentResult2.rows.length} accounts with profile_picture as current phase:`);
      currentResult2.rows.forEach(row => {
        console.log(`    - ${row.username} (ID: ${row.id}) - ${row.status}`);
      });
    }
    
    // 6. Show sample account progression
    console.log('\n📋 Sample account phase progression:');
    
    const sampleProgressionQuery = `
      SELECT 
        a.username,
        awp.phase,
        awp.status,
        awp.phase_order,
        CASE 
          WHEN awp.status IN ('pending', 'available', 'in_progress') 
          AND NOT EXISTS (
            SELECT 1 FROM account_warmup_phases awp2 
            WHERE awp2.account_id = a.id 
            AND awp2.status IN ('pending', 'available', 'in_progress')
            AND awp2.phase_order < awp.phase_order
          ) THEN ' ← CURRENT'
          ELSE ''
        END as is_current
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE a.lifecycle_state = 'warmup'
      AND a.id IN (
        SELECT DISTINCT account_id 
        FROM account_warmup_phases 
        WHERE phase = 'profile_picture' 
        LIMIT 3
      )
      ORDER BY a.username, awp.phase_order;
    `;
    
    const progressionResult = await client.query(sampleProgressionQuery);
    
    let currentUser = '';
    progressionResult.rows.forEach(row => {
      if (row.username !== currentUser) {
        console.log(`\n  ${row.username}:`);
        currentUser = row.username;
      }
      console.log(`    ${row.phase}: ${row.status} (order: ${row.phase_order})${row.is_current}`);
    });
    
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('💥 Error fixing profile picture phase order:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await fixProfilePicturePhaseOrder();
    console.log('\n🎉 Profile picture phase order fix completed!');
    console.log('\n📝 Next steps:');
    console.log('  1. Check frontend - should now show accounts in profile_picture phase');
    console.log('  2. Verify warmup automation can progress through profile_picture phase');
    console.log('  3. Test the warmup executor with profile_picture phase');
  } catch (error) {
    console.error('💥 Fix failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixProfilePicturePhaseOrder };