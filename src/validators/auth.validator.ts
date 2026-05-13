
import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';


const validate = (schema: Joi.ObjectSchema, source: 'body' | 'params' | 'query' = 'body') => {
    return (req: Request, res: Response, next: NextFunction) => {
        const data = req[source];
        const { error, value } = schema.validate(data, { abortEarly: false });
        
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
        

        if (source === 'body') {
            req.body = value;
        } else if (source === 'params') {
            req.params = value;
        }

        
        next();
    };
};


const signupSchema = Joi.object({
    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),
    password: Joi.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
        .required()
        .messages({
            'string.min': 'Password must be at least 8 characters long',
            'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
            'any.required': 'Password is required'
        }),
    userName: Joi.string()
        .alphanum()
        .min(3)
        .max(30)
        .required()
        .messages({
            'string.alphanum': 'Username can only contain letters and numbers',
            'string.min': 'Username must be at least 3 characters long',
            'string.max': 'Username cannot exceed 30 characters',
            'any.required': 'Username is required'
        })
});

const confirmRegistrationSchema = Joi.object({
    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),
    code: Joi.string()
        .length(6)
        .pattern(/^\d+$/)
        .required()
        .messages({
            'string.length': 'Confirmation code must be exactly 6 digits',
            'string.pattern.base': 'Confirmation code must contain only numbers',
            'any.required': 'Confirmation code is required'
        })
});

const loginSchema = Joi.object({
    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),
    password: Joi.string()
        .required()
        .messages({
            'any.required': 'Password is required'
        })
});

const refreshTokenSchema = Joi.object({
    token: Joi.string()
        .required()
        .messages({
            'any.required': 'Refresh token is required'
        }),
    userId: Joi.string()
        .required()
        .messages({
            'any.required': 'User ID is required'
        })
});

const usernameParamSchema = Joi.object({
    username: Joi.string()
        .alphanum()
        .min(3)
        .max(30)
        .required()
        .messages({
            'string.alphanum': 'Username can only contain letters and numbers',
            'string.min': 'Username must be at least 3 characters long',
            'string.max': 'Username cannot exceed 30 characters',
            'any.required': 'Username is required'
        })
});

const paginationQuerySchema = Joi.object({
    page: Joi.number()
        .integer()
        .min(1)
        .default(1)
        .messages({
            'number.base': 'Page must be a number',
            'number.integer': 'Page must be an integer',
            'number.min': 'Page must be at least 1'
        }),
    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(10)
        .messages({
            'number.base': 'Limit must be a number',
            'number.integer': 'Limit must be an integer',
            'number.min': 'Limit must be at least 1',
            'number.max': 'Limit cannot exceed 100'
        })
});


export const validateSignup = validate(signupSchema, 'body');
export const validateConfirmRegistration = validate(confirmRegistrationSchema, 'body');
export const validateLogin = validate(loginSchema, 'body');
export const validateRefreshToken = validate(refreshTokenSchema, 'body');
export const validateUsernameParam = validate(usernameParamSchema, 'params');
export const validatePaginationQuery = validate(paginationQuerySchema, 'query');