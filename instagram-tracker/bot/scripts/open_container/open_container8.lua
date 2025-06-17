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

sys.msleep(1528)
touch.on(5, 644, 1002)
sys.msleep(18)
touch.move(5, 644, 1002, 350, 50)
sys.msleep(16)
touch.move(5, 644, 1002, 750, 50)
sys.msleep(17)
touch.move(5, 644, 1002, 950, 50)
sys.msleep(17)
touch.move(5, 644, 1002, 1033, 50)
sys.msleep(17)
touch.move(5, 644, 1002, 1050, 50)
sys.msleep(17)
touch.move(5, 644, 1002, 1067, 50)
sys.msleep(17)
touch.move(5, 644, 1002, 1117, 50)
sys.msleep(17)
touch.move(5, 644, 1002, 1217, 50)
sys.msleep(17)
touch.move(5, 644, 1002, 1283, 50)
sys.msleep(16)
touch.move(5, 644, 1002, 1317, 50)
sys.msleep(17)
touch.move(5, 644, 1002, 1333, 50)
sys.msleep(17)
touch.move(5, 644, 1002, 1350, 50)
sys.msleep(16)
touch.move(5, 644, 1002, 1367, 50)
sys.msleep(17)
touch.move(5, 644, 1002, 1383, 50)
sys.msleep(17)
touch.move(5, 644, 1002, 1400, 50)
sys.msleep(33)
touch.move(5, 644, 1002, 1417, 50)
sys.msleep(150)
touch.move(5, 644, 1002, 1367, 50)
sys.msleep(17)
touch.move(5, 644, 1002, 1333, 50)
sys.msleep(334)
touch.move(5, 644, 1002, 1317, 50)
sys.msleep(17)
touch.move(5, 644, 1002, 1300, 50)
sys.msleep(17)
touch.move(5, 644, 1002, 1283, 50)
sys.msleep(100)
touch.move(5, 644, 1002, 1233, 50)
sys.msleep(17)
touch.move(5, 644, 1002, 1117, 50)
sys.msleep(16)
touch.move(5, 644, 1002, 967, 50)
sys.msleep(17)
touch.move(5, 644, 1002, 817, 50)
sys.msleep(17)
touch.move(5, 644, 1002, 700, 50)
sys.msleep(16)
touch.move(5, 644, 1002, 633, 50)
sys.msleep(67)
touch.move(5, 644, 1002, 667, 50)
sys.msleep(17)
touch.move(5, 644, 1002, 783, 50)
sys.msleep(16)
touch.move(5, 644, 1002, 867, 50)
sys.msleep(17)
touch.move(5, 644, 1002, 917, 50)
sys.msleep(17)
touch.move(5, 644, 1002, 933, 50)
sys.msleep(50)
touch.move(5, 644, 1002, 650, 50)
touch.off(5, 644, 1002)

sys.msleep(533)
touch.on(1, 551, 1033)
sys.msleep(17)
touch.move(1, 551, 1033, 133, 50)
sys.msleep(16)
touch.move(1, 546, 1016, 417, 50)
sys.msleep(17)
touch.move(1, 544, 970, 683, 50)
sys.msleep(17)
touch.move(1, 541, 857, 833, 50)
sys.msleep(17)
touch.move(1, 556, 704, 833, 50)
sys.msleep(16)
touch.move(1, 621, 540, 667, 50)
sys.msleep(17)
touch.move(1, 707, 417, 467, 50)
touch.off(1, 711, 413)

sys.msleep(1283)
touch.on(6, 625, 313)
sys.msleep(35)
touch.move(6, 625, 313, 83, 50)
sys.msleep(17)
touch.move(6, 625, 313, 267, 50)
sys.msleep(17)
touch.move(6, 625, 313, 350, 50)
sys.msleep(17)
touch.move(6, 625, 313, 367, 50)
touch.off(6, 625, 313)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
