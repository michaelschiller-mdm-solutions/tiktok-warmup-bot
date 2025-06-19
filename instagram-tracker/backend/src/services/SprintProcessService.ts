import { db } from '../database';
import { ContentType } from '../types/warmupProcess';

export interface SprintContent {
  id: number;
  content_id?: number;
  text_id?: number;
  file_path?: string;
  file_name?: string;
  caption?: string;
  content_type: 'story' | 'post' | 'highlight';
  content_categories: string[];
  story_to_highlight: boolean;
  scheduled_time: Date;
  sprint_name: string;
  location: string;
}

export interface EmergencyContent {
  id: number;
  content_id?: number;
  text_id?: number;
  file_path?: string;
  file_name?: string;
  caption?: string;
  content_type: 'story' | 'post' | 'highlight';
  requires_conflict_resolution: boolean;
  conflicts: string[];
  emergency_strategy: 'pause_sprints' | 'post_alongside' | 'override_conflicts';
}

export interface HighlightMaintenanceContent {
  id: number;
  content_id: number;
  text_id?: number;
  file_path: string;
  file_name: string;
  caption?: string;
  highlight_name: string;
  maintenance_type: 'add_content' | 'reorder_content';
  position?: number;
}

export interface ActiveAccount {
  id: number;
  username: string;
  model_id: number;
  current_location: string;
  active_sprint_ids: number[];
  next_content_due: Date | null;
  idle_since: Date | null;
  cooldown_until: Date | null;
}

export class SprintProcessService {
  /**
   * Get accounts that have completed warmup and are ready for sprint content
   */
  async getActiveAccounts(modelId?: number, limit: number = 50): Promise<ActiveAccount[]> {
    let query = `
      SELECT 
        a.id,
        a.username,
        a.model_id,
        acs.current_location,
        acs.active_sprint_ids,
        asa.next_content_due,
        acs.idle_since,
        acs.cooldown_until
      FROM accounts a
      LEFT JOIN account_content_state acs ON a.id = acs.account_id
      LEFT JOIN account_sprint_assignments asa ON a.id = asa.account_id 
        AND asa.status = 'active'
        AND asa.next_content_due <= CURRENT_TIMESTAMP + INTERVAL '1 hour'
      WHERE is_warmup_complete(a.id) = true
        AND a.status = 'active'
        AND (acs.cooldown_until IS NULL OR acs.cooldown_until <= CURRENT_TIMESTAMP)
    `;

    const params: any[] = [];

    if (modelId) {
      query += ` AND a.model_id = $${params.length + 1}`;
      params.push(modelId);
    }

    query += ` ORDER BY asa.next_content_due ASC NULLS LAST LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get next sprint content for an account
   */
  async getNextSprintContent(accountId: number): Promise<SprintContent | null> {
    // First check if account is ready for sprint content
    const accountCheck = await db.query(`
      SELECT a.id, acs.current_location, acs.active_sprint_ids, acs.cooldown_until
      FROM accounts a
      LEFT JOIN account_content_state acs ON a.id = acs.account_id
      WHERE a.id = $1 
        AND is_warmup_complete(a.id) = true
        AND a.status = 'active'
        AND (acs.cooldown_until IS NULL OR acs.cooldown_until <= CURRENT_TIMESTAMP)
    `, [accountId]);

    if (accountCheck.rows.length === 0) {
      return null;
    }

    // Get next queued content
    const contentResult = await db.query(`
      SELECT 
        cq.id,
        cq.central_content_id as content_id,
        cq.central_text_id as text_id,
        cc.file_path,
        cc.filename as file_name,
        ctc.text_content as caption,
        cq.content_type,
        sci.content_categories,
        sci.story_to_highlight,
        cq.scheduled_time,
        cs.name as sprint_name,
        cs.location
      FROM content_queue cq
      JOIN account_sprint_assignments asa ON cq.sprint_assignment_id = asa.id
      JOIN content_sprints cs ON asa.sprint_id = cs.id
      LEFT JOIN sprint_content_items sci ON cq.content_item_id = sci.id
      LEFT JOIN central_content cc ON cq.central_content_id = cc.id
      LEFT JOIN central_text_content ctc ON cq.central_text_id = ctc.id
      WHERE cq.account_id = $1
        AND cq.status = 'queued'
        AND cq.scheduled_time <= CURRENT_TIMESTAMP + INTERVAL '5 minutes'
        AND cq.emergency_content = false
      ORDER BY cq.queue_priority ASC, cq.scheduled_time ASC
      LIMIT 1
    `, [accountId]);

    if (contentResult.rows.length === 0) {
      return null;
    }

    return contentResult.rows[0];
  }

  /**
   * Get emergency content for immediate posting
   */
  async getEmergencyContent(
    accountId: number, 
    contentType: 'story' | 'post' | 'highlight',
    strategy: 'pause_sprints' | 'post_alongside' | 'override_conflicts' = 'post_alongside'
  ): Promise<EmergencyContent | null> {
    // Get account current state
    const accountState = await db.query(`
      SELECT acs.current_location, acs.active_sprint_ids, cs.location as sprint_location
      FROM account_content_state acs
      LEFT JOIN content_sprints cs ON cs.id = ANY(acs.active_sprint_ids)
      WHERE acs.account_id = $1
    `, [accountId]);

    if (accountState.rows.length === 0) {
      return null;
    }

    const currentLocation = accountState.rows[0]?.current_location || 'home';
    const activeSprintLocations = accountState.rows.map(row => row.sprint_location).filter(Boolean);
    
    // Detect conflicts
    const conflicts: string[] = [];
    if (activeSprintLocations.length > 0 && !activeSprintLocations.includes(currentLocation)) {
      conflicts.push(`Location conflict: Account at ${currentLocation}, active sprints at ${activeSprintLocations.join(', ')}`);
    }

    // Select emergency-compatible content
    const contentResult = await db.query(`
      SELECT 
        cc.id,
        cc.id as content_id,
        NULL as text_id,
        cc.file_path,
        cc.filename as file_name,
        ctc.text_content as caption,
        $2 as content_type
      FROM central_content cc
      LEFT JOIN central_content_text_assignments ccta ON cc.id = ccta.content_id
      LEFT JOIN central_text_content ctc ON ccta.text_content_id = ctc.id
      WHERE cc.emergency_compatible = true
        AND cc.categories @> $3::jsonb
        AND cc.status = 'active'
        AND (ctc.status = 'active' OR ctc.id IS NULL)
        -- Avoid recently used content
        AND NOT EXISTS (
          SELECT 1 FROM content_queue cq 
          WHERE cq.central_content_id = cc.id 
          AND cq.account_id = $1
          AND cq.created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
        )
      ORDER BY RANDOM()
      LIMIT 1
    `, [accountId, contentType, JSON.stringify([contentType])]);

    if (contentResult.rows.length === 0) {
      return null;
    }

    const content = contentResult.rows[0];
    
    return {
      ...content,
      requires_conflict_resolution: conflicts.length > 0,
      conflicts,
      emergency_strategy: strategy
    };
  }

  /**
   * Get highlight maintenance content
   */
  async getHighlightMaintenanceContent(accountId: number): Promise<HighlightMaintenanceContent | null> {
    // Find highlights due for maintenance
    const maintenanceResult = await db.query(`
      SELECT 
        ahg.id,
        ahg.highlight_name,
        ahg.maintenance_next_due,
        cs.maintenance_images_min,
        cs.maintenance_images_max
      FROM account_highlight_groups ahg
      LEFT JOIN content_sprints cs ON ahg.highlight_group_id = cs.id
      WHERE ahg.account_id = $1
        AND ahg.is_active = true
        AND ahg.maintenance_next_due <= CURRENT_TIMESTAMP
        AND NOT EXISTS (
          -- Don't maintain if blocked by active sprints
          SELECT 1 FROM account_content_state acs
          JOIN content_sprints active_cs ON active_cs.id = ANY(acs.active_sprint_ids)
          WHERE acs.account_id = $1
          AND (
            ahg.highlight_group_id = ANY(active_cs.blocks_highlight_groups) OR
            active_cs.id = ANY(COALESCE(cs.blocks_sprints, ARRAY[]::INTEGER[]))
          )
        )
      ORDER BY ahg.maintenance_next_due ASC
      LIMIT 1
    `, [accountId]);

    if (maintenanceResult.rows.length === 0) {
      return null;
    }

    const highlight = maintenanceResult.rows[0];

    // Select content for this highlight group
    const contentResult = await db.query(`
      SELECT 
        cc.id,
        cc.id as content_id,
        NULL as text_id,
        cc.file_path,
        cc.filename as file_name,
        ctc.text_content as caption
      FROM central_content cc
      LEFT JOIN central_content_text_assignments ccta ON cc.id = ccta.content_id
      LEFT JOIN central_text_content ctc ON ccta.text_content_id = ctc.id
      WHERE cc.categories @> '["highlight"]'::jsonb
        AND cc.status = 'active'
        AND (ctc.status = 'active' OR ctc.id IS NULL)
        -- Seasonal filtering (if applicable)
        AND (
          cc.timing_constraints IS NULL OR
          cc.timing_constraints->'months' IS NULL OR
          cc.timing_constraints->'months' @> EXTRACT(MONTH FROM CURRENT_TIMESTAMP)::text::jsonb
        )
        -- Avoid recently used content for this highlight
        AND NOT EXISTS (
          SELECT 1 FROM content_queue cq 
          WHERE cq.central_content_id = cc.id 
          AND cq.account_id = $1
          AND cq.content_type = 'highlight'
          AND cq.created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
        )
      ORDER BY RANDOM()
      LIMIT 1
    `, [accountId]);

    if (contentResult.rows.length === 0) {
      return null;
    }

    const content = contentResult.rows[0];

    return {
      ...content,
      highlight_name: highlight.highlight_name,
      maintenance_type: 'add_content'
    };
  }

  /**
   * Mark content as posted and update sprint progress
   */
  async markContentPosted(queueId: number, accountId: number): Promise<void> {
    await db.query('BEGIN');

    try {
      // Update queue item status
      await db.query(`
        UPDATE content_queue 
        SET status = 'posted', posted_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [queueId]);

      // Update sprint assignment progress
      await db.query(`
        UPDATE account_sprint_assignments asa
        SET 
          current_content_index = current_content_index + 1,
          next_content_due = (
            SELECT cq.scheduled_time 
            FROM content_queue cq
            WHERE cq.sprint_assignment_id = asa.id 
              AND cq.status = 'queued'
            ORDER BY cq.scheduled_time ASC
            LIMIT 1
          ),
          updated_at = CURRENT_TIMESTAMP
        WHERE asa.account_id = $1
          AND asa.status = 'active'
          AND EXISTS (
            SELECT 1 FROM content_queue cq 
            WHERE cq.id = $2 AND cq.sprint_assignment_id = asa.id
          )
      `, [accountId, queueId]);

      // Update account state
      await db.query(`
        UPDATE account_content_state 
        SET updated_at = CURRENT_TIMESTAMP
        WHERE account_id = $1
      `, [accountId]);

      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Handle emergency content posting
   */
  async postEmergencyContent(
    accountId: number,
    contentId: number,
    strategy: 'pause_sprints' | 'post_alongside' | 'override_conflicts',
    contentType: 'story' | 'post' | 'highlight'
  ): Promise<number> {
    await db.query('BEGIN');

    try {
      // If strategy is pause_sprints, pause active sprint assignments
      if (strategy === 'pause_sprints') {
        await db.query(`
          UPDATE account_sprint_assignments 
          SET status = 'paused', updated_at = CURRENT_TIMESTAMP
          WHERE account_id = $1 AND status = 'active'
        `, [accountId]);
      }

      // Insert emergency content into queue with high priority
      const queueResult = await db.query(`
        INSERT INTO content_queue (
          account_id,
          central_content_id,
          scheduled_time,
          content_type,
          status,
          emergency_content,
          emergency_strategy,
          queue_priority
        ) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, 'queued', true, $4, 1)
        RETURNING id
      `, [accountId, contentId, contentType, strategy]);

      // Extend cooldowns if applicable
      if (strategy !== 'post_alongside') {
        await db.query(`
          UPDATE account_content_state 
          SET 
            cooldown_until = GREATEST(
              cooldown_until, 
              CURRENT_TIMESTAMP + INTERVAL '2 hours'
            ),
            last_emergency_content = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE account_id = $1
        `, [accountId]);
      }

      await db.query('COMMIT');
      return queueResult.rows[0].id;
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Update highlight maintenance schedule
   */
  async updateHighlightMaintenance(accountId: number, highlightId: number): Promise<void> {
    await db.query(`
      UPDATE account_highlight_groups 
      SET 
        maintenance_last_run = CURRENT_TIMESTAMP,
        maintenance_next_due = CURRENT_TIMESTAMP + (maintenance_frequency_hours || ' hours')::INTERVAL,
        updated_at = CURRENT_TIMESTAMP
      WHERE account_id = $1 AND id = $2
    `, [accountId, highlightId]);
  }
} 