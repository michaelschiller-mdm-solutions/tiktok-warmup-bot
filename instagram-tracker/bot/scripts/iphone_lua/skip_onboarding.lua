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


sys.msleep(2242)
touch.on(5, 519, 764)
sys.msleep(18)
touch.move(5, 519, 764, 67, 50)
sys.msleep(17)
touch.move(5, 519, 764, 83, 50)
touch.off(5, 519, 764)

sys.msleep(2116)
touch.on(1, 704, 1311)
sys.msleep(18)
touch.move(1, 704, 1311, 67, 97)
sys.msleep(17)
touch.move(1, 704, 1311, 167, 97)
sys.msleep(17)
touch.move(1, 704, 1311, 250, 97)
touch.off(1, 704, 1311)

sys.msleep(5217)
touch.on(6, 203, 449)
sys.msleep(18)
touch.move(6, 203, 449, 117, 50)
sys.msleep(16)
touch.move(6, 203, 449, 383, 50)
sys.msleep(17)
touch.move(6, 203, 449, 583, 50)
touch.off(6, 203, 449)

sys.msleep(1567)
touch.on(3, 406, 1006)
sys.msleep(34)
touch.move(3, 406, 1006, 200, 50)
sys.msleep(17)
touch.move(3, 406, 1006, 350, 50)
sys.msleep(17)
touch.move(3, 406, 1006, 400, 50)
touch.off(3, 406, 1006)

sys.msleep(3616)
touch.on(2, 739, 129)
sys.msleep(18)
touch.move(2, 739, 129, 83, 50)
sys.msleep(17)
touch.move(2, 739, 129, 233, 50)
touch.off(2, 739, 129)

sys.msleep(585)
touch.on(2, 709, 151)
sys.msleep(16)
touch.move(2, 709, 151, 117, 50)
sys.msleep(17)
touch.move(2, 709, 151, 200, -100)
touch.off(2, 709, 151)

sys.msleep(752)
touch.on(2, 708, 152)
sys.msleep(16)
touch.move(2, 708, 152, 350, 50)
sys.msleep(17)
touch.move(2, 708, 152, 617, 50)
sys.msleep(17)
touch.move(2, 708, 152, 700, 50)
sys.msleep(50)
touch.move(2, 708, 152, 650, 50)
touch.off(2, 708, 152)

sys.msleep(1849)
touch.on(4, 37, 79)
sys.msleep(18)
touch.move(4, 37, 79, 467, 50)
sys.msleep(17)
touch.move(4, 37, 79, 533, 50)
sys.msleep(17)
touch.move(4, 37, 79, 533, 50)
sys.msleep(17)
touch.move(4, 37, 79, 533, 50)
sys.msleep(17)
touch.move(4, 37, 79, 467, 50)
sys.msleep(17)
touch.move(4, 37, 79, 300, 50)
touch.off(4, 37, 79)

sys.msleep(1450)
touch.on(5, 86, 1298)
sys.msleep(18)
touch.move(5, 86, 1298, 333, 8)
sys.msleep(17)
touch.move(5, 86, 1298, 850, 9)
sys.msleep(17)
touch.move(5, 86, 1298, 983, 8)
sys.msleep(17)
touch.move(5, 86, 1298, 1000, 8)
sys.msleep(34)
touch.move(5, 86, 1298, 900, 50)
touch.off(5, 86, 1298)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
