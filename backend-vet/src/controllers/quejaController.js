// controllers/quejaController.js
import Queja from '../models/Queja.js'
import MensajeQueja from '../models/MensajeQueja.js'
import Administrador from '../models/Administrador.js'
import Emprendedor from '../models/Emprendedor.js'
import Cliente from '../models/Cliente.js'

// Helper: buscar usuario según su rol
const buscarUsuarioPorRol = async (id, rol) => {
  if (rol === 'Administrador') return await Administrador.findById(id)
  if (rol === 'Emprendedor') return await Emprendedor.findById(id)
  if (rol === 'Cliente') return await Cliente.findById(id)
  return null
}

// Enviar una nueva queja (o mensaje en una queja existente)
export const enviarQueja = async (req, res) => {
  const { emisorId, emisorRol, contenido } = req.body

  try {
    // Validar que el emisor exista
    const emisor = await buscarUsuarioPorRol(emisorId, emisorRol)
    if (!emisor) {
      return res.status(404).json({ mensaje: 'Usuario emisor no encontrado' })
    }

    // Buscar un administrador disponible
    const administrador = await Administrador.findOne({ status: true })
    if (!administrador) {
      return res.status(404).json({ mensaje: 'No hay administrador disponible' })
    }

    // Buscar si ya existe una queja entre emisor y admin
    let queja = await Queja.findOne({
      participantes: {
        $all: [
          { $elemMatch: { id: emisorId, rol: emisorRol } },
          { $elemMatch: { id: administrador._id, rol: 'Administrador' } }
        ]
      }
    })

    // Si no existe, crearla
    if (!queja) {
      queja = await Queja.create({
        participantes: [
          { id: emisorId, rol: emisorRol },
          { id: administrador._id, rol: 'Administrador' }
        ]
      })
    }

    // Crear el mensaje
    const mensaje = await MensajeQueja.create({
      queja: queja._id,
      emisor: emisorId,
      emisorRol,
      contenido
    })

    queja.ultimaActualizacion = Date.now()
    await queja.save()

    res.status(201).json({ mensaje: 'Queja enviada', data: mensaje })
  } catch (error) {
    res.status(500).json({ mensaje: 'Error enviando queja', error: error.message })
  }
}

// Obtener mensajes de una queja
export const obtenerMensajesQueja = async (req, res) => {
  const { quejaId } = req.params

  try {
    const mensajes = await MensajeQueja.find({ queja: quejaId }).sort({ timestamp: 1 })
    res.json(mensajes)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener mensajes', error: error.message })
  }
}

// Obtener las quejas en las que participa un usuario
export const obtenerQuejasPorUsuario = async (req, res) => {
  const { usuarioId, rol } = req.params

  try {
    const query =
      rol === 'Administrador'
        ? { 'participantes': { $elemMatch: { rol: 'Administrador', id: usuarioId } } }
        : { 'participantes': { $elemMatch: { id: usuarioId } } }

    const quejas = await Queja.find(query)
      .sort({ ultimaActualizacion: -1 })
      .populate('participantes.id')

    res.json(quejas)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener quejas', error: error.message })
  }
}

// Obtener todas las quejas (uso exclusivo del administrador)
export const obtenerTodasLasQuejas = async (req, res) => {
  try {
    const quejas = await Queja.find()
      .sort({ ultimaActualizacion: -1 })
      .populate('participantes.id')

    res.json(quejas)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener todas las quejas', error: error.message })
  }
}
// Obtener todas las quejas con sus mensajes incluidos
export const obtenerTodasLasQuejasConMensajes = async (req, res) => {
  try {
    const quejas = await Queja.find()
      .sort({ ultimaActualizacion: -1 })
      .populate('participantes.id')

    // Para cada queja, buscar los mensajes
    const quejasConMensajes = await Promise.all(
      quejas.map(async (queja) => {
        const mensajes = await MensajeQueja.find({ queja: queja._id }).sort({ timestamp: 1 })
        return {
          ...queja.toObject(),
          mensajes
        }
      })
    )

    res.json(quejasConMensajes)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener todas las quejas con mensajes', error: error.message })
  }
}
