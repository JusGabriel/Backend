
// middlewares/upload.js
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: `quitoemprende/${req.uploadFolder || 'general'}`,
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    use_filename: true,
    unique_filename: true,
    // Optimización (ajusta según tu UI)
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  }),
});

const fileFilter = (req, file, cb) => {
  const ok = /image\/(jpe?g|png|webp)/i.test(file.mimetype);
  cb(ok ? null : new Error('Formato no permitido (solo jpg, jpeg, png, webp)'), ok);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB (ajusta según necesidad)
});

export default upload;

// Utilidad para setear carpeta (logos/productos)
export const setUploadFolder = (folder) => (req, _res, next) => {
  req.uploadFolder = folder;
  next();
};
