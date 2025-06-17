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

sys.msleep(1422)
touch.on(5, 669, 1011)
sys.msleep(17)
touch.move(5, 669, 1011, 183, 50)
sys.msleep(16)
touch.move(5, 669, 1011, 500, 50)
sys.msleep(17)
touch.move(5, 669, 1011, 783, 50)
sys.msleep(17)
touch.move(5, 669, 1011, 1000, 50)
sys.msleep(16)
touch.move(5, 669, 1011, 1183, 50)
sys.msleep(17)
touch.move(5, 669, 1011, 1383, 50)
sys.msleep(17)
touch.move(5, 669, 1011, 1583, 50)
sys.msleep(17)
touch.move(5, 669, 1011, 1717, 50)
sys.msleep(17)
touch.move(5, 669, 1011, 1783, 50)
sys.msleep(16)
touch.move(5, 669, 1011, 1817, 50)
sys.msleep(517)
touch.move(5, 669, 1011, 1800, 50)
sys.msleep(17)
touch.move(5, 669, 1011, 1783, 50)
sys.msleep(17)
touch.move(5, 669, 1011, 1767, 50)
sys.msleep(17)
touch.move(5, 669, 1011, 1700, 50)
sys.msleep(16)
touch.move(5, 669, 1011, 1583, 50)
sys.msleep(17)
touch.move(5, 669, 1011, 1417, 50)
sys.msleep(17)
touch.move(5, 669, 1011, 1150, 50)
sys.msleep(17)
touch.move(5, 669, 1011, 783, 50)
touch.off(5, 669, 1011)

sys.msleep(634)
touch.on(6, 487, 1040)
sys.msleep(16)
touch.move(6, 487, 1040, 200, 50)
sys.msleep(16)
touch.move(6, 481, 1012, 450, 50)
sys.msleep(17)
touch.move(6, 481, 982, 733, 50)
sys.msleep(16)
touch.move(6, 489, 912, 967, 50)
sys.msleep(17)
touch.move(6, 515, 810, 1017, 50)
sys.msleep(17)
touch.move(6, 569, 680, 1000, 50)
sys.msleep(16)
touch.move(6, 628, 559, 650, 50)
touch.off(6, 678, 466)

sys.msleep(1749)
touch.on(3, 586, 658)
sys.msleep(18)
touch.move(3, 586, 658, 67, 50)
sys.msleep(17)
touch.move(3, 586, 658, 367, 50)
sys.msleep(17)
touch.move(3, 586, 658, 500, 50)
touch.off(3, 586, 658)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
