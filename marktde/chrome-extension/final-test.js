/*
 * Final Integration Test - Complete extension functionality validation
 * Tests the entire extension workflow and optimizes performance
 */

const fs = require('fs');
const path = require('path');

class FinalIntegrationTester {
  constructor() {
    this.testResults = {
      integrationTests: { passed: 0, failed: 0, errors: [] },
      performanceTests: { passed: 0, failed: 0, errors: [] },
      optimizations: []
    };
  }

  // Main test runner
  async runFinalTests() {
    console.log('🎯 Starting Final Integration Tests for Markt.de DM Bot Extension\n');
    
    try {
      // Run integration tests
      await this.runIntegrationTests();
      
      // Run performance tests
      await this.runPerformanceTests();
      
      // Run optimization checks
      await this.runOptimizationChecks();
      
      // Generate final report
      await this.generateFinalReport();
      
      // Report results
      this.reportFinalResults();
      
    } catch (error) {
      console.error('❌ Final testing failed:', error);
      process.exit(1);
    }
  }

  // Integration Tests
  async runIntegrationTests() {
    console.log('🔗 Running Integration Tests...\n');
    
    // Test 1: Extension Structure Integrity
    await this.testExtensionStructure();
    
    // Test 2: Module Dependencies
    await this.testModuleDependencies();
    
    // Test 3: Message Flow
    await this.testMessageFlow();
    
    // Test 4: Data Flow
    await this.testDataFlow();
    
    // Test 5: Error Handling Integration
    await this.testErrorHandlingIntegration();
    
    console.log('');
  }

  // Test extension structure integrity
  async testExtensionStructure() {
    console.log('📁 Testing Extension Structure Integrity...');
    
    try {
      // Check all required files exist and are valid
      const criticalFiles = [
        { path: 'manifest.json', type: 'json' },
        { path: 'background.js', type: 'js' },
        { path: 'popup/popup.html', type: 'html' },
        { path: 'popup/popup.js', type: 'js' },
        { path: 'popup/popup.css', type: 'css' },
        { path: 'content/content-script.js', type: 'js' },
        { path: 'content/markt-interface.js', type: 'js' },
        { path: 'content/automation-engine.js', type: 'js' },
        { path: 'content/human-behavior.js', type: 'js' },
        { path: 'utils/storage-manager.js', type: 'js' },
        { path: 'utils/csv-parser.js', type: 'js' },
        { path: 'utils/logger.js', type: 'js' },
        { path: 'utils/error-handler.js', type: 'js' }
      ];

      let allFilesValid = true;
      
      for (const file of criticalFiles) {
        if (!fs.existsSync(file.path)) {
          this.addIntegrationError(`Critical file missing: ${file.path}`);
          allFilesValid = false;
          continue;
        }
        
        const content = fs.readFileSync(file.path, 'utf8');
        
        // Basic validation based on file type
        switch (file.type) {
          case 'json':
            try {
              JSON.parse(content);
            } catch (e) {
              this.addIntegrationError(`Invalid JSON in ${file.path}: ${e.message}`);
              allFilesValid = false;
            }
            break;
            
          case 'js':
            // Check for basic JavaScript structure
            if (!content.includes('class ') && !content.includes('function ')) {
              this.addIntegrationError(`${file.path} appears to be empty or invalid`);
              allFilesValid = false;
            }
            break;
            
          case 'html':
            if (!content.includes('<html') || !content.includes('</html>')) {
              this.addIntegrationError(`${file.path} is not valid HTML`);
              allFilesValid = false;
            }
            break;
            
          case 'css':
            // Basic CSS validation
            if (content.trim().length === 0) {
              this.addIntegrationError(`${file.path} is empty`);
              allFilesValid = false;
            }
            break;
        }
      }
      
      if (allFilesValid) {
        this.testResults.integrationTests.passed++;
        console.log('   ✅ All critical files are present and valid');
      }
      
    } catch (error) {
      this.addIntegrationError(`Structure test failed: ${error.message}`);
    }
  }

  // Test module dependencies
  async testModuleDependencies() {
    console.log('🔧 Testing Module Dependencies...');
    
    try {
      // Check content script dependencies
      const contentScript = fs.readFileSync('content/content-script.js', 'utf8');
      const requiredClasses = ['Logger', 'StorageManager', 'HumanBehavior', 'MarktInterface', 'AutomationEngine'];
      
      let dependenciesValid = true;
      
      for (const className of requiredClasses) {
        if (!contentScript.includes(className)) {
          this.addIntegrationError(`Content script missing reference to ${className}`);
          dependenciesValid = false;
        }
      }
      
      // Check manifest content script loading order
      const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
      const scriptOrder = manifest.content_scripts[0].js;
      
      // Verify dependencies are loaded before dependents
      const expectedOrder = [
        'utils/logger.js',
        'utils/storage-manager.js',
        'utils/csv-parser.js',
        'utils/error-handler.js',
        'content/human-behavior.js',
        'content/markt-interface.js',
        'content/automation-engine.js',
        'content/content-script.js'
      ];
      
      for (let i = 0; i < expectedOrder.length - 1; i++) {
        const currentIndex = scriptOrder.indexOf(expectedOrder[i]);
        const nextIndex = scriptOrder.indexOf(expectedOrder[i + 1]);
        
        if (currentIndex === -1 || nextIndex === -1 || currentIndex >= nextIndex) {
          this.addIntegrationError(`Script loading order issue: ${expectedOrder[i]} should load before ${expectedOrder[i + 1]}`);
          dependenciesValid = false;
        }
      }
      
      if (dependenciesValid) {
        this.testResults.integrationTests.passed++;
        console.log('   ✅ Module dependencies are correctly configured');
      }
      
    } catch (error) {
      this.addIntegrationError(`Dependency test failed: ${error.message}`);
    }
  }

  // Test message flow
  async testMessageFlow() {
    console.log('💬 Testing Message Flow...');
    
    try {
      // Check background script message handling
      const backgroundScript = fs.readFileSync('background.js', 'utf8');
      const popupScript = fs.readFileSync('popup/popup.js', 'utf8');
      const contentScript = fs.readFileSync('content/content-script.js', 'utf8');
      
      let messageFlowValid = true;
      
      // Check background script can handle messages
      if (!backgroundScript.includes('chrome.runtime.onMessage.addListener')) {
        this.addIntegrationError('Background script does not handle messages');
        messageFlowValid = false;
      }
      
      // Check background script can send messages to content script
      if (!backgroundScript.includes('chrome.tabs.sendMessage')) {
        this.addIntegrationError('Background script cannot send messages to content script');
        messageFlowValid = false;
      }
      
      // Check popup can send messages to background
      if (!popupScript.includes('chrome.runtime.sendMessage')) {
        this.addIntegrationError('Popup cannot send messages to background');
        messageFlowValid = false;
      }
      
      // Check content script can handle and send messages
      if (!contentScript.includes('chrome.runtime.onMessage.addListener')) {
        this.addIntegrationError('Content script does not handle messages');
        messageFlowValid = false;
      }
      
      if (!contentScript.includes('chrome.runtime.sendMessage')) {
        this.addIntegrationError('Content script cannot send messages');
        messageFlowValid = false;
      }
      
      // Check for message handler setup
      const expectedHandlers = [
        'start_campaign',
        'stop_campaign',
        'login',
        'upload_csv',
        'get_status'
      ];
      
      for (const handler of expectedHandlers) {
        if (!backgroundScript.includes(handler) && !contentScript.includes(handler)) {
          this.addIntegrationError(`Missing message handler for: ${handler}`);
          messageFlowValid = false;
        }
      }
      
      if (messageFlowValid) {
        this.testResults.integrationTests.passed++;
        console.log('   ✅ Message flow is properly configured');
      }
      
    } catch (error) {
      this.addIntegrationError(`Message flow test failed: ${error.message}`);
    }
  }

  // Test data flow
  async testDataFlow() {
    console.log('📊 Testing Data Flow...');
    
    try {
      const storageManager = fs.readFileSync('utils/storage-manager.js', 'utf8');
      const csvParser = fs.readFileSync('utils/csv-parser.js', 'utf8');
      
      let dataFlowValid = true;
      
      // Check storage operations
      const storageOperations = [
        'saveTargetAccounts',
        'loadTargetAccounts',
        'saveContactedAccounts',
        'loadContactedAccounts',
        'markAccountAsContacted'
      ];
      
      for (const operation of storageOperations) {
        if (!storageManager.includes(operation)) {
          this.addIntegrationError(`Missing storage operation: ${operation}`);
          dataFlowValid = false;
        }
      }
      
      // Check CSV operations
      const csvOperations = [
        'parseCSV',
        'generateCSV',
        'validateAccountsData'
      ];
      
      for (const operation of csvOperations) {
        if (!csvParser.includes(operation)) {
          this.addIntegrationError(`Missing CSV operation: ${operation}`);
          dataFlowValid = false;
        }
      }
      
      // Check data validation
      if (!csvParser.includes('validateAndCleanURL')) {
        this.addIntegrationError('Missing URL validation in CSV parser');
        dataFlowValid = false;
      }
      
      if (dataFlowValid) {
        this.testResults.integrationTests.passed++;
        console.log('   ✅ Data flow is properly implemented');
      }
      
    } catch (error) {
      this.addIntegrationError(`Data flow test failed: ${error.message}`);
    }
  }

  // Test error handling integration
  async testErrorHandlingIntegration() {
    console.log('🚨 Testing Error Handling Integration...');
    
    try {
      const errorHandler = fs.readFileSync('utils/error-handler.js', 'utf8');
      const automationEngine = fs.readFileSync('content/automation-engine.js', 'utf8');
      
      let errorHandlingValid = true;
      
      // Check error handler has required methods
      const errorMethods = [
        'handleError',
        'categorizeError',
        'attemptRecovery',
        'withRetry'
      ];
      
      for (const method of errorMethods) {
        if (!errorHandler.includes(method)) {
          this.addIntegrationError(`Missing error handling method: ${method}`);
          errorHandlingValid = false;
        }
      }
      
      // Check automation engine uses error handling
      if (!automationEngine.includes('try') || !automationEngine.includes('catch')) {
        this.addIntegrationError('Automation engine lacks proper error handling');
        errorHandlingValid = false;
      }
      
      // Check for circuit breaker implementation
      if (!errorHandler.includes('circuitBreaker')) {
        this.addIntegrationError('Missing circuit breaker implementation');
        errorHandlingValid = false;
      }
      
      if (errorHandlingValid) {
        this.testResults.integrationTests.passed++;
        console.log('   ✅ Error handling is properly integrated');
      }
      
    } catch (error) {
      this.addIntegrationError(`Error handling test failed: ${error.message}`);
    }
  }

  // Performance Tests
  async runPerformanceTests() {
    console.log('⚡ Running Performance Tests...\n');
    
    await this.testFileSize();
    await this.testMemoryUsage();
    await this.testLoadingTime();
    
    console.log('');
  }

  // Test file sizes
  async testFileSize() {
    console.log('📏 Testing File Sizes...');
    
    try {
      const fileSizeThresholds = {
        'background.js': 100 * 1024, // 100KB
        'content/content-script.js': 50 * 1024, // 50KB
        'content/automation-engine.js': 100 * 1024, // 100KB
        'utils/storage-manager.js': 50 * 1024, // 50KB
        'popup/popup.js': 50 * 1024 // 50KB
      };
      
      let allSizesOk = true;
      let totalSize = 0;
      
      for (const [file, threshold] of Object.entries(fileSizeThresholds)) {
        if (fs.existsSync(file)) {
          const size = fs.statSync(file).size;
          totalSize += size;
          
          if (size > threshold) {
            this.addPerformanceError(`${file} is too large: ${this.formatBytes(size)} (max: ${this.formatBytes(threshold)})`);
            allSizesOk = false;
          }
        }
      }
      
      // Check total extension size
      const maxTotalSize = 2 * 1024 * 1024; // 2MB
      if (totalSize > maxTotalSize) {
        this.addPerformanceError(`Total extension size too large: ${this.formatBytes(totalSize)} (max: ${this.formatBytes(maxTotalSize)})`);
        allSizesOk = false;
      }
      
      if (allSizesOk) {
        this.testResults.performanceTests.passed++;
        console.log(`   ✅ File sizes are within acceptable limits (Total: ${this.formatBytes(totalSize)})`);
      }
      
    } catch (error) {
      this.addPerformanceError(`File size test failed: ${error.message}`);
    }
  }

  // Test memory usage patterns
  async testMemoryUsage() {
    console.log('🧠 Testing Memory Usage Patterns...');
    
    try {
      // Check for potential memory leaks in code
      const jsFiles = [
        'background.js',
        'content/content-script.js',
        'content/automation-engine.js',
        'popup/popup.js'
      ];
      
      let memoryPatternsOk = true;
      
      for (const file of jsFiles) {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf8');
          
          // Check for potential memory leaks
          const memoryIssues = [
            { pattern: /setInterval\(/g, cleanup: /clearInterval\(/g, issue: 'setInterval without clearInterval' },
            { pattern: /setTimeout\(/g, cleanup: /clearTimeout\(/g, issue: 'setTimeout without clearTimeout' },
            { pattern: /addEventListener\(/g, cleanup: /removeEventListener\(/g, issue: 'addEventListener without removeEventListener' }
          ];
          
          for (const issue of memoryIssues) {
            const matches = content.match(issue.pattern);
            const cleanups = content.match(issue.cleanup);
            
            if (matches && matches.length > (cleanups ? cleanups.length : 0)) {
              this.addPerformanceError(`${file}: Potential memory leak - ${issue.issue}`);
              memoryPatternsOk = false;
            }
          }
          
          // Check for large data structures
          if (content.includes('new Array(') && content.match(/new Array\(\s*\d{4,}\s*\)/)) {
            this.addPerformanceError(`${file}: Large array allocation detected`);
            memoryPatternsOk = false;
          }
        }
      }
      
      if (memoryPatternsOk) {
        this.testResults.performanceTests.passed++;
        console.log('   ✅ Memory usage patterns look good');
      }
      
    } catch (error) {
      this.addPerformanceError(`Memory usage test failed: ${error.message}`);
    }
  }

  // Test loading time
  async testLoadingTime() {
    console.log('⏱️  Testing Loading Time...');
    
    try {
      // Estimate loading time based on file sizes and complexity
      const criticalFiles = [
        'background.js',
        'content/content-script.js',
        'popup/popup.js'
      ];
      
      let totalLoadTime = 0;
      let loadingOk = true;
      
      for (const file of criticalFiles) {
        if (fs.existsSync(file)) {
          const size = fs.statSync(file).size;
          const content = fs.readFileSync(file, 'utf8');
          
          // Estimate load time based on size and complexity
          const baseTime = size / 1000; // 1ms per KB
          const complexityFactor = (content.match(/class /g) || []).length * 2; // 2ms per class
          const asyncFactor = (content.match(/async /g) || []).length * 1; // 1ms per async function
          
          const estimatedTime = baseTime + complexityFactor + asyncFactor;
          totalLoadTime += estimatedTime;
          
          if (estimatedTime > 100) { // 100ms threshold per file
            this.addPerformanceError(`${file} estimated load time too high: ${estimatedTime.toFixed(1)}ms`);
            loadingOk = false;
          }
        }
      }
      
      if (totalLoadTime > 500) { // 500ms total threshold
        this.addPerformanceError(`Total estimated load time too high: ${totalLoadTime.toFixed(1)}ms`);
        loadingOk = false;
      }
      
      if (loadingOk) {
        this.testResults.performanceTests.passed++;
        console.log(`   ✅ Estimated loading time is acceptable (${totalLoadTime.toFixed(1)}ms)`);
      }
      
    } catch (error) {
      this.addPerformanceError(`Loading time test failed: ${error.message}`);
    }
  }

  // Optimization Checks
  async runOptimizationChecks() {
    console.log('🔧 Running Optimization Checks...\n');
    
    await this.checkCodeOptimizations();
    await this.checkResourceOptimizations();
    await this.checkSecurityOptimizations();
    
    console.log('');
  }

  // Check code optimizations
  async checkCodeOptimizations() {
    console.log('💻 Checking Code Optimizations...');
    
    const jsFiles = [
      'background.js',
      'content/content-script.js',
      'content/automation-engine.js',
      'content/markt-interface.js',
      'popup/popup.js'
    ];
    
    for (const file of jsFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for console.log statements (should use logger)
        if (content.includes('console.log') && !file.includes('logger')) {
          this.testResults.optimizations.push(`${file}: Replace console.log with logger`);
        }
        
        // Check for hardcoded values
        if (content.match(/\d{4,}/g) && !content.includes('const ')) {
          this.testResults.optimizations.push(`${file}: Consider using constants for magic numbers`);
        }
        
        // Check for repeated code patterns
        const lines = content.split('\n');
        const duplicateThreshold = 3;
        const lineGroups = {};
        
        lines.forEach((line, index) => {
          const trimmed = line.trim();
          if (trimmed.length > 20) { // Only check substantial lines
            if (!lineGroups[trimmed]) {
              lineGroups[trimmed] = [];
            }
            lineGroups[trimmed].push(index + 1);
          }
        });
        
        Object.entries(lineGroups).forEach(([line, occurrences]) => {
          if (occurrences.length >= duplicateThreshold) {
            this.testResults.optimizations.push(`${file}: Potential code duplication at lines ${occurrences.join(', ')}`);
          }
        });
      }
    }
    
    console.log(`   ✅ Code optimization check completed (${this.testResults.optimizations.length} suggestions)`);
  }

  // Check resource optimizations
  async checkResourceOptimizations() {
    console.log('📦 Checking Resource Optimizations...');
    
    // Check for unused files
    const allFiles = this.getAllFiles('.');
    const referencedFiles = new Set();
    
    // Check manifest references
    const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
    manifest.content_scripts[0].js.forEach(file => referencedFiles.add(file));
    referencedFiles.add(manifest.background.service_worker);
    referencedFiles.add(manifest.action.default_popup);
    
    // Check HTML references
    if (fs.existsSync('popup/popup.html')) {
      const html = fs.readFileSync('popup/popup.html', 'utf8');
      const cssMatches = html.match(/href="([^"]+\.css)"/g) || [];
      const jsMatches = html.match(/src="([^"]+\.js)"/g) || [];
      
      cssMatches.forEach(match => {
        const file = match.match(/href="([^"]+)"/)[1];
        referencedFiles.add(`popup/${file}`);
      });
      
      jsMatches.forEach(match => {
        const file = match.match(/src="([^"]+)"/)[1];
        referencedFiles.add(`popup/${file}`);
      });
    }
    
    // Check for unreferenced files
    const jsFiles = allFiles.filter(f => f.endsWith('.js') && !f.includes('node_modules'));
    const unreferencedFiles = jsFiles.filter(f => !referencedFiles.has(f) && !f.includes('test') && !f.includes('build'));
    
    if (unreferencedFiles.length > 0) {
      this.testResults.optimizations.push(`Potentially unused files: ${unreferencedFiles.join(', ')}`);
    }
    
    console.log('   ✅ Resource optimization check completed');
  }

  // Check security optimizations
  async checkSecurityOptimizations() {
    console.log('🔒 Checking Security Optimizations...');
    
    const jsFiles = [
      'background.js',
      'content/content-script.js',
      'popup/popup.js',
      'utils/storage-manager.js'
    ];
    
    for (const file of jsFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for potential security issues
        if (content.includes('eval(')) {
          this.testResults.optimizations.push(`${file}: Avoid using eval() for security`);
        }
        
        if (content.includes('innerHTML') && !content.includes('sanitize')) {
          this.testResults.optimizations.push(`${file}: Consider sanitizing innerHTML content`);
        }
        
        if (content.includes('http://')) {
          this.testResults.optimizations.push(`${file}: Use HTTPS instead of HTTP`);
        }
        
        // Check for hardcoded credentials (basic check)
        if (content.match(/password\s*[:=]\s*["'][^"']{8,}["']/i)) {
          this.testResults.optimizations.push(`${file}: Possible hardcoded credentials detected`);
        }
      }
    }
    
    console.log('   ✅ Security optimization check completed');
  }

  // Generate final report
  async generateFinalReport() {
    console.log('📄 Generating Final Report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      version: JSON.parse(fs.readFileSync('manifest.json', 'utf8')).version,
      testResults: {
        integration: {
          passed: this.testResults.integrationTests.passed,
          failed: this.testResults.integrationTests.failed,
          errors: this.testResults.integrationTests.errors
        },
        performance: {
          passed: this.testResults.performanceTests.passed,
          failed: this.testResults.performanceTests.failed,
          errors: this.testResults.performanceTests.errors
        }
      },
      optimizations: this.testResults.optimizations,
      summary: {
        totalTests: this.testResults.integrationTests.passed + this.testResults.integrationTests.failed + 
                   this.testResults.performanceTests.passed + this.testResults.performanceTests.failed,
        totalPassed: this.testResults.integrationTests.passed + this.testResults.performanceTests.passed,
        totalFailed: this.testResults.integrationTests.failed + this.testResults.performanceTests.failed,
        optimizationSuggestions: this.testResults.optimizations.length
      },
      readinessAssessment: this.assessReadiness()
    };
    
    fs.writeFileSync('final-test-report.json', JSON.stringify(report, null, 2));
    console.log('   ✅ Final report generated: final-test-report.json');
  }

  // Assess extension readiness
  assessReadiness() {
    const totalFailed = this.testResults.integrationTests.failed + this.testResults.performanceTests.failed;
    const criticalOptimizations = this.testResults.optimizations.filter(opt => 
      opt.includes('security') || opt.includes('memory leak') || opt.includes('hardcoded')
    ).length;
    
    if (totalFailed === 0 && criticalOptimizations === 0) {
      return {
        status: 'READY',
        message: 'Extension is ready for production deployment',
        confidence: 'HIGH'
      };
    } else if (totalFailed <= 2 && criticalOptimizations === 0) {
      return {
        status: 'MOSTLY_READY',
        message: 'Extension is mostly ready, minor issues should be addressed',
        confidence: 'MEDIUM'
      };
    } else {
      return {
        status: 'NOT_READY',
        message: 'Extension has significant issues that must be resolved',
        confidence: 'LOW'
      };
    }
  }

  // Report final results
  reportFinalResults() {
    const totalTests = this.testResults.integrationTests.passed + this.testResults.integrationTests.failed + 
                      this.testResults.performanceTests.passed + this.testResults.performanceTests.failed;
    const totalPassed = this.testResults.integrationTests.passed + this.testResults.performanceTests.passed;
    const totalFailed = this.testResults.integrationTests.failed + this.testResults.performanceTests.failed;
    
    console.log('\n🎯 Final Integration Test Results:');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   ✅ Passed: ${totalPassed}`);
    console.log(`   ❌ Failed: ${totalFailed}`);
    console.log(`   🔧 Optimization Suggestions: ${this.testResults.optimizations.length}`);
    
    const successRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
    console.log(`   📈 Success Rate: ${successRate}%`);
    
    // Show readiness assessment
    const readiness = this.assessReadiness();
    console.log(`\n🚀 Readiness Assessment: ${readiness.status}`);
    console.log(`   ${readiness.message}`);
    console.log(`   Confidence: ${readiness.confidence}`);
    
    // Show errors if any
    if (totalFailed > 0) {
      console.log('\n❌ Integration Errors:');
      this.testResults.integrationTests.errors.forEach(error => console.log(`   • ${error}`));
      
      console.log('\n⚡ Performance Errors:');
      this.testResults.performanceTests.errors.forEach(error => console.log(`   • ${error}`));
    }
    
    // Show optimization suggestions
    if (this.testResults.optimizations.length > 0) {
      console.log('\n🔧 Optimization Suggestions:');
      this.testResults.optimizations.slice(0, 10).forEach(opt => console.log(`   • ${opt}`));
      
      if (this.testResults.optimizations.length > 10) {
        console.log(`   ... and ${this.testResults.optimizations.length - 10} more (see final-test-report.json)`);
      }
    }
    
    console.log('\n📊 Next Steps:');
    if (readiness.status === 'READY') {
      console.log('   1. ✅ Extension is ready for deployment');
      console.log('   2. 📦 Run "npm run build" to create distribution package');
      console.log('   3. 🚀 Submit to Chrome Web Store');
    } else {
      console.log('   1. 🔧 Address failed tests and critical optimizations');
      console.log('   2. 🧪 Re-run final tests');
      console.log('   3. 📦 Build and deploy when ready');
    }
  }

  // Helper methods
  addIntegrationError(error) {
    this.testResults.integrationTests.failed++;
    this.testResults.integrationTests.errors.push(error);
  }

  addPerformanceError(error) {
    this.testResults.performanceTests.failed++;
    this.testResults.performanceTests.errors.push(error);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getAllFiles(dir, files = []) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      if (fs.statSync(itemPath).isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        this.getAllFiles(itemPath, files);
      } else if (fs.statSync(itemPath).isFile()) {
        files.push(itemPath.replace(/\\/g, '/').replace(/^\.\//, ''));
      }
    }
    
    return files;
  }
}

// Run final tests if called directly
if (require.main === module) {
  const tester = new FinalIntegrationTester();
  tester.runFinalTests().catch(error => {
    console.error('Final testing failed:', error);
    process.exit(1);
  });
}

module.exports = FinalIntegrationTester;