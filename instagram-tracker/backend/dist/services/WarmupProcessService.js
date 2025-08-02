"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WarmupProcessService = void 0;
const path_1 = __importDefault(require("path"));
const database_1 = require("../database");
const warmupProcess_1 = require("../types/warmupProcess");
class WarmupProcessService {
    async initializeWarmupPhases(accountId) {
        try {
            await database_1.db.query("SELECT initialize_warmup_phases_with_content($1)", [
                accountId,
            ]);
        }
        catch (error) {
            console.error(`Error initializing warmup phases for account ${accountId}:`, error);
            throw new Error("Failed to initialize warmup phases");
        }
    }
    async assignContentToAllPhases(accountId) {
        try {
            const result = await database_1.db.query("SELECT assign_content_to_all_phases($1) as assigned_count", [accountId]);
            const assignedCount = result.rows[0].assigned_count;
            if (assignedCount > 0) {
                console.log(`Assigned content to ${assignedCount} phases for account ${accountId}`);
            }
            else {
                console.log(`No phases needed content assignment for account ${accountId} (may already be assigned)`);
            }
        }
        catch (error) {
            console.error(`Error assigning content to all phases for account ${accountId}:`, error);
            throw new Error("Failed to assign content to all phases");
        }
    }
    async ensureContentAssigned(accountId) {
        try {
            const statusResult = await database_1.db.query(`
        SELECT is_content_assignment_complete($1) as is_complete
      `, [accountId]);
            const isComplete = statusResult.rows[0].is_complete;
            if (!isComplete) {
                console.log(`Content assignment incomplete for account ${accountId}, assigning now...`);
                await this.assignContentToAllPhases(accountId);
            }
        }
        catch (error) {
            console.error(`Error ensuring content assigned for account ${accountId}:`, error);
        }
    }
    async getReadyAccounts(modelId, limit = 50) {
        try {
            let query = `
        SELECT 
          id, username, model_id, lifecycle_state, model_name, container_number,
          total_phases, completed_phases, ready_phases, next_phase_info
        FROM bot_ready_accounts
      `;
            const params = [];
            if (modelId) {
                query += ` WHERE model_id = $1`;
                params.push(modelId);
            }
            query += ` ORDER BY ready_phases DESC, completed_phases ASC LIMIT $${params.length + 1}`;
            params.push(limit);
            const result = await database_1.db.query(query, params);
            return result.rows;
        }
        catch (error) {
            console.error("Error fetching ready accounts:", error);
            throw new Error("Failed to fetch ready accounts");
        }
    }
    async canBotStartWork(botId) {
        try {
            const result = await database_1.db.query("SELECT can_bot_start_work($1) as can_start", [botId]);
            return result.rows[0].can_start;
        }
        catch (error) {
            console.error("Error checking bot constraint:", error);
            return false;
        }
    }
    async startWarmupProcess(accountId, botId, sessionId) {
        try {
            const canStart = await this.canBotStartWork(botId);
            if (!canStart) {
                return {
                    success: false,
                    accountId,
                    message: "Another account is currently being processed by a bot",
                    error: "Bot constraint violation",
                };
            }
            const accountResult = await database_1.db.query(`
        SELECT id, username, container_number, lifecycle_state 
        FROM accounts 
        WHERE id = $1
      `, [accountId]);
            if (accountResult.rows.length === 0) {
                return {
                    success: false,
                    accountId,
                    message: "Account not found",
                    error: "Account not found",
                };
            }
            const account = accountResult.rows[0];
            if (!account.container_number) {
                return {
                    success: false,
                    accountId,
                    message: "Account must have container assigned before starting warmup",
                    error: "No container assigned",
                };
            }
            await database_1.db.query(`
        UPDATE accounts 
        SET lifecycle_state = 'warmup',
            state_changed_at = CURRENT_TIMESTAMP,
            state_changed_by = $2,
            last_bot_action_by = $2,
            last_bot_action_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [accountId, botId]);
            await this.initializeWarmupPhases(accountId);
            const manualPhaseResult = await database_1.db.query(`
        SELECT id, phase, status FROM account_warmup_phases 
        WHERE account_id = $1 AND phase = 'manual_setup'
      `, [accountId]);
            return {
                success: true,
                accountId,
                message: "Warmup process started successfully. Account ready for manual setup.",
                nextPhase: warmupProcess_1.WarmupPhase.MANUAL_SETUP,
                containerNumber: account.container_number,
            };
        }
        catch (error) {
            console.error(`Error starting warmup for account ${accountId}:`, error);
            return {
                success: false,
                accountId,
                message: "Failed to start warmup process",
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }
    async completeManualSetup(accountId, changedBy) {
        try {
            const accountResult = await database_1.db.query("SELECT lifecycle_state FROM accounts WHERE id = $1", [accountId]);
            if (accountResult.rows.length === 0) {
                return {
                    success: false,
                    accountId,
                    message: "Account not found",
                    error: "ACCOUNT_NOT_FOUND",
                };
            }
            const currentState = accountResult.rows[0].lifecycle_state;
            if (currentState !== "imported") {
                return {
                    success: false,
                    accountId,
                    message: `Account is not in 'imported' state (current: ${currentState}). Cannot complete manual setup.`,
                    error: "INVALID_STATE_TRANSITION",
                };
            }
            await database_1.db.query(`
        UPDATE accounts 
        SET lifecycle_state = 'ready',
            state_changed_at = CURRENT_TIMESTAMP,
            state_changed_by = $2
        WHERE id = $1
      `, [accountId, changedBy]);
            await this.initializeWarmupPhases(accountId);
            return {
                success: true,
                accountId,
                message: "Manual setup complete. Account is now ready for warmup.",
            };
        }
        catch (error) {
            console.error(`Error completing manual setup for account ${accountId}:`, error);
            return {
                success: false,
                accountId,
                message: "Failed to complete manual setup",
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }
    async getAvailablePhases(accountId) {
        try {
            const result = await database_1.db.query(`
        SELECT 
          awp.id, awp.phase, awp.status, awp.available_at, awp.started_at, 
          awp.assigned_content_id, awp.assigned_text_id, awp.content_assigned_at,
          awp.error_message, awp.retry_count, awp.max_retries,
          
          -- Content info
          cc.filename as content_filename,
          cc.original_name as content_original_name,
          cc.file_path as content_file_path,
          cc.content_type as content_type,
          cc.categories as content_categories,
          
          -- Text content info
          ctc.text_content,
          ctc.categories as text_categories,
          ctc.template_name as text_template_name
          
        FROM account_warmup_phases awp
        LEFT JOIN central_content cc ON awp.assigned_content_id = cc.id
        LEFT JOIN central_text_content ctc ON awp.assigned_text_id = ctc.id
        WHERE awp.account_id = $1 
          AND awp.status = 'available' 
          AND awp.available_at <= CURRENT_TIMESTAMP
        ORDER BY awp.available_at ASC
      `, [accountId]);
            return result.rows;
        }
        catch (error) {
            console.error(`Error fetching available phases for account ${accountId}:`, error);
            throw new Error("Failed to fetch available phases");
        }
    }
    async assignContentToPhase(accountId, phaseId, phase) {
        try {
            const accountResult = await database_1.db.query(`
        SELECT model_id FROM accounts WHERE id = $1
      `, [accountId]);
            if (accountResult.rows.length === 0) {
                throw new Error("Account not found");
            }
            const modelId = accountResult.rows[0].model_id;
            let contentId = null;
            let textId = null;
            switch (phase) {
                case warmupProcess_1.WarmupPhase.BIO:
                    const bioResult = await database_1.db.query(`
            SELECT id FROM central_text_content 
            WHERE categories @> '["bio"]'::jsonb 
            AND status = 'active'
            ORDER BY RANDOM() LIMIT 1
          `);
                    textId = bioResult.rows.length > 0 ? bioResult.rows[0].id : null;
                    break;
                case warmupProcess_1.WarmupPhase.NAME:
                    try {
                        const modelNameResult = await database_1.db.query(`
              SELECT m.name as model_name
              FROM accounts a
              JOIN models m ON a.model_id = m.id
              WHERE a.id = $1
            `, [accountId]);
                        if (modelNameResult.rows.length > 0) {
                            const modelName = modelNameResult.rows[0].model_name;
                            const textResult = await database_1.db.query(`
                INSERT INTO central_text_content (
                  text_content, 
                  categories, 
                  template_name, 
                  status
                ) VALUES ($1, $2, $3, $4)
                ON CONFLICT (text_content) DO UPDATE SET updated_at = NOW()
                RETURNING id
              `, [
                                modelName,
                                JSON.stringify(["name", "model_derived"]),
                                `Model Name: ${modelName}`,
                                "active",
                            ]);
                            textId = textResult.rows[0].id;
                            console.log(`📝 Using model name "${modelName}" for name phase`);
                        }
                        else {
                            console.warn(`⚠️ Could not find model name for account ${accountId}, falling back to random name`);
                            const nameResult = await database_1.db.query(`
                SELECT id FROM central_text_content 
                WHERE categories @> '["name"]'::jsonb 
                AND status = 'active'
                ORDER BY RANDOM() LIMIT 1
              `);
                            textId = nameResult.rows.length > 0 ? nameResult.rows[0].id : null;
                        }
                    }
                    catch (nameError) {
                        console.warn("Model name assignment failed, using fallback:", nameError);
                        const nameResult = await database_1.db.query(`
              SELECT id FROM central_text_content 
              WHERE categories @> '["name"]'::jsonb 
              AND status = 'active'
              ORDER BY RANDOM() LIMIT 1
            `);
                        textId = nameResult.rows.length > 0 ? nameResult.rows[0].id : null;
                    }
                    break;
                case warmupProcess_1.WarmupPhase.FIRST_HIGHLIGHT:
                case warmupProcess_1.WarmupPhase.NEW_HIGHLIGHT:
                    try {
                        const bundleResult = await database_1.db.query(`
              SELECT cb.id, cb.name 
              FROM model_bundle_assignments mba
              JOIN content_bundles cb ON mba.bundle_id = cb.id
              JOIN bundle_content_assignments bca ON cb.id = bca.bundle_id
              JOIN central_content cc ON bca.content_id = cc.id
              WHERE mba.model_id = $1 
                AND cc.categories @> '["highlight"]'::jsonb 
                AND cc.status = 'active'
                AND mba.assignment_type IN ('active', 'auto')
                AND cb.status = 'active'
              ORDER BY RANDOM() 
              LIMIT 1
            `, [modelId]);
                        if (bundleResult.rows.length > 0) {
                            const bundle = bundleResult.rows[0];
                            const bundleContentResult = await database_1.db.query(`
                SELECT cc.id 
                FROM bundle_content_assignments bca
                JOIN central_content cc ON bca.content_id = cc.id
                WHERE bca.bundle_id = $1 
                  AND cc.categories @> '["highlight"]'::jsonb 
                  AND cc.status = 'active'
                ORDER BY RANDOM() 
                LIMIT 1
              `, [bundle.id]);
                            if (bundleContentResult.rows.length > 0) {
                                contentId = bundleContentResult.rows[0].id;
                                const textResult = await database_1.db.query(`
                  INSERT INTO central_text_content (
                    text_content, 
                    categories, 
                    template_name, 
                    status
                  ) VALUES ($1, $2, $3, $4)
                  RETURNING id
                `, [
                                    bundle.name,
                                    JSON.stringify(["highlight_group_name", "bundle_derived"]),
                                    `Bundle: ${bundle.name}`,
                                    "active",
                                ]);
                                textId = textResult.rows[0].id;
                            }
                        }
                        if (!contentId) {
                            const fallbackResult = await database_1.db.query(`
                SELECT id FROM central_content 
                WHERE categories @> '["highlight"]'::jsonb 
                AND status = 'active'
                ORDER BY RANDOM() LIMIT 1
              `);
                            contentId =
                                fallbackResult.rows.length > 0
                                    ? fallbackResult.rows[0].id
                                    : null;
                        }
                    }
                    catch (bundleError) {
                        console.warn("Bundle assignment failed for highlight, using fallback:", bundleError);
                        const fallbackResult = await database_1.db.query(`
              SELECT id FROM central_content 
              WHERE categories @> '["highlight"]'::jsonb 
              AND status = 'active'
              ORDER BY RANDOM() LIMIT 1
            `);
                        contentId =
                            fallbackResult.rows.length > 0 ? fallbackResult.rows[0].id : null;
                    }
                    break;
                case warmupProcess_1.WarmupPhase.POST_CAPTION:
                    const postContentResult = await database_1.db.query(`
            SELECT id FROM central_content 
            WHERE categories @> '["post"]'::jsonb 
            AND status = 'active'
            ORDER BY RANDOM() LIMIT 1
          `);
                    contentId =
                        postContentResult.rows.length > 0
                            ? postContentResult.rows[0].id
                            : null;
                    const postTextResult = await database_1.db.query(`
            SELECT id FROM central_text_content 
            WHERE categories @> '["post"]'::jsonb 
            AND status = 'active'
            ORDER BY RANDOM() LIMIT 1
          `);
                    textId =
                        postTextResult.rows.length > 0 ? postTextResult.rows[0].id : null;
                    break;
                case warmupProcess_1.WarmupPhase.POST_NO_CAPTION:
                    const postNoTextResult = await database_1.db.query(`
            SELECT id FROM central_content 
            WHERE categories @> '["post"]'::jsonb 
            AND status = 'active'
            ORDER BY RANDOM() LIMIT 1
          `);
                    contentId =
                        postNoTextResult.rows.length > 0
                            ? postNoTextResult.rows[0].id
                            : null;
                    break;
                case warmupProcess_1.WarmupPhase.STORY_CAPTION:
                    const storyContentResult = await database_1.db.query(`
            SELECT id FROM central_content 
            WHERE categories @> '["story"]'::jsonb 
            AND status = 'active'
            ORDER BY RANDOM() LIMIT 1
          `);
                    contentId =
                        storyContentResult.rows.length > 0
                            ? storyContentResult.rows[0].id
                            : null;
                    const storyTextResult = await database_1.db.query(`
            SELECT id FROM central_text_content 
            WHERE categories @> '["story"]'::jsonb 
            AND status = 'active'
            ORDER BY RANDOM() LIMIT 1
          `);
                    textId =
                        storyTextResult.rows.length > 0 ? storyTextResult.rows[0].id : null;
                    break;
                case warmupProcess_1.WarmupPhase.STORY_NO_CAPTION:
                    const storyNoTextResult = await database_1.db.query(`
            SELECT id FROM central_content 
            WHERE categories @> '["story"]'::jsonb 
            AND status = 'active'
            ORDER BY RANDOM() LIMIT 1
          `);
                    contentId =
                        storyNoTextResult.rows.length > 0
                            ? storyNoTextResult.rows[0].id
                            : null;
                    break;
                default:
                    console.log(`No content assignment needed for phase: ${phase}`);
                    return true;
            }
            if (contentId || textId) {
                await database_1.db.query(`
          UPDATE account_warmup_phases 
          SET 
            assigned_content_id = $2,
            assigned_text_id = $3,
            content_assigned_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [phaseId, contentId, textId]);
                console.log(`Assigned content to phase ${phase}: content_id=${contentId}, text_id=${textId}`);
                return true;
            }
            else {
                console.warn(`No content found for phase ${phase}`);
                return false;
            }
        }
        catch (error) {
            console.error(`Error assigning content to phase ${phase}:`, error);
            return false;
        }
    }
    async getWarmupStatus(accountId) {
        try {
            const result = await database_1.db.query(`
        SELECT 
          a.id as account_id,
          a.username,
          a.lifecycle_state,
          a.container_number,
          a.last_bot_action_by,
          a.last_bot_action_at,
          
          -- Phase summary
          COUNT(awp.id) as total_phases,
          COUNT(CASE WHEN awp.status = 'completed' THEN 1 END) as completed_phases,
          COUNT(CASE WHEN awp.status = 'available' AND awp.available_at <= CURRENT_TIMESTAMP THEN 1 END) as available_phases,
          COUNT(CASE WHEN awp.status = 'failed' THEN 1 END) as failed_phases,
          COUNT(CASE WHEN awp.status = 'requires_review' THEN 1 END) as review_phases,
          
          -- Progress calculation (excluding manual_setup)
          CASE 
            WHEN COUNT(CASE WHEN awp.phase != 'manual_setup' THEN 1 END) > 0 THEN 
              ROUND((COUNT(CASE WHEN awp.status = 'completed' AND awp.phase != 'manual_setup' THEN 1 END)::decimal / 
                     COUNT(CASE WHEN awp.phase != 'manual_setup' THEN 1 END)) * 100, 2)
            ELSE 0 
          END as progress_percent,
          
          -- Check if warmup is complete
          is_warmup_complete(a.id) as is_complete,
          
          -- Phase details with content info
          json_agg(
            json_build_object(
              'id', awp.id,
              'phase', awp.phase,
              'status', awp.status,
              'available_at', awp.available_at,
              'started_at', awp.started_at,
              'completed_at', awp.completed_at,
              'error_message', awp.error_message,
              'retry_count', awp.retry_count,
              'max_retries', awp.max_retries,
              'bot_id', awp.bot_id,
              'execution_time_ms', awp.execution_time_ms,
              'assigned_content', CASE 
                WHEN awp.assigned_content_id IS NOT NULL THEN
                  json_build_object(
                    'id', cc.id,
                    'filename', cc.filename,
                    'original_name', cc.original_name,
                    'file_path', cc.file_path,
                    'content_type', cc.content_type,
                    'categories', cc.categories
                  )
                ELSE NULL
              END,
              'assigned_text', CASE 
                WHEN awp.assigned_text_id IS NOT NULL THEN
                  json_build_object(
                    'id', ctc.id,
                    'text_content', ctc.text_content,
                    'categories', ctc.categories,
                    'template_name', ctc.template_name
                  )
                ELSE NULL
              END
            ) ORDER BY 
              CASE awp.phase 
                WHEN 'manual_setup' THEN 0
                WHEN 'bio' THEN 1 
                WHEN 'gender' THEN 2 
                WHEN 'name' THEN 3 
                WHEN 'username' THEN 4 
                WHEN 'first_highlight' THEN 5 
                WHEN 'new_highlight' THEN 6 
                WHEN 'post_caption' THEN 7 
                WHEN 'post_no_caption' THEN 8 
                WHEN 'story_caption' THEN 9 
                WHEN 'story_no_caption' THEN 10 
              END
          ) as phases
          
        FROM accounts a
        LEFT JOIN account_warmup_phases awp ON a.id = awp.account_id
        LEFT JOIN central_content cc ON awp.assigned_content_id = cc.id
        LEFT JOIN central_text_content ctc ON awp.assigned_text_id = ctc.id
        WHERE a.id = $1
        GROUP BY a.id, a.username, a.lifecycle_state, a.container_number, a.last_bot_action_by, a.last_bot_action_at
      `, [accountId]);
            if (result.rows.length === 0) {
                throw new Error("Account not found");
            }
            return result.rows[0];
        }
        catch (error) {
            console.error(`Error fetching warmup status for account ${accountId}:`, error);
            throw new Error("Failed to fetch warmup status");
        }
    }
    async startPhase(accountId, phase, botId, sessionId) {
        try {
            const canStart = await this.canBotStartWork(botId);
            if (!canStart) {
                return {
                    success: false,
                    accountId,
                    message: "Another account is currently being processed by a bot",
                    error: "Bot constraint violation",
                };
            }
            const phaseResult = await database_1.db.query(`
        SELECT id, assigned_content_id, assigned_text_id FROM account_warmup_phases 
        WHERE account_id = $1 AND phase = $2 AND status = 'available'
      `, [accountId, phase]);
            if (phaseResult.rows.length === 0) {
                return {
                    success: false,
                    accountId,
                    message: `Phase ${phase} is not available for account ${accountId}`,
                    error: "Phase not available",
                };
            }
            const phaseData = phaseResult.rows[0];
            if (!phaseData.assigned_content_id && !phaseData.assigned_text_id) {
                await this.assignContentToPhase(accountId, phaseData.id, phase);
            }
            const result = await database_1.db.query(`
        UPDATE account_warmup_phases 
        SET 
          status = 'in_progress'::warmup_phase_status,
          started_at = CURRENT_TIMESTAMP,
          bot_id = $3,
          bot_session_id = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE account_id = $1 AND phase = $2 AND status = 'available'::warmup_phase_status
        RETURNING id
      `, [accountId, phase, botId, sessionId]);
            if (result.rows.length === 0) {
                return {
                    success: false,
                    accountId,
                    message: `Phase ${phase} is not available for account ${accountId}`,
                    error: "Phase not available",
                };
            }
            return {
                success: true,
                accountId,
                message: `Phase ${phase} started successfully`,
                phase,
                phaseId: result.rows[0].id,
            };
        }
        catch (error) {
            console.error(`Error starting phase ${phase} for account ${accountId}:`, error);
            return {
                success: false,
                accountId,
                message: `Failed to start phase ${phase}`,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }
    async completePhase(accountId, phase, botId, executionTimeMs, instagramResponse) {
        try {
            const result = await database_1.db.query(`
        UPDATE account_warmup_phases 
        SET 
          status = 'completed'::warmup_phase_status,
          completed_at = CURRENT_TIMESTAMP,
          execution_time_ms = $3,
          instagram_response = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE account_id = $1 AND phase = $2 AND bot_id = $5 AND status = 'in_progress'::warmup_phase_status
        RETURNING id
      `, [
                accountId,
                phase,
                executionTimeMs,
                JSON.stringify(instagramResponse),
                botId,
            ]);
            if (result.rows.length === 0) {
                return {
                    success: false,
                    accountId,
                    message: `Phase ${phase} could not be completed - not in progress by this bot`,
                    error: "Phase not in progress",
                };
            }
            const isComplete = await this.isWarmupComplete(accountId);
            if (isComplete) {
                const accountResult = await database_1.db.query("SELECT container_number FROM accounts WHERE id = $1", [accountId]);
                if (accountResult.rows.length > 0 &&
                    accountResult.rows[0].container_number) {
                    const containerNumber = accountResult.rows[0].container_number;
                    try {
                        console.log(`[WarmupProcess] Setting account ${accountId} to private after warmup completion`);
                        await this.setAccountPrivate(containerNumber);
                        console.log(`[WarmupProcess] ✅ Account ${accountId} set to private successfully`);
                    }
                    catch (privateError) {
                        console.warn(`[WarmupProcess] ⚠️ Failed to set account ${accountId} to private:`, privateError.message);
                    }
                }
                await database_1.db.query(`
          UPDATE accounts 
          SET lifecycle_state = 'active',
              state_changed_at = CURRENT_TIMESTAMP,
              state_changed_by = $2,
              last_bot_action_by = $2,
              last_bot_action_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [accountId, botId]);
            }
            else {
                await database_1.db.query(`
          UPDATE accounts 
          SET last_bot_action_by = $2,
              last_bot_action_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [accountId, botId]);
            }
            return {
                success: true,
                accountId,
                message: isComplete
                    ? `Phase ${phase} completed successfully. Warmup complete - account is now active!`
                    : `Phase ${phase} completed successfully. Next phase will be available after cooldown.`,
                phase,
                phaseId: result.rows[0].id,
                warmupComplete: isComplete,
            };
        }
        catch (error) {
            console.error(`Error completing phase ${phase} for account ${accountId}:`, error);
            return {
                success: false,
                accountId,
                message: `Failed to complete phase ${phase}`,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }
    async failPhase(accountId, phase, botId, errorMessage, errorDetails, failureCategory, forceEscalateToReview) {
        try {
            const shouldEscalateToReview = forceEscalateToReview ||
                failureCategory === "instagram_challenge" ||
                failureCategory === "account_suspended" ||
                failureCategory === "captcha";
            const result = await database_1.db.query(`
        UPDATE account_warmup_phases 
        SET 
          status = CASE 
            WHEN $6::boolean = true THEN 'requires_review'::warmup_phase_status
            WHEN retry_count + 1 >= max_retries THEN 'requires_review'::warmup_phase_status
            ELSE 'failed'::warmup_phase_status
          END,
          retry_count = retry_count + 1,
          error_message = $3,
          error_details = $4,
          failure_category = $7,
          review_required_at = CASE 
            WHEN $6::boolean = true OR retry_count + 1 >= max_retries THEN CURRENT_TIMESTAMP
            ELSE review_required_at
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE account_id = $1 AND phase = $2 AND bot_id = $5 AND status = 'in_progress'::warmup_phase_status
        RETURNING id, status, retry_count, max_retries
      `, [
                accountId,
                phase,
                errorMessage,
                JSON.stringify(errorDetails),
                botId,
                shouldEscalateToReview,
                failureCategory,
            ]);
            if (result.rows.length === 0) {
                return {
                    success: false,
                    accountId,
                    message: `Phase ${phase} could not be failed - not in progress by this bot`,
                    error: "Phase not in progress",
                };
            }
            const phaseData = result.rows[0];
            const needsReview = phaseData.status === "requires_review";
            if (needsReview) {
                await database_1.db.query(`
          UPDATE accounts 
          SET requires_human_review = true,
              last_error_message = $2,
              last_error_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [accountId, errorMessage]);
            }
            return {
                success: true,
                accountId,
                message: needsReview
                    ? `Phase ${phase} marked for human review after ${phaseData.retry_count} retries`
                    : `Phase ${phase} marked as failed (retry ${phaseData.retry_count}/${phaseData.max_retries})`,
                phase,
                phaseId: phaseData.id,
                needsHumanReview: needsReview,
                retryCount: phaseData.retry_count,
            };
        }
        catch (error) {
            console.error(`Error failing phase ${phase} for account ${accountId}:`, error);
            return {
                success: false,
                accountId,
                message: `Failed to mark phase ${phase} as failed`,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }
    async getNextAvailablePhaseForBot(accountId, botId) {
        try {
            const canStart = await this.canBotStartWork(botId);
            if (!canStart) {
                return null;
            }
            const result = await database_1.db.query(`
        SELECT 
          awp.id, awp.phase, awp.status, awp.available_at, awp.started_at, 
          awp.assigned_content_id, awp.assigned_text_id, awp.content_assigned_at,
          awp.error_message, awp.retry_count, awp.max_retries,
          
          -- Account info
          a.username, a.password, a.email, a.account_code as email_password, 
          a.container_number, a.proxy, a.proxy_password_encrypted,
          
          -- Content info
          cc.filename as content_filename,
          cc.original_name as content_original_name,
          cc.file_path as content_file_path,
          cc.content_type as content_type,
          cc.categories as content_categories,
          
          -- Text content info
          ctc.text_content,
          ctc.categories as text_categories,
          ctc.template_name as text_template_name
          
        FROM account_warmup_phases awp
        JOIN accounts a ON awp.account_id = a.id
        LEFT JOIN central_content cc ON awp.assigned_content_id = cc.id
        LEFT JOIN central_text_content ctc ON awp.assigned_text_id = ctc.id
        WHERE awp.account_id = $1 
          AND awp.status = 'available' 
          AND awp.available_at <= CURRENT_TIMESTAMP
        ORDER BY awp.available_at ASC
        LIMIT 1
      `, [accountId]);
            if (result.rows.length === 0) {
                return null;
            }
            const phase = result.rows[0];
            const dependenciesSatisfied = await this.checkPhaseDependencies(accountId, phase.phase);
            if (!dependenciesSatisfied) {
                console.log(`Phase ${phase.phase} dependencies not satisfied for account ${accountId}`);
                return null;
            }
            const scriptSequence = this.getPhaseScriptSequence(phase.phase, phase.container_number);
            await this.ensureContentAssigned(accountId);
            if (scriptSequence.requires_content || scriptSequence.requires_text) {
                if (!phase.assigned_content_id && !phase.assigned_text_id) {
                    await this.assignContentToPhase(accountId, phase.id, phase.phase);
                    const updatedResult = await database_1.db.query(`
            SELECT 
              awp.id, awp.phase, awp.status, awp.available_at, awp.started_at, 
              awp.assigned_content_id, awp.assigned_text_id, awp.content_assigned_at,
              awp.error_message, awp.retry_count, awp.max_retries,
              
              -- Account info
              a.username, a.password, a.email, a.account_code as email_password, 
              a.container_number, a.proxy, a.proxy_password_encrypted,
              
              -- Content info
              cc.filename as content_filename,
              cc.original_name as content_original_name,
              cc.file_path as content_file_path,
              cc.content_type as content_type,
              cc.categories as content_categories,
              
              -- Text content info
              ctc.text_content,
              ctc.categories as text_categories,
              ctc.template_name as text_template_name
              
            FROM account_warmup_phases awp
            JOIN accounts a ON awp.account_id = a.id
            LEFT JOIN central_content cc ON awp.assigned_content_id = cc.id
            LEFT JOIN central_text_content ctc ON awp.assigned_text_id = ctc.id
            WHERE awp.id = $1
          `, [phase.id]);
                    if (updatedResult.rows.length > 0) {
                        Object.assign(phase, updatedResult.rows[0]);
                    }
                }
            }
            return {
                ...phase,
                script_sequence: scriptSequence,
                content_url: phase.content_file_path
                    ? `/uploads/content/${phase.content_filename}`
                    : null,
                full_content_path: phase.content_file_path || null,
            };
        }
        catch (error) {
            console.error(`Error getting next available phase for account ${accountId}:`, error);
            return null;
        }
    }
    async isWarmupComplete(accountId) {
        try {
            const result = await database_1.db.query("SELECT is_warmup_complete($1) as is_complete", [accountId]);
            return result.rows[0].is_complete;
        }
        catch (error) {
            console.error(`Error checking warmup completion for account ${accountId}:`, error);
            return false;
        }
    }
    async getWarmupStatistics(modelId, days = 30) {
        try {
            let query = `
        SELECT 
          COUNT(DISTINCT a.id) as total_accounts,
          COUNT(DISTINCT CASE WHEN a.lifecycle_state = 'warmup' THEN a.id END) as accounts_in_warmup,
          COUNT(DISTINCT CASE WHEN awp.status = 'completed' AND awp.completed_at > CURRENT_TIMESTAMP - INTERVAL '${days} days' THEN a.id END) as completed_warmups,
          
          -- Phase statistics
          COUNT(awp.id) as total_phases,
          COUNT(CASE WHEN awp.status = 'completed' THEN 1 END) as completed_phases,
          COUNT(CASE WHEN awp.status = 'failed' THEN 1 END) as failed_phases,
          COUNT(CASE WHEN awp.status = 'requires_review' THEN 1 END) as phases_needing_review,
          
          -- Success rate
          CASE 
            WHEN COUNT(awp.id) > 0 THEN 
              ROUND((COUNT(CASE WHEN awp.status = 'completed' THEN 1 END)::decimal / COUNT(awp.id)) * 100, 2)
            ELSE 0 
          END as success_rate_percent,
          
          -- Average execution time
          ROUND(AVG(awp.execution_time_ms), 0) as avg_execution_time_ms,
          
          -- Phase breakdown
          json_object_agg(
            awp.phase,
            json_build_object(
              'total', COUNT(CASE WHEN awp.phase IS NOT NULL THEN 1 END),
              'completed', COUNT(CASE WHEN awp.status = 'completed' THEN 1 END),
              'failed', COUNT(CASE WHEN awp.status = 'failed' THEN 1 END),
              'avg_time_ms', ROUND(AVG(awp.execution_time_ms), 0)
            )
          ) FILTER (WHERE awp.phase IS NOT NULL) as phase_breakdown
          
        FROM accounts a
        LEFT JOIN account_warmup_phases awp ON a.id = awp.account_id
        WHERE ($1::INTEGER IS NULL OR a.model_id = $1)
          AND a.created_at > CURRENT_TIMESTAMP - INTERVAL '${days} days'
      `;
            const result = await database_1.db.query(query, [modelId]);
            return result.rows[0];
        }
        catch (error) {
            console.error("Error fetching warmup statistics:", error);
            throw new Error("Failed to fetch warmup statistics");
        }
    }
    getPhaseScriptSequence(phase, containerNumber) {
        const baseScripts = {
            ios16_photo_cleaner: "instagram-tracker/bot/scripts/api/ios16_photo_cleaner.js",
            gallery: "instagram-tracker/bot/scripts/api/gallery.js",
            clipboard: "instagram-tracker/bot/scripts/api/clipboard.js",
            lua_executor: "instagram-tracker/bot/scripts/api/lua_executor.js",
        };
        const containerScript = `instagram-tracker/bot/scripts/open_container/open_container${containerNumber}.lua`;
        switch (phase) {
            case warmupProcess_1.WarmupPhase.MANUAL_SETUP:
                return {
                    phase: "manual_setup",
                    description: "Manual account setup - no automation scripts",
                    api_scripts: [],
                    lua_scripts: [],
                    requires_content: false,
                    requires_text: false,
                };
            case warmupProcess_1.WarmupPhase.BIO:
                return {
                    phase: "bio",
                    description: "Change bio using clipboard text",
                    api_scripts: [
                        baseScripts.ios16_photo_cleaner,
                        baseScripts.clipboard,
                        baseScripts.lua_executor,
                    ],
                    lua_scripts: [
                        containerScript,
                        "instagram-tracker/bot/scripts/iphone_lua/change_bio_to_clipboard.lua",
                    ],
                    requires_content: false,
                    requires_text: true,
                    text_categories: ["bio"],
                };
            case warmupProcess_1.WarmupPhase.GENDER:
                return {
                    phase: "gender",
                    description: "Change gender to female",
                    api_scripts: [
                        baseScripts.ios16_photo_cleaner,
                        baseScripts.lua_executor,
                    ],
                    lua_scripts: [
                        containerScript,
                        "instagram-tracker/bot/scripts/iphone_lua/change_gender_to_female.lua",
                    ],
                    requires_content: false,
                    requires_text: false,
                };
            case warmupProcess_1.WarmupPhase.NAME:
                return {
                    phase: "name",
                    description: "Change display name using clipboard text",
                    api_scripts: [
                        baseScripts.ios16_photo_cleaner,
                        baseScripts.clipboard,
                        baseScripts.lua_executor,
                    ],
                    lua_scripts: [
                        containerScript,
                        "instagram-tracker/bot/scripts/iphone_lua/change_name_to_clipboard.lua",
                    ],
                    requires_content: false,
                    requires_text: true,
                    text_categories: ["name"],
                };
            case warmupProcess_1.WarmupPhase.USERNAME:
                return {
                    phase: "username",
                    description: "Change username using clipboard text - UPDATE DATABASE AFTER SUCCESS",
                    api_scripts: [
                        baseScripts.ios16_photo_cleaner,
                        baseScripts.clipboard,
                        baseScripts.lua_executor,
                    ],
                    lua_scripts: [
                        containerScript,
                        "instagram-tracker/bot/scripts/iphone_lua/change_username_to_clipboard.lua",
                    ],
                    requires_content: false,
                    requires_text: true,
                    text_categories: ["username"],
                    post_execution_action: "update_username_in_database",
                };
            case warmupProcess_1.WarmupPhase.FIRST_HIGHLIGHT:
                return {
                    phase: "first_highlight",
                    description: "Upload first highlight group with image and clipboard name",
                    api_scripts: [
                        baseScripts.ios16_photo_cleaner,
                        baseScripts.gallery,
                        baseScripts.clipboard,
                        baseScripts.lua_executor,
                    ],
                    lua_scripts: [
                        containerScript,
                        "instagram-tracker/bot/scripts/iphone_lua/upload_first_highlight_group_with_clipboard_name_newest_media_no_caption.lua",
                    ],
                    requires_content: true,
                    requires_text: true,
                    content_categories: ["highlight", "any"],
                    text_categories: ["highlight_group_name"],
                };
            case warmupProcess_1.WarmupPhase.NEW_HIGHLIGHT:
                return {
                    phase: "new_highlight",
                    description: "Upload new highlight group - requires first highlight to be completed",
                    api_scripts: [
                        baseScripts.ios16_photo_cleaner,
                        baseScripts.gallery,
                        baseScripts.clipboard,
                        baseScripts.lua_executor,
                    ],
                    lua_scripts: [
                        containerScript,
                        "instagram-tracker/bot/scripts/iphone_lua/upload_new_highlightgroup_clipboard_name_newest_media_no_caption.lua.lua",
                    ],
                    requires_content: true,
                    requires_text: true,
                    content_categories: ["highlight", "any"],
                    text_categories: ["highlight_group_name"],
                    dependencies: ["first_highlight"],
                };
            case warmupProcess_1.WarmupPhase.POST_CAPTION:
                return {
                    phase: "post_caption",
                    description: "Upload post with image and clipboard caption",
                    api_scripts: [
                        baseScripts.ios16_photo_cleaner,
                        baseScripts.gallery,
                        baseScripts.clipboard,
                        baseScripts.lua_executor,
                    ],
                    lua_scripts: [
                        containerScript,
                        "instagram-tracker/bot/scripts/iphone_lua/upload_post_newest_media_clipboard_caption.lua",
                    ],
                    requires_content: true,
                    requires_text: true,
                    content_categories: ["post", "any"],
                    text_categories: ["post", "any"],
                };
            case warmupProcess_1.WarmupPhase.POST_NO_CAPTION:
                return {
                    phase: "post_no_caption",
                    description: "Upload post with image only, no caption",
                    api_scripts: [
                        baseScripts.ios16_photo_cleaner,
                        baseScripts.gallery,
                        baseScripts.lua_executor,
                    ],
                    lua_scripts: [
                        containerScript,
                        "instagram-tracker/bot/scripts/iphone_lua/upload_post_newest_media_no_caption.lua",
                    ],
                    requires_content: true,
                    requires_text: false,
                    content_categories: ["post", "any"],
                };
            case warmupProcess_1.WarmupPhase.STORY_CAPTION:
                return {
                    phase: "story_caption",
                    description: "Upload story with image and clipboard caption",
                    api_scripts: [
                        baseScripts.ios16_photo_cleaner,
                        baseScripts.gallery,
                        baseScripts.clipboard,
                        baseScripts.lua_executor,
                    ],
                    lua_scripts: [
                        containerScript,
                        "instagram-tracker/bot/scripts/iphone_lua/upload_story_newest_media_clipboard_caption.lua",
                    ],
                    requires_content: true,
                    requires_text: true,
                    content_categories: ["story", "any"],
                    text_categories: ["story", "any"],
                };
            case warmupProcess_1.WarmupPhase.STORY_NO_CAPTION:
                return {
                    phase: "story_no_caption",
                    description: "Upload story with image only, no caption",
                    api_scripts: [
                        baseScripts.ios16_photo_cleaner,
                        baseScripts.gallery,
                        baseScripts.lua_executor,
                    ],
                    lua_scripts: [
                        containerScript,
                        "instagram-tracker/bot/scripts/iphone_lua/upload_story_newest_media_no_caption.lua",
                    ],
                    requires_content: true,
                    requires_text: false,
                    content_categories: ["story", "any"],
                };
            default:
                return {
                    phase: phase,
                    description: "Unknown phase",
                    api_scripts: [],
                    lua_scripts: [],
                    requires_content: false,
                    requires_text: false,
                    error: "Unknown warmup phase",
                };
        }
    }
    async checkPhaseDependencies(accountId, phase) {
        try {
            const scriptSequence = this.getPhaseScriptSequence(phase, 1);
            if (!scriptSequence.dependencies ||
                scriptSequence.dependencies.length === 0) {
                return true;
            }
            const result = await database_1.db.query(`
        SELECT phase, status FROM account_warmup_phases 
        WHERE account_id = $1 AND phase = ANY($2::text[])
      `, [accountId, scriptSequence.dependencies]);
            const completedPhases = result.rows
                .filter((row) => row.status === "completed")
                .map((row) => row.phase);
            return scriptSequence.dependencies.every((dep) => completedPhases.includes(dep));
        }
        catch (error) {
            console.error(`Error checking phase dependencies for ${phase}:`, error);
            return false;
        }
    }
    async setAccountPrivate(containerNumber) {
        return new Promise((resolve, reject) => {
            const path = require("path");
            const { spawn } = require("child_process");
            const scriptPath = path.join(process.cwd(), "../bot/scripts/api/lua_executor.js");
            const commands = [
                {
                    script: "open_settings.lua",
                    description: "Open container settings",
                },
                {
                    script: "scroll_to_top_container.lua",
                    description: "Scroll to top of container list",
                },
                {
                    script: `select_container_${containerNumber}.lua`,
                    description: `Select container ${containerNumber}`,
                },
                {
                    script: "set_account_private.lua",
                    description: "Set account to private",
                },
            ];
            let currentCommand = 0;
            function executeNextCommand() {
                if (currentCommand >= commands.length) {
                    resolve();
                    return;
                }
                const command = commands[currentCommand];
                console.log(`[WarmupProcess] Executing: ${command.description}`);
                const childProcess = spawn("node", [scriptPath, command.script], {
                    cwd: path.join(process.cwd(), "../bot"),
                    detached: false,
                    stdio: ["pipe", "pipe", "pipe"],
                });
                let output = "";
                let errorOutput = "";
                childProcess.stdout.on("data", (data) => {
                    output += data.toString();
                });
                childProcess.stderr.on("data", (data) => {
                    errorOutput += data.toString();
                });
                childProcess.on("close", (code) => {
                    if (code === 0) {
                        console.log(`[WarmupProcess] ✅ ${command.description} completed`);
                        currentCommand++;
                        setTimeout(executeNextCommand, 2000);
                    }
                    else {
                        console.error(`[WarmupProcess] ❌ ${command.description} failed with code ${code}`);
                        reject(new Error(`Failed to execute ${command.description}: ${errorOutput}`));
                    }
                });
                childProcess.on("error", (error) => {
                    reject(new Error(`Failed to start ${command.description}: ${error.message}`));
                });
            }
            executeNextCommand();
        });
    }
    async processPhase(accountId, phase) {
        try {
            console.log(`🤖 Processing phase ${phase} for account ${accountId}`);
            const accountResult = await database_1.db.query(`
        SELECT id, username, container_number, lifecycle_state 
        FROM accounts 
        WHERE id = $1
      `, [accountId]);
            if (accountResult.rows.length === 0) {
                throw new Error("Account not found");
            }
            const account = accountResult.rows[0];
            console.log(`🤖 Executing ${phase} for ${account.username} on container ${account.container_number}`);
            const contentResult = await database_1.db.query(`
        SELECT 
          awp.assigned_content_id,
          awp.assigned_text_id,
          cc.file_path as content_file_path,
          cc.filename as content_filename,
          ctc.text_content
        FROM account_warmup_phases awp
        LEFT JOIN central_content cc ON awp.assigned_content_id = cc.id
        LEFT JOIN central_text_content ctc ON awp.assigned_text_id = ctc.id
        WHERE awp.account_id = $1 AND awp.phase = $2
      `, [accountId, phase]);
            const content = contentResult.rows[0] || {};
            const hasImage = content.content_file_path;
            const hasText = content.text_content;
            console.log(`📋 Content for ${phase}: image=${!!hasImage}, text=${!!hasText}`);
            const ClipboardAPI = require("../../../bot/scripts/api/clipboard.js");
            const GalleryAPI = require("../../../bot/scripts/api/gallery.js");
            const iOS16PhotoCleaner = require("../../../bot/scripts/api/ios16_photo_cleaner.js");
            const AutomationBridge = require("../../../bot/services/AutomationBridge.js");
            const iphoneIP = "192.168.178.65";
            const iphonePort = 46952;
            const baseUrl = `http://${iphoneIP}:${iphonePort}`;
            if (hasImage) {
                console.log(`🧹 Cleaning iPhone gallery before sending image...`);
                try {
                    const cleaner = new iOS16PhotoCleaner();
                    await cleaner.performiOS16Cleanup();
                    console.log(`⏳ Waiting 15 seconds for iPhone respring...`);
                    await new Promise((resolve) => setTimeout(resolve, 15000));
                    console.log(`📱 Executing wake_up.lua to wake up iPhone...`);
                    const bridge = new AutomationBridge({ iphoneIP, iphonePort });
                    await bridge.executeScript("wake_up.lua", {
                        timeout: 15000,
                        retries: 2,
                    });
                    console.log(`✅ iPhone gallery cleaned and ready`);
                }
                catch (cleanError) {
                    console.warn(`⚠️ Gallery cleaning failed: ${cleanError.message}, continuing anyway...`);
                }
            }
            if (hasText) {
                console.log(`📝 Sending text to iPhone clipboard...`);
                let textToSend = content.text_content;
                if (phase === "username" && textToSend && textToSend.length > 0) {
                    const lastLetter = textToSend.slice(-1).toLowerCase();
                    textToSend = textToSend + lastLetter + lastLetter;
                    console.log(`🔤 Modified username: ${content.text_content} → ${textToSend}`);
                }
                const clipboard = new ClipboardAPI(baseUrl);
                const clipResult = await clipboard.setText(textToSend);
                if (!clipResult.success) {
                    throw new Error(`Failed to send text to clipboard: ${clipResult.error}`);
                }
                console.log(`✅ Text sent to iPhone clipboard`);
            }
            if (hasImage) {
                console.log(`🖼️ Sending image to iPhone gallery...`);
                const imagePath = path_1.default.isAbsolute(content.content_file_path)
                    ? content.content_file_path
                    : path_1.default.resolve(__dirname, "../../uploads", content.content_file_path);
                const gallery = new GalleryAPI(baseUrl);
                const galleryResult = await gallery.addImage(imagePath);
                if (!galleryResult.success) {
                    throw new Error(`Failed to send image to gallery: ${galleryResult.error}`);
                }
                console.log(`✅ Image sent to iPhone gallery (${galleryResult.fileSizeKB} KB)`);
            }
            console.log(`🤖 Executing warmup automation for ${phase}...`);
            const bridge = new AutomationBridge({ iphoneIP, iphonePort });
            console.log(`📦 Selecting container ${account.container_number}...`);
            const containerSelected = await bridge.selectContainer(account.container_number);
            if (!containerSelected) {
                throw new Error(`Failed to select container ${account.container_number}`);
            }
            const phaseScriptMapping = {
                bio: "change_bio_to_clipboard.lua",
                gender: "change_gender_to_female.lua",
                name: "change_name_to_clipboard.lua",
                username: "change_username_to_clipboard.lua",
                first_highlight: "upload_first_highlight_group_with_clipboard_name_newest_media_no_caption.lua",
                new_highlight: "upload_new_highlightgroup_clipboard_name_newest_media_no_caption.lua",
                post_caption: "upload_post_newest_media_clipboard_caption.lua",
                post_no_caption: "upload_post_newest_media_no_caption.lua",
                story_no_caption: "upload_story_newest_media_no_caption.lua",
                set_to_private: "set_account_private.lua",
            };
            const phaseScript = phaseScriptMapping[phase];
            if (!phaseScript) {
                throw new Error(`No script mapping found for phase: ${phase}`);
            }
            console.log(`📜 Executing phase script: ${phaseScript}`);
            const scriptResult = await bridge.executeScript(phaseScript, {
                timeout: 120000,
                retries: 3,
            });
            if (!scriptResult) {
                throw new Error(`Phase script ${phaseScript} failed to execute`);
            }
            console.log(`✅ Phase ${phase} completed successfully for ${account.username}`);
            await database_1.db.query(`
        UPDATE account_warmup_phases 
        SET bot_id = $3,
            updated_at = NOW()
        WHERE account_id = $1 AND phase = $2 AND status = 'in_progress'
      `, [accountId, phase, "warmup-automation-bot"]);
            const completionResult = await this.completePhase(accountId, phase, "warmup-automation-bot", undefined, undefined);
            if (!completionResult.success) {
                throw new Error(`Failed to complete phase properly: ${completionResult.error}`);
            }
            return {
                success: true,
                accountId,
                message: `Phase ${phase} completed successfully`,
                phase,
            };
        }
        catch (error) {
            console.error(`❌ Error processing phase ${phase} for account ${accountId}:`, error);
            try {
                await database_1.db.query(`
          UPDATE account_warmup_phases 
          SET status = 'available',
              error_message = $3,
              updated_at = NOW()
          WHERE account_id = $1 AND phase = $2
        `, [accountId, phase, error.message]);
            }
            catch (resetError) {
                console.error("❌ Error updating phase status:", resetError);
            }
            return {
                success: false,
                accountId,
                message: `Failed to process phase ${phase}`,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }
}
exports.WarmupProcessService = WarmupProcessService;
//# sourceMappingURL=WarmupProcessService.js.map