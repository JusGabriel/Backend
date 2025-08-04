// controllers/chatController.js
import Conversacion from '../models/Conversacion.js'
import Mensaje from '../models/Mensaje.js'

export const enviarMensaje = async (req, res) => {
  const { emisorId, emisorRol, receptorId, receptorRol, contenido } = req.body

  try {
    // Verificar si existe conversación
    let conversacion = await Conversacion.findOne({
      participantes: {
        $all: [
          { $elemMatch: { id: emisorId, rol: emisorRol } },
          { $elemMatch: { id: receptorId, rol: receptorRol } }
        ]
      }
    })

    // Si no existe, crearla
    if (!conversacion) {
      conversacion = await Conversacion.create({
        participantes: [
          { id: emisorId, rol: emisorRol },
          { id: receptorId, rol: receptorRol }
        ]
      })
    }

    // Crear mensaje
    const mensaje = await Mensaje.create({
      conversacion: conversacion._id,
      emisor: emisorId,
      emisorRol,
      contenido
    })

    conversacion.ultimaActualizacion = Date.now()
    await conversacion.save()

    res.status(201).json({ mensaje: 'Mensaje enviado', data: mensaje })
  } catch (error) {
    res.status(500).json({ mensaje: 'Error enviando mensaje', error: error.message })
  }
}

export const obtenerMensajes = async (req, res) => {
  const { conversacionId } = req.params

  try {
    const mensajes = await Mensaje.find({ conversacion: conversacionId }).sort({ timestamp: 1 })
    res.json(mensajes)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener mensajes', error: error.message })
  }
}

export const obtenerConversacionesPorUsuario = async (req, res) => {
  const { usuarioId } = req.params

  try {
    const conversaciones = await Conversacion.find({ 'participantes.id': usuarioId })
      .sort({ ultimaActualizacion: -1 })
      .populate('participantes.id')

    res.json(conversaciones)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener conversaciones', error: error.message })
  }
}
