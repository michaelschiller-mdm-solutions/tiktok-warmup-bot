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

sys.msleep(1123)
touch.on(6, 652, 1012)
sys.msleep(18)
touch.move(6, 652, 1012, 33, 50)
sys.msleep(17)
touch.move(6, 652, 1012, 217, 50)
sys.msleep(17)
touch.move(6, 652, 1012, 383, 50)
sys.msleep(17)
touch.move(6, 652, 1012, 517, 50)
sys.msleep(17)
touch.move(6, 652, 1012, 617, 50)
sys.msleep(17)
touch.move(6, 652, 1012, 683, 50)
sys.msleep(17)
touch.move(6, 652, 1012, 717, 50)
sys.msleep(17)
touch.move(6, 652, 1012, 750, 50)
sys.msleep(17)
touch.move(6, 652, 1012, 767, 50)
sys.msleep(17)
touch.move(6, 652, 1012, 783, 50)
sys.msleep(17)
touch.move(6, 652, 1012, 817, 50)
sys.msleep(16)
touch.move(6, 652, 1012, 833, 50)
sys.msleep(17)
touch.move(6, 652, 1012, 850, 50)
sys.msleep(17)
touch.move(6, 652, 1012, 867, 50)
sys.msleep(17)
touch.move(6, 652, 1012, 883, 50)
sys.msleep(17)
touch.move(6, 652, 1012, 900, 50)
sys.msleep(17)
touch.move(6, 652, 1012, 917, 50)
sys.msleep(33)
touch.move(6, 652, 1012, 933, 50)
sys.msleep(67)
touch.move(6, 652, 1012, 950, 50)
sys.msleep(33)
touch.move(6, 652, 1012, 967, 50)
sys.msleep(34)
touch.move(6, 652, 1012, 983, 50)
sys.msleep(317)
touch.move(6, 652, 1012, 967, 50)
sys.msleep(17)
touch.move(6, 652, 1012, 883, 50)
sys.msleep(17)
touch.move(6, 652, 1012, 767, 50)
sys.msleep(17)
touch.move(6, 652, 1012, 633, 50)
sys.msleep(17)
touch.move(6, 652, 1012, 433, 50)
touch.off(6, 652, 1012)

sys.msleep(2152)
touch.on(5, 590, 607)
sys.msleep(33)
touch.move(5, 590, 607, 67, 50)
sys.msleep(17)
touch.move(5, 590, 607, 150, 50)
sys.msleep(17)
touch.move(5, 590, 607, 200, 50)
touch.off(5, 590, 607)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
