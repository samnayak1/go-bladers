import express from "express"
import { getContentCreatorsHandler } from "../controllers/auth.controller";




const router = express.Router();



router.get("/creators", getContentCreatorsHandler);


export default router;