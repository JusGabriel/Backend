import { Router } from 'express'
import {
  crearEmprendimiento,
  obtenerMisEmprendimientos,
  obtenerEmprendimiento,
  actualizarEmprendimiento,
  eliminarEmprendimiento,
  obtenerEmprendimientosPublicos
} from '../controllers/emprendimientoController.js'

import { verificarTokenJWT } from '../middleware/JWT.js'

const router = Router()

// Rutas públicas
router.get('/publicos', obtenerEmprendimientosPublicos)
router.get('/:id', obtenerEmprendimiento) // Público si está activo, o si es el dueño

// Rutas protegidas
router.post('/', verificarTokenJWT, crearEmprendimiento)
router.get('/', verificarTokenJWT, obtenerMisEmprendimientos)
router.put('/:id', verificarTokenJWT, actualizarEmprendimiento)
router.delete('/:id', verificarTokenJWT, eliminarEmprendimiento)

export default router
