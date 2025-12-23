
// controllers/cliente_controllers.js
import Cliente from '../models/Cliente.js'
import Emprendimiento from '../models/Emprendimiento.js'
import mongoose from 'mongoose'
import {
  sendMailToRegisterCliente,
  sendMailToRecoveryPasswordCliente,
} from '../config/nodemailerCliente.js'
import { crearTokenJWT } from '../middleware/JWT.js'

/* ============================
   Validaciones internas
============================ */
function validarNombre(nombre) {
  if (!nombre || typeof nombre !== 'string' || !/^[a-zA-Z\s]+$/.test(nombre.trim())) {
    return 'El nombre es obligatorio y solo puede contener letras y espacios'
  }
  return null
}

function validarTelefono(telefono) {
  if (!telefono || (typeof telefono !== 'string' && typeof telefono !== 'number')) {
    return 'El teléfono es obligatorio y debe ser un número'
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
  const { nombre, telefono, email, password } = req.body
  if (Object.values(req.body).includes('')) {
    return res.status(400).json({ msg: 'Todos los campos son obligatorios' })
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
  if (Object.values(req.body).includes('')) {
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
  if (Object.values(req.body).includes('')) {
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
  if (Object.values(req.body).includes('')) {
    return res.status(400).json({ msg: 'Debes llenar todos los campos' })
  }
  const clienteBDD = await Cliente.findOne({ email }).select('-__v -token -updatedAt -createdAt')
  if (!clienteBDD) return res.status(404).json({ msg: 'El usuario no se encuentra registrado' })
  if (!clienteBDD.confirmEmail) return res.status(403).json({ msg: 'Debe verificar su cuenta' })
  const ok = await clienteBDD.matchPassword(password)
  if (!ok) return res.status(401).json({ msg: 'El password no es el correcto' })

  const { nombre, apellido, direccion, telefono, _id, rol } = clienteBDD
  const token = crearTokenJWT(clienteBDD._id, clienteBDD.rol)
  res.status(200).json({ token, rol, nombre, apellido, direccion, telefono, _id, email: clienteBDD.email })
}

/* ============================
   Listado (decorado para UI)
============================ */
const verClientes = async (req, res) => {
  try {
    const clientes = await Cliente.find().lean()

    const decorados = clientes.map((c) => {
      // Derivar etiqueta de UI:
      // - 'Activo' -> 'Correcto'
      // - 'AdvertenciaX' -> igual
      // - 'Suspendido' -> igual
      // - status=false -> 'Suspendido' (por seguridad)
      let estadoUI = 'Correcto'
      if (c.status === false) {
        estadoUI = 'Suspendido'
      } else {
        const e = c.estado_Emprendedor
        if (['Advertencia1','Advertencia2','Advertencia3','Suspendido'].includes(e)) {
          estadoUI = e
        } else {
          estadoUI = 'Correcto' // Activo
        }
      }
      return { ...c, estado: estadoUI, estado_Cliente: estadoUI }
    })

    res.status(200).json(decorados)
  } catch (error) {
    res.status(500).json({ msg: 'Error al obtener los clientes' })
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

    const { nombre, apellido, email, password, telefono } = req.body

    if (nombre) {
      const e1 = validarNombre(nombre); if (e1) return res.status(400).json({ msg: e1 })
      cliente.nombre = nombre
    }
    if (telefono) {
      const e2 = validarTelefono(telefono); if (e2) return res.status(400).json({ msg: e2 })
      cliente.telefono = telefono
    }

    if (apellido) cliente.apellido = apellido
    if (email) cliente.email = email
    if (password) cliente.password = await cliente.encrypPassword(password)

    const actualizado = await cliente.save()
    res.status(200).json(actualizado)
  } catch (error) {
    res.status(500).json({ msg: 'Error al actualizar cliente' })
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
    res.status(500).json({ msg: 'Error al eliminar cliente' })
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
    res.status(500).json({ msg: 'Error al actualizar el password' })
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
  if (Object.values(req.body).includes('')) {
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
   *** NUEVO *** Editar estado por ID (UI → Modelo)
   Ruta: PUT /api/clientes/estado/:id
   Body: { estado: 'Correcto|Advertencia1|Advertencia2|Advertencia3|Suspendido' }
         ó { estado_Cliente: '...' }
============================ */
const ESTADOS_UI = ['Correcto', 'Advertencia1', 'Advertencia2', 'Advertencia3', 'Suspendido']
const actualizarEstadoClienteById = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ msg: 'El ID no es válido' })
  }

  const { estado, estado_Cliente } = req.body
  const nuevoEstadoUI = estado ?? estado_Cliente
  if (!nuevoEstadoUI) {
    return res.status(400).json({ msg: 'Debes enviar "estado" o "estado_Cliente"' })
  }
  if (!ESTADOS_UI.includes(nuevoEstadoUI)) {
    return res.status(400).json({ msg: `Estado inválido. Permitidos: ${ESTADOS_UI.join(', ')}` })
  }

  try {
    const cliente = await Cliente.findById(id)
    if (!cliente) return res.status(404).json({ msg: 'Cliente no encontrado' })

    // Mapeo UI → modelo
    // Correcto => Activo + status:true
    // Advertencias => estado_Emprendedor = AdvertenciaX (status no cambia)
    // Suspendido => estado_Emprendedor = Suspendido + status:false
    if (nuevoEstadoUI === 'Correcto') {
      cliente.estado_Emprendedor = 'Activo'
      cliente.status = true
    } else if (nuevoEstadoUI === 'Suspendido') {
      cliente.estado_Emprendedor = 'Suspendido'
      cliente.status = false
    } else {
      // Advertencias
      cliente.estado_Emprendedor = nuevoEstadoUI
      // Opcional: mantener status como esté, o fijarlo en true si quieres que el usuario siga "activo" con advertencia
      // cliente.status = true
    }

    await cliente.save()

    // Devuelve ambos por conveniencia
    return res.status(200).json({
      msg: 'Estado actualizado correctamente',
      estado_Emprendedor: cliente.estado_Emprendedor,
      status: cliente.status
    })
  } catch (error) {
    return res.status(500).json({ msg: 'Error al actualizar el estado', error: error.message })
  }
}

/* ============================
   Exports (TODOS definidos, sin duplicados)
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
  actualizarEstadoClienteById
}
