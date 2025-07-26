"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const database_1 = require("./database");
const migrate_1 = require("./scripts/migrate");
const models_1 = __importDefault(require("./routes/models"));
const accounts_1 = __importDefault(require("./routes/accounts"));
const targetUsers_1 = __importDefault(require("./routes/targetUsers"));
const follows_1 = __importDefault(require("./routes/follows"));
const posts_1 = __importDefault(require("./routes/posts"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const import_1 = __importDefault(require("./routes/import"));
const reviews_1 = __importDefault(require("./routes/reviews"));
const accounts_2 = __importDefault(require("./routes/bot/accounts"));
const centralContent_1 = __importDefault(require("./routes/centralContent"));
const iphone_management_1 = __importDefault(require("./routes/iphone-management"));
const sprints_1 = __importDefault(require("./routes/sprints"));
const contentQueue_1 = __importDefault(require("./routes/contentQueue"));
const campaignPools_1 = __importDefault(require("./routes/campaignPools"));
const emergencyContent_1 = __importDefault(require("./routes/emergencyContent"));
const highlightGroups_1 = __importDefault(require("./routes/highlightGroups"));
const gantt_1 = __importDefault(require("./routes/gantt"));
const maintenanceStatus_1 = __importDefault(require("./routes/maintenanceStatus"));
const botIntegration_1 = __importDefault(require("./routes/botIntegration"));
const settings_1 = __importDefault(require("./routes/settings"));
const automation_1 = __importStar(require("./routes/automation"));
const warmupContentAssignment_1 = __importDefault(require("./routes/warmupContentAssignment"));
dotenv_1.default.config();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3090';
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
(0, database_1.testConnection)().then(connected => {
    if (!connected) {
        process.exit(1);
    }
});
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use((0, cors_1.default)({
    origin: ['http://localhost:3090', 'http://localhost:3000'],
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use('/uploads', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
}, express_1.default.static(path_1.default.join(__dirname, '../uploads')));
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected'
    });
});
app.use('/api/models', models_1.default);
app.use('/api/accounts', accounts_1.default);
app.use('/api/target-users', targetUsers_1.default);
app.use('/api/follows', follows_1.default);
app.use('/api/posts', posts_1.default);
app.use('/api/analytics', analytics_1.default);
app.use('/api/import', import_1.default);
app.use('/api/reviews', reviews_1.default);
app.use('/api/bot/accounts', accounts_2.default);
app.use('/api/central', centralContent_1.default);
app.use('/api/content-queue', contentQueue_1.default);
app.use('/api/sprints', sprints_1.default);
app.use('/api/campaign-pools', campaignPools_1.default);
app.use('/api/emergency-content', emergencyContent_1.default);
app.use('/api/highlight-groups', highlightGroups_1.default);
app.use('/api/iphones', iphone_management_1.default);
app.use('/api/gantt', gantt_1.default);
app.use('/api/maintenance-status', maintenanceStatus_1.default);
app.use('/api/bot-integration', botIntegration_1.default);
app.use('/api/settings', settings_1.default);
app.use('/api/automation', automation_1.default);
app.use('/api/warmup-content-assignment', warmupContentAssignment_1.default);
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl
    });
});
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});
const WarmupQueueService_1 = require("./services/WarmupQueueService");
async function startServer() {
    try {
        console.log('🔄 Running database migrations...');
        await (0, migrate_1.runMigrations)();
        console.log('✅ Migrations completed successfully.');
        await (0, database_1.testConnection)();
        console.log('✅ Database connected successfully');
        console.log('🤖 Starting warmup automation queue...');
        const warmupQueue = new WarmupQueueService_1.WarmupQueueService();
        await warmupQueue.start();
        console.log('✅ Warmup automation queue started');
        process.on('SIGINT', async () => {
            console.log('🛑 Shutting down gracefully...');
            await warmupQueue.stop();
            process.exit(0);
        });
        process.on('SIGTERM', async () => {
            console.log('🛑 Shutting down gracefully...');
            await warmupQueue.stop();
            process.exit(0);
        });
        (0, automation_1.setupWebSocket)(server);
        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📊 Dashboard: http://localhost:${PORT}/health`);
            console.log(`🔗 CORS enabled for: ${CORS_ORIGIN}`);
            console.log(`📁 Static files served from: ${path_1.default.join(__dirname, '../uploads')}`);
            console.log(`🤖 Warmup automation: ACTIVE (polling every 30s)`);
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
exports.default = app;
//# sourceMappingURL=index.js.map