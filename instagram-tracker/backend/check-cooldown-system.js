/**
 * Check if cooldown configuration from frontend is properly applied
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function checkCooldownSystem() {
  try {
    console.log('🕒 CHECKING COOLDOWN SYSTEM');
    console.log('===========================\n');

    // 1. Check warmup configuration table
    console.log('📊 1. Warmup Configuration Settings:');
    const configQuery = `
      SELECT 
        wc.model_id,
        m.name as model_name,
        wc.min_cooldown_hours,
        wc.max_cooldown_hours,
        wc.single_bot_constraint,
        wc.created_at,
        wc.updated_at
      FROM warmup_configuration wc
      JOIN models m ON wc.model_id = m.id
      ORDER BY wc.updated_at DESC
      LIMIT 10
    `;
    
    const configResult = await pool.query(configQuery);
    if (configResult.rows.length > 0) {
      console.log('   Cooldown configurations found:');
      configResult.rows.forEach(config => {
        console.log(`   - Model "${config.model_name}": ${config.min_cooldown_hours}-${config.max_cooldown_hours} hours`);
        console.log(`     Single bot: ${config.single_bot_constraint}, Updated: ${config.updated_at}`);
      });
    } else {
      console.log('   ❌ No warmup configurations found!');
      console.log('   This means cooldowns are using default values (15-24 hours)');
    }

    // 2. Check recent phase completions and their cooldowns
    console.log('\n⏰ 2. Recent Phase Completions & Cooldowns:');
    const recentPhasesQuery = `
      SELECT 
        a.username,
        a.model_id,
        awp.phase,
        awp.status,
        awp.completed_at,
        awp.cooldown_until,
        EXTRACT(EPOCH FROM (awp.cooldown_until - awp.completed_at))/3600 as cooldown_hours_applied,
        wc.min_cooldown_hours,
        wc.max_cooldown_hours
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      LEFT JOIN warmup_configuration wc ON a.model_id = wc.model_id
      WHERE awp.completed_at IS NOT NULL
      AND awp.cooldown_until IS NOT NULL
      ORDER BY awp.completed_at DESC
      LIMIT 10
    `;
    
    const recentResult = await pool.query(recentPhasesQuery);
    if (recentResult.rows.length > 0) {
      console.log('   Recent completed phases:');
      recentResult.rows.forEach(phase => {
        const configRange = phase.min_cooldown_hours && phase.max_cooldown_hours 
          ? `${phase.min_cooldown_hours}-${phase.max_cooldown_hours}h` 
          : 'default (15-24h)';
        const appliedHours = Math.round(phase.cooldown_hours_applied * 100) / 100;
        const inRange = phase.min_cooldown_hours && phase.max_cooldown_hours
          ? appliedHours >= phase.min_cooldown_hours && appliedHours <= phase.max_cooldown_hours
          : appliedHours >= 15 && appliedHours <= 24;
        
        console.log(`   - ${phase.username}: ${phase.phase} → ${appliedHours}h cooldown (config: ${configRange}) ${inRange ? '✅' : '❌'}`);
      });
    } else {
      console.log('   ❌ No completed phases with cooldowns found');
    }

    // 3. Check accounts currently in cooldown
    console.log('\n❄️  3. Accounts Currently in Cooldown:');
    const cooldownQuery = `
      SELECT 
        a.username,
        awp.phase,
        awp.cooldown_until,
        EXTRACT(EPOCH FROM (awp.cooldown_until - NOW()))/3600 as hours_remaining
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      WHERE awp.cooldown_until > NOW()
      ORDER BY awp.cooldown_until ASC
      LIMIT 10
    `;
    
    const cooldownResult = await pool.query(cooldownQuery);
    if (cooldownResult.rows.length > 0) {
      console.log('   Accounts in cooldown:');
      cooldownResult.rows.forEach(account => {
        const hoursRemaining = Math.round(account.hours_remaining * 100) / 100;
        console.log(`   - ${account.username}: ${account.phase} → ${hoursRemaining}h remaining`);
      });
    } else {
      console.log('   ✅ No accounts currently in cooldown');
    }

    // 4. Check if WarmupProcessService uses the configuration
    console.log('\n🔧 4. Cooldown Application Logic Check:');
    console.log('   The cooldown should be applied by WarmupProcessService.completePhase()');
    console.log('   Let me check if it uses warmup_configuration table...');
    
    // Check if there are functions that use warmup_configuration
    const functionQuery = `
      SELECT routine_name, routine_definition
      FROM information_schema.routines
      WHERE routine_definition LIKE '%warmup_configuration%'
      AND routine_type = 'FUNCTION'
    `;
    
    const functionResult = await pool.query(functionQuery);
    if (functionResult.rows.length > 0) {
      console.log('   ✅ Found database functions using warmup_configuration:');
      functionResult.rows.forEach(func => {
        console.log(`   - ${func.routine_name}`);
      });
    } else {
      console.log('   ❌ No database functions found using warmup_configuration');
      console.log('   This suggests cooldowns might be hardcoded instead of using frontend settings');
    }

    // 5. Summary and recommendations
    console.log('\n📋 COOLDOWN SYSTEM ANALYSIS:');
    console.log('============================');
    
    if (configResult.rows.length === 0) {
      console.log('❌ ISSUE: No warmup configurations found');
      console.log('   - Frontend cooldown settings are not being saved to database');
      console.log('   - System is likely using hardcoded default values');
    }
    
    if (recentResult.rows.length === 0) {
      console.log('❌ ISSUE: No recent phase completions found');
      console.log('   - Cannot verify if cooldowns are being applied correctly');
    }
    
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('1. Check if frontend saves cooldown settings to warmup_configuration table');
    console.log('2. Verify WarmupProcessService.completePhase() reads from warmup_configuration');
    console.log('3. Test cooldown application by completing a phase and checking the cooldown_until value');

  } catch (error) {
    console.error('❌ Error checking cooldown system:', error);
  } finally {
    await pool.end();
  }
}

checkCooldownSystem();