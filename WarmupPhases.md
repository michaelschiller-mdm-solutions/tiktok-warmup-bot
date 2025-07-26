# WARMUP PHASES

## Explanation

  models have content assigned to them. models have accounts assigned to them. these accounts should get content from the model they're assigned to, assigned to the accounts for each phase. means:  each account will have mapped out what content they will have for what phase. 

we have text and picture content. they are categorized. 

accounts need to go through phases to be properly warmed up. each account goes through each phase. each phase needs to have the accounts get content assigned to them, so they can be ran throught the phase. for example a post without caption needs a picture.  
picture content is always mandatory. text content is optional.



WarmupPhases.md holds the needed content for every phase and what category. 

## Container Selection Process

**IMPORTANT**: All phases now use the updated container selection system. Instead of individual `open_container{N}.lua` scripts, the system now uses:

1. `open_settings.lua` - Opens the container management interface
2. `scroll_to_top_container.lua` - Ensures we start from the top of the container list
3. Container navigation and selection based on pagination rules:
   - Page 1: Containers 1-12 (direct selection)
   - Page 2+: Navigate to correct page, then select position

This is handled automatically by the `AutomationBridge.selectContainer(containerNumber)` method.

---

## Phase Change Bio 
(accepted Categories Text: bio)

**Required Scripts:**
- `instagram-tracker\bot\scripts\api\ios16_photo_cleaner.js`
- `instagram-tracker\bot\scripts\api\clipboard.js`
- `instagram-tracker\bot\scripts\api\lua_executor.js`

**Execution Order:**
1. **Container Selection**: Use `AutomationBridge.selectContainer(assignedContainerNumber)`
   - This automatically executes: `open_settings.lua` → `scroll_to_top_container.lua` → container selection
2. **Bio Change**: `instagram-tracker\bot\scripts\iphone_lua\change_bio_to_clipboard.lua`

---

## Phase Change Gender
(no Text or Media needed)

**Required Scripts:**
- `instagram-tracker\bot\scripts\api\ios16_photo_cleaner.js`
- `instagram-tracker\bot\scripts\api\lua_executor.js`

**Execution Order:**
1. **Container Selection**: Use `AutomationBridge.selectContainer(assignedContainerNumber)`
2. **Gender Change**: `instagram-tracker\bot\scripts\iphone_lua\change_gender_to_female.lua`

---

## Phase Change Name
(accepted Categories Text: name - field needs to be created, only username exists currently)

**Required Scripts:**
- `instagram-tracker\bot\scripts\api\ios16_photo_cleaner.js`
- `instagram-tracker\bot\scripts\api\clipboard.js`
- `instagram-tracker\bot\scripts\api\lua_executor.js`

**Execution Order:**
1. **Container Selection**: Use `AutomationBridge.selectContainer(assignedContainerNumber)`
2. **Name Change**: `instagram-tracker\bot\scripts\iphone_lua\change_name_to_clipboard.lua`

---

## Phase Username
(accepted Categories Text: username field)

**Required Scripts:**
- `instagram-tracker\bot\scripts\api\ios16_photo_cleaner.js`
- `instagram-tracker\bot\scripts\api\clipboard.js`
- `instagram-tracker\bot\scripts\api\lua_executor.js`

**Execution Order:**
1. **Container Selection**: Use `AutomationBridge.selectContainer(assignedContainerNumber)`
2. **Username Change**: `instagram-tracker\bot\scripts\iphone_lua\change_username_to_clipboard.lua`

**⚠️ IMPORTANT**: After this step, the username needs to be updated in our database to match the new username.

---

## Phase Upload First Highlight
(accepted Categories Image: highlight, any)
(accepted Categories Text: highlight_group_category_name - needs to be created)

**Required Scripts:**
- `instagram-tracker\bot\scripts\api\ios16_photo_cleaner.js`
- `instagram-tracker\bot\scripts\api\gallery.js`
- `instagram-tracker\bot\scripts\api\clipboard.js`
- `instagram-tracker\bot\scripts\api\lua_executor.js`

**Execution Order:**
1. **Container Selection**: Use `AutomationBridge.selectContainer(assignedContainerNumber)`
2. **First Highlight Upload**: `instagram-tracker\bot\scripts\iphone_lua\upload_first_highlight_group_with_clipboard_name_newest_media_no_caption.lua`

---

## Phase Upload New Highlight Group
(this phase can only be assigned if Phase first highlight group has been completed)
(accepted Categories Image: highlight, any)
(accepted Categories Text: highlight_group_name - needs to be created)

**Required Scripts:**
- `instagram-tracker\bot\scripts\api\ios16_photo_cleaner.js`
- `instagram-tracker\bot\scripts\api\gallery.js`
- `instagram-tracker\bot\scripts\api\clipboard.js`
- `instagram-tracker\bot\scripts\api\lua_executor.js`

**Execution Order:**
1. **Container Selection**: Use `AutomationBridge.selectContainer(assignedContainerNumber)`
2. **New Highlight Group**: `instagram-tracker\bot\scripts\iphone_lua\upload_new_highlightgroup_clipboard_name_newest_media_no_caption.lua`

---

## Phase Upload Post no caption and no likes
(accepted Categories Image: post, any)
(accepted Categories Text: post, any)

**Required Scripts:**
- `instagram-tracker\bot\scripts\api\ios16_photo_cleaner.js`
- `instagram-tracker\bot\scripts\api\gallery.js`
- `instagram-tracker\bot\scripts\api\clipboard.js`
- `instagram-tracker\bot\scripts\api\lua_executor.js`

**Execution Order:**
1. **Container Selection**: Use `AutomationBridge.selectContainer(assignedContainerNumber)`
2. **Post Upload**: `instagram-tracker\bot\scripts\iphone_lua\Upload_post_no_caption_disable_likes.lua`

---
##ACCOUNT NAME MUST BE CHANGED BEFORE
## Phase Upload First Post connect to threads and No Caption disable likes
(accepted Categories Image: post, any)

**Required Scripts:**
- `instagram-tracker\bot\scripts\api\ios16_photo_cleaner.js`
- `instagram-tracker\bot\scripts\api\gallery.js`
- `instagram-tracker\bot\scripts\api\lua_executor.js`

**Execution Order:**
1. **Container Selection**: Use `AutomationBridge.selectContainer(assignedContainerNumber)`
2. **Post Upload**: `instagram-tracker\bot\scripts\iphone_lua\instagram_first_post_set_nolikes_connect_to_threads_no_caption.lua`

---

## Phase Upload Story with Caption
(accepted Categories Image: story, any)
(accepted Categories Text: story, any)

**Required Scripts:**
- `instagram-tracker\bot\scripts\api\ios16_photo_cleaner.js`
- `instagram-tracker\bot\scripts\api\gallery.js`
- `instagram-tracker\bot\scripts\api\clipboard.js`
- `instagram-tracker\bot\scripts\api\lua_executor.js`

**Execution Order:**
1. **Container Selection**: Use `AutomationBridge.selectContainer(assignedContainerNumber)`
2. **Story Upload**: `instagram-tracker\bot\scripts\iphone_lua\upload_story_newest_media_clipboard_caption.lua`

---

## Phase Upload Story No Caption
(accepted Categories Image: story, any)

**Required Scripts:**
- `instagram-tracker\bot\scripts\api\ios16_photo_cleaner.js`
- `instagram-tracker\bot\scripts\api\gallery.js`
- `instagram-tracker\bot\scripts\api\lua_executor.js`

**Execution Order:**
1. **Container Selection**: Use `AutomationBridge.selectContainer(assignedContainerNumber)`
2. **Story Upload**: `instagram-tracker\bot\scripts\iphone_lua\upload_story_newest_media_no_caption.lua`

---

# ACTIVITY PHASES

## Phase Upload Post to Story and Push to Highlight
(accepted Categories Image: highlight, story, any)
(accepted Categories Text: highlight, story, any)

**Required Scripts:**
- `instagram-tracker\bot\scripts\api\ios16_photo_cleaner.js`
- `instagram-tracker\bot\scripts\api\gallery.js`
- `instagram-tracker\bot\scripts\api\clipboard.js`
- `instagram-tracker\bot\scripts\api\lua_executor.js`

**Execution Order:**
1. **Container Selection**: Use `AutomationBridge.selectContainer(assignedContainerNumber)`
2. **Story + Highlight**: `instagram-tracker\bot\scripts\iphone_lua\post_story_push_to_highlight_with_clipboard_caption.lua`

**⚠️ IMPORTANT**: This creates a highlight group with text. Need to create the database entry for highlight group with the pictures inside.

---

# DATABASE REQUIREMENTS

## New Fields Needed

1. **highlight_group_category_name** - Text field for highlight group category names
2. **highlight_group_name** - Text field for individual highlight group names  
3. **name** - Display name field (separate from username)
4. **highlight_group_category_position** - Integer field for highlight group ordering

## Content Category System Revision

### ME Category (Priority)
- **ME category** will always be the first highlight for every model
- This is the only category that needs to be uploaded for that specific model
- Must be created before any other highlights

### Random Category Assignment
- Create a large database of other categories
- Categories will be randomly assigned to users
- Multiple highlights can be assigned to the same category
- Category mapping system needed
- **Newest category is shown first** in the highlight order

## Database Schema Updates

```sql
-- Add new fields to accounts table
ALTER TABLE accounts ADD COLUMN name VARCHAR(255);
ALTER TABLE accounts ADD COLUMN highlight_group_category_name VARCHAR(255);
ALTER TABLE accounts ADD COLUMN highlight_group_name VARCHAR(255);

-- Create highlight groups tracking table
CREATE TABLE highlight_groups (
    id SERIAL PRIMARY KEY,
    account_id VARCHAR(255) NOT NULL,
    category_name VARCHAR(255) NOT NULL,
    group_name VARCHAR(255) NOT NULL,
    position INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Create category mapping table
CREATE TABLE highlight_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    is_me_category BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default ME category
INSERT INTO highlight_categories (name, is_me_category) VALUES ('ME', TRUE);
```

---

# TECHNICAL IMPLEMENTATION NOTES

## Container Selection Integration

The new container selection system in `AutomationBridge.js` automatically handles:
- Opening settings interface (`open_settings.lua`)
- Scrolling to top of container list (`scroll_to_top_container.lua`)
- Navigating to correct page based on container number
- Selecting the specific container position

**Usage in warmup phases:**
```javascript
// Instead of calling individual open_container scripts
await automationBridge.selectContainer(assignedContainerNumber);

// Then proceed with the specific action script
await automationBridge.executeScript('change_bio_to_clipboard.lua');
```

## Error Handling

- Each container selection includes retry logic (up to 25 attempts)
- 2-second initial delay and 1-second retry delays
- System pauses on consecutive failures to prevent iPhone overload
- All script executions are logged with detailed status information

## Performance Considerations

- Container selection is now systematic and reliable
- Pagination logic handles containers 1-1000+ 
- Script sequencing prevents timing conflicts
- Robust error recovery maintains system stability 