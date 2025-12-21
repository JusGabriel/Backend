// routes/emprendimientoRoutes.js
import { Router } from 'express';
import {
  crearEmprendimiento,
  obtenerMisEmprendimientos,
  obtenerEmprendimiento,
  actualizarEmprendimiento,
  eliminarEmprendimiento,
  obtenerEmprendimientosPublicos,
  obtenerEmprendimientoPorSlug
} from '../controllers/emprendimientoController.js';

import { verificarTokenJWT } from '../middleware/JWT.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configurar carpeta uploads (asegurar existencia)
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage & filter (aceptar solo imágenes y limitar tamaño)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowed.includes(ext)) {
    return cb(new Error('Tipo de archivo no permitido. Solo imágenes.'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // 2 MB max (ajusta si necesitas)
});

// -----------------------------
// RUTAS PÚBLICAS
// -----------------------------
router.get('/publicos', obtenerEmprendimientosPublicos);

// RUTA PÚBLICA POR SLUG (URL amigable para frontend)
router.get('/publico/:slug', obtenerEmprendimientoPorSlug);
router.get('/s/:slug', obtenerEmprendimientoPorSlug);

// RUTA POR ID (debe ir después de las rutas por slug)
router.get('/:id', obtenerEmprendimiento);

// -----------------------------
// RUTAS PROTEGIDAS
// -----------------------------
router.post('/', verificarTokenJWT, upload.single('logo'), crearEmprendimiento);
router.get('/', verificarTokenJWT, obtenerMisEmprendimientos);
router.put('/:id', verificarTokenJWT, upload.single('logo'), actualizarEmprendimiento);
router.delete('/:id', verificarTokenJWT, eliminarEmprendimiento);

export default router;
