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
sys.msleep(870)
key.down(12,64)
  -- HOMEBUTTON
key.up(12,64)
  -- HOMEBUTTON
sys.msleep(870)
touch.on(5, 609, 1002)
sys.msleep(18)
touch.move(5, 609, 1002, 150, 50)
sys.msleep(17)
touch.move(5, 609, 1002, 333, 50)
sys.msleep(17)
touch.move(5, 609, 1002, 467, 50)
sys.msleep(17)
touch.move(5, 609, 1002, 533, 50)
sys.msleep(17)
touch.move(5, 609, 1002, 550, 50)
sys.msleep(50)
touch.move(5, 609, 1002, 567, 50)
sys.msleep(17)
touch.move(5, 609, 1002, 617, 50)
sys.msleep(17)
touch.move(5, 609, 1002, 667, 50)
sys.msleep(17)
touch.move(5, 609, 1002, 700, 50)
sys.msleep(17)
touch.move(5, 609, 1002, 717, 50)
sys.msleep(17)
touch.move(5, 609, 1002, 733, 50)
sys.msleep(250)
touch.move(5, 609, 1002, 717, 50)
sys.msleep(184)
touch.move(5, 609, 1002, 700, 50)
sys.msleep(250)
touch.move(5, 609, 1002, 683, 50)
sys.msleep(17)
touch.move(5, 609, 1002, 633, 50)
sys.msleep(17)
touch.move(5, 609, 1002, 567, 50)
sys.msleep(16)
touch.move(5, 609, 1002, 517, 50)
sys.msleep(17)
touch.move(5, 609, 1002, 483, 50)
sys.msleep(17)
touch.move(5, 609, 1002, 433, 50)
sys.msleep(16)
touch.move(5, 609, 1002, 400, 50)
sys.msleep(17)
touch.move(5, 609, 1002, 383, 50)
sys.msleep(16)
touch.move(5, 609, 1002, 350, 50)
sys.msleep(17)
touch.move(5, 609, 1002, 283, 50)
sys.msleep(17)
touch.move(5, 609, 1002, 217, 50)
touch.off(5, 609, 1002)

sys.msleep(1167)
touch.on(6, 600, 430)
sys.msleep(34)
touch.move(6, 600, 430, 217, 50)
sys.msleep(17)
touch.move(6, 600, 430, 467, 50)
sys.msleep(17)
touch.move(6, 600, 430, 567, 50)
sys.msleep(50)
touch.move(6, 600, 430, 483, 50)
touch.off(6, 600, 430)

sys.msleep(1817)
touch.on(1, 669, 223)
sys.msleep(35)
touch.move(1, 669, 223, 283, 50)
sys.msleep(16)
touch.move(1, 669, 223, 500, 50)
sys.msleep(17)
touch.move(1, 669, 223, 567, 50)
touch.off(1, 669, 223)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
