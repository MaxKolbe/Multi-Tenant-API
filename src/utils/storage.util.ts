import cloudinary from "../configs/cloudinary.config.js";
import { UploadApiResponse } from "cloudinary";

export const uploadToCloudinary = (
  file: Express.Multer.File,
  folder: string,
): Promise<UploadApiResponse | undefined> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          resource_type: "auto",
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      )
      .end(file.buffer);
  });
};

export const deleteFromCloudinary = (
  publicId: string,
  resource_type: string,
): Promise<{ result: string }> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(
      publicId,
      {
        resource_type,
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      },
    );
  });
};

export const searchCloudinary = async (
  searchQuery: string,
  maxResults: number,
): Promise<{ public_id: string; url: string }[]> => {
  const results = await cloudinary.search
    .expression(searchQuery)
    .sort_by("created_at", "desc") // most recent photos first
    .max_results(maxResults)
    .execute();

  // same syntax as ..{return {..}}
  const result = results.resources.map((file: any) => ({
    public_id: file.public_id,
    url: file.secure_url,
  }));

  return result;
};
