import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

// Helper function for validation
const validate = (schema: Joi.ObjectSchema, source: 'body' | 'params' | 'query' = 'body') => {
    return (req: Request, res: Response, next: NextFunction) => {
        const data = req[source];
        const { error } = schema.validate(data, { abortEarly: false });
        
        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));
            
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }
        
        next();
    };
};


const usernameParamSchema = Joi.object({
    username: Joi.string()
        .pattern(/^[a-zA-Z0-9]+$/)
        .min(3)
        .max(30)
        .required()
        .messages({
            'string.pattern.base': 'Username must contain only letters and numbers',
            'string.min': 'Username must be at least 3 characters',
            'string.max': 'Username cannot exceed 30 characters',
            'any.required': 'Username is required'
        })
}).unknown(true); // Allow other params like streamId, variant, segment

const streamIdParamSchema = Joi.object({
    streamId: Joi.string()
        .required()
        .messages({
            'any.required': 'Stream ID is required'
        })
}).unknown(true); 




const paginationQuerySchema = Joi.object({
    page: Joi.number()
        .integer()
        .min(1)
        .optional()
        .messages({
            'number.base': 'Page must be a number',
            'number.integer': 'Page must be an integer',
            'number.min': 'Page must be at least 1'
        }),
    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .optional()
        .messages({
            'number.base': 'Limit must be a number',
            'number.integer': 'Limit must be an integer',
            'number.min': 'Limit must be at least 1',
            'number.max': 'Limit cannot exceed 100'
        })
}).unknown(true); 

// Schema for variant and segment parameters
const variantSegmentSchema = Joi.object({
    variant: Joi.string()
        .pattern(/^[a-zA-Z0-9_\-/]+$/)
        .required()
        .messages({
            'string.pattern.base': 'Variant contains invalid characters',
            'any.required': 'Variant parameter is required'
        }),
    segment: Joi.string()
        .pattern(/^[a-zA-Z0-9_\-./]+$/)
        .required()
        .messages({
            'string.pattern.base': 'Segment contains invalid characters',
            'any.required': 'Segment parameter is required'
        })
}).unknown(true); 

// Export validators
export const validateUsernameParam = validate(usernameParamSchema, 'params');
export const validateStreamIdParam = validate(streamIdParamSchema, 'params');

export const validatePaginationQuery = validate(paginationQuerySchema, 'query');
export const validateVariantSegment = validate(variantSegmentSchema, 'params');