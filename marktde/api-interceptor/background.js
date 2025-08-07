/*
 * Markt.de API Interceptor - Background Script
 * Captures network requests to understand API structure
 */

console.log('🔍 Markt.de API Interceptor - Background Script Loaded');

// Store for captured API calls
let capturedCalls = [];

// Listen to web requests
chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    // Only capture markt.de requests
    if (details.url.includes('markt.de')) {
      const apiCall = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        method: details.method,
        url: details.url,
        type: details.type,
        requestBody: details.requestBody,
        tabId: details.tabId
      };

      // Check if this looks like a chat/message related API call
      const chatKeywords = ['message', 'chat', 'postfach', 'mailbox', 'conversation', 'ajax'];
      const isRelevant = chatKeywords.some(keyword => 
        details.url.toLowerCase().includes(keyword)
      );

      if (isRelevant) {
        console.log('📡 Captured relevant API call:', apiCall);
        capturedCalls.push(apiCall);
        
        // Keep only last 100 calls to prevent memory issues
        if (capturedCalls.length > 100) {
          capturedCalls = capturedCalls.slice(-100);
        }
        
        // Store in chrome storage
        chrome.storage.local.set({ capturedCalls: capturedCalls });
      }
    }
  },
  {urls: ["https://*.markt.de/*"]},
  ["requestBody"]
);

// Listen to response headers
chrome.webRequest.onResponseStarted.addListener(
  function(details) {
    if (details.url.includes('markt.de')) {
      const chatKeywords = ['message', 'chat', 'postfach', 'mailbox', 'conversation', 'ajax'];
      const isRelevant = chatKeywords.some(keyword => 
        details.url.toLowerCase().includes(keyword)
      );

      if (isRelevant) {
        // Find the corresponding request and add response info
        const callIndex = capturedCalls.findIndex(call => 
          call.url === details.url && 
          Math.abs(new Date(call.timestamp).getTime() - details.timeStamp) < 5000
        );

        if (callIndex !== -1) {
          capturedCalls[callIndex].responseHeaders = details.responseHeaders;
          capturedCalls[callIndex].statusCode = details.statusCode;
          
          console.log('📨 Added response info to API call:', capturedCalls[callIndex]);
          chrome.storage.local.set({ capturedCalls: capturedCalls });
        }
      }
    }
  },
  {urls: ["https://*.markt.de/*"]},
  ["responseHeaders"]
);

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getCapturedCalls') {
    sendResponse({ calls: capturedCalls });
  } else if (request.action === 'clearCalls') {
    capturedCalls = [];
    chrome.storage.local.set({ capturedCalls: [] });
    sendResponse({ success: true });
  } else if (request.action === 'logApiCall') {
    // API call logged from injected script
    const apiCall = {
      ...request.data,
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      source: 'injected'
    };
    
    console.log('🎯 API call from injected script:', apiCall);
    capturedCalls.push(apiCall);
    chrome.storage.local.set({ capturedCalls: capturedCalls });
  }
});

// Load stored calls on startup
chrome.storage.local.get(['capturedCalls'], (result) => {
  if (result.capturedCalls) {
    capturedCalls = result.capturedCalls;
    console.log(`📚 Loaded ${capturedCalls.length} stored API calls`);
  }
});