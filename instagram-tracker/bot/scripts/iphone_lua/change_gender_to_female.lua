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
	
	
	sys.msleep(1678)
	touch.on(6, 668, 1285)
	sys.msleep(17)
	touch.move(6, 668, 1285, 150, 50)
	sys.msleep(17)
	touch.move(6, 668, 1285, 317, 50)
	sys.msleep(17)
	touch.move(6, 668, 1285, 350, 50)
	touch.off(6, 668, 1285)
	
	sys.msleep(2151)
	touch.on(3, 219, 467)
	sys.msleep(18)
	touch.move(3, 219, 467, 83, 99)
	sys.msleep(16)
	touch.move(3, 219, 467, 283, 97)
	sys.msleep(17)
	touch.move(3, 219, 467, 317, 96)
	touch.off(3, 219, 467)
	
	sys.msleep(2618)
	touch.on(4, 296, 1163)
	sys.msleep(67)
	touch.move(4, 296, 1163, 67, 50)
	sys.msleep(16)
	touch.move(4, 296, 1163, 117, 50)
	touch.off(4, 296, 1163)
	
	sys.msleep(2184)
	touch.on(2, 696, 344)
	sys.msleep(18)
	touch.move(2, 696, 344, 133, 50)
	sys.msleep(17)
	touch.move(2, 696, 344, 300, 50)
	touch.off(2, 696, 344)
	
	sys.msleep(1282)
	touch.on(5, 687, 64)
	touch.off(5, 687, 64)
	
	
	
	end
	
	for l____________i = 1, play_times do
	actions()
	end
	
	touch.init(old_init_orien)
	end)(touch.init(0));  -- record end
	