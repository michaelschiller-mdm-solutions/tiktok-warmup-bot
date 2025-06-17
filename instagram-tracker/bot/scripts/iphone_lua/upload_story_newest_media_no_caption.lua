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


sys.msleep(2383)
touch.on(4, 485, 1255)
sys.msleep(18)
touch.move(4, 485, 1255, 133, 50)
sys.msleep(17)
touch.move(4, 485, 1255, 283, 50)
touch.off(4, 485, 1255)

sys.msleep(4650)
touch.on(5, 47, 1264)
sys.msleep(18)
touch.move(5, 47, 1264, 217, 14)
sys.msleep(16)
touch.move(5, 47, 1264, 500, 14)
sys.msleep(17)
touch.move(5, 47, 1264, 583, 13)
touch.off(5, 47, 1264)

sys.msleep(4187)
touch.on(6, 382, 738)
sys.msleep(15)
touch.move(6, 382, 738, 200, 50)
sys.msleep(17)
touch.move(6, 382, 738, 233, 50)
touch.off(6, 382, 738)

sys.msleep(4317)
touch.on(1, 452, 1170)
sys.msleep(18)
touch.move(1, 452, 1170, 117, 50)
sys.msleep(17)
touch.move(1, 452, 1170, 283, 50)
sys.msleep(17)
touch.move(1, 452, 1170, 300, 50)
touch.off(1, 452, 1170)

sys.msleep(7484)
touch.on(2, 724, 1251)
sys.msleep(35)
touch.move(2, 724, 1251, 33, 50)
touch.off(2, 724, 1251)

sys.msleep(3617)
touch.on(3, 621, 1232)
sys.msleep(68)
touch.move(3, 621, 1232, 50, 50)
sys.msleep(16)
touch.move(3, 621, 1232, 100, 50)
touch.off(3, 621, 1232)

sys.msleep(2866)
touch.on(3, 619, 1253)
sys.msleep(35)
touch.move(3, 619, 1253, 150, 50)
sys.msleep(17)
touch.move(3, 619, 1253, 300, 50)
sys.msleep(17)
touch.move(3, 619, 1253, 350, 50)
touch.off(3, 619, 1253)

sys.msleep(4415)
touch.on(4, 449, 879)
sys.msleep(35)
touch.move(4, 449, 879, 200, 50)
sys.msleep(17)
touch.move(4, 449, 879, 350, 50)
sys.msleep(17)
touch.move(4, 449, 879, 400, 50)
touch.off(4, 449, 879)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
