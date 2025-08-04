/*
 * Actual Login Test - Test the real login process with your credentials
 * Run this in the browser console on markt.de to test the actual login
 * 
 * IMPORTANT: This will use your real credentials for testing
 */

// Actual login test with your credentials
async function testActualLogin() {
  console.log('🔐 Testing Actual Login Process');
  console.log('⚠️ This will use real credentials!');
  
  // Your credentials
  const credentials = {
    email: 'jodie@kodo-marketing.de',
    password: 'PW%xZ,kjb5CF_R*'
  };
  
  // Navigate to login page if needed
  if (!window.location.href.includes('nichtangemeldet.htm')) {
    console.log('📍 Navigating to login page...');
    window.location.href = 'https://www.markt.de/nichtangemeldet.htm';
    return;
  }
  
  console.log('✅ On login page, starting login process...');
  
  // Wait for page to load
  await sleep(3000);
  
  // Handle cookie consent first
  console.log('🍪 Handling cookie consent...');
  await handleCookieConsent();
  
  // Wait additional time
  await sleep(2000);
  
  // Find form elements
  console.log('🔍 Finding form elements...');
  
  const emailInput = document.querySelector('#clsy-login-username');
  const passwordInput = document.querySelector('#clsy-login-password');
  const rememberMeCheckbox = document.querySelector('#clsy-login-rememberme');
  let loginButton = document.querySelector('button.clsy-c-btn.clsy-c-btn--cta[type="submit"]');
  
  if (!loginButton) {
    loginButton = document.querySelector('button[type="submit"]');
  }
  
  if (!emailInput || !passwordInput || !loginButton) {
    console.error('❌ Missing form elements:');
    console.log('Email input:', !!emailInput);
    console.log('Password input:', !!passwordInput);
    console.log('Login button:', !!loginButton);
    return;
  }
  
  console.log('✅ All form elements found');
  
  try {
    // Fill email
    console.log('📧 Filling email field...');
    emailInput.focus();
    await sleep(500);
    emailInput.value = '';
    await typeNaturally(emailInput, credentials.email);
    await sleep(1000);
    
    // Fill password
    console.log('🔑 Filling password field...');
    passwordInput.focus();
    await sleep(500);
    passwordInput.value = '';
    await typeNaturally(passwordInput, credentials.password);
    await sleep(1000);
    
    // Check remember me
    if (rememberMeCheckbox && !rememberMeCheckbox.checked) {
      console.log('☑️ Checking remember me...');
      rememberMeCheckbox.click();
      await sleep(1000);
    }
    
    // Click login button
    console.log('🚀 Clicking login button...');
    loginButton.click();
    
    // Wait for login to complete
    console.log('⏳ Waiting for login to complete...');
    const loginSuccess = await waitForLoginComplete();
    
    if (loginSuccess) {
      console.log('🎉 Login successful!');
      
      // Check for session cookies
      const cookies = document.cookie;
      console.log('🍪 Checking session cookies...');
      
      if (cookies.includes('__ssid')) {
        console.log('✅ __ssid cookie found');
      }
      if (cookies.includes('__rtbh.lid')) {
        console.log('✅ __rtbh.lid cookie found');
      }
      if (cookies.includes('__spdt')) {
        console.log('✅ __spdt cookie found');
      }
      
      console.log('Current URL:', window.location.href);
      
    } else {
      console.error('❌ Login failed');
    }
    
  } catch (error) {
    console.error('❌ Login error:', error);
  }
}

// Helper functions
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function handleCookieConsent() {
  const cookieSelectors = [
    'div[role="button"].cmp_button.cmp_button_bg.cmp_button_font_color.cmp-button-accept-all',
    'div.cmp-button-accept-all[role="button"]',
    '.cmp-button-accept-all',
    '.cmp-root-container button[role="button"]'
  ];
  
  for (const selector of cookieSelectors) {
    const element = document.querySelector(selector);
    if (element && element.offsetParent !== null) {
      console.log('🍪 Clicking cookie consent...');
      element.click();
      await sleep(1500);
      return;
    }
  }
  
  console.log('ℹ️ No cookie consent dialog found');
}

async function typeNaturally(element, text) {
  for (let i = 0; i < text.length; i++) {
    element.value += text[i];
    element.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(50 + Math.random() * 100); // Random typing speed
  }
}

async function waitForLoginComplete(timeout = 45000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    // Check if URL changed (successful login)
    if (!window.location.href.includes('nichtangemeldet.htm')) {
      console.log('✅ Login successful - URL changed');
      return true;
    }
    
    // Check for error messages
    const errorSelectors = [
      '.clsy-login-error',
      '.error-message',
      '.clsy-c-form__error',
      '.alert-error'
    ];
    
    for (const selector of errorSelectors) {
      const errorElement = document.querySelector(selector);
      if (errorElement && errorElement.offsetParent !== null) {
        const errorText = errorElement.textContent.trim();
        if (errorText.length > 0) {
          throw new Error(`Login error: ${errorText}`);
        }
      }
    }
    
    await sleep(1000);
  }
  
  throw new Error('Login timeout');
}

// Make available globally
window.testActualLogin = testActualLogin;

console.log('🧪 Login test loaded. Run testActualLogin() to start the test.');
console.log('⚠️ WARNING: This will use your real credentials!');