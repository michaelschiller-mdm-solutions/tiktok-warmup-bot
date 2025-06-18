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


sys.msleep(1452)
touch.on(3, 114, 242)
sys.msleep(18)
touch.move(3, 114, 242, 133, 50)
sys.msleep(17)
touch.move(3, 114, 242, 317, 50)
sys.msleep(16)
touch.move(3, 114, 242, 333, 50)
touch.off(3, 114, 242)

sys.msleep(1683)
touch.on(4, 368, 642)
sys.msleep(18)
touch.move(4, 368, 642, 283, 50)
sys.msleep(17)
touch.move(4, 368, 642, 433, 50)
touch.off(4, 368, 642)

sys.msleep(1617)
touch.on(6, 193, 1261)
sys.msleep(19)
touch.move(6, 193, 1261, 417, 50)
sys.msleep(16)
touch.move(6, 193, 1261, 600, 50)
touch.off(6, 193, 1261)

sys.msleep(1416)
touch.on(3, 110, 195)
sys.msleep(18)
touch.move(3, 110, 195, 83, 50)
sys.msleep(16)
touch.move(3, 110, 195, 250, 50)
sys.msleep(17)
touch.move(3, 110, 195, 283, 50)
touch.off(3, 110, 195)

sys.msleep(1550)
touch.on(5, 299, 1255)
sys.msleep(18)
touch.move(5, 299, 1255, 183, 50)
sys.msleep(17)
touch.move(5, 299, 1255, 333, 50)
sys.msleep(17)
touch.move(5, 299, 1255, 350, 50)
touch.off(5, 299, 1255)

sys.msleep(1435)
touch.on(4, 403, 655)
sys.msleep(17)
touch.move(4, 403, 655, 100, 50)
sys.msleep(17)
touch.move(4, 403, 655, 350, 50)
sys.msleep(17)
touch.move(4, 403, 655, 600, 50)
sys.msleep(17)
touch.move(4, 403, 655, 783, 50)
sys.msleep(17)
touch.move(4, 403, 655, 917, 50)
sys.msleep(17)
touch.move(4, 403, 655, 1000, 50)
sys.msleep(17)
touch.move(4, 403, 655, 1050, 50)
sys.msleep(17)
touch.move(4, 403, 655, 1100, 50)
sys.msleep(17)
touch.move(4, 403, 655, 1150, 50)
sys.msleep(16)
touch.move(4, 403, 655, 1200, 8)
sys.msleep(17)
touch.move(4, 403, 655, 1233, 50)
sys.msleep(17)
touch.move(4, 403, 655, 1250, 8)
sys.msleep(83)
touch.move(4, 403, 655, 1267, 50)
sys.msleep(17)
touch.move(4, 403, 655, 1283, 7)
sys.msleep(17)
touch.move(4, 403, 655, 1300, 50)
sys.msleep(17)
touch.move(4, 403, 655, 1317, 7)
sys.msleep(17)
touch.move(4, 403, 655, 1333, 50)
sys.msleep(16)
touch.move(4, 403, 655, 1350, 50)
sys.msleep(17)
touch.move(4, 403, 655, 1367, 8)
sys.msleep(17)
touch.move(4, 403, 655, 1383, 8)
sys.msleep(17)
touch.move(4, 403, 655, 1400, 8)
sys.msleep(33)
touch.move(4, 403, 655, 1417, 50)
sys.msleep(266)
touch.move(4, 403, 655, 1400, 50)
sys.msleep(17)
touch.move(4, 403, 655, 1150, 50)
sys.msleep(17)
touch.move(4, 403, 655, 817, 50)
touch.off(4, 403, 655)

sys.msleep(751)
touch.on(1, 330, 564)
sys.msleep(17)
touch.move(1, 330, 564, 300, 50)
sys.msleep(17)
touch.move(1, 330, 564, 533, 50)
sys.msleep(17)
touch.move(1, 330, 564, 567, 50)
touch.off(1, 330, 564)

sys.msleep(1834)
touch.on(2, 439, 763)
sys.msleep(35)
touch.move(2, 439, 763, 250, 50)
sys.msleep(17)
touch.move(2, 439, 763, 317, 50)
touch.off(2, 439, 763)

sys.msleep(1284)
touch.on(6, 417, 963)
sys.msleep(18)
touch.move(6, 417, 963, 33, 50)
touch.off(6, 417, 963)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
