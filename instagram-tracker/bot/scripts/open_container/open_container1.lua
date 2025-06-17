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

sys.msleep(1270)
touch.on(3, 654, 1000)
sys.msleep(67)
touch.move(3, 654, 1000, 17, 50)
sys.msleep(17)
touch.move(3, 654, 1000, 83, 50)
sys.msleep(17)
touch.move(3, 654, 1000, 117, 50)
sys.msleep(17)
touch.move(3, 654, 1000, 167, 24)
sys.msleep(17)
touch.move(3, 654, 1000, 217, 50)
sys.msleep(17)
touch.move(3, 654, 1000, 250, 25)
sys.msleep(16)
touch.move(3, 654, 1000, 267, 50)
sys.msleep(17)
touch.move(3, 654, 1000, 283, 25)
sys.msleep(17)
touch.move(3, 654, 1000, 300, 24)
sys.msleep(17)
touch.move(3, 654, 1000, 317, 50)
sys.msleep(17)
touch.move(3, 654, 1000, 333, 50)
sys.msleep(17)
touch.move(3, 654, 1000, 350, 50)
sys.msleep(17)
touch.move(3, 654, 1000, 383, 50)
sys.msleep(17)
touch.move(3, 654, 1000, 417, 25)
sys.msleep(17)
touch.move(3, 654, 1000, 433, 23)
sys.msleep(100)
touch.move(3, 654, 1000, 450, 23)
sys.msleep(17)
touch.move(3, 654, 1000, 467, 25)
sys.msleep(83)
touch.move(3, 654, 1000, 483, 24)
sys.msleep(17)
touch.move(3, 654, 1000, 500, 24)
sys.msleep(17)
touch.move(3, 654, 1000, 517, 25)
sys.msleep(17)
touch.move(3, 654, 1000, 533, 24)
sys.msleep(17)
touch.move(3, 654, 1000, 550, 24)
sys.msleep(150)
touch.move(3, 654, 1000, 567, 24)
sys.msleep(101)
touch.move(3, 654, 1000, 583, 24)
sys.msleep(16)
touch.move(3, 654, 1000, 600, 24)
sys.msleep(17)
touch.move(3, 654, 1000, 617, 50)
sys.msleep(16)
touch.move(3, 654, 1000, 633, 37)
sys.msleep(50)
touch.move(3, 654, 1000, 650, 26)
sys.msleep(17)
touch.move(3, 654, 1000, 667, 25)
sys.msleep(17)
touch.move(3, 654, 1000, 683, 25)
sys.msleep(433)
touch.move(3, 654, 1000, 667, 24)
sys.msleep(16)
touch.move(3, 654, 1000, 617, 24)
sys.msleep(16)
touch.move(3, 654, 1000, 583, 50)
sys.msleep(17)
touch.move(3, 654, 1000, 550, 23)
sys.msleep(16)
touch.move(3, 654, 1000, 533, 24)
sys.msleep(17)
touch.move(3, 654, 1000, 500, 50)
sys.msleep(17)
touch.move(3, 654, 1000, 483, 50)
sys.msleep(450)
touch.move(3, 654, 1000, 383, 50)
sys.msleep(17)
touch.move(3, 654, 1000, 300, 50)
sys.msleep(17)
touch.move(3, 654, 1000, 217, 50)
sys.msleep(16)
touch.move(3, 654, 1000, 133, 50)
touch.off(3, 654, 1000)

sys.msleep(584)
touch.on(6, 506, 1063)
sys.msleep(16)
touch.move(6, 506, 1063, 17, 50)
sys.msleep(17)
touch.move(6, 502, 1047, 133, 33)
sys.msleep(17)
touch.move(6, 502, 1026, 233, 37)
sys.msleep(17)
touch.move(6, 502, 997, 283, 34)
sys.msleep(16)
touch.move(6, 502, 948, 333, 33)
sys.msleep(17)
touch.move(6, 502, 879, 400, 31)
sys.msleep(17)
touch.move(6, 503, 793, 483, 35)
sys.msleep(16)
touch.move(6, 507, 694, 500, 34)
sys.msleep(17)
touch.move(6, 520, 558, 500, 24)
sys.msleep(17)
touch.move(6, 548, 398, 500, 50)
sys.msleep(17)
touch.move(6, 591, 226, 417, 50)
touch.off(6, 595, 222)

sys.msleep(2002)
touch.on(2, 484, 662)
sys.msleep(33)
touch.move(2, 484, 662, 50, 50)
sys.msleep(17)
touch.move(2, 484, 662, 117, 24)
touch.off(2, 484, 662)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
