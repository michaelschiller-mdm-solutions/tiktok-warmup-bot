/*
 * Markt.de API Interceptor - Popup Script
 * UI for viewing captured API calls
 */

console.log('🔍 API Interceptor Popup Loaded');

let capturedCalls = [];

// DOM elements
const totalCallsEl = document.getElementById('totalCalls');
const relevantCallsEl = document.getElementById('relevantCalls');
const lastUpdatedEl = document.getElementById('lastUpdated');
const callsListEl = document.getElementById('callsList');
const refreshBtn = document.getElementById('refreshBtn');
const clearBtn = document.getElementById('clearBtn');
const exportBtn = document.getElementById('exportBtn');

// Load captured calls
function loadCapturedCalls() {
    chrome.runtime.sendMessage({ action: 'getCapturedCalls' }, (response) => {
        if (response && response.calls) {
            capturedCalls = response.calls;
            updateUI();
        }
    });
}

// Update UI with captured calls
function updateUI() {
    // Update stats
    totalCallsEl.textContent = capturedCalls.length;
    
    const relevantCalls = capturedCalls.filter(call => 
        call.url.toLowerCase().includes('message') ||
        call.url.toLowerCase().includes('chat') ||
        call.url.toLowerCase().includes('postfach') ||
        call.url.toLowerCase().includes('ajax')
    );
    relevantCallsEl.textContent = relevantCalls.length;
    
    lastUpdatedEl.textContent = new Date().toLocaleTimeString();
    
    // Update calls list
    if (capturedCalls.length === 0) {
        callsListEl.innerHTML = '<div class="no-calls">No API calls captured yet</div>';
        return;
    }
    
    const callsHtml = capturedCalls
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .map(call => {
            const time = new Date(call.timestamp).toLocaleTimeString();
            const url = call.url.length > 60 ? call.url.substring(0, 60) + '...' : call.url;
            
            return `
                <div class="call-item">
                    <div class="call-method">${call.method || 'GET'}</div>
                    <div class="call-url">${url}</div>
                    <div class="call-time">${time} ${call.source ? `(${call.source})` : ''}</div>
                </div>
            `;
        })
        .join('');
    
    callsListEl.innerHTML = callsHtml;
}

// Clear captured calls
function clearCalls() {
    if (confirm('Clear all captured API calls?')) {
        chrome.runtime.sendMessage({ action: 'clearCalls' }, (response) => {
            if (response && response.success) {
                capturedCalls = [];
                updateUI();
            }
        });
    }
}

// Export captured calls
function exportCalls() {
    if (capturedCalls.length === 0) {
        alert('No API calls to export');
        return;
    }
    
    const exportData = {
        timestamp: new Date().toISOString(),
        totalCalls: capturedCalls.length,
        calls: capturedCalls.map(call => ({
            timestamp: call.timestamp,
            method: call.method,
            url: call.url,
            requestData: call.requestData,
            responseData: call.responseData,
            headers: call.headers,
            statusCode: call.statusCode,
            source: call.source
        }))
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marktde-api-calls-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Event listeners
refreshBtn.addEventListener('click', loadCapturedCalls);
clearBtn.addEventListener('click', clearCalls);
exportBtn.addEventListener('click', exportCalls);

// Load calls on popup open
loadCapturedCalls();

// Auto-refresh every 5 seconds
setInterval(loadCapturedCalls, 5000);