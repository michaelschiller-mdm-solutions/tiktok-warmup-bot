-- 0_navigate_to_login_form.lua
--
-- This script handles the initial Instagram screen, which can either be the
-- login form directly or a "Create Account" page.
--
-- 1. It first checks for the main "Log in" button to see if we're already on the login screen.
-- 2. If not, it looks for a text-based "Log in" link (common on create account pages).
-- 3. If it finds the link, it clicks it to navigate to the login form.
-- 4. It waits and verifies that the login form is visible after the click.
-- 5. If neither element is found, it logs an error and terminates.

-- Configuration
local MAX_WAIT_TIME = 5000 -- 5 seconds
local POLLING_INTERVAL = 1000 -- 1 second
local LOGIN_BUTTON_IMG = "/var/mobile/Media/1ferver/lua/scripts/login_button.png"
local SIMILARITY_THRESHOLD = 0.85

-- Function to log messages
function log_message(message)
  nLog(string.format("[Login Nav] %s", message))
end

-- Function to find an image on screen
function find_image(image_path)
  local points = image.cv_find_image(nil, image_path, 0, 0, 1, 1, SIMILARITY_THRESHOLD, false, 1)
  if points and points[1] then
    log_message(string.format("Found image '%s' at: %d, %d", image_path, points[1].x, points[1].y))
    return points[1]
  end
  return nil
end

-- Function to find text on screen
function find_text_and_click(text)
    local width, height = screen.get_size()
    local text_locations = ocr.find_text(0, 0, width, height, 0, text)
    if text_locations and #text_locations > 0 then
        local loc = text_locations[1]
        log_message(string.format("Found text '%s' at: %d, %d", text, loc.x, loc.y))
        touch.down(1, loc.x, loc.y)
        mSleep(50)
        touch.up(1)
        log_message(string.format("Clicked on text '%s'", text))
        return true
    end
    return false
end


-- Main Logic
log_message("Starting navigation to login form...")
local start_time = os.time() * 1000

while (os.time() * 1000 - start_time) < MAX_WAIT_TIME do
  -- Case 1: Already on the login screen (check for the big blue button)
  if find_image(LOGIN_BUTTON_IMG) then
    log_message("✅ Success: Already on the login screen.")
    return
  end

  -- Case 2: On a different screen, look for a "Log in" text link to click
  log_message("Login button image not found. Looking for 'Log in' text...")
  if find_text_and_click("Log in") then
    log_message("Clicked 'Log in' text. Waiting for login screen to appear...")
    mSleep(2000) -- Wait for transition
    if find_image(LOGIN_BUTTON_IMG) then
       log_message("✅ Success: Navigated to the login screen.")
       return
    else
       log_message("❌ Error: Clicked 'Log in' text, but login screen did not appear.")
       return
    end
  end
  
  log_message("Neither image nor text found. Retrying...")
  mSleep(POLLING_INTERVAL)
end

log_message(string.format("❌ Error: Timed out after %dms. Could not find login form.", MAX_WAIT_TIME)) 