// controllers/quejaController.js
import Queja from '../models/Queja.js'
import MensajeQueja from '../models/MensajeQueja.js'

export const enviarQueja = async (req, res) => {
  const { emisorId, emisorRol, contenido } = req.body

  try {
    // Buscamos al menos 1 administrador para conversar con él/ella.
    // Aquí puedes adaptar si hay más de un admin, aquí tomamos el primero.
    const administrador = await Queja.db.collection('users') // o donde esté tu colección usuarios
      .findOne({ rol: 'Administrador' })

    if (!administrador) return res.status(404).json({ mensaje: 'No hay administrador disponible' })

    // Buscar si existe ya una queja entre el emisor y admin
    let queja = await Queja.findOne({
      participantes: {
        $all: [
          { $elemMatch: { id: emisorId, rol: emisorRol } },
          { $elemMatch: { id: administrador._id, rol: 'Administrador' } }
        ]
      }
    })

    // Si no existe la conversación, crearla
    if (!queja) {
      queja = await Queja.create({
        participantes: [
          { id: emisorId, rol: emisorRol },
          { id: administrador._id, rol: 'Administrador' }
        ]
      })
    }

    // Crear el mensaje de la queja
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

export const obtenerMensajesQueja = async (req, res) => {
  const { quejaId } = req.params

  try {
    const mensajes = await MensajeQueja.find({ queja: quejaId }).sort({ timestamp: 1 })
    res.json(mensajes)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener mensajes', error: error.message })
  }
}

export const obtenerQuejasPorUsuario = async (req, res) => {
  const { usuarioId, rol } = req.params

  try {
    // Solo un admin ve todas las quejas
    let query
    if (rol === 'Administrador') {
      // Admin ve todas las quejas donde participa como admin
      query = { 'participantes': { $elemMatch: { rol: 'Administrador', id: usuarioId } } }
    } else {
      // Emprendedor o Cliente ven solo las quejas donde son participantes
      query = { 'participantes': { $elemMatch: { id: usuarioId } } }
    }

    const quejas = await Queja.find(query)
      .sort({ ultimaActualizacion: -1 })
      .populate('participantes.id')

    res.json(quejas)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener quejas', error: error.message })
  }
}
// Obtener todas las quejas (solo admin)
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
