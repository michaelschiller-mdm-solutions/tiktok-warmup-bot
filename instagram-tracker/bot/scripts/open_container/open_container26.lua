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

sys.msleep(1294)
touch.on(1, 640, 996)
sys.msleep(18)
touch.move(1, 640, 996, 150, 50)
sys.msleep(17)
touch.move(1, 640, 996, 367, 50)
sys.msleep(16)
touch.move(1, 640, 996, 583, 50)
sys.msleep(17)
touch.move(1, 640, 996, 750, 50)
sys.msleep(17)
touch.move(1, 640, 996, 883, 50)
sys.msleep(17)
touch.move(1, 640, 996, 1000, 50)
sys.msleep(17)
touch.move(1, 640, 996, 1117, 50)
sys.msleep(17)
touch.move(1, 640, 996, 1233, 50)
sys.msleep(17)
touch.move(1, 640, 996, 1317, 50)
sys.msleep(17)
touch.move(1, 640, 996, 1333, 50)
sys.msleep(617)
touch.move(1, 640, 996, 1250, 50)
sys.msleep(17)
touch.move(1, 640, 996, 983, 50)
sys.msleep(16)
touch.move(1, 640, 996, 667, 50)
touch.off(1, 640, 996)

sys.msleep(1317)
touch.on(3, 612, 937)
sys.msleep(18)
touch.move(3, 612, 937, 100, 50)
sys.msleep(16)
touch.move(3, 612, 937, 400, 50)
sys.msleep(17)
touch.move(3, 612, 937, 733, 50)
sys.msleep(16)
touch.move(3, 612, 937, 950, 50)
sys.msleep(16)
touch.move(3, 612, 937, 967, 50)
sys.msleep(33)
touch.move(3, 612, 937, 717, 50)
touch.off(3, 612, 937)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
