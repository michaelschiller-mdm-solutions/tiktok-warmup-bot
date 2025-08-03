// Visual Mouse Simulation Test
// Shows visible cursor movement and tests mouse tracking detection

async function testVisualMouseSimulation() {
    console.log('\n🎯 VISUAL MOUSE SIMULATION TEST');
    console.log('===============================');

    // Step 1: Create visual cursor
    console.log('\n1️⃣ Creating Visual Cursor...');

    const cursor = document.createElement('div');
    cursor.id = 'test-automation-cursor';
    cursor.style.cssText = `
        position: fixed;
        width: 12px;
        height: 12px;
        background: #ff4444;
        border: 2px solid #ffffff;
        border-radius: 50%;
        pointer-events: none;
        z-index: 999999;
        box-shadow: 0 0 10px rgba(255, 68, 68, 0.5);
        transition: none;
    `;
    document.body.appendChild(cursor);
    console.log('✅ Visual cursor created');

    // Step 2: Set up tracking
    console.log('\n2️⃣ Setting up Mouse Tracking...');

    const trackingData = {
        events: [],
        startTime: Date.now()
    };

    const trackEvent = (e) => {
        trackingData.events.push({
            type: e.type,
            x: e.clientX,
            y: e.clientY,
            timestamp: Date.now() - trackingData.startTime,
            isTrusted: e.isTrusted
        });
    };

    ['mousemove', 'mousedown', 'mouseup', 'click'].forEach(eventType => {
        document.addEventListener(eventType, trackEvent);
    });

    console.log('✅ Event tracking enabled');

    // Step 3: Simple Human Behavior Implementation
    console.log('\n3️⃣ Implementing Simple Human Behavior...');

    class SimpleHumanBehavior {
        constructor() {
            this.currentPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
            this.updateCursor();
        }

        updateCursor() {
            cursor.style.left = this.currentPos.x + 'px';
            cursor.style.top = this.currentPos.y + 'px';
        }

        async moveToElement(element) {
            if (!element) return;

            const rect = element.getBoundingClientRect();
            const target = {
                x: rect.left + rect.width / 2 + (Math.random() - 0.5) * 20,
                y: rect.top + rect.height / 2 + (Math.random() - 0.5) * 20
            };

            console.log(`🎯 Moving to element at (${target.x.toFixed(1)}, ${target.y.toFixed(1)})`);

            await this.moveToPosition(target);
        }

        async moveToPosition(target) {
            const start = { ...this.currentPos };
            const distance = Math.sqrt(Math.pow(target.x - start.x, 2) + Math.pow(target.y - start.y, 2));

            // Generate curved path
            const path = this.generateCurvedPath(start, target, distance);

            // Execute movement
            for (let i = 0; i < path.length; i++) {
                this.currentPos = path[i];
                this.updateCursor();

                // Dispatch mouse event
                this.dispatchMouseEvent('mousemove', this.currentPos.x, this.currentPos.y);

                // Variable speed
                const speed = 8 + Math.random() * 12;
                await this.delay(speed);
            }

            console.log(`✅ Reached target (${this.currentPos.x.toFixed(1)}, ${this.currentPos.y.toFixed(1)})`);
        }

        generateCurvedPath(start, end, distance) {
            const numPoints = Math.max(20, Math.floor(distance / 10));
            const path = [];

            // Control point for curve
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;
            const curveOffset = (Math.random() - 0.5) * Math.min(100, distance * 0.3);

            const controlPoint = {
                x: midX + curveOffset,
                y: midY + (Math.random() - 0.5) * Math.min(80, distance * 0.2)
            };

            // Generate Bezier curve points
            for (let i = 0; i <= numPoints; i++) {
                const t = i / numPoints;
                const point = this.quadraticBezier(start, controlPoint, end, t);

                // Add micro-jitter
                point.x += (Math.random() - 0.5) * 3;
                point.y += (Math.random() - 0.5) * 3;

                path.push(point);
            }

            return path;
        }

        quadraticBezier(p0, p1, p2, t) {
            const x = Math.pow(1 - t, 2) * p0.x + 2 * (1 - t) * t * p1.x + Math.pow(t, 2) * p2.x;
            const y = Math.pow(1 - t, 2) * p0.y + 2 * (1 - t) * t * p1.y + Math.pow(t, 2) * p2.y;
            return { x, y };
        }

        dispatchMouseEvent(type, x, y) {
            const event = new MouseEvent(type, {
                bubbles: true,
                cancelable: true,
                clientX: x,
                clientY: y,
                screenX: x + window.screenX,
                screenY: y + window.screenY
            });

            const targetElement = document.elementFromPoint(x, y);
            if (targetElement) {
                targetElement.dispatchEvent(event);
            }
        }

        async simulateClick(element) {
            if (!element) return;

            await this.moveToElement(element);
            await this.delay(100 + Math.random() * 200);

            // Visual click feedback
            cursor.style.background = '#00ff00';
            cursor.style.transform = 'scale(0.8)';

            // Dispatch click events
            this.dispatchMouseEvent('mousedown', this.currentPos.x, this.currentPos.y);
            await this.delay(50 + Math.random() * 100);
            this.dispatchMouseEvent('mouseup', this.currentPos.x, this.currentPos.y);
            this.dispatchMouseEvent('click', this.currentPos.x, this.currentPos.y);

            // Reset cursor
            setTimeout(() => {
                cursor.style.background = '#ff4444';
                cursor.style.transform = 'scale(1)';
            }, 200);

            console.log('✅ Click simulated');
        }

        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    }

    const humanBehavior = new SimpleHumanBehavior();
    console.log('✅ Human behavior simulator ready');

    // Step 4: Test Movement Sequence
    console.log('\n4️⃣ Testing Movement Sequence...');

    try {
        // Find search button
        const searchSvg = document.querySelector('svg[aria-label="Search"]');
        const searchButton = searchSvg?.closest('a');

        if (searchButton) {
            console.log('🎯 Moving to search button...');
            await humanBehavior.moveToElement(searchButton);
            await humanBehavior.delay(500);

            // Simulate hover jitter
            console.log('🎯 Simulating hover jitter...');
            for (let i = 0; i < 3; i++) {
                const jitterX = humanBehavior.currentPos.x + (Math.random() - 0.5) * 15;
                const jitterY = humanBehavior.currentPos.y + (Math.random() - 0.5) * 15;
                await humanBehavior.moveToPosition({ x: jitterX, y: jitterY });
                await humanBehavior.delay(100 + Math.random() * 200);
            }

            console.log('✅ Movement sequence completed');
        } else {
            console.log('⚠️  Search button not found, using random targets');

            // Random movement test
            for (let i = 0; i < 3; i++) {
                const randomTarget = {
                    x: 100 + Math.random() * (window.innerWidth - 200),
                    y: 100 + Math.random() * (window.innerHeight - 200)
                };

                console.log(`🎯 Moving to random target ${i + 1}...`);
                await humanBehavior.moveToPosition(randomTarget);
                await humanBehavior.delay(300 + Math.random() * 500);
            }
        }

    } catch (error) {
        console.error('❌ Movement test failed:', error);
    }

    // Step 5: Analyze Tracking Data
    console.log('\n5️⃣ Analyzing Tracking Data...');

    const analysis = {
        totalEvents: trackingData.events.length,
        trustedEvents: trackingData.events.filter(e => e.isTrusted).length,
        untrustedEvents: trackingData.events.filter(e => !e.isTrusted).length,
        eventTypes: {},
        movementMetrics: {
            totalDistance: 0,
            averageSpeed: 0,
            maxSpeed: 0,
            speedVariation: 0
        }
    };

    // Count event types
    trackingData.events.forEach(event => {
        analysis.eventTypes[event.type] = (analysis.eventTypes[event.type] || 0) + 1;
    });

    // Calculate movement metrics
    const moveEvents = trackingData.events.filter(e => e.type === 'mousemove');
    if (moveEvents.length > 1) {
        const speeds = [];
        let totalDistance = 0;

        for (let i = 1; i < moveEvents.length; i++) {
            const prev = moveEvents[i - 1];
            const curr = moveEvents[i];

            const distance = Math.sqrt(Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2));
            const timeDiff = curr.timestamp - prev.timestamp;
            const speed = timeDiff > 0 ? distance / timeDiff : 0;

            if (speed > 0 && speed < 50) { // Filter out unrealistic speeds
                speeds.push(speed);
                totalDistance += distance;
            }
        }

        if (speeds.length > 0) {
            analysis.movementMetrics.totalDistance = totalDistance;
            analysis.movementMetrics.averageSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
            analysis.movementMetrics.maxSpeed = Math.max(...speeds);

            const avgSpeed = analysis.movementMetrics.averageSpeed;
            const variance = speeds.reduce((sum, speed) => sum + Math.pow(speed - avgSpeed, 2), 0) / speeds.length;
            analysis.movementMetrics.speedVariation = Math.sqrt(variance);
        }
    }

    // Display results
    console.log('\n6️⃣ Results Summary...');
    console.log('====================');

    console.log('📊 Event Statistics:');
    console.log(`   Total Events: ${analysis.totalEvents}`);
    console.log(`   Trusted: ${analysis.trustedEvents} (${(analysis.trustedEvents / analysis.totalEvents * 100).toFixed(1)}%)`);
    console.log(`   Untrusted: ${analysis.untrustedEvents} (${(analysis.untrustedEvents / analysis.totalEvents * 100).toFixed(1)}%)`);
    console.log(`   Event Types:`, analysis.eventTypes);

    console.log('\n🏃 Movement Analysis:');
    console.log(`   Total Distance: ${analysis.movementMetrics.totalDistance.toFixed(1)}px`);
    console.log(`   Average Speed: ${analysis.movementMetrics.averageSpeed.toFixed(3)} px/ms`);
    console.log(`   Max Speed: ${analysis.movementMetrics.maxSpeed.toFixed(3)} px/ms`);
    console.log(`   Speed Variation: ${analysis.movementMetrics.speedVariation.toFixed(3)}`);

    // Detection assessment
    console.log('\n🕵️ Detection Assessment:');

    const suspiciousIndicators = [];

    if (analysis.untrustedEvents > analysis.trustedEvents) {
        suspiciousIndicators.push('High ratio of untrusted events');
    }

    if (analysis.movementMetrics.speedVariation < 0.1) {
        suspiciousIndicators.push('Very consistent speed (unnatural)');
    }

    if (analysis.movementMetrics.averageSpeed > 2.0) {
        suspiciousIndicators.push('Very fast movement (superhuman)');
    }

    if (suspiciousIndicators.length === 0) {
        console.log('   ✅ Movement appears natural');
    } else {
        console.log('   ⚠️  Suspicious indicators detected:');
        suspiciousIndicators.forEach((indicator, index) => {
            console.log(`      ${index + 1}. ${indicator}`);
        });
    }

    // Cleanup
    setTimeout(() => {
        console.log('\n🧹 Cleaning up...');
        cursor.remove();
        ['mousemove', 'mousedown', 'mouseup', 'click'].forEach(eventType => {
            document.removeEventListener(eventType, trackEvent);
        });
        console.log('✅ Test completed and cleaned up');
    }, 2000);

    return {
        success: true,
        analysis,
        suspiciousIndicators,
        riskLevel: suspiciousIndicators.length === 0 ? 'LOW' : suspiciousIndicators.length <= 2 ? 'MEDIUM' : 'HIGH'
    };
}

// Auto-run the test
console.log('🔄 Starting Visual Mouse Simulation Test...');
console.log('👀 Watch for the red cursor moving around the page!');

testVisualMouseSimulation().then(result => {
    console.log('\n🎯 FINAL RESULT:', result);
}).catch(error => {
    console.error('❌ Test failed:', error);
});