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


sys.msleep(1955)
touch.on(1, 721, 1290)
sys.msleep(35)
touch.move(1, 721, 1290, 83, 50)
sys.msleep(16)
touch.move(1, 721, 1290, 167, 50)
touch.off(1, 721, 1290)

sys.msleep(2651)
touch.on(4, 254, 416)
sys.msleep(18)
touch.move(4, 254, 416, 167, 50)
sys.msleep(16)
touch.move(4, 254, 416, 283, 50)
sys.msleep(17)
touch.move(4, 254, 416, 333, 50)
touch.off(4, 254, 416)

sys.msleep(2250)
touch.on(5, 464, 450)
sys.msleep(17)
touch.move(5, 464, 450, 117, 50)
sys.msleep(17)
touch.move(5, 464, 450, 200, 50)
touch.off(5, 464, 450)

sys.msleep(1917)
touch.on(3, 682, 241)
sys.msleep(18)
touch.move(3, 682, 241, 100, 50)
sys.msleep(17)
touch.move(3, 682, 241, 283, 50)
sys.msleep(17)
touch.move(3, 682, 241, 300, 3)
touch.off(3, 682, 241)

sys.msleep(1317)
touch.on(2, 493, 210)
sys.msleep(35)
touch.move(2, 493, 210, 83, 50)
sys.msleep(17)
touch.move(2, 493, 210, 267, 50)
sys.msleep(17)
touch.move(2, 493, 210, 417, 50)
sys.msleep(16)
touch.move(2, 493, 210, 533, 50)
sys.msleep(17)
touch.move(2, 493, 210, 650, 50)
sys.msleep(17)
touch.move(2, 493, 210, 700, 50)
sys.msleep(17)
touch.move(2, 493, 210, 733, 50)
sys.msleep(17)
touch.move(2, 493, 210, 750, 50)
sys.msleep(17)
touch.move(2, 493, 210, 767, 50)
sys.msleep(66)
touch.move(2, 493, 210, 783, 50)
sys.msleep(50)
touch.move(2, 493, 210, 800, 50)
sys.msleep(34)
touch.move(2, 493, 210, 817, 50)
sys.msleep(100)
touch.move(2, 493, 210, 833, 50)
sys.msleep(600)
touch.move(2, 493, 210, 800, 50)
sys.msleep(16)
touch.move(2, 493, 210, 700, 50)
sys.msleep(17)
touch.move(2, 493, 210, 617, 50)
sys.msleep(17)
touch.move(2, 493, 210, 517, 50)
sys.msleep(17)
touch.move(2, 493, 210, 433, 50)
touch.off(2, 493, 210)

sys.msleep(1717)
touch.on(6, 149, 119)
sys.msleep(35)
touch.move(6, 149, 119, 17, 50)
sys.msleep(17)
touch.move(6, 149, 119, 167, 50)
sys.msleep(17)
touch.move(6, 149, 119, 267, 50)
sys.msleep(17)
touch.move(6, 149, 119, 283, 50)
touch.off(6, 149, 119)

sys.msleep(3684)
touch.on(1, 694, 76)
sys.msleep(18)
touch.move(1, 694, 76, 83, 50)
sys.msleep(17)
touch.move(1, 694, 76, 217, 50)
touch.off(1, 694, 76)

sys.msleep(4218)
touch.on(4, 437, 752)
touch.off(4, 437, 752)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
