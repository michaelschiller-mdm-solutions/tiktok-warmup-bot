/*
 * Markt.de Interface - Handles all markt.de specific DOM interactions
 * Manages login, cookie consent, navigation, and DM functionality
 */

// Prevent duplicate class declarations
if (typeof window.MarktInterface === 'undefined') {

window.MarktInterface = class MarktInterface {
  constructor(humanBehavior, logger) {
    this.humanBehavior = humanBehavior;
    this.logger = logger;
    this.isLoggedIn = false;
    this.sessionCookies = null;
    
    // Markt.de specific selectors
    this.selectors = {
      login: {
        emailInput: '#clsy-login-username',
        passwordInput: '#clsy-login-password',
        rememberMeCheckbox: '#clsy-login-rememberme',
        loginButton: 'button.clsy-c-btn.clsy-c-btn--cta[type="submit"]',
        loginButtonAlt: 'button[type="submit"]:contains("Anmelden")',
        loginForm: '.clsy-login-form, form[action*="login"], form:has(#clsy-login-username)',
        errorMessage: '.clsy-login-error, .error-message, .clsy-c-form__error'
      },
      dm: {
        dmButton: '.clsy-profile__toolbar-open-contact-dialog.clsy-c-pwa-toolbar__action.clsy-c-btn.clsy-c-btn--icon',
        dmButtonAlt: 'a[href="#"].clsy-profile__toolbar-open-contact-dialog',
        dmDialog: '.clsy-c-contactPopup, .contact-popup',
        dmTextarea: '#clsy-c-contactPopup-message',
        dmTextareaAlt: 'textarea.clsy-c-form__smartLabeledField[name="message"]',
        sendButton: '.clsy-c-contactPopup-submit.clsy-c-btn.clsy-c-btn--cta.clsy-c-prevent-double-click',
        sendButtonAlt: 'button.clsy-c-contactPopup-submit[type="button"]',
        closeButton: '.clsy-c-contactPopup-close, .close-button',
        successMessage: '.success-message, .message-sent'
      },
      cookieConsent: [
        'div[role="button"].cmp_button.cmp_button_bg.cmp_button_font_color.cmp-button-accept-all',
        'div.cmp-button-accept-all[role="button"]',
        '.cmp-button-accept-all',
        'div[role="button"]:has-text("AKZEPTIEREN UND WEITER")',
        '[class*="cmp-button-accept-all"]',
        'button:has-text("Akzeptieren")',
        'button:has-text("AKZEPTIEREN UND WEITER")',
        '.cmp-root-container button[role="button"]'
      ],
      navigation: {
        profileLink: 'a[href*="/profil/"]',
        homeLink: 'a[href="/"]',
        logoutLink: 'a[href*="logout"]'
      },
      general: {
        loadingIndicator: '.loading, .spinner',
        errorDialog: '.error-dialog, .alert-error'
      }
    };

    // Configuration
    this.config = {
      loginUrl: 'https://www.markt.de/nichtangemeldet.htm',
      timeouts: {
        elementWait: 10000,
        pageLoad: 30000,
        dmSend: 15000,
        login: 30000
      },
      retries: {
        elementFind: 3,
        login: 2,
        dmSend: 3
      }
    };
  }

  // Initialize the interface
  async initialize() {
    try {
      this.logger.info('Initializing Markt.de interface');
      
      // Check if we're on markt.de
      if (!window.location.hostname.includes('markt.de')) {
        throw new Error('Not on markt.de domain');
      }

      // Handle cookie consent if present
      await this.handleCookieConsent();
      
      // Check current login status
      await this.checkLoginStatus();
      
      this.logger.success('Markt.de interface initialized');
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize Markt.de interface', error);
      throw error;
    }
  }

  // Handle cookie consent dialog
  async handleCookieConsent() {
    this.logger.info('Checking for cookie consent dialog');
    
    try {
      // Wait a moment for the dialog to appear
      await this.humanBehavior.sleep(1500);
      
      // Try each cookie consent selector
      for (const selector of this.selectors.cookieConsent) {
        try {
          const element = await this.waitForElement(selector, 2000);
          if (element && await this.isElementVisible(element)) {
            this.logger.info(`Found cookie consent button: ${selector}`);
            
            await this.humanBehavior.clickNaturally(element);
            await this.humanBehavior.sleep(1000);
            
            this.logger.success('Cookie consent accepted');
            return true;
          }
        } catch (error) {
          // Continue to next selector
          continue;
        }
      }
      
      this.logger.info('No cookie consent dialog found or already accepted');
      return true;
    } catch (error) {
      this.logger.warning('Error handling cookie consent', error);
      return false;
    }
  }

  // Check current login status
  async checkLoginStatus() {
    try {
      // Look for login form (indicates not logged in)
      const loginForm = document.querySelector(this.selectors.login.loginForm);
      if (loginForm && await this.isElementVisible(loginForm)) {
        this.isLoggedIn = false;
        this.logger.info('User is not logged in');
        return false;
      }

      // Look for profile/logout links (indicates logged in)
      const profileLink = document.querySelector(this.selectors.navigation.profileLink);
      const logoutLink = document.querySelector(this.selectors.navigation.logoutLink);
      
      if (profileLink || logoutLink) {
        this.isLoggedIn = true;
        this.sessionCookies = await this.getSessionCookies();
        this.logger.success('User is logged in');
        return true;
      }

      // Default to not logged in
      this.isLoggedIn = false;
      return false;
    } catch (error) {
      this.logger.error('Error checking login status', error);
      this.isLoggedIn = false;
      return false;
    }
  }

  // Perform login
  async login(email, password) {
    this.logger.info('Starting login process');
    
    try {
      // Navigate to login page if not already there
      if (!window.location.href.includes('nichtangemeldet.htm')) {
        this.logger.info('Navigating to login page');
        window.location.href = this.config.loginUrl;
        await this.waitForPageLoad();
      }

      // Wait for page to fully load
      await this.humanBehavior.sleep(3000);

      // Handle cookie consent first
      await this.handleCookieConsent();

      // Wait additional time for form to be ready
      await this.humanBehavior.sleep(2000);

      // Wait for login form elements with longer timeout
      this.logger.info('Waiting for login form elements');
      const emailInput = await this.waitForElement(this.selectors.login.emailInput, 15000);
      const passwordInput = await this.waitForElement(this.selectors.login.passwordInput, 15000);
      
      // Try to find login button with multiple selectors
      let loginButton;
      try {
        loginButton = await this.waitForElement(this.selectors.login.loginButton, 5000);
      } catch (e) {
        this.logger.info('Primary login button not found, trying alternative');
        loginButton = await this.waitForElement(this.selectors.login.loginButtonAlt, 5000);
      }

      // Clear fields first
      this.logger.info('Clearing and filling email field');
      await emailInput.focus();
      await this.humanBehavior.sleep(500);
      emailInput.value = '';
      await this.humanBehavior.typeNaturally(emailInput, email);
      await this.humanBehavior.sleep(1000);

      // Clear and fill password field
      this.logger.info('Clearing and filling password field');
      await passwordInput.focus();
      await this.humanBehavior.sleep(500);
      passwordInput.value = '';
      await this.humanBehavior.typeNaturally(passwordInput, password);
      await this.humanBehavior.sleep(1000);

      // Check "remember me" if available
      const rememberMeCheckbox = document.querySelector(this.selectors.login.rememberMeCheckbox);
      if (rememberMeCheckbox && !rememberMeCheckbox.checked) {
        this.logger.info('Checking remember me option');
        await this.humanBehavior.clickNaturally(rememberMeCheckbox);
        await this.humanBehavior.sleep(1000);
      }

      // Click login button
      this.logger.info('Clicking login button');
      await this.humanBehavior.clickNaturally(loginButton);

      // Wait for login to complete with longer timeout
      await this.waitForLoginComplete(45000);

      // Additional wait for page to settle
      await this.humanBehavior.sleep(3000);

      // Verify login success
      const loginSuccess = await this.checkLoginStatus();
      if (!loginSuccess) {
        // Check for error messages
        const errorElement = document.querySelector(this.selectors.login.errorMessage);
        const errorMessage = errorElement ? errorElement.textContent.trim() : 'Unknown login error';
        throw new Error(`Login failed: ${errorMessage}`);
      }

      this.logger.success('Login successful');
      return true;
    } catch (error) {
      this.logger.error('Login failed', error);
      throw error;
    }
  }

  // Wait for login to complete
  async waitForLoginComplete(timeout = 45000) {
    const startTime = Date.now();
    this.logger.info('Waiting for login to complete...');
    
    while (Date.now() - startTime < timeout) {
      // Check if URL changed (successful login usually redirects)
      if (!window.location.href.includes('nichtangemeldet.htm')) {
        this.logger.info('Login successful - URL changed');
        await this.humanBehavior.sleep(2000);
        return true;
      }
      
      // Check if login form disappeared
      const loginForm = document.querySelector(this.selectors.login.loginForm);
      if (!loginForm || !await this.isElementVisible(loginForm)) {
        this.logger.info('Login successful - form disappeared');
        await this.humanBehavior.sleep(2000);
        return true;
      }
      
      // Check for error messages
      const errorSelectors = [
        this.selectors.login.errorMessage,
        '.clsy-c-form__error',
        '.alert-error',
        '.error'
      ];
      
      for (const selector of errorSelectors) {
        const errorElement = document.querySelector(selector);
        if (errorElement && await this.isElementVisible(errorElement)) {
          const errorText = errorElement.textContent.trim();
          if (errorText.length > 0) {
            throw new Error(`Login error: ${errorText}`);
          }
        }
      }
      
      // Check if we're still on login page but form is processing
      const submitButton = document.querySelector(this.selectors.login.loginButton);
      if (submitButton && (submitButton.disabled || submitButton.classList.contains('loading'))) {
        this.logger.info('Login form is processing...');
      }
      
      await this.humanBehavior.sleep(1000);
    }
    
    throw new Error('Login timeout - page did not respond within expected time');
  }

  // Navigate to profile page
  async navigateToProfile(profileUrl) {
    this.logger.info(`Navigating to profile: ${profileUrl}`);
    
    try {
      // Validate URL
      if (!profileUrl || !profileUrl.includes('markt.de')) {
        throw new Error('Invalid profile URL');
      }

      // Navigate to the profile
      window.location.href = profileUrl;
      await this.waitForPageLoad();
      
      // Handle any popups that might appear
      await this.handleCookieConsent();
      
      this.logger.success('Successfully navigated to profile');
      return true;
    } catch (error) {
      this.logger.error('Failed to navigate to profile', error);
      throw error;
    }
  }

  // Open DM dialog
  async openDMDialog() {
    this.logger.info('Opening DM dialog');
    
    try {
      // Try primary DM button selector
      let dmButton = await this.waitForElement(this.selectors.dm.dmButton, 5000);
      
      // Try alternative selector if primary not found
      if (!dmButton) {
        dmButton = await this.waitForElement(this.selectors.dm.dmButtonAlt, 5000);
      }
      
      if (!dmButton) {
        throw new Error('DM button not found on profile page');
      }

      // Click the DM button
      await this.humanBehavior.clickNaturally(dmButton);
      
      // Wait for dialog to appear
      const dmDialog = await this.waitForElement(this.selectors.dm.dmDialog, 10000);
      if (!dmDialog) {
        throw new Error('DM dialog did not appear');
      }

      this.logger.success('DM dialog opened');
      return true;
    } catch (error) {
      this.logger.error('Failed to open DM dialog', error);
      throw error;
    }
  }

  // Send message
  async sendMessage(message) {
    this.logger.info('Sending DM message');
    
    try {
      // Find textarea
      let textarea = document.querySelector(this.selectors.dm.dmTextarea);
      if (!textarea) {
        textarea = document.querySelector(this.selectors.dm.dmTextareaAlt);
      }
      
      if (!textarea) {
        throw new Error('Message textarea not found');
      }

      // Type the message
      await this.humanBehavior.typeNaturally(textarea, message);
      await this.humanBehavior.randomActionDelay();

      // Find and click send button
      let sendButton = document.querySelector(this.selectors.dm.sendButton);
      if (!sendButton) {
        sendButton = document.querySelector(this.selectors.dm.sendButtonAlt);
      }
      
      if (!sendButton) {
        throw new Error('Send button not found');
      }

      // Click send button
      await this.humanBehavior.clickNaturally(sendButton);
      
      // Wait for message to be sent
      await this.waitForMessageSent();
      
      this.logger.success('Message sent successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to send message', error);
      throw error;
    }
  }

  // Wait for message to be sent
  async waitForMessageSent(timeout = 15000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      // Check for success message
      const successMessage = document.querySelector(this.selectors.dm.successMessage);
      if (successMessage && await this.isElementVisible(successMessage)) {
        return true;
      }
      
      // Check if dialog closed (another indication of success)
      const dmDialog = document.querySelector(this.selectors.dm.dmDialog);
      if (!dmDialog || !await this.isElementVisible(dmDialog)) {
        await this.humanBehavior.sleep(1000); // Wait a bit more to be sure
        return true;
      }
      
      await this.humanBehavior.sleep(500);
    }
    
    throw new Error('Message send timeout - no confirmation received');
  }

  // Close DM dialog
  async closeDMDialog() {
    try {
      const closeButton = document.querySelector(this.selectors.dm.closeButton);
      if (closeButton && await this.isElementVisible(closeButton)) {
        await this.humanBehavior.clickNaturally(closeButton);
        await this.humanBehavior.sleep(500);
      }
      return true;
    } catch (error) {
      this.logger.warning('Could not close DM dialog', error);
      return false;
    }
  }

  // Get session cookies
  async getSessionCookies() {
    try {
      const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [name, value] = cookie.trim().split('=');
        acc[name] = value;
        return acc;
      }, {});

      // Extract relevant session cookies
      const sessionCookies = {};
      const relevantCookies = ['__ssid', '__rtbh.lid', '__spdt'];
      
      for (const cookieName of relevantCookies) {
        if (cookies[cookieName]) {
          sessionCookies[cookieName] = cookies[cookieName];
        }
      }

      this.sessionCookies = sessionCookies;
      this.logger.info(`Found ${Object.keys(sessionCookies).length} session cookies`);
      
      return sessionCookies;
    } catch (error) {
      this.logger.error('Error getting session cookies', error);
      return {};
    }
  }

  // Utility: Wait for element to appear
  async waitForElement(selector, timeout = 10000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
      
      await this.humanBehavior.sleep(100);
    }
    
    throw new Error(`Element not found: ${selector} (timeout: ${timeout}ms)`);
  }

  // Utility: Check if element is visible
  async isElementVisible(element) {
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== 'hidden' &&
      style.display !== 'none' &&
      style.opacity !== '0'
    );
  }

  // Utility: Wait for page to load
  async waitForPageLoad(timeout = 30000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkLoad = () => {
        if (document.readyState === 'complete') {
          // Additional wait for dynamic content
          setTimeout(resolve, 1000);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Page load timeout'));
        } else {
          setTimeout(checkLoad, 100);
        }
      };
      
      checkLoad();
    });
  }

  // Utility: Wait for network idle
  async waitForNetworkIdle(timeout = 10000) {
    await this.humanBehavior.waitForNetworkIdle(timeout);
  }

  // Check if currently on a profile page
  isOnProfilePage() {
    return window.location.pathname.includes('/profil/') || 
           document.querySelector(this.selectors.dm.dmButton) !== null;
  }

  // Check if DM functionality is available
  isDMAvailable() {
    const dmButton = document.querySelector(this.selectors.dm.dmButton) || 
                    document.querySelector(this.selectors.dm.dmButtonAlt);
    return dmButton !== null;
  }

  // Get current page type
  getCurrentPageType() {
    const url = window.location.href;
    const pathname = window.location.pathname;
    
    if (url.includes('nichtangemeldet.htm')) return 'login';
    if (pathname.includes('/profil/')) return 'profile';
    if (pathname === '/' || pathname === '') return 'home';
    
    return 'other';
  }

  // Validate session
  async validateSession() {
    try {
      // Check if we're still logged in
      const isValid = await this.checkLoginStatus();
      
      if (!isValid) {
        this.logger.warning('Session appears to be invalid');
        this.isLoggedIn = false;
        this.sessionCookies = null;
      }
      
      return isValid;
    } catch (error) {
      this.logger.error('Error validating session', error);
      return false;
    }
  }

  // Get interface status
  getStatus() {
    return {
      isLoggedIn: this.isLoggedIn,
      sessionCookies: this.sessionCookies,
      currentPage: this.getCurrentPageType(),
      isDMAvailable: this.isDMAvailable(),
      isOnProfilePage: this.isOnProfilePage()
    };
  }

  // Cleanup
  cleanup() {
    this.isLoggedIn = false;
    this.sessionCookies = null;
    this.logger.info('Markt.de interface cleaned up');
  }
}; // End of class definition

} // End of duplicate prevention check

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.MarktInterface;
}

} // End of duplicate prevention check