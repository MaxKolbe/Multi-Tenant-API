import express from "express";
import { registerBodySchema, loginBodySchema } from "./auth.schema.js";
import { registerController, loginController } from "./auth.controller.js";
import { validateRequest } from "../../middleware/validate.middleware.js";

const router = express.Router();

router.post("/register", validateRequest(registerBodySchema), registerController);
router.post("/login", validateRequest(loginBodySchema), loginController);

export default router;
