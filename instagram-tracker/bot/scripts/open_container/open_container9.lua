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

sys.msleep(1703)
touch.on(2, 645, 998)
sys.msleep(18)
touch.move(2, 645, 998, 150, 80)
sys.msleep(16)
touch.move(2, 645, 998, 467, 80)
sys.msleep(16)
touch.move(2, 645, 998, 800, 80)
sys.msleep(17)
touch.move(2, 645, 998, 1100, 80)
sys.msleep(17)
touch.move(2, 645, 998, 1317, 79)
sys.msleep(17)
touch.move(2, 645, 998, 1450, 79)
sys.msleep(17)
touch.move(2, 645, 998, 1517, 79)
sys.msleep(16)
touch.move(2, 645, 998, 1533, 78)
sys.msleep(150)
touch.move(2, 645, 998, 1550, 78)
sys.msleep(16)
touch.move(2, 645, 998, 1567, 78)
sys.msleep(17)
touch.move(2, 645, 998, 1583, 78)
sys.msleep(17)
touch.move(2, 645, 998, 1633, 78)
sys.msleep(17)
touch.move(2, 645, 998, 1667, 78)
sys.msleep(17)
touch.move(2, 645, 998, 1683, 78)
sys.msleep(51)
touch.move(2, 645, 998, 1700, 78)
sys.msleep(83)
touch.move(2, 645, 998, 1717, 79)
sys.msleep(17)
touch.move(2, 645, 998, 1733, 78)
sys.msleep(17)
touch.move(2, 645, 998, 1750, 78)
sys.msleep(17)
touch.move(2, 645, 998, 1767, 79)
sys.msleep(17)
touch.move(2, 645, 998, 1783, 78)
sys.msleep(16)
touch.move(2, 645, 998, 1817, 78)
sys.msleep(17)
touch.move(2, 645, 998, 1850, 78)
sys.msleep(16)
touch.move(2, 645, 998, 1883, 78)
sys.msleep(17)
touch.move(2, 645, 998, 1933, 78)
sys.msleep(16)
touch.move(2, 645, 998, 2000, 78)
sys.msleep(17)
touch.move(2, 645, 998, 2050, 79)
sys.msleep(17)
touch.move(2, 645, 998, 2083, 78)
sys.msleep(17)
touch.move(2, 645, 998, 2100, 78)
sys.msleep(117)
touch.move(2, 645, 998, 2067, 78)
sys.msleep(16)
touch.move(2, 645, 998, 1850, 78)
sys.msleep(16)
touch.move(2, 645, 998, 1500, 78)
sys.msleep(17)
touch.move(2, 645, 998, 1017, 77)
touch.off(2, 645, 998)

sys.msleep(552)
touch.on(3, 482, 976)
sys.msleep(17)
touch.move(3, 482, 976, 100, 50)
sys.msleep(17)
touch.move(3, 483, 966, 283, 50)
sys.msleep(17)
touch.move(3, 483, 946, 450, 50)
sys.msleep(17)
touch.move(3, 484, 904, 683, 50)
sys.msleep(17)
touch.move(3, 489, 794, 967, 50)
sys.msleep(17)
touch.move(3, 507, 615, 967, 50)
touch.off(3, 582, 367)

sys.msleep(2115)
touch.on(4, 615, 210)
sys.msleep(35)
touch.move(4, 615, 210, 150, 50)
sys.msleep(17)
touch.move(4, 615, 210, 233, 50)
touch.off(4, 615, 210)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
