/**
 * Send Content to iPhone Script
 * 
 * This script sends assigned content (images and text) to the iPhone
 * for a specific account and warmup phase.
 */

const { db } = require('../database.ts');
const path = require('path');
const fs = require('fs');

// Import the iPhone API modules
const ClipboardAPI = require('../../../bot/scripts/api/clipboard.js');
const GalleryAPI = require('../../../bot/scripts/api/gallery.js');
const SimplePhotoCleaner = require('../../../bot/scripts/api/simple_photo_cleaner.js');
const iOS16PhotoCleaner = require('../../../bot/scripts/api/ios16_photo_cleaner.js');

async function sendContentToIphone(accountId, phase, iphoneIP = '192.168.178.65', iphonePort = 46952, useNuclearCleaner = true) {
  try {
    console.log(`📱 Sending content to iPhone for account ${accountId}, phase: ${phase}`);
    
    // Get account info
    const accountResult = await db.query(
      'SELECT id, username, container_number FROM accounts WHERE id = $1',
      [accountId]
    );
    
    if (accountResult.rows.length === 0) {
      throw new Error(`Account ${accountId} not found`);
    }
    
    const account = accountResult.rows[0];
    console.log(`👤 Account: ${account.username} (Container: ${account.container_number})`);
    
    // Get phase data with content
    const phaseResult = await db.query(`
      SELECT 
        awp.id,
        awp.phase,
        awp.status,
        awp.assigned_content_id,
        awp.assigned_text_id,
        
        -- Content info
        cc.filename as content_filename,
        cc.file_path as content_file_path,
        cc.original_name as content_original_name,
        
        -- Text content info
        ctc.text_content,
        ctc.categories as text_categories
        
      FROM account_warmup_phases awp
      LEFT JOIN central_content cc ON awp.assigned_content_id = cc.id
      LEFT JOIN central_text_content ctc ON awp.assigned_text_id = ctc.id
      WHERE awp.account_id = $1 AND awp.phase = $2
    `, [accountId, phase]);
    
    if (phaseResult.rows.length === 0) {
      throw new Error(`Phase ${phase} not found for account ${accountId}`);
    }
    
    const phaseData = phaseResult.rows[0];
    console.log(`📋 Phase: ${phaseData.phase} (Status: ${phaseData.status})`);
    
    const baseUrl = `http://${iphoneIP}:${iphonePort}`;
    const results = {
      phase: phase,
      content_sent: false,
      text_sent: false,
      errors: []
    };
    
    // Send text content to clipboard if exists
    if (phaseData.text_content) {
      try {
        console.log(`📝 Sending text to clipboard: "${phaseData.text_content.substring(0, 50)}..."`);
        
        const clipboard = new ClipboardAPI(baseUrl);
        const clipboardResult = await clipboard.setText(phaseData.text_content);
        
        if (clipboardResult.success) {
          results.text_sent = true;
          console.log(`✅ Text sent to iPhone clipboard successfully`);
        } else {
          results.errors.push(`Failed to send text to clipboard: ${clipboardResult.error}`);
        }
      } catch (error) {
        results.errors.push(`Clipboard API error: ${error.message}`);
      }
    } else {
      console.log(`ℹ️  No text content assigned for phase ${phase}`);
    }
    
    // Send image content to gallery if exists
    if (phaseData.content_file_path) {
      try {
        const fullPath = path.resolve(__dirname, '../../uploads', phaseData.content_file_path);
        console.log(`🖼️  Sending image to gallery: ${phaseData.content_filename}`);
        console.log(`   File path: ${fullPath}`);
        
        if (fs.existsSync(fullPath)) {
          // IMPORTANT: Clean iPhone gallery before sending new images
          console.log(`🧹 Cleaning iPhone gallery before sending image...`);
          try {
            // Use simple cleaner by default (no respring required)
            const photoCleaner = useNuclearCleaner ? new iOS16PhotoCleaner() : new SimplePhotoCleaner();
            
            if (useNuclearCleaner) {
              console.log(`💥 Using nuclear cleaner (will cause iPhone respring)...`);
              await photoCleaner.performiOS16Cleanup();
              // Wait longer for system to stabilize after nuclear cleanup
              console.log(`⏳ Waiting for iPhone to stabilize after nuclear cleanup...`);
              await new Promise(resolve => setTimeout(resolve, 10000));
            } else {
              console.log(`🧹 Using simple cleaner (no respring required)...`);
              await photoCleaner.performSimpleCleanup();
              // Short wait for simple cleanup
              console.log(`⏳ Waiting for Photos app to refresh...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            console.log(`✅ iPhone gallery cleaned successfully`);
            
          } catch (cleanError) {
            console.warn(`⚠️  Photo cleaning failed: ${cleanError.message}`);
            if (!useNuclearCleaner) {
              console.log(`💡 Tip: Try with nuclear cleaner if simple cleaning fails repeatedly`);
            }
            results.errors.push(`Photo cleaning failed: ${cleanError.message}`);
            // Continue anyway - cleaning failure shouldn't stop the process
          }
          
          // Now send the image
          console.log(`📤 Sending image to cleaned gallery...`);
          const gallery = new GalleryAPI(baseUrl);
          const galleryResult = await gallery.addImage(fullPath);
          
          if (galleryResult.success) {
            results.content_sent = true;
            console.log(`✅ Image sent to iPhone gallery successfully (${galleryResult.fileSizeKB} KB)`);
          } else {
            results.errors.push(`Failed to send image to gallery: ${galleryResult.error}`);
          }
        } else {
          results.errors.push(`Image file not found: ${fullPath}`);
        }
      } catch (error) {
        results.errors.push(`Gallery API error: ${error.message}`);
      }
    } else {
      console.log(`ℹ️  No image content assigned for phase ${phase}`);
    }
    
    // Summary
    const success = (results.content_sent || results.text_sent) && results.errors.length === 0;
    
    if (success) {
      console.log(`🎉 Content successfully sent to iPhone for phase ${phase}`);
      console.log(`   📝 Text sent: ${results.text_sent}`);
      console.log(`   🖼️  Image sent: ${results.content_sent}`);
    } else {
      console.log(`❌ Failed to send content to iPhone:`);
      results.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    return results;
    
  } catch (error) {
    console.error('💥 Send to iPhone failed:', error.message);
    throw error;
  }
}

async function sendAllPhasesToIphone(accountId, iphoneIP = '192.168.178.65', iphonePort = 46952, useNuclearCleaner = true) {
  try {
    console.log(`📱 Sending all phase content to iPhone for account ${accountId}`);
    
    // Get all phases with content for this account
    const phasesResult = await db.query(`
      SELECT DISTINCT awp.phase
      FROM account_warmup_phases awp
      WHERE awp.account_id = $1 
        AND (awp.assigned_content_id IS NOT NULL OR awp.assigned_text_id IS NOT NULL)
        AND awp.phase NOT IN ('manual_setup', 'gender')
      ORDER BY awp.phase
    `, [accountId]);
    
    const phases = phasesResult.rows.map(row => row.phase);
    console.log(`📋 Found ${phases.length} phases with content: ${phases.join(', ')}`);
    
    const results = [];
    
    for (const phase of phases) {
      try {
        console.log(`\n--- Processing phase: ${phase} ---`);
        const result = await sendContentToIphone(accountId, phase, iphoneIP, iphonePort);
        results.push({ phase, success: true, ...result });
        
        // Small delay between phases to avoid overwhelming the iPhone
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Failed to send content for phase ${phase}:`, error.message);
        results.push({ phase, success: false, error: error.message });
      }
    }
    
    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`\n🎉 Bulk send completed:`);
    console.log(`   ✅ Successful: ${successful}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📊 Total phases: ${phases.length}`);
    
    return results;
    
  } catch (error) {
    console.error('💥 Bulk send to iPhone failed:', error.message);
    throw error;
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📖 Usage:');
    console.log('  node send-to-iphone.js <account_id> [phase] [iphone_ip] [iphone_port] [--simple]');
    console.log('');
    console.log('Examples:');
    console.log('  node send-to-iphone.js 71 bio');
    console.log('  node send-to-iphone.js 71 bio 192.168.1.100 46952');
    console.log('  node send-to-iphone.js 71  # Send all phases');
    console.log('  node send-to-iphone.js 71 bio --simple  # Use simple cleaner (no respring)');
    console.log('');
    console.log('Cleaner Options:');
    console.log('  Default: Nuclear cleaner (thorough, causes iPhone respring)');
    console.log('  --simple: Simple cleaner (faster, no respring)');
    process.exit(1);
  }
  
  // Check for simple cleaner flag (nuclear is now default)
  const useSimpleCleaner = args.includes('--simple');
  const filteredArgs = args.filter(arg => arg !== '--simple');
  const useNuclearCleaner = !useSimpleCleaner; // Nuclear is default
  
  const accountId = parseInt(filteredArgs[0]);
  const phase = filteredArgs[1];
  const iphoneIP = filteredArgs[2] || '192.168.178.65';
  const iphonePort = parseInt(filteredArgs[3]) || 46952;
  
  try {
    if (phase) {
      await sendContentToIphone(accountId, phase, iphoneIP, iphonePort, useNuclearCleaner);
    } else {
      await sendAllPhasesToIphone(accountId, iphoneIP, iphonePort, useNuclearCleaner);
    }
  } catch (error) {
    console.error('Script failed:', error.message);
    process.exit(1);
  } finally {
    await db.end();
  }
}

// Export functions for use as module
module.exports = {
  sendContentToIphone,
  sendAllPhasesToIphone
};

// Run main if called directly
if (require.main === module) {
  main().catch(console.error);
}