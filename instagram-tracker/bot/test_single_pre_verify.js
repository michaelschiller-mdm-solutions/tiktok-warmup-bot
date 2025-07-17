/**
 * Test script to directly test pre_verify_email.js script
 */

const { spawn } = require('child_process');
const path = require('path');

async function testSinglePreVerify() {
    console.log('🧪 Testing Single Pre-Verification Script');
    console.log('============================================================');
    
    const testAccount = {
        id: 999,
        email: 'oilcxkwtvg@rambler.ru',
        email_password: '4247270JRzeza'
    };
    
    console.log('📧 Test Account:', testAccount);
    console.log('');
    
    const scriptPath = path.join(__dirname, 'scripts/api/pre_verify_email.js');
    
    return new Promise((resolve) => {
        const childProcess = spawn('node', [scriptPath, JSON.stringify(testAccount)], {
            cwd: __dirname,
            detached: false,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let resultOutput = '';
        let errorOutput = '';

        childProcess.stdout.on('data', (data) => {
            const output = data.toString();
            resultOutput += output;
            console.log('📤 STDOUT:', output);
        });

        childProcess.stderr.on('data', (data) => {
            const error = data.toString();
            errorOutput += error;
            console.log('🚨 STDERR:', error);
        });

        childProcess.on('close', (code) => {
            console.log('');
            console.log('📊 PROCESS RESULTS:');
            console.log('----------------------------------------');
            console.log('Exit Code:', code);
            console.log('Result Output:', resultOutput.trim());
            console.log('Error Output:', errorOutput.trim());
            
            try {
                if (code === 0 && resultOutput.trim()) {
                    const result = JSON.parse(resultOutput.trim());
                    console.log('');
                    console.log('✅ PARSED RESULT:');
                    console.log(JSON.stringify(result, null, 2));
                } else {
                    console.log('');
                    console.log('❌ SCRIPT FAILED:');
                    console.log('   Exit code:', code);
                    console.log('   Error:', errorOutput || 'Unknown error');
                }
            } catch (parseError) {
                console.log('');
                console.log('❌ JSON PARSE ERROR:');
                console.log('   Raw output:', resultOutput);
                console.log('   Parse error:', parseError.message);
            }
            
            resolve(code);
        });

        childProcess.on('error', (error) => {
            console.log('');
            console.log('❌ PROCESS ERROR:');
            console.log('   Error:', error.message);
            resolve(1);
        });

        // Timeout after 60 seconds
        setTimeout(() => {
            if (!childProcess.killed) {
                console.log('');
                console.log('⏰ TIMEOUT: Killing process after 60 seconds');
                childProcess.kill();
                resolve(1);
            }
        }, 60000);
    });
}

// Run the test
testSinglePreVerify().then((exitCode) => {
    console.log('');
    console.log('🏁 Test completed with exit code:', exitCode);
}); 