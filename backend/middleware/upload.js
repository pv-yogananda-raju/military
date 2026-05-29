import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up storage in memory for raw stream piping to Cloudinary
const storage = multer.memoryStorage();

// Allowed file MIME validation map
const ALLOWED_MIMES = {
  // Images
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  // Documents
  'application/pdf': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/msword': 'document',
  // Audio
  'audio/mpeg': 'audio',
  'audio/mp3': 'audio',
  'audio/wav': 'audio',
  'audio/x-wav': 'audio',
  // Video
  'video/mp4': 'video'
};

// Validate file extensions as well (extra security defense layer)
const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.docx', '.doc', '.mp3', '.wav', '.mp4'];

const fileFilter = (req, file, cb) => {
  const fileMime = file.mimetype;
  const fileExt = path.extname(file.originalname).toLowerCase();

  const isMimeValid = ALLOWED_MIMES[fileMime] !== undefined;
  const isExtValid = ALLOWED_EXTS.includes(fileExt);

  if (isMimeValid && isExtValid) {
    cb(null, true);
  } else {
    cb(new Error(`Security Protocol Rejection: File type ${fileExt} (${fileMime}) is not authorized. Allowed: JPG, PNG, WEBP, PDF, DOCX, MP3, WAV, MP4`), false);
  }
};

// Multer upload instances
export const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB max file size limit
  },
  fileFilter
});
