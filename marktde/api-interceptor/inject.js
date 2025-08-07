/*
 * Markt.de API Interceptor - Injected Script
 * Intercepts fetch and XMLHttpRequest calls
 */

console.log('🎯 Markt.de API Interceptor - Injected Script Loaded');

// Store original functions
const originalFetch = window.fetch;
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;

// Helper function to check if URL is relevant
function isRelevantUrl(url) {
  const chatKeywords = ['message', 'chat', 'postfach', 'mailbox', 'conversation', 'ajax', 'api'];
  return chatKeywords.some(keyword => url.toLowerCase().includes(keyword));
}

// Helper function to log API call
function logApiCall(method, url, requestData, responseData, headers) {
  const apiCall = {
    method: method,
    url: url,
    requestData: requestData,
    responseData: responseData,
    headers: headers,
    userAgent: navigator.userAgent,
    timestamp: Date.now()
  };
  
  console.log('🔍 Intercepted API call:', apiCall);
  
  // Send to content script
  window.postMessage({
    type: 'API_CALL_INTERCEPTED',
    data: apiCall
  }, '*');
}

// Intercept fetch
window.fetch = async function(...args) {
  const [resource, config] = args;
  const url = typeof resource === 'string' ? resource : resource.url;
  const method = config?.method || 'GET';
  
  if (isRelevantUrl(url)) {
    console.log('🔍 Intercepting fetch:', method, url);
    
    let requestData = null;
    if (config?.body) {
      try {
        requestData = typeof config.body === 'string' ? config.body : JSON.stringify(config.body);
      } catch (e) {
        requestData = '[Unable to serialize request body]';
      }
    }
    
    try {
      const response = await originalFetch.apply(this, args);
      
      // Clone response to read it without consuming it
      const responseClone = response.clone();
      let responseData = null;
      
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          responseData = await responseClone.json();
        } else {
          responseData = await responseClone.text();
        }
      } catch (e) {
        responseData = '[Unable to read response]';
      }
      
      // Extract headers
      const headers = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      
      logApiCall(method, url, requestData, responseData, headers);
      
      return response;
    } catch (error) {
      logApiCall(method, url, requestData, `Error: ${error.message}`, {});
      throw error;
    }
  }
  
  return originalFetch.apply(this, args);
};

// Intercept XMLHttpRequest
XMLHttpRequest.prototype.open = function(method, url, ...args) {
  this._interceptor = {
    method: method,
    url: url,
    isRelevant: isRelevantUrl(url)
  };
  
  if (this._interceptor.isRelevant) {
    console.log('🔍 Intercepting XHR open:', method, url);
  }
  
  return originalXHROpen.apply(this, [method, url, ...args]);
};

XMLHttpRequest.prototype.send = function(data) {
  if (this._interceptor && this._interceptor.isRelevant) {
    console.log('🔍 Intercepting XHR send:', this._interceptor.method, this._interceptor.url);
    
    const originalOnReadyStateChange = this.onreadystatechange;
    
    this.onreadystatechange = function() {
      if (this.readyState === 4) {
        let responseData = null;
        try {
          const contentType = this.getResponseHeader('content-type');
          if (contentType && contentType.includes('application/json')) {
            responseData = JSON.parse(this.responseText);
          } else {
            responseData = this.responseText;
          }
        } catch (e) {
          responseData = this.responseText;
        }
        
        // Extract headers
        const headers = {};
        const headerString = this.getAllResponseHeaders();
        if (headerString) {
          headerString.split('\r\n').forEach(line => {
            const parts = line.split(': ');
            if (parts.length === 2) {
              headers[parts[0]] = parts[1];
            }
          });
        }
        
        logApiCall(
          this._interceptor.method,
          this._interceptor.url,
          data,
          responseData,
          headers
        );
      }
      
      if (originalOnReadyStateChange) {
        originalOnReadyStateChange.apply(this, arguments);
      }
    };
  }
  
  return originalXHRSend.apply(this, [data]);
};

// Also intercept any jQuery AJAX calls if jQuery is present
if (window.jQuery) {
  const originalAjax = window.jQuery.ajax;
  
  window.jQuery.ajax = function(options) {
    if (typeof options === 'string') {
      options = { url: options };
    }
    
    if (isRelevantUrl(options.url)) {
      console.log('🔍 Intercepting jQuery AJAX:', options.type || 'GET', options.url);
      
      const originalSuccess = options.success;
      const originalError = options.error;
      
      options.success = function(data, textStatus, jqXHR) {
        logApiCall(
          options.type || 'GET',
          options.url,
          options.data,
          data,
          jqXHR.getAllResponseHeaders()
        );
        
        if (originalSuccess) {
          originalSuccess.apply(this, arguments);
        }
      };
      
      options.error = function(jqXHR, textStatus, errorThrown) {
        logApiCall(
          options.type || 'GET',
          options.url,
          options.data,
          `Error: ${textStatus} - ${errorThrown}`,
          jqXHR.getAllResponseHeaders()
        );
        
        if (originalError) {
          originalError.apply(this, arguments);
        }
      };
    }
    
    return originalAjax.apply(this, [options]);
  };
}

console.log('🎯 API interception setup complete');