/*
 * Markt.de API Interceptor - Content Script
 * Injects script to intercept fetch/XHR calls
 */

console.log('🔍 Markt.de API Interceptor - Content Script Loaded');

// Inject the script that will intercept fetch/XHR
const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');
script.onload = function() {
  this.remove();
};
(document.head || document.documentElement).appendChild(script);

// Listen for messages from injected script
window.addEventListener('message', function(event) {
  if (event.source !== window) return;
  
  if (event.data.type === 'API_CALL_INTERCEPTED') {
    // Forward to background script
    chrome.runtime.sendMessage({
      action: 'logApiCall',
      data: event.data.data
    });
  }
});

// Add visual indicator that interceptor is active
function addInterceptorIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'marktde-api-interceptor';
  indicator.innerHTML = `
    <div style="
      position: fixed;
      top: 10px;
      left: 10px;
      background: #ff6b6b;
      color: white;
      padding: 8px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      z-index: 10000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      font-family: Arial, sans-serif;
    ">
      🔍 API Interceptor Active
    </div>
  `;
  document.body.appendChild(indicator);
  
  // Remove after 3 seconds
  setTimeout(() => {
    if (document.getElementById('marktde-api-interceptor')) {
      document.getElementById('marktde-api-interceptor').remove();
    }
  }, 3000);
}

// Add indicator when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addInterceptorIndicator);
} else {
  addInterceptorIndicator();
}