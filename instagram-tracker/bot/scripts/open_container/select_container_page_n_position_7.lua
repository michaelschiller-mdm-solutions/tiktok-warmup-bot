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


sys.msleep(179)
touch.on(4, 535, 682)
sys.msleep(33)
touch.move(4, 535, 682, 183, 50)
sys.msleep(17)
touch.move(4, 535, 682, 383, 50)
sys.msleep(17)
touch.move(4, 535, 682, 483, 50)
touch.off(4, 535, 682)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
