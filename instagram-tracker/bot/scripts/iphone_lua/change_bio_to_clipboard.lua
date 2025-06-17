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


sys.msleep(697)
touch.on(4, 693, 1286)
sys.msleep(34)
touch.move(4, 693, 1286, 100, 50)
sys.msleep(16)
touch.move(4, 693, 1286, 183, 50)
sys.msleep(17)
touch.move(4, 693, 1286, 233, 50)
touch.off(4, 693, 1286)

sys.msleep(1850)
touch.on(6, 230, 411)
sys.msleep(18)
touch.move(6, 230, 411, 167, 50)
sys.msleep(16)
touch.move(6, 230, 411, 333, 50)
sys.msleep(17)
touch.move(6, 230, 411, 367, 50)
touch.off(6, 230, 411)

sys.msleep(2250)
touch.on(6, 215, 430)
sys.msleep(18)
touch.move(6, 215, 430, 200, 50)
sys.msleep(16)
touch.move(6, 215, 430, 233, 50)
touch.off(6, 215, 430)

sys.msleep(3184)
touch.on(5, 338, 720)
sys.msleep(18)
touch.move(5, 338, 720, 650, 12)
sys.msleep(17)
touch.move(5, 338, 720, 1000, 12)
sys.msleep(17)
touch.move(5, 343, 726, 1083, 50)
sys.msleep(17)
touch.move(5, 349, 730, 1083, 50)
touch.off(5, 353, 735)

sys.msleep(3084)
touch.on(3, 118, 153)
sys.msleep(18)
touch.move(3, 118, 153, 167, 50)
sys.msleep(16)
touch.move(3, 118, 153, 333, 50)
sys.msleep(17)
touch.move(3, 118, 153, 500, 50)
sys.msleep(17)
touch.move(3, 118, 153, 583, 50)
sys.msleep(16)
touch.move(3, 118, 153, 633, 50)
sys.msleep(67)
touch.move(3, 118, 153, 650, 50)
sys.msleep(17)
touch.move(3, 118, 153, 667, 50)
sys.msleep(16)
touch.move(3, 118, 153, 700, 50)
sys.msleep(17)
touch.move(3, 118, 153, 733, 50)
sys.msleep(17)
touch.move(3, 118, 153, 750, 50)
sys.msleep(16)
touch.move(3, 118, 153, 767, 50)
sys.msleep(17)
touch.move(3, 118, 153, 783, 50)
sys.msleep(17)
touch.move(3, 118, 153, 800, 50)
sys.msleep(17)
touch.move(3, 118, 153, 817, 50)
sys.msleep(33)
touch.move(3, 118, 153, 833, 50)
sys.msleep(34)
touch.move(3, 118, 153, 850, 50)
sys.msleep(83)
touch.move(3, 118, 153, 867, 50)
sys.msleep(34)
touch.move(3, 118, 153, 883, 50)
sys.msleep(17)
touch.move(3, 118, 153, 900, 50)
sys.msleep(16)
touch.move(3, 127, 165, 900, 50)
sys.msleep(66)
touch.move(3, 127, 165, 917, 50)
sys.msleep(17)
touch.move(3, 126, 165, 933, 50)
sys.msleep(183)
touch.move(3, 126, 165, 767, 50)
touch.off(3, 124, 162)

sys.msleep(869)
touch.on(2, 154, 231)
sys.msleep(16)
touch.move(2, 154, 231, 17, 50)
sys.msleep(17)
touch.move(2, 154, 231, 67, 50)
touch.off(2, 154, 231)

sys.msleep(2318)
touch.on(1, 696, 66)
sys.msleep(16)
touch.move(1, 696, 66, 17, 50)
sys.msleep(17)
touch.move(1, 696, 66, 67, 50)
touch.off(1, 696, 66)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
