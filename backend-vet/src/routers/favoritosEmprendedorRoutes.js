import { Router } from 'express'
import {
  agregarAFavoritos,
  eliminarDeFavoritos,
  obtenerFavoritos
} from '../controllers/emprendedor_controllers.js'
import { verificarTokenJWT } from '../middleware/JWT.js'

const router = Router()

router.post('/', verificarTokenJWT, agregarAFavoritos)
router.delete('/:emprendimientoId', verificarTokenJWT, eliminarDeFavoritos)
router.get('/', verificarTokenJWT, obtenerFavoritos)

export default router
