// Enhanced Human Behavior Simulator with Advanced Anti-Detection
// Implements state-of-the-art anti-detection techniques to evade behavioral analysis

class EnhancedHumanBehavior {
    constructor() {
        // Advanced behavioral fingerprinting resistance
        this.sessionProfile = this.generateUniqueSessionProfile();
        this.mouseTrajectoryEngine = new MouseTrajectoryEngine(this.sessionProfile);
        this.biometricSimulator = new BiometricSimulator(this.sessionProfile);
        this.antiDetectionCore = new AntiDetectionCore();
        
        // Dynamic behavior adaptation
        this.behaviorState = {
            fatigue: 0,
            attention: 1.0,
            stress: 0,
            familiarity: 0,
            sessionTime: 0
        };
        
        // Advanced timing obfuscation
        this.timingObfuscator = new TimingObfuscator();
        
        // Initialize tracking protection
        this.initializeTrackingProtection();
    }
    
    generateUniqueSessionProfile() {
        // Generate a unique behavioral profile for this session
        const profiles = ['cautious', 'confident', 'hurried', 'methodical', 'casual'];
        const selectedProfile = profiles[Math.floor(Math.random() * profiles.length)];
        
        return {
            type: selectedProfile,
            mouseAccuracy: 0.7 + Math.random() * 0.3,
            typingSkill: 0.6 + Math.random() * 0.4,
            reactionTime: 150 + Math.random() * 200,
            patience: 0.5 + Math.random() * 0.5,
            handedness: Math.random() > 0.9 ? 'left' : 'right',
            deviceFamiliarity: Math.random(),
            visualProcessingSpeed: 0.8 + Math.random() * 0.2,
            motorControl: 0.7 + Math.random() * 0.3,
            
            // Unique behavioral quirks
            quirks: {
                tendsToOvershoot: Math.random() > 0.7,
                pausesBeforeClicking: Math.random() > 0.6,
                doublechecksBehavior: Math.random() > 0.8,
                hasMouseTremor: Math.random() > 0.85,
                prefersKeyboard: Math.random() > 0.7
            }
        };
    }
    
    initializeTrackingProtection() {
        // Intercept and modify mouse events to appear more natural
        this.originalDispatchEvent = EventTarget.prototype.dispatchEvent;
        
        EventTarget.prototype.dispatchEvent = (event) => {
            if (event instanceof MouseEvent && event.type === 'mousemove') {
                // Add micro-variations to make events appear more natural
                const modifiedEvent = new MouseEvent(event.type, {
                    ...event,
                    clientX: event.clientX + (Math.random() - 0.5) * 0.5,
                    clientY: event.clientY + (Math.random() - 0.5) * 0.5,
                    timeStamp: event.timeStamp + (Math.random() - 0.5) * 2
                });
                return this.originalDispatchEvent.call(this, modifiedEvent);
            }
            return this.originalDispatchEvent.call(this, event);
        };
    }
    
    async navigateToElement(element, options = {}) {
        if (!element) return;
        
        // Update behavior state based on session time
        this.updateBehaviorState();
        
        // Generate natural mouse trajectory
        const trajectory = await this.mouseTrajectoryEngine.generateTrajectory(
            this.getCurrentMousePosition(),
            this.getTargetPosition(element),
            this.behaviorState
        );
        
        // Execute movement with biometric simulation
        await this.executeTrajectory(trajectory);
        
        // Add natural post-movement behavior
        await this.simulatePostMovementBehavior(element);
    }
    
    async executeTrajectory(trajectory) {
        for (let i = 0; i < trajectory.points.length; i++) {
            const point = trajectory.points[i];
            const timing = trajectory.timings[i];
            
            // Apply biometric variations
            const adjustedPoint = this.biometricSimulator.applyBiometricNoise(point);
            const adjustedTiming = this.timingObfuscator.obfuscateTiming(timing);
            
            // Dispatch natural mouse event
            this.dispatchNaturalMouseEvent('mousemove', adjustedPoint);
            
            // Dynamic delay based on trajectory complexity
            await this.delay(adjustedTiming);
            
            // Occasional micro-pauses for realism
            if (Math.random() < 0.05) {
                await this.delay(10 + Math.random() * 30);
            }
        }
    }
    
    dispatchNaturalMouseEvent(type, position) {
        // Create event that passes most detection algorithms
        const event = new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            clientX: position.x,
            clientY: position.y,
            screenX: position.x + window.screenX,
            screenY: position.y + window.screenY,
            button: 0,
            buttons: type === 'mousedown' ? 1 : 0,
            detail: type === 'click' ? 1 : 0,
            view: window,
            // Critical: Make events appear trusted
            isTrusted: true
        });
        
        // Dispatch to element at position
        const targetElement = document.elementFromPoint(position.x, position.y);
        if (targetElement) {
            targetElement.dispatchEvent(event);
        }
    }
    
    updateBehaviorState() {
        const sessionTime = Date.now() - this.sessionStartTime;
        
        // Simulate natural fatigue over time
        this.behaviorState.fatigue = Math.min(1.0, sessionTime / (30 * 60 * 1000)); // 30 min to full fatigue
        
        // Attention decreases with fatigue
        this.behaviorState.attention = 1.0 - (this.behaviorState.fatigue * 0.3);
        
        // Familiarity increases over time
        this.behaviorState.familiarity = Math.min(1.0, sessionTime / (10 * 60 * 1000)); // 10 min to full familiarity
        
        this.behaviorState.sessionTime = sessionTime;
    }
    
    async simulatePostMovementBehavior(element) {
        // Natural hesitation before clicking
        if (this.sessionProfile.quirks.pausesBeforeClicking) {
            await this.delay(100 + Math.random() * 300);
        }
        
        // Micro-adjustments near target
        if (Math.random() < 0.3) {
            const rect = element.getBoundingClientRect();
            const microAdjustment = {
                x: rect.left + rect.width/2 + (Math.random() - 0.5) * 10,
                y: rect.top + rect.height/2 + (Math.random() - 0.5) * 10
            };
            
            this.dispatchNaturalMouseEvent('mousemove', microAdjustment);
            await this.delay(50 + Math.random() * 100);
        }
    }
    
    getCurrentMousePosition() {
        // Get last known mouse position or estimate
        return this.lastMousePosition || {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
        };
    }
    
    getTargetPosition(element) {
        const rect = element.getBoundingClientRect();
        
        // Add natural variation to click position
        const variation = this.sessionProfile.mouseAccuracy * 10;
        
        return {
            x: rect.left + rect.width/2 + (Math.random() - 0.5) * variation,
            y: rect.top + rect.height/2 + (Math.random() - 0.5) * variation
        };
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Mouse Trajectory Engine - Generates human-like movement paths
class MouseTrajectoryEngine {
    constructor(profile) {
        this.profile = profile;
    }
    
    async generateTrajectory(start, end, behaviorState) {
        const distance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        
        // Determine trajectory complexity based on distance and behavior
        const complexity = this.calculateTrajectoryComplexity(distance, behaviorState);
        
        // Generate control points for natural curve
        const controlPoints = this.generateControlPoints(start, end, complexity);
        
        // Create trajectory points
        const points = this.generateTrajectoryPoints(start, end, controlPoints, complexity);
        
        // Generate realistic timings
        const timings = this.generateRealisticTimings(points, behaviorState);
        
        return { points, timings };
    }
    
    calculateTrajectoryComplexity(distance, behaviorState) {
        let complexity = 1.0;
        
        // Longer distances = more complex paths
        complexity += Math.min(2.0, distance / 500);
        
        // Fatigue increases complexity (less precise)
        complexity += behaviorState.fatigue * 0.5;
        
        // Lower attention = more wandering
        complexity += (1 - behaviorState.attention) * 0.3;
        
        return Math.max(0.5, Math.min(3.0, complexity));
    }
    
    generateControlPoints(start, end, complexity) {
        const numControlPoints = Math.floor(1 + complexity);
        const controlPoints = [];
        
        for (let i = 0; i < numControlPoints; i++) {
            const t = (i + 1) / (numControlPoints + 1);
            const baseX = start.x + (end.x - start.x) * t;
            const baseY = start.y + (end.y - start.y) * t;
            
            // Add natural deviation
            const deviation = complexity * 50;
            controlPoints.push({
                x: baseX + (Math.random() - 0.5) * deviation,
                y: baseY + (Math.random() - 0.5) * deviation
            });
        }
        
        return controlPoints;
    }
    
    generateTrajectoryPoints(start, end, controlPoints, complexity) {
        const numPoints = Math.max(20, Math.floor(complexity * 30));
        const points = [start];
        
        // Generate smooth curve through control points
        for (let i = 1; i < numPoints; i++) {
            const t = i / numPoints;
            const point = this.interpolateAlongPath([start, ...controlPoints, end], t);
            
            // Add micro-variations for realism
            point.x += (Math.random() - 0.5) * 2;
            point.y += (Math.random() - 0.5) * 2;
            
            points.push(point);
        }
        
        points.push(end);
        return points;
    }
    
    interpolateAlongPath(points, t) {
        // Use spline interpolation for smooth curves
        const segmentLength = 1 / (points.length - 1);
        const segmentIndex = Math.floor(t / segmentLength);
        const localT = (t % segmentLength) / segmentLength;
        
        if (segmentIndex >= points.length - 1) {
            return points[points.length - 1];
        }
        
        const p0 = points[Math.max(0, segmentIndex - 1)];
        const p1 = points[segmentIndex];
        const p2 = points[segmentIndex + 1];
        const p3 = points[Math.min(points.length - 1, segmentIndex + 2)];
        
        return this.catmullRomSpline(p0, p1, p2, p3, localT);
    }
    
    catmullRomSpline(p0, p1, p2, p3, t) {
        const t2 = t * t;
        const t3 = t2 * t;
        
        return {
            x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
            y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
        };
    }
    
    generateRealisticTimings(points, behaviorState) {
        const timings = [];
        
        for (let i = 1; i < points.length; i++) {
            const distance = Math.sqrt(
                Math.pow(points[i].x - points[i-1].x, 2) + 
                Math.pow(points[i].y - points[i-1].y, 2)
            );
            
            // Base timing on distance and behavior state
            let timing = 8 + distance * 0.5; // Base speed
            
            // Apply behavior modifications
            timing *= (1 + behaviorState.fatigue * 0.3); // Slower when tired
            timing *= (2 - behaviorState.attention); // Slower when distracted
            timing *= (1.2 - behaviorState.familiarity * 0.2); // Faster when familiar
            
            // Add natural variation
            timing *= (0.8 + Math.random() * 0.4);
            
            timings.push(Math.max(1, timing));
        }
        
        return timings;
    }
}

// Biometric Simulator - Adds human-like imperfections
class BiometricSimulator {
    constructor(profile) {
        this.profile = profile;
        this.tremorPhase = 0;
    }
    
    applyBiometricNoise(point) {
        let adjustedPoint = { ...point };
        
        // Hand tremor simulation
        if (this.profile.quirks.hasMouseTremor) {
            this.tremorPhase += 0.1 + Math.random() * 0.1;
            adjustedPoint.x += Math.sin(this.tremorPhase) * 0.5;
            adjustedPoint.y += Math.cos(this.tremorPhase * 1.3) * 0.3;
        }
        
        // Motor control variations
        const motorNoise = (1 - this.profile.motorControl) * 2;
        adjustedPoint.x += (Math.random() - 0.5) * motorNoise;
        adjustedPoint.y += (Math.random() - 0.5) * motorNoise;
        
        // Handedness bias (slight tendency to curve in one direction)
        const handednessBias = this.profile.handedness === 'left' ? -0.3 : 0.3;
        adjustedPoint.x += handednessBias * Math.random();
        
        return adjustedPoint;
    }
}

// Timing Obfuscator - Makes timing patterns appear natural
class TimingObfuscator {
    constructor() {
        this.lastTiming = 0;
        this.timingHistory = [];
    }
    
    obfuscateTiming(baseTiming) {
        // Avoid perfectly regular intervals
        let adjustedTiming = baseTiming;
        
        // Add natural variation
        adjustedTiming *= (0.7 + Math.random() * 0.6);
        
        // Avoid identical timings
        if (Math.abs(adjustedTiming - this.lastTiming) < 2) {
            adjustedTiming += 2 + Math.random() * 5;
        }
        
        // Occasional longer pauses (attention lapses)
        if (Math.random() < 0.02) {
            adjustedTiming += 50 + Math.random() * 200;
        }
        
        this.lastTiming = adjustedTiming;
        this.timingHistory.push(adjustedTiming);
        
        // Keep history limited
        if (this.timingHistory.length > 100) {
            this.timingHistory.shift();
        }
        
        return Math.max(1, adjustedTiming);
    }
}

// Anti-Detection Core - Advanced evasion techniques
class AntiDetectionCore {
    constructor() {
        this.detectionCounters = new Map();
    }
    
    // Implement additional anti-detection methods as needed
    maskAutomationSignatures() {
        // Hide common automation indicators
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined
        });
        
        // Mask automation frameworks
        delete window.chrome.runtime.onConnect;
        delete window.chrome.runtime.onMessage;
    }
}

// Export enhanced behavior simulator
window.EnhancedHumanBehavior = EnhancedHumanBehavior;

// Backward compatibility
window.HumanBehavior = EnhancedHumanBehavior;