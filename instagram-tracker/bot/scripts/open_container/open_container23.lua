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

sys.msleep(1366)
touch.on(4, 643, 998)
sys.msleep(17)
touch.move(4, 643, 998, 283, 50)
sys.msleep(17)
touch.move(4, 643, 998, 467, 50)
sys.msleep(17)
touch.move(4, 643, 998, 600, 50)
sys.msleep(17)
touch.move(4, 643, 998, 683, 50)
sys.msleep(17)
touch.move(4, 643, 998, 700, 50)
sys.msleep(17)
touch.move(4, 643, 998, 717, 50)
sys.msleep(17)
touch.move(4, 643, 998, 733, 50)
sys.msleep(17)
touch.move(4, 643, 998, 750, 50)
sys.msleep(483)
touch.move(4, 643, 998, 733, 50)
sys.msleep(17)
touch.move(4, 643, 998, 717, 50)
sys.msleep(17)
touch.move(4, 643, 998, 683, 50)
sys.msleep(17)
touch.move(4, 643, 998, 667, 50)
sys.msleep(17)
touch.move(4, 643, 998, 633, 50)
sys.msleep(16)
touch.move(4, 643, 998, 617, 50)
sys.msleep(134)
touch.move(4, 643, 998, 567, 50)
sys.msleep(16)
touch.move(4, 643, 998, 500, 50)
sys.msleep(17)
touch.move(4, 643, 998, 383, 50)
sys.msleep(17)
touch.move(4, 643, 998, 233, 50)
touch.off(4, 643, 998)

sys.msleep(1335)
touch.on(6, 531, 978)
sys.msleep(15)
touch.move(6, 528, 953, 0, 50)
sys.msleep(18)
touch.move(6, 528, 922, 183, 50)
sys.msleep(17)
touch.move(6, 531, 888, 400, 50)
sys.msleep(17)
touch.move(6, 540, 855, 533, 50)
sys.msleep(16)
touch.move(6, 553, 809, 650, 50)
sys.msleep(17)
touch.move(6, 565, 764, 733, 50)
sys.msleep(17)
touch.move(6, 575, 719, 783, 50)
sys.msleep(16)
touch.move(6, 584, 674, 817, 50)
sys.msleep(17)
touch.move(6, 588, 639, 833, 50)
sys.msleep(17)
touch.move(6, 590, 602, 850, 6)
sys.msleep(17)
touch.move(6, 590, 568, 883, 50)
sys.msleep(17)
touch.move(6, 590, 536, 917, 50)
sys.msleep(16)
touch.move(6, 590, 505, 950, 50)
sys.msleep(17)
touch.move(6, 590, 480, 983, 50)
sys.msleep(17)
touch.move(6, 590, 451, 1017, 50)
sys.msleep(17)
touch.move(6, 590, 424, 1033, 50)
sys.msleep(16)
touch.move(6, 590, 399, 1033, 50)
sys.msleep(17)
touch.move(6, 590, 371, 1033, 50)
sys.msleep(17)
touch.move(6, 592, 344, 1033, 50)
sys.msleep(17)
touch.move(6, 597, 317, 1033, 50)
sys.msleep(17)
touch.move(6, 602, 292, 1033, 50)
sys.msleep(17)
touch.move(6, 607, 275, 1033, 50)
sys.msleep(17)
touch.move(6, 610, 261, 1033, 50)
sys.msleep(17)
touch.move(6, 613, 247, 1033, 50)
sys.msleep(17)
touch.move(6, 616, 235, 1033, 50)
sys.msleep(17)
touch.move(6, 619, 225, 1033, 50)
sys.msleep(16)
touch.move(6, 622, 216, 1033, 50)
sys.msleep(17)
touch.move(6, 624, 207, 1033, 50)
sys.msleep(16)
touch.move(6, 626, 199, 1033, 50)
sys.msleep(17)
touch.move(6, 628, 194, 1033, 50)
sys.msleep(16)
touch.move(6, 629, 191, 1033, 50)
sys.msleep(17)
touch.move(6, 629, 189, 1033, 50)
sys.msleep(16)
touch.move(6, 629, 189, 1017, 50)
sys.msleep(84)
touch.move(6, 629, 189, 950, 50)
sys.msleep(17)
touch.move(6, 629, 189, 883, 50)
sys.msleep(17)
touch.move(6, 629, 189, 767, 50)
sys.msleep(17)
touch.move(6, 630, 189, 600, 50)
touch.off(6, 633, 190)

sys.msleep(1117)
touch.on(2, 588, 408)
sys.msleep(18)
touch.move(2, 588, 408, 217, 50)
sys.msleep(16)
touch.move(2, 588, 408, 400, 50)
sys.msleep(17)
touch.move(2, 588, 408, 433, 50)
touch.off(2, 588, 408)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
