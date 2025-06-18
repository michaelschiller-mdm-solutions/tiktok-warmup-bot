-- update-iphone-1-containers.sql
-- Purpose: Update the container count for iPhone "1" to 531.

DO $$
DECLARE
    v_iphone_id INTEGER;
    v_current_max_container INTEGER;
    V_DESIRED_TOTAL_CONTAINERS INTEGER := 531;
BEGIN
    -- Find the iPhone ID
    SELECT id INTO v_iphone_id FROM iphones WHERE name = '1' LIMIT 1;

    IF v_iphone_id IS NOT NULL THEN
        -- Find the current max container number for this iPhone
        SELECT COALESCE(MAX(container_number), 0) INTO v_current_max_container
        FROM iphone_containers
        WHERE iphone_id = v_iphone_id;

        -- Check if we need to add more containers
        IF V_DESIRED_TOTAL_CONTAINERS > v_current_max_container THEN
            -- Insert the missing containers
            RAISE NOTICE 'Adding containers from % to % for iPhone ID %', v_current_max_container + 1, V_DESIRED_TOTAL_CONTAINERS, v_iphone_id;
            INSERT INTO iphone_containers (iphone_id, container_number)
            SELECT v_iphone_id, generate_series(v_current_max_container + 1, V_DESIRED_TOTAL_CONTAINERS);
        ELSE
            RAISE NOTICE 'iPhone ID % already has % containers. No new containers added.', v_iphone_id, v_current_max_container;
        END IF;
    ELSE
        RAISE NOTICE 'iPhone with name "1" not found.';
    END IF;
END $$; 