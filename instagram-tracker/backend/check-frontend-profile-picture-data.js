/**
 * Check why frontend isn't showing profile picture phase accounts
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

async function checkFrontendProfilePictureData() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking why frontend isn\'t showing profile picture phase accounts...');
    
    // 1. Check accounts in profile_picture phase with their details
    console.log('\n📊 Profile Picture Phase Accounts (Frontend View):');
    const frontendViewQuery = `
      SELECT 
        a.id,
        a.username,
        a.lifecycle_state,
        a.model_id,
        awp.phase,
        awp.status,
        awp.available_at,
        awp.assigned_content_id,
        awp.content_assigned_at,
        cc.file_path as content_path,
        cc.categories as content_categories
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      LEFT JOIN central_content cc ON awp.assigned_content_id = cc.id
      WHERE awp.phase = 'profile_picture'
      AND a.lifecycle_state = 'warmup'
      ORDER BY awp.status, a.username
      LIMIT 10;
    `;
    
    const frontendResult = await client.query(frontendViewQuery);
    
    if (frontendResult.rows.length === 0) {
      console.log('  ❌ No accounts found in profile_picture phase with warmup lifecycle');
    } else {
      console.log(`  📊 Found ${frontendResult.rows.length} accounts:`);
      frontendResult.rows.forEach(row => {
        console.log(`    - ${row.username} (ID: ${row.id})`);
        console.log(`      Status: ${row.status}`);
        console.log(`      Available at: ${row.available_at}`);
        console.log(`      Content: ${row.content_path ? 'Assigned' : 'Missing'}`);
        console.log(`      Content ID: ${row.assigned_content_id}`);
        console.log('');
      });
    }
    
    // 2. Check the warmup status API that frontend uses
    console.log('\n🔍 Checking warmup status API data...');
    
    // This simulates what the frontend getBatchWarmupStatus API call returns
    const warmupStatusQuery = `
      SELECT 
        a.id as account_id,
        a.username,
        a.lifecycle_state,
        -- Find current phase (first non-completed phase in order)
        (
          SELECT awp2.phase 
          FROM account_warmup_phases awp2 
          WHERE awp2.account_id = a.id 
          AND awp2.status IN ('pending', 'available', 'in_progress')
          ORDER BY awp2.phase_order ASC, awp2.id ASC
          LIMIT 1
        ) as current_phase,
        -- Get phase status
        (
          SELECT awp3.status 
          FROM account_warmup_phases awp3 
          WHERE awp3.account_id = a.id 
          AND awp3.phase = (
            SELECT awp4.phase 
            FROM account_warmup_phases awp4 
            WHERE awp4.account_id = a.id 
            AND awp4.status IN ('pending', 'available', 'in_progress')
            ORDER BY awp4.phase_order ASC, awp4.id ASC
            LIMIT 1
          )
          LIMIT 1
        ) as phase_status,
        -- Calculate progress
        (
          SELECT COUNT(*) 
          FROM account_warmup_phases awp5 
          WHERE awp5.account_id = a.id 
          AND awp5.status = 'completed'
        ) as completed_phases,
        (
          SELECT COUNT(*) 
          FROM account_warmup_phases awp6 
          WHERE awp6.account_id = a.id
        ) as total_phases
      FROM accounts a
      WHERE a.lifecycle_state = 'warmup'
      AND EXISTS (
        SELECT 1 FROM account_warmup_phases awp 
        WHERE awp.account_id = a.id 
        AND awp.phase = 'profile_picture'
      )
      ORDER BY a.username
      LIMIT 10;
    `;
    
    const statusResult = await client.query(warmupStatusQuery);
    
    console.log(`  📊 Warmup status for accounts with profile_picture phase:`);
    statusResult.rows.forEach(row => {
      const progressPercent = row.total_phases > 0 ? Math.round((row.completed_phases / row.total_phases) * 100) : 0;
      console.log(`    - ${row.username} (ID: ${row.account_id})`);
      console.log(`      Current phase: ${row.current_phase || 'None'}`);
      console.log(`      Phase status: ${row.phase_status || 'N/A'}`);
      console.log(`      Progress: ${row.completed_phases}/${row.total_phases} (${progressPercent}%)`);
      console.log('');
    });
    
    // 3. Check if accounts are being filtered out by current phase logic
    console.log('\n🔍 Checking phase ordering and current phase detection...');
    
    const phaseOrderingQuery = `
      SELECT 
        awp.account_id,
        a.username,
        awp.phase,
        awp.status,
        awp.phase_order,
        ROW_NUMBER() OVER (PARTITION BY awp.account_id ORDER BY awp.phase_order ASC, awp.id ASC) as order_rank
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      WHERE a.lifecycle_state = 'warmup'
      AND awp.account_id IN (
        SELECT DISTINCT account_id 
        FROM account_warmup_phases 
        WHERE phase = 'profile_picture'
      )
      AND awp.status IN ('pending', 'available', 'in_progress')
      ORDER BY awp.account_id, awp.phase_order ASC, awp.id ASC;
    `;
    
    const orderingResult = await client.query(phaseOrderingQuery);
    
    console.log(`  📊 Phase ordering for accounts with profile_picture phase:`);
    let currentAccountId = null;
    orderingResult.rows.forEach(row => {
      if (row.account_id !== currentAccountId) {
        console.log(`\n    Account: ${row.username} (ID: ${row.account_id})`);
        currentAccountId = row.account_id;
      }
      const isCurrentPhase = row.order_rank === 1 ? ' ← CURRENT' : '';
      console.log(`      ${row.phase}: ${row.status} (order: ${row.phase_order})${isCurrentPhase}`);
    });
    
    // 4. Check if profile_picture is actually the current phase for any accounts
    console.log('\n🎯 Accounts where profile_picture is the current phase:');
    
    const currentProfilePictureQuery = `
      SELECT 
        a.id,
        a.username,
        awp.status,
        awp.available_at,
        awp.assigned_content_id
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE a.lifecycle_state = 'warmup'
      AND awp.phase = 'profile_picture'
      AND awp.status IN ('pending', 'available', 'in_progress')
      AND NOT EXISTS (
        SELECT 1 FROM account_warmup_phases awp2 
        WHERE awp2.account_id = a.id 
        AND awp2.status IN ('pending', 'available', 'in_progress')
        AND (awp2.phase_order < awp.phase_order OR (awp2.phase_order = awp.phase_order AND awp2.id < awp.id))
      )
      ORDER BY awp.status, a.username;
    `;
    
    const currentResult = await client.query(currentProfilePictureQuery);
    
    if (currentResult.rows.length === 0) {
      console.log('  ❌ No accounts have profile_picture as their current phase');
      console.log('  This explains why frontend shows no accounts in profile_picture phase');
    } else {
      console.log(`  ✅ Found ${currentResult.rows.length} accounts with profile_picture as current phase:`);
      currentResult.rows.forEach(row => {
        console.log(`    - ${row.username} (ID: ${row.id}) - ${row.status}`);
      });
    }
    
    // 5. Check what phases are blocking profile_picture
    console.log('\n🚧 Checking what phases are blocking profile_picture progression...');
    
    const blockingPhasesQuery = `
      SELECT 
        a.username,
        awp.phase,
        awp.status,
        awp.phase_order,
        awp.available_at
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE a.lifecycle_state = 'warmup'
      AND a.id IN (
        SELECT DISTINCT account_id 
        FROM account_warmup_phases 
        WHERE phase = 'profile_picture'
      )
      AND awp.status IN ('pending', 'available', 'in_progress')
      AND awp.phase != 'profile_picture'
      AND awp.phase_order < (
        SELECT phase_order 
        FROM account_warmup_phases 
        WHERE account_id = a.id 
        AND phase = 'profile_picture'
      )
      ORDER BY a.username, awp.phase_order;
    `;
    
    const blockingResult = await client.query(blockingPhasesQuery);
    
    if (blockingResult.rows.length === 0) {
      console.log('  ✅ No phases are blocking profile_picture progression');
    } else {
      console.log(`  ⚠️  Found ${blockingResult.rows.length} blocking phases:`);
      let currentUser = '';
      blockingResult.rows.forEach(row => {
        if (row.username !== currentUser) {
          console.log(`\n    ${row.username}:`);
          currentUser = row.username;
        }
        console.log(`      - ${row.phase}: ${row.status} (order: ${row.phase_order})`);
      });
    }
    
  } catch (error) {
    console.error('💥 Error checking frontend profile picture data:', error);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await checkFrontendProfilePictureData();
    console.log('\n🎉 Frontend profile picture data check completed!');
  } catch (error) {
    console.error('💥 Check failed:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkFrontendProfilePictureData };