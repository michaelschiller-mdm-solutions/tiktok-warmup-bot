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


sys.msleep(1509)
touch.on(6, 693, 1280)
sys.msleep(18)
touch.move(6, 693, 1280, 117, 50)
sys.msleep(16)
touch.move(6, 693, 1280, 200, 50)
touch.off(6, 693, 1280)

sys.msleep(2651)
touch.on(1, 206, 425)
sys.msleep(18)
touch.move(1, 206, 425, 83, 50)
sys.msleep(16)
touch.move(1, 206, 425, 200, 50)
sys.msleep(17)
touch.move(1, 206, 425, 217, 50)
touch.off(1, 206, 425)

sys.msleep(1901)
touch.on(5, 520, 537)
touch.off(5, 520, 537)

sys.msleep(2451)
touch.on(3, 683, 192)
sys.msleep(34)
touch.move(3, 683, 192, 67, 50)
sys.msleep(17)
touch.move(3, 683, 192, 167, 50)
sys.msleep(17)
touch.move(3, 683, 192, 200, 50)
touch.off(3, 683, 192)

sys.msleep(1535)
touch.on(2, 308, 190)
sys.msleep(33)
touch.move(2, 308, 190, 100, 50)
sys.msleep(17)
touch.move(2, 308, 190, 300, 50)
sys.msleep(17)
touch.move(2, 308, 190, 500, 50)
sys.msleep(17)
touch.move(2, 308, 190, 650, 50)
sys.msleep(17)
touch.move(2, 308, 190, 767, 50)
sys.msleep(17)
touch.move(2, 308, 190, 817, 50)
sys.msleep(17)
touch.move(2, 308, 190, 850, 50)
sys.msleep(17)
touch.move(2, 308, 190, 883, 50)
sys.msleep(17)
touch.move(2, 308, 190, 900, 50)
sys.msleep(17)
touch.move(2, 308, 190, 917, 50)
sys.msleep(83)
touch.move(2, 308, 190, 933, 50)
sys.msleep(17)
touch.move(2, 308, 190, 950, 50)
sys.msleep(16)
touch.move(2, 308, 190, 967, 50)
sys.msleep(517)
touch.move(2, 308, 190, 883, 50)
sys.msleep(17)
touch.move(2, 308, 190, 717, 50)
touch.off(2, 308, 190)

sys.msleep(1115)
touch.on(4, 163, 132)
sys.msleep(35)
touch.move(4, 163, 132, 67, 50)
touch.off(4, 163, 132)

sys.msleep(9051)
touch.on(6, 720, 56)
sys.msleep(35)
touch.move(6, 720, 56, 67, 7)
touch.off(6, 720, 56)

sys.msleep(2182)
touch.on(6, 715, 74)
sys.msleep(35)
touch.move(6, 715, 74, 67, 3)
sys.msleep(17)
touch.move(6, 715, 74, 83, 3)
touch.off(6, 715, 74)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
