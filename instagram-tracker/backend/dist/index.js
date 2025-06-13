"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./database");
const models_1 = __importDefault(require("./routes/models"));
const accounts_1 = __importDefault(require("./routes/accounts"));
const targetUsers_1 = __importDefault(require("./routes/targetUsers"));
const follows_1 = __importDefault(require("./routes/follows"));
const posts_1 = __importDefault(require("./routes/posts"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const import_1 = __importDefault(require("./routes/import"));
dotenv_1.default.config();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3090';
const app = (0, express_1.default)();
(0, database_1.testConnection)().then(connected => {
    if (!connected) {
        process.exit(1);
    }
});
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: CORS_ORIGIN,
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
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
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/health`);
    console.log(`🔗 CORS enabled for: ${CORS_ORIGIN}`);
});
exports.default = app;
//# sourceMappingURL=index.js.map