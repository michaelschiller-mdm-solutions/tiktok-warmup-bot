-- =====================================================================================
-- BOT ACTIVITY TRACKING MIGRATION
-- Creates tables for tracking iPhone bot activity and maintenance operations
-- =====================================================================================

-- Bot Activity Log Table
CREATE TABLE IF NOT EXISTS bot_activity_log (
    id SERIAL PRIMARY KEY,
    bot_id VARCHAR(255) NOT NULL,
    account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
    activity_type VARCHAR(100) NOT NULL, -- upload_content, health_check, script_execution, maintenance
    status VARCHAR(50) DEFAULT 'started', -- started, completed, failed
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds NUMERIC(10,2),
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_activity_type CHECK (
        activity_type IN ('upload_content', 'health_check', 'script_execution', 'maintenance', 'emergency_content')
    ),
    CONSTRAINT valid_status CHECK (
        status IN ('started', 'completed', 'failed', 'cancelled')
    ),
    CONSTRAINT logical_completion CHECK (
        (status = 'started' AND completed_at IS NULL) OR
        (status IN ('completed', 'failed', 'cancelled') AND completed_at IS NOT NULL)
    ),
    CONSTRAINT positive_duration CHECK (
        duration_seconds IS NULL OR duration_seconds >= 0
    )
);

-- Maintenance Status Tracking Table
CREATE TABLE IF NOT EXISTS maintenance_status_log (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    maintenance_type VARCHAR(50) NOT NULL, -- highlight_maintenance, sprint_content, emergency_content
    status VARCHAR(50) NOT NULL, -- scheduled, in_progress, completed, failed, skipped
    scheduled_time TIMESTAMP NOT NULL,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    bot_id VARCHAR(255),
    queue_item_id INTEGER REFERENCES content_queue(id) ON DELETE SET NULL,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_maintenance_type CHECK (
        maintenance_type IN ('highlight_maintenance', 'sprint_content', 'emergency_content')
    ),
    CONSTRAINT valid_maintenance_status CHECK (
        status IN ('scheduled', 'in_progress', 'completed', 'failed', 'skipped', 'cancelled')
    ),
    CONSTRAINT non_negative_retry_count CHECK (retry_count >= 0)
);

-- Bot Performance Metrics Table
CREATE TABLE IF NOT EXISTS bot_performance_metrics (
    id SERIAL PRIMARY KEY,
    bot_id VARCHAR(255) NOT NULL,
    metric_date DATE DEFAULT CURRENT_DATE,
    total_activities INTEGER DEFAULT 0,
    successful_activities INTEGER DEFAULT 0,
    failed_activities INTEGER DEFAULT 0,
    avg_duration_seconds NUMERIC(10,2),
    total_accounts_processed INTEGER DEFAULT 0,
    uptime_percentage NUMERIC(5,2),
    last_health_check TIMESTAMP,
    health_check_success_rate NUMERIC(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_uptime_percentage CHECK (
        uptime_percentage IS NULL OR (uptime_percentage >= 0 AND uptime_percentage <= 100)
    ),
    CONSTRAINT valid_health_check_success_rate CHECK (
        health_check_success_rate IS NULL OR (health_check_success_rate >= 0 AND health_check_success_rate <= 100)
    ),
    CONSTRAINT non_negative_counts CHECK (
        total_activities >= 0 AND successful_activities >= 0 AND failed_activities >= 0 AND
        successful_activities <= total_activities AND failed_activities <= total_activities
    ),
    
    -- Unique constraint for one record per bot per day
    UNIQUE(bot_id, metric_date)
);

-- Content Upload Status Tracking Table
CREATE TABLE IF NOT EXISTS content_upload_status (
    id SERIAL PRIMARY KEY,
    queue_item_id INTEGER REFERENCES content_queue(id) ON DELETE CASCADE,
    bot_id VARCHAR(255),
    upload_attempt_number INTEGER DEFAULT 1,
    status VARCHAR(50) NOT NULL, -- pending, uploading, completed, failed
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    file_path TEXT,
    file_size_bytes BIGINT,
    upload_duration_seconds NUMERIC(10,2),
    instagram_post_id VARCHAR(255), -- Instagram's post ID after successful upload
    error_code VARCHAR(50),
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_upload_status CHECK (
        status IN ('pending', 'uploading', 'completed', 'failed', 'cancelled')
    ),
    CONSTRAINT positive_attempt_number CHECK (upload_attempt_number > 0),
    CONSTRAINT non_negative_file_size CHECK (
        file_size_bytes IS NULL OR file_size_bytes >= 0
    ),
    CONSTRAINT non_negative_upload_duration CHECK (
        upload_duration_seconds IS NULL OR upload_duration_seconds >= 0
    )
);

-- =====================================================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================================================

-- Bot activity log indexes
CREATE INDEX IF NOT EXISTS idx_bot_activity_log_bot_id ON bot_activity_log(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_activity_log_account_id ON bot_activity_log(account_id);
CREATE INDEX IF NOT EXISTS idx_bot_activity_log_activity_type ON bot_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_bot_activity_log_status ON bot_activity_log(status);
CREATE INDEX IF NOT EXISTS idx_bot_activity_log_started_at ON bot_activity_log(started_at);
CREATE INDEX IF NOT EXISTS idx_bot_activity_log_bot_status ON bot_activity_log(bot_id, status);
CREATE INDEX IF NOT EXISTS idx_bot_activity_log_active_operations ON bot_activity_log(bot_id, status, started_at) 
    WHERE status = 'started';

-- Maintenance status log indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_status_log_account_id ON maintenance_status_log(account_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status_log_scheduled_time ON maintenance_status_log(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_maintenance_status_log_status ON maintenance_status_log(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_status_log_bot_id ON maintenance_status_log(bot_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status_log_queue_item ON maintenance_status_log(queue_item_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status_log_pending ON maintenance_status_log(status, scheduled_time) 
    WHERE status IN ('scheduled', 'in_progress');

-- Bot performance metrics indexes
CREATE INDEX IF NOT EXISTS idx_bot_performance_metrics_bot_id ON bot_performance_metrics(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_performance_metrics_date ON bot_performance_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_bot_performance_metrics_bot_date ON bot_performance_metrics(bot_id, metric_date);

-- Content upload status indexes
CREATE INDEX IF NOT EXISTS idx_content_upload_status_queue_item ON content_upload_status(queue_item_id);
CREATE INDEX IF NOT EXISTS idx_content_upload_status_bot_id ON content_upload_status(bot_id);
CREATE INDEX IF NOT EXISTS idx_content_upload_status_status ON content_upload_status(status);
CREATE INDEX IF NOT EXISTS idx_content_upload_status_started_at ON content_upload_status(started_at);
CREATE INDEX IF NOT EXISTS idx_content_upload_status_pending ON content_upload_status(status, started_at) 
    WHERE status IN ('pending', 'uploading');

-- =====================================================================================
-- HELPER FUNCTIONS
-- =====================================================================================

-- Function to update bot performance metrics daily
CREATE OR REPLACE FUNCTION update_bot_performance_metrics()
RETURNS void AS $$
BEGIN
    INSERT INTO bot_performance_metrics (
        bot_id,
        metric_date,
        total_activities,
        successful_activities,
        failed_activities,
        avg_duration_seconds,
        total_accounts_processed,
        last_health_check,
        health_check_success_rate
    )
    SELECT 
        bal.bot_id,
        CURRENT_DATE,
        COUNT(*) as total_activities,
        COUNT(*) FILTER (WHERE bal.status = 'completed') as successful_activities,
        COUNT(*) FILTER (WHERE bal.status = 'failed') as failed_activities,
        AVG(bal.duration_seconds) FILTER (WHERE bal.status = 'completed') as avg_duration_seconds,
        COUNT(DISTINCT bal.account_id) as total_accounts_processed,
        MAX(bal.completed_at) FILTER (WHERE bal.activity_type = 'health_check') as last_health_check,
        (COUNT(*) FILTER (WHERE bal.activity_type = 'health_check' AND bal.status = 'completed') * 100.0 / 
         NULLIF(COUNT(*) FILTER (WHERE bal.activity_type = 'health_check'), 0)) as health_check_success_rate
    FROM bot_activity_log bal
    WHERE DATE(bal.started_at) = CURRENT_DATE
    GROUP BY bal.bot_id
    ON CONFLICT (bot_id, metric_date) 
    DO UPDATE SET
        total_activities = EXCLUDED.total_activities,
        successful_activities = EXCLUDED.successful_activities,
        failed_activities = EXCLUDED.failed_activities,
        avg_duration_seconds = EXCLUDED.avg_duration_seconds,
        total_accounts_processed = EXCLUDED.total_accounts_processed,
        last_health_check = EXCLUDED.last_health_check,
        health_check_success_rate = EXCLUDED.health_check_success_rate,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old bot activity logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_bot_activity_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM bot_activity_log 
    WHERE started_at < CURRENT_DATE - INTERVAL '30 days';
    
    DELETE FROM maintenance_status_log 
    WHERE created_at < CURRENT_DATE - INTERVAL '30 days';
    
    DELETE FROM content_upload_status 
    WHERE created_at < CURRENT_DATE - INTERVAL '30 days';
    
    DELETE FROM bot_performance_metrics 
    WHERE metric_date < CURRENT_DATE - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================================================

-- Trigger to automatically update maintenance_status_log.updated_at
CREATE OR REPLACE FUNCTION update_maintenance_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_maintenance_status_updated_at
    BEFORE UPDATE ON maintenance_status_log
    FOR EACH ROW
    EXECUTE FUNCTION update_maintenance_status_updated_at();

-- Trigger to automatically update bot_performance_metrics.updated_at
CREATE OR REPLACE FUNCTION update_bot_performance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bot_performance_updated_at
    BEFORE UPDATE ON bot_performance_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_bot_performance_updated_at();

-- =====================================================================================
-- INITIAL DATA AND COMMENTS
-- =====================================================================================

-- Add helpful comments
COMMENT ON TABLE bot_activity_log IS 'Tracks all iPhone bot activities and operations';
COMMENT ON TABLE maintenance_status_log IS 'Tracks maintenance operations status and progress';
COMMENT ON TABLE bot_performance_metrics IS 'Daily performance metrics for each bot';
COMMENT ON TABLE content_upload_status IS 'Detailed tracking of content upload attempts and results';

COMMENT ON COLUMN bot_activity_log.metadata IS 'Flexible JSON field for storing activity-specific data';
COMMENT ON COLUMN maintenance_status_log.metadata IS 'Stores maintenance-specific configuration and results';
COMMENT ON COLUMN content_upload_status.metadata IS 'Upload-specific metadata like file info, Instagram response data';

-- Migration completed successfully
SELECT 'Bot activity tracking tables created successfully' as migration_status; 