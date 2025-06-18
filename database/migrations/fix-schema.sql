-- fix-schema.sql
-- Purpose: Perform an in-place migration to remove the max_containers limitation.

-- Step 1: Drop the check constraint that references max_containers.
-- The name 'iphone_containers_container_number_check' is based on the error message received.
ALTER TABLE iphone_containers DROP CONSTRAINT IF EXISTS iphone_containers_container_number_check;

-- Step 2: Drop the max_containers column from the iphones table.
ALTER TABLE iphones DROP COLUMN IF EXISTS max_containers;

-- Step 3: Recreate the dashboard view without the max_containers column.
CREATE OR REPLACE VIEW iphone_management_dashboard AS
SELECT
  i.id,
  i.name,
  i.model,
  i.ip_address,
  i.port,
  i.status,
  i.last_seen,
  i.assigned_bot_id,

  -- Container statistics from the new function
  COALESCE(stats.total_containers, 0) as total_containers,
  COALESCE(stats.available_containers, 0) as available_containers,
  COALESCE(stats.assigned_containers, 0) as assigned_containers,
  COALESCE(stats.in_use_containers, 0) as in_use_containers,

  -- Performance metrics
  COALESCE(ic_stats.avg_success_rate, 100.0) as avg_success_rate,
  COALESCE(ic_stats.total_actions, 0) as total_actions_performed,
  COALESCE(ic_stats.total_error_count, 0) as total_error_count,

  -- Health indicators
  CASE
    WHEN i.last_seen > CURRENT_TIMESTAMP - INTERVAL '5 minutes' THEN 'online'
    WHEN i.last_seen > CURRENT_TIMESTAMP - INTERVAL '1 hour' THEN 'idle'
    ELSE 'offline'
  END as connection_status,

  i.created_at,
  i.updated_at

FROM iphones i
LEFT JOIN LATERAL (
  SELECT * FROM get_iphone_container_stats(i.id)
) stats ON true
LEFT JOIN (
  SELECT
    iphone_id,
    AVG(success_rate) as avg_success_rate,
    SUM(total_actions_performed) as total_actions,
    SUM(error_count) as total_errors
  FROM iphone_containers
  GROUP BY iphone_id
) ic_stats ON ic_stats.iphone_id = i.id
ORDER BY i.name;

COMMENT ON VIEW iphone_management_dashboard IS 'Dashboard view for iPhone management with statistics (v2: removed max_containers)'; 