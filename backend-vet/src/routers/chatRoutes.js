// routers/chatRoutes.js
import { Router } from 'express'
import {
  enviarMensaje,
  obtenerMensajes,
  obtenerConversacionesPorUsuario
} from '../controllers/chatController.js'

const router = Router()

router.post('/mensaje', enviarMensaje)
router.get('/mensajes/:conversacionId', obtenerMensajes)
router.get('/conversaciones/:usuarioId', obtenerConversacionesPorUsuario)

export default router
