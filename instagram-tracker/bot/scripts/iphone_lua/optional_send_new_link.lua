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


sys.msleep(3339)
touch.on(2, 377, 1018)
sys.msleep(18)
touch.move(2, 377, 1018, 50, 50)
sys.msleep(17)
touch.move(2, 377, 1018, 100, 50)
touch.off(2, 377, 1018)

sys.msleep(1468)
touch.on(2, 325, 1033)
sys.msleep(33)
touch.move(2, 325, 1033, 433, 50)
sys.msleep(16)
touch.move(2, 325, 1033, 733, 50)
sys.msleep(17)
touch.move(2, 325, 1033, 917, 50)
sys.msleep(17)
touch.move(2, 325, 1033, 967, 50)
sys.msleep(50)
touch.move(2, 325, 1033, 700, 50)
touch.off(2, 325, 1033)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
