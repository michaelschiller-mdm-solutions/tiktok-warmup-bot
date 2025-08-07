// Markt.de API Test Extension - Popup Script
console.log('🧪 API Test Extension Popup Loaded');

// Comprehensive logging function
function log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    console.log(logMessage, data || '');
    
    // Also log to extension storage for debugging
    if (chrome.storage) {
        chrome.storage.local.get(['extensionLogs'], (result) => {
            const logs = result.extensionLogs || [];
            logs.push({
                timestamp,
                level,
                message,
                data: data ? JSON.stringify(data) : null
            });
            
            // Keep only last 100 logs
            if (logs.length > 100) {
                logs.splice(0, logs.length - 100);
            }
            
            chrome.storage.local.set({ extensionLogs: logs });
        });
    }
}

// Helper function to execute code in the active tab
async function executeInTab(func, ...args) {
    log('info', 'executeInTab called', { funcName: func.name, argsCount: args.length });
    
    try {
        // Check if chrome.tabs is available
        if (!chrome.tabs) {
            log('error', 'chrome.tabs is not available');
            return { error: 'Chrome tabs API not available' };
        }
        
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        log('info', 'Active tab found', { tabId: tab.id, url: tab.url });
        
        if (!tab.url.includes('markt.de')) {
            log('error', 'Not on markt.de page', { url: tab.url });
            return { error: 'Please navigate to a markt.de page first' };
        }
        
        // Check if chrome.scripting is available
        if (!chrome.scripting) {
            log('error', 'chrome.scripting is not available');
            return { error: 'Chrome scripting API not available' };
        }
        
        log('info', 'Executing script in tab', { tabId: tab.id });
        
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: func,
            args: args
        });
        
        log('info', 'Script execution completed', { resultsLength: results.length });
        
        if (results && results.length > 0) {
            log('info', 'Script result received', results[0].result);
            return results[0].result;
        } else {
            log('error', 'No results from script execution');
            return { error: 'No results from script execution' };
        }
        
    } catch (error) {
        log('error', 'executeInTab failed', { error: error.message, stack: error.stack });
        return { error: `Script execution failed: ${error.message}` };
    }
}

// Helper function to display results
function displayResult(elementId, data, type = 'info') {
    log('info', 'displayResult called', { elementId, type, hasError: !!data.error });
    
    const element = document.getElementById(elementId);
    if (!element) {
        log('error', 'Display element not found', { elementId });
        return;
    }
    
    element.className = `result ${type}`;
    
    if (data.error) {
        element.className = 'result error';
        element.textContent = `❌ Error: ${data.error}`;
        log('error', 'Displaying error result', { error: data.error });
    } else {
        const resultText = JSON.stringify(data, null, 2);
        element.textContent = resultText;
        log('info', 'Displaying success result', { resultLength: resultText.length });
    }
}

// Extract page information
document.getElementById('extractPageInfo').addEventListener('click', wrapApiCall(async () => {
    log('info', 'extractPageInfo called');
    
    const result = await executeInTab(() => {
        console.log('🔍 Extracting page info');
        
        return {
            url: window.location.href,
            title: document.title,
            isInboxPage: window.location.href.includes('/postfach.htm'),
            isChatPage: window.location.href.includes('threadId='),
            currentThreadId: new URLSearchParams(window.location.search).get('threadId'),
            chatElements: document.querySelectorAll('.clsy-c-mbx-threads-item').length,
            messageElements: document.querySelectorAll('[data-message-id]').length
        };
    });
    
    log('info', 'extractPageInfo result', result);
    displayResult('pageInfoResult', result);
}, 'extractPageInfo'));

// Get Messages API call
document.getElementById('getMessages').addEventListener('click', wrapApiCall(async () => {
    const threadId = document.getElementById('threadId').value;
    const userId = document.getElementById('userId').value;
    
    log('info', 'getMessages called', { threadId, userId });
    
    if (!threadId || !userId) {
        const error = 'Thread ID and User ID are required';
        log('error', error);
        displayResult('apiResult', { error }, 'error');
        return;
    }
    
    const result = await executeInTab((threadId, userId) => {
        console.log('🔍 Executing getMessages in tab', { threadId, userId });
        
        const url = `/benutzer/postfach.htm?ajaxCall=getMessages&threadId=${threadId}&userId=${userId}`;
        console.log('🔍 Fetching URL:', url);
        
        return fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => {
            console.log('🔍 Response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('🔍 Response data received:', data);
            return { success: true, data, url };
        })
        .catch(error => {
            console.error('🔍 Fetch error:', error);
            return { error: error.message, url };
        });
    }, threadId, userId);
    
    log('info', 'getMessages result', result);
    displayResult('apiResult', result, result.success ? 'success' : 'error');
}, 'getMessages'));

// Get Threads API call
document.getElementById('getThreads').addEventListener('click', wrapApiCall(async () => {
    const userId = document.getElementById('userId').value;
    
    log('info', 'getThreads called', { userId });
    
    if (!userId) {
        const error = 'User ID is required';
        log('error', error);
        displayResult('apiResult', { error }, 'error');
        return;
    }
    
    const result = await executeInTab((userId) => {
        console.log('🔍 Executing getThreads in tab', { userId });
        
        const url = `/benutzer/postfach.htm?ajaxCall=getThreads&userId=${userId}&page=0&messageState=ALL`;
        console.log('🔍 Fetching URL:', url);
        
        return fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => {
            console.log('🔍 Response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('🔍 Response data received:', data);
            return { success: true, data, url };
        })
        .catch(error => {
            console.error('🔍 Fetch error:', error);
            return { error: error.message, url };
        });
    }, userId);
    
    log('info', 'getThreads result', result);
    displayResult('apiResult', result, result.success ? 'success' : 'error');
}, 'getThreads'));

// Check Updates API call
document.getElementById('checkUpdates').addEventListener('click', wrapApiCall(async () => {
    const threadId = document.getElementById('threadId').value;
    const userId = document.getElementById('userId').value;
    
    log('info', 'checkUpdates called', { threadId, userId });
    
    if (!threadId || !userId) {
        const error = 'Thread ID and User ID are required';
        log('error', error);
        displayResult('apiResult', { error }, 'error');
        return;
    }
    
    const result = await executeInTab((threadId, userId) => {
        console.log('🔍 Executing checkUpdates in tab', { threadId, userId });
        
        const now = Date.now();
        const url = `/benutzer/postfach.htm?ajaxCall=checkForUpdates&userId=${userId}&threadId=${threadId}&lastMessageDate=${now}&lastSeenMessageDate=${now}&lastUpdate=${now}`;
        console.log('🔍 Fetching URL:', url);
        
        return fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => {
            console.log('🔍 Response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('🔍 Response data received:', data);
            return { success: true, data, url };
        })
        .catch(error => {
            console.error('🔍 Fetch error:', error);
            return { error: error.message, url };
        });
    }, threadId, userId);
    
    log('info', 'checkUpdates result', result);
    displayResult('apiResult', result, result.success ? 'success' : 'error');
}, 'checkUpdates'));

// Send Message API call
document.getElementById('sendMessage').addEventListener('click', wrapApiCall(async () => {
    const threadId = document.getElementById('threadId').value;
    const userId = document.getElementById('userId').value;
    const messageText = document.getElementById('messageText').value;
    const fileId = document.getElementById('fileId').value;
    
    log('info', 'sendMessage called', { threadId, userId, hasText: !!messageText, hasFileId: !!fileId });
    
    if (!threadId || !userId) {
        const error = 'Thread ID and User ID are required';
        log('error', error);
        displayResult('sendResult', { error }, 'error');
        return;
    }
    
    if (!messageText && !fileId) {
        const error = 'Either message text or file ID is required';
        log('error', error);
        displayResult('sendResult', { error }, 'error');
        return;
    }
    
    const result = await executeInTab((threadId, userId, messageText, fileId) => {
        console.log('🔍 Executing sendMessage in tab', { threadId, userId, messageText, fileId });
        
        // Build request data exactly as seen in API logs
        let requestData = `ajaxCall=submitMessage&threadId=${threadId}&userId=${userId}`;
        
        if (messageText) {
            requestData += `&message=${encodeURIComponent(messageText)}`;
            console.log('🔍 Added message text to request');
        }
        
        if (fileId) {
            requestData += `&fileId=${fileId}`;
            console.log('🔍 Added fileId to request');
        }
        
        console.log('🔍 Final request data:', requestData);
        
        return fetch('/benutzer/postfach.htm', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: requestData
        })
        .then(response => {
            console.log('🔍 Send message response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('🔍 Send message response data:', data);
            return { success: true, data, requestData };
        })
        .catch(error => {
            console.error('🔍 Send message error:', error);
            return { error: error.message, requestData };
        });
    }, threadId, userId, messageText, fileId);
    
    log('info', 'sendMessage result', result);
    displayResult('sendResult', result, result.success ? 'success' : 'error');
}, 'sendMessage'));

// Extract Chat Data
document.getElementById('extractChatData').addEventListener('click', wrapApiCall(async () => {
    log('info', 'extractChatData called');
    
    const result = await executeInTab(() => {
        console.log('🔍 Extracting chat data');
        
        const chatElements = document.querySelectorAll('.clsy-c-mbx-threads-item');
        const chats = [];
        
        chatElements.forEach((element, index) => {
            const threadId = element.getAttribute('data-mailbox-thread-id');
            const messageId = element.getAttribute('data-message-id');
            const title = element.querySelector('.clsy-c-mbx-threads-item__title')?.textContent?.trim();
            const nickname = element.querySelector('.clsy-c-mbx-threads-item__nickname')?.textContent?.trim();
            const message = element.querySelector('.clsy-c-mbx-threads-item__message')?.textContent?.trim();
            const profileLink = element.querySelector('.clsy-c-mbx-threads-item__profile-link')?.href;
            const unreadBadge = element.querySelector('.clsy-count-badge-content')?.textContent?.trim();
            const totalMessages = element.querySelector('.clsy-c-mbx-threads-item__messagecount')?.textContent?.trim();
            
            chats.push({
                index,
                threadId,
                messageId,
                title,
                nickname,
                message,
                profileLink,
                unreadMessages: unreadBadge ? parseInt(unreadBadge) : 0,
                totalMessages: totalMessages ? parseInt(totalMessages) : 0,
                isNewChat: unreadBadge && totalMessages && parseInt(unreadBadge) === parseInt(totalMessages) && parseInt(totalMessages) === 1
            });
        });
        
        console.log('🔍 Found chat elements:', chats.length);
        
        return {
            totalChats: chats.length,
            chats: chats.slice(0, 5) // Show first 5 for brevity
        };
    });
    
    log('info', 'extractChatData result', result);
    displayResult('extractResult', result);
}, 'extractChatData'));

// Extract User IDs
document.getElementById('extractUserIds').addEventListener('click', wrapApiCall(async () => {
    log('info', 'extractUserIds called');
    
    const result = await executeInTab(() => {
        console.log('🔍 Extracting user IDs');
        
        const userIds = [];
        
        // Try to get from session data
        if (window.clsyDataLayer && window.clsyDataLayer[0] && window.clsyDataLayer[0].loggedInUserId) {
            userIds.push({
                source: 'clsyDataLayer',
                userId: window.clsyDataLayer[0].loggedInUserId
            });
            console.log('🔍 Found user ID in clsyDataLayer');
        }
        
        // Extract from profile links
        const profileLinks = document.querySelectorAll('a[href*="userId,"]');
        profileLinks.forEach((link, index) => {
            const match = link.href.match(/userId,(\d+)/);
            if (match && index < 10) { // Limit to first 10
                userIds.push({
                    source: 'profileLink',
                    userId: match[1],
                    href: link.href,
                    text: link.textContent?.trim()
                });
            }
        });
        
        console.log('🔍 Found profile links:', profileLinks.length);
        
        return {
            totalFound: userIds.length,
            userIds: userIds
        };
    });
    
    log('info', 'extractUserIds result', result);
    displayResult('extractResult', result);
}, 'extractUserIds'));

// Get Session Info
document.getElementById('getSessionInfo').addEventListener('click', wrapApiCall(async () => {
    log('info', 'getSessionInfo called');
    
    const result = await executeInTab(() => {
        console.log('🔍 Extracting session info');
        
        return {
            cookies: document.cookie.split(';').map(c => c.trim()).slice(0, 5), // First 5 cookies
            sessionStorage: Object.keys(sessionStorage).length,
            localStorage: Object.keys(localStorage).length,
            clsyDataLayer: window.clsyDataLayer ? {
                available: true,
                loggedInUserId: window.clsyDataLayer[0]?.loggedInUserId,
                keys: Object.keys(window.clsyDataLayer[0] || {})
            } : { available: false },
            userAgent: navigator.userAgent,
            currentUrl: window.location.href
        };
    });
    
    log('info', 'getSessionInfo result', result);
    displayResult('sessionResult', result);
}, 'getSessionInfo'));

// Auto-populate fields if on a chat page
document.addEventListener('DOMContentLoaded', async () => {
    const pageInfo = await executeInTab(() => {
        const threadId = new URLSearchParams(window.location.search).get('threadId');
        const userId = window.clsyDataLayer?.[0]?.loggedInUserId;
        
        return { threadId, userId };
    });
    
    if (pageInfo.threadId) {
        document.getElementById('threadId').value = pageInfo.threadId;
    }
    
    if (pageInfo.userId) {
        document.getElementById('userId').value = pageInfo.userId;
    }
});

// Enhanced error handling for all API calls
function wrapApiCall(apiFunction, buttonId) {
    return async () => {
        const button = document.getElementById(buttonId);
        const originalText = button.textContent;
        
        try {
            button.textContent = '⏳ Loading...';
            button.disabled = true;
            
            log('info', `API call started: ${buttonId}`);
            await apiFunction();
            log('info', `API call completed: ${buttonId}`);
            
        } catch (error) {
            log('error', `API call failed: ${buttonId}`, { error: error.message });
        } finally {
            button.textContent = originalText;
            button.disabled = false;
        }
    };
}

// Debug controls
document.getElementById('viewLogs').addEventListener('click', async () => {
    log('info', 'Viewing extension logs');
    
    if (chrome.storage) {
        chrome.storage.local.get(['extensionLogs'], (result) => {
            const logs = result.extensionLogs || [];
            displayResult('debugResult', { 
                totalLogs: logs.length,
                recentLogs: logs.slice(-10) // Show last 10 logs
            });
        });
    } else {
        displayResult('debugResult', { error: 'Chrome storage not available' }, 'error');
    }
});

document.getElementById('clearLogs').addEventListener('click', async () => {
    log('info', 'Clearing extension logs');
    
    if (chrome.storage) {
        chrome.storage.local.set({ extensionLogs: [] }, () => {
            displayResult('debugResult', { message: 'Logs cleared successfully' }, 'success');
        });
    } else {
        displayResult('debugResult', { error: 'Chrome storage not available' }, 'error');
    }
});

// Enhanced error handling for all API calls
function wrapApiCall(apiFunction, buttonId) {
    return async () => {
        const button = document.getElementById(buttonId);
        const originalText = button.textContent;
        
        try {
            button.textContent = '⏳ Loading...';
            button.disabled = true;
            
            log('info', `API call started: ${buttonId}`);
            await apiFunction();
            log('info', `API call completed: ${buttonId}`);
            
        } catch (error) {
            log('error', `API call failed: ${buttonId}`, { error: error.message });
        } finally {
            button.textContent = originalText;
            button.disabled = false;
        }
    };
}

// Test Chrome APIs availability
document.addEventListener('DOMContentLoaded', () => {
    log('info', 'Extension popup loaded');
    
    // Test Chrome APIs
    const apiTests = {
        'chrome.tabs': !!chrome.tabs,
        'chrome.scripting': !!chrome.scripting,
        'chrome.storage': !!chrome.storage,
        'chrome.runtime': !!chrome.runtime
    };
    
    log('info', 'Chrome APIs availability', apiTests);
    
    // Display API status in console
    console.log('🔍 Chrome APIs Status:', apiTests);
    
    // Auto-populate fields if possible
    setTimeout(async () => {
        try {
            const pageInfo = await executeInTab(() => {
                const threadId = new URLSearchParams(window.location.search).get('threadId');
                const userId = window.clsyDataLayer?.[0]?.loggedInUserId;
                
                return { threadId, userId, url: window.location.href };
            });
            
            if (pageInfo && !pageInfo.error) {
                if (pageInfo.threadId) {
                    document.getElementById('threadId').value = pageInfo.threadId;
                    log('info', 'Auto-populated threadId', { threadId: pageInfo.threadId });
                }
                
                if (pageInfo.userId) {
                    document.getElementById('userId').value = pageInfo.userId;
                    log('info', 'Auto-populated userId', { userId: pageInfo.userId });
                }
            }
        } catch (error) {
            log('error', 'Auto-population failed', { error: error.message });
        }
    }, 1000);
});