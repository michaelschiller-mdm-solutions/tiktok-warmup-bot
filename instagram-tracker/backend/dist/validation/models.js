"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelIdSchema = exports.updateModelSchema = exports.createModelSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createModelSchema = joi_1.default.object({
    name: joi_1.default.string()
        .min(3)
        .max(255)
        .required()
        .messages({
        'string.min': 'Model name must be at least 3 characters long',
        'string.max': 'Model name cannot exceed 255 characters',
        'any.required': 'Model name is required'
    }),
    description: joi_1.default.string()
        .max(1000)
        .allow('')
        .optional()
        .messages({
        'string.max': 'Description cannot exceed 1000 characters'
    }),
    unfollow_ratio: joi_1.default.number()
        .integer()
        .min(0)
        .max(100)
        .default(90)
        .messages({
        'number.min': 'Unfollow ratio must be between 0 and 100',
        'number.max': 'Unfollow ratio must be between 0 and 100',
        'number.integer': 'Unfollow ratio must be a whole number'
    }),
    daily_follow_limit: joi_1.default.number()
        .integer()
        .min(1)
        .max(1000)
        .default(100)
        .messages({
        'number.min': 'Daily follow limit must be at least 1',
        'number.max': 'Daily follow limit cannot exceed 1000',
        'number.integer': 'Daily follow limit must be a whole number'
    }),
    posting_schedule: joi_1.default.object()
        .default({})
        .messages({
        'object.base': 'Posting schedule must be a valid JSON object'
    }),
    settings: joi_1.default.object()
        .default({})
        .messages({
        'object.base': 'Settings must be a valid JSON object'
    })
});
exports.updateModelSchema = joi_1.default.object({
    name: joi_1.default.string()
        .min(3)
        .max(255)
        .optional()
        .messages({
        'string.min': 'Model name must be at least 3 characters long',
        'string.max': 'Model name cannot exceed 255 characters'
    }),
    description: joi_1.default.string()
        .max(1000)
        .allow('')
        .optional()
        .messages({
        'string.max': 'Description cannot exceed 1000 characters'
    }),
    status: joi_1.default.string()
        .valid('active', 'inactive', 'paused')
        .optional()
        .messages({
        'any.only': 'Status must be one of: active, inactive, paused'
    }),
    unfollow_ratio: joi_1.default.number()
        .integer()
        .min(0)
        .max(100)
        .optional()
        .messages({
        'number.min': 'Unfollow ratio must be between 0 and 100',
        'number.max': 'Unfollow ratio must be between 0 and 100',
        'number.integer': 'Unfollow ratio must be a whole number'
    }),
    daily_follow_limit: joi_1.default.number()
        .integer()
        .min(1)
        .max(1000)
        .optional()
        .messages({
        'number.min': 'Daily follow limit must be at least 1',
        'number.max': 'Daily follow limit cannot exceed 1000',
        'number.integer': 'Daily follow limit must be a whole number'
    }),
    posting_schedule: joi_1.default.object()
        .optional()
        .messages({
        'object.base': 'Posting schedule must be a valid JSON object'
    }),
    settings: joi_1.default.object()
        .optional()
        .messages({
        'object.base': 'Settings must be a valid JSON object'
    })
});
exports.modelIdSchema = joi_1.default.object({
    id: joi_1.default.number()
        .integer()
        .positive()
        .required()
        .messages({
        'number.positive': 'Model ID must be a positive number',
        'number.integer': 'Model ID must be a whole number',
        'any.required': 'Model ID is required'
    })
});
//# sourceMappingURL=models.js.map