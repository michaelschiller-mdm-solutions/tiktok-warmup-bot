// Mouse Tracking Detection Test
// Tests what mouse data Instagram can potentially collect

async function testMouseTrackingDetection() {
    console.log('\n🕵️ MOUSE TRACKING DETECTION TEST');
    console.log('==================================');
    
    // Test what data Instagram can collect
    const trackingData = {
        mouseEvents: [],
        timingData: [],
        behaviorMetrics: {}
    };
    
    console.log('\n1️⃣ Setting up Mouse Event Listeners...');
    
    // Simulate Instagram's potential tracking
    const eventTypes = ['mousemove', 'mousedown', 'mouseup', 'click'];
    const startTime = Date.now();
    
    eventTypes.forEach(eventType => {
        document.addEventListener(eventType, (e) => {
            const eventData = {
                type: eventType,
                timestamp: Date.now() - startTime,
                x: e.clientX,
                y: e.clientY,
                screenX: e.screenX,
                screenY: e.screenY,
                button: e.button,
                buttons: e.buttons,
                target: e.target.tagName,
                isTrusted: e.isTrusted // Key detection point!
            };
            
            trackingData.mouseEvents.push(eventData);
            
            // Calculate movement metrics
            if (eventType === 'mousemove' && trackingData.mouseEvents.length > 1) {
                const prevEvent = trackingData.mouseEvents[trackingData.mouseEvents.length - 2];
                if (prevEvent.type === 'mousemove') {
                    const distance = Math.sqrt(
                        Math.pow(e.clientX - prevEvent.x, 2) + 
                        Math.pow(e.clientY - prevEvent.y, 2)
                    );
                    const timeDiff = eventData.timestamp - prevEvent.timestamp;
                    const speed = distance / timeDiff;
                    
                    trackingData.timingData.push({
                        distance,
                        timeDiff,
                        speed,
                        acceleration: speed - (trackingData.timingData[trackingData.timingData.length - 1]?.speed || 0)
                    });
                }
            }
        });
    });
    
    console.log('✅ Event listeners set up');
    
    // Test human behavior simulation
    console.log('\n2️⃣ Testing Human Behavior Simulation...');
    
    try {
        // Initialize human behavior
        const humanBehavior = new HumanBehaviorSimulator();
        
        // Find a test element (search button)
        const searchSvg = document.querySelector('svg[aria-label="Search"]');
        const searchButton = searchSvg?.closest('a');
        
        if (searchButton) {
            console.log('✅ Found test element for mouse simulation');
            
            // Simulate mouse movement
            console.log('🎯 Simulating mouse movement...');
            await humanBehavior.navigateToElement(searchButton);
            
            // Wait for events to be captured
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            console.log('✅ Mouse simulation completed');
        } else {
            console.log('⚠️  No test element found, using random movement');
            
            // Simulate random movement
            const randomTarget = {
                getBoundingClientRect: () => ({
                    left: Math.random() * window.innerWidth,
                    top: Math.random() * window.innerHeight,
                    width: 100,
                    height: 50
                })
            };
            
            await humanBehavior.navigateToElement(randomTarget);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
    } catch (error) {
        console.log('⚠️  Human behavior simulation failed:', error.message);
    }
    
    // Analyze collected data
    console.log('\n3️⃣ Analyzing Collected Tracking Data...');
    
    const analysis = {
        totalEvents: trackingData.mouseEvents.length,
        eventTypes: {},
        trustedEvents: 0,
        untrustedEvents: 0,
        averageSpeed: 0,
        speedVariation: 0,
        suspiciousPatterns: []
    };
    
    // Count event types
    trackingData.mouseEvents.forEach(event => {
        analysis.eventTypes[event.type] = (analysis.eventTypes[event.type] || 0) + 1;
        
        if (event.isTrusted) {
            analysis.trustedEvents++;
        } else {
            analysis.untrustedEvents++;
        }
    });
    
    // Calculate speed metrics
    if (trackingData.timingData.length > 0) {
        const speeds = trackingData.timingData.map(d => d.speed).filter(s => s > 0 && s < 100);
        analysis.averageSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
        
        const speedVariance = speeds.reduce((sum, speed) => sum + Math.pow(speed - analysis.averageSpeed, 2), 0) / speeds.length;
        analysis.speedVariation = Math.sqrt(speedVariance);
    }
    
    // Detect suspicious patterns
    const untrustedRatio = analysis.untrustedEvents / analysis.totalEvents;
    if (untrustedRatio > 0.5) {
        analysis.suspiciousPatterns.push('High ratio of untrusted events (likely automated)');
    }
    
    if (analysis.speedVariation < 0.1) {
        analysis.suspiciousPatterns.push('Very consistent speed (unnatural)');
    }
    
    if (trackingData.timingData.some(d => d.timeDiff === 0)) {
        analysis.suspiciousPatterns.push('Zero-time movements detected (impossible for humans)');
    }
    
    // Check for perfect geometric patterns
    const movements = trackingData.mouseEvents.filter(e => e.type === 'mousemove');
    if (movements.length > 3) {
        let straightLineCount = 0;
        for (let i = 2; i < movements.length; i++) {
            const p1 = movements[i-2];
            const p2 = movements[i-1];
            const p3 = movements[i];
            
            // Check if three points are nearly collinear
            const slope1 = (p2.y - p1.y) / (p2.x - p1.x);
            const slope2 = (p3.y - p2.y) / (p3.x - p2.x);
            
            if (Math.abs(slope1 - slope2) < 0.01) {
                straightLineCount++;
            }
        }
        
        if (straightLineCount > movements.length * 0.7) {
            analysis.suspiciousPatterns.push('Too many straight-line movements');
        }
    }
    
    // Display results
    console.log('\n4️⃣ Detection Analysis Results...');
    console.log('================================');
    
    console.log('📊 Event Statistics:');
    console.log(`   Total Events: ${analysis.totalEvents}`);
    console.log(`   Event Types:`, analysis.eventTypes);
    console.log(`   Trusted Events: ${analysis.trustedEvents} (${(analysis.trustedEvents/analysis.totalEvents*100).toFixed(1)}%)`);
    console.log(`   Untrusted Events: ${analysis.untrustedEvents} (${(analysis.untrustedEvents/analysis.totalEvents*100).toFixed(1)}%)`);
    
    console.log('\n🏃 Movement Metrics:');
    console.log(`   Average Speed: ${analysis.averageSpeed.toFixed(2)} px/ms`);
    console.log(`   Speed Variation: ${analysis.speedVariation.toFixed(2)}`);
    console.log(`   Timing Data Points: ${trackingData.timingData.length}`);
    
    console.log('\n🚨 Suspicious Patterns:');
    if (analysis.suspiciousPatterns.length === 0) {
        console.log('   ✅ No suspicious patterns detected');
    } else {
        analysis.suspiciousPatterns.forEach((pattern, index) => {
            console.log(`   ${index + 1}. ⚠️  ${pattern}`);
        });
    }
    
    // Risk assessment
    console.log('\n🎯 Risk Assessment:');
    const riskScore = analysis.suspiciousPatterns.length;
    
    if (riskScore === 0) {
        console.log('   ✅ LOW RISK - Behavior appears natural');
    } else if (riskScore <= 2) {
        console.log('   ⚠️  MEDIUM RISK - Some suspicious patterns detected');
    } else {
        console.log('   ❌ HIGH RISK - Multiple automation indicators');
    }
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    
    if (analysis.untrustedEvents > analysis.trustedEvents) {
        console.log('   • Reduce programmatic events, increase user-initiated actions');
    }
    
    if (analysis.speedVariation < 0.5) {
        console.log('   • Increase speed variation in mouse movements');
    }
    
    if (analysis.suspiciousPatterns.includes('Too many straight-line movements')) {
        console.log('   • Use more curved, natural mouse paths');
    }
    
    console.log('   • Add random idle movements between actions');
    console.log('   • Vary timing patterns between sessions');
    console.log('   • Include natural human errors and corrections');
    
    return {
        analysis,
        trackingData: {
            eventCount: trackingData.mouseEvents.length,
            timingPoints: trackingData.timingData.length
        },
        riskLevel: riskScore === 0 ? 'LOW' : riskScore <= 2 ? 'MEDIUM' : 'HIGH'
    };
}

// Auto-run the test
console.log('🔄 Starting Mouse Tracking Detection Test...');
testMouseTrackingDetection().then(result => {
    console.log('\n📊 FINAL ASSESSMENT:', result);
});