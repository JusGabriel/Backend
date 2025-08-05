// routers/quejaRoutes.js
import { Router } from 'express'
import {
  enviarQueja,
  obtenerMensajesQueja,
  obtenerQuejasPorUsuario,
  obtenerTodasLasQuejas  // <--- importamos nuevo método
} from '../controllers/quejaController.js'

const router = Router()

// Enviar queja (crea conversación si no existe)
router.post('/queja', enviarQueja)

// Obtener historial de mensajes por queja
router.get('/mensajes/:quejaId', obtenerMensajesQueja)

// Obtener quejas de un usuario (cliente/emprendedor/admin)
router.get('/quejas/:usuarioId/:rol', obtenerQuejasPorUsuario)
// Ruta para obtener todas las quejas (solo admin)
router.get('/todas', obtenerTodasLasQuejas)
export default router
