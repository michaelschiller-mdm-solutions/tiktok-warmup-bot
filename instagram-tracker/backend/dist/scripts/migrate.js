"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const database_1 = require("../database");
const MIGRATIONS_DIR = path_1.default.resolve(__dirname, '../../../database/migrations');
const SETUP_SCRIPT = 'run-migrations.sql';
const getMigrationFiles = () => {
    try {
        const allFiles = fs_1.default.readdirSync(MIGRATIONS_DIR);
        const sqlFiles = allFiles
            .filter(file => /^\d{3}-.+.sql$/.test(file))
            .sort();
        return sqlFiles;
    }
    catch (error) {
        console.error(`Error reading migrations directory at ${MIGRATIONS_DIR}:`, error);
        throw new Error('Could not read migration files.');
    }
};
const executeSqlFile = async (client, filePath) => {
    const sql = fs_1.default.readFileSync(filePath, 'utf8');
    await client.query(sql);
};
const runMigrations = async () => {
    let client = null;
    try {
        client = await database_1.db.connect();
        console.log('DB client connected. Starting migration check...');
        console.log('Ensuring migration tracking system is in place...');
        const setupScriptPath = path_1.default.join(MIGRATIONS_DIR, SETUP_SCRIPT);
        await executeSqlFile(client, setupScriptPath);
        console.log('Migration tracking system is ready.');
        const { rows: executedRows } = await client.query('SELECT migration_name FROM migration_history WHERE success = true');
        const executedMigrations = new Set(executedRows.map(r => r.migration_name));
        console.log(`Found ${executedMigrations.size} successfully executed migrations in history.`);
        const allMigrationFiles = getMigrationFiles();
        const pendingMigrations = allMigrationFiles.filter(file => !executedMigrations.has(file.replace('.sql', '')));
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
                const filePath = path_1.default.join(MIGRATIONS_DIR, migrationFile);
                await executeSqlFile(client, filePath);
                await client.query("SELECT record_migration($1, true, NULL)", [migrationName]);
                await client.query('COMMIT');
                console.log(`  -> Successfully applied: ${migrationName}`);
            }
            catch (err) {
                await client.query('ROLLBACK');
                const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                console.error(`  -> FAILED to apply migration: ${migrationName}`, err);
                await client.query("SELECT record_migration($1, false, $2)", [migrationName, errorMessage]);
                throw new Error(`Migration ${migrationName} failed. Halting startup.`);
            }
        }
        console.log('All pending migrations applied successfully.');
    }
    catch (error) {
        console.error('Migration process failed:', error);
        throw error;
    }
    finally {
        if (client) {
            client.release();
            console.log('DB client released.');
        }
    }
};
exports.runMigrations = runMigrations;
//# sourceMappingURL=migrate.js.map