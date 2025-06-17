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

sys.msleep(1575)
touch.on(4, 643, 994)
sys.msleep(18)
touch.move(4, 643, 994, 133, 50)
sys.msleep(17)
touch.move(4, 643, 994, 267, 50)
sys.msleep(17)
touch.move(4, 643, 994, 333, 50)
sys.msleep(17)
touch.move(4, 643, 994, 417, 50)
sys.msleep(17)
touch.move(4, 643, 994, 483, 50)
sys.msleep(17)
touch.move(4, 643, 994, 517, 50)
sys.msleep(17)
touch.move(4, 643, 994, 550, 50)
sys.msleep(17)
touch.move(4, 643, 994, 583, 94)
sys.msleep(17)
touch.move(4, 643, 994, 617, 50)
sys.msleep(17)
touch.move(4, 643, 994, 633, 50)
sys.msleep(16)
touch.move(4, 643, 994, 650, 50)
sys.msleep(17)
touch.move(4, 643, 994, 667, 50)
sys.msleep(33)
touch.move(4, 643, 994, 683, 50)
sys.msleep(17)
touch.move(4, 643, 994, 700, 50)
sys.msleep(16)
touch.move(4, 643, 994, 717, 50)
sys.msleep(17)
touch.move(4, 643, 994, 733, 50)
sys.msleep(133)
touch.move(4, 643, 994, 750, 50)
sys.msleep(33)
touch.move(4, 643, 994, 767, 50)
sys.msleep(17)
touch.move(4, 643, 994, 783, 50)
sys.msleep(17)
touch.move(4, 643, 994, 800, 50)
sys.msleep(17)
touch.move(4, 643, 994, 817, 50)
sys.msleep(16)
touch.move(4, 643, 994, 833, 50)
sys.msleep(117)
touch.move(4, 643, 994, 850, 50)
sys.msleep(183)
touch.move(4, 643, 994, 817, 50)
sys.msleep(17)
touch.move(4, 643, 994, 750, 50)
sys.msleep(16)
touch.move(4, 643, 994, 633, 50)
sys.msleep(17)
touch.move(4, 643, 994, 483, 50)
sys.msleep(17)
touch.move(4, 643, 994, 317, 50)
touch.off(4, 643, 994)

sys.msleep(866)
touch.on(2, 552, 1007)
sys.msleep(17)
touch.move(2, 546, 991, 117, 50)
sys.msleep(17)
touch.move(2, 544, 969, 350, 50)
sys.msleep(17)
touch.move(2, 541, 944, 550, 50)
sys.msleep(17)
touch.move(2, 541, 915, 683, 50)
sys.msleep(17)
touch.move(2, 542, 877, 733, 50)
sys.msleep(17)
touch.move(2, 554, 827, 750, 50)
sys.msleep(17)
touch.move(2, 567, 773, 767, 50)
sys.msleep(17)
touch.move(2, 579, 721, 767, 50)
sys.msleep(16)
touch.move(2, 589, 667, 767, 50)
sys.msleep(17)
touch.move(2, 596, 616, 767, 50)
sys.msleep(17)
touch.move(2, 599, 577, 767, 50)
sys.msleep(17)
touch.move(2, 602, 538, 783, 50)
sys.msleep(17)
touch.move(2, 606, 504, 800, 50)
sys.msleep(17)
touch.move(2, 610, 473, 833, 50)
sys.msleep(17)
touch.move(2, 615, 442, 883, 50)
sys.msleep(16)
touch.move(2, 621, 416, 933, 50)
sys.msleep(17)
touch.move(2, 626, 392, 983, 50)
sys.msleep(17)
touch.move(2, 627, 377, 1033, 50)
sys.msleep(17)
touch.move(2, 628, 367, 1067, 50)
sys.msleep(17)
touch.move(2, 629, 359, 1100, 50)
sys.msleep(17)
touch.move(2, 630, 355, 1117, 50)
sys.msleep(16)
touch.move(2, 630, 354, 1133, 50)
sys.msleep(117)
touch.move(2, 630, 355, 1117, 50)
sys.msleep(17)
touch.move(2, 631, 356, 850, 50)
sys.msleep(17)
touch.move(2, 636, 356, 600, 50)
touch.off(2, 640, 352)

sys.msleep(469)
touch.on(5, 509, 694)
sys.msleep(17)
touch.move(5, 509, 694, 250, 50)
sys.msleep(16)
touch.move(5, 509, 694, 483, 50)
touch.off(5, 509, 694)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
