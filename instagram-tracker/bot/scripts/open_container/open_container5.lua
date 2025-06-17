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

sys.msleep(1059)
touch.on(4, 659, 1004)
sys.msleep(18)
touch.move(4, 659, 1004, 283, 50)
sys.msleep(17)
touch.move(4, 659, 1004, 683, 50)
sys.msleep(17)
touch.move(4, 659, 1004, 1050, 50)
sys.msleep(17)
touch.move(4, 659, 1004, 1283, 50)
sys.msleep(17)
touch.move(4, 659, 1004, 1383, 50)
sys.msleep(17)
touch.move(4, 659, 1004, 1400, 50)
sys.msleep(17)
touch.move(4, 659, 1004, 1450, 50)
sys.msleep(17)
touch.move(4, 659, 1004, 1517, 50)
sys.msleep(17)
touch.move(4, 659, 1004, 1600, 50)
sys.msleep(17)
touch.move(4, 659, 1004, 1667, 50)
sys.msleep(17)
touch.move(4, 659, 1004, 1717, 50)
sys.msleep(17)
touch.move(4, 659, 1004, 1733, 50)
sys.msleep(100)
touch.move(4, 659, 1004, 1750, 50)
sys.msleep(16)
touch.move(4, 659, 1004, 1767, 50)
sys.msleep(267)
touch.move(4, 659, 1004, 1717, 50)
sys.msleep(17)
touch.move(4, 659, 1004, 1683, 50)
sys.msleep(17)
touch.move(4, 659, 1004, 1667, 50)
sys.msleep(33)
touch.move(4, 659, 1004, 1650, 50)
sys.msleep(17)
touch.move(4, 659, 1004, 1633, 50)
sys.msleep(17)
touch.move(4, 659, 1004, 1617, 50)
sys.msleep(17)
touch.move(4, 659, 1004, 1583, 50)
sys.msleep(16)
touch.move(4, 659, 1004, 1550, 50)
sys.msleep(17)
touch.move(4, 659, 1004, 1517, 50)
sys.msleep(17)
touch.move(4, 659, 1004, 1483, 50)
sys.msleep(17)
touch.move(4, 659, 1004, 1417, 50)
sys.msleep(17)
touch.move(4, 659, 1004, 1300, 50)
sys.msleep(16)
touch.move(4, 659, 1004, 1083, 50)
sys.msleep(16)
touch.move(4, 659, 1004, 767, 50)
touch.off(4, 659, 1004)

sys.msleep(1035)
touch.on(5, 463, 1051)
sys.msleep(15)
touch.move(5, 462, 1034, 17, 50)
sys.msleep(18)
touch.move(5, 462, 986, 283, 50)
sys.msleep(17)
touch.move(5, 479, 884, 633, 50)
sys.msleep(17)
touch.move(5, 522, 735, 917, 50)
sys.msleep(17)
touch.move(5, 599, 555, 917, 50)
touch.off(5, 604, 551)

sys.msleep(1751)
touch.on(5, 631, 569)
sys.msleep(34)
touch.move(5, 631, 569, 100, 50)
sys.msleep(17)
touch.move(5, 631, 569, 317, 50)
sys.msleep(17)
touch.move(5, 631, 569, 467, 50)
sys.msleep(17)
touch.move(5, 631, 569, 483, 50)
touch.off(5, 631, 569)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
