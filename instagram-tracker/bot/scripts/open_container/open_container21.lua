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


key.down(12,64)
  -- HOMEBUTTON
key.up(12,64)
  -- HOMEBUTTON

sys.msleep(1169)
touch.on(4, 644, 1013)
sys.msleep(18)
touch.move(4, 644, 1013, 300, 50)
sys.msleep(16)
touch.move(4, 644, 1013, 717, 50)
sys.msleep(17)
touch.move(4, 644, 1013, 1050, 50)
sys.msleep(17)
touch.move(4, 644, 1013, 1283, 50)
sys.msleep(17)
touch.move(4, 644, 1013, 1467, 50)
sys.msleep(17)
touch.move(4, 644, 1013, 1550, 50)
sys.msleep(17)
touch.move(4, 644, 1013, 1583, 50)
sys.msleep(17)
touch.move(4, 644, 1013, 1600, 50)
sys.msleep(67)
touch.move(4, 644, 1013, 1617, 50)
sys.msleep(17)
touch.move(4, 644, 1013, 1633, 50)
sys.msleep(267)
touch.move(4, 644, 1013, 1600, 50)
sys.msleep(16)
touch.move(4, 644, 1013, 1567, 50)
sys.msleep(17)
touch.move(4, 644, 1013, 1550, 50)
sys.msleep(17)
touch.move(4, 644, 1013, 1533, 50)
sys.msleep(50)
touch.move(4, 644, 1013, 1500, 50)
sys.msleep(17)
touch.move(4, 644, 1013, 1450, 50)
sys.msleep(17)
touch.move(4, 644, 1013, 1400, 4)
sys.msleep(17)
touch.move(4, 644, 1013, 1350, 50)
sys.msleep(16)
touch.move(4, 644, 1013, 1300, 50)
sys.msleep(17)
touch.move(4, 644, 1013, 1217, 50)
sys.msleep(17)
touch.move(4, 644, 1013, 1083, 50)
sys.msleep(17)
touch.move(4, 644, 1013, 867, 50)
sys.msleep(17)
touch.move(4, 644, 1013, 567, 50)
touch.off(4, 644, 1013)

sys.msleep(2217)
touch.on(5, 453, 982)
sys.msleep(18)
touch.move(5, 452, 968, 67, 50)
sys.msleep(17)
touch.move(5, 452, 950, 300, 50)
sys.msleep(16)
touch.move(5, 452, 928, 483, 50)
sys.msleep(17)
touch.move(5, 455, 899, 650, 50)
sys.msleep(17)
touch.move(5, 463, 861, 767, 50)
sys.msleep(16)
touch.move(5, 472, 810, 867, 50)
sys.msleep(17)
touch.move(5, 480, 759, 950, 50)
sys.msleep(17)
touch.move(5, 489, 708, 1017, 50)
sys.msleep(16)
touch.move(5, 499, 650, 1017, 50)
sys.msleep(17)
touch.move(5, 514, 581, 1017, 50)
sys.msleep(17)
touch.move(5, 528, 529, 1017, 50)
sys.msleep(17)
touch.move(5, 542, 472, 1017, 50)
sys.msleep(17)
touch.move(5, 554, 419, 1017, 50)
sys.msleep(17)
touch.move(5, 565, 372, 1017, 50)
sys.msleep(16)
touch.move(5, 570, 334, 1017, 50)
sys.msleep(17)
touch.move(5, 574, 301, 1017, 50)
sys.msleep(16)
touch.move(5, 577, 274, 1017, 50)
sys.msleep(17)
touch.move(5, 580, 246, 1017, 50)
sys.msleep(17)
touch.move(5, 583, 220, 1017, 50)
sys.msleep(17)
touch.move(5, 586, 197, 1017, 50)
sys.msleep(16)
touch.move(5, 589, 181, 1017, 50)
sys.msleep(17)
touch.move(5, 591, 168, 1017, 50)
sys.msleep(17)
touch.move(5, 592, 158, 1017, 50)
sys.msleep(16)
touch.move(5, 593, 151, 1017, 50)
sys.msleep(17)
touch.move(5, 594, 148, 1017, 50)
sys.msleep(17)
touch.move(5, 595, 146, 1017, 50)
sys.msleep(67)
touch.move(5, 595, 146, 1000, 50)
sys.msleep(16)
touch.move(5, 596, 146, 867, 50)
sys.msleep(17)
touch.move(5, 597, 147, 650, 50)
touch.off(5, 601, 150)

sys.msleep(818)
touch.on(3, 517, 587)
sys.msleep(17)
touch.move(3, 517, 587, 117, 50)
sys.msleep(16)
touch.move(3, 517, 587, 517, 50)
sys.msleep(17)
touch.move(3, 517, 587, 850, 50)
sys.msleep(17)
touch.move(3, 517, 587, 983, 50)
sys.msleep(33)
touch.move(3, 517, 587, 833, 50)
touch.off(3, 517, 587)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
