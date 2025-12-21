import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import {
  crearProducto,
  obtenerProducto,
  obtenerProductosPorEmprendedor,
  actualizarProducto,
  eliminarProducto,
  obtenerTodosLosProductos
} from '../controllers/productoController.js';

import { verificarTokenJWT } from '../middleware/JWT.js';

const router = Router();

// ---------- uploads/productos ----------
const uploadsDir = path.join(process.cwd(), 'uploads', 'productos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ---------- Multer ----------
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadsDir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowed.includes(ext)) {
    return cb(new Error('Solo imágenes'), false);
  }
  cb(null, true);
};

const upload = multer({ storage, fileFilter });

// ---------- RUTAS ----------

// públicas
router.get('/publicos', obtenerTodosLosProductos);
router.get('/:id', obtenerProducto);

// protegidas
router.get('/emprendedor/:emprendedorId', verificarTokenJWT, obtenerProductosPorEmprendedor);
router.post('/', verificarTokenJWT, upload.single('imagen'), crearProducto);
router.put('/:id', verificarTokenJWT, upload.single('imagen'), actualizarProducto);
router.delete('/:id', verificarTokenJWT, eliminarProducto);

export default router;
