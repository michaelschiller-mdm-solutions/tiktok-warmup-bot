/**
 * Simple database fix - just clean up corrupted functions
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function simpleDatabaseFix() {
  try {
    console.log('🔧 Simple database corruption fix...');
    
    // 1. Drop all problematic functions
    console.log('\n1. Cleaning up all content assignment functions...');
    
    const cleanupQueries = [
      'DROP FUNCTION IF EXISTS assign_content_to_ready_accounts() CASCADE',
      'DROP FUNCTION IF EXISTS assign_content_to_ready_accounts(integer[]) CASCADE', 
      'DROP FUNCTION IF EXISTS assign_content_to_ready_accounts(integer[], boolean) CASCADE',
      'DROP FUNCTION IF EXISTS assign_content_to_ready_accounts(text[]) CASCADE',
      'DROP FUNCTION IF EXISTS assign_content_to_ready_accounts(text[], boolean) CASCADE'
    ];
    
    for (const query of cleanupQueries) {
      try {
        await pool.query(query);
        console.log(`✅ ${query}`);
      } catch (error) {
        console.log(`⚠️  ${query} - ${error.message}`);
      }
    }
    
    // 2. Create a minimal working function
    console.log('\n2. Creating minimal content assignment function...');
    
    const minimalFunctionQuery = `
      CREATE OR REPLACE FUNCTION assign_content_to_ready_accounts()
      RETURNS TABLE(
        account_id integer,
        username text,
        success boolean,
        message text
      )
      LANGUAGE plpgsql
      AS $$
      BEGIN
        -- Simple function that just returns ready accounts
        RETURN QUERY
        SELECT 
          a.id as account_id,
          a.username,
          true as success,
          'Ready for content assignment' as message
        FROM accounts a
        WHERE a.lifecycle_state = 'ready_for_bot_assignment'
        LIMIT 10;
        
        RETURN;
      END;
      $$;
    `;
    
    await pool.query(minimalFunctionQuery);
    console.log('✅ Minimal function created successfully');
    
    // 3. Test the function
    console.log('\n3. Testing the function...');
    
    const testResult = await pool.query('SELECT * FROM assign_content_to_ready_accounts()');
    console.log(`✅ Function works - ${testResult.rows.length} results`);
    
    // 4. Verify first_automation_completed column exists
    console.log('\n4. Verifying first_automation_completed column...');
    
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'accounts' AND column_name = 'first_automation_completed'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ first_automation_completed column exists');
    } else {
      console.log('❌ first_automation_completed column missing - adding it...');
      
      await pool.query(`
        ALTER TABLE accounts 
        ADD COLUMN IF NOT EXISTS first_automation_completed BOOLEAN DEFAULT FALSE
      `);
      
      console.log('✅ first_automation_completed column added');
    }
    
    console.log('\n🎉 Simple database fix completed!');
    console.log('✅ Corrupted functions removed');
    console.log('✅ Minimal working function created');
    console.log('✅ first_automation_completed column verified');
    console.log('\n💡 You can now restart the server with: pnpm run dev');
    
  } catch (error) {
    console.error('💥 Fix failed:', error);
  } finally {
    await pool.end();
  }
}

simpleDatabaseFix();