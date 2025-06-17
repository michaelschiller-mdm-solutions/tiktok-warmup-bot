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

sys.msleep(1321)
touch.on(6, 643, 998)
sys.msleep(18)
touch.move(6, 643, 998, 217, 50)
sys.msleep(17)
touch.move(6, 643, 998, 517, 50)
sys.msleep(17)
touch.move(6, 643, 998, 767, 50)
sys.msleep(17)
touch.move(6, 643, 998, 933, 50)
sys.msleep(17)
touch.move(6, 643, 998, 1017, 50)
sys.msleep(17)
touch.move(6, 643, 998, 1033, 50)
sys.msleep(17)
touch.move(6, 643, 998, 1067, 50)
sys.msleep(17)
touch.move(6, 643, 998, 1100, 50)
sys.msleep(17)
touch.move(6, 643, 998, 1133, 50)
sys.msleep(17)
touch.move(6, 643, 998, 1150, 50)
sys.msleep(17)
touch.move(6, 643, 998, 1167, 50)
sys.msleep(834)
touch.move(6, 643, 998, 1133, 50)
sys.msleep(16)
touch.move(6, 643, 998, 1017, 50)
sys.msleep(17)
touch.move(6, 643, 998, 800, 50)
sys.msleep(17)
touch.move(6, 643, 998, 567, 50)
touch.off(6, 643, 998)

sys.msleep(586)
touch.on(5, 476, 1063)
sys.msleep(33)
touch.move(5, 476, 1063, 100, 50)
sys.msleep(17)
touch.move(5, 481, 1022, 283, 50)
sys.msleep(16)
touch.move(5, 481, 989, 483, 50)
sys.msleep(17)
touch.move(5, 481, 935, 667, 50)
sys.msleep(16)
touch.move(5, 483, 844, 783, 50)
sys.msleep(17)
touch.move(5, 509, 734, 783, 50)
sys.msleep(16)
touch.move(5, 557, 614, 667, 50)
touch.off(5, 561, 610)

sys.msleep(1901)
touch.on(5, 599, 570)
sys.msleep(35)
touch.move(5, 599, 570, 83, 50)
sys.msleep(17)
touch.move(5, 599, 570, 150, 50)
touch.off(5, 599, 570)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
