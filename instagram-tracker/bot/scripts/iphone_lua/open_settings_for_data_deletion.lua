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
sys.msleep(1458)
key.down(12,64)
  -- HOMEBUTTON
key.up(12,64)
  -- HOMEBUTTON

sys.msleep(1458)
touch.on(4, 644, 1010)
sys.msleep(33)
touch.move(4, 644, 1010, 117, 85)
sys.msleep(17)
touch.move(4, 644, 1010, 283, 84)
sys.msleep(17)
touch.move(4, 644, 1010, 450, 84)
sys.msleep(16)
touch.move(4, 644, 1010, 583, 84)
sys.msleep(17)
touch.move(4, 644, 1010, 700, 84)
sys.msleep(17)
touch.move(4, 644, 1010, 767, 84)
sys.msleep(17)
touch.move(4, 644, 1010, 783, 84)
sys.msleep(17)
touch.move(4, 644, 1010, 800, 84)
sys.msleep(350)
touch.move(4, 644, 1010, 833, 83)
sys.msleep(17)
touch.move(4, 644, 1010, 867, 83)
sys.msleep(16)
touch.move(4, 644, 1010, 883, 83)
sys.msleep(17)
touch.move(4, 644, 1010, 900, 84)
sys.msleep(100)
touch.move(4, 644, 1010, 917, 83)
sys.msleep(17)
touch.move(4, 644, 1010, 933, 83)
sys.msleep(33)
touch.move(4, 644, 1010, 950, 83)
sys.msleep(16)
touch.move(4, 644, 1010, 1000, 82)
sys.msleep(17)
touch.move(4, 644, 1010, 1050, 83)
sys.msleep(17)
touch.move(4, 644, 1010, 1083, 83)
sys.msleep(17)
touch.move(4, 644, 1010, 1100, 83)
sys.msleep(17)
touch.move(4, 644, 1010, 1117, 82)
sys.msleep(33)
touch.move(4, 644, 1010, 1133, 83)
sys.msleep(100)
touch.move(4, 644, 1010, 1017, 83)
sys.msleep(17)
touch.move(4, 644, 1010, 850, 83)
sys.msleep(17)
touch.move(4, 644, 1010, 650, 84)
sys.msleep(17)
touch.move(4, 644, 1010, 467, 84)
sys.msleep(17)
touch.move(4, 644, 1010, 300, 85)
sys.msleep(17)
touch.move(4, 644, 1010, 183, 85)
touch.off(4, 644, 1010)

sys.msleep(1166)
touch.on(3, 557, 418)
sys.msleep(35)
touch.move(3, 557, 418, 67, 79)
sys.msleep(16)
touch.move(3, 557, 418, 150, 78)
touch.off(3, 557, 418)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
