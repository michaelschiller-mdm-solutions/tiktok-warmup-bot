/**
 * Check the structure of content-related tables
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

async function checkContentTablesStructure() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking content-related table structures...');
    
    // Check all tables related to content
    const contentTablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%content%' OR table_name LIKE '%bundle%')
      ORDER BY table_name;
    `;
    
    const tablesResult = await client.query(contentTablesQuery);
    console.log('\n📊 Content-related tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Check each table structure
    for (const table of tablesResult.rows) {
      console.log(`\n📋 Structure of ${table.table_name}:`);
      
      const columnsQuery = `
        SELECT 
          column_name, 
          data_type, 
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `;
      
      const columnsResult = await client.query(columnsQuery, [table.table_name]);
      columnsResult.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      // Show sample data
      try {
        const sampleQuery = `SELECT * FROM ${table.table_name} LIMIT 3`;
        const sampleResult = await client.query(sampleQuery);
        
        if (sampleResult.rows.length > 0) {
          console.log(`  Sample data (${sampleResult.rows.length} rows):`);
          sampleResult.rows.forEach((row, index) => {
            console.log(`    Row ${index + 1}:`, JSON.stringify(row, null, 2));
          });
        } else {
          console.log(`  No data in ${table.table_name}`);
        }
      } catch (error) {
        console.log(`  Error reading sample data: ${error.message}`);
      }
    }
    
    // Check specifically for PFP content
    console.log('\n🖼️  Checking for PFP content...');
    
    // Try different possible table structures
    const possibleQueries = [
      // Option 1: central_content with bundle_id
      `SELECT 
        cc.id,
        cc.content_type,
        cc.file_path,
        cc.bundle_id
      FROM central_content cc
      WHERE cc.content_type = 'pfp'
      LIMIT 5`,
      
      // Option 2: central_content without bundle_id
      `SELECT 
        cc.id,
        cc.content_type,
        cc.file_path
      FROM central_content cc
      WHERE cc.content_type = 'pfp'
      LIMIT 5`,
      
      // Option 3: available_warmup_content
      `SELECT 
        awc.id,
        awc.content_type,
        awc.file_path
      FROM available_warmup_content awc
      WHERE awc.content_type = 'pfp'
      LIMIT 5`
    ];
    
    for (let i = 0; i < possibleQueries.length; i++) {
      try {
        console.log(`\n  Trying query option ${i + 1}...`);
        const result = await client.query(possibleQueries[i]);
        
        if (result.rows.length > 0) {
          console.log(`  ✅ Found ${result.rows.length} PFP content items:`);
          result.rows.forEach(row => {
            console.log(`    - ID: ${row.id}, Path: ${row.file_path}`);
          });
          break;
        } else {
          console.log(`  ❌ No PFP content found with this query`);
        }
      } catch (error) {
        console.log(`  ❌ Query failed: ${error.message}`);
      }
    }
    
    // Check warmup content assignments
    console.log('\n🔗 Checking warmup content assignments...');
    
    const assignmentQuery = `
      SELECT 
        awp.account_id,
        a.username,
        awp.phase,
        awp.status,
        awp.assigned_content_id,
        awp.content_assigned_at
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      WHERE awp.phase = 'profile_picture'
      AND awp.assigned_content_id IS NOT NULL
      ORDER BY awp.content_assigned_at DESC
      LIMIT 5;
    `;
    
    const assignmentResult = await client.query(assignmentQuery);
    
    if (assignmentResult.rows.length > 0) {
      console.log(`  ✅ Found ${assignmentResult.rows.length} profile_picture phases with content assigned:`);
      assignmentResult.rows.forEach(row => {
        console.log(`    - ${row.username}: Content ID ${row.assigned_content_id} (${row.status})`);
      });
    } else {
      console.log(`  ❌ No profile_picture phases have content assigned`);
    }
    
    // Check content assignment service tables
    console.log('\n🔧 Checking content assignment service tables...');
    
    const warmupContentAssignmentsQuery = `
      SELECT 
        wca.account_id,
        a.username,
        wca.content_type,
        wca.assigned_content_id,
        wca.assigned_at
      FROM warmup_content_assignments wca
      JOIN accounts a ON wca.account_id = a.id
      WHERE wca.content_type = 'pfp'
      ORDER BY wca.assigned_at DESC
      LIMIT 5;
    `;
    
    try {
      const warmupAssignmentResult = await client.query(warmupContentAssignmentsQuery);
      
      if (warmupAssignmentResult.rows.length > 0) {
        console.log(`  ✅ Found ${warmupAssignmentResult.rows.length} PFP content assignments:`);
        warmupAssignmentResult.rows.forEach(row => {
          console.log(`    - ${row.username}: Content ID ${row.assigned_content_id}`);
        });
      } else {
        console.log(`  ❌ No PFP content assignments found`);
      }
    } catch (error) {
      console.log(`  ❌ Error checking warmup_content_assignments: ${error.message}`);
    }
    
  } catch (error) {
    console.error('💥 Error checking content tables structure:', error);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await checkContentTablesStructure();
    console.log('\n🎉 Content tables structure check completed!');
  } catch (error) {
    console.error('💥 Check failed:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkContentTablesStructure };