# WARMUP PHASE

## Phase change Bio 
(accepted Categories Text: bio)

instagram-tracker\bot\scripts\api\ios16_photo_cleaner.js
instagram-tracker\bot\scripts\api\clipboard.js
instagram-tracker\bot\scripts\api\lua_executor.js (this script executes the lua scripts on the iphone:  the following scripts need to be called in order: 
always open the container first of the assigned container number: for example:
instagram-tracker\bot\scripts\open_container\open_container1.lua
instagram-tracker\bot\scripts\iphone_lua\change_bio_to_clipboard.lua)



## Phase Change Gender
no Text or Media needed

instagram-tracker\bot\scripts\api\ios16_photo_cleaner.js
instagram-tracker\bot\scripts\api\lua_executor.js (this script executes the lua scripts on the iphone:  the following scripts need to be called in order: 
always open the container first of the assigned container number: for example:
instagram-tracker\bot\scripts\open_container\open_container1.lua
instagram-tracker\bot\scripts\iphone_lua\change_gender_to_female.lua
)


## Phase Change name
(accepted Categories Text: name (field needs to be created, only username exists (username is the main one)))

instagram-tracker\bot\scripts\api\ios16_photo_cleaner.js
instagram-tracker\bot\scripts\api\clipboard.js
instagram-tracker\bot\scripts\api\lua_executor.js (this script executes the lua scripts on the iphone:  the following scripts need to be called in order: 
always open the container first of the assigned container number: for example:
instagram-tracker\bot\scripts\open_container\open_container1.lua
instagram-tracker\bot\scripts\iphone_lua\change_name_to_clipboard.lua
)


## phase Username
(accepted Categories Text: username field)

instagram-tracker\bot\scripts\api\ios16_photo_cleaner.js
instagram-tracker\bot\scripts\api\clipboard.js
instagram-tracker\bot\scripts\api\lua_executor.js (this script executes the lua scripts on the iphone:  the following scripts need to be called in order: 
always open the container first of the assigned container number: for example:
instagram-tracker\bot\scripts\open_container\open_container1.lua
instagram-tracker\bot\scripts\iphone_lua\change_username_to_clipboard.lua
)
--> AFTER THIS STEP THE USERNAME NEEDS TO BE CHANGED OF THAT ACCOUNT IN OUR DATABASE TO THE SPECIFIED USERNAME



## Phase upload first highlight
(accepted Categories Image: highlight, any)
(accepted Categories Text: highlight_group_category_name(needs to be created)a)

instagram-tracker\bot\scripts\api\ios16_photo_cleaner.js
instagram-tracker\bot\scripts\api\gallery.js
instagram-tracker\bot\scripts\api\clipboard.js
instagram-tracker\bot\scripts\api\lua_executor.js (this script executes the lua scripts on the iphone:  the following scripts need to be called in order: 
always open the container first of the assigned container number: for example:
instagram-tracker\bot\scripts\open_container\open_container1.lua
instagram-tracker\bot\scripts\iphone_lua\upload_first_highlight_group_with_clipboard_name_newest_media_no_caption.lua
)


## Phase upload new highlightgroup (this phase can only be assigned if Phase first highlight group has been done)
(accepted Categories Image: highlight, any)
(accepted Categories Text:highlight_group_name (needs to be created))

instagram-tracker\bot\scripts\api\ios16_photo_cleaner.js
instagram-tracker\bot\scripts\api\gallery.js
instagram-tracker\bot\scripts\api\clipboard.js
instagram-tracker\bot\scripts\api\lua_executor.js (this script executes the lua scripts on the iphone:  the following scripts need to be called in order: 
always open the container first of the assigned container number: for example:
instagram-tracker\bot\scripts\open_container\open_container1.lua
instagram-tracker\bot\scripts\iphone_lua\upload_new_highlightgroup_clipboard_name_newest_media_no_caption.lua.lua
)


## Phase upload post with caption
(accepted Categories Image:post, any)
(accepted Categories Text: post, any)

instagram-tracker\bot\scripts\api\ios16_photo_cleaner.js
instagram-tracker\bot\scripts\api\gallery.js
instagram-tracker\bot\scripts\api\clipboard.js
instagram-tracker\bot\scripts\api\lua_executor.js (this script executes the lua scripts on the iphone:  the following scripts need to be called in order: 
always open the container first of the assigned container number: for example:
instagram-tracker\bot\scripts\open_container\open_container1.lua
instagram-tracker\bot\scripts\iphone_lua\upload_post_newest_media_clipboard_caption.lua
)


## Phase upload post no caption
(accepted Categories Image:post, any)

instagram-tracker\bot\scripts\api\ios16_photo_cleaner.js
instagram-tracker\bot\scripts\api\gallery.js
instagram-tracker\bot\scripts\api\lua_executor.js (this script executes the lua scripts on the iphone:  the following scripts need to be called in order: 
always open the container first of the assigned container number: for example:
instagram-tracker\bot\scripts\open_container\open_container1.lua
instagram-tracker\bot\scripts\iphone_lua\upload_post_newest_media_no_caption.lua
)



## Phase upload story with caption
(accepted Categories Image: story, any)
(accepted Categories Text: story, any)

instagram-tracker\bot\scripts\api\ios16_photo_cleaner.js
instagram-tracker\bot\scripts\api\gallery.js
instagram-tracker\bot\scripts\api\lua_executor.js (this script executes the lua scripts on the iphone:  the following scripts need to be called in order: 
always open the container first of the assigned container number: for example:
instagram-tracker\bot\scripts\open_container\open_container1.lua
instagram-tracker\bot\scripts\iphone_lua\upload_story_newest_media_clipboard_caption.lua
)


## Phase upload story no caption
(accepted Categories Image:story, any)

instagram-tracker\bot\scripts\api\ios16_photo_cleaner.js
instagram-tracker\bot\scripts\api\gallery.js
instagram-tracker\bot\scripts\api\lua_executor.js (this script executes the lua scripts on the iphone:  the following scripts need to be called in order: 
always open the container first of the assigned container number: for example:
instagram-tracker\bot\scripts\open_container\open_container1.lua
instagram-tracker\bot\scripts\iphone_lua\upload_story_newest_media_no_caption.lua
)


# ACTIVITY PHASE

## Phase upload post with caption
(accepted Categories Image:highlight, story, any)
(accepted Categories Text: highlight, story, any)

instagram-tracker\bot\scripts\api\ios16_photo_cleaner.js
instagram-tracker\bot\scripts\api\gallery.js
instagram-tracker\bot\scripts\api\clipboard.js
instagram-tracker\bot\scripts\api\lua_executor.js (this script executes the lua scripts on the iphone:  the following scripts need to be called in order: 
always open the container first of the assigned container number: for example:
instagram-tracker\bot\scripts\open_container\open_container1.lua
instagram-tracker\bot\scripts\iphone_lua\post_story_push_to_highlight_with_clipboard_caption.lua
)
--> creates a highlight group with text (need to create the database entry for highlight group with the pictures inside.)





### Need: highlight_group_category_position
The order at which a highlight is created, needs to be saved. 

We need to revise our content assignments. we will need a ME category that will always be the first for every model and that category will be the only one that needs to be uploaded for that model


other than that we will create a big database with other categories and these categories will be randomly assigned to the users. it will need to be possible to assign multiple highlights at a time to a category. we will need category mapping. ( newest category is being shown first. )