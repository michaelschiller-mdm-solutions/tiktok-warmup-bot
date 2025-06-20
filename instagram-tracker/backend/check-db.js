const { Pool } = require('pg');

const db = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'instagram_tracker',
  user: 'admin',
  password: 'password123'
});

async function checkDatabase() {
  try {
    console.log('Checking campaign_pools table structure...');
    
    const columnsResult = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'campaign_pools' 
      ORDER BY ordinal_position
    `);
    
    if (columnsResult.rows.length === 0) {
      console.log('❌ campaign_pools table does not exist!');
    } else {
      console.log('✅ campaign_pools table exists with columns:');
      columnsResult.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
      
      // Check for key new columns
      const hasPoolType = columnsResult.rows.some(row => row.column_name === 'pool_type');
      const hasContentFormat = columnsResult.rows.some(row => row.column_name === 'content_format');
      const hasBlockedBySprintTypes = columnsResult.rows.some(row => row.column_name === 'blocked_by_sprint_types');
      
      if (hasPoolType && hasContentFormat && hasBlockedBySprintTypes) {
        console.log('✅ New campaign pools structure detected!');
      } else {
        console.log('❌ Still using old campaign pools structure!');
      }
    }
    
    console.log('\nChecking content_sprints table...');
    const sprintsColumnsResult = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'content_sprints' 
      ORDER BY ordinal_position
    `);
    
    if (sprintsColumnsResult.rows.length === 0) {
      console.log('❌ content_sprints table does not exist');
    } else {
      console.log('✅ content_sprints table exists with columns:');
      sprintsColumnsResult.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type}`);
      });
    }
    
    console.log('\nTesting campaign pools query...');
    const testQuery = await db.query('SELECT COUNT(*) as count FROM campaign_pools');
    console.log(`📊 campaign_pools has ${testQuery.rows[0].count} records`);
    
    console.log('\nTesting new campaign pools structure...');
    try {
      const poolsQuery = await db.query(`
        SELECT 
          cp.*,
          COUNT(cpc.id) as content_count
        FROM campaign_pools cp
        LEFT JOIN campaign_pool_content cpc ON cp.id = cpc.pool_id
        GROUP BY cp.id
        ORDER BY cp.created_at DESC
        LIMIT 100
      `);
      console.log(`✅ Campaign pools query succeeded, found ${poolsQuery.rows.length} pools`);
      
      if (poolsQuery.rows.length > 0) {
        const firstPool = poolsQuery.rows[0];
        console.log(`📋 Sample pool: "${firstPool.name}" (type: ${firstPool.pool_type}, content: ${firstPool.content_count} items)`);
      }
    } catch (queryError) {
      console.log(`❌ Campaign pools query failed: ${queryError.message}`);
    }
    
    console.log('\nTesting campaign pool content structure...');
    try {
      const contentQuery = await db.query(`
        SELECT COUNT(*) as count FROM campaign_pool_content
      `);
      console.log(`✅ campaign_pool_content has ${contentQuery.rows[0].count} records`);
    } catch (queryError) {
      console.log(`❌ Content query failed: ${queryError.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.end();
  }
}

checkDatabase(); 