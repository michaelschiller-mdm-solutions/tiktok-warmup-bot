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

sys.msleep(1218)
touch.on(4, 644, 983)
sys.msleep(18)
touch.move(4, 644, 983, 67, 88)
sys.msleep(17)
touch.move(4, 644, 983, 283, 88)
sys.msleep(17)
touch.move(4, 644, 983, 517, 88)
sys.msleep(17)
touch.move(4, 644, 983, 750, 88)
sys.msleep(17)
touch.move(4, 644, 983, 967, 88)
sys.msleep(17)
touch.move(4, 644, 983, 1100, 88)
sys.msleep(17)
touch.move(4, 644, 983, 1167, 88)
sys.msleep(17)
touch.move(4, 644, 983, 1183, 88)
sys.msleep(50)
touch.move(4, 644, 983, 1200, 88)
sys.msleep(17)
touch.move(4, 644, 983, 1233, 88)
sys.msleep(17)
touch.move(4, 644, 983, 1267, 88)
sys.msleep(17)
touch.move(4, 644, 983, 1283, 88)
sys.msleep(16)
touch.move(4, 644, 983, 1300, 88)
sys.msleep(200)
touch.move(4, 641, 982, 1300, 88)
sys.msleep(50)
touch.move(4, 641, 982, 1283, 88)
sys.msleep(17)
touch.move(4, 641, 982, 1267, 88)
sys.msleep(33)
touch.move(4, 641, 982, 1250, 89)
sys.msleep(100)
touch.move(4, 640, 982, 1250, 88)
sys.msleep(50)
touch.move(4, 640, 982, 1233, 88)
sys.msleep(16)
touch.move(4, 640, 982, 1217, 88)
sys.msleep(17)
touch.move(4, 640, 982, 1183, 88)
sys.msleep(17)
touch.move(4, 640, 982, 1167, 88)
sys.msleep(17)
touch.move(4, 640, 982, 1117, 88)
sys.msleep(17)
touch.move(4, 639, 982, 1083, 88)
sys.msleep(17)
touch.move(4, 639, 982, 1017, 88)
sys.msleep(16)
touch.move(4, 639, 982, 867, 88)
sys.msleep(17)
touch.move(4, 639, 982, 633, 88)
sys.msleep(17)
touch.move(4, 640, 982, 417, 88)
touch.off(4, 644, 980)

sys.msleep(2651)
touch.on(5, 624, 753)
sys.msleep(34)
touch.move(5, 624, 753, 117, 78)
sys.msleep(17)
touch.move(5, 624, 753, 200, 78)
sys.msleep(17)
touch.move(5, 624, 753, 250, 78)
touch.off(5, 624, 753)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
