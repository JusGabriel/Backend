
// src/routers/comentario_routes.js
import { Router } from 'express';
import {
  crearComentario,
  listarComentariosProducto,
  listarComentariosEmprendimiento,
  eliminarComentario
} from '../controllers/comentario_controllers.js';

import { verificarTokenJWT } from '../middleware/JWT.js';

const router = Router();

// Crear comentario (JWT)
router.post('/', verificarTokenJWT, crearComentario);

// Listar comentarios de un Producto (público)
router.get('/producto/:id', listarComentariosProducto);

// Listar comentarios de un Emprendimiento (público)
router.get('/emprendimiento/:id', listarComentariosEmprendimiento);

// Eliminar comentario (autor o Admin; JWT)
router.delete('/:id', verificarTokenJWT, eliminarComentario);

export default router;
