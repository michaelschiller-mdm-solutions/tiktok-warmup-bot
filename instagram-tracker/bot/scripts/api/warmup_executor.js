/**
 * Warmup Executor Script
 * 
 * This script bridges the WarmupQueueService with AutomationBridge
 * to execute iPhone automation for warmup phases.
 */

const AutomationBridge = require('../../services/AutomationBridge');
const path = require('path');

class WarmupExecutor {
  constructor() {
    this.bridge = new AutomationBridge({
      iphoneIP: process.env.IPHONE_IP || '192.168.178.65',
      iphonePort: process.env.IPHONE_PORT || 46952
    });
  }

  async executePhase(accountId, containerNumber, phase, username) {
    try {
      console.log(`🤖 Executing phase ${phase} for account ${username} on container ${containerNumber}`);

      // Select the container first
      await this.bridge.selectContainer(containerNumber);

      // Get the script sequence for this phase
      const scriptSequence = this.bridge.getScriptSequence(containerNumber);
      const phaseScript = this.getPhaseScript(phase);

      if (!phaseScript) {
        throw new Error(`No script mapping found for phase: ${phase}`);
      }

      console.log(`📜 Executing script: ${phaseScript}`);

      // Execute the phase-specific script
      const result = await this.bridge.executeScript(phaseScript, {
        timeout: 120000, // 2 minutes
        retries: 3
      });

      console.log(`✅ Phase ${phase} completed successfully for ${username}`);

      return {
        success: true,
        phase,
        accountId,
        containerNumber,
        scriptExecuted: phaseScript,
        result
      };

    } catch (error) {
      console.error(`❌ Phase ${phase} failed for ${username}:`, error.message);

      return {
        success: false,
        phase,
        accountId,
        containerNumber,
        error: error.message,
        stack: error.stack
      };
    }
  }

  /**
   * Map warmup phases to their corresponding Lua scripts
   */
  getPhaseScript(phase) {
    const scriptMapping = {
      'bio': 'change_bio_to_clipboard.lua',
      'set_to_private': 'set_private.lua',
      'gender': 'change_gender_female.lua',
      'name': 'change_name_to_clipboard.lua',
      'username': 'change_username_to_clipboard.lua',
      'first_highlight': 'upload_highlight_to_clipboard.lua',
      'new_highlight': 'upload_highlight_to_clipboard.lua',
      'post_caption': 'upload_post_with_caption.lua',
      'post_no_caption': 'upload_post_no_caption.lua',
      'story_caption': 'upload_story_with_caption.lua',
      'story_no_caption': 'upload_story_no_caption.lua'
    };

    return scriptMapping[phase] || null;
  }
}

/**
 * Main execution function for command line usage
 */
async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const options = {};

    for (let i = 0; i < args.length; i += 2) {
      const key = args[i].replace('--', '');
      const value = args[i + 1];
      options[key] = value;
    }

    const { 'account-id': accountId, 'container-number': containerNumber, phase, username } = options;

    if (!accountId || !containerNumber || !phase || !username) {
      throw new Error('Missing required arguments: --account-id, --container-number, --phase, --username');
    }

    // Execute the warmup phase
    const executor = new WarmupExecutor();
    const result = await executor.executePhase(
      parseInt(accountId),
      parseInt(containerNumber),
      phase,
      username
    );

    // Output result as JSON for the parent process
    console.log(JSON.stringify(result, null, 2));

    // Exit with appropriate code
    process.exit(result.success ? 0 : 1);

  } catch (error) {
    console.error('💥 Warmup executor error:', error.message);
    
    // Output error as JSON
    console.log(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }, null, 2));

    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = WarmupExecutor; 