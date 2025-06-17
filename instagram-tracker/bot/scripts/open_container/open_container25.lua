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

sys.msleep(1439)
touch.on(6, 639, 1021)
sys.msleep(18)
touch.move(6, 639, 1021, 450, 50)
sys.msleep(16)
touch.move(6, 639, 1021, 933, 50)
sys.msleep(17)
touch.move(6, 639, 1021, 1183, 50)
sys.msleep(17)
touch.move(6, 639, 1021, 1317, 50)
sys.msleep(17)
touch.move(6, 639, 1021, 1417, 50)
sys.msleep(17)
touch.move(6, 639, 1021, 1483, 50)
sys.msleep(17)
touch.move(6, 639, 1021, 1550, 50)
sys.msleep(17)
touch.move(6, 639, 1021, 1617, 50)
sys.msleep(16)
touch.move(6, 639, 1021, 1650, 50)
sys.msleep(17)
touch.move(6, 639, 1021, 1667, 50)
sys.msleep(17)
touch.move(6, 639, 1021, 1683, 50)
sys.msleep(417)
touch.move(6, 639, 1021, 1650, 50)
sys.msleep(16)
touch.move(6, 639, 1021, 1600, 50)
sys.msleep(16)
touch.move(6, 639, 1021, 1483, 50)
sys.msleep(17)
touch.move(6, 639, 1021, 1333, 50)
sys.msleep(17)
touch.move(6, 639, 1021, 1067, 50)
sys.msleep(17)
touch.move(6, 639, 1021, 717, 50)
touch.off(6, 639, 1021)

sys.msleep(2150)
touch.on(6, 576, 1025)
sys.msleep(34)
touch.move(6, 576, 1025, 250, 50)
sys.msleep(17)
touch.move(6, 576, 1025, 550, 50)
sys.msleep(16)
touch.move(6, 576, 1025, 867, 50)
sys.msleep(17)
touch.move(6, 576, 1025, 1050, 50)
sys.msleep(17)
touch.move(6, 576, 1025, 1083, 50)
sys.msleep(33)
touch.move(6, 576, 1025, 883, 50)
touch.off(6, 576, 1025)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
