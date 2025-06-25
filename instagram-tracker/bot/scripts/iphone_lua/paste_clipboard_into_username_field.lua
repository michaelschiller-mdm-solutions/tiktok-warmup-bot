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


sys.msleep(1583)
touch.on(3, 71, 490)
sys.msleep(16)
touch.move(3, 71, 490, 83, 50)
sys.msleep(17)
touch.move(3, 71, 490, 217, 50)
sys.msleep(17)
touch.move(3, 71, 490, 233, 50)
touch.off(3, 71, 490)

sys.msleep(1133)
touch.on(6, 93, 388)
sys.msleep(33)
touch.move(6, 93, 388, 33, 50)
sys.msleep(17)
touch.move(6, 93, 388, 150, 50)
sys.msleep(17)
touch.move(6, 93, 388, 250, 50)
sys.msleep(17)
touch.move(6, 93, 388, 317, 50)
sys.msleep(17)
touch.move(6, 93, 388, 367, 50)
sys.msleep(17)
touch.move(6, 93, 388, 417, 50)
sys.msleep(16)
touch.move(6, 93, 388, 450, 50)
sys.msleep(17)
touch.move(6, 93, 388, 500, 50)
sys.msleep(17)
touch.move(6, 93, 388, 517, 50)
sys.msleep(17)
touch.move(6, 93, 388, 533, 50)
sys.msleep(83)
touch.move(6, 93, 388, 550, 50)
sys.msleep(17)
touch.move(6, 93, 388, 567, 50)
sys.msleep(400)
touch.move(6, 93, 388, 533, 50)
sys.msleep(17)
touch.move(6, 93, 388, 417, 50)
touch.off(6, 93, 388)

sys.msleep(883)
touch.on(6, 106, 327)
sys.msleep(33)
touch.move(6, 106, 327, 150, 50)
sys.msleep(17)
touch.move(6, 106, 327, 183, 50)
touch.off(6, 106, 327)

sys.msleep(2551)
touch.on(4, 547, 161)
sys.msleep(18)
touch.move(4, 547, 161, 317, 50)
sys.msleep(17)
touch.move(4, 547, 161, 383, 50)
sys.msleep(17)
touch.move(4, 547, 161, 400, 50)
touch.off(4, 547, 161)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
