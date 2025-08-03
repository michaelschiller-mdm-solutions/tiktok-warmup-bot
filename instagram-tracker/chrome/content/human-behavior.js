// Advanced Human Behavior Simulation Engine
// Implements sophisticated anti-detection patterns to mimic real human behavior
// Features: Realistic mouse movements, typing patterns, viewport interactions, and behavioral fingerprinting

class HumanBehaviorSimulator {
  constructor() {
    // Enhanced typing behavior with more realistic patterns
    this.typingBehavior = {
      baseSpeed: 85, // Base typing speed in ms
      speedVariation: 140, // Additional random variation (85-225ms total)
      errorRate: 0.08, // 8% chance of typos for more realism
      correctionDelay: { min: 200, max: 600 }, // Time to notice and fix errors
      pauseProbability: { micro: 0.15, hesitation: 0.08, thinking: 0.03 }, // Pause chances
      microPauseRange: { min: 80, max: 350 },
      hesitationRange: { min: 400, max: 1400 },
      thinkingRange: { min: 1500, max: 4000 }, // Longer pauses for "thinking"
      burstTyping: 0.12, // 12% chance of burst typing (faster sequences)
      fatigue: { enabled: true, threshold: 50, slowdown: 1.3 } // Typing gets slower over time
    };

    // Advanced mouse behavior with human-like imperfections
    this.mouseBehavior = {
      detourProbability: 0.4, // 40% chance for indirect routes
      hoverJitterProbability: 0.35, // 35% chance for hover movements
      idleMovementProbability: 0.25, // 25% chance during idle time
      speedRange: { min: 6, max: 28 }, // ms between movement points
      maxWaypoints: 5, // Maximum random waypoints for detours
      jitterRadius: 25, // ±25px for hover jitter
      curveIntensity: 0.4, // How curved the mouse paths are
      overshoot: { probability: 0.15, distance: { min: 5, max: 20 } }, // Mouse overshoot
      tremor: { enabled: true, intensity: 0.8, frequency: 0.1 }, // Slight hand tremor
      acceleration: { enabled: true, factor: 1.2 }, // Mouse acceleration
      momentum: { enabled: true, decay: 0.95 } // Mouse momentum
    };

    // Viewport and scroll behavior
    this.viewportBehavior = {
      naturalScrolling: true,
      scrollJitter: { min: -3, max: 3 }, // Slight scroll variations
      readingPauses: { enabled: true, duration: { min: 800, max: 2500 } },
      eyeTracking: { enabled: true, scanPattern: 'F-pattern' }, // Simulate eye movement
      focusShifts: { probability: 0.2, duration: { min: 300, max: 800 } }
    };

    // Behavioral fingerprinting resistance
    this.antiDetection = {
      clickVariation: { x: 8, y: 8 }, // ±8px click position variation
      timingJitter: { min: 0.9, max: 1.15 }, // 10-15% timing variation
      actionSequenceRandomization: true,
      humanErrors: { enabled: true, recovery: true },
      contextualBehavior: true, // Adapt behavior based on page context
      sessionConsistency: true, // Maintain consistent patterns within session
      biometricSimulation: { enabled: true, profile: 'adaptive' }
    };

    // State tracking
    this.currentMousePosition = { x: 0, y: 0 };
    this.lastMousePosition = { x: 0, y: 0 };
    this.mouseVelocity = { x: 0, y: 0 };
    this.isSimulating = false;
    this.sessionStartTime = Date.now();
    this.actionCount = 0;
    this.typingFatigue = 0;
    this.behaviorProfile = this.generateBehaviorProfile();
    
    // Initialize mouse tracking
    this.initializeMouseTracking();
  }

  // Generate a consistent behavior profile for the session
  generateBehaviorProfile() {
    return {
      typingSkill: 0.6 + Math.random() * 0.4, // 0.6-1.0 (affects speed and errors)
      mouseAccuracy: 0.7 + Math.random() * 0.3, // 0.7-1.0 (affects precision)
      patience: 0.5 + Math.random() * 0.5, // 0.5-1.0 (affects wait times)
      attention: 0.6 + Math.random() * 0.4, // 0.6-1.0 (affects focus duration)
      handedness: Math.random() > 0.9 ? 'left' : 'right', // 10% left-handed
      deviceType: this.detectDeviceType(),
      screenSize: { width: window.screen.width, height: window.screen.height },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  // Initialize mouse position tracking
  initializeMouseTracking() {
    // Track real mouse movements to blend with simulated ones
    document.addEventListener('mousemove', (e) => {
      if (!this.isSimulating) {
        this.currentMousePosition = { x: e.clientX, y: e.clientY };
      }
    });
    
    // Get initial mouse position
    this.currentMousePosition = {
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 100,
      y: window.innerHeight / 2 + (Math.random() - 0.5) * 100
    };
  }

  // Detect device type for behavior adaptation
  detectDeviceType() {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|ipad|tablet/.test(userAgent)) {
      return 'mobile';
    } else if (/mac/.test(userAgent)) {
      return 'mac';
    } else if (/win/.test(userAgent)) {
      return 'windows';
    } else if (/linux/.test(userAgent)) {
      return 'linux';
    }
    return 'unknown';
  }

  // Advanced mouse movement with Bezier curves and human-like imperfections
  async navigateToElement(element, options = {}) {
    if (!element) return;
    
    const rect = element.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2 + (Math.random() - 0.5) * this.antiDetection.clickVariation.x * 2;
    const targetY = rect.top + rect.height / 2 + (Math.random() - 0.5) * this.antiDetection.clickVariation.y * 2;
    
    await this.moveMouseToPosition(targetX, targetY, options);
    
    // Add small hover delay with micro-movements
    if (Math.random() < this.mouseBehavior.hoverJitterProbability) {
      await this.simulateHoverJitter(targetX, targetY);
    }
  }

  // Realistic mouse movement with Bezier curves
  async moveMouseToPosition(targetX, targetY, options = {}) {
    const startX = this.currentMousePosition.x;
    const startY = this.currentMousePosition.y;
    const distance = Math.sqrt((targetX - startX) ** 2 + (targetY - startY) ** 2);
    
    if (distance < 5) return; // Too close, no need to move
    
    // Generate control points for Bezier curve
    const controlPoints = this.generateBezierControlPoints(startX, startY, targetX, targetY);
    const path = this.generateBezierPath(startX, startY, controlPoints, targetX, targetY);
    
    // Calculate movement duration based on distance and behavior profile
    const baseDuration = Math.max(200, distance * 2);
    const duration = baseDuration * (0.8 + Math.random() * 0.4) * this.behaviorProfile.mouseAccuracy;
    
    const steps = Math.max(10, Math.floor(duration / 16)); // ~60fps
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const point = this.getBezierPoint(path, progress);
      
      // Add tremor and micro-adjustments
      if (this.mouseBehavior.tremor.enabled && Math.random() < this.mouseBehavior.tremor.frequency) {
        point.x += (Math.random() - 0.5) * this.mouseBehavior.tremor.intensity;
        point.y += (Math.random() - 0.5) * this.mouseBehavior.tremor.intensity;
      }
      
      // Update position and dispatch mouse event
      this.currentMousePosition = point;
      this.dispatchMouseEvent('mousemove', point.x, point.y);
      
      // Variable speed based on progress (slower at start/end)
      const speedMultiplier = this.getSpeedMultiplier(progress);
      const delay = (duration / steps) * speedMultiplier;
      
      await this.delay(delay);
    }
    
    // Handle overshoot
    if (Math.random() < this.mouseBehavior.overshoot.probability) {
      await this.simulateOvershoot(targetX, targetY);
    }
  }

  // Generate realistic Bezier control points
  generateBezierControlPoints(startX, startY, targetX, targetY) {
    const distance = Math.sqrt((targetX - startX) ** 2 + (targetY - startY) ** 2);
    const controlDistance = distance * this.mouseBehavior.curveIntensity;
    
    // Add randomness to control points
    const angle1 = Math.atan2(targetY - startY, targetX - startX) + (Math.random() - 0.5) * Math.PI / 3;
    const angle2 = Math.atan2(targetY - startY, targetX - startX) + (Math.random() - 0.5) * Math.PI / 3;
    
    return [
      {
        x: startX + Math.cos(angle1) * controlDistance * 0.3,
        y: startY + Math.sin(angle1) * controlDistance * 0.3
      },
      {
        x: targetX - Math.cos(angle2) * controlDistance * 0.3,
        y: targetY - Math.sin(angle2) * controlDistance * 0.3
      }
    ];
  }

  // Generate Bezier path points
  generateBezierPath(startX, startY, controlPoints, endX, endY) {
    return {
      start: { x: startX, y: startY },
      control1: controlPoints[0],
      control2: controlPoints[1],
      end: { x: endX, y: endY }
    };
  }

  // Get point on Bezier curve at given progress (0-1)
  getBezierPoint(path, t) {
    const { start, control1, control2, end } = path;
    const mt = 1 - t;
    
    return {
      x: mt ** 3 * start.x + 3 * mt ** 2 * t * control1.x + 3 * mt * t ** 2 * control2.x + t ** 3 * end.x,
      y: mt ** 3 * start.y + 3 * mt ** 2 * t * control1.y + 3 * mt * t ** 2 * control2.y + t ** 3 * end.y
    };
  }

  // Calculate speed multiplier for natural acceleration/deceleration
  getSpeedMultiplier(progress) {
    // Ease-in-out curve for natural movement
    if (progress < 0.5) {
      return 2 * progress * progress; // Accelerate
    } else {
      return 1 - 2 * (progress - 0.5) * (progress - 0.5); // Decelerate
    }
  }

  // Simulate mouse overshoot and correction
  async simulateOvershoot(targetX, targetY) {
    const overshootDistance = this.mouseBehavior.overshoot.distance.min + 
      Math.random() * (this.mouseBehavior.overshoot.distance.max - this.mouseBehavior.overshoot.distance.min);
    
    const angle = Math.random() * Math.PI * 2;
    const overshootX = targetX + Math.cos(angle) * overshootDistance;
    const overshootY = targetY + Math.sin(angle) * overshootDistance;
    
    // Quick overshoot
    await this.moveMouseToPosition(overshootX, overshootY, { fast: true });
    await this.delay(50 + Math.random() * 100);
    
    // Correction back to target
    await this.moveMouseToPosition(targetX, targetY, { precise: true });
  }

  // Simulate hover jitter (small movements while hovering)
  async simulateHoverJitter(centerX, centerY) {
    const jitterCount = 2 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < jitterCount; i++) {
      const jitterX = centerX + (Math.random() - 0.5) * this.mouseBehavior.jitterRadius;
      const jitterY = centerY + (Math.random() - 0.5) * this.mouseBehavior.jitterRadius;
      
      this.currentMousePosition = { x: jitterX, y: jitterY };
      this.dispatchMouseEvent('mousemove', jitterX, jitterY);
      
      await this.delay(50 + Math.random() * 150);
    }
  }

  // Dispatch mouse events with proper coordinates
  dispatchMouseEvent(type, x, y) {
    const event = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      screenX: x + window.screenX,
      screenY: y + window.screenY
    });
    
    const elementAtPoint = document.elementFromPoint(x, y);
    if (elementAtPoint) {
      elementAtPoint.dispatchEvent(event);
    }
  }

  // Enhanced typing simulation with realistic patterns
  async simulateTyping(text, element) {
    if (!element || !text) return;
    
    this.isSimulating = true;
    element.focus();
    
    // Clear existing content with realistic selection and deletion
    if (element.value.length > 0) {
      await this.selectAllAndDelete(element);
    }
    
    const typingSequence = this.generateRealisticTyping(text);
    
    for (const action of typingSequence) {
      if (!this.isSimulating) break;
      
      if (action.type === 'char') {
        element.value += action.char;
        element.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (action.type === 'backspace') {
        element.value = element.value.slice(0, -1);
        element.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (action.type === 'pause') {
        // Just wait, no action
      }
      
      await this.delay(action.delay);
    }
    
    this.isSimulating = false;
  }

  // Generate realistic typing sequence with errors and corrections
  generateRealisticTyping(text) {
    const sequence = [];
    const baseSpeed = this.typingBehavior.baseSpeed;
    const speedVariation = this.typingBehavior.speedVariation;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const charDelay = baseSpeed + Math.random() * speedVariation;
      
      // Occasional typos (5% chance for usernames)
      if (Math.random() < this.typingBehavior.errorRate) {
        const wrongChar = this.getRandomWrongChar(char);
        
        // Type wrong character
        sequence.push({
          type: 'char',
          char: wrongChar,
          delay: charDelay
        });
        
        // Correction delay (time to notice error)
        const correctionDelay = this.typingBehavior.correctionDelay.min + 
          Math.random() * (this.typingBehavior.correctionDelay.max - this.typingBehavior.correctionDelay.min);
        
        // Backspace to correct
        sequence.push({
          type: 'backspace',
          delay: correctionDelay
        });
        
        // Type correct character (slower after correction)
        sequence.push({
          type: 'char',
          char: char,
          delay: charDelay * 1.3
        });
      } else {
        // Normal character typing
        sequence.push({
          type: 'char',
          char: char,
          delay: charDelay
        });
      }
      
      // Random micro-pauses during typing (10% chance)
      if (Math.random() < this.typingBehavior.pauseProbability.micro) {
        const pauseDelay = this.typingBehavior.microPauseRange.min + 
          Math.random() * (this.typingBehavior.microPauseRange.max - this.typingBehavior.microPauseRange.min);
        
        sequence.push({
          type: 'pause',
          delay: pauseDelay
        });
      }
      
      // Longer hesitation pauses (5% chance)
      if (Math.random() < this.typingBehavior.pauseProbability.hesitation) {
        const hesitationDelay = this.typingBehavior.hesitationRange.min + 
          Math.random() * (this.typingBehavior.hesitationRange.max - this.typingBehavior.hesitationRange.min);
        
        sequence.push({
          type: 'pause',
          delay: hesitationDelay
        });
      }
    }
    
    return sequence;
  }

  // Get common typo for a character based on keyboard layout
  getRandomWrongChar(correctChar) {
    const typoMap = {
      'a': ['s', 'q', 'w', 'z'],
      'b': ['v', 'g', 'h', 'n'],
      'c': ['x', 'd', 'f', 'v'],
      'd': ['s', 'f', 'e', 'r', 'c'],
      'e': ['r', 'w', 'd', 's'],
      'f': ['d', 'g', 'r', 't', 'c', 'v'],
      'g': ['f', 'h', 't', 'y', 'v', 'b'],
      'h': ['g', 'j', 'y', 'u', 'b', 'n'],
      'i': ['o', 'u', 'k', 'j'],
      'j': ['h', 'k', 'u', 'i', 'n', 'm'],
      'k': ['j', 'l', 'i', 'o', 'm'],
      'l': ['k', 'o', 'p'],
      'm': ['n', 'j', 'k'],
      'n': ['b', 'm', 'h', 'j'],
      'o': ['p', 'i', 'l', 'k'],
      'p': ['o', 'l'],
      'q': ['w', 'a', 's'],
      'r': ['e', 't', 'd', 'f'],
      's': ['a', 'd', 'w', 'e', 'z', 'x'],
      't': ['r', 'y', 'f', 'g'],
      'u': ['y', 'i', 'j', 'h'],
      'v': ['c', 'b', 'f', 'g'],
      'w': ['q', 'e', 'a', 's'],
      'x': ['z', 'c', 's', 'd'],
      'y': ['t', 'u', 'g', 'h'],
      'z': ['a', 's', 'x']
    };
    
    const possibleTypos = typoMap[correctChar.toLowerCase()];
    if (possibleTypos && possibleTypos.length > 0) {
      return possibleTypos[Math.floor(Math.random() * possibleTypos.length)];
    }
    
    // Fallback: random adjacent character
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    return alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  // Advanced mouse movement simulation
  async navigateToElement(targetElement) {
    if (!targetElement) return;
    
    const targetRect = targetElement.getBoundingClientRect();
    const targetPos = this.getRandomPointInElement(targetRect);
    
    // 30% chance to take a detour route
    if (Math.random() < this.mouseBehavior.detourProbability) {
      await this.executeDetourMovement(this.currentMousePosition, targetPos);
    } else {
      await this.executeDirectMovement(this.currentMousePosition, targetPos);
    }
    
    // Random hover time before clicking
    await this.delay(100 + Math.random() * 700);
    
    // 20% chance for random movement during hover
    if (Math.random() < this.mouseBehavior.hoverJitterProbability) {
      await this.simulateHoverJitter(targetPos);
    }
    
    // Update current position
    this.currentMousePosition = targetPos;
  }

  // Execute detour movement with random waypoints
  async executeDetourMovement(start, end) {
    const numWaypoints = 1 + Math.floor(Math.random() * this.mouseBehavior.maxWaypoints);
    const waypoints = [];
    
    for (let i = 0; i < numWaypoints; i++) {
      waypoints.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight
      });
    }
    
    // Move through waypoints
    let currentPos = start;
    for (const waypoint of waypoints) {
      const path = this.generateNaturalPath(currentPos, waypoint);
      await this.executeMousePath(path, this.getRandomSpeed());
      
      // Random hover at waypoint
      await this.delay(50 + Math.random() * 250);
      currentPos = waypoint;
    }
    
    // Final movement to target
    const finalPath = this.generateNaturalPath(currentPos, end);
    await this.executeMousePath(finalPath, this.getRandomSpeed());
  }

  // Execute direct movement with natural curves
  async executeDirectMovement(start, end) {
    const path = this.generateNaturalPath(start, end);
    await this.executeMousePath(path, this.getRandomSpeed());
  }

  // Generate natural curved path between two points
  generateNaturalPath(start, end) {
    const distance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
    const numPoints = Math.max(10, Math.floor(distance / 20));
    
    // Generate control points for natural curve
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    
    // Add randomness to curve
    const curveOffset = (Math.random() - 0.5) * Math.min(200, distance * this.mouseBehavior.curveIntensity);
    const controlPoint = {
      x: midX + curveOffset,
      y: midY + (Math.random() - 0.5) * Math.min(150, distance * 0.2)
    };
    
    const path = [];
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const point = this.quadraticBezier(start, controlPoint, end, t);
      
      // Add micro-jitter to each point
      point.x += (Math.random() - 0.5) * 4;
      point.y += (Math.random() - 0.5) * 4;
      
      path.push(point);
    }
    
    return path;
  }

  // Execute mouse path with variable speed
  async executeMousePath(path, baseSpeed) {
    for (let i = 0; i < path.length; i++) {
      const point = path[i];
      
      // Variable speed - slower at start/end, faster in middle
      const speedMultiplier = this.getSpeedMultiplier(i, path.length);
      const delay = baseSpeed * speedMultiplier + (Math.random() - 0.5) * 5;
      
      // Simulate mouse movement (visual feedback only)
      this.setMousePosition(point);
      
      // Random micro-pauses during movement (5% chance)
      if (Math.random() < 0.05) {
        await this.delay(10 + Math.random() * 40);
      }
      
      await this.delay(Math.max(1, delay));
    }
  }

  // Get random speed for mouse movement
  getRandomSpeed() {
    return this.mouseBehavior.speedRange.min + 
      Math.random() * (this.mouseBehavior.speedRange.max - this.mouseBehavior.speedRange.min);
  }

  // Get speed multiplier based on position in path
  getSpeedMultiplier(index, totalPoints) {
    const progress = index / totalPoints;
    // Slower at start and end, faster in middle
    return 0.5 + 0.5 * Math.sin(progress * Math.PI);
  }

  // Simulate hover jitter
  async simulateHoverJitter(centerPoint) {
    const jitterMoves = 2 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < jitterMoves; i++) {
      const jitterPoint = {
        x: centerPoint.x + (Math.random() - 0.5) * this.mouseBehavior.jitterRadius,
        y: centerPoint.y + (Math.random() - 0.5) * this.mouseBehavior.jitterRadius
      };
      
      this.setMousePosition(jitterPoint);
      await this.delay(50 + Math.random() * 150);
    }
    
    // Return to center
    this.setMousePosition(centerPoint);
  }

  // Get random point within element bounds
  getRandomPointInElement(rect) {
    const padding = 5;
    return {
      x: rect.left + padding + Math.random() * (rect.width - padding * 2),
      y: rect.top + padding + Math.random() * (rect.height - padding * 2)
    };
  }

  // Quadratic Bezier curve calculation
  quadraticBezier(p0, p1, p2, t) {
    const x = Math.pow(1 - t, 2) * p0.x + 2 * (1 - t) * t * p1.x + Math.pow(t, 2) * p2.x;
    const y = Math.pow(1 - t, 2) * p0.y + 2 * (1 - t) * t * p1.y + Math.pow(t, 2) * p2.y;
    return { x, y };
  }

  // Set mouse position (visual feedback)
  setMousePosition(point) {
    this.currentMousePosition = point;
    // Create visual cursor for debugging (optional)
    this.updateVisualCursor(point);
  }

  // Update visual cursor for debugging
  updateVisualCursor(point) {
    let cursor = document.getElementById('automation-cursor');
    if (!cursor) {
      cursor = document.createElement('div');
      cursor.id = 'automation-cursor';
      cursor.style.cssText = `
        position: fixed;
        width: 10px;
        height: 10px;
        background: red;
        border-radius: 50%;
        pointer-events: none;
        z-index: 10000;
        display: none;
      `;
      document.body.appendChild(cursor);
    }
    
    cursor.style.left = point.x + 'px';
    cursor.style.top = point.y + 'px';
  }

  // Random unpredictable movements during idle time
  async simulateIdleMovements() {
    if (Math.random() < this.mouseBehavior.idleMovementProbability) {
      const randomPoint = {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight
      };
      
      const path = this.generateNaturalPath(this.currentMousePosition, randomPoint);
      await this.executeMousePath(path, this.getRandomSpeed());
      
      // Hover at random location
      await this.delay(200 + Math.random() * 800);
    }
  }

  // Generate random delay with natural variation
  async generateRandomDelay(min, max) {
    const delay = min + Math.random() * (max - min);
    await this.delay(delay);
  }

  // Utility delay function
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Stop all simulations
  stopSimulation() {
    this.isSimulating = false;
  }
}

// Export for use in other modules
window.HumanBehaviorSimulator = HumanBehaviorSimulator;

// ES Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HumanBehaviorSimulator;
}