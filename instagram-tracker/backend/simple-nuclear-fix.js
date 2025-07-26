/**
 * Simple Nuclear Cleaner Fix
 * 
 * This version focuses on the essential fix: just restore an empty database file
 * and let iOS handle the rest.
 */

const { exec } = require('child_process');

class SimpleNuclearFix {
    constructor() {
        this.phoneIP = "192.168.178.65";
        this.mobileUser = "mobile";
        this.mobilePassword = "qwertzuio";
    }

    async executeSSH(command) {
        return new Promise((resolve, reject) => {
            console.log(`🔗 SSH: ${command}`);
            
            const plinkCommand = `plink -ssh -batch -l ${this.mobileUser} -pw ${this.mobilePassword} ${this.phoneIP} "${command}"`;
            
            exec(plinkCommand, { timeout: 10000 }, (error, stdout, stderr) => {
                if (error) {
                    console.log(`❌ SSH failed: ${error.message}`);
                    reject(error);
                    return;
                }
                
                const output = stdout.trim();
                console.log(`✅ SSH result: ${output || '(empty)'}`);
                resolve(output);
            });
        });
    }

    async fixPhotosDatabase() {
        console.log('🔧 Fixing Photos database after nuclear cleanup...\n');
        
        try {
            // Step 1: Check if database exists
            const dbExists = await this.executeSSH('ls -la /var/mobile/Media/PhotoData/Photos.sqlite 2>/dev/null || echo "NOT_FOUND"');
            
            if (dbExists.includes('NOT_FOUND')) {
                console.log('📁 Photos.sqlite missing - creating empty database file...');
                
                // Create empty database file
                await this.executeSSH('touch /var/mobile/Media/PhotoData/Photos.sqlite');
                
                // Set proper ownership
                await this.executeSSH('chown mobile:mobile /var/mobile/Media/PhotoData/Photos.sqlite');
                
                console.log('✅ Empty database file created');
            } else {
                console.log('✅ Photos.sqlite already exists');
            }
            
            // Step 2: Ensure required directories exist
            console.log('📁 Ensuring required directories exist...');
            
            const requiredDirs = [
                '/var/mobile/Media/PhotoData/Thumbnails',
                '/var/mobile/Media/PhotoData/CPL',
                '/var/mobile/Media/PhotoData/AlbumsMetadata'
            ];
            
            for (const dir of requiredDirs) {
                await this.executeSSH(`mkdir -p "${dir}"`);
            }
            
            // Step 3: Set proper ownership for entire PhotoData
            console.log('🔐 Setting proper ownership...');
            await this.executeSSH('chown -R mobile:mobile /var/mobile/Media/PhotoData');
            await this.executeSSH('chmod -R 755 /var/mobile/Media/PhotoData');
            
            // Step 4: Clear crash logs
            console.log('🗑️ Clearing crash logs...');
            await this.executeSSH('rm -f /var/mobile/Library/Logs/CrashReporter/*Photos* 2>/dev/null || true');
            await this.executeSSH('rm -f /var/mobile/Library/Logs/CrashReporter/*photolibraryd* 2>/dev/null || true');
            
            // Step 5: Restart photo services
            console.log('🔄 Restarting photo services...');
            await this.executeSSH('killall -9 photoanalysisd photolibraryd Photos 2>/dev/null || true');
            
            console.log('✅ Photos database fix completed!');
            console.log('📱 Try opening Photos app now - iOS will rebuild the database automatically');
            
        } catch (error) {
            console.error('❌ Fix failed:', error.message);
        }
    }

    async checkPhotosStatus() {
        console.log('🔍 Checking Photos app status...\n');
        
        try {
            // Check database
            const dbExists = await this.executeSSH('ls -la /var/mobile/Media/PhotoData/Photos.sqlite 2>/dev/null || echo "NOT_FOUND"');
            console.log(`📁 Database: ${dbExists.includes('NOT_FOUND') ? '❌ Missing' : '✅ Exists'}`);
            
            // Check ownership
            if (!dbExists.includes('NOT_FOUND')) {
                const ownership = await this.executeSSH('ls -la /var/mobile/Media/PhotoData/Photos.sqlite | awk \'{print $3":"$4}\'');
                console.log(`🔐 Ownership: ${ownership.trim()}`);
            }
            
            // Check processes
            const processCount = await this.executeSSH('ps aux | grep -E "(photoanalysisd|photolibraryd)" | grep -v grep | wc -l');
            console.log(`🔍 Photo processes: ${processCount.trim()} running`);
            
            // Check directories
            const dirsExist = await this.executeSSH('ls -la /var/mobile/Media/PhotoData/ | grep "^d" | wc -l');
            console.log(`📁 PhotoData subdirs: ${dirsExist.trim()}`);
            
        } catch (error) {
            console.error('❌ Status check failed:', error.message);
        }
    }
}

async function main() {
    const fixer = new SimpleNuclearFix();
    
    console.log('🔧 Simple Nuclear Cleaner Fix');
    console.log('=============================');
    console.log('This will fix Photos app after nuclear cleanup\n');
    
    // First check current status
    await fixer.checkPhotosStatus();
    console.log('');
    
    // Apply fix
    await fixer.fixPhotosDatabase();
    console.log('');
    
    // Check status again
    console.log('📊 Status after fix:');
    await fixer.checkPhotosStatus();
}

// Export for use as module
module.exports = SimpleNuclearFix;

// Run main if called directly
if (require.main === module) {
    main().catch(console.error);
}