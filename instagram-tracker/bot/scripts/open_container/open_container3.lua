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

sys.msleep(1219)
touch.on(1, 653, 1016)
sys.msleep(18)
touch.move(1, 653, 1016, 350, 7)
sys.msleep(16)
touch.move(1, 653, 1016, 717, 7)
sys.msleep(17)
touch.move(1, 653, 1016, 983, 50)
sys.msleep(17)
touch.move(1, 653, 1016, 1117, 6)
sys.msleep(17)
touch.move(1, 653, 1016, 1250, 7)
sys.msleep(17)
touch.move(1, 653, 1016, 1350, 7)
sys.msleep(17)
touch.move(1, 653, 1016, 1483, 7)
sys.msleep(17)
touch.move(1, 653, 1016, 1567, 7)
sys.msleep(17)
touch.move(1, 653, 1016, 1633, 6)
sys.msleep(17)
touch.move(1, 653, 1016, 1667, 6)
sys.msleep(17)
touch.move(1, 653, 1016, 1700, 7)
sys.msleep(16)
touch.move(1, 653, 1016, 1717, 7)
sys.msleep(17)
touch.move(1, 653, 1016, 1733, 7)
sys.msleep(17)
touch.move(1, 653, 1016, 1750, 7)
sys.msleep(17)
touch.move(1, 653, 1016, 1767, 7)
sys.msleep(67)
touch.move(1, 653, 1016, 1783, 7)
sys.msleep(50)
touch.move(1, 653, 1016, 1800, 8)
sys.msleep(233)
touch.move(1, 653, 1016, 1767, 8)
sys.msleep(17)
touch.move(1, 653, 1016, 1733, 8)
sys.msleep(67)
touch.move(1, 653, 1016, 1717, 8)
sys.msleep(17)
touch.move(1, 653, 1016, 1683, 8)
sys.msleep(33)
touch.move(1, 653, 1016, 1667, 8)
sys.msleep(34)
touch.move(1, 653, 1016, 1650, 8)
sys.msleep(17)
touch.move(1, 653, 1016, 1633, 8)
sys.msleep(16)
touch.move(1, 653, 1016, 1617, 8)
sys.msleep(17)
touch.move(1, 653, 1016, 1583, 8)
sys.msleep(17)
touch.move(1, 653, 1016, 1567, 8)
sys.msleep(17)
touch.move(1, 653, 1016, 1500, 8)
sys.msleep(17)
touch.move(1, 653, 1016, 1383, 8)
sys.msleep(16)
touch.move(1, 653, 1016, 1167, 8)
sys.msleep(17)
touch.move(1, 653, 1016, 867, 50)
touch.off(1, 653, 1016)

sys.msleep(934)
touch.on(3, 483, 1079)
sys.msleep(16)
touch.move(3, 483, 1079, 117, 50)
sys.msleep(16)
touch.move(3, 480, 1052, 267, 50)
sys.msleep(17)
touch.move(3, 480, 1023, 367, 50)
sys.msleep(17)
touch.move(3, 480, 971, 433, 50)
sys.msleep(17)
touch.move(3, 481, 886, 467, 50)
sys.msleep(17)
touch.move(3, 482, 776, 533, 50)
sys.msleep(17)
touch.move(3, 498, 659, 533, 50)
sys.msleep(17)
touch.move(3, 532, 543, 483, 50)
touch.off(3, 536, 539)

sys.msleep(1484)
touch.on(4, 457, 745)
sys.msleep(35)
touch.move(4, 457, 745, 17, 50)
sys.msleep(16)
touch.move(4, 457, 745, 67, 50)
touch.off(4, 457, 745)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
