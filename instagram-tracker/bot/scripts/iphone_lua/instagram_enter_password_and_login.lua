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


sys.msleep(2890)
touch.on(5, 541, 468)
touch.off(5, 541, 468)

sys.msleep(834)
touch.on(6, 461, 616)
sys.msleep(16)
touch.move(6, 461, 616, 33, 50)
sys.msleep(16)
touch.move(6, 461, 616, 67, 50)
touch.off(6, 461, 616)

sys.msleep(1200)
touch.on(4, 374, 361)
sys.msleep(50)
touch.move(4, 374, 361, 100, 50)
sys.msleep(17)
touch.move(4, 374, 361, 217, 50)
sys.msleep(16)
touch.move(4, 374, 361, 283, 50)
sys.msleep(17)
touch.move(4, 374, 361, 333, 50)
sys.msleep(17)
touch.move(4, 374, 361, 367, 50)
sys.msleep(17)
touch.move(4, 374, 361, 383, 50)
sys.msleep(533)
touch.move(4, 374, 361, 350, 50)
sys.msleep(17)
touch.move(4, 374, 361, 300, 50)
touch.off(4, 374, 361)

sys.msleep(834)
touch.on(2, 172, 260)
sys.msleep(17)
touch.move(2, 172, 260, 50, 50)
sys.msleep(16)
touch.move(2, 172, 260, 83, 50)
touch.off(2, 172, 260)

sys.msleep(3217)
touch.on(5, 540, 471)
sys.msleep(51)
touch.move(5, 540, 471, 33, 88)
touch.off(5, 540, 471)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
