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

sys.msleep(1757)
touch.on(4, 660, 982)
sys.msleep(33)
touch.move(4, 660, 982, 83, 50)
sys.msleep(17)
touch.move(4, 660, 982, 200, 50)
sys.msleep(17)
touch.move(4, 660, 982, 283, 50)
sys.msleep(17)
touch.move(4, 660, 982, 350, 50)
sys.msleep(16)
touch.move(4, 660, 982, 417, 50)
sys.msleep(17)
touch.move(4, 660, 982, 500, 50)
sys.msleep(17)
touch.move(4, 660, 982, 567, 50)
sys.msleep(17)
touch.move(4, 660, 982, 633, 50)
sys.msleep(17)
touch.move(4, 660, 982, 683, 50)
sys.msleep(17)
touch.move(4, 660, 982, 717, 50)
sys.msleep(16)
touch.move(4, 660, 982, 750, 50)
sys.msleep(17)
touch.move(4, 660, 982, 767, 50)
sys.msleep(17)
touch.move(4, 660, 982, 800, 50)
sys.msleep(17)
touch.move(4, 660, 982, 833, 50)
sys.msleep(16)
touch.move(4, 660, 982, 850, 50)
sys.msleep(17)
touch.move(4, 660, 982, 867, 50)
sys.msleep(16)
touch.move(4, 660, 982, 883, 50)
sys.msleep(17)
touch.move(4, 660, 982, 900, 50)
sys.msleep(100)
touch.move(4, 660, 982, 917, 50)
sys.msleep(17)
touch.move(4, 660, 982, 933, 50)
sys.msleep(17)
touch.move(4, 660, 982, 950, 50)
sys.msleep(17)
touch.move(4, 660, 982, 967, 50)
sys.msleep(250)
touch.move(4, 660, 982, 800, 50)
sys.msleep(17)
touch.move(4, 660, 982, 567, 50)
touch.off(4, 660, 982)

sys.msleep(1917)
touch.on(2, 619, 671)
sys.msleep(35)
touch.move(2, 619, 671, 133, 50)
sys.msleep(17)
touch.move(2, 619, 671, 283, 50)
sys.msleep(17)
touch.move(2, 619, 671, 300, 50)
touch.off(2, 619, 671)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
