//ROUTES
import express from "express";
import { exampleAuthScema } from "./auth.schema.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { validateRequest } from "../../middleware/validate.middleware.js";
import {
  signupController,
  loginController,
  logoutController,
  sessionController,
} from "./auth.controller.js";

const router = express.Router();

router.post("/signup", validateRequest(exampleAuthScema), signupController);
router.post("/login", validateRequest(exampleAuthScema), loginController);
router.post("/logout", logoutController);
router.post("/session", authenticate(), sessionController);
