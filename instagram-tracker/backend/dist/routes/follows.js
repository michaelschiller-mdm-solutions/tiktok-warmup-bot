"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../database");
const router = express_1.default.Router();
router.get('/', async (req, res) => {
    try {
        const result = await database_1.db.query('SELECT * FROM model_target_follows ORDER BY created_at DESC');
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch follows' });
    }
});
exports.default = router;
//# sourceMappingURL=follows.js.map