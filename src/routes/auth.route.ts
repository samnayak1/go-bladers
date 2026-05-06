import express from "express";

import { verifyToken } from "../middleware/auth.middleware";
import { confirmRegistrationCodeHandler, getUserDetailsHandler, loginHandler, refreshTokenHandler, sessionUserDetailsHandler, signupHandler } from "../controllers/auth.controller";

const router = express.Router();

router.post("/register", signupHandler);
router.post("/confirm", confirmRegistrationCodeHandler);
router.post("/login", loginHandler);
router.get("/me", verifyToken, sessionUserDetailsHandler);
router.post("/refresh", refreshTokenHandler);

router.get("/:username", getUserDetailsHandler);

export default router;