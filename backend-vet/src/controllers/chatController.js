// controllers/chatController.js
import Conversacion from '../models/Conversacion.js'
import Mensaje from '../models/Mensaje.js'
import mongoose from 'mongoose'

export const enviarMensaje = async (req, res) => {
  const { emisorId, emisorRol, receptorId, receptorRol, contenido } = req.body

  try {
    if (!emisorId || !emisorRol || !receptorId || !receptorRol || !contenido) {
      return res.status(400).json({ mensaje: 'Faltan campos obligatorios' })
    }

    // Verificar si existe conversación entre ambos participantes
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

    // Actualizar última actualización de la conversación
    conversacion.ultimaActualizacion = Date.now()
    await conversacion.save()

    // Recuperar mensaje poblado con datos mínimos del emisor (nombre, apellido, foto)
    const mensajePop = await Mensaje.findById(mensaje._id)
      .populate('emisor', 'nombre apellido foto')

    return res.status(201).json({ mensaje: 'Mensaje enviado', data: mensajePop })
  } catch (error) {
    console.error('enviarMensaje error:', error)
    return res.status(500).json({ mensaje: 'Error enviando mensaje', error: error.message })
  }
}

export const obtenerMensajes = async (req, res) => {
  const { conversacionId } = req.params

  try {
    if (!mongoose.Types.ObjectId.isValid(conversacionId)) {
      return res.status(400).json({ mensaje: 'ID de conversación inválido' })
    }

    // Traer mensajes ordenados y poblados con el emisor (nombre, apellido, foto)
    const mensajes = await Mensaje.find({ conversacion: conversacionId })
      .sort({ timestamp: 1 })
      .populate('emisor', 'nombre apellido foto')

    return res.json(mensajes)
  } catch (error) {
    console.error('obtenerMensajes error:', error)
    return res.status(500).json({ mensaje: 'Error al obtener mensajes', error: error.message })
  }
}

export const obtenerConversacionesPorUsuario = async (req, res) => {
  const { usuarioId } = req.params

  try {
    if (!mongoose.Types.ObjectId.isValid(usuarioId)) {
      return res.status(400).json({ mensaje: 'ID de usuario inválido' })
    }

    // Ordenar por última actualización y popular participantes (traer foto)
    const conversaciones = await Conversacion.find({ 'participantes.id': usuarioId })
      .sort({ ultimaActualizacion: -1 })
      .populate('participantes.id', 'nombre apellido foto')

    return res.json(conversaciones)
  } catch (error) {
    console.error('obtenerConversacionesPorUsuario error:', error)
    return res.status(500).json({ mensaje: 'Error al obtener conversaciones', error: error.message })
  }
}
