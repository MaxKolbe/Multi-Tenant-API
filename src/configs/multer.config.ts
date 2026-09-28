import multer from "multer";

// MEMORY STORAGE
export const upload = multer({
  storage: multer.memoryStorage(),
});

/** DISK STORAGE */
// export const upload = multer({
//   storage: multer.diskStorage({
//     destination: "uploads/",
//   }),
//   // It is better system design to enforce limits at the application level
//   //   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
// });
