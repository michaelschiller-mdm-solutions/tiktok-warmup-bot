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


sys.msleep(1357)
touch.on(4, 670, 1264)
touch.off(4, 670, 1264)

sys.msleep(1701)
touch.on(6, 595, 87)
sys.msleep(68)
touch.move(6, 595, 87, 33, 50)
touch.off(6, 595, 87)

sys.msleep(3502)
touch.on(3, 393, 1084)
sys.msleep(33)
touch.move(3, 393, 1084, 83, 50)
sys.msleep(17)
touch.move(3, 393, 1084, 150, 50)
touch.off(3, 393, 1084)

sys.msleep(8416)
touch.on(2, 128, 466)
touch.off(2, 128, 466)

sys.msleep(3950)
touch.on(5, 717, 76)
sys.msleep(35)
touch.move(5, 717, 76, 33, 56)
sys.msleep(17)
touch.move(5, 717, 76, 67, 56)
touch.off(5, 717, 76)

sys.msleep(4051)
touch.on(1, 363, 649)
sys.msleep(18)
touch.move(1, 363, 649, 67, 95)
sys.msleep(17)
touch.move(1, 363, 649, 217, 96)
sys.msleep(17)
touch.move(1, 363, 649, 333, 95)
sys.msleep(17)
touch.move(1, 363, 649, 450, 95)
sys.msleep(17)
touch.move(1, 363, 649, 533, 95)
sys.msleep(16)
touch.move(1, 363, 649, 583, 95)
sys.msleep(16)
touch.move(1, 363, 649, 617, 95)
sys.msleep(17)
touch.move(1, 363, 649, 650, 95)
sys.msleep(17)
touch.move(1, 363, 649, 667, 95)
sys.msleep(317)
touch.move(1, 363, 649, 683, 94)
sys.msleep(17)
touch.move(1, 363, 649, 700, 94)
sys.msleep(117)
touch.move(1, 363, 649, 717, 95)
sys.msleep(183)
touch.move(1, 363, 649, 667, 94)
sys.msleep(17)
touch.move(1, 363, 649, 550, 93)
sys.msleep(17)
touch.move(1, 363, 649, 417, 92)
sys.msleep(16)
touch.move(1, 363, 649, 333, 94)
touch.off(1, 363, 649)

sys.msleep(983)
touch.on(4, 322, 534)
touch.off(4, 322, 534)

sys.msleep(4384)
touch.on(5, 692, 74)
sys.msleep(35)
touch.move(5, 692, 74, 83, 60)
sys.msleep(17)
touch.move(5, 692, 74, 117, 60)
touch.off(5, 692, 74)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
