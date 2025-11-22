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

// RUTA PÚBLICA POR SLUG (URL amigable para frontend)
router.get('/publico/:slug', obtenerEmprendimientoPorSlug)

// RUTA ALTERNATIVA (compatibilidad)
router.get('/s/:slug', obtenerEmprendimientoPorSlug)

// RUTA POR ID (debe ir después de las rutas por slug)
router.get('/:id', obtenerEmprendimiento)

// -----------------------------
// RUTAS PROTEGIDAS
// -----------------------------
router.post('/', verificarTokenJWT, crearEmprendimiento)
router.get('/', verificarTokenJWT, obtenerMisEmprendimientos)
router.put('/:id', verificarTokenJWT, actualizarEmprendimiento)
router.delete('/:id', verificarTokenJWT, eliminarEmprendimiento)

export default router
