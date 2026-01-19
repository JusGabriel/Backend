
// controllers/cliente_controllers.js
import Cliente from '../models/Cliente.js'
import Emprendimiento from '../models/Emprendimiento.js'
import mongoose from 'mongoose'
import {
  sendMailToRegisterCliente,
  sendMailToRecoveryPasswordCliente,
} from '../config/nodemailerCliente.js'
import { crearTokenJWT } from '../middleware/JWT.js'
import cloudinary from '../config/cloudinary.js'

/* ============================
   Helpers
============================ */
function validarNombre(nombre) {
  if (!nombre || typeof nombre !== 'string' || !/^[a-zA-Z\s]+$/.test(nombre.trim())) {
    return 'El nombre es obligatorio y solo puede contener letras y espacios'
  }
  return null
}

function validarTelefono(telefono) {
  if (telefono == null || telefono === '') return null
  if (typeof telefono !== 'string' && typeof telefono !== 'number') {
    return 'El teléfono debe ser texto o número'
  }
  const telefonoStr = telefono.toString()
  if (!/^\d{7,15}$/.test(telefonoStr)) {
    return 'El teléfono debe contener solo números y tener entre 7 y 15 dígitos'
  }
  return null
}

function isValidDateValue(val) {
  const d = new Date(val)
  return !isNaN(d.getTime())
}
function objectIdToDate(oid) {
  const s = String(oid || '')
  if (s.length >= 8) {
    const ts = parseInt(s.substring(0, 8), 16) * 1000
    const d = new Date(ts)
    if (!isNaN(d.getTime())) return d
  }
  return null
}

/* ============================
   Registro / confirmación / recuperación
============================ */
const registro = async (req, res) => {
  const { nombre, telefono, email, password } = req.body
  if ([nombre, email, password].some(v => !v || String(v).trim() === '')) {
    return res.status(400).json({ msg: 'Nombre, email y password son obligatorios' })
  }

  const e1 = validarNombre(nombre); if (e1) return res.status(400).json({ msg: e1 })
  const e2 = validarTelefono(telefono); if (e2) return res.status(400).json({ msg: e2 })

  const existe = await Cliente.findOne({ email })
  if (existe) return res.status(400).json({ msg: 'Este email ya está registrado' })

  const nuevoCliente = new Cliente(req.body)
  nuevoCliente.password = await nuevoCliente.encrypPassword(password)
  const token = nuevoCliente.crearToken()
  await sendMailToRegisterCliente(email, token)
  await nuevoCliente.save()
  res.status(200).json({ msg: 'Revisa tu correo electrónico para confirmar tu cuenta' })
}

const confirmarMail = async (req, res) => {
  const { token } = req.params
  const clienteBDD = await Cliente.findOne({ token })
  if (!clienteBDD) return res.status(404).json({ msg: 'Token inválido' })
  clienteBDD.token = null
  clienteBDD.confirmEmail = true
  await clienteBDD.save()
  res.status(200).json({ msg: 'Cuenta confirmada correctamente' })
}

const recuperarPassword = async (req, res) => {
  const { email } = req.body
  if (!email || String(email).trim() === '') {
    return res.status(400).json({ msg: 'Debes llenar todos los campos' })
  }
  const clienteBDD = await Cliente.findOne({ email })
  if (!clienteBDD) return res.status(404).json({ msg: 'El usuario no se encuentra registrado' })

  const token = clienteBDD.crearToken()
  clienteBDD.token = token
  await sendMailToRecoveryPasswordCliente(email, token)
  await clienteBDD.save()
  res.status(200).json({ msg: 'Revisa tu correo electrónico para reestablecer tu cuenta' })
}

const comprobarTokenPasword = async (req, res) => {
  const { token } = req.params
  const clienteBDD = await Cliente.findOne({ token })
  if (clienteBDD?.token !== token) {
    return res.status(404).json({ msg: 'No se puede validar la cuenta' })
  }
  res.status(200).json({ msg: 'Token confirmado, ya puedes crear tu nuevo password' })
}

const crearNuevoPassword = async (req, res) => {
  const { password, confirmpassword } = req.body
  if (!password || !confirmpassword) {
    return res.status(400).json({ msg: 'Debes llenar todos los campos' })
  }
  if (password !== confirmpassword) {
    return res.status(400).json({ msg: 'Los passwords no coinciden' })
  }
  const clienteBDD = await Cliente.findOne({ token: req.params.token })
  if (clienteBDD?.token !== req.params.token) {
    return res.status(404).json({ msg: 'No se puede validar la cuenta' })
  }
  clienteBDD.token = null
  clienteBDD.password = await clienteBDD.encrypPassword(password)
  await clienteBDD.save()
  res.status(200).json({ msg: 'Ya puedes iniciar sesión con tu nuevo password' })
}

/* ============================
   Login
============================ */
const login = async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ msg: 'Debes llenar todos los campos' })
  }

  const clienteBDD = await Cliente.findOne({ email }).select('-__v -token -updatedAt -createdAt')
  if (!clienteBDD) return res.status(404).json({ msg: 'El usuario no se encuentra registrado' })
  if (!clienteBDD.confirmEmail) return res.status(403).json({ msg: 'Debe verificar su cuenta' })

  const ok = await clienteBDD.matchPassword(password)
  if (!ok) return res.status(401).json({ msg: 'El password no es el correcto' })

  // Estado visible UI
  let estadoUI = 'Correcto'
  if (clienteBDD.status === false) {
    estadoUI = 'Suspendido'
  } else {
    const e = clienteBDD.estado_Emprendedor
    estadoUI = (['Advertencia1', 'Advertencia2', 'Advertencia3', 'Suspendido'].includes(e)) ? e : 'Correcto'
  }

  if (estadoUI === 'Suspendido') {
    return res.status(403).json({
      msg: 'Tu cuenta está suspendida. Contacta soporte para reactivación.',
      estadoUI,
      estado_Emprendedor: clienteBDD.estado_Emprendedor,
      status: clienteBDD.status
    })
  }

  const ultima = (clienteBDD.advertencias?.length || 0) > 0
    ? clienteBDD.advertencias[clienteBDD.advertencias.length - 1]
    : null

  const { nombre, apellido, direccion, telefono, _id, rol } = clienteBDD
  const token = crearTokenJWT(clienteBDD._id, clienteBDD.rol)

  res.status(200).json({
    token,
    rol,
    nombre,
    apellido,
    direccion,
    telefono,
    _id,
    email: clienteBDD.email,
    estadoUI,
    estado_Emprendedor: clienteBDD.estado_Emprendedor,
    status: clienteBDD.status,
    ultimaAdvertencia: ultima ? {
      tipo: ultima.tipo,
      motivo: ultima.motivo,
      fecha: ultima.fecha
    } : null
  })
}

/* ============================
   Listado (decorado para UI)
============================ */
const verClientes = async (req, res) => {
  try {
    const clientes = await Cliente.find().lean()

    const decorados = clientes.map((c) => {
      let estadoUI = 'Correcto'
      if (c.status === false) {
        estadoUI = 'Suspendido'
      } else {
        const e = c.estado_Emprendedor
        estadoUI = (['Advertencia1','Advertencia2','Advertencia3','Suspendido'].includes(e)) ? e : 'Correcto'
      }

      const ultima = (c.advertencias?.length || 0) > 0
        ? c.advertencias[c.advertencias.length - 1]
        : null

      // Fallback de fecha segura
      const ultimaFecha =
        (ultima?.fecha && !isNaN(new Date(ultima.fecha))) ? ultima.fecha :
        (ultima?._id ? objectIdToDate(ultima._id) : null)

      return {
        ...c,
        estado: estadoUI,
        estado_Cliente: estadoUI,
        ultimaAdvertencia: ultima ? {
          tipo: ultima.tipo,
          motivo: ultima.motivo,
          fecha: ultimaFecha
        } : null
      }
    })

    res.status(200).json(decorados)
  } catch (error) {
    res.status(500).json({ msg: 'Error al obtener los clientes', error: error.message })
  }
}

/* ============================
   Actualizar datos (perfil por ID)
============================ */
const actualizarCliente = async (req, res) => {
  const { id } = req.params

  try {
    const cliente = await Cliente.findById(id)
    if (!cliente) return res.status(404).json({ msg: 'Cliente no encontrado' })

    const { nombre, apellido, email, password, telefono, estado, estado_Cliente, estado_Emprendedor, status } = req.body

    if (nombre) {
      const e1 = validarNombre(nombre); if (e1) return res.status(400).json({ msg: e1 })
      cliente.nombre = nombre
    }
    if (telefono !== undefined) {
      const e2 = validarTelefono(telefono); if (e2) return res.status(400).json({ msg: e2 })
      cliente.telefono = telefono
    }

    if (apellido) cliente.apellido = apellido
    if (email)    cliente.email    = email
    if (password) cliente.password = await cliente.encrypPassword(password)

    // Datos del admin ejecutor (opcional)
    const adminId     = req.adminBDD?._id || null
    const adminNombre = req.adminBDD ? `${req.adminBDD.nombre} ${req.adminBDD.apellido || ''}`.trim() : null
    const adminEmail  = req.adminBDD?.email || null

    // Cambiar estado desde UI (si viene)
    const estadoUI = estado ?? estado_Cliente
    if (estadoUI) {
      const motivo = req.body.motivo || 'Cambio desde actualizarCliente'
      try {
        cliente.cambiarEstado({
          estadoUI,
          motivo,
          adminId,
          adminNombre,
          adminEmail,
          ip: req.ip,
          userAgent: req.headers['user-agent']
        })
      } catch (e) {
        // ⚠️ Devuelve 400 con detalle para que el frontend no vea un 500 “genérico”
        return res.status(400).json({ msg: e.message })
      }
    }

    // Cambio directo de estado_Emprendedor (compatibilidad)
    if (estado_Emprendedor) {
      const vals = ['Activo', 'Advertencia1','Advertencia2','Advertencia3', 'Suspendido']
      if (!vals.includes(estado_Emprendedor)) {
        return res.status(400).json({ msg: `estado_Emprendedor inválido. Permitidos: ${vals.join(', ')}` })
      }
      const estadoUICompat = (estado_Emprendedor === 'Activo') ? 'Correcto' : estado_Emprendedor
      const motivoCompat = req.body.motivo || 'Cambio directo de estado_Emprendedor'
      try {
        cliente.cambiarEstado({
          estadoUI: estadoUICompat,
          motivo: motivoCompat,
          adminId,
          adminNombre,
          adminEmail,
          ip: req.ip,
          userAgent: req.headers['user-agent']
        })
      } catch (e) {
        return res.status(400).json({ msg: e.message })
      }
    }

    if (typeof status === 'boolean') {
      cliente.status = status
    }

    const actualizado = await cliente.save()
    res.status(200).json(actualizado)
  } catch (error) {
    // 👇 Incluir detalle para depurar
    res.status(500).json({ msg: 'Error al actualizar cliente', error: error.message })
  }
}

/* ============================
   Eliminar
============================ */
const eliminarCliente = async (req, res) => {
  const { id } = req.params
  try {
    const cliente = await Cliente.findById(id)
    if (!cliente) return res.status(404).json({ msg: 'Cliente no encontrado' })
    await cliente.deleteOne()
    res.status(200).json({ msg: 'Cliente eliminado correctamente' })
  } catch (error) {
    res.status(500).json({ msg: 'Error al eliminar cliente', error: error.message })
  }
}

/* ============================
   Perfil (protegido)
============================ */
const perfil = (req, res) => {
  const { token, confirmEmail, createdAt, updatedAt, __v, password, ...datosPerfil } = req.clienteBDD
  res.status(200).json(datosPerfil)
}

/* ============================
   Actualizar password (protegido)
============================ */
const actualizarPassword = async (req, res) => {
  try {
    const clienteBDD = await Cliente.findById(req.clienteBDD._id)
    if (!clienteBDD) return res.status(404).json({ msg: 'No existe el cliente' })
    const ok = await clienteBDD.matchPassword(req.body.passwordactual)
    if (!ok) return res.status(400).json({ msg: 'El password actual no es correcto' })
    clienteBDD.password = await clienteBDD.encrypPassword(req.body.passwordnuevo)
    await clienteBDD.save()
    res.status(200).json({ msg: 'Password actualizado correctamente' })
  } catch (error) {
    res.status(500).json({ msg: 'Error al actualizar el password', error: error.message })
  }
}

/* ============================
   Actualizar perfil (protegido, con ID)
============================ */
const actualizarPerfil = async (req, res) => {
  const { id } = req.params
  const { nombre, apellido, telefono, email } = req.body

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ msg: 'El ID no es válido' })
  }
  if ([nombre, apellido, email].some(v => !v || String(v).trim() === '')) {
    return res.status(400).json({ msg: 'Debes llenar todos los campos' })
  }

  const e1 = validarNombre(nombre); if (e1) return res.status(400).json({ msg: e1 })
  const e2 = validarTelefono(telefono); if (e2) return res.status(400).json({ msg: e2 })

  const clienteBDD = await Cliente.findById(id)
  if (!clienteBDD) return res.status(404).json({ msg: `No existe el cliente con ID ${id}` })

  if (clienteBDD.email !== email) {
    const clienteBDDMail = await Cliente.findOne({ email })
    if (clienteBDDMail) return res.status(400).json({ msg: 'El email ya se encuentra registrado' })
  }

  clienteBDD.nombre   = nombre   ?? clienteBDD.nombre
  clienteBDD.apellido = apellido ?? clienteBDD.apellido
  clienteBDD.telefono = telefono ?? clienteBDD.telefono
  clienteBDD.email    = email    ?? clienteBDD.email

  await clienteBDD.save()
  res.status(200).json(clienteBDD)
}

/* ============================
   Foto de perfil (solo archivo)
============================ */
const actualizarFotoPerfil = async (req, res) => {
  const { id } = req.params

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ msg: 'ID no válido' })
  }

  const clienteBDD = await Cliente.findById(id)
  if (!clienteBDD) return res.status(404).json({ msg: 'Cliente no encontrado' })

  try {
    if (!req.file?.path) {
      return res.status(400).json({ msg: 'Debes enviar un archivo en el campo "foto"' })
    }

    if (clienteBDD.fotoPublicId) {
      try { await cloudinary.uploader.destroy(clienteBDD.fotoPublicId) } catch {}
    }

    clienteBDD.foto         = req.file.path
    clienteBDD.fotoPublicId = req.file.filename

    await clienteBDD.save()

    return res.status(200).json({ msg: 'Foto actualizada', cliente: clienteBDD })
  } catch (error) {
    console.error('actualizarFotoPerfil (Cliente) error:', error)
    res.status(500).json({ msg: 'Error al actualizar foto de perfil', error: error.message })
  }
}

const eliminarFotoPerfil = async (req, res) => {
  const { id } = req.params

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ msg: 'ID no válido' })
  }

  const clienteBDD = await Cliente.findById(id)
  if (!clienteBDD) return res.status(404).json({ msg: 'Cliente no encontrado' })

  try {
    if (clienteBDD.fotoPublicId) {
      try { await cloudinary.uploader.destroy(clienteBDD.fotoPublicId) } catch {}
    }

    clienteBDD.foto = null
    clienteBDD.fotoPublicId = null
    await clienteBDD.save()

    res.status(200).json({ msg: 'Foto eliminada', cliente: clienteBDD })
  } catch (error) {
    console.error('eliminarFotoPerfil (Cliente) error:', error)
    res.status(500).json({ msg: 'Error al eliminar foto de perfil', error: error.message })
  }
}

/* ============================
   Estado por ID (UI → Modelo)
============================ */
const ESTADOS_UI = ['Correcto', 'Advertencia1', 'Advertencia2', 'Advertencia3', 'Suspendido']

const actualizarEstadoClienteById = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ msg: 'El ID no es válido' })
  }

  const { estado, estado_Cliente, motivo, suspendidoHasta, metadata } = req.body
  const nuevoEstadoUI = estado ?? estado_Cliente
  if (!nuevoEstadoUI) {
    return res.status(400).json({ msg: 'Debes enviar "estado" o "estado_Cliente"' })
  }
  if (!ESTADOS_UI.includes(nuevoEstadoUI)) {
    return res.status(400).json({ msg: `Estado inválido. Permitidos: ${ESTADOS_UI.join(', ')}` })
  }
  if (!motivo || !String(motivo).trim()) {
    return res.status(400).json({ msg: 'Debes enviar "motivo"' })
  }

  try {
    const cliente = await Cliente.findById(id)
    if (!cliente) return res.status(404).json({ msg: 'Cliente no encontrado' })

    // Admin ejecutor (de tu middleware JWT)
    const adminId     = req.adminBDD?._id || null
    const adminNombre = req.adminBDD ? `${req.adminBDD.nombre} ${req.adminBDD.apellido || ''}`.trim() : null
    const adminEmail  = req.adminBDD?.email || null

    cliente.cambiarEstado({
      estadoUI: nuevoEstadoUI,
      motivo,
      adminId,
      adminNombre,
      adminEmail,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: metadata ?? null
    })

    // Suspensión temporal opcional (validada)
    if (nuevoEstadoUI === 'Suspendido' && suspendidoHasta) {
      if (!isValidDateValue(suspendidoHasta)) {
        return res.status(400).json({ msg: 'suspendidoHasta inválido. Usa ISO 8601 o un datetime-local válido.' })
      }
      cliente.suspendidoHasta = new Date(suspendidoHasta)
    } else {
      cliente.suspendidoHasta = null
    }

    await cliente.save()

    return res.status(200).json({
      msg: 'Estado actualizado correctamente',
      estadoUI: nuevoEstadoUI,
      estado_Emprendedor: cliente.estado_Emprendedor,
      status: cliente.status,
      ultimaAdvertenciaAt: cliente.ultimaAdvertenciaAt
    })
  } catch (error) {
    const code = (error.name === 'ValidationError') ? 400 : 500
    return res.status(code).json({ msg: 'Error al actualizar el estado', error: error.message })
  }
}

/* ============================
   Listar auditoría embebida
============================ */
const listarAuditoriaCliente = async (req, res) => {
  const { id } = req.params
  const page = Math.max(1, parseInt(req.query.page ?? '1', 10))
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit ?? '20', 10)))

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ msg: 'El ID no es válido' })
  }

  const cliente = await Cliente.findById(id)
    .select('advertencias')
    .populate({
      path: 'advertencias.creadoPor',
      select: 'nombre apellido email rol'
    })
    .lean()
  if (!cliente) return res.status(404).json({ msg: 'Cliente no encontrado' })

  const total = cliente.advertencias.length

  // Orden inverso (más recientes primero)
  const ordered = [...cliente.advertencias].sort((a, b) => {
    const fa = a?.fecha ? new Date(a.fecha) : objectIdToDate(a?._id)
    const fb = b?.fecha ? new Date(b.fecha) : objectIdToDate(b?._id)
    return (fb?.getTime() || 0) - (fa?.getTime() || 0)
  })

  const start = (page - 1) * limit
  let items = ordered.slice(start, start + limit)

  // Fallbacks de snapshot y fecha segura
  items = items.map((a) => {
    const fullName = a.creadoPor ? `${a.creadoPor.nombre || ''} ${a.creadoPor.apellido || ''}`.trim() : null
    const fechaOk =
      (a?.fecha && !isNaN(new Date(a.fecha))) ? a.fecha :
      (a?._id ? objectIdToDate(a._id) : null)

    return {
      ...a,
      fecha: fechaOk,
      creadoPorNombre: a.creadoPorNombre ?? (fullName || null),
      creadoPorEmail:  a.creadoPorEmail  ?? (a.creadoPor?.email || null)
    }
  })

  res.status(200).json({
    total,
    page,
    limit,
    items
  })
}

/* ============================
   Exports
============================ */
export {
  registro,
  confirmarMail,
  recuperarPassword,
  comprobarTokenPasword,
  crearNuevoPassword,
  login,
  verClientes,
  actualizarCliente,
  eliminarCliente,
  perfil,
  actualizarPassword,
  actualizarPerfil,
  actualizarEstadoClienteById,
  actualizarFotoPerfil,
  eliminarFotoPerfil,
  listarAuditoriaCliente
}
