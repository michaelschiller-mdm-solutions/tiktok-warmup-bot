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

sys.msleep(1031)
touch.on(5, 658, 1003)
sys.msleep(18)
touch.move(5, 658, 1003, 217, 50)
sys.msleep(16)
touch.move(5, 658, 1003, 517, 50)
sys.msleep(17)
touch.move(5, 658, 1003, 750, 50)
sys.msleep(17)
touch.move(5, 658, 1003, 850, 50)
sys.msleep(17)
touch.move(5, 658, 1003, 883, 50)
sys.msleep(17)
touch.move(5, 658, 1003, 900, 50)
sys.msleep(17)
touch.move(5, 658, 1003, 967, 50)
sys.msleep(17)
touch.move(5, 658, 1003, 1050, 50)
sys.msleep(17)
touch.move(5, 658, 1003, 1133, 50)
sys.msleep(17)
touch.move(5, 658, 1003, 1167, 50)
sys.msleep(17)
touch.move(5, 658, 1003, 1183, 50)
sys.msleep(33)
touch.move(5, 658, 1003, 1200, 50)
sys.msleep(17)
touch.move(5, 658, 1003, 1217, 50)
sys.msleep(17)
touch.move(5, 658, 1003, 1267, 50)
sys.msleep(17)
touch.move(5, 658, 1003, 1283, 50)
sys.msleep(17)
touch.move(5, 658, 1003, 1300, 50)
sys.msleep(50)
touch.move(5, 658, 1003, 1317, 50)
sys.msleep(17)
touch.move(5, 658, 1003, 1333, 50)
sys.msleep(351)
touch.move(5, 658, 1003, 1350, 50)
sys.msleep(16)
touch.move(5, 658, 1003, 1367, 50)
sys.msleep(116)
touch.move(5, 658, 1003, 1350, 50)
sys.msleep(17)
touch.move(5, 658, 1003, 1200, 50)
sys.msleep(17)
touch.move(5, 658, 1003, 983, 50)
sys.msleep(17)
touch.move(5, 658, 1003, 683, 50)
touch.off(5, 658, 1003)

sys.msleep(768)
touch.on(6, 464, 1053)
sys.msleep(17)
touch.move(6, 455, 1037, 233, 50)
sys.msleep(16)
touch.move(6, 446, 988, 517, 50)
sys.msleep(17)
touch.move(6, 436, 884, 833, 50)
sys.msleep(17)
touch.move(6, 443, 721, 867, 50)
sys.msleep(17)
touch.move(6, 517, 529, 817, 50)
touch.off(6, 521, 525)

sys.msleep(1417)
touch.on(4, 639, 485)
sys.msleep(34)
touch.move(4, 639, 485, 50, 50)
sys.msleep(17)
touch.move(4, 639, 485, 250, 50)
sys.msleep(17)
touch.move(4, 639, 485, 333, 50)
touch.off(4, 639, 485)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
