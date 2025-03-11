import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp"); // Ensure the folder exists
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`); // Prevent filename conflicts
  },
});

export const upload = multer({
  storage,
});
