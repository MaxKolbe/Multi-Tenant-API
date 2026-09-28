//ROUTES
import express from "express";
import { exampleBodySchema, exampleParamSchema, exampleQuerySchema } from "./feature.schema.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { validateRequest } from "../../middleware/validate.middleware.js";
import { upload } from "../../configs/multer.config.js";

const router = express.Router();

router.get("/");
router.post("/");
router.put("/");
router.delete("/");
router.post("/", upload.single("file"));
router.post(
  "/",
  upload.fields([
    { name: "exampleFile1", maxCount: 1 },
    { name: "exampleFile2", maxCount: 1 },
    { name: "exampleFile3", maxCount: 1 },
  ]),
);

export default router;
