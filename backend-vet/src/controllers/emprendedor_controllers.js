// controllers/emprendedor_controllers.js
import Emprendedor from '../models/Emprendedor.js'
import {
  sendMailToRegisterEmprendedor,
  sendMailToRecoveryPasswordEmprendedor
} from "../config/nodemailerEmprendedor.js"
import { crearTokenJWT } from "../middleware/JWT.js"
import Emprendimiento from '../models/Emprendimiento.js'

import mongoose from "mongoose"

// Funciones internas de validación
function validarNombre(nombre) {
  if (!nombre || typeof nombre !== 'string' || !/^[a-zA-Z\s]+$/.test(nombre.trim())) {
    return 'El nombre es obligatorio y solo puede contener letras y espacios';
  }
  return null;
}

function validarCelular(celular) {
  if (!celular || (typeof celular !== 'string' && typeof celular !== 'number')) {
    return 'El celular es obligatorio y debe ser un número';
  }
  const celularStr = celular.toString();
  if (!/^\d{7,15}$/.test(celularStr)) {
    return 'El celular debe contener solo números y tener entre 7 y 15 dígitos';
  }
  return null;
}

const registro = async (req, res) => {
  const { nombre, telefono, email, password } = req.body

  if (Object.values(req.body).includes("")) {
    return res.status(400).json({ msg: "Todos los campos son obligatorios" })
  }

  // Validaciones
  const errorNombre = validarNombre(nombre);
  if (errorNombre) {
    return res.status(400).json({ msg: errorNombre });
  }

  const errorTelefono = validarCelular(telefono);
  if (errorTelefono) {
    return res.status(400).json({ msg: errorTelefono });
  }

  const existeEmail = await Emprendedor.findOne({ email })
  if (existeEmail) {
    return res.status(400).json({ msg: "Este email ya está registrado" })
  }

  const nuevo = new Emprendedor(req.body)
  nuevo.password = await nuevo.encrypPassword(password)
  const token = nuevo.crearToken()

  await sendMailToRegisterEmprendedor(email, token)
  await nuevo.save()

  res.status(200).json({ msg: "Revisa tu correo electrónico para confirmar tu cuenta" })
}

const confirmarMail = async (req, res) => {
  const { token } = req.params
  const emprendedorBDD = await Emprendedor.findOne({ token })

  if (!emprendedorBDD) return res.status(404).json({ msg: "Token inválido" })

  emprendedorBDD.token = null
  emprendedorBDD.confirmEmail = true
  await emprendedorBDD.save()

  res.status(200).json({ msg: "Cuenta confirmada correctamente" })
}

const recuperarPassword = async (req, res) => {
  const { email } = req.body

  if (Object.values(req.body).includes("")) {
    return res.status(404).json({ msg: "Lo sentimos, debes llenar todos los campos" })
  }

  const emprendedor = await Emprendedor.findOne({ email })
  if (!emprendedor) {
    return res.status(404).json({ msg: "No existe un emprendedor con ese email" })
  }

  const token = emprendedor.crearToken()
  emprendedor.token = token
  await sendMailToRecoveryPasswordEmprendedor(email, token)
  await emprendedor.save()

  res.status(200).json({ msg: "Revisa tu correo electrónico para reestablecer tu cuenta" })
}

const comprobarTokenPasword = async (req, res) => {
  const { token } = req.params
  const emprendedor = await Emprendedor.findOne({ token })

  if (emprendedor?.token !== token) {
    return res.status(404).json({ msg: "Token no válido" })
  }

  res.status(200).json({ msg: "Token confirmado, ya puedes crear tu nuevo password" })
}

const crearNuevoPassword = async (req, res) => {
  const { password, confirmpassword } = req.body

  if (Object.values(req.body).includes("")) {
    return res.status(404).json({ msg: "Lo sentimos, debes llenar todos los campos" })
  }

  if (password !== confirmpassword) {
    return res.status(404).json({ msg: "Lo sentimos, los passwords no coinciden" })
  }

  const emprendedor = await Emprendedor.findOne({ token: req.params.token })

  if (emprendedor?.token !== req.params.token) {
    return res.status(404).json({ msg: "Token no válido" })
  }

  emprendedor.token = null
  emprendedor.password = await emprendedor.encrypPassword(password)
  await emprendedor.save()

  res.status(200).json({ msg: "Felicitaciones, ya puedes iniciar sesión con tu nuevo password" })
}

const login = async (req, res) => {
  const { email, password } = req.body

  if (Object.values(req.body).includes("")) {
    return res.status(404).json({ msg: "Lo sentimos, debes llenar todos los campos" })
  }

  const emprendedorBDD = await Emprendedor.findOne({ email }).select("-__v -token -createdAt -updatedAt")

  if (!emprendedorBDD) {
    return res.status(404).json({ msg: "El usuario no está registrado" })
  }

  if (!emprendedorBDD.confirmEmail) {
    return res.status(403).json({ msg: "Debe confirmar su cuenta antes de iniciar sesión" })
  }

  const passwordValido = await emprendedorBDD.matchPassword(password)
  if (!passwordValido) {
    return res.status(401).json({ msg: "El password es incorrecto" })
  }

  const { nombre, apellido, telefono, _id, rol } = emprendedorBDD
  const token = crearTokenJWT(_id, rol)

  res.status(200).json({
    token,
    rol,
    nombre,
    apellido,
    telefono,
    _id,
    email: emprendedorBDD.email
  })
}

const perfil = (req, res) => {
  const { token, password, confirmEmail, __v, createdAt, updatedAt, ...datosPerfil } = req.emprendedorBDD
  res.status(200).json(datosPerfil)
}

const actualizarPassword = async (req, res) => {
  try {
    const emprendedorBDD = await Emprendedor.findById(req.emprendedorBDD._id)

    if (!emprendedorBDD) {
      return res.status(404).json({ msg: "Emprendedor no encontrado" })
    }

    const verificarPassword = await emprendedorBDD.matchPassword(req.body.passwordactual)

    if (!verificarPassword) {
      return res.status(400).json({ msg: "El password actual no es correcto" })
    }

    emprendedorBDD.password = await emprendedorBDD.encrypPassword(req.body.passwordnuevo)
    await emprendedorBDD.save()

    res.status(200).json({ msg: "Password actualizado correctamente" })
  } catch (error) {
    res.status(500).json({ msg: "Error al actualizar el password" })
  }
}

const actualizarPerfil = async (req, res) => {
  const { id } = req.params
  const { nombre, apellido, telefono, email } = req.body

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ msg: "ID no válido" })
  }

  if (Object.values(req.body).includes("")) {
    return res.status(400).json({ msg: "Todos los campos son obligatorios" })
  }

  // Validaciones
  const errorNombre = validarNombre(nombre);
  if (errorNombre) {
    return res.status(400).json({ msg: errorNombre });
  }

  const errorTelefono = validarCelular(telefono);
  if (errorTelefono) {
    return res.status(400).json({ msg: errorTelefono });
  }

  const emprendedorBDD = await Emprendedor.findById(id)
  if (!emprendedorBDD) {
    return res.status(404).json({ msg: "Emprendedor no encontrado" })
  }

  if (emprendedorBDD.email !== email) {
    const emprendedorMail = await Emprendedor.findOne({ email })
    if (emprendedorMail) {
      return res.status(400).json({ msg: "El email ya se encuentra registrado" })
    }
  }

  emprendedorBDD.nombre = nombre ?? emprendedorBDD.nombre
  emprendedorBDD.apellido = apellido ?? emprendedorBDD.apellido
  emprendedorBDD.telefono = telefono ?? emprendedorBDD.telefono
  emprendedorBDD.email = email ?? emprendedorBDD.email

  await emprendedorBDD.save()
  res.status(200).json(emprendedorBDD)
}

const verEmprendedores = async (req, res) => {
  try {
    const emprendedores = await Emprendedor.find()
    res.status(200).json(emprendedores)
  } catch (error) {
    res.status(500).json({ msg: "Error al obtener los emprendedores" })
  }
}

// ======== NUEVA FUNCION: Obtener emprendedor por ID (público) ========
const obtenerEmprendedorPorId = async (req, res) => {
  const { id } = req.params

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ ok: false, msg: "ID no válido" })
  }

  try {
    const emprendedor = await Emprendedor.findById(id).select('nombre apellido email telefono enlaces rol status')
    if (!emprendedor) {
      return res.status(404).json({ ok: false, msg: 'Emprendedor no encontrado' })
    }
    // Devolvemos como { ok: true, emprendedor } para consistencia
    res.status(200).json({ ok: true, emprendedor })
  } catch (error) {
    console.error('Error al obtener emprendedor por id', error)
    res.status(500).json({ ok: false, msg: 'Error del servidor' })
  }
}
// ===================================================================

const actualizarEmprendedor = async (req, res) => {
  const { id } = req.params

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ msg: "ID no válido" })
  }

  try {
    const emprendedor = await Emprendedor.findById(id)
    if (!emprendedor) return res.status(404).json({ msg: "Emprendedor no encontrado" })

    const { nombre, apellido, email, password, telefono } = req.body

    if (nombre) emprendedor.nombre = nombre
    if (apellido) emprendedor.apellido = apellido
    if (email) emprendedor.email = email
    if (telefono) emprendedor.telefono = telefono
    if (password) emprendedor.password = await emprendedor.encrypPassword(password)

    const actualizado = await emprendedor.save()
    res.status(200).json(actualizado)
  } catch (error) {
    res.status(500).json({ msg: "Error al actualizar emprendedor" })
  }
}

const eliminarEmprendedor = async (req, res) => {
  const { id } = req.params

  try {
    const emprendedor = await Emprendedor.findById(id)
    if (!emprendedor) return res.status(404).json({ msg: "Emprendedor no encontrado" })

    await emprendedor.deleteOne()
    res.status(200).json({ msg: "Emprendedor eliminado correctamente" })
  } catch (error) {
    res.status(500).json({ msg: "Error al eliminar emprendedor" })
  }
}

// Agregar emprendimiento a favoritos
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

// Eliminar emprendimiento de favoritos
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

// Obtener favoritos del emprendedor
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
  obtenerEmprendedorPorId, // <-- exportamos la nueva función
  actualizarEmprendedor,
  eliminarEmprendedor
}
