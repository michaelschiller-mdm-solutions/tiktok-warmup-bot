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


sys.msleep(534)
touch.on(1, 389, 1273)
sys.msleep(18)
touch.move(1, 389, 1273, 83, 50)
sys.msleep(17)
touch.move(1, 389, 1273, 250, 50)
sys.msleep(17)
touch.move(1, 389, 1273, 283, 50)
touch.off(1, 389, 1273)

sys.msleep(1966)
touch.on(2, 736, 6)
sys.msleep(35)
touch.move(2, 736, 6, 133, 50)
sys.msleep(17)
touch.move(2, 736, 6, 167, 50)
touch.off(2, 736, 6)

sys.msleep(1752)
touch.on(2, 705, 0)
sys.msleep(33)
touch.move(2, 705, 0, 133, 50)
touch.off(2, 705, 0)

sys.msleep(1017)
touch.on(2, 715, 34)
sys.msleep(51)
touch.move(2, 715, 34, 17, 50)
touch.off(2, 715, 34)

sys.msleep(7285)
touch.on(4, 658, 1240)
sys.msleep(17)
touch.move(4, 658, 1240, 183, 50)
sys.msleep(17)
touch.move(4, 658, 1240, 283, 50)
touch.off(4, 658, 1240)

sys.msleep(5867)
touch.on(3, 501, 1103)
sys.msleep(18)
touch.move(3, 501, 1103, 17, 50)
sys.msleep(16)
touch.move(3, 501, 1103, 100, 50)
sys.msleep(17)
touch.move(3, 501, 1103, 117, 50)
touch.off(3, 501, 1103)

sys.msleep(11569)
touch.on(5, 459, 1206)
sys.msleep(16)
touch.move(5, 459, 1206, 150, 50)
sys.msleep(17)
touch.move(5, 459, 1206, 183, 50)
touch.off(5, 459, 1206)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
