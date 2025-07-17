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
	
	
	sys.msleep(463)
	touch.on(3, 132, 711)
	sys.msleep(35)
	touch.move(3, 132, 711, 83, 50)
	sys.msleep(17)
	touch.move(3, 132, 711, 183, 50)
	touch.off(3, 132, 711)
	
	sys.msleep(1084)
	touch.on(3, 117, 717)
	sys.msleep(34)
	touch.move(3, 117, 717, 50, 50)
	sys.msleep(17)
	touch.move(3, 117, 717, 217, 50)
	sys.msleep(17)
	touch.move(3, 117, 717, 333, 50)
	sys.msleep(17)
	touch.move(3, 117, 717, 417, 50)
	sys.msleep(16)
	touch.move(3, 117, 717, 450, 50)
	sys.msleep(17)
	touch.move(3, 117, 717, 483, 50)
	sys.msleep(17)
	touch.move(3, 117, 717, 517, 50)
	sys.msleep(17)
	touch.move(3, 117, 717, 583, 50)
	sys.msleep(17)
	touch.move(3, 117, 717, 633, 50)
	sys.msleep(17)
	touch.move(3, 117, 717, 667, 50)
	sys.msleep(17)
	touch.move(3, 117, 717, 683, 50)
	sys.msleep(17)
	touch.move(3, 117, 717, 700, 50)
	sys.msleep(17)
	touch.move(3, 117, 717, 717, 50)
	sys.msleep(17)
	touch.move(3, 117, 717, 733, 50)
	sys.msleep(17)
	touch.move(3, 117, 717, 750, 50)
	sys.msleep(17)
	touch.move(3, 117, 717, 767, 50)
	sys.msleep(17)
	touch.move(3, 117, 717, 783, 50)
	sys.msleep(17)
	touch.move(3, 117, 717, 800, 50)
	sys.msleep(150)
	touch.move(3, 117, 717, 817, 50)
	sys.msleep(17)
	touch.move(3, 117, 717, 833, 50)
	sys.msleep(33)
	touch.move(3, 117, 717, 850, 50)
	sys.msleep(17)
	touch.move(3, 117, 717, 867, 50)
	sys.msleep(183)
	touch.move(3, 117, 717, 800, 50)
	sys.msleep(17)
	touch.move(3, 117, 717, 550, 50)
	touch.off(3, 117, 717)
	
	sys.msleep(1068)
	touch.on(5, 148, 645)
	sys.msleep(33)
	touch.move(5, 148, 645, 200, 50)
	sys.msleep(16)
	touch.move(5, 148, 645, 283, 50)
	touch.off(5, 148, 645)
	
	sys.msleep(2051)
	touch.on(4, 432, 986)
	sys.msleep(18)
	touch.move(4, 432, 986, 350, 50)
	sys.msleep(16)
	touch.move(4, 432, 986, 617, 50)
	sys.msleep(17)
	touch.move(4, 432, 986, 667, 50)
	touch.off(4, 432, 986)
	
	sys.msleep(251)
	touch.on(6, 555, 209)
	sys.msleep(17)
	touch.move(6, 555, 209, 183, 50)
	sys.msleep(17)
	touch.move(6, 555, 209, 333, 50)
	sys.msleep(17)
	touch.move(6, 555, 209, 350, 50)
	touch.off(6, 555, 209)
	
	sys.msleep(502)
	touch.on(6, 582, 185)
	sys.msleep(17)
	touch.move(6, 582, 185, 283, 50)
	sys.msleep(17)
	touch.move(6, 582, 185, 333, 50)
	touch.off(6, 582, 185)
	
	sys.msleep(1335)
	touch.on(1, 329, 1216)
	sys.msleep(33)
	touch.move(1, 329, 1216, 100, 50)
	sys.msleep(17)
	touch.move(1, 329, 1216, 217, 50)
	sys.msleep(17)
	touch.move(1, 329, 1216, 250, 50)
	touch.off(1, 329, 1216)
	
	sys.msleep(168)
	touch.on(3, 350, 1136)
	sys.msleep(17)
	touch.move(3, 350, 1136, 183, 50)
	sys.msleep(16)
	touch.move(3, 350, 1136, 333, 50)
	touch.off(3, 350, 1136)
	
	sys.msleep(200)
	touch.on(3, 360, 1105)
	sys.msleep(33)
	touch.move(3, 360, 1105, 33, 50)
	touch.off(3, 360, 1105)
	
	sys.msleep(183)
	touch.on(3, 378, 1059)
	sys.msleep(17)
	touch.move(3, 378, 1059, 17, 50)
	sys.msleep(17)
	touch.move(3, 378, 1059, 183, 50)
	sys.msleep(17)
	touch.move(3, 378, 1059, 217, 50)
	touch.off(3, 378, 1059)
	
	sys.msleep(1334)
	touch.on(2, 399, 952)
	sys.msleep(33)
	touch.move(2, 399, 952, 67, 50)
	sys.msleep(16)
	touch.move(2, 399, 952, 150, 50)
	touch.off(2, 399, 952)
	
	end
	
	for l____________i = 1, play_times do
	actions()
	end
	
	touch.init(old_init_orien)
	end)(touch.init(0));  -- record end
	