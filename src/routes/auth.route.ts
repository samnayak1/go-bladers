import express from "express";
import { 
    signupHandler, 
    confirmRegistrationCodeHandler, 
    loginHandler, 
    sessionUserDetailsHandler, 
    refreshTokenHandler, 
    getUserDetailsHandler,
    getContentCreatorsHandler, 
    resendConfirmationCodeHandler
} from "../controllers/auth.controller";
import { verifyToken } from "../middleware/auth.middleware";
import { 
    validateSignup, 
    validateConfirmRegistration, 
    validateLogin, 
    validateRefreshToken,
    validateUsernameParam,
    validateResendConfirmationCode,
} from "../validators/auth.validator";

const router = express.Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *                 pattern: ^[a-zA-Z0-9]+$
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Bad request - Validation failed
 */
router.post("/register", validateSignup, signupHandler);

/**
 * @swagger
 * /auth/confirm:
 *   post:
 *     summary: Confirm user registration with code
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               code:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *                 pattern: ^\d+$
 *     responses:
 *       200:
 *         description: Account confirmed successfully
 *       400:
 *         description: Invalid confirmation code
 *       404:
 *         description: User not found
 *       409:
 *         description: User is already confirmed
 */
router.post("/confirm", validateConfirmRegistration, confirmRegistrationCodeHandler);


router.post( "/resend-confirmation-code",validateResendConfirmationCode,
  resendConfirmationCodeHandler
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 idToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 expiresIn:
 *                   type: number
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", validateLogin, loginHandler);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User details
 *       401:
 *         description: Unauthorized
 */
router.get("/me", verifyToken, sessionUserDetailsHandler);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh User's token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - userId
 *             properties:
 *               token:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Refresh Token successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 idToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 expiresIn:
 *                   type: number
 *                 expiresAt:
 *                   type: string
 *       400:
 *         description: Validation failed
 *       500:
 *         description: Refresh token failed
 */
router.post("/refresh", validateRefreshToken, refreshTokenHandler);

/**
 * @swagger
 * /auth/{username}:
 *   get:
 *     summary: Get user details by username
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: Username of the user
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *       400:
 *         description: Invalid username format
 *       404:
 *         description: User not found
 */
router.get("/:username", validateUsernameParam, getUserDetailsHandler);






export default router;