// Instagram DOM Interface Layer
// Handles all Instagram-specific DOM interactions with robust selector management
// and fallback mechanisms for layout changes

class InstagramInterface {
  constructor(humanBehavior) {
    this.humanBehavior = humanBehavior;
    this.selectors = {
      // Search elements - Updated with working selectors for current Instagram interface
      searchButton: [
        // Primary selector based on test results - this is the exact working selector
        'a[href="#"] svg[aria-label="Search"]', // BEST: Recommended by test
        // Backup selectors in order of preference
        'a[href="#"] img[alt="Search"]', // Image-based version
        'a:contains("Search"):not(:contains("Explore"))', // Text-based with exclusion
        'link:contains("Search"):not(:contains("Explore"))', // Link with Search text
        // More specific selectors
        'a[href="#"]:has(svg[aria-label="Search"])', // Has SVG with Search label
        'a[href="#"]:has(img[alt="Search"])', // Has IMG with Search alt
        // SVG-only selectors (will need parent element)
        'svg[aria-label="Search"]:not([aria-label*="Explore"])',
        // Fallback selectors
        'a[role="link"] svg[aria-label="Search"]',
        'a[role="link"] img[alt="Search"]',
        '[data-testid="search-icon"]'
      ],
      searchInput: [
        // Modern Instagram search input selectors
        'input[placeholder*="Search"]',
        'input[aria-label*="Search"]',
        'input[type="text"][placeholder*="Search"]',
        'textbox[placeholder*="Search"]',
        'textbox[aria-label*="Search"]',
        // Legacy selectors
        'textbox[placeholder="Search input"]',
        'input[placeholder="Search input"]'
      ],
      searchResults: [
        'link[href*="/"][role="link"]',
        'a[href*="/"]',
        'dialog a[href*="/"]'
      ],
      
      // Profile elements - Updated with actual selectors
      followButton: [
        'button:contains("Follow")',
        'button[type="button"]:contains("Follow")',
        'div[role="button"]:contains("Follow")',
        'button:not(:contains("Following")):not(:contains("Message")):not(:contains("Options"))'
      ],
      unfollowButton: [
        'button:contains("Following")',
        'button[type="button"]:contains("Following")',
        'div[role="button"]:contains("Following")',
        'button:has(text("Following"))'
      ],
      confirmUnfollowButton: [
        'button:contains("Unfollow")',
        'button[type="button"]:contains("Unfollow")',
        '[role="button"]:contains("Unfollow")'
      ],
      
      // Profile info
      profileHeader: [
        'header section',
        '[data-testid="profile-header"]',
        '.x1n2onr6 header'
      ],
      username: [
        'h2',
        '[data-testid="username"]',
        'header h1',
        'header h2'
      ],
      
      // Navigation
      profileLink: [
        'a[role="link"]',
        'a[href*="/"]'
      ],
      
      // Error detection
      errorMessages: [
        '[role="alert"]',
        '.error-message',
        '[data-testid="error"]',
        'div:contains("Sorry")',
        'div:contains("Error")',
        'div:contains("Try again")'
      ],
      
      // Rate limit detection
      rateLimitIndicators: [
        'div:contains("Action Blocked")',
        'div:contains("Try Again Later")',
        'div:contains("We restrict")',
        'div:contains("temporarily blocked")',
        '[data-testid="challenge"]'
      ]
    };
    
    this.currentUrl = '';
    this.lastActionTime = 0;
    this.actionCount = 0;
  }

  // Initialize interface and check Instagram page
  async initialize() {
    this.currentUrl = window.location.href;
    
    if (!this.isInstagramPage()) {
      throw new Error('Not on Instagram page');
    }
    
    // Wait for page to load
    await this.waitForPageLoad();
    
    console.log('Instagram interface initialized');
    return true;
  }

  // Check if current page is Instagram
  isInstagramPage() {
    return window.location.hostname.includes('instagram.com');
  }

  // Wait for page to fully load
  async waitForPageLoad() {
    return new Promise((resolve) => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        window.addEventListener('load', resolve);
      }
    });
  }

  // Find element using multiple selectors with fallbacks
  findElement(selectorArray, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkElement = () => {
        for (const selector of selectorArray) {
          let element;
          
          // Handle text-based selectors
          if (selector.includes(':contains(') || selector.includes(':has-text(')) {
            element = this.findElementByText(selector);
          } else {
            element = document.querySelector(selector);
          }
          
          if (element && this.isElementVisible(element)) {
            resolve(element);
            return;
          }
        }
        
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Element not found after ${timeout}ms. Selectors: ${selectorArray.join(', ')}`));
        } else {
          setTimeout(checkElement, 100);
        }
      };
      
      checkElement();
    });
  }

  // Find element by text content with support for :not() exclusions
  findElementByText(selector) {
    // Handle complex selectors like 'a:contains("Search"):not(:contains("Explore"))'
    const containsMatch = selector.match(/:contains\("([^"]+)"\)/);
    const notContainsMatch = selector.match(/:not\(:contains\("([^"]+)"\)\)/);
    
    if (!containsMatch) return null;
    
    const searchText = containsMatch[1].toLowerCase();
    const excludeText = notContainsMatch ? notContainsMatch[1].toLowerCase() : null;
    
    // Extract base selector (everything before :contains)
    const baseSelector = selector.replace(/:contains\("[^"]+"\).*$/, '') || 'a';
    
    const elements = document.querySelectorAll(baseSelector);
    
    for (const element of elements) {
      const text = element.textContent?.toLowerCase() || '';
      
      // Must contain the search text
      if (!text.includes(searchText)) continue;
      
      // Must not contain the exclude text (if specified)
      if (excludeText && text.includes(excludeText)) continue;
      
      // Additional check for Instagram navigation - prefer href="#"
      if (element.tagName === 'A' && element.getAttribute('href') === '#') {
        return element;
      }
      
      return element;
    }
    
    return null;
  }

  // Check if element is visible and interactable
  isElementVisible(element) {
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return rect.width > 0 && 
           rect.height > 0 && 
           style.visibility !== 'hidden' && 
           style.display !== 'none' &&
           rect.top >= 0 &&
           rect.left >= 0;
  }

  // Search for a username - Human-like search workflow only
  async searchAccount(username) {
    try {
      console.log(`Searching for account: ${username}`);
      
      // Step 1: Navigate to search (human-like)
      await this.navigateToSearch();
      
      // Step 2: Find and use search input
      const searchInput = await this.findElement(this.selectors.searchInput);
      await this.humanBehavior.navigateToElement(searchInput);
      await this.humanBehavior.delay(200 + Math.random() * 300);
      
      // Clear existing content and focus input (human-like)
      searchInput.value = '';
      searchInput.focus();
      await this.humanBehavior.delay(300 + Math.random() * 200);
      
      // Step 3: Type the username with human-like behavior
      await this.humanBehavior.simulateTyping(username, searchInput);
      
      // Step 4: Wait for search results to load
      await this.humanBehavior.delay(1500 + Math.random() * 1000);
      
      // Step 5: Find and click user profile from results
      const userLink = await this.findUserInResults(username);
      
      if (!userLink) {
        throw new Error(`User ${username} not found in search results`);
      }
      
      // Step 6: Human-like navigation to profile
      await this.humanBehavior.navigateToElement(userLink);
      await this.humanBehavior.delay(500 + Math.random() * 500);
      userLink.click();
      
      // Step 7: Wait for profile to load
      await this.waitForProfileLoad();
      
      console.log(`Successfully navigated to ${username}'s profile via search`);
      return true;
      
    } catch (error) {
      console.error(`Error searching for ${username}:`, error);
      return false;
    }
  }

  // Navigate to search page with advanced element detection
  async navigateToSearch() {
    console.log('🔍 Navigating to search...');
    
    // Check if search input is already visible (search interface already open)
    const existingSearchInput = document.querySelector('input[placeholder*="Search"], input[aria-label*="Search"]');
    if (existingSearchInput && this.isElementVisible(existingSearchInput)) {
      console.log('✅ Search interface already open');
      return;
    }
    
    try {
      // Find search button (SVG or link)
      const searchSvg = document.querySelector('svg[aria-label="Search"]');
      let searchButton = null;
      
      if (searchSvg) {
        // Find the clickable parent element
        searchButton = searchSvg.closest('a') || searchSvg.closest('[role="link"]') || searchSvg.closest('div[role="button"]');
        console.log('✅ Found search SVG and parent element');
      }
      
      if (!searchButton) {
        // Fallback selectors
        const fallbackSelectors = [
          'a[href="/explore/search/"]',
          'a[href="#"]',
          '[aria-label="Search"]'
        ];
        
        for (const selector of fallbackSelectors) {
          searchButton = document.querySelector(selector);
          if (searchButton) {
            console.log(`✅ Found search button with fallback selector: ${selector}`);
            break;
          }
        }
      }
      
      if (!searchButton) {
        throw new Error('Search button not found');
      }
      
      // Human-like navigation and click
      await this.humanBehavior.navigateToElement(searchButton);
      await this.humanBehavior.delay(200 + Math.random() * 300);
      
      // Click the search button
      this.simulateHumanClick(searchButton);
      
      // Wait for search input to appear (not URL change)
      await this.waitForSearchInput(5000);
      console.log('✅ Successfully opened search interface');
      
    } catch (error) {
      console.error('Error navigating to search:', error);
      
      // Fallback: Direct navigation to search/explore page
      console.log('🔄 Trying fallback navigation...');
      try {
        window.location.href = '/explore/search/';
        await this.humanBehavior.delay(2000);
        console.log('✅ Fallback navigation completed');
      } catch (fallbackError) {
        console.error('Fallback navigation also failed:', fallbackError);
        throw new Error('All search navigation methods failed');
      }
    }
  }
  
  async waitForSearchInput(timeout = 5000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const searchInput = document.querySelector('input[placeholder*="Search"], input[aria-label*="Search"]');
      if (searchInput && this.isElementVisible(searchInput)) {
        console.log('✅ Search input appeared and is visible');
        return searchInput;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error('Search input did not appear within timeout');
  }

  // Advanced search button detection with multiple strategies
  async findSearchButtonAdvanced() {
    // Strategy 1: Try standard selectors
    try {
      return await this.findElement(this.selectors.searchButton, 2000);
    } catch (error) {
      console.log('Standard selectors failed, trying advanced detection...');
    }
    
    // Strategy 2: Specific search for Search button (avoiding Explore)
    const searchCandidates = Array.from(document.querySelectorAll('a, link')).filter(el => {
      const text = el.textContent?.toLowerCase() || '';
      const href = el.getAttribute('href') || '';
      const img = el.querySelector('img');
      const svg = el.querySelector('svg');
      
      // Must contain "Search" but not "Explore"
      const hasSearchText = text.includes('search') && !text.includes('explore');
      const hasSearchImg = img && img.getAttribute('alt')?.toLowerCase().includes('search');
      const hasSearchSvg = svg && svg.getAttribute('aria-label')?.toLowerCase().includes('search');
      const hasSearchHref = href === '#' || href.includes('search');
      
      // Exclude explore links
      const isNotExplore = !href.includes('/explore/') && !text.includes('explore');
      
      return (hasSearchText || hasSearchImg || hasSearchSvg) && hasSearchHref && isNotExplore;
    });
    
    if (searchCandidates.length > 0) {
      console.log('Found search candidates via specific detection:', searchCandidates.length);
      // Prefer the one with href="#" (that's the search button)
      const searchButton = searchCandidates.find(el => el.getAttribute('href') === '#') || searchCandidates[0];
      return searchButton;
    }
    
    // Strategy 3: Look for navigation links with href="#" and Search content
    const navLinks = document.querySelectorAll('a[href="#"]');
    for (const link of navLinks) {
      const img = link.querySelector('img[alt*="Search"]');
      const svg = link.querySelector('svg[aria-label*="Search"]');
      const text = link.textContent?.toLowerCase() || '';
      
      if ((img || svg || text.includes('search')) && !text.includes('explore')) {
        console.log('Found search via navigation pattern');
        return link;
      }
    }
    
    // Strategy 4: Look for SVG icons with search-like paths (but not in explore links)
    const svgElements = document.querySelectorAll('svg[aria-label*="Search"]');
    for (const svg of svgElements) {
      const parentLink = svg.closest('a');
      if (parentLink && !parentLink.getAttribute('href')?.includes('/explore/')) {
        console.log('Found search via SVG pattern recognition');
        return svg;
      }
    }
    
    return null;
  }

  // Determine the clickable element from found element
  getClickableElement(element) {
    console.log('🔍 Finding clickable element for:', element.tagName);
    
    if (element.tagName === 'SVG' || element.tagName === 'IMG') {
      // Find the clickable parent - try multiple approaches
      let clickableParent = element.closest('a, button, div[role="button"], [onclick]');
      
      if (!clickableParent) {
        // Try going up the DOM tree manually
        let parent = element.parentElement;
        let attempts = 0;
        while (parent && attempts < 5) {
          console.log(`   Checking parent ${attempts + 1}:`, parent.tagName, parent.getAttribute('href'));
          
          if (parent.tagName === 'A' || parent.tagName === 'BUTTON' || 
              parent.getAttribute('role') === 'button' || 
              parent.getAttribute('role') === 'link' ||
              parent.hasAttribute('onclick')) {
            clickableParent = parent;
            break;
          }
          parent = parent.parentElement;
          attempts++;
        }
      }
      
      if (clickableParent) {
        console.log('✅ Found clickable parent:', clickableParent.tagName, clickableParent.getAttribute('href'));
        return clickableParent;
      } else {
        console.log('⚠️  No clickable parent found, using element itself');
        return element;
      }
    }
    
    console.log('✅ Element is already clickable:', element.tagName);
    return element;
  }

  // Check if element is clickable (more lenient for Instagram's JS navigation)
  isElementClickable(element) {
    if (!element) {
      console.log('❌ Clickability check: Element is null/undefined');
      return false;
    }
    
    // Check basic visibility
    const style = window.getComputedStyle(element);
    if (style.display === 'none') {
      console.log('❌ Clickability check: Element display is none');
      return false;
    }
    if (style.visibility === 'hidden') {
      console.log('❌ Clickability check: Element visibility is hidden');
      return false;
    }
    
    // Check if disabled
    if (element.disabled) {
      console.log('❌ Clickability check: Element is disabled');
      return false;
    }
    
    // Check if element has size (is actually rendered)
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      console.log('❌ Clickability check: Element has no size', `${rect.width}x${rect.height}`);
      return false;
    }
    
    // For Instagram, we accept elements that meet any of these criteria:
    const hasClickFunction = typeof element.click === 'function';
    const isLink = element.tagName === 'A';
    const isButton = element.tagName === 'BUTTON';
    const hasRole = element.getAttribute('role') === 'button' || element.getAttribute('role') === 'link';
    const isInNavigation = element.closest('nav') !== null;
    const hasHref = element.hasAttribute('href');
    
    // Instagram navigation links often have href="#" and use JavaScript
    const isInstagramNavLink = isLink && hasHref && isInNavigation;
    
    // Be very permissive - if it's in navigation and looks clickable, allow it
    const isClickable = hasClickFunction || isButton || hasRole || isInstagramNavLink || 
                       (isLink && hasHref) || // Any link with href
                       (isInNavigation && (isLink || isButton)) || // Any nav link/button
                       (element.tagName === 'SVG' && element.getAttribute('aria-label')); // SVG with aria-label (can use event dispatch)
    
    if (!isClickable) {
      console.log('❌ Clickability check: Element does not meet clickability criteria');
      console.log('   hasClickFunction:', hasClickFunction);
      console.log('   isLink:', isLink);
      console.log('   isButton:', isButton);
      console.log('   hasRole:', hasRole);
      console.log('   isInNavigation:', isInNavigation);
      console.log('   hasHref:', hasHref);
      console.log('   Element tag:', element.tagName);
      console.log('   Element href:', element.getAttribute('href'));
      console.log('   Element role:', element.getAttribute('role'));
      console.log('   Element aria-label:', element.getAttribute('aria-label'));
    } else {
      console.log('✅ Clickability check: Element is clickable');
    }
    
    return isClickable;
  }

  // Simulate human-like click with position variation and proper event handling
  simulateHumanClick(element) {
    console.log('🎯 Simulating click on:', element.tagName, element.getAttribute('aria-label') || element.textContent?.trim());
    
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2 + (Math.random() - 0.5) * Math.min(rect.width * 0.6, 20);
    const y = rect.top + rect.height / 2 + (Math.random() - 0.5) * Math.min(rect.height * 0.6, 20);
    
    // For SVG elements, try to find and click the parent first
    if (element.tagName === 'SVG') {
      const parent = element.closest('a, button, div[role="button"]');
      if (parent && typeof parent.click === 'function') {
        console.log('🎯 Clicking SVG parent:', parent.tagName);
        try {
          parent.click();
          console.log('✅ SVG parent click successful');
          return;
        } catch (error) {
          console.log('SVG parent click failed:', error.message);
        }
      }
    }
    
    // Try the standard click method
    if (typeof element.click === 'function') {
      try {
        element.click();
        console.log('✅ Standard click successful');
        return;
      } catch (error) {
        console.log('Standard click failed, trying event dispatch:', error.message);
      }
    } else {
      console.log('Element has no click function, using event dispatch');
    }
    
    // Fallback to event dispatching with comprehensive event sequence
    const eventOptions = {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      screenX: x + window.screenX,
      screenY: y + window.screenY,
      button: 0,
      buttons: 1,
      detail: 1,
      view: window
    };
    
    // Comprehensive event sequence that Instagram expects
    const events = [
      new MouseEvent('mouseenter', eventOptions),
      new MouseEvent('mouseover', eventOptions),
      new MouseEvent('mousedown', eventOptions),
      new MouseEvent('mouseup', eventOptions),
      new MouseEvent('click', eventOptions),
      new PointerEvent('pointerdown', { ...eventOptions, pointerId: 1, pointerType: 'mouse' }),
      new PointerEvent('pointerup', { ...eventOptions, pointerId: 1, pointerType: 'mouse' })
    ];
    
    // Dispatch all events
    events.forEach(event => {
      try {
        element.dispatchEvent(event);
      } catch (error) {
        console.log('Event dispatch error:', error.message);
      }
    });
    
    // Also try triggering on parent elements (Instagram often uses event delegation)
    let parent = element.parentElement;
    let attempts = 0;
    while (parent && attempts < 3) {
      try {
        parent.click();
        console.log('✅ Parent click successful on:', parent.tagName);
        break;
      } catch (error) {
        parent = parent.parentElement;
        attempts++;
      }
    }
  }

  // Heuristic to identify search icons by SVG structure
  looksLikeSearchIcon(svg) {
    const svgContent = svg.innerHTML.toLowerCase();
    
    // Common search icon patterns
    const searchPatterns = [
      /circle.*stroke/i, // Circle with stroke (magnifying glass)
      /line.*x1.*y1.*x2.*y2/i, // Line (handle of magnifying glass)
      /path.*[mM].*[zZ]/i, // Path that might form a search icon
    ];
    
    let patternMatches = 0;
    searchPatterns.forEach(pattern => {
      if (pattern.test(svgContent)) patternMatches++;
    });
    
    // If it matches multiple patterns, likely a search icon
    return patternMatches >= 2;
  }

  // Find specific user in search results - Updated for actual Instagram structure
  async findUserInResults(username) {
    // Wait a bit more for results to fully load
    await this.humanBehavior.delay(500);
    
    // Look for profile links in search results (skip keyword results)
    const searchResults = document.querySelectorAll('a[href*="/"][href$="/"]');
    
    for (const result of searchResults) {
      const href = result.getAttribute('href');
      
      // Skip keyword search results and other non-profile links
      if (href.includes('/explore/search/keyword/') || 
          href.includes('/p/') || 
          href.includes('/reel/') ||
          href === '/' ||
          href.includes('/explore/') ||
          href.includes('/direct/') ||
          href.includes('/reels/')) {
        continue;
      }
      
      // Extract username from href (e.g., "/username/" -> "username")
      const hrefUsername = href.replace(/^\//, '').replace(/\/$/, '');
      
      // Check if this matches our target username
      if (hrefUsername.toLowerCase() === username.toLowerCase()) {
        console.log(`Found exact match for ${username}: ${href}`);
        return result;
      }
      
      // Also check text content for partial matches
      const resultText = result.textContent.toLowerCase();
      if (resultText.includes(username.toLowerCase())) {
        // Verify it's a profile result by checking if it has profile picture and username
        const hasProfilePic = result.querySelector('img[alt*="profile picture"]');
        if (hasProfilePic) {
          console.log(`Found profile match for ${username}: ${href}`);
          return result;
        }
      }
    }
    
    console.log(`No profile found for ${username} in search results`);
    return null;
  }

  // Wait for profile page to load
  async waitForProfileLoad() {
    try {
      await this.findElement(this.selectors.profileHeader, 5000);
      await this.humanBehavior.delay(500 + Math.random() * 500);
    } catch (error) {
      console.error('Profile failed to load:', error);
      throw error;
    }
  }

  // Follow an account - Updated for actual button structure
  async followAccount() {
    try {
      console.log('Attempting to follow account');
      
      // Check if already following
      const isAlreadyFollowing = await this.checkIfFollowing();
      if (isAlreadyFollowing) {
        console.log('Already following this account');
        return { success: true, alreadyFollowing: true };
      }
      
      // Find follow button by looking for button with "Follow" text
      let followButton = null;
      const buttons = document.querySelectorAll('main button, header button');
      
      for (const button of buttons) {
        const text = button.textContent.trim().toLowerCase();
        if (text === 'follow' && !text.includes('following')) {
          followButton = button;
          break;
        }
      }
      
      if (!followButton) {
        throw new Error('Follow button not found');
      }
      
      console.log('Found follow button:', followButton.textContent);
      
      // Simulate contextual browsing before following (30% chance)
      if (Math.random() < 0.3) {
        await this.simulateProfileBrowsing();
      }
      
      // Navigate to follow button and click
      await this.humanBehavior.navigateToElement(followButton);
      await this.humanBehavior.delay(500 + Math.random() * 1000);
      
      followButton.click();
      
      // Wait for action to complete
      await this.humanBehavior.delay(1500 + Math.random() * 1000);
      
      // Verify follow was successful
      const followSuccess = await this.verifyFollowAction();
      
      if (followSuccess) {
        this.actionCount++;
        this.lastActionTime = Date.now();
        console.log('Successfully followed account');
        return { success: true, alreadyFollowing: false };
      } else {
        throw new Error('Follow action verification failed');
      }
      
    } catch (error) {
      console.error('Error following account:', error);
      return { success: false, error: error.message };
    }
  }

  // Unfollow an account - Updated for actual button structure
  async unfollowAccount() {
    try {
      console.log('Attempting to unfollow account');
      
      // Check if actually following
      const isFollowing = await this.checkIfFollowing();
      if (!isFollowing) {
        console.log('Not following this account');
        return { success: true, wasNotFollowing: true };
      }
      
      // Find unfollow button (shows as "Following" or dropdown with "Following")
      let unfollowButton = null;
      const buttons = document.querySelectorAll('main button, header button');
      
      for (const button of buttons) {
        const text = button.textContent.trim().toLowerCase();
        if (text.includes('following')) {
          unfollowButton = button;
          break;
        }
      }
      
      if (!unfollowButton) {
        throw new Error('Following button not found');
      }
      
      console.log('Found following button:', unfollowButton.textContent);
      
      // Navigate to following button and click
      await this.humanBehavior.navigateToElement(unfollowButton);
      await this.humanBehavior.delay(500 + Math.random() * 1000);
      
      unfollowButton.click();
      
      // Wait for confirmation dialog or dropdown menu
      await this.humanBehavior.delay(800 + Math.random() * 500);
      
      // Look for unfollow confirmation button
      let confirmButton = null;
      const confirmButtons = document.querySelectorAll('button, div[role="button"]');
      
      for (const button of confirmButtons) {
        const text = button.textContent.trim().toLowerCase();
        if (text === 'unfollow') {
          confirmButton = button;
          break;
        }
      }
      
      if (confirmButton) {
        console.log('Found unfollow confirmation button');
        await this.humanBehavior.navigateToElement(confirmButton);
        await this.humanBehavior.delay(300 + Math.random() * 300);
        confirmButton.click();
      }
      
      // Wait for action to complete
      await this.humanBehavior.delay(1500 + Math.random() * 1000);
      
      // Verify unfollow was successful
      const unfollowSuccess = await this.verifyUnfollowAction();
      
      if (unfollowSuccess) {
        this.actionCount++;
        this.lastActionTime = Date.now();
        console.log('Successfully unfollowed account');
        return { success: true, wasNotFollowing: false };
      } else {
        throw new Error('Unfollow action verification failed');
      }
      
    } catch (error) {
      console.error('Error unfollowing account:', error);
      return { success: false, error: error.message };
    }
  }

  // Check if currently following an account - Updated for actual button structure
  async checkIfFollowing() {
    try {
      // Look for buttons in the profile header area
      const buttons = document.querySelectorAll('main button, header button');
      
      for (const button of buttons) {
        const text = button.textContent.trim().toLowerCase();
        
        // Check for "Following" button (indicates we're following)
        if (text === 'following' || text.includes('following')) {
          console.log('Found Following button - we are following this account');
          return true;
        }
        
        // Check for "Follow" button (indicates we're not following)
        if (text === 'follow' && !text.includes('following')) {
          console.log('Found Follow button - we are not following this account');
          return false;
        }
      }
      
      // Additional check for dropdown buttons that might contain "Following"
      const dropdownButtons = document.querySelectorAll('button:has(img[alt="Down chevron icon"])');
      for (const button of dropdownButtons) {
        if (button.textContent.toLowerCase().includes('following')) {
          console.log('Found Following dropdown button - we are following this account');
          return true;
        }
      }
      
      console.log('No clear follow status found, defaulting to not following');
      return false; // Default to not following
      
    } catch (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
  }

  // Verify follow action was successful
  async verifyFollowAction() {
    await this.humanBehavior.delay(1000);
    
    // Check if button changed to "Following"
    try {
      await this.findElement(this.selectors.unfollowButton, 2000);
      return true;
    } catch {
      return false;
    }
  }

  // Verify unfollow action was successful
  async verifyUnfollowAction() {
    await this.humanBehavior.delay(1000);
    
    // Check if button changed back to "Follow"
    try {
      await this.findElement(this.selectors.followButton, 2000);
      return true;
    } catch {
      return false;
    }
  }

  // Simulate contextual profile browsing
  async simulateProfileBrowsing() {
    console.log('Simulating profile browsing');
    
    const actions = [
      () => this.scrollProfile(),
      () => this.viewRandomPost(),
      () => this.readBio(),
      () => this.checkFollowerCount()
    ];
    
    // Perform 1-2 random actions
    const numActions = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numActions; i++) {
      const action = actions[Math.floor(Math.random() * actions.length)];
      await action();
      await this.humanBehavior.delay(1000 + Math.random() * 2000);
    }
  }

  // Scroll profile page
  async scrollProfile() {
    const scrollAmount = 200 + Math.random() * 400;
    window.scrollBy(0, scrollAmount);
    await this.humanBehavior.delay(500 + Math.random() * 1000);
    
    // Sometimes scroll back up
    if (Math.random() < 0.3) {
      window.scrollBy(0, -scrollAmount * 0.5);
      await this.humanBehavior.delay(300 + Math.random() * 500);
    }
  }

  // View a random post (hover only)
  async viewRandomPost() {
    const posts = document.querySelectorAll('article img, [role="button"] img');
    if (posts.length > 0) {
      const randomPost = posts[Math.floor(Math.random() * posts.length)];
      await this.humanBehavior.navigateToElement(randomPost);
      await this.humanBehavior.delay(1000 + Math.random() * 2000);
    }
  }

  // Simulate reading bio
  async readBio() {
    const bioElements = document.querySelectorAll('header div, header span');
    if (bioElements.length > 0) {
      const randomBio = bioElements[Math.floor(Math.random() * bioElements.length)];
      await this.humanBehavior.navigateToElement(randomBio);
      await this.humanBehavior.delay(2000 + Math.random() * 3000);
    }
  }

  // Check follower count (hover)
  async checkFollowerCount() {
    const followerElements = document.querySelectorAll('a[href*="/followers/"], span:contains("followers")');
    if (followerElements.length > 0) {
      const followerElement = followerElements[0];
      await this.humanBehavior.navigateToElement(followerElement);
      await this.humanBehavior.delay(500 + Math.random() * 1000);
    }
  }

  // Detect rate limiting or blocks
  async detectRateLimit() {
    try {
      const rateLimitElement = await this.findElement(this.selectors.rateLimitIndicators, 1000);
      if (rateLimitElement) {
        console.warn('Rate limit detected:', rateLimitElement.textContent);
        return {
          detected: true,
          message: rateLimitElement.textContent,
          type: 'rate_limit'
        };
      }
    } catch {
      // No rate limit detected
    }
    
    return { detected: false };
  }

  // Get current username from profile
  getCurrentUsername() {
    try {
      const usernameElement = document.querySelector(this.selectors.username.join(', '));
      return usernameElement ? usernameElement.textContent.trim() : null;
    } catch {
      return null;
    }
  }

  // Get action statistics
  getActionStats() {
    return {
      actionCount: this.actionCount,
      lastActionTime: this.lastActionTime,
      currentUrl: window.location.href
    };
  }
}

// Export for use in other modules
window.InstagramInterface = InstagramInterface;

// ES Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InstagramInterface;
}