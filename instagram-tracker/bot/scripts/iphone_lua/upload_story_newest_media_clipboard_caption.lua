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


sys.msleep(1246)
touch.on(5, 398, 1297)
sys.msleep(35)
touch.move(5, 398, 1297, 167, 50)
sys.msleep(17)
touch.move(5, 398, 1297, 300, 50)
sys.msleep(17)
touch.move(5, 398, 1297, 367, 50)
touch.off(5, 398, 1297)

sys.msleep(4553)
touch.on(1, 499, 1270)
sys.msleep(33)
touch.move(1, 499, 1270, 83, 50)
sys.msleep(17)
touch.move(1, 499, 1270, 100, 50)
touch.off(1, 499, 1270)

sys.msleep(2284)
touch.on(2, 33, 1277)
sys.msleep(34)
touch.move(2, 33, 1277, 83, 50)
sys.msleep(17)
touch.move(2, 33, 1277, 133, 50)
touch.off(2, 33, 1277)

sys.msleep(3086)
touch.on(3, 395, 691)
sys.msleep(16)
touch.move(3, 395, 691, 150, 50)
sys.msleep(17)
touch.move(3, 395, 691, 383, 50)
sys.msleep(17)
touch.move(3, 395, 691, 533, 50)
touch.off(3, 395, 691)

sys.msleep(4217)
touch.on(4, 182, 1125)
sys.msleep(18)
touch.move(4, 182, 1125, 50, 50)
sys.msleep(17)
touch.move(4, 182, 1125, 267, 50)
sys.msleep(17)
touch.move(4, 182, 1125, 433, 50)
sys.msleep(16)
touch.move(4, 182, 1125, 583, 50)
sys.msleep(17)
touch.move(4, 182, 1125, 683, 50)
sys.msleep(17)
touch.move(4, 182, 1125, 750, 50)
sys.msleep(17)
touch.move(4, 182, 1125, 817, 50)
sys.msleep(16)
touch.move(4, 182, 1125, 850, 50)
sys.msleep(17)
touch.move(4, 182, 1125, 867, 50)
sys.msleep(17)
touch.move(4, 182, 1125, 883, 50)
sys.msleep(117)
touch.move(4, 182, 1125, 900, 50)
sys.msleep(267)
touch.move(4, 182, 1125, 917, 50)
sys.msleep(50)
touch.move(4, 182, 1125, 933, 50)
sys.msleep(33)
touch.move(4, 182, 1125, 950, 50)
sys.msleep(734)
touch.move(4, 182, 1125, 833, 50)
sys.msleep(16)
touch.move(4, 182, 1125, 600, 50)
touch.off(4, 182, 1125)

sys.msleep(1548)
touch.on(6, 348, 735)
sys.msleep(18)
touch.move(6, 348, 735, 33, 50)
sys.msleep(17)
touch.move(6, 348, 735, 233, 50)
sys.msleep(17)
touch.move(6, 348, 735, 383, 50)
sys.msleep(17)
touch.move(6, 348, 735, 517, 50)
sys.msleep(16)
touch.move(6, 348, 735, 583, 50)
sys.msleep(17)
touch.move(6, 348, 735, 600, 50)
sys.msleep(17)
touch.move(6, 348, 735, 633, 50)
sys.msleep(17)
touch.move(6, 348, 735, 650, 50)
sys.msleep(17)
touch.move(6, 348, 735, 667, 50)
sys.msleep(16)
touch.move(6, 348, 735, 683, 50)
sys.msleep(734)
touch.move(6, 348, 735, 650, 50)
sys.msleep(17)
touch.move(6, 348, 735, 450, 50)
touch.off(6, 348, 735)

sys.msleep(985)
touch.on(5, 208, 629)
sys.msleep(17)
touch.move(5, 208, 629, 17, 50)
sys.msleep(16)
touch.move(5, 208, 629, 183, 50)
sys.msleep(17)
touch.move(5, 208, 629, 283, 50)
sys.msleep(17)
touch.move(5, 208, 629, 317, 50)
touch.off(5, 208, 629)

sys.msleep(2385)
touch.on(1, 655, 724)
sys.msleep(17)
touch.move(1, 655, 724, 217, 50)
sys.msleep(16)
touch.move(1, 655, 724, 367, 50)
sys.msleep(17)
touch.move(1, 655, 724, 400, 50)
touch.off(1, 655, 724)

sys.msleep(2150)
touch.on(2, 707, 1245)
sys.msleep(18)
touch.move(2, 707, 1245, 83, 8)
sys.msleep(16)
touch.move(2, 707, 1245, 317, 9)
sys.msleep(17)
touch.move(2, 707, 1245, 500, 10)
sys.msleep(17)
touch.move(2, 707, 1245, 583, 10)
sys.msleep(17)
touch.move(2, 707, 1245, 583, 50)
touch.off(2, 707, 1245)

sys.msleep(1749)
touch.on(3, 558, 1242)
sys.msleep(34)
touch.move(3, 558, 1242, 233, 50)
sys.msleep(17)
touch.move(3, 558, 1242, 500, 50)
sys.msleep(17)
touch.move(3, 558, 1242, 600, 50)
touch.off(3, 558, 1242)

sys.msleep(1802)
touch.on(3, 546, 1255)
sys.msleep(33)
touch.move(3, 546, 1255, 83, 50)
sys.msleep(17)
touch.move(3, 546, 1255, 300, 50)
sys.msleep(17)
touch.move(3, 546, 1255, 483, 50)
sys.msleep(17)
touch.move(3, 546, 1255, 550, 50)
touch.off(3, 546, 1255)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
