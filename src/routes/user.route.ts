import express from "express"
import { getContentCreatorsHandler } from "../controllers/auth.controller";




const router = express.Router();


/**
 * @swagger
 * /user/creators:
 *   get:
 *     summary: Get content creators paginated
 *     tags: [User]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of creators
 */
router.get("/creators", getContentCreatorsHandler);


export default router;