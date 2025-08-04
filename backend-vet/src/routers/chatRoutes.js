// routers/chatRoutes.js
import { Router } from 'express'
import {
  enviarMensaje,
  obtenerMensajes,
  obtenerConversacionesPorUsuario
} from '../controllers/chatController.js'

const router = Router()

// Enviar mensaje (crea conversación si no existe)
router.post('/mensaje', enviarMensaje)

// Obtener historial de mensajes por conversación
router.get('/mensajes/:conversacionId', obtenerMensajes)

// Obtener conversaciones de un usuario
router.get('/conversaciones/:usuarioId', obtenerConversacionesPorUsuario)

export default router
