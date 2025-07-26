/**
 * Comprehensive Warmup System Diagnostic and Fix Script
 * 
 * This script will:
 * 1. Diagnose all issues with the warmup automation system
 * 2. Fix database schema issues
 * 3. Create test accounts in warmup status
 * 4. Test content assignment and delivery
 * 5. Test iPhone automation integration
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

class WarmupSystemDiagnostic {
  constructor() {
    this.issues = [];
    this.fixes = [];
  }

  async diagnoseAll() {
    console.log('🔍 COMPREHENSIVE WARMUP SYSTEM DIAGNOSTIC');
    console.log('==========================================\n');

    await this.checkDatabaseSchema();
    await this.checkAccountStates();
    await this.checkContentAssignment();
    await this.checkAutomationScripts();
    await this.checkiPhoneConnectivity();
    
    this.summarizeIssues();
  }

  async checkDatabaseSchema() {
    console.log('📊 1. Checking Database Schema...\n');

    try {
      // Check if bot_ready_accounts view works
      const testQuery = `SELECT COUNT(*) FROM bot_ready_accounts LIMIT 1`;
      await pool.query(testQuery);
      console.log('✅ bot_ready_accounts view is accessible');
    } catch (error) {
      this.issues.push({
        category: 'Database Schema',
        issue: 'bot_ready_accounts view has errors',
        error: error.message,
        fix: 'Fix column name references in database functions'
      });
      console.log('❌ bot_ready_accounts view has errors:', error.message);
    }

    // Check content assignment function
    try {
      const testContentQuery = `SELECT is_content_assignment_complete(1) as result`;
      await pool.query(testContentQuery);
      console.log('✅ Content assignment function works');
    } catch (error) {
      this.issues.push({
        category: 'Database Schema',
        issue: 'Content assignment function has errors',
        error: error.message,
        fix: 'Fix column references in is_content_assignment_complete function'
      });
      console.log('❌ Content assignment function has errors:', error.message);
    }

    console.log('');
  }

  async checkAccountStates() {
    console.log('👥 2. Checking Account States...\n');

    // Check account status distribution
    const statusQuery = `
      SELECT status, COUNT(*) as count
      FROM accounts 
      GROUP BY status
      ORDER BY count DESC
    `;
    
    const statusResult = await pool.query(statusQuery);
    console.log('📊 Account status distribution:');
    statusResult.rows.forEach(row => {
      console.log(`   ${row.status}: ${row.count} accounts`);
    });

    const warmupCount = statusResult.rows.find(r => r.status === 'warmup')?.count || 0;
    if (warmupCount === 0) {
      this.issues.push({
        category: 'Account States',
        issue: 'No accounts in warmup status',
        fix: 'Create test accounts in warmup status for testing'
      });
      console.log('❌ No accounts in warmup status for testing');
    } else {
      console.log(`✅ Found ${warmupCount} accounts in warmup status`);
    }

    // Check accounts with pending phases
    const pendingQuery = `
      SELECT COUNT(*) as count
      FROM account_warmup_phases 
      WHERE status = 'pending'
    `;
    
    const pendingResult = await pool.query(pendingQuery);
    const pendingCount = pendingResult.rows[0].count;
    console.log(`📋 Accounts with pending phases: ${pendingCount}`);

    if (pendingCount === 0) {
      this.issues.push({
        category: 'Account States',
        issue: 'No accounts with pending phases',
        fix: 'Assign phases to test accounts'
      });
    }

    console.log('');
  }

  async checkContentAssignment() {
    console.log('📁 3. Checking Content Assignment...\n');

    // Check if content exists
    const contentQuery = `
      SELECT 
        (SELECT COUNT(*) FROM central_content) as image_count,
        (SELECT COUNT(*) FROM central_text_content) as text_count
    `;
    
    const contentResult = await pool.query(contentQuery);
    const { image_count, text_count } = contentResult.rows[0];
    
    console.log(`🖼️  Available images: ${image_count}`);
    console.log(`📝 Available texts: ${text_count}`);

    if (image_count === 0) {
      this.issues.push({
        category: 'Content Assignment',
        issue: 'No images available for assignment',
        fix: 'Upload content images to central_content table'
      });
    }

    if (text_count === 0) {
      this.issues.push({
        category: 'Content Assignment',
        issue: 'No text content available for assignment',
        fix: 'Add text content to central_text_content table'
      });
    }

    // Check content assignments
    const assignmentQuery = `
      SELECT COUNT(*) as count
      FROM account_warmup_phases 
      WHERE assigned_content_id IS NOT NULL OR assigned_text_id IS NOT NULL
    `;
    
    const assignmentResult = await pool.query(assignmentQuery);
    const assignmentCount = assignmentResult.rows[0].count;
    console.log(`📋 Phases with assigned content: ${assignmentCount}`);

    console.log('');
  }

  async checkAutomationScripts() {
    console.log('🤖 4. Checking Automation Scripts...\n');

    // Check if Lua scripts exist
    const luaScriptPath = path.join(__dirname, '../bot/scripts/iphone_lua');
    
    if (!fs.existsSync(luaScriptPath)) {
      this.issues.push({
        category: 'Automation Scripts',
        issue: 'Lua scripts directory not found',
        fix: 'Ensure Lua scripts are present in bot/scripts/iphone_lua'
      });
      console.log('❌ Lua scripts directory not found');
      return;
    }

    const luaFiles = fs.readdirSync(luaScriptPath).filter(f => f.endsWith('.lua'));
    console.log(`📜 Found ${luaFiles.length} Lua scripts`);

    // Check specific required scripts
    const requiredScripts = [
      'change_bio_to_clipboard.lua',
      'set_account_private.lua',
      'change_gender_to_female.lua',
      'upload_first_highlight_group_with_clipboard_name_newest_media_no_caption.lua',
      'upload_post_newest_media_clipboard_caption.lua'
    ];

    const missingScripts = requiredScripts.filter(script => !luaFiles.includes(script));
    
    if (missingScripts.length > 0) {
      this.issues.push({
        category: 'Automation Scripts',
        issue: `Missing required Lua scripts: ${missingScripts.join(', ')}`,
        fix: 'Ensure all required Lua scripts are present on iPhone'
      });
      console.log('❌ Missing required scripts:', missingScripts);
    } else {
      console.log('✅ All required Lua scripts found');
    }

    console.log('');
  }

  async checkiPhoneConnectivity() {
    console.log('📱 5. Checking iPhone Connectivity...\n');

    try {
      const axios = require('axios');
      const response = await axios.get('http://192.168.178.65:46952/status', { timeout: 5000 });
      console.log('✅ iPhone automation server is accessible');
      console.log(`📊 Response: ${JSON.stringify(response.data)}`);
    } catch (error) {
      this.issues.push({
        category: 'iPhone Connectivity',
        issue: 'Cannot connect to iPhone automation server',
        error: error.message,
        fix: 'Ensure iPhone is connected and XXTouch server is running on 192.168.178.65:46952'
      });
      console.log('❌ iPhone automation server not accessible:', error.message);
    }

    console.log('');
  }

  summarizeIssues() {
    console.log('📋 DIAGNOSTIC SUMMARY');
    console.log('====================\n');

    if (this.issues.length === 0) {
      console.log('🎉 No issues found! Warmup system appears to be working correctly.');
      return;
    }

    console.log(`❌ Found ${this.issues.length} issues:\n`);

    this.issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.category}: ${issue.issue}`);
      if (issue.error) {
        console.log(`   Error: ${issue.error}`);
      }
      console.log(`   Fix: ${issue.fix}\n`);
    });
  }

  async fixDatabaseIssues() {
    console.log('🔧 FIXING DATABASE ISSUES');
    console.log('=========================\n');

    // Fix the content assignment function
    const fixContentFunction = `
      CREATE OR REPLACE FUNCTION is_content_assignment_complete(p_account_id INTEGER)
      RETURNS BOOLEAN AS $$
      BEGIN
          -- Check if account has required content for all phases
          RETURN EXISTS (
              SELECT 1 FROM account_warmup_phases awp
              WHERE awp.account_id = p_account_id
              AND (awp.assigned_content_id IS NOT NULL OR awp.assigned_text_id IS NOT NULL)
          );
      END;
      $$ LANGUAGE plpgsql;
    `;

    try {
      await pool.query(fixContentFunction);
      console.log('✅ Fixed is_content_assignment_complete function');
    } catch (error) {
      console.log('❌ Failed to fix content assignment function:', error.message);
    }

    console.log('');
  }

  async createTestAccount() {
    console.log('🧪 CREATING TEST ACCOUNT');
    console.log('========================\n');

    try {
      // Create a test account in warmup status
      const insertAccountQuery = `
        INSERT INTO accounts (
          model_id, username, password, email, status, container_number, created_at
        ) VALUES (
          1, 'test_warmup_account', 'test_password', 'test@example.com', 'warmup', 999, NOW()
        ) RETURNING id, username
      `;

      const accountResult = await pool.query(insertAccountQuery);
      const testAccount = accountResult.rows[0];
      
      console.log(`✅ Created test account: ${testAccount.username} (ID: ${testAccount.id})`);

      // Create warmup phases for the test account
      const phases = ['bio', 'name', 'first_highlight', 'post_caption'];
      
      for (const phase of phases) {
        const insertPhaseQuery = `
          INSERT INTO account_warmup_phases (
            account_id, phase, status, created_at
          ) VALUES ($1, $2, 'pending', NOW())
        `;
        
        await pool.query(insertPhaseQuery, [testAccount.id, phase]);
        console.log(`✅ Created ${phase} phase for test account`);
      }

      return testAccount.id;

    } catch (error) {
      console.log('❌ Failed to create test account:', error.message);
      return null;
    }
  }

  async testContentDelivery(accountId) {
    console.log('📱 TESTING CONTENT DELIVERY');
    console.log('===========================\n');

    try {
      // Test the send-to-iphone script
      const { spawn } = require('child_process');
      const sendScript = path.join(__dirname, 'src/scripts/send-to-iphone.js');
      
      console.log(`🚀 Testing send-to-iphone script for account ${accountId}...`);
      
      const child = spawn('node', [sendScript, accountId.toString(), 'bio', '--simple'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      return new Promise((resolve) => {
        child.on('close', (code) => {
          console.log(`📊 Send-to-iPhone test result:`);
          console.log(`   Exit code: ${code}`);
          console.log(`   Output: ${stdout.trim()}`);
          if (stderr.trim()) {
            console.log(`   Errors: ${stderr.trim()}`);
          }
          
          resolve(code === 0);
        });
      });

    } catch (error) {
      console.log('❌ Content delivery test failed:', error.message);
      return false;
    }
  }

  async runFullDiagnosticAndFix() {
    await this.diagnoseAll();
    
    if (this.issues.length > 0) {
      console.log('\n🔧 ATTEMPTING TO FIX ISSUES...\n');
      
      await this.fixDatabaseIssues();
      
      const testAccountId = await this.createTestAccount();
      
      if (testAccountId) {
        await this.testContentDelivery(testAccountId);
      }
    }
  }
}

async function main() {
  const diagnostic = new WarmupSystemDiagnostic();
  
  try {
    await diagnostic.runFullDiagnosticAndFix();
  } catch (error) {
    console.error('💥 Diagnostic failed:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);