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

sys.msleep(1062)
touch.on(1, 645, 986)
sys.msleep(18)
touch.move(1, 645, 986, 83, 50)
sys.msleep(17)
touch.move(1, 645, 986, 333, 50)
sys.msleep(17)
touch.move(1, 645, 986, 583, 50)
sys.msleep(17)
touch.move(1, 645, 986, 683, 50)
sys.msleep(17)
touch.move(1, 645, 986, 717, 50)
sys.msleep(17)
touch.move(1, 645, 986, 733, 50)
sys.msleep(17)
touch.move(1, 645, 986, 750, 50)
sys.msleep(17)
touch.move(1, 645, 986, 783, 50)
sys.msleep(17)
touch.move(1, 645, 986, 817, 50)
sys.msleep(17)
touch.move(1, 645, 986, 833, 50)
sys.msleep(17)
touch.move(1, 645, 986, 850, 50)
sys.msleep(600)
touch.move(1, 645, 986, 800, 50)
sys.msleep(16)
touch.move(1, 645, 986, 717, 50)
sys.msleep(17)
touch.move(1, 645, 986, 567, 50)
sys.msleep(17)
touch.move(1, 645, 986, 383, 50)
sys.msleep(17)
touch.move(1, 645, 986, 200, 50)
touch.off(1, 645, 986)

sys.msleep(1714)
touch.on(5, 582, 860)
sys.msleep(35)
touch.move(5, 582, 860, 117, 50)
sys.msleep(17)
touch.move(5, 582, 860, 350, 50)
sys.msleep(16)
touch.move(5, 582, 860, 567, 50)
sys.msleep(17)
touch.move(5, 582, 860, 667, 50)
sys.msleep(33)
touch.move(5, 582, 860, 633, 50)
touch.off(5, 582, 860)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
