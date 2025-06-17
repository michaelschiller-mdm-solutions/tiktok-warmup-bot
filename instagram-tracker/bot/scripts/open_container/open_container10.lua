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

sys.msleep(1314)
touch.on(4, 668, 991)
sys.msleep(18)
touch.move(4, 668, 991, 250, 50)
sys.msleep(17)
touch.move(4, 668, 991, 500, 50)
sys.msleep(17)
touch.move(4, 668, 991, 650, 50)
sys.msleep(16)
touch.move(4, 668, 991, 767, 50)
sys.msleep(17)
touch.move(4, 668, 991, 867, 50)
sys.msleep(17)
touch.move(4, 668, 991, 950, 50)
sys.msleep(17)
touch.move(4, 668, 991, 1017, 50)
sys.msleep(17)
touch.move(4, 668, 991, 1050, 50)
sys.msleep(17)
touch.move(4, 668, 991, 1067, 50)
sys.msleep(67)
touch.move(4, 668, 991, 1083, 50)
sys.msleep(17)
touch.move(4, 668, 991, 1100, 50)
sys.msleep(67)
touch.move(4, 668, 991, 1117, 50)
sys.msleep(16)
touch.move(4, 668, 991, 1133, 50)
sys.msleep(17)
touch.move(4, 668, 991, 1150, 50)
sys.msleep(17)
touch.move(4, 668, 991, 1167, 50)
sys.msleep(67)
touch.move(4, 668, 991, 1183, 50)
sys.msleep(33)
touch.move(4, 668, 991, 1200, 50)
sys.msleep(383)
touch.move(4, 668, 991, 1183, 50)
sys.msleep(17)
touch.move(4, 668, 991, 1150, 50)
sys.msleep(67)
touch.move(4, 668, 991, 1083, 50)
sys.msleep(17)
touch.move(4, 668, 991, 933, 50)
sys.msleep(17)
touch.move(4, 668, 991, 717, 50)
touch.off(4, 668, 991)

sys.msleep(419)
touch.on(5, 491, 990)
sys.msleep(17)
touch.move(5, 480, 967, 300, 50)
sys.msleep(17)
touch.move(5, 466, 904, 800, 50)
sys.msleep(17)
touch.move(5, 465, 761, 1283, 50)
sys.msleep(17)
touch.move(5, 515, 533, 1233, 50)
touch.off(5, 519, 529)

sys.msleep(1567)
touch.on(1, 589, 123)
sys.msleep(35)
touch.move(1, 589, 123, 33, 50)
sys.msleep(17)
touch.move(1, 589, 123, 150, 50)
sys.msleep(17)
touch.move(1, 589, 123, 183, 50)
touch.off(1, 589, 123)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
