
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validate = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const dataToValidate = {
            ...req.body,
            ...req.params,
            ...req.query
        };
        
        const { error, value } = schema.validate(dataToValidate, {
            abortEarly: false,
            stripUnknown: true
        });
        
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
        
        // Replace request data with validated data
        if (Object.keys(req.body).length) req.body = value;
        if (Object.keys(req.params).length) req.params = value;
        if (Object.keys(req.query).length) req.query = value;
        
        next();
    };
};


export const validateUUID = (paramName: string = 'id') => {
    return (req: Request, res: Response, next: NextFunction) => {
        const uuidSchema = Joi.string().uuid().required();
        const { error } = uuidSchema.validate(req.params[paramName]);
        
        if (error) {
            return res.status(400).json({
                success: false,
                message: `Invalid ${paramName} format. Must be a valid UUID`
            });
        }
        next();
    };
};

export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
    const schema = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10)
    });
    
    const { error, value } = schema.validate(req.query);
    
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Invalid pagination parameters',
            errors: error.details.map(d => d.message)
        });
    }
    
    req.query = value;
    next();
};