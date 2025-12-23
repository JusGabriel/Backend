
// middlewares/upload.js
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

// Formatos aceptados (móviles + desktop)
const ACCEPTED_MIME = /image\/(jpe?g|png|webp|heic|heif|tiff?|bmp)/i;

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: `quitoemprende/${req.uploadFolder || 'general'}`,
    resource_type: 'image',
    use_filename: true,
    unique_filename: true,
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'tif', 'tiff', 'bmp'],
    transformation: [{ quality: 'auto', fetch_format: 'auto', flags: 'lossy' }],
  }),
});

const fileFilter = (req, file, cb) => {
  const ok = ACCEPTED_MIME.test(file.mimetype);
  cb(ok ? null : new Error('Formato no permitido (jpg, jpeg, png, webp, heic, heif, tiff, bmp)'), ok);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

export default upload;

// Utilidad para setear carpeta (logos/productos, etc.)
export const setUploadFolder = (folder) => (req, _res, next) => {
  req.uploadFolder = folder;
  next();
};
