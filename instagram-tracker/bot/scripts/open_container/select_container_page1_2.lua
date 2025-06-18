;(function(old_init_orien)  -- record begin

local play_speed = 1.0  -- Speed
local play_times = 1    -- Repeat Times

local sys_ = {}
for k, v in pairs(sys) do
	if k == 'msleep' or k == 'sleep' then
		sys_[k] = function(s) v(s / play_speed) end
	else
		sys_[k] = v
	end
end

local sys = sys_
local mSleep = sys.msleep
local function actions()


sys.msleep(1291)
touch.on(3, 458, 408)
sys.msleep(18)
touch.move(3, 458, 408, 50, 92)
sys.msleep(17)
touch.move(3, 458, 408, 200, 50)
sys.msleep(17)
touch.move(3, 458, 408, 250, 50)
touch.off(3, 458, 408)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
