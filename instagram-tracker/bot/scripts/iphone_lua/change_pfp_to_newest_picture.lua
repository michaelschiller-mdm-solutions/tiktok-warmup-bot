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


sys.msleep(1046)
touch.on(5, 696, 1282)
touch.off(5, 696, 1282)

sys.msleep(3249)
touch.on(1, 240, 428)
sys.msleep(18)
touch.move(1, 240, 428, 50, 81)
sys.msleep(16)
touch.move(1, 240, 428, 150, 81)
sys.msleep(17)
touch.move(1, 240, 428, 200, 80)
touch.off(1, 240, 428)

sys.msleep(4284)
touch.on(3, 439, 361)
sys.msleep(34)
touch.move(3, 439, 361, 100, 50)
sys.msleep(17)
touch.move(3, 439, 361, 167, 50)
touch.off(3, 439, 361)

sys.msleep(1867)
touch.on(6, 373, 783)
sys.msleep(35)
touch.move(6, 373, 783, 50, 50)
sys.msleep(17)
touch.move(6, 373, 783, 183, 50)
sys.msleep(17)
touch.move(6, 373, 783, 217, 50)
touch.off(6, 373, 783)

sys.msleep(13385)
touch.on(2, 713, 15)
touch.off(2, 713, 15)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
