import Cliente from '../models/Cliente.js'
import { 
  sendMailToRegisterCliente, 
  sendMailToRecoveryPasswordCliente 
} from "../config/nodemailerCliente.js"
import { crearTokenJWT } from "../middleware/JWT.js"

const registro = async (req, res) => {
  const { email, password } = req.body

  if (Object.values(req.body).includes("")) {
    return res.status(400).json({ msg: "Todos los campos son obligatorios" })
  }

  const existe = await Cliente.findOne({ email })
  if (existe) {
    return res.status(400).json({ msg: "Este email ya está registrado" })
  }

  const nuevoCliente = new Cliente(req.body)
  nuevoCliente.password = await nuevoCliente.encrypPassword(password)
  const token = nuevoCliente.crearToken()

  await sendMailToRegisterCliente(email, token)
  await nuevoCliente.save()

  res.status(200).json({ msg: "Revisa tu correo electrónico para confirmar tu cuenta" })
}

const confirmarMail = async (req, res) => {
  const { token } = req.params
  const clienteBDD = await Cliente.findOne({ token })

  if (!clienteBDD) return res.status(404).json({ msg: "Token inválido" })

  clienteBDD.token = null
  clienteBDD.confirmEmail = true
  await clienteBDD.save()

  res.status(200).json({ msg: "Cuenta confirmada correctamente" })
}

const recuperarPassword = async (req, res) => {
  const { email } = req.body

  if (Object.values(req.body).includes("")) {
    return res.status(400).json({ msg: "Debes llenar todos los campos" })
  }

  const clienteBDD = await Cliente.findOne({ email })
  if (!clienteBDD) {
    return res.status(404).json({ msg: "El usuario no se encuentra registrado" })
  }

  const token = clienteBDD.crearToken()
  clienteBDD.token = token

  await sendMailToRecoveryPasswordCliente(email, token)
  await clienteBDD.save()

  res.status(200).json({ msg: "Revisa tu correo electrónico para reestablecer tu cuenta" })
}

const comprobarTokenPasword = async (req, res) => {
  const { token } = req.params
  const clienteBDD = await Cliente.findOne({ token })

  if (clienteBDD?.token !== token) {
    return res.status(404).json({ msg: "No se puede validar la cuenta" })
  }

  res.status(200).json({ msg: "Token confirmado, ya puedes crear tu nuevo password" })
}

const crearNuevoPassword = async (req, res) => {
  const { password, confirmpassword } = req.body

  if (Object.values(req.body).includes("")) {
    return res.status(400).json({ msg: "Debes llenar todos los campos" })
  }

  if (password !== confirmpassword) {
    return res.status(400).json({ msg: "Los passwords no coinciden" })
  }

  const clienteBDD = await Cliente.findOne({ token: req.params.token })

  if (clienteBDD?.token !== req.params.token) {
    return res.status(404).json({ msg: "No se puede validar la cuenta" })
  }

  clienteBDD.token = null
  clienteBDD.password = await clienteBDD.encrypPassword(password)
  await clienteBDD.save()

  res.status(200).json({ msg: "Ya puedes iniciar sesión con tu nuevo password" })
}

const login = async (req, res) => {
  const { email, password } = req.body

  if (Object.values(req.body).includes("")) {
    return res.status(400).json({ msg: "Debes llenar todos los campos" })
  }

  const clienteBDD = await Cliente.findOne({ email }).select("-__v -token -updatedAt -createdAt")

  if (!clienteBDD) {
    return res.status(404).json({ msg: "El usuario no se encuentra registrado" })
  }

  if (!clienteBDD.confirmEmail) {
    return res.status(403).json({ msg: "Debe verificar su cuenta" })
  }

  const verificarPassword = await clienteBDD.matchPassword(password)

  if (!verificarPassword) {
    return res.status(401).json({ msg: "El password no es el correcto" })
  }

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
    email: clienteBDD.email
  })
}

const verClientes = async (req, res) => {
  try {
    const clientes = await Cliente.find()
    res.status(200).json(clientes)
  } catch (error) {
    res.status(500).json({ msg: "Error al obtener los clientes" })
  }
}

const actualizarCliente = async (req, res) => {
  const { id } = req.params

  try {
    const cliente = await Cliente.findById(id)
    if (!cliente) return res.status(404).json({ msg: "Cliente no encontrado" })

    const { nombre, apellido, email, password, telefono } = req.body

    if (nombre) cliente.nombre = nombre
    if (apellido) cliente.apellido = apellido
    if (email) cliente.email = email
    if (telefono) cliente.telefono = telefono
    if (password) cliente.password = await cliente.encrypPassword(password)

    const actualizado = await cliente.save()
    res.status(200).json(actualizado)
  } catch (error) {
    res.status(500).json({ msg: "Error al actualizar cliente" })
  }
}

const eliminarCliente = async (req, res) => {
  const { id } = req.params

  try {
    const cliente = await Cliente.findById(id)
    if (!cliente) return res.status(404).json({ msg: "Cliente no encontrado" })

    await cliente.deleteOne()
    res.status(200).json({ msg: "Cliente eliminado correctamente" })
  } catch (error) {
    res.status(500).json({ msg: "Error al eliminar cliente" })
  }
}

export {
  registro,
  confirmarMail,
  recuperarPassword,
  comprobarTokenPasword,
  crearNuevoPassword,
  login,
  verClientes,
  actualizarCliente,
  eliminarCliente
}
