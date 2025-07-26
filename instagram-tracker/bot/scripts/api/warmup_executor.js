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

  async executePhase(accountId, containerNumber, phase, username, skipOnboarding = false) {
    try {
      console.log(`🤖 Executing phase ${phase} for account ${username} on container ${containerNumber}`);

      // Select the container first
      await this.bridge.selectContainer(containerNumber);

      let skipOnboardingExecuted = false;

      // Execute skip_onboarding.lua if requested by backend
      if (skipOnboarding) {
        console.log(`🎯 FIRST TIME AUTOMATION DETECTED for ${username}!`);
        console.log(`📱 Executing skip_onboarding.lua before main phase...`);
        
        try {
          // Execute skip_onboarding.lua first
          const skipOnboardingResult = await this.bridge.executeScript('skip_onboarding.lua', {
            timeout: 60000, // 1 minute
            retries: 2
          });
          
          if (!skipOnboardingResult.success) {
            throw new Error(`skip_onboarding.lua failed: ${skipOnboardingResult.error}`);
          }
          
          console.log(`✅ skip_onboarding.lua completed successfully for ${username}`);
          skipOnboardingExecuted = true;
          
        } catch (skipError) {
          console.error(`❌ skip_onboarding.lua failed for ${username}:`, skipError.message);
          // Don't fail the entire phase if skip_onboarding fails - log and continue
          console.log(`⚠️  Continuing with main phase despite skip_onboarding failure`);
        }
      } else {
        console.log(`⏭️  Skip onboarding not needed for ${username}`);
      }

      // Get the script sequence for this phase
      const scriptSequence = this.bridge.getScriptSequence(containerNumber);
      const phaseScript = this.getPhaseScript(phase);

      if (!phaseScript) {
        throw new Error(`No script mapping found for phase: ${phase}`);
      }

      // Handle manual phases
      if (phaseScript === 'MANUAL_PHASE') {
        console.log(`📋 Phase ${phase} is manual - skipping automation`);
        return {
          success: true,
          phase,
          accountId,
          containerNumber,
          scriptExecuted: 'MANUAL_PHASE',
          skipOnboardingExecuted,
          message: `Manual phase ${phase} completed (no automation required)`
        };
      }

      console.log(`📜 Executing main phase script: ${phaseScript}`);

      // Execute the phase-specific script
      const result = await this.bridge.executeScript(phaseScript, {
        timeout: 120000, // 2 minutes
        retries: 3
      });

      console.log(`✅ Phase ${phase} completed successfully for ${username}`);

      // Note: Database username update is handled by the WarmupQueueService after phase completion

      return {
        success: true,
        phase,
        accountId,
        containerNumber,
        scriptExecuted: phaseScript,
        skipOnboardingExecuted,
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
   * Updated to match actual script names in instagram-tracker/bot/scripts/iphone_lua/
   */
  getPhaseScript(phase) {
    // Manual phases that don't require automation
    const manualPhases = ['manual_setup', 'instagram_set_private'];
    
    if (manualPhases.includes(phase)) {
      return 'MANUAL_PHASE'; // Special marker for manual phases
    }

    const scriptMapping = {
      'bio': 'change_bio_to_clipboard.lua',
      'set_to_private': 'set_account_private.lua',
      'gender': 'change_gender_to_female.lua',
      'name': 'change_name_to_clipboard.lua',
      'username': 'change_username_to_clipboard.lua',
      'first_highlight': 'upload_first_highlight_group_with_clipboard_name_newest_media_no_caption.lua',
      'new_highlight': 'upload_new_highlightgroup_clipboard_name_newest_media_no_caption.lua',
      'post_caption': 'upload_post_newest_media_clipboard_caption.lua',
      'post_no_caption': 'upload_post_newest_media_no_caption.lua',
      'story_caption': 'upload_story_newest_media_clipboard_caption.lua',
      'story_no_caption': 'upload_story_newest_media_no_caption.lua'
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

    const { 
      'account-id': accountId, 
      'container-number': containerNumber, 
      phase, 
      username,
      'skip-onboarding': skipOnboarding
    } = options;

    if (!accountId || !containerNumber || !phase || !username) {
      throw new Error('Missing required arguments: --account-id, --container-number, --phase, --username');
    }

    // Convert skip-onboarding to boolean
    const shouldSkipOnboarding = skipOnboarding === 'true';

    // Execute the warmup phase
    const executor = new WarmupExecutor();
    const result = await executor.executePhase(
      parseInt(accountId),
      parseInt(containerNumber),
      phase,
      username,
      shouldSkipOnboarding
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