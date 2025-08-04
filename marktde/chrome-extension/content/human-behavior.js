/*
 * Human Behavior Simulation - Makes automation appear natural and human-like
 * Implements realistic typing, clicking, and timing patterns
 */

// Prevent duplicate class declarations
if (typeof window.HumanBehavior === 'undefined') {

  window.HumanBehavior = class HumanBehavior {
    constructor() {
      this.config = {
        typing: {
          baseDelay: 100,        // Base delay between keystrokes (ms)
          variability: 50,       // Random variability in typing speed
          pauseChance: 0.1,      // Chance of pausing while typing
          pauseDuration: 300,    // Duration of typing pauses
          mistakeChance: 0.02,   // Chance of making a typing mistake
          correctionDelay: 200   // Delay before correcting mistakes
        },
        clicking: {
          baseDelay: 200,        // Base delay before clicking
          variability: 100,      // Random variability in click timing
          doubleClickChance: 0.01, // Chance of accidental double click
          missClickChance: 0.005   // Chance of slightly missing the target
        },
        mouse: {
          moveSpeed: 1000,       // Pixels per second for mouse movement
          curveIntensity: 0.3,   // How curved the mouse path should be
          overshootChance: 0.1,  // Chance of overshooting target
          overshootDistance: 10  // Pixels to overshoot by
        },
        delays: {
          minActionDelay: 500,   // Minimum delay between actions
          maxActionDelay: 2000,  // Maximum delay between actions
          minPageDelay: 1000,    // Minimum delay after page loads
          maxPageDelay: 3000,    // Maximum delay after page loads
          minScrollDelay: 200,   // Minimum delay between scroll actions
          maxScrollDelay: 800    // Maximum delay between scroll actions
        }
      };
    }

    // Generate random delay within a range
    randomDelay(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Generate delay with normal distribution (more human-like)
    normalDelay(mean, stdDev) {
      // Box-Muller transform for normal distribution
      let u = 0, v = 0;
      while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
      while (v === 0) v = Math.random();

      const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
      return Math.max(50, Math.floor(mean + stdDev * z));
    }

    // Sleep for specified duration
    async sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Get realistic typing delay
    getTypingDelay() {
      const base = this.config.typing.baseDelay;
      const variability = this.config.typing.variability;
      return this.normalDelay(base, variability);
    }

    // Get realistic action delay
    getActionDelay() {
      const min = this.config.delays.minActionDelay;
      const max = this.config.delays.maxActionDelay;
      return this.randomDelay(min, max);
    }

    // Get page load delay
    getPageDelay() {
      const min = this.config.delays.minPageDelay;
      const max = this.config.delays.maxPageDelay;
      return this.randomDelay(min, max);
    }

    // Simulate natural typing
    async typeNaturally(element, text, options = {}) {
      if (!element || !text) {
        throw new Error('Element and text are required for typing');
      }

      const config = { ...this.config.typing, ...options };

      try {
        // Focus the element first
        await this.clickNaturally(element);
        await this.sleep(this.randomDelay(100, 300));

        // Clear existing content if requested
        if (options.clearFirst !== false) {
          element.value = '';
          element.dispatchEvent(new Event('input', { bubbles: true }));
          await this.sleep(this.randomDelay(50, 150));
        }

        // Type character by character
        for (let i = 0; i < text.length; i++) {
          const char = text[i];

          // Random pause while typing
          if (Math.random() < config.pauseChance) {
            await this.sleep(config.pauseDuration + this.randomDelay(0, 200));
          }

          // Simulate typing mistake
          if (Math.random() < config.mistakeChance && i > 0) {
            // Type wrong character
            const wrongChar = String.fromCharCode(char.charCodeAt(0) + this.randomDelay(-2, 2));
            element.value += wrongChar;
            element.dispatchEvent(new Event('input', { bubbles: true }));

            await this.sleep(config.correctionDelay);

            // Correct the mistake
            element.value = element.value.slice(0, -1);
            element.dispatchEvent(new Event('input', { bubbles: true }));

            await this.sleep(this.getTypingDelay());
          }

          // Type the actual character
          element.value += char;
          element.dispatchEvent(new Event('input', { bubbles: true }));

          // Variable delay between characters
          const delay = this.getTypingDelay();
          await this.sleep(delay);
        }

        // Final events
        element.dispatchEvent(new Event('change', { bubbles: true }));

        return true;
      } catch (error) {
        console.error('Error in natural typing:', error);
        throw error;
      }
    }

    // Simulate natural clicking with mouse movement
    async clickNaturally(element, options = {}) {
      if (!element) {
        throw new Error('Element is required for clicking');
      }

      const config = { ...this.config.clicking, ...options };

      try {
        // Wait for element to be ready
        await this.waitForElementReady(element);

        // Pre-click delay
        const preDelay = this.normalDelay(config.baseDelay, config.variability);
        await this.sleep(preDelay);

        // Simulate mouse movement to element
        if (options.simulateMouseMovement !== false) {
          await this.simulateMouseMovement(element);
        }

        // Get element position for accurate clicking
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Add slight randomness to click position
        const offsetX = this.randomDelay(-5, 5);
        const offsetY = this.randomDelay(-5, 5);

        // Simulate mouse events in sequence
        const mouseEvents = ['mousedown', 'mouseup', 'click'];

        for (const eventType of mouseEvents) {
          const event = new MouseEvent(eventType, {
            bubbles: true,
            cancelable: true,
            clientX: centerX + offsetX,
            clientY: centerY + offsetY,
            button: 0
          });

          element.dispatchEvent(event);

          // Small delay between mouse events
          if (eventType !== 'click') {
            await this.sleep(this.randomDelay(10, 30));
          }
        }

        // Handle accidental double click
        if (Math.random() < config.doubleClickChance) {
          await this.sleep(this.randomDelay(50, 150));
          element.click();
        }

        // Post-click delay
        await this.sleep(this.randomDelay(100, 300));

        return true;
      } catch (error) {
        console.error('Error in natural clicking:', error);
        throw error;
      }
    }

    // Simulate realistic mouse movement to element
    async simulateMouseMovement(targetElement) {
      try {
        const rect = targetElement.getBoundingClientRect();
        const targetX = rect.left + rect.width / 2;
        const targetY = rect.top + rect.height / 2;

        // Get current mouse position (approximate)
        const currentX = window.innerWidth / 2;
        const currentY = window.innerHeight / 2;

        // Calculate movement path
        const distance = Math.sqrt(
          Math.pow(targetX - currentX, 2) + Math.pow(targetY - currentY, 2)
        );

        // Determine number of steps based on distance
        const steps = Math.max(5, Math.min(20, Math.floor(distance / 50)));
        const stepDelay = Math.max(10, Math.floor(distance / this.config.mouse.moveSpeed * 1000 / steps));

        // Create curved path
        for (let i = 0; i <= steps; i++) {
          const progress = i / steps;

          // Add curve to the movement
          const curve = Math.sin(progress * Math.PI) * this.config.mouse.curveIntensity;

          const x = currentX + (targetX - currentX) * progress + curve * this.randomDelay(-20, 20);
          const y = currentY + (targetY - currentY) * progress + curve * this.randomDelay(-20, 20);

          // Dispatch mouse move event
          const moveEvent = new MouseEvent('mousemove', {
            bubbles: true,
            clientX: x,
            clientY: y
          });

          document.dispatchEvent(moveEvent);

          if (i < steps) {
            await this.sleep(stepDelay);
          }
        }

        // Simulate overshoot and correction
        if (Math.random() < this.config.mouse.overshootChance) {
          const overshoot = this.config.mouse.overshootDistance;
          const overshootX = targetX + this.randomDelay(-overshoot, overshoot);
          const overshootY = targetY + this.randomDelay(-overshoot, overshoot);

          // Overshoot
          const overshootEvent = new MouseEvent('mousemove', {
            bubbles: true,
            clientX: overshootX,
            clientY: overshootY
          });
          document.dispatchEvent(overshootEvent);

          await this.sleep(this.randomDelay(50, 100));

          // Correct back to target
          const correctEvent = new MouseEvent('mousemove', {
            bubbles: true,
            clientX: targetX,
            clientY: targetY
          });
          document.dispatchEvent(correctEvent);
        }

        return true;
      } catch (error) {
        console.error('Error simulating mouse movement:', error);
        return false;
      }
    }

    // Wait for element to be ready for interaction
    async waitForElementReady(element, timeout = 5000) {
      const startTime = Date.now();

      while (Date.now() - startTime < timeout) {
        if (element &&
          element.offsetParent !== null && // Element is visible
          !element.disabled &&
          element.style.pointerEvents !== 'none') {
          return true;
        }

        await this.sleep(50);
      }

      throw new Error('Element not ready for interaction within timeout');
    }

    // Simulate natural scrolling
    async scrollNaturally(direction = 'down', distance = 300, options = {}) {
      const config = { ...this.config.delays, ...options };

      try {
        const scrollSteps = Math.max(3, Math.floor(distance / 100));
        const stepDistance = distance / scrollSteps;

        for (let i = 0; i < scrollSteps; i++) {
          const scrollAmount = direction === 'down' ? stepDistance : -stepDistance;

          window.scrollBy({
            top: scrollAmount,
            behavior: 'smooth'
          });

          const delay = this.randomDelay(config.minScrollDelay, config.maxScrollDelay);
          await this.sleep(delay);
        }

        return true;
      } catch (error) {
        console.error('Error in natural scrolling:', error);
        return false;
      }
    }

    // Simulate reading time based on content length
    calculateReadingTime(text, wordsPerMinute = 200) {
      if (!text) return 1000;

      const words = text.split(/\s+/).length;
      const readingTimeMs = (words / wordsPerMinute) * 60 * 1000;

      // Add randomness and ensure minimum time
      const minTime = 1000;
      const maxTime = 10000;

      return Math.max(minTime, Math.min(maxTime, readingTimeMs + this.randomDelay(-500, 1000)));
    }

    // Simulate human-like delays between actions
    async randomActionDelay() {
      const delay = this.getActionDelay();
      await this.sleep(delay);
    }

    // Simulate thinking/processing time
    async thinkingDelay(complexity = 'normal') {
      let baseTime;

      switch (complexity) {
        case 'simple':
          baseTime = 500;
          break;
        case 'normal':
          baseTime = 1500;
          break;
        case 'complex':
          baseTime = 3000;
          break;
        default:
          baseTime = 1500;
      }

      const delay = this.normalDelay(baseTime, baseTime * 0.3);
      await this.sleep(delay);
    }

    // Simulate network/loading wait time
    async waitForNetworkIdle(timeout = 10000) {
      const startTime = Date.now();
      let lastActivityTime = startTime;

      // Monitor network activity
      const observer = new PerformanceObserver((list) => {
        lastActivityTime = Date.now();
      });

      try {
        observer.observe({ entryTypes: ['navigation', 'resource'] });

        while (Date.now() - startTime < timeout) {
          // Consider network idle if no activity for 500ms
          if (Date.now() - lastActivityTime > 500) {
            break;
          }

          await this.sleep(100);
        }
      } finally {
        observer.disconnect();
      }

      // Add additional human-like delay
      await this.sleep(this.randomDelay(200, 800));
    }

    // Simulate form filling behavior
    async fillFormNaturally(formData, formElement) {
      if (!formElement || !formData) {
        throw new Error('Form element and data are required');
      }

      try {
        for (const [fieldName, value] of Object.entries(formData)) {
          // Find the field
          const field = formElement.querySelector(`[name="${fieldName}"], #${fieldName}`);

          if (!field) {
            console.warn(`Field not found: ${fieldName}`);
            continue;
          }

          // Simulate looking for the field
          await this.thinkingDelay('simple');

          // Focus and fill the field
          if (field.type === 'checkbox' || field.type === 'radio') {
            if (value) {
              await this.clickNaturally(field);
            }
          } else {
            await this.typeNaturally(field, value);
          }

          // Pause between fields
          await this.randomActionDelay();
        }

        return true;
      } catch (error) {
        console.error('Error filling form naturally:', error);
        throw error;
      }
    }

    // Get random user agent rotation (for future use)
    getRandomUserAgent() {
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
      ];

      return userAgents[Math.floor(Math.random() * userAgents.length)];
    }

    // Simulate human-like error recovery
    async handleError(error, retryAction, maxRetries = 3) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Simulate human confusion/thinking time
          await this.thinkingDelay('complex');

          // Try the action again
          const result = await retryAction();
          return result;
        } catch (retryError) {
          if (attempt === maxRetries) {
            throw retryError;
          }

          // Exponential backoff with human-like randomness
          const backoffTime = Math.pow(2, attempt) * 1000 + this.randomDelay(0, 1000);
          await this.sleep(backoffTime);
        }
      }
    }

    // Update configuration
    updateConfig(newConfig) {
      this.config = { ...this.config, ...newConfig };
    }

    // Get current configuration
    getConfig() {
      return { ...this.config };
    }
  }; // End of class definition

} // End of duplicate prevention check

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.HumanBehavior;
}

} // End of duplicate prevention check