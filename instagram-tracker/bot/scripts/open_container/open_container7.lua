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


sys.msleep(1063)
touch.on(5, 220, 891)
sys.msleep(34)
touch.move(5, 220, 891, 133, 50)
sys.msleep(17)
touch.move(5, 255, 881, 283, 50)
sys.msleep(17)
touch.move(5, 295, 877, 417, 50)
sys.msleep(16)
touch.move(5, 353, 870, 517, 50)
sys.msleep(17)
touch.move(5, 435, 868, 567, 50)
sys.msleep(16)
touch.move(5, 521, 868, 583, 50)
sys.msleep(17)
touch.move(5, 612, 869, 583, 50)
sys.msleep(17)
touch.move(5, 705, 873, 583, 50)
touch.off(5, 709, 877)

sys.msleep(1084)
touch.on(6, 650, 990)
sys.msleep(35)
touch.move(6, 650, 990, 300, 50)
sys.msleep(17)
touch.move(6, 650, 990, 750, 50)
sys.msleep(17)
touch.move(6, 650, 990, 1067, 50)
sys.msleep(17)
touch.move(6, 650, 990, 1250, 50)
sys.msleep(17)
touch.move(6, 650, 990, 1333, 50)
sys.msleep(17)
touch.move(6, 650, 990, 1350, 50)
sys.msleep(17)
touch.move(6, 650, 990, 1367, 50)
sys.msleep(17)
touch.move(6, 650, 990, 1450, 50)
sys.msleep(17)
touch.move(6, 650, 990, 1550, 50)
sys.msleep(17)
touch.move(6, 650, 990, 1633, 50)
sys.msleep(17)
touch.move(6, 650, 990, 1650, 50)
sys.msleep(117)
touch.move(6, 650, 990, 1667, 50)
sys.msleep(317)
touch.move(6, 650, 990, 1650, 50)
sys.msleep(17)
touch.move(6, 650, 990, 1617, 50)
sys.msleep(250)
touch.move(6, 650, 990, 1600, 50)
sys.msleep(17)
touch.move(6, 650, 990, 1583, 50)
sys.msleep(17)
touch.move(6, 650, 990, 1567, 50)
sys.msleep(17)
touch.move(6, 650, 990, 1517, 50)
sys.msleep(16)
touch.move(6, 650, 990, 1467, 50)
sys.msleep(17)
touch.move(6, 650, 990, 1417, 50)
sys.msleep(17)
touch.move(6, 650, 990, 1383, 50)
sys.msleep(16)
touch.move(6, 650, 990, 1317, 50)
sys.msleep(16)
touch.move(6, 650, 990, 1217, 50)
sys.msleep(17)
touch.move(6, 650, 990, 1017, 50)
sys.msleep(17)
touch.move(6, 650, 990, 733, 50)
touch.off(6, 650, 990)

sys.msleep(418)
touch.on(4, 491, 1047)
sys.msleep(17)
touch.move(4, 489, 1033, 117, 50)
sys.msleep(17)
touch.move(4, 489, 1001, 383, 50)
sys.msleep(17)
touch.move(4, 488, 950, 750, 50)
sys.msleep(17)
touch.move(4, 488, 844, 1133, 50)
sys.msleep(16)
touch.move(4, 501, 705, 1250, 50)
sys.msleep(17)
touch.move(4, 543, 532, 1167, 50)
touch.off(4, 547, 528)

sys.msleep(1634)
touch.on(2, 627, 394)
sys.msleep(34)
touch.move(2, 627, 394, 117, 50)
sys.msleep(17)
touch.move(2, 627, 394, 233, 50)
touch.off(2, 627, 394)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
