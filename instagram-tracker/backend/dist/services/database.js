"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testConnection = exports.db = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Database connection
exports.db = new pg_1.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'instagram_tracker',
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'password123',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
// Test database connection
const testConnection = async () => {
    try {
        const client = await exports.db.connect();
        console.log('✅ Connected to PostgreSQL database');
        client.release();
        return true;
    }
    catch (err) {
        console.error('❌ Database connection error:', err);
        return false;
    }
};
exports.testConnection = testConnection;
