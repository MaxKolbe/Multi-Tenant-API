import { v2 as cloudinary } from "cloudinary";
import { env } from "./env.config.js";

cloudinary.config({
  cloud_name: env.CLOUDINARY_NAME!,
  api_key: env.CLOUDINARY_KEY!,
  api_secret: env.CLOUDINARY_SECRET!,
});

export default cloudinary;
