
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
import upload, { setUploadFolder } from '../middlewares/upload.js';

const router = Router();

// Rutas públicas
router.get('/todos', obtenerTodosLosProductos);
router.get('/emprendedor/:emprendedorId', obtenerProductosPorEmprendedor);
router.get('/:id', obtenerProducto);

// Rutas protegidas (subida de imagen con Cloudinary)
router.post(
  '/',
  verificarTokenJWT,
  setUploadFolder('productos'),
  upload.single('imagen'),
  crearProducto
);

router.put(
  '/:id',
  verificarTokenJWT,
  setUploadFolder('productos'),
  upload.single('imagen'),
  actualizarProducto
);

router.delete('/:id', verificarTokenJWT, eliminarProducto);

export default router;
