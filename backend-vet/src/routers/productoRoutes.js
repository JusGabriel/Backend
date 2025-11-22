import { Router } from 'express';
import {
  crearProducto,
  obtenerProductosPorEmprendedor,
  obtenerProducto,
  actualizarProducto,
  eliminarProducto,
  obtenerTodosLosProductos
} from '../controllers/productoController.js';

import { verificarTokenJWT } from '../middleware/JWT.js'; // Middleware de autenticación

const router = Router();

// Crear producto (solo con JWT)
router.post('/', verificarTokenJWT, crearProducto);

// Obtener todos los productos (públicos)
router.get('/todos', obtenerTodosLosProductos);

// Obtener todos los productos de un emprendedor
router.get('/emprendedor/:emprendedorId', obtenerProductosPorEmprendedor);

// Obtener un producto por ID
router.get('/:id', obtenerProducto);

// Actualizar producto (solo dueño)
router.put('/:id', verificarTokenJWT, actualizarProducto);

// Eliminar producto (solo dueño)
router.delete('/:id', verificarTokenJWT, eliminarProducto);

export default router;
