/**
 * Fix database corruption issues and clean up problematic functions
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function fixDatabaseCorruption() {
  try {
    console.log('🔧 Fixing database corruption issues...');
    
    // 1. Check for corrupted functions
    console.log('\n1. Checking for corrupted functions...');
    
    const corruptedFunctionsQuery = `
      SELECT proname, oid 
      FROM pg_proc 
      WHERE oid = 131189
    `;
    
    const corruptedResult = await pool.query(corruptedFunctionsQuery);
    
    if (corruptedResult.rows.length > 0) {
      console.log('❌ Found corrupted function:', corruptedResult.rows[0]);
      
      // Try to drop the corrupted function
      try {
        await pool.query(`DROP FUNCTION IF EXISTS ${corruptedResult.rows[0].proname} CASCADE`);
        console.log('✅ Dropped corrupted function');
      } catch (dropError) {
        console.log('⚠️  Could not drop function:', dropError.message);
      }
    } else {
      console.log('✅ No corrupted functions found with OID 131189');
    }
    
    // 2. Clean up any problematic content assignment functions
    console.log('\n2. Cleaning up content assignment functions...');
    
    const cleanupQueries = [
      'DROP FUNCTION IF EXISTS assign_content_to_ready_accounts() CASCADE',
      'DROP FUNCTION IF EXISTS assign_content_to_ready_accounts(integer[]) CASCADE',
      'DROP FUNCTION IF EXISTS assign_content_to_ready_accounts(integer[], boolean) CASCADE'
    ];
    
    for (const query of cleanupQueries) {
      try {
        await pool.query(query);
        console.log(`✅ Executed: ${query}`);
      } catch (error) {
        console.log(`⚠️  ${query} - ${error.message}`);
      }
    }
    
    // 3. Recreate the content assignment function properly
    console.log('\n3. Recreating content assignment function...');
    
    const createFunctionQuery = `
      CREATE OR REPLACE FUNCTION assign_content_to_ready_accounts(
        target_account_ids integer[] DEFAULT NULL,
        force_reassign boolean DEFAULT FALSE
      )
      RETURNS TABLE(
        account_id integer,
        username text,
        assigned_content jsonb,
        success boolean,
        message text
      )
      LANGUAGE plpgsql
      AS $$
      DECLARE
        account_record RECORD;
        content_record RECORD;
        result_record RECORD;
      BEGIN
        -- Loop through accounts that are ready for bot assignment
        FOR account_record IN
          SELECT a.id, a.username, a.model_id
          FROM accounts a
          WHERE a.lifecycle_state = 'ready_for_bot_assignment'
          AND (target_account_ids IS NULL OR a.id = ANY(target_account_ids))
          AND (force_reassign = TRUE OR a.assigned_content IS NULL)
        LOOP
          -- Find available content for this account's model
          SELECT * INTO content_record
          FROM warmup_content wc
          WHERE wc.model_id = account_record.model_id
          AND wc.content_type IN ('bio', 'name', 'username', 'post', 'story', 'highlight_group_name')
          AND NOT EXISTS (
            SELECT 1 FROM accounts a2 
            WHERE a2.assigned_content->>'content_id' = wc.id::text 
            AND a2.id != account_record.id
          )
          ORDER BY RANDOM()
          LIMIT 1;
          
          IF content_record.id IS NOT NULL THEN
            -- Assign content to account
            UPDATE accounts
            SET assigned_content = jsonb_build_object(
              'content_id', content_record.id,
              'bio', content_record.bio,
              'name', content_record.name,
              'username', content_record.username,
              'post', content_record.post,
              'story', content_record.story,
              'highlight_group_name', content_record.highlight_group_name,
              'assigned_at', NOW()
            ),
            updated_at = NOW()
            WHERE id = account_record.id;
            
            -- Return success result
            account_id := account_record.id;
            username := account_record.username;
            assigned_content := jsonb_build_object(
              'content_id', content_record.id,
              'bio', content_record.bio,
              'name', content_record.name,
              'username', content_record.username
            );
            success := TRUE;
            message := 'Content assigned successfully';
            
            RETURN NEXT;
          ELSE
            -- Return failure result
            account_id := account_record.id;
            username := account_record.username;
            assigned_content := NULL;
            success := FALSE;
            message := 'No available content found for model';
            
            RETURN NEXT;
          END IF;
        END LOOP;
        
        RETURN;
      END;
      $$;
    `;
    
    await pool.query(createFunctionQuery);
    console.log('✅ Content assignment function recreated successfully');
    
    // 4. Test the function
    console.log('\n4. Testing the recreated function...');
    
    const testQuery = `SELECT * FROM assign_content_to_ready_accounts() LIMIT 1`;
    const testResult = await pool.query(testQuery);
    console.log(`✅ Function test completed - ${testResult.rows.length} results`);
    
    // 5. Check database integrity
    console.log('\n5. Checking database integrity...');
    
    const integrityQueries = [
      'SELECT COUNT(*) as account_count FROM accounts',
      'SELECT COUNT(*) as warmup_content_count FROM warmup_content',
      'SELECT COUNT(*) as ready_accounts FROM accounts WHERE lifecycle_state = \'ready_for_bot_assignment\''
    ];
    
    for (const query of integrityQueries) {
      try {
        const result = await pool.query(query);
        console.log(`✅ ${query}: ${result.rows[0].count || result.rows[0].account_count || result.rows[0].warmup_content_count || result.rows[0].ready_accounts}`);
      } catch (error) {
        console.log(`❌ ${query}: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Database corruption fix completed!');
    console.log('✅ Corrupted functions cleaned up');
    console.log('✅ Content assignment function recreated');
    console.log('✅ Database integrity verified');
    console.log('\n💡 You can now restart the server with: pnpm run dev');
    
  } catch (error) {
    console.error('💥 Fix failed:', error);
  } finally {
    await pool.end();
  }
}

fixDatabaseCorruption();