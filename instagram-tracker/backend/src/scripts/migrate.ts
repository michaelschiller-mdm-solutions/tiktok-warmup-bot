import { PoolClient } from 'pg';
import fs from 'fs';
import path from 'path';
import { db } from '../database';

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../database/migrations');
const SETUP_SCRIPT = 'run-migrations.sql';

const getMigrationFiles = (): {
    numbered: string[];
    specials: string[];
} => {
    try {
        const allFiles = fs.readdirSync(MIGRATIONS_DIR);
        const numbered = allFiles
            .filter(file => /^\d{3}-.+.sql$/.test(file))
            .sort();
        const specials = allFiles.filter(
            file => file.endsWith(".sql") && !/^\d{3}-.+.sql$/.test(file) && file !== SETUP_SCRIPT
        );
        return { numbered, specials };
    } catch (error) {
        console.error(`Error reading migrations directory at ${MIGRATIONS_DIR}:`, error);
        throw new Error('Could not read migration files.');
    }
};

const executeSqlFile = async (client: PoolClient, filePath: string) => {
    const sql = fs.readFileSync(filePath, 'utf8');
    await client.query(sql);
};

export const runMigrations = async () => {
    let client: PoolClient | null = null;
    try {
        client = await db.connect();
        console.log('DB client connected. Starting migration check...');

        // 1. Ensure migration history table and helper function exist.
        console.log('Ensuring migration tracking system is in place...');
        const setupScriptPath = path.join(MIGRATIONS_DIR, SETUP_SCRIPT);
        await executeSqlFile(client, setupScriptPath);
        console.log('Migration tracking system is ready.');

        // 2. Get already executed migrations.
        const { rows: executedRows } = await client.query('SELECT migration_name FROM migration_history WHERE success = true');
        const executedMigrations = new Set(executedRows.map(r => r.migration_name));
        console.log(`Found ${executedMigrations.size} successfully executed migrations in history.`);

        // 3. Get all available migration files.
        const { numbered: allNumberedMigrations, specials: allSpecialMigrations } = getMigrationFiles();
        
        // 4. Determine and run pending migrations.
        const pendingNumberedMigrations = allNumberedMigrations.filter(file => !executedMigrations.has(file.replace('.sql', '')));
        const pendingSpecialMigrations = allSpecialMigrations.filter(file => !executedMigrations.has(file.replace('.sql', '')));
        
        const pendingMigrations = [...pendingNumberedMigrations, ...pendingSpecialMigrations];

        if (pendingMigrations.length === 0) {
            console.log('Database schema is up-to-date.');
            return;
        }

        console.log(`Found ${pendingMigrations.length} pending migrations. Applying now...`);

        for (const migrationFile of pendingMigrations) {
            const migrationName = migrationFile.replace('.sql', '');
            console.log(`- Applying migration: ${migrationName}`);
            
            try {
                await client.query('BEGIN');
                
                const filePath = path.join(MIGRATIONS_DIR, migrationFile);
                await executeSqlFile(client, filePath);
                
                await client.query("SELECT record_migration($1, true, NULL)", [migrationName]);
                
                await client.query('COMMIT');
                console.log(`  -> Successfully applied: ${migrationName}`);
            } catch (err) {
                await client.query('ROLLBACK');
                const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                console.error(`  -> FAILED to apply migration: ${migrationName}`, err);
                // Record the failure and stop the server startup.
                await client.query("SELECT record_migration($1, false, $2)", [migrationName, errorMessage]);
                throw new Error(`Migration ${migrationName} failed. Halting startup.`);
            }
        }

        console.log('All pending migrations applied successfully.');

    } catch (error) {
        console.error('Migration process failed:', error);
        throw error; 
    } finally {
        if (client) {
            client.release();
            console.log('DB client released.');
        }
    }
};

runMigrations().catch(err => {
    console.error("Migration script failed to run:", err);
    process.exit(1);
}); 