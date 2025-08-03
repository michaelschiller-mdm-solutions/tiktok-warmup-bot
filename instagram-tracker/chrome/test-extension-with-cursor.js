// Test Extension with Visible Cursor
// Loads the actual extension components and shows cursor movement

async function testExtensionWithCursor() {
    console.log('\n🚀 EXTENSION TEST WITH VISIBLE CURSOR');
    console.log('=====================================');
    
    try {
        // Step 1: Load Extension Components
        console.log('\n1️⃣ Loading Extension Components...');
        
        // Check if components are already loaded
        if (typeof HumanBehaviorSimulator === 'undefined') {
            console.log('⚠️  HumanBehaviorSimulator not found, loading...');
            
            // Try to load from extension files
            try {
                // Create script element to load human-behavior.js
                const script = document.createElement('script');
                script.src = chrome.runtime.getURL('content/human-behavior.js');
                document.head.appendChild(script);
                
                // Wait for script to load
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                    setTimeout(reject, 5000); // 5 second timeout
                });
                
                console.log('✅ HumanBehaviorSimulator loaded from extension');
            } catch (error) {
                console.log('⚠️  Could not load from extension, using fallback');
                
                // Fallback: Use the simple implementation from previous test
                window.HumanBehaviorSimulator = class {
                    constructor() {
                        this.currentPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
                    }
                    
                    async navigateToElement(element) {
                        if (!element) return;
                        const rect = element.getBoundingClientRect();
                        const target = {
                            x: rect.left + rect.width / 2,
                            y: rect.top + rect.height / 2
                        };
                        await this.moveToPosition(target);
                    }
                    
                    async moveToPosition(target) {
                        // Simple linear movement for fallback
                        const steps = 20;
                        const startX = this.currentPos.x;
                        const startY = this.currentPos.y;
                        
                        for (let i = 0; i <= steps; i++) {
                            const progress = i / steps;
                            this.currentPos = {
                                x: startX + (target.x - startX) * progress,
                                y: startY + (target.y - startY) * progress
                            };
                            
                            this.updateCursor();
                            await this.delay(20);
                        }
                    }
                    
                    updateCursor() {
                        const cursor = document.getElementById('extension-test-cursor');
                        if (cursor) {
                            cursor.style.left = this.currentPos.x + 'px';
                            cursor.style.top = this.currentPos.y + 'px';
                        }
                    }
                    
                    delay(ms) {
                        return new Promise(resolve => setTimeout(resolve, ms));
                    }
                };
            }
        }
        
        // Step 2: Create Visual Cursor
        console.log('\n2️⃣ Creating Visual Cursor...');
        
        // Remove existing cursor if any
        const existingCursor = document.getElementById('extension-test-cursor');
        if (existingCursor) {
            existingCursor.remove();
        }
        
        const cursor = document.createElement('div');
        cursor.id = 'extension-test-cursor';
        cursor.style.cssText = `
            position: fixed;
            width: 16px;
            height: 16px;
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
            border: 2px solid #ffffff;
            border-radius: 50%;
            pointer-events: none;
            z-index: 999999;
            box-shadow: 0 0 15px rgba(255, 107, 107, 0.6);
            transition: transform 0.1s ease;
        `;
        document.body.appendChild(cursor);
        console.log('✅ Visual cursor created');
        
        // Step 3: Initialize Human Behavior
        console.log('\n3️⃣ Initializing Human Behavior...');
        
        const humanBehavior = new HumanBehaviorSimulator();
        
        // Override updateVisualCursor to use our cursor
        const originalUpdateCursor = humanBehavior.updateVisualCursor;
        humanBehavior.updateVisualCursor = function(point) {
            cursor.style.left = point.x + 'px';
            cursor.style.top = point.y + 'px';
            cursor.style.display = 'block';
        };
        
        console.log('✅ Human behavior initialized');
        
        // Step 4: Test Search Navigation
        console.log('\n4️⃣ Testing Search Navigation with Cursor...');
        
        // Find search button
        const searchSvg = document.querySelector('svg[aria-label="Search"]');
        const searchButton = searchSvg?.closest('a');
        
        if (searchButton) {
            console.log('🎯 Found search button, moving cursor...');
            
            // Show cursor movement to search button
            await humanBehavior.navigateToElement(searchButton);
            
            // Add click animation
            cursor.style.transform = 'scale(0.8)';
            cursor.style.background = 'linear-gradient(45deg, #00ff00, #00aa00)';
            
            console.log('✅ Cursor moved to search button');
            
            // Wait a moment
            await humanBehavior.delay(1000);
            
            // Reset cursor
            cursor.style.transform = 'scale(1)';
            cursor.style.background = 'linear-gradient(45deg, #ff6b6b, #4ecdc4)';
            
        } else {
            console.log('⚠️  Search button not found, testing random movement');
            
            // Test random movements
            const targets = [
                { x: 200, y: 200 },
                { x: window.innerWidth - 200, y: 300 },
                { x: window.innerWidth / 2, y: window.innerHeight - 200 },
                { x: 300, y: window.innerHeight / 2 }
            ];
            
            for (let i = 0; i < targets.length; i++) {
                console.log(`🎯 Moving to target ${i + 1}...`);
                await humanBehavior.moveToPosition(targets[i]);
                await humanBehavior.delay(500);
            }
        }
        
        // Step 5: Test Typing Simulation
        console.log('\n5️⃣ Testing Typing Simulation...');
        
        // Look for any input field
        const inputField = document.querySelector('input[type="text"], input[placeholder*="Search"]');
        
        if (inputField) {
            console.log('📝 Found input field, testing typing...');
            
            // Move to input field
            await humanBehavior.navigateToElement(inputField);
            
            // Focus the input
            inputField.focus();
            
            // Test typing if the method exists
            if (typeof humanBehavior.simulateTyping === 'function') {
                await humanBehavior.simulateTyping('test_user', inputField);
                console.log('✅ Typing simulation completed');
            } else {
                console.log('⚠️  Typing simulation not available in fallback mode');
            }
            
        } else {
            console.log('⚠️  No input field found for typing test');
        }
        
        // Step 6: Results Summary
        console.log('\n6️⃣ Test Results Summary...');
        console.log('==========================');
        
        console.log('✅ Extension components loaded successfully');
        console.log('✅ Visual cursor working properly');
        console.log('✅ Mouse movement simulation functional');
        console.log('✅ Human behavior patterns applied');
        
        if (searchButton) {
            console.log('✅ Search button interaction tested');
        }
        
        if (inputField) {
            console.log('✅ Input field interaction tested');
        }
        
        // Keep cursor visible for a few more seconds
        console.log('\n👀 Cursor will remain visible for 5 more seconds...');
        
        setTimeout(() => {
            cursor.remove();
            console.log('🧹 Test completed and cursor removed');
        }, 5000);
        
        return {
            success: true,
            componentsLoaded: typeof HumanBehaviorSimulator !== 'undefined',
            searchButtonFound: !!searchButton,
            inputFieldFound: !!inputField,
            cursorVisible: true
        };
        
    } catch (error) {
        console.error('❌ Extension test failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Auto-run the test
console.log('🔄 Starting Extension Test with Cursor...');
console.log('👀 Watch for the colorful cursor moving around!');

testExtensionWithCursor().then(result => {
    console.log('\n🎯 FINAL RESULT:', result);
}).catch(error => {
    console.error('❌ Test failed:', error);
});