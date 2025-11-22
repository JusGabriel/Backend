import { Router } from 'express'
import {
  crearEmprendimiento,
  obtenerMisEmprendimientos,
  obtenerEmprendimiento,
  actualizarEmprendimiento,
  eliminarEmprendimiento,
  obtenerEmprendimientosPublicos,
  obtenerEmprendimientoPorSlug
} from '../controllers/emprendimientoController.js'

import { verificarTokenJWT } from '../middleware/JWT.js'

const router = Router()

// -----------------------------
// RUTAS PUBLICAS
// -----------------------------
router.get('/publicos', obtenerEmprendimientosPublicos)

// RUTA POR SLUG  (DEBE IR ANTES DE /:id)
router.get('/s/:slug', obtenerEmprendimientoPorSlug)

// RUTA POR ID
router.get('/:id', obtenerEmprendimiento)

// -----------------------------
// RUTAS PROTEGIDAS
// -----------------------------
router.post('/', verificarTokenJWT, crearEmprendimiento)
router.get('/', verificarTokenJWT, obtenerMisEmprendimientos)
router.put('/:id', verificarTokenJWT, actualizarEmprendimiento)
router.delete('/:id', verificarTokenJWT, eliminarEmprendimiento)

export default router
