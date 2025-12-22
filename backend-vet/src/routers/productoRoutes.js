// routers/productoRoutes.js
import { Router } from 'express';
import {
  crearProducto,
  obtenerProductosPorEmprendedor,
  obtenerProducto,
  actualizarProducto,
  eliminarProducto,
  obtenerTodosLosProductos
} from '../controllers/productoController.js';

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
  limits: { fileSize: 2 * 1024 * 1024 } // 2 MB max
});

// Rutas públicas
router.get('/todos', obtenerTodosLosProductos);
router.get('/emprendedor/:emprendedorId', obtenerProductosPorEmprendedor);
router.get('/:id', obtenerProducto);

// Rutas protegidas (creación/actualización/eliminación con subida de imagen)
router.post('/', verificarTokenJWT, upload.single('imagen'), crearProducto);
router.put('/:id', verificarTokenJWT, upload.single('imagen'), actualizarProducto);
router.delete('/:id', verificarTokenJWT, eliminarProducto);

export default router;
