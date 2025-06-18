--
-- list_files.lua
--
-- Lists the contents of a directory and saves the list to a file.
--

-- The directory to list
local target_directory = "/var/mobile/Media/"

-- The path for the results file (inside the API-accessible directory)
local result_file_path = "/var/mobile/Media/1ferver/file_listing.txt"
local output = {}

local function log(message)
    table.insert(output, tostring(message))
end

log("Starting directory listing for: " .. target_directory)

-- The 'lfs' (LuaFileSystem) library is standard for this.
-- We check if it's available.
local status, lfs = pcall(require, "lfs")

if not status then
    log("FAILURE: 'lfs' library not available. Cannot list directory contents.")
else
    log("SUCCESS: 'lfs' library is available.")
    
    local dir_status, err = pcall(function()
        for file in lfs.dir(target_directory) do
            if file ~= "." and file ~= ".." then
                local full_path = target_directory .. file
                local attributes = lfs.attributes(full_path)
                local file_type = attributes and attributes.mode or "unknown"
                log(string.format("Found: %-20s Type: %s", file, file_type))
            end
        end
    end)

    if not dir_status then
        log("ERROR listing directory: " .. tostring(err))
    end
end

log("Directory listing finished.")

-- Write the collected output to the results file
local file, file_err = io.open(result_file_path, "w")
if file then
    file:write(table.concat(output, "\n"))
    file:close()
else
    print("Could not write to result file: " .. tostring(file_err))
end 