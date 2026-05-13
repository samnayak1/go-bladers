import express from "express"
import { getContentCreatorsHandler } from "../controllers/auth.controller";
import { validatePaginationQuery } from "../validators/auth.validator";




const router = express.Router();


/**
 * @swagger
 * /auth/creators:
 *   get:
 *     summary: Get content creators paginated
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of creators retrieved successfully
 *       400:
 *         description: Invalid pagination parameters
 */
router.get("/creators", validatePaginationQuery, getContentCreatorsHandler);


export default router;