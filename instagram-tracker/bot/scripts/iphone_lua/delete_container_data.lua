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
	
	
	sys.msleep(665)
	touch.on(3, 482, 1138)
	sys.msleep(35)
	touch.move(3, 487, 1111, 17, 50)
	sys.msleep(16)
	touch.move(3, 487, 1083, 150, 50)
	sys.msleep(16)
	touch.move(3, 487, 1038, 283, 50)
	sys.msleep(17)
	touch.move(3, 489, 970, 383, 50)
	sys.msleep(17)
	touch.move(3, 490, 877, 517, 50)
	sys.msleep(17)
	touch.move(3, 495, 750, 650, 50)
	sys.msleep(17)
	touch.move(3, 507, 606, 650, 50)
	sys.msleep(17)
	touch.move(3, 536, 445, 650, 50)
	sys.msleep(17)
	touch.move(3, 579, 287, 600, 34)
	sys.msleep(17)
	touch.move(3, 632, 134, 450, 50)
	touch.off(3, 636, 130)
	
	sys.msleep(735)
	touch.on(2, 445, 1044)
	sys.msleep(17)
	touch.move(2, 445, 1013, 0, 50)
	sys.msleep(17)
	touch.move(2, 445, 978, 33, 50)
	sys.msleep(17)
	touch.move(2, 444, 932, 150, 50)
	sys.msleep(17)
	touch.move(2, 444, 862, 267, 50)
	sys.msleep(17)
	touch.move(2, 444, 778, 383, 50)
	sys.msleep(17)
	touch.move(2, 449, 685, 417, 50)
	sys.msleep(17)
	touch.move(2, 464, 573, 417, 50)
	sys.msleep(17)
	touch.move(2, 488, 448, 417, 50)
	sys.msleep(17)
	touch.move(2, 518, 324, 417, 50)
	touch.off(2, 560, 214)
	
	sys.msleep(1534)
	touch.on(5, 294, 1177)
	sys.msleep(33)
	touch.move(5, 294, 1177, 100, 50)
	sys.msleep(17)
	touch.move(5, 294, 1177, 233, 50)
	sys.msleep(17)
	touch.move(5, 294, 1177, 250, 50)
	touch.off(5, 294, 1177)
	
	sys.msleep(1668)
	touch.on(4, 521, 793)
	sys.msleep(33)
	touch.move(4, 521, 793, 183, 50)
	sys.msleep(17)
	touch.move(4, 521, 793, 317, 50)
	touch.off(4, 521, 793)
	
	sys.msleep(699)
	touch.on(3, 91, 80)
	sys.msleep(50)
	touch.move(3, 91, 80, 50, 37)
	sys.msleep(17)
	touch.move(3, 91, 80, 150, 37)
	sys.msleep(17)
	touch.move(3, 91, 80, 200, 37)
	touch.off(3, 91, 80)
	
	end
	
	for l____________i = 1, play_times do
	actions()
	end
	
	touch.init(old_init_orien)
	end)(touch.init(0));  -- record end
	