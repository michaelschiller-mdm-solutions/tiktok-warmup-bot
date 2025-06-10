import Joi from 'joi';

// Validation schema for creating a new model
export const createModelSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(255)
    .required()
    .messages({
      'string.min': 'Model name must be at least 3 characters long',
      'string.max': 'Model name cannot exceed 255 characters',
      'any.required': 'Model name is required'
    }),
  
  description: Joi.string()
    .max(1000)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Description cannot exceed 1000 characters'
    }),
  
  unfollow_ratio: Joi.number()
    .integer()
    .min(0)
    .max(100)
    .default(90)
    .messages({
      'number.min': 'Unfollow ratio must be between 0 and 100',
      'number.max': 'Unfollow ratio must be between 0 and 100',
      'number.integer': 'Unfollow ratio must be a whole number'
    }),
  
  daily_follow_limit: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .default(100)
    .messages({
      'number.min': 'Daily follow limit must be at least 1',
      'number.max': 'Daily follow limit cannot exceed 1000',
      'number.integer': 'Daily follow limit must be a whole number'
    }),
  
  posting_schedule: Joi.object()
    .default({})
    .messages({
      'object.base': 'Posting schedule must be a valid JSON object'
    }),
  
  settings: Joi.object()
    .default({})
    .messages({
      'object.base': 'Settings must be a valid JSON object'
    })
});

// Validation schema for updating a model
export const updateModelSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(255)
    .optional()
    .messages({
      'string.min': 'Model name must be at least 3 characters long',
      'string.max': 'Model name cannot exceed 255 characters'
    }),
  
  description: Joi.string()
    .max(1000)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Description cannot exceed 1000 characters'
    }),
  
  status: Joi.string()
    .valid('active', 'inactive', 'paused')
    .optional()
    .messages({
      'any.only': 'Status must be one of: active, inactive, paused'
    }),
  
  unfollow_ratio: Joi.number()
    .integer()
    .min(0)
    .max(100)
    .optional()
    .messages({
      'number.min': 'Unfollow ratio must be between 0 and 100',
      'number.max': 'Unfollow ratio must be between 0 and 100',
      'number.integer': 'Unfollow ratio must be a whole number'
    }),
  
  daily_follow_limit: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .optional()
    .messages({
      'number.min': 'Daily follow limit must be at least 1',
      'number.max': 'Daily follow limit cannot exceed 1000',
      'number.integer': 'Daily follow limit must be a whole number'
    }),
  
  posting_schedule: Joi.object()
    .optional()
    .messages({
      'object.base': 'Posting schedule must be a valid JSON object'
    }),
  
  settings: Joi.object()
    .optional()
    .messages({
      'object.base': 'Settings must be a valid JSON object'
    })
});

// Validation schema for model ID parameter
export const modelIdSchema = Joi.object({
  id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.positive': 'Model ID must be a positive number',
      'number.integer': 'Model ID must be a whole number',
      'any.required': 'Model ID is required'
    })
}); 