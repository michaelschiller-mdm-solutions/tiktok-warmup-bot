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


sys.msleep(469)
touch.on(4, 381, 1258)
touch.off(4, 381, 1258)

sys.msleep(5818)
touch.on(3, 704, 28)
sys.msleep(35)
touch.move(3, 704, 28, 67, 50)
touch.off(3, 704, 28)

sys.msleep(3651)
touch.on(5, 658, 1243)
touch.off(5, 658, 1243)

sys.msleep(1716)
touch.on(1, 205, 711)
sys.msleep(18)
touch.move(1, 205, 711, 167, 50)
sys.msleep(16)
touch.move(1, 205, 711, 417, 50)
sys.msleep(17)
touch.move(1, 205, 711, 617, 50)
sys.msleep(16)
touch.move(1, 205, 711, 750, 50)
sys.msleep(17)
touch.move(1, 205, 711, 833, 50)
sys.msleep(17)
touch.move(1, 205, 711, 850, 50)
sys.msleep(16)
touch.move(1, 205, 711, 867, 50)
sys.msleep(17)
touch.move(1, 205, 711, 900, 50)
sys.msleep(17)
touch.move(1, 205, 711, 917, 50)
sys.msleep(17)
touch.move(1, 205, 711, 933, 50)
sys.msleep(16)
touch.move(1, 205, 711, 950, 50)
sys.msleep(67)
touch.move(1, 205, 711, 967, 4)
sys.msleep(33)
touch.move(1, 205, 711, 983, 50)
sys.msleep(17)
touch.move(1, 205, 711, 1000, 50)
sys.msleep(17)
touch.move(1, 205, 711, 1017, 50)
sys.msleep(667)
touch.move(1, 205, 711, 1000, 3)
sys.msleep(17)
touch.move(1, 205, 711, 850, 50)
sys.msleep(17)
touch.move(1, 205, 711, 617, 50)
touch.off(1, 205, 711)

sys.msleep(2119)
touch.on(2, 199, 170)
sys.msleep(33)
touch.move(2, 199, 170, 50, 50)
sys.msleep(17)
touch.move(2, 199, 170, 167, 50)
sys.msleep(17)
touch.move(2, 199, 170, 283, 50)
sys.msleep(17)
touch.move(2, 199, 170, 350, 50)
sys.msleep(17)
touch.move(2, 199, 170, 433, 50)
sys.msleep(17)
touch.move(2, 199, 170, 483, 50)
sys.msleep(17)
touch.move(2, 199, 170, 533, 50)
sys.msleep(17)
touch.move(2, 199, 170, 583, 50)
sys.msleep(17)
touch.move(2, 199, 170, 617, 50)
sys.msleep(16)
touch.move(2, 199, 170, 650, 50)
sys.msleep(17)
touch.move(2, 199, 170, 667, 50)
sys.msleep(17)
touch.move(2, 199, 170, 683, 50)
sys.msleep(33)
touch.move(2, 199, 170, 700, 50)
sys.msleep(83)
touch.move(2, 199, 170, 717, 50)
sys.msleep(500)
touch.move(2, 199, 170, 683, 50)
sys.msleep(17)
touch.move(2, 199, 170, 533, 50)
touch.off(2, 199, 170)

sys.msleep(768)
touch.on(6, 152, 89)
sys.msleep(17)
touch.move(6, 152, 89, 83, 71)
sys.msleep(17)
touch.move(6, 152, 89, 233, 71)
sys.msleep(16)
touch.move(6, 152, 89, 300, 71)
sys.msleep(17)
touch.move(6, 152, 89, 317, 71)
touch.off(6, 152, 89)

sys.msleep(3769)
touch.on(3, 717, 68)
sys.msleep(17)
touch.move(3, 717, 68, 33, 50)
sys.msleep(16)
touch.move(3, 717, 68, 150, 50)
sys.msleep(17)
touch.move(3, 717, 68, 200, 50)
touch.off(3, 717, 68)

sys.msleep(3919)
touch.on(4, 470, 1240)
sys.msleep(33)
touch.move(4, 470, 1240, 200, 50)
sys.msleep(17)
touch.move(4, 470, 1240, 367, 50)
sys.msleep(16)
touch.move(4, 470, 1240, 450, 50)
touch.off(4, 470, 1240)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
