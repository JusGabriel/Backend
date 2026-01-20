// controllers/cliente_controllers.js
import Cliente from '../models/Cliente.js'
import mongoose from 'mongoose'
import {
  sendMailToRegisterCliente,
  sendMailToRecoveryPasswordCliente,
} from '../config/nodemailerCliente.js'
import { crearTokenJWT } from '../middleware/JWT.js'
import cloudinary from '../config/cloudinary.js'

/* ============================
   Helpers de validación
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

/* ============================
   Registro / confirmación / recuperación
   ============================ */
const registro = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ msg: 'Error en el registro', error: error.message })
  }
}

const confirmarMail = async (req, res) => {
  try {
    const { token } = req.params
    const clienteBDD = await Cliente.findOne({ token })
    if (!clienteBDD) return res.status(404).json({ msg: 'Token inválido' })
    clienteBDD.token = null
    clienteBDD.confirmEmail = true
    await clienteBDD.save()
    res.status(200).json({ msg: 'Cuenta confirmada correctamente' })
  } catch (error) {
    res.status(500).json({ msg: 'Error al confirmar cuenta', error: error.message })
  }
}

const recuperarPassword = async (req, res) => {
  try {
    const { email } = req.body
    if (!email || String(email).trim() === '') return res.status(400).json({ msg: 'Debes llenar todos los campos' })

    const clienteBDD = await Cliente.findOne({ email })
    if (!clienteBDD) return res.status(404).json({ msg: 'El usuario no se encuentra registrado' })

    const token = clienteBDD.crearToken()
    clienteBDD.token = token
    await sendMailToRecoveryPasswordCliente(email, token)
    await clienteBDD.save()

    res.status(200).json({ msg: 'Revisa tu correo electrónico para reestablecer tu conta' })
  } catch (error) {
    res.status(500).json({ msg: 'Error al solicitar recuperación', error: error.message })
  }
}

const comprobarTokenPasword = async (req, res) => {
  try {
    const { token } = req.params
    const clienteBDD = await Cliente.findOne({ token })
    if (clienteBDD?.token !== token) return res.status(404).json({ msg: 'No se puede validar la cuenta' })
    res.status(200).json({ msg: 'Token confirmado, ya puedes crear tu nuevo password' })
  } catch (error) {
    res.status(500).json({ msg: 'Error al comprobar token', error: error.message })
  }
}

const crearNuevoPassword = async (req, res) => {
  try {
    const { password, confirmpassword } = req.body
    if (!password || !confirmpassword) return res.status(400).json({ msg: 'Debes llenar todos los campos' })
    if (password !== confirmpassword) return res.status(400).json({ msg: 'Los passwords no coinciden' })

    const clienteBDD = await Cliente.findOne({ token: req.params.token })
    if (clienteBDD?.token !== req.params.token) return res.status(404).json({ msg: 'No se puede validar la cuenta' })

    clienteBDD.token = null
    clienteBDD.password = await clienteBDD.encrypPassword(password)
    await clienteBDD.save()

    res.status(200).json({ msg: 'Ya puedes iniciar sesión con tu nuevo password' })
  } catch (error) {
    res.status(500).json({ msg: 'Error al crear nuevo password', error: error.message })
  }
}

/* ============================
   Login (con estadoUI y bloqueo si Suspendido)
   ============================ */
const login = async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ msg: 'Debes llenar todos los campos' })

    const clienteBDD = await Cliente.findOne({ email }).select('-__v -token -createdAt -updatedAt')
    if (!clienteBDD) return res.status(404).json({ msg: 'El usuario no se encuentra registrado' })
    if (!clienteBDD.confirmEmail) return res.status(403).json({ msg: 'Debe verificar su cuenta' })

    const ok = await clienteBDD.matchPassword(password)
    if (!ok) return res.status(401).json({ msg: 'El password no es el correcto' })

    let estadoUI = 'Correcto'
    if (clienteBDD.status === false) {
      estadoUI = 'Suspendido'
    } else {
      const e = clienteBDD.estado_Cliente
      estadoUI = (['Advertencia1','Advertencia2','Advertencia3','Suspendido'].includes(e)) ? e : 'Correcto'
    }

    if (estadoUI === 'Suspendido') {
      return res.status(403).json({
        msg: 'Tu cuenta está suspendida. Contacta soporte para reactivación.',
        estadoUI,
        estado_Cliente: clienteBDD.estado_Cliente,
        status: clienteBDD.status
      })
    }

    const token = crearTokenJWT(clienteBDD._id, clienteBDD.rol)

    res.status(200).json({
      token,
      rol: clienteBDD.rol,
      nombre: clienteBDD.nombre,
      apellido: clienteBDD.apellido,
      telefono: clienteBDD.telefono,
      _id: clienteBDD._id,
      email: clienteBDD.email,
      estadoUI,
      estado_Cliente: clienteBDD.estado_Cliente,
      status: clienteBDD.status
    })
  } catch (error) {
    res.status(500).json({ msg: 'Error en login', error: error.message })
  }
}

/* ============================
   Perfil (protegido) / actualizar password / perfil
   ============================ */
const perfil = (req, res) => {
  const { token, password, confirmEmail, __v, createdAt, updatedAt, ...datosPerfil } = req.clienteBDD
  res.status(200).json(datosPerfil)
}

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
    res.status(500).json({ msg: 'Error al actualizar password', error: error.message })
  }
}

const actualizarPerfil = async (req, res) => {
  try {
    const { id } = req.params
    const { nombre, apellido, telefono, email } = req.body

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ msg: 'El ID no es válido' })
    if ([nombre, apellido, email].some(v => !v || String(v).trim() === '')) return res.status(400).json({ msg: 'Debes llenar todos los campos' })
    const e1 = validarNombre(nombre); if (e1) return res.status(400).json({ msg: e1 })
    const e2 = validarTelefono(telefono); if (e2) return res.status(400).json({ msg: e2 })

    const clienteBDD = await Cliente.findById(id)
    if (!clienteBDD) return res.status(404).json({ msg: `No existe el cliente con ID ${id}` })

    if (clienteBDD.email !== email) {
      const clienteMail = await Cliente.findOne({ email })
      if (clienteMail) return res.status(400).json({ msg: 'El email ya se encuentra registrado' })
    }

    clienteBDD.nombre   = nombre
    clienteBDD.apellido = apellido
    clienteBDD.telefono = telefono
    clienteBDD.email    = email
    await clienteBDD.save()

    res.status(200).json(clienteBDD)
  } catch (error) {
    res.status(500).json({ msg: 'Error al actualizar perfil', error: error.message })
  }
}

/* ============================
   Listado (decorado para UI)
   ============================ */
const verClientes = async (req, res) => {
  try {
    const clientes = await Cliente.find().lean()
    const decorados = clientes.map((c) => {
      let estadoUI = 'Correcto'
      if (c.status === false) estadoUI = 'Suspendido'
      else {
        const est = c.estado_Cliente
        estadoUI = (['Advertencia1','Advertencia2','Advertencia3','Suspendido'].includes(est)) ? est : 'Correcto'
      }
      return { ...c, estado: estadoUI, estado_Cliente: c.estado_Cliente }
    })
    res.status(200).json(decorados)
  } catch (error) {
    res.status(500).json({ msg: 'Error al obtener los clientes', error: error.message })
  }
}

/* ============================
   Actualizar / eliminar (admin)
   ============================ */
const actualizarCliente = async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ msg: 'ID no válido' })

    const cliente = await Cliente.findById(id)
    if (!cliente) return res.status(404).json({ msg: 'Cliente no encontrado' })

    const { nombre, apellido, email, password, telefono, estado_Cliente, status } = req.body

    if (nombre) { const e1 = validarNombre(nombre); if (e1) return res.status(400).json({ msg: e1 }); cliente.nombre = nombre }
    if (telefono !== undefined) { const e2 = validarTelefono(telefono); if (e2) return res.status(400).json({ msg: e2 }); cliente.telefono = telefono }
    if (apellido) cliente.apellido = apellido
    if (email)    cliente.email    = email
    if (password) cliente.password = await cliente.encrypPassword(password)

    // Si se envía estado_Cliente lo aplicamos con reglas del modelo
    if (estado_Cliente) {
      try {
        cliente.aplicarEstadoCliente(estado_Cliente)
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
    res.status(500).json({ msg: 'Error al actualizar cliente', error: error.message })
  }
}

const eliminarCliente = async (req, res) => {
  try {
    const { id } = req.params
    const cliente = await Cliente.findById(id)
    if (!cliente) return res.status(404).json({ msg: 'Cliente no encontrado' })
    await cliente.deleteOne()
    res.status(200).json({ msg: 'Cliente eliminado correctamente' })
  } catch (error) {
    res.status(500).json({ msg: 'Error al eliminar cliente', error: error.message })
  }
}

/* ============================
   Foto de perfil (Cloudinary)
   ============================ */
const actualizarFotoPerfil = async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ msg: 'ID no válido' })
    const clienteBDD = await Cliente.findById(id)
    if (!clienteBDD) return res.status(404).json({ msg: 'Cliente no encontrado' })

    if (!req.file?.path) return res.status(400).json({ msg: 'Debes enviar un archivo en el campo "foto"' })

    if (clienteBDD.fotoPublicId) {
      try { await cloudinary.uploader.destroy(clienteBDD.fotoPublicId) } catch { /* best effort */ }
    }

    clienteBDD.foto = req.file.path
    clienteBDD.fotoPublicId = req.file.filename
    await clienteBDD.save()

    return res.status(200).json({ msg: 'Foto actualizada', cliente: clienteBDD })
  } catch (error) {
    console.error('actualizarFotoPerfil (Cliente) error:', error)
    res.status(500).json({ msg: 'Error al actualizar foto de perfil', error: error.message })
  }
}

const eliminarFotoPerfil = async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ msg: 'ID no válido' })
    const clienteBDD = await Cliente.findById(id)
    if (!clienteBDD) return res.status(404).json({ msg: 'Cliente no encontrado' })

    if (clienteBDD.fotoPublicId) { try { await cloudinary.uploader.destroy(clienteBDD.fotoPublicId) } catch {} }
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
   Actualizar estado (PUT /estado/:id)
   - Igual comportamiento que Emprendedor: cambio directo sin motivo obligatorio
============================ */
const actualizarEstadoClienteById = async (req, res) => {
  try {
    const { id } = req.params
    const { estado, estado_Cliente } = req.body
    const nuevoEstadoUI = String((estado ?? estado_Cliente ?? '')).trim()

    if (!nuevoEstadoUI) return res.status(400).json({ msg: 'Debes enviar "estado" o "estado_Cliente"' })

    const PERMITIDOS = ['Correcto','Advertencia1','Advertencia2','Advertencia3','Suspendido']
    if (!PERMITIDOS.includes(nuevoEstadoUI)) {
      return res.status(400).json({ msg: `Estado inválido. Permitidos: ${PERMITIDOS.join(', ')}` })
    }

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ msg: 'El ID no es válido' })

    const cliente = await Cliente.findById(id)
    if (!cliente) return res.status(404).json({ msg: 'Cliente no encontrado' })

    // "Correcto" -> "Activo"
    const target = (nuevoEstadoUI === 'Correcto') ? 'Activo' : nuevoEstadoUI

    // Aplicar reglas encapsuladas en el modelo
    try {
      cliente.aplicarEstadoCliente(target)
    } catch (e) {
      return res.status(400).json({ msg: e.message })
    }

    await cliente.save()

    const estadoUI =
      (cliente.status === false) ? 'Suspendido'
      : (['Advertencia1','Advertencia2','Advertencia3','Suspendido'].includes(cliente.estado_Cliente)
          ? cliente.estado_Cliente
          : 'Correcto')

    return res.status(200).json({
      msg: 'Estado actualizado correctamente',
      estadoUI,
      estado_Cliente: cliente.estado_Cliente,
      status: cliente.status
    })
  } catch (error) {
    return res.status(500).json({ msg: 'Error al actualizar el estado', error: error.message })
  }
}

/* ============================
   Exports
   ============================ */
export {
  registro, confirmarMail, recuperarPassword, comprobarTokenPasword, crearNuevoPassword,
  login, perfil, actualizarPassword, actualizarPerfil, verClientes,
  actualizarCliente, eliminarCliente, actualizarFotoPerfil, eliminarFotoPerfil, actualizarEstadoClienteById 
}

