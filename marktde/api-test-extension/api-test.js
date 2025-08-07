// Markt.de API Test Extension - Content Script
console.log('🧪 API Test Extension Content Script Loaded');

// Add visual indicator that extension is active
function addExtensionIndicator() {
    if (document.getElementById('api-test-indicator')) return;
    
    const indicator = document.createElement('div');
    indicator.id = 'api-test-indicator';
    indicator.innerHTML = '🧪 API Test Active';
    indicator.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        background: #007cba;
        color: white;
        padding: 5px 10px;
        border-radius: 15px;
        font-size: 12px;
        font-weight: bold;
        z-index: 10000;
        font-family: Arial, sans-serif;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(indicator);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
        }
    }, 3000);
}

// Enhanced API interceptor for testing
const originalFetch = window.fetch;
window.fetch = function(...args) {
    const [url, options] = args;
    
    // Log API calls for debugging
    if (url.includes('ajaxCall=')) {
        console.log('🔍 API Call Intercepted:', {
            url,
            method: options?.method || 'GET',
            body: options?.body,
            timestamp: new Date().toISOString()
        });
    }
    
    return originalFetch.apply(this, args);
};

// Helper functions for data extraction
window.marktdeApiTest = {
    // Extract current user ID from various sources
    getCurrentUserId() {
        // Try session data first
        if (window.clsyDataLayer && window.clsyDataLayer[0] && window.clsyDataLayer[0].loggedInUserId) {
            return window.clsyDataLayer[0].loggedInUserId;
        }
        
        // Try to extract from profile links
        const profileLinks = document.querySelectorAll('a[href*="/profile.htm"]');
        for (const link of profileLinks) {
            const match = link.href.match(/userId,(\d+)/);
            if (match) {
                return match[1];
            }
        }
        
        return null;
    },
    
    // Extract thread ID from current page
    getCurrentThreadId() {
        return new URLSearchParams(window.location.search).get('threadId');
    },
    
    // Extract all chat data from inbox
    extractAllChats() {
        const chatElements = document.querySelectorAll('.clsy-c-mbx-threads-item');
        const chats = [];
        
        chatElements.forEach(element => {
            const threadId = element.getAttribute('data-mailbox-thread-id');
            const messageId = element.getAttribute('data-message-id');
            const title = element.querySelector('.clsy-c-mbx-threads-item__title')?.textContent?.trim();
            const nickname = element.querySelector('.clsy-c-mbx-threads-item__nickname')?.textContent?.trim();
            const message = element.querySelector('.clsy-c-mbx-threads-item__message')?.textContent?.trim();
            const profileLink = element.querySelector('.clsy-c-mbx-threads-item__profile-link')?.href;
            const unreadBadge = element.querySelector('.clsy-count-badge-content')?.textContent?.trim();
            const totalMessages = element.querySelector('.clsy-c-mbx-threads-item__messagecount')?.textContent?.trim();
            
            // Extract user ID from profile link
            let otherUserId = null;
            if (profileLink) {
                const match = profileLink.match(/userId,(\d+)/);
                if (match) {
                    otherUserId = match[1];
                }
            }
            
            chats.push({
                threadId,
                messageId,
                title,
                nickname,
                message,
                profileLink,
                otherUserId,
                unreadMessages: unreadBadge ? parseInt(unreadBadge) : 0,
                totalMessages: totalMessages ? parseInt(totalMessages) : 0,
                isNewChat: unreadBadge && totalMessages && parseInt(unreadBadge) === parseInt(totalMessages) && parseInt(totalMessages) === 1,
                isBasisChat: !!title && title !== 'Profilnachricht', // Has advert title
                isPremiumChat: !title || title === 'Profilnachricht'
            });
        });
        
        return chats;
    },
    
    // Test API call with proper error handling
    async testApiCall(endpoint, params = {}) {
        try {
            const url = new URL(endpoint, window.location.origin);
            Object.keys(params).forEach(key => {
                url.searchParams.append(key, params[key]);
            });
            
            const response = await fetch(url.toString(), {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Send message via API
    async sendMessage(threadId, userId, messageText = '', fileId = '') {
        try {
            let requestData = `ajaxCall=submitMessage&threadId=${threadId}&userId=${userId}`;
            
            if (messageText) {
                requestData += `&message=${encodeURIComponent(messageText)}`;
            }
            
            if (fileId) {
                requestData += `&fileId=${fileId}`;
            }
            
            const response = await fetch('/benutzer/postfach.htm', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: requestData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            return { success: true, data, requestData };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

// Add indicator when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addExtensionIndicator);
} else {
    addExtensionIndicator();
}

// Log current page info for debugging
console.log('📍 Current Page Info:', {
    url: window.location.href,
    isInboxPage: window.location.href.includes('/postfach.htm'),
    isChatPage: window.location.href.includes('threadId='),
    currentThreadId: new URLSearchParams(window.location.search).get('threadId'),
    currentUserId: window.marktdeApiTest.getCurrentUserId()
});