const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const UPLOAD_BASE = path.join(__dirname, "..", "..", "public", "uploads");

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const memoryStorage = multer.memoryStorage();

const imageFilter = (_req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Format file harus JPG, PNG, atau WebP."), false);
};

const createUploader = (subdir, maxWidth = 800, maxHeight = 600) => {
  const upload = multer({
    storage: memoryStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
  });

  const processImage = async (req, _res, next) => {
    if (!req.file) return next();
    try {
      const dir = path.join(UPLOAD_BASE, subdir);
      ensureDir(dir);
      const filename = `${crypto.randomBytes(16).toString("hex")}.webp`;
      const filepath = path.join(dir, filename);
      await sharp(req.file.buffer)
        .resize(maxWidth, maxHeight, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(filepath);
      req.file.savedFilename = filename;
      req.file.savedPath = `/uploads/${subdir}/${filename}`;
      next();
    } catch (err) {
      next(err);
    }
  };

  return { upload, processImage };
};

const deleteFile = (relativePath) => {
  if (!relativePath) return;
  const fullPath = path.join(__dirname, "..", "..", "public", relativePath);
  if (fs.existsSync(fullPath)) {
    fs.unlink(fullPath, () => {});
  }
};

module.exports = { createUploader, deleteFile, UPLOAD_BASE };
