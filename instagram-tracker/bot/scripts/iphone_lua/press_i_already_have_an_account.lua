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
	
	
	sys.msleep(1119)
	touch.on(1, 509, 1147)
	sys.msleep(18)
	touch.move(1, 509, 1147, 67, 50)
	sys.msleep(17)
	touch.move(1, 509, 1147, 283, 50)
	sys.msleep(16)
	touch.move(1, 509, 1147, 433, 50)
	touch.off(1, 509, 1147)
	
	sys.msleep(2184)
	touch.on(5, 636, 180)
	sys.msleep(18)
	touch.move(5, 636, 180, 100, 50)
	sys.msleep(17)
	touch.move(5, 636, 180, 333, 50)
	sys.msleep(17)
	touch.move(5, 636, 180, 517, 50)
	sys.msleep(17)
	touch.move(5, 636, 180, 567, 50)
	sys.msleep(50)
	touch.move(5, 636, 180, 450, 50)
	sys.msleep(17)
	touch.move(5, 636, 180, 317, 50)
	touch.off(5, 636, 180)
	
	sys.msleep(552)
	touch.on(5, 640, 190)
	sys.msleep(17)
	touch.move(5, 640, 190, 217, 50)
	sys.msleep(17)
	touch.move(5, 640, 190, 350, 50)
	touch.off(5, 640, 190)
	
	sys.msleep(517)
	touch.on(5, 654, 190)
	sys.msleep(17)
	touch.move(5, 654, 190, 283, 50)
	sys.msleep(17)
	touch.move(5, 654, 190, 433, 50)
	sys.msleep(17)
	touch.move(5, 654, 190, 450, 50)
	sys.msleep(50)
	touch.move(5, 654, 190, 300, 50)
	touch.off(5, 654, 190)
	
	sys.msleep(502)
	touch.on(5, 661, 187)
	sys.msleep(16)
	touch.move(5, 661, 187, 217, 50)
	sys.msleep(17)
	touch.move(5, 661, 187, 417, 50)
	sys.msleep(50)
	touch.move(5, 661, 187, 383, 50)
	sys.msleep(17)
	touch.move(5, 661, 187, 233, 50)
	touch.off(5, 661, 187)
	
	sys.msleep(449)
	touch.on(5, 656, 164)
	sys.msleep(17)
	touch.move(5, 656, 164, 350, 50)
	sys.msleep(16)
	touch.move(5, 656, 164, 650, 50)
	sys.msleep(17)
	touch.move(5, 656, 164, 683, 50)
	sys.msleep(33)
	touch.move(5, 656, 164, 617, 50)
	sys.msleep(17)
	touch.move(5, 656, 164, 400, 50)
	sys.msleep(17)
	touch.move(5, 656, 164, 267, 50)
	touch.off(5, 656, 164)
	
	sys.msleep(435)
	touch.on(5, 666, 184)
	sys.msleep(17)
	touch.move(5, 666, 184, 417, 50)
	sys.msleep(17)
	touch.move(5, 666, 184, 667, 50)
	sys.msleep(17)
	touch.move(5, 666, 184, 683, 50)
	sys.msleep(33)
	touch.move(5, 666, 184, 517, 50)
	sys.msleep(17)
	touch.move(5, 666, 184, 283, 50)
	touch.off(5, 666, 184)
	
	sys.msleep(1267)
	touch.on(6, 45, 84)
	sys.msleep(33)
	touch.move(6, 45, 84, 150, 76)
	sys.msleep(17)
	touch.move(6, 45, 84, 250, 76)
	touch.off(6, 45, 84)
	
	sys.msleep(3651)
	touch.on(3, 479, 762)
	sys.msleep(18)
	touch.move(3, 479, 762, 33, 50)
	sys.msleep(17)
	touch.move(3, 479, 762, 183, 50)
	sys.msleep(17)
	touch.move(3, 479, 762, 217, 50)
	touch.off(3, 479, 762)
	
	
	
	end
	
	for l____________i = 1, play_times do
	actions()
	end
	
	touch.init(old_init_orien)
	end)(touch.init(0));  -- record end
	