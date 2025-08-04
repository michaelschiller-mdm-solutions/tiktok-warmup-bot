/*
 * Build Script - Prepares the Chrome extension for packaging and deployment
 * Validates files, optimizes code, and creates distribution package
 */

const fs = require('fs');
const path = require('path');

class ExtensionBuilder {
  constructor() {
    this.packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    this.manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
    this.buildConfig = this.packageJson.buildConfig;
    this.errors = [];
    this.warnings = [];
  }

  // Main build process
  async build() {
    console.log('🚀 Starting Markt.de DM Bot extension build...\n');

    try {
      // Validate extension structure
      await this.validateExtensionStructure();
      
      // Validate manifest
      await this.validateManifest();
      
      // Validate source files
      await this.validateSourceFiles();
      
      // Create build directory
      await this.createBuildDirectory();
      
      // Copy files to build directory
      await this.copyFiles();
      
      // Optimize files
      await this.optimizeFiles();
      
      // Generate build info
      await this.generateBuildInfo();
      
      // Report results
      this.reportResults();
      
      console.log('✅ Build completed successfully!\n');
      
    } catch (error) {
      console.error('❌ Build failed:', error.message);
      process.exit(1);
    }
  }

  // Validate extension structure
  async validateExtensionStructure() {
    console.log('📋 Validating extension structure...');
    
    const requiredFiles = [
      'manifest.json',
      'background.js',
      'popup/popup.html',
      'popup/popup.js',
      'popup/popup.css',
      'content/content-script.js',
      'content/markt-interface.js',
      'content/automation-engine.js',
      'content/human-behavior.js',
      'utils/storage-manager.js',
      'utils/csv-parser.js',
      'utils/logger.js',
      'utils/error-handler.js'
    ];

    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        this.errors.push(`Required file missing: ${file}`);
      }
    }

    const requiredDirectories = [
      'popup',
      'content',
      'utils',
      'icons'
    ];

    for (const dir of requiredDirectories) {
      if (!fs.existsSync(dir)) {
        this.errors.push(`Required directory missing: ${dir}`);
      }
    }

    // Check for icon files
    const iconSizes = [16, 48, 128];
    for (const size of iconSizes) {
      const iconFile = `icons/icon${size}.png`;
      if (!fs.existsSync(iconFile)) {
        this.warnings.push(`Icon file missing: ${iconFile} (run 'npm run icons' to generate)`);
      }
    }

    console.log(`   ✅ Structure validation completed (${this.errors.length} errors, ${this.warnings.length} warnings)`);
  }

  // Validate manifest.json
  async validateManifest() {
    console.log('📄 Validating manifest.json...');
    
    // Check required fields
    const requiredFields = [
      'manifest_version',
      'name',
      'version',
      'description',
      'permissions',
      'host_permissions',
      'background',
      'content_scripts',
      'action'
    ];

    for (const field of requiredFields) {
      if (!this.manifest[field]) {
        this.errors.push(`Manifest missing required field: ${field}`);
      }
    }

    // Validate manifest version
    if (this.manifest.manifest_version !== 3) {
      this.errors.push('Manifest version must be 3 for Chrome extensions');
    }

    // Validate permissions
    const requiredPermissions = ['storage', 'activeTab', 'scripting'];
    for (const permission of requiredPermissions) {
      if (!this.manifest.permissions.includes(permission)) {
        this.errors.push(`Missing required permission: ${permission}`);
      }
    }

    // Validate host permissions
    if (!this.manifest.host_permissions.includes('https://*.markt.de/*')) {
      this.errors.push('Missing required host permission for markt.de');
    }

    // Validate content scripts
    if (!this.manifest.content_scripts || this.manifest.content_scripts.length === 0) {
      this.errors.push('No content scripts defined in manifest');
    }

    // Validate version format
    const versionRegex = /^\d+\.\d+\.\d+$/;
    if (!versionRegex.test(this.manifest.version)) {
      this.errors.push('Version must be in format x.y.z (e.g., 1.0.0)');
    }

    console.log(`   ✅ Manifest validation completed`);
  }

  // Validate source files
  async validateSourceFiles() {
    console.log('🔍 Validating source files...');
    
    const jsFiles = [
      'background.js',
      'popup/popup.js',
      'content/content-script.js',
      'content/markt-interface.js',
      'content/automation-engine.js',
      'content/human-behavior.js',
      'utils/storage-manager.js',
      'utils/csv-parser.js',
      'utils/logger.js',
      'utils/error-handler.js'
    ];

    for (const file of jsFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        
        // Basic syntax validation
        try {
          // Check for common syntax issues
          if (content.includes('console.log') && !file.includes('logger')) {
            this.warnings.push(`${file}: Consider using logger instead of console.log`);
          }
          
          // Check for TODO comments
          if (content.includes('TODO') || content.includes('FIXME')) {
            this.warnings.push(`${file}: Contains TODO/FIXME comments`);
          }
          
          // Check for hardcoded credentials (basic check)
          if (content.includes('password') && content.includes('=') && content.includes('"')) {
            this.warnings.push(`${file}: Possible hardcoded credentials detected`);
          }
          
        } catch (error) {
          this.errors.push(`${file}: Syntax validation failed - ${error.message}`);
        }
      }
    }

    console.log(`   ✅ Source file validation completed`);
  }

  // Create build directory
  async createBuildDirectory() {
    console.log('📁 Creating build directory...');
    
    const buildDir = this.buildConfig.outputDir;
    
    if (fs.existsSync(buildDir)) {
      // Remove existing build directory
      fs.rmSync(buildDir, { recursive: true, force: true });
    }
    
    fs.mkdirSync(buildDir, { recursive: true });
    
    console.log(`   ✅ Build directory created: ${buildDir}`);
  }

  // Copy files to build directory
  async copyFiles() {
    console.log('📋 Copying files to build directory...');
    
    const buildDir = this.buildConfig.outputDir;
    let copiedFiles = 0;

    // Copy individual files
    const filesToCopy = [
      'manifest.json',
      'background.js',
      'README.md'
    ];

    for (const file of filesToCopy) {
      if (fs.existsSync(file)) {
        const destPath = path.join(buildDir, file);
        const destDir = path.dirname(destPath);
        
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        
        fs.copyFileSync(file, destPath);
        copiedFiles++;
      }
    }

    // Copy directories
    const dirsToCopy = ['popup', 'content', 'utils', 'icons'];
    
    for (const dir of dirsToCopy) {
      if (fs.existsSync(dir)) {
        const destDir = path.join(buildDir, dir);
        this.copyDirectory(dir, destDir);
        copiedFiles += this.countFilesInDirectory(dir);
      }
    }

    console.log(`   ✅ Copied ${copiedFiles} files to build directory`);
  }

  // Copy directory recursively
  copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const files = fs.readdirSync(src);
    
    for (const file of files) {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);
      
      if (fs.statSync(srcPath).isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  // Count files in directory
  countFilesInDirectory(dir) {
    let count = 0;
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        count += this.countFilesInDirectory(filePath);
      } else {
        count++;
      }
    }
    
    return count;
  }

  // Optimize files
  async optimizeFiles() {
    console.log('⚡ Optimizing files...');
    
    const buildDir = this.buildConfig.outputDir;
    
    // Remove development files from build
    const devFiles = [
      'create-icons.js',
      'create-icons.html',
      'build.js',
      'package.js',
      'test.js',
      'validate.js',
      'clean.js'
    ];

    for (const file of devFiles) {
      const filePath = path.join(buildDir, file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Remove SVG files (keep only PNG icons)
    const iconsDir = path.join(buildDir, 'icons');
    if (fs.existsSync(iconsDir)) {
      const iconFiles = fs.readdirSync(iconsDir);
      for (const file of iconFiles) {
        if (file.endsWith('.svg')) {
          fs.unlinkSync(path.join(iconsDir, file));
        }
      }
    }

    console.log(`   ✅ File optimization completed`);
  }

  // Generate build info
  async generateBuildInfo() {
    console.log('📊 Generating build info...');
    
    const buildDir = this.buildConfig.outputDir;
    const buildInfo = {
      buildDate: new Date().toISOString(),
      version: this.manifest.version,
      manifestVersion: this.manifest.manifest_version,
      buildNumber: Date.now(),
      files: this.getBuildFileList(buildDir),
      totalFiles: this.countFilesInDirectory(buildDir),
      buildConfig: this.buildConfig,
      errors: this.errors,
      warnings: this.warnings
    };

    fs.writeFileSync(
      path.join(buildDir, 'build-info.json'),
      JSON.stringify(buildInfo, null, 2)
    );

    console.log(`   ✅ Build info generated`);
  }

  // Get list of files in build directory
  getBuildFileList(dir, basePath = '') {
    const files = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const relativePath = path.join(basePath, item);
      
      if (fs.statSync(itemPath).isDirectory()) {
        files.push(...this.getBuildFileList(itemPath, relativePath));
      } else {
        const stats = fs.statSync(itemPath);
        files.push({
          path: relativePath.replace(/\\/g, '/'),
          size: stats.size,
          modified: stats.mtime.toISOString()
        });
      }
    }
    
    return files;
  }

  // Report build results
  reportResults() {
    console.log('\n📊 Build Results:');
    console.log(`   Version: ${this.manifest.version}`);
    console.log(`   Build Directory: ${this.buildConfig.outputDir}`);
    console.log(`   Total Files: ${this.countFilesInDirectory(this.buildConfig.outputDir)}`);
    
    if (this.errors.length > 0) {
      console.log(`\n❌ Errors (${this.errors.length}):`);
      this.errors.forEach(error => console.log(`   • ${error}`));
    }
    
    if (this.warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${this.warnings.length}):`);
      this.warnings.forEach(warning => console.log(`   • ${warning}`));
    }
    
    if (this.errors.length === 0) {
      console.log('\n🎉 Build completed successfully!');
      console.log(`\nNext steps:`);
      console.log(`   1. Test the extension: Load ${this.buildConfig.outputDir} in Chrome`);
      console.log(`   2. Package for distribution: npm run package`);
      console.log(`   3. Submit to Chrome Web Store`);
    }
  }
}

// Run build if called directly
if (require.main === module) {
  const builder = new ExtensionBuilder();
  builder.build().catch(error => {
    console.error('Build failed:', error);
    process.exit(1);
  });
}

module.exports = ExtensionBuilder;