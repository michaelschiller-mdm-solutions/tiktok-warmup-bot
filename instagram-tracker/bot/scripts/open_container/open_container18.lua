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

sys.msleep(1772)
touch.on(4, 641, 995)
sys.msleep(18)
touch.move(4, 641, 995, 233, 91)
sys.msleep(17)
touch.move(4, 641, 995, 500, 92)
sys.msleep(17)
touch.move(4, 641, 995, 717, 92)
sys.msleep(16)
touch.move(4, 641, 995, 900, 92)
sys.msleep(17)
touch.move(4, 641, 995, 1017, 92)
sys.msleep(17)
touch.move(4, 641, 995, 1067, 92)
sys.msleep(16)
touch.move(4, 641, 995, 1100, 92)
sys.msleep(17)
touch.move(4, 641, 995, 1117, 91)
sys.msleep(17)
touch.move(4, 641, 995, 1133, 91)
sys.msleep(50)
touch.move(4, 641, 995, 1150, 91)
sys.msleep(200)
touch.move(4, 641, 995, 1133, 92)
sys.msleep(67)
touch.move(4, 641, 995, 1117, 92)
sys.msleep(50)
touch.move(4, 641, 995, 1100, 92)
sys.msleep(17)
touch.move(4, 641, 995, 1083, 92)
sys.msleep(33)
touch.move(4, 641, 995, 1067, 92)
sys.msleep(384)
touch.move(4, 643, 993, 1067, 92)
sys.msleep(66)
touch.move(4, 643, 993, 983, 93)
sys.msleep(17)
touch.move(4, 643, 993, 817, 93)
sys.msleep(17)
touch.move(4, 643, 993, 600, 50)
touch.off(4, 641, 992)

sys.msleep(1149)
touch.on(5, 541, 1116)
sys.msleep(34)
touch.move(5, 544, 1088, 250, 50)
sys.msleep(17)
touch.move(5, 545, 1058, 600, 50)
sys.msleep(17)
touch.move(5, 550, 1018, 900, 50)
sys.msleep(17)
touch.move(5, 559, 973, 1150, 50)
sys.msleep(16)
touch.move(5, 569, 922, 1317, 50)
sys.msleep(17)
touch.move(5, 579, 865, 1400, 50)
sys.msleep(17)
touch.move(5, 591, 803, 1433, 50)
sys.msleep(16)
touch.move(5, 601, 742, 1450, 50)
sys.msleep(17)
touch.move(5, 612, 682, 1450, 50)
sys.msleep(16)
touch.move(5, 621, 623, 1450, 50)
sys.msleep(17)
touch.move(5, 628, 562, 1450, 50)
sys.msleep(17)
touch.move(5, 636, 503, 1383, 50)
sys.msleep(17)
touch.move(5, 641, 451, 1367, 50)
sys.msleep(17)
touch.move(5, 644, 415, 1367, 50)
sys.msleep(17)
touch.move(5, 645, 386, 1367, 50)
sys.msleep(16)
touch.move(5, 646, 365, 1383, 50)
sys.msleep(17)
touch.move(5, 647, 349, 1417, 50)
sys.msleep(17)
touch.move(5, 649, 335, 1417, 50)
sys.msleep(17)
touch.move(5, 651, 327, 1417, 50)
sys.msleep(17)
touch.move(5, 652, 322, 1417, 50)
sys.msleep(17)
touch.move(5, 653, 320, 1417, 50)
sys.msleep(17)
touch.move(5, 654, 319, 1417, 99)
sys.msleep(16)
touch.move(5, 655, 319, 1433, 50)
sys.msleep(17)
touch.move(5, 655, 319, 1483, 99)
sys.msleep(17)
touch.move(5, 655, 319, 1500, 50)
sys.msleep(17)
touch.move(5, 655, 319, 1517, 50)
sys.msleep(17)
touch.move(5, 655, 319, 1533, 50)
sys.msleep(33)
touch.move(5, 655, 319, 1550, -100)
sys.msleep(17)
touch.move(5, 655, 319, 1567, -100)
sys.msleep(17)
touch.move(5, 655, 319, 1583, -100)
sys.msleep(16)
touch.move(5, 655, 319, 1600, -100)
sys.msleep(16)
touch.move(5, 655, 319, 1617, 50)
sys.msleep(200)
touch.move(5, 655, 319, 1583, -100)
sys.msleep(17)
touch.move(5, 655, 319, 1450, 50)
sys.msleep(17)
touch.move(5, 655, 319, 1217, 50)
sys.msleep(17)
touch.move(5, 655, 319, 883, 50)
touch.off(5, 657, 318)

sys.msleep(935)
touch.on(6, 556, 868)
sys.msleep(16)
touch.move(6, 556, 868, 383, 50)
sys.msleep(17)
touch.move(6, 556, 868, 783, 50)
sys.msleep(17)
touch.move(6, 556, 868, 900, 50)
sys.msleep(50)
touch.move(6, 556, 868, 617, 50)
touch.off(6, 556, 868)



end

for l____________i = 1, play_times do
actions()
end

touch.init(old_init_orien)
end)(touch.init(0));  -- record end
