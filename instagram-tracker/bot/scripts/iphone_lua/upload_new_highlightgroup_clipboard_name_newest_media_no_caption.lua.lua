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


sys.msleep(3079)
touch.on(3, 684, 1253)
touch.off(3, 684, 1253)

sys.msleep(2651)
touch.on(1, 98, 1141)
touch.off(1, 98, 1141)

sys.msleep(3451)
touch.on(4, 213, 163)
sys.msleep(51)
touch.move(4, 213, 163, 17, 83)
sys.msleep(17)
touch.move(4, 213, 163, 50, 83)
sys.msleep(17)
touch.move(4, 213, 163, 67, 82)
touch.off(4, 213, 163)

sys.msleep(1401)
touch.on(6, 717, 83)
sys.msleep(35)
touch.move(6, 717, 83, 33, 50)
touch.off(6, 717, 83)

sys.msleep(1817)
touch.on(5, 431, 628)
sys.msleep(52)
touch.move(5, 431, 628, 100, 50)
sys.msleep(16)
touch.move(5, 431, 628, 200, 50)
sys.msleep(17)
touch.move(5, 431, 628, 267, 50)
sys.msleep(17)
touch.move(5, 431, 628, 300, 50)
sys.msleep(17)
touch.move(5, 431, 628, 333, 50)
sys.msleep(16)
touch.move(5, 431, 628, 383, 50)
sys.msleep(17)
touch.move(5, 431, 628, 417, 50)
sys.msleep(16)
touch.move(5, 431, 628, 467, 50)
sys.msleep(17)
touch.move(5, 431, 628, 500, 50)
sys.msleep(17)
touch.move(5, 431, 628, 517, 50)
sys.msleep(17)
touch.move(5, 431, 628, 533, 50)
sys.msleep(49)
touch.move(5, 431, 628, 550, 50)
sys.msleep(18)
touch.move(5, 431, 628, 567, 50)
sys.msleep(16)
touch.move(5, 431, 628, 600, 50)
sys.msleep(17)
touch.move(5, 431, 628, 650, 50)
sys.msleep(17)
touch.move(5, 431, 628, 667, 50)
sys.msleep(17)
touch.move(5, 431, 628, 683, 50)
sys.msleep(16)
touch.move(5, 431, 628, 700, 50)
sys.msleep(17)
touch.move(5, 431, 628, 717, 50)
sys.msleep(133)
touch.move(5, 431, 628, 733, 50)
sys.msleep(100)
touch.move(5, 431, 628, 750, 50)
sys.msleep(117)
touch.move(5, 431, 628, 733, 50)
sys.msleep(17)
touch.move(5, 431, 628, 583, 50)
sys.msleep(17)
touch.move(5, 431, 628, 450, 14)
touch.off(5, 431, 628)

sys.msleep(716)
touch.on(2, 320, 529)
sys.msleep(17)
touch.move(2, 320, 529, 83, 50)
sys.msleep(16)
touch.move(2, 320, 529, 183, 50)
touch.off(2, 320, 529)

sys.msleep(902)
touch.on(6, 724, 69)
sys.msleep(17)
touch.move(6, 724, 69, 217, 50)
sys.msleep(17)
touch.move(6, 724, 69, 333, 50)
sys.msleep(33)
touch.move(6, 724, 69, 317, 13)
touch.off(6, 724, 69)

sys.msleep(1617)
touch.on(6, 718, 86)
sys.msleep(35)
touch.move(6, 718, 86, 17, 50)
sys.msleep(17)
touch.move(6, 718, 86, 50, 50)
touch.off(6, 718, 86)

sys.msleep(1184)
touch.on(6, 712, 89)
sys.msleep(18)
touch.move(6, 712, 89, 100, 50)
sys.msleep(17)
touch.move(6, 712, 89, 267, 50)
sys.msleep(17)
touch.move(6, 712, 89, 350, 50)
sys.msleep(16)
touch.move(6, 712, 89, 367, 50)
sys.msleep(67)
touch.move(6, 712, 89, 300, 20)
touch.off(6, 712, 89)

sys.msleep(3835)
touch.on(3, 417, 1011)
sys.msleep(50)
touch.move(3, 417, 1011, 17, 50)
sys.msleep(17)
touch.move(3, 417, 1011, 100, 50)
sys.msleep(17)
touch.move(3, 417, 1011, 150, 50)
sys.msleep(17)
touch.move(3, 417, 1011, 167, 50)
touch.off(3, 417, 1011)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
