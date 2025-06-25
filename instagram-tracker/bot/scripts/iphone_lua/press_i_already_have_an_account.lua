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


sys.msleep(1510)
touch.on(6, 389, 1156)
sys.msleep(18)
touch.move(6, 389, 1156, 167, 50)
sys.msleep(16)
touch.move(6, 389, 1156, 233, 50)
touch.off(6, 389, 1156)

sys.msleep(1717)
touch.on(1, 509, 1211)
sys.msleep(18)
touch.move(1, 509, 1211, 167, 50)
sys.msleep(17)
touch.move(1, 509, 1211, 450, 50)
sys.msleep(17)
touch.move(1, 509, 1211, 667, 50)
sys.msleep(17)
touch.move(1, 509, 1211, 767, 50)
touch.off(1, 509, 1211)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
