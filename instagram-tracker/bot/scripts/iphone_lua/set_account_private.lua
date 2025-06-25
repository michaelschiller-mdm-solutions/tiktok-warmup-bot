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


sys.msleep(4001)
touch.on(1, 713, 1288)
sys.msleep(33)
touch.move(1, 713, 1288, 50, 50)
sys.msleep(17)
touch.move(1, 713, 1288, 167, 50)
sys.msleep(17)
touch.move(1, 713, 1288, 233, 50)
touch.off(1, 713, 1288)

sys.msleep(2316)
touch.on(3, 693, 65)
sys.msleep(18)
touch.move(3, 693, 65, 283, 50)
sys.msleep(17)
touch.move(3, 693, 65, 483, 50)
touch.off(3, 693, 65)

sys.msleep(2317)
touch.on(4, 488, 163)
sys.msleep(18)
touch.move(4, 488, 163, 100, 50)
sys.msleep(17)
touch.move(4, 488, 163, 300, 50)
sys.msleep(17)
touch.move(4, 488, 163, 383, 50)
touch.off(4, 488, 163)

sys.msleep(1248)
touch.on(5, 611, 961)
sys.msleep(18)
touch.move(5, 611, 961, 83, 99)
sys.msleep(17)
touch.move(5, 611, 961, 383, -100)
sys.msleep(17)
touch.move(5, 611, 961, 567, 50)
touch.off(5, 611, 961)

sys.msleep(468)
touch.on(6, 241, 973)
sys.msleep(17)
touch.move(6, 241, 973, 17, 50)
sys.msleep(17)
touch.move(6, 241, 973, 83, 50)
touch.off(6, 241, 973)

sys.msleep(819)
touch.on(2, 685, 367)
sys.msleep(33)
touch.move(2, 685, 367, 67, 81)
sys.msleep(17)
touch.move(2, 685, 367, 83, 80)
touch.off(2, 685, 367)

sys.msleep(1335)
touch.on(1, 684, 174)
sys.msleep(33)
touch.move(1, 684, 174, 33, 50)
sys.msleep(17)
touch.move(1, 684, 174, 50, 50)
touch.off(1, 684, 174)

sys.msleep(2082)
touch.on(3, 466, 1260)
sys.msleep(18)
touch.move(3, 466, 1260, 17, 25)
sys.msleep(16)
touch.move(3, 466, 1260, 183, 23)
sys.msleep(17)
touch.move(3, 466, 1260, 283, 22)
sys.msleep(17)
touch.move(3, 466, 1260, 300, 22)
touch.off(3, 466, 1260)

sys.msleep(9169)
touch.on(4, 433, 743)
sys.msleep(17)
touch.move(4, 433, 743, 33, 50)
sys.msleep(17)
touch.move(4, 433, 743, 100, 50)
touch.off(4, 433, 743)

sys.msleep(4951)
touch.on(5, 61, 77)
sys.msleep(18)
touch.move(5, 61, 77, 50, 50)
sys.msleep(17)
touch.move(5, 61, 77, 417, 50)
sys.msleep(16)
touch.move(5, 61, 77, 533, 50)
sys.msleep(17)
touch.move(5, 61, 77, 550, 50)
sys.msleep(50)
touch.move(5, 61, 77, 433, 93)
touch.off(5, 61, 77)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
