//ROUTES
import express from "express";
import { exampleBodySchema, exampleParamSchema, exampleQuerySchema } from "./feature.schema.js";
import { validateRequest } from "../../middleware/validate.middleware.js";
const router = express.Router();

router.get("/");
router.post("/");
router.put("/");
router.delete("/");
router.post("/");

export default router;
