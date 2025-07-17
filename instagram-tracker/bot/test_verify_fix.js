/**
 * Simple test to verify the pre-verification fix works correctly
 */

const { spawn } = require('child_process');
const path = require('path');

async function testScript(accountData, description) {
    console.log(`\n🧪 Testing: ${description}`);
    console.log(`📧 Account:`, accountData);
    
    const scriptPath = path.join(__dirname, 'scripts/api/pre_verify_email.js');
    
    return new Promise((resolve) => {
        const childProcess = spawn('node', [scriptPath, JSON.stringify(accountData)], {
            cwd: __dirname,
            detached: false,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let resultOutput = '';
        let errorOutput = '';

        childProcess.stdout.on('data', (data) => {
            resultOutput += data.toString();
        });

        childProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        childProcess.on('close', (code) => {
            console.log(`   Exit Code: ${code}`);
            console.log(`   STDOUT (JSON): ${resultOutput.trim()}`);
            console.log(`   STDERR (Logs): ${errorOutput.trim().split('\n').slice(0, 2).join(' | ')}`);
            
            try {
                if (code === 0 && resultOutput.trim()) {
                    const result = JSON.parse(resultOutput.trim());
                    console.log(`   ✅ PARSED: ${result.action} - ${result.message}`);
                    resolve({ success: true, result, code });
                } else {
                    console.log(`   ❌ FAILED: Exit ${code}`);
                    resolve({ success: false, error: errorOutput, code });
                }
            } catch (parseError) {
                console.log(`   ❌ JSON PARSE ERROR: ${parseError.message}`);
                console.log(`   Raw output: "${resultOutput}"`);
                resolve({ success: false, error: parseError.message, code });
            }
        });

        setTimeout(() => {
            if (!childProcess.killed) {
                childProcess.kill();
                resolve({ success: false, error: 'timeout', code: -1 });
            }
        }, 30000);
    });
}

async function runTests() {
    console.log('🧪 Pre-Verification Fix Validation');
    console.log('============================================================');
    
    const tests = [
        {
            data: { id: 1, email: 'oilcxkwtvg@rambler.ru', email_password: '4247270JRzeza' },
            desc: 'Valid rambler.ru email (should succeed)'
        },
        {
            data: { id: 2, email: 'fake@nonexistent.com', email_password: 'fake' },
            desc: 'Unsupported domain (should fail cleanly)'
        },
        {
            data: { id: 3, email: 'invalid@gmail.com', email_password: 'wrongpass' },
            desc: 'Gmail with bad password (should fail with auth error)'
        }
    ];
    
    let successCount = 0;
    let failureCount = 0;
    
    for (const test of tests) {
        const result = await testScript(test.data, test.desc);
        
        if (test.desc.includes('should succeed') && result.success) {
            successCount++;
        } else if (test.desc.includes('should fail') && !result.success) {
            successCount++;
        } else {
            failureCount++;
        }
    }
    
    console.log('\n📊 SUMMARY:');
    console.log(`   ✅ Passed: ${successCount}`);
    console.log(`   ❌ Failed: ${failureCount}`);
    console.log(`   📈 Success Rate: ${Math.round(successCount / tests.length * 100)}%`);
    
    if (successCount === tests.length) {
        console.log('\n🎉 ALL TESTS PASSED! Pre-verification fix is working correctly.');
        console.log('   → Frontend should now see proper batch processing');
        console.log('   → No more JSON parse errors');
        console.log('   → Clean success/failure reporting');
    } else {
        console.log('\n⚠️ Some tests failed. Review the output above.');
    }
}

runTests(); 