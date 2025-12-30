
// controllers/emprendedor_controllers.js
import Emprendedor from '../models/Emprendedor.js'
import {
  sendMailToRegisterEmprendedor,
  sendMailToRecoveryPasswordEmprendedor
} from '../config/nodemailerEmprendedor.js'
import { crearTokenJWT } from '../middleware/JWT.js'
import Emprendimiento from '../models/Emprendimiento.js'
import mongoose from 'mongoose'

/* ============================
   Validaciones internas
============================ */
function validarNombre(nombre) {
  if (!nombre || typeof nombre !== 'string' || !/^[a-zA-Z\s]+$/.test(nombre.trim())) {
    return 'El nombre es obligatorio y solo puede contener letras y espacios'
  }
  return null
}

// Celular/telefono opcional: valida formato solo si viene con valor
function validarCelular(celular) {
  if (celular == null || celular === '') return null
  if (typeof celular !== 'string' && typeof celular !== 'number') {
    return 'El celular debe ser texto o número'
  }
  const celularStr = celular.toString()
  if (!/^\d{7,15}$/.test(celularStr)) {
    return 'El celular debe contener solo números y tener entre 7 y 15 dígitos'
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

  const e1 = validarNombre(nombre);   if (e1) return res.status(400).json({ msg: e1 })
  const e2 = validarCelular(telefono); if (e2) return res.status(400).json({ msg: e2 })

  const existeEmail = await Emprendedor.findOne({ email })
  if (existeEmail) return res.status(400).json({ msg: 'Este email ya está registrado' })

  const nuevo = new Emprendedor(req.body)
  nuevo.password = await nuevo.encrypPassword(password)
  const token = nuevo.crearToken()

  await sendMailToRegisterEmprendedor(email, token)
  await nuevo.save()

  res.status(200).json({ msg: 'Revisa tu correo electrónico para confirmar tu cuenta' })
}

const confirmarMail = async (req, res) => {
  const { token } = req.params
  const emprendedorBDD = await Emprendedor.findOne({ token })

  if (!emprendedorBDD) return res.status(404).json({ msg: 'Token inválido' })

  emprendedorBDD.token = null
  emprendedorBDD.confirmEmail = true
  await emprendedorBDD.save()

  res.status(200).json({ msg: 'Cuenta confirmada correctamente' })
}

const recuperarPassword = async (req, res) => {
  const { email } = req.body
  if (!email || String(email).trim() === '') {
    return res.status(400).json({ msg: 'Debes llenar todos los campos' })
  }

  const emprendedor = await Emprendedor.findOne({ email })
  if (!emprendedor) return res.status(404).json({ msg: 'No existe un emprendedor con ese email' })

  const token = emprendedor.crearToken()
  emprendedor.token = token
  await sendMailToRecoveryPasswordEmprendedor(email, token)
  await emprendedor.save()

  res.status(200).json({ msg: 'Revisa tu correo electrónico para reestablecer tu cuenta' })
}

const comprobarTokenPasword = async (req, res) => {
  const { token } = req.params
  const emprendedor = await Emprendedor.findOne({ token })
  if (emprendedor?.token !== token) {
    return res.status(404).json({ msg: 'Token no válido' })
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

  const emprendedor = await Emprendedor.findOne({ token: req.params.token })
  if (emprendedor?.token !== req.params.token) {
    return res.status(404).json({ msg: 'Token no válido' })
  }

  emprendedor.token = null
  emprendedor.password = await emprendedor.encrypPassword(password)
  await emprendedor.save()

  res.status(200).json({ msg: 'Felicitaciones, ya puedes iniciar sesión con tu nuevo password' })
}

/* ============================
   Login (con estadoUI y bloqueo si Suspendido)
============================ */
const login = async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ msg: 'Debes llenar todos los campos' })
  }

  const emprendedorBDD = await Emprendedor.findOne({ email }).select('-__v -token -createdAt -updatedAt')
  if (!emprendedorBDD) return res.status(404).json({ msg: 'El usuario no está registrado' })
  if (!emprendedorBDD.confirmEmail) {
    return res.status(403).json({ msg: 'Debe confirmar su cuenta antes de iniciar sesión' })
  }

  const passwordValido = await emprendedorBDD.matchPassword(password)
  if (!passwordValido) return res.status(401).json({ msg: 'El password es incorrecto' })

  // 🔎 Derivar estado UI igual que en cliente_controllers.js
  let estadoUI = 'Correcto'
  if (emprendedorBDD.status === false) {
    estadoUI = 'Suspendido'
  } else {
    const e = emprendedorBDD.estado_Emprendedor
    if (['Advertencia1', 'Advertencia2', 'Advertencia3', 'Suspendido'].includes(e)) {
      estadoUI = e
    } else {
      estadoUI = 'Correcto' // Activo
    }
  }

  // 🚫 Bloquear login si está suspendido (sin token)
  if (estadoUI === 'Suspendido') {
    return res.status(403).json({
      msg: 'Tu cuenta está suspendida. Contacta soporte para reactivación.',
      estadoUI,
      estado_Emprendedor: emprendedorBDD.estado_Emprendedor,
      status: emprendedorBDD.status
    })
  }

  // ✅ Login permitido: devolver token + estado (sin tocar crearTokenJWT)
  const { nombre, apellido, telefono, _id, rol } = emprendedorBDD
  const token = crearTokenJWT(_id, rol)

  res.status(200).json({
    token,
    rol,
    nombre,
    apellido,
    telefono,
    _id,
    email: emprendedorBDD.email,
    estadoUI,
    estado_Emprendedor: emprendedorBDD.estado_Emprendedor,
    status: emprendedorBDD.status
  })
}

/* ============================
   Perfil (protegido)
============================ */
const perfil = (req, res) => {
  const { token, password, confirmEmail, __v, createdAt, updatedAt, ...datosPerfil } = req.emprendedorBDD
  res.status(200).json(datosPerfil)
}

/* ============================
   Actualizar password (protegido)
============================ */
const actualizarPassword = async (req, res) => {
  try {
    const emprendedorBDD = await Emprendedor.findById(req.emprendedorBDD._id)
    if (!emprendedorBDD) return res.status(404).json({ msg: 'Emprendedor no encontrado' })

    const verificarPassword = await emprendedorBDD.matchPassword(req.body.passwordactual)
    if (!verificarPassword) return res.status(400).json({ msg: 'El password actual no es correcto' })

    emprendedorBDD.password = await emprendedorBDD.encrypPassword(req.body.passwordnuevo)
    await emprendedorBDD.save()

    res.status(200).json({ msg: 'Password actualizado correctamente' })
  } catch (error) {
    res.status(500).json({ msg: 'Error al actualizar el password' })
  }
}

/* ============================
   Actualizar perfil (protegido)
============================ */
const actualizarPerfil = async (req, res) => {
  const { id } = req.params
  const { nombre, apellido, telefono, email } = req.body

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ msg: 'ID no válido' })
  }

  if ([nombre, apellido, email].some(v => !v || String(v).trim() === '')) {
    return res.status(400).json({ msg: 'Todos los campos son obligatorios' })
  }

  const e1 = validarNombre(nombre);    if (e1) return res.status(400).json({ msg: e1 })
  const e2 = validarCelular(telefono); if (e2) return res.status(400).json({ msg: e2 })

  const emprendedorBDD = await Emprendedor.findById(id)
  if (!emprendedorBDD) return res.status(404).json({ msg: 'Emprendedor no encontrado' })

  if (emprendedorBDD.email !== email) {
    const emprendedorMail = await Emprendedor.findOne({ email })
    if (emprendedorMail) return res.status(400).json({ msg: 'El email ya se encuentra registrado' })
  }

  emprendedorBDD.nombre   = nombre   ?? emprendedorBDD.nombre
  emprendedorBDD.apellido = apellido ?? emprendedorBDD.apellido
  emprendedorBDD.telefono = telefono ?? emprendedorBDD.telefono
  emprendedorBDD.email    = email    ?? emprendedorBDD.email

  await emprendedorBDD.save()
  res.status(200).json(emprendedorBDD)
}

/* ============================
   Listado (decorado para UI)
============================ */
const verEmprendedores = async (req, res) => {
  try {
    const emprendedores = await Emprendedor.find().lean()

    const decorados = emprendedores.map((e) => {
      let estadoUI = 'Correcto'
      if (e.status === false) {
        estadoUI = 'Suspendido'
      } else {
        const est = e.estado_Emprendedor
        if (['Advertencia1', 'Advertencia2', 'Advertencia3', 'Suspendido'].includes(est)) {
          estadoUI = est
        } else {
          estadoUI = 'Correcto' // Activo
        }
      }
      // Devolver etiquetas conveniente para frontend
      return { ...e, estado: estadoUI, estado_Emprendedor: e.estado_Emprendedor }
    })

    res.status(200).json(decorados)
  } catch (error) {
    res.status(500).json({ msg: 'Error al obtener los emprendedores' })
  }
}

/* ============================
   Actualizar (fallback) + Estado dedicado
============================ */
const actualizarEmprendedor = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ msg: 'ID no válido' })
  }

  try {
    const emprendedor = await Emprendedor.findById(id)
    if (!emprendedor) return res.status(404).json({ msg: 'Emprendedor no encontrado' })

    const { nombre, apellido, email, password, telefono, estado, estado_Emprendedor, status } = req.body

    if (nombre) {
      const e1 = validarNombre(nombre); if (e1) return res.status(400).json({ msg: e1 })
      emprendedor.nombre = nombre
    }
    if (telefono !== undefined) {
      const e2 = validarCelular(telefono); if (e2) return res.status(400).json({ msg: e2 })
      emprendedor.telefono = telefono
    }

    if (apellido) emprendedor.apellido = apellido
    if (email)    emprendedor.email    = email
    if (password) emprendedor.password = await emprendedor.encrypPassword(password)

    // *** Nuevo: soporte de cambio de estado en este endpoint (fallback) ***
    const nuevoEstado = estado_Emprendedor ?? estado
    if (nuevoEstado) {
      try {
        emprendedor.aplicarEstadoEmprendedor(nuevoEstado)
      } catch (e) {
        return res.status(400).json({ msg: e.message })
      }
    }

    if (typeof status === 'boolean') {
      emprendedor.status = status
    }

    const actualizado = await emprendedor.save()
    res.status(200).json(actualizado)
  } catch (error) {
    res.status(500).json({ msg: 'Error al actualizar emprendedor' })
  }
}

const eliminarEmprendedor = async (req, res) => {
  const { id } = req.params
  try {
    const emprendedor = await Emprendedor.findById(id)
    if (!emprendedor) return res.status(404).json({ msg: 'Emprendedor no encontrado' })
    await emprendedor.deleteOne()
    res.status(200).json({ msg: 'Emprendedor eliminado correctamente' })
  } catch (error) {
    res.status(500).json({ msg: 'Error al eliminar emprendedor' })
  }
}

/* ============================
   Favoritos
============================ */
export const agregarAFavoritos = async (req, res) => {
  const emprendedorId = req.emprendedorBDD?._id
  const { emprendimientoId } = req.body

  try {
    const emprendimiento = await Emprendimiento.findById(emprendimientoId)
    if (!emprendimiento) return res.status(404).json({ mensaje: 'Emprendimiento no encontrado' })

    const emprendedor = await Emprendedor.findById(emprendedorId)
    if (emprendedor.favoritos.includes(emprendimientoId)) {
      return res.status(400).json({ mensaje: 'Ya está en favoritos' })
    }

    emprendedor.favoritos.push(emprendimientoId)
    await emprendedor.save()

    res.json({ mensaje: 'Agregado a favoritos correctamente' })
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al agregar favorito', error: error.message })
  }
}

export const eliminarDeFavoritos = async (req, res) => {
  const emprendedorId = req.emprendedorBDD?._id
  const { emprendimientoId } = req.params

  try {
    const emprendedor = await Emprendedor.findById(emprendedorId)
    emprendedor.favoritos = emprendedor.favoritos.filter(id => id.toString() !== emprendimientoId)
    await emprendedor.save()

    res.json({ mensaje: 'Eliminado de favoritos correctamente' })
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al eliminar favorito', error: error.message })
  }
}

export const obtenerFavoritos = async (req, res) => {
  const emprendedorId = req.emprendedorBDD?._id

  try {
    const emprendedor = await Emprendedor.findById(emprendedorId).populate({
      path: 'favoritos',
      populate: {
        path: 'emprendedor',
        select: 'nombre apellido'
      }
    })

    res.json(emprendedor.favoritos)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener favoritos', error: error.message })
  }
}

/* ============================
   *** NUEVO *** Editar estado por ID (UI → Modelo)
   Ruta: PUT /api/emprendedores/estado/:id
   Body: { estado_Emprendedor: 'Activo|Advertencia1|Advertencia2|Advertencia3|Suspendido' }
         ó { estado: '...' }
============================ */
const ESTADOS_EMPRE = ['Activo', 'Advertencia1', 'Advertencia2', 'Advertencia3', 'Suspendido']

const actualizarEstadoEmprendedorById = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ msg: 'El ID no es válido' })
  }

  const { estado, estado_Emprendedor } = req.body
  const nuevoEstado = estado_Emprendedor ?? estado
  if (!nuevoEstado) {
    return res.status(400).json({ msg: 'Debes enviar "estado_Emprendedor" o "estado"' })
  }
  if (!ESTADOS_EMPRE.includes(nuevoEstado)) {
    return res.status(400).json({ msg: `Estado inválido. Permitidos: ${ESTADOS_EMPRE.join(', ')}` })
  }

  try {
    const emprendedor = await Emprendedor.findById(id)
    if (!emprendedor) return res.status(404).json({ msg: 'Emprendedor not encontrado' })

    // Aplica regla de transición segura del modelo
    emprendedor.aplicarEstadoEmprendedor(nuevoEstado)
    await emprendedor.save()

    return res.status(200).json({
      msg: 'Estado actualizado correctamente',
      estado_Emprendedor: emprendedor.estado_Emprendedor,
      status: emprendedor.status
    })
  } catch (error) {
    return res.status(500).json({ msg: 'Error al actualizar el estado', error: error.message })
  }
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
  perfil,
  actualizarPassword,
  actualizarPerfil,
  verEmprendedores,
  actualizarEmprendedor,
  eliminarEmprendedor,
  actualizarEstadoEmprendedorById
}
