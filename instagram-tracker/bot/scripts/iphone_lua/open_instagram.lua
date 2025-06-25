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

  sys.msleep(1337)

key.down(12,64)
  -- HOMEBUTTON
key.up(12,64)
  -- HOMEBUTTON

sys.msleep(1337)
touch.on(6, 647, 987)
touch.off(6, 647, 987)

sys.msleep(5052)
touch.on(1, 515, 435)
sys.msleep(33)
touch.move(1, 515, 435, 83, 83)
sys.msleep(17)
touch.move(1, 515, 435, 167, 83)
sys.msleep(17)
touch.move(1, 515, 435, 233, 83)
sys.msleep(17)
touch.move(1, 515, 435, 267, 83)
sys.msleep(17)
touch.move(1, 515, 435, 283, 82)
sys.msleep(17)
touch.move(1, 515, 435, 300, 83)
sys.msleep(50)
touch.move(1, 515, 435, 317, 82)
sys.msleep(250)
touch.move(1, 515, 435, 333, 82)
sys.msleep(17)
touch.move(1, 515, 435, 350, 82)
sys.msleep(116)
touch.move(1, 515, 435, 367, 82)
sys.msleep(17)
touch.move(1, 515, 435, 383, 82)
sys.msleep(17)
touch.move(1, 515, 435, 400, 82)
sys.msleep(200)
touch.move(1, 515, 435, 367, 79)
touch.off(1, 515, 435)

sys.msleep(1150)
touch.on(4, 530, 215)
sys.msleep(84)
touch.move(4, 530, 215, 17, 77)
sys.msleep(17)
touch.move(4, 530, 215, 33, 78)
sys.msleep(17)
touch.move(4, 530, 215, 50, 78)
sys.msleep(16)
touch.move(4, 530, 215, 67, 79)
sys.msleep(17)
touch.move(4, 530, 215, 83, 79)
sys.msleep(16)
touch.move(4, 530, 215, 100, 80)
sys.msleep(50)
touch.move(4, 530, 215, 117, 79)
sys.msleep(17)
touch.move(4, 530, 215, 150, 78)
sys.msleep(16)
touch.move(4, 530, 215, 167, 78)
sys.msleep(17)
touch.move(4, 530, 215, 183, 77)
sys.msleep(117)
touch.move(4, 530, 215, 200, 79)
sys.msleep(317)
touch.move(4, 530, 215, 233, 79)
sys.msleep(16)
touch.move(4, 530, 215, 250, 78)
sys.msleep(17)
touch.move(4, 530, 215, 267, 78)
sys.msleep(133)
touch.move(4, 530, 215, 233, 75)
sys.msleep(17)
touch.move(4, 530, 215, 200, 73)
touch.off(4, 530, 215)

sys.msleep(899)
touch.on(2, 141, 107)
sys.msleep(30)
touch.move(2, 141, 107, 200, 87)
sys.msleep(3)
touch.move(2, 141, 107, 233, 87)
touch.off(2, 141, 107)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
