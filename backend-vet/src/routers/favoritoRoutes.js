import { Router } from 'express'
import {
  agregarAFavoritos,
  eliminarDeFavoritos,
  obtenerFavoritos
} from '../controllers/cliente_controllers.js'

import { verificarTokenJWT } from '../middleware/JWT.js'

const router = Router()

// Solo clientes autenticados pueden gestionar favoritos
router.post('/', verificarTokenJWT, agregarAFavoritos)
router.delete('/:emprendimientoId', verificarTokenJWT, eliminarDeFavoritos)
router.get('/', verificarTokenJWT, obtenerFavoritos)

export default router
