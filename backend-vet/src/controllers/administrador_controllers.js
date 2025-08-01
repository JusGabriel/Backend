import Administrador from '../models/Administrador.js'
import { sendMailToRegister, sendMailToRecoveryPassword } from "../config/nodemailer.js"
import { crearTokenJWT } from "../middleware/JWT.js"
import mongoose from "mongoose"

const registro = async (req, res) => {
    const { email, password } = req.body
    if (Object.values(req.body).includes("")) {
        return res.status(400).json({ msg: "Todos los campos son obligatorios" })
    }

    const existeEmail = await Administrador.findOne({ email })
    if (existeEmail) {
        return res.status(400).json({ msg: "Este email ya está registrado" })
    }

    const nuevoAdmin = new Administrador(req.body)
    nuevoAdmin.password = await nuevoAdmin.encrypPassword(password)
    const token = nuevoAdmin.crearToken()

    await sendMailToRegister(email, token)
    await nuevoAdmin.save()

    res.status(200).json({ msg: "Revisa tu correo electrónico para confirmar tu cuenta" })
}

const confirmarMail = async (req, res) => {
    const { token } = req.params
    const admin = await Administrador.findOne({ token })

    if (!admin) {
        return res.status(404).json({ msg: "Token no válido" })
    }

    admin.token = null
    admin.confirmEmail = true
    await admin.save()

    res.status(200).json({ msg: "Cuenta confirmada correctamente" })
}

const recuperarPassword = async (req, res) => {
    const { email } = req.body

    if (Object.values(req.body).includes("")) {
        return res.status(404).json({ msg: "Lo sentimos, debes llenar todos los campos" })
    }

    const adminBDD = await Administrador.findOne({ email })
    if (!adminBDD) {
        return res.status(404).json({ msg: "Lo sentimos, el usuario no se encuentra registrado" })
    }

    const token = adminBDD.crearToken()
    adminBDD.token = token
    await sendMailToRecoveryPassword(email, token)
    await adminBDD.save()

    res.status(200).json({ msg: "Revisa tu correo electrónico para reestablecer tu cuenta" })
}

const comprobarTokenPasword = async (req, res) => {
    const { token } = req.params
    const adminBDD = await Administrador.findOne({ token })

    if (adminBDD?.token !== token) {
        return res.status(404).json({ msg: "Lo sentimos, no se puede validar la cuenta" })
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

    const adminBDD = await Administrador.findOne({ token: req.params.token })

    if (adminBDD?.token !== req.params.token) {
        return res.status(404).json({ msg: "Lo sentimos, no se puede validar la cuenta" })
    }

    adminBDD.token = null
    adminBDD.password = await adminBDD.encrypPassword(password)
    await adminBDD.save()

    res.status(200).json({ msg: "Felicitaciones, ya puedes iniciar sesión con tu nuevo password" })
}

const login = async (req, res) => {
    const { email, password } = req.body

    if (Object.values(req.body).includes("")) {
        return res.status(404).json({ msg: "Lo sentimos, debes llenar todos los campos" })
    }

    const adminBDD = await Administrador.findOne({ email }).select("-status -__v -token -updatedAt -createdAt")
    
    if (!adminBDD) {
        return res.status(404).json({ msg: "Lo sentimos, el usuario no se encuentra registrado" })
    }

    if (adminBDD?.confirmEmail === false) {
        return res.status(403).json({ msg: "Lo sentimos, debe verificar su cuenta" })
    }

    const verificarPassword = await adminBDD.matchPassword(password)

    if (!verificarPassword) {
        return res.status(401).json({ msg: "Lo sentimos, el password no es el correcto" })
    }

    const { nombre, apellido, direccion, telefono, _id, rol } = adminBDD
    const token = crearTokenJWT(adminBDD._id, adminBDD.rol)

    res.status(200).json({
        token,
        rol,
        nombre,
        apellido,
        direccion,
        telefono,
        _id,
        email: adminBDD.email,
    })
}

const verAdministradores = async (req, res) => {
    try {
        const admins = await Administrador.find()
        res.status(200).json(admins)
    } catch (error) {
        res.status(500).json({ msg: "Error al obtener administradores" })
    }
}

const actualizarAdministrador = async (req, res) => {
    const { id } = req.params

    try {
        const admin = await Administrador.findById(id)

        if (!admin) {
            return res.status(404).json({ msg: "Administrador no encontrado" })
        }

        const { nombre, apellido, email, password } = req.body

        if (nombre) admin.nombre = nombre
        if (apellido) admin.apellido = apellido
        if (email) admin.email = email
        if (password) {
            admin.password = await admin.encrypPassword(password)
        }

        const adminActualizado = await admin.save()

        res.status(200).json(adminActualizado)
    } catch (error) {
        res.status(500).json({ msg: "Error al actualizar administrador" })
    }
}

const eliminarAdministrador = async (req, res) => {
    const { id } = req.params

    try {
        const admin = await Administrador.findById(id)

        if (!admin) {
            return res.status(404).json({ msg: "Administrador no encontrado" })
        }

        await admin.deleteOne()

        res.status(200).json({ msg: "Administrador eliminado correctamente" })
    } catch (error) {
        res.status(500).json({ msg: "Error al eliminar administrador" })
    }
}
const perfil = (req, res) => {
    const { token, confirmEmail, createdAt, updatedAt, __v, password, ...datosPerfil } = req.adminBDD
    res.status(200).json(datosPerfil)
}
const actualizarPassword = async (req, res) => {
    try {
        // Buscar al administrador en la base de datos con la información del token
        const adminBDD = await Administrador.findById(req.adminBDD._id)

        if (!adminBDD) {
            return res.status(404).json({ msg: `Lo sentimos, no existe el administrador con ID ${req.adminBDD._id}` })
        }

        // Verificar el password actual
        const verificarPassword = await adminBDD.matchPassword(req.body.passwordactual)

        if (!verificarPassword) {
            return res.status(400).json({ msg: "Lo sentimos, el password actual no es el correcto" })
        }

        // Encriptar y actualizar el nuevo password
        adminBDD.password = await adminBDD.encrypPassword(req.body.passwordnuevo)
        await adminBDD.save()

        res.status(200).json({ msg: "Password actualizado correctamente" })
    } catch (error) {
        res.status(500).json({ msg: "Error al actualizar el password" })
    }
}
const actualizarPerfil = async (req, res) => {
    const { id } = req.params
    const { nombre, apellido, telefono, email } = req.body

    // Validar ID de MongoDB
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ msg: "Lo sentimos, el ID no es válido" })
    }

    // Validar campos vacíos
    if (Object.values(req.body).includes("")) {
        return res.status(400).json({ msg: "Lo sentimos, debes llenar todos los campos" })
    }

    // Buscar al administrador por ID
    const adminBDD = await Administrador.findById(id)
    if (!adminBDD) {
        return res.status(404).json({ msg: `Lo sentimos, no existe el administrador con ID ${id}` })
    }

    // Validar si se cambia el email, que no exista duplicado
    if (adminBDD.email !== email) {
        const adminBDDMail = await Administrador.findOne({ email })
        if (adminBDDMail) {
            return res.status(400).json({ msg: "Lo sentimos, el email ya se encuentra registrado" })
        }
    }

    // Actualizar campos, si vienen datos nuevos
    adminBDD.nombre = nombre ?? adminBDD.nombre
    adminBDD.apellido = apellido ?? adminBDD.apellido
    adminBDD.telefono = telefono ?? adminBDD.telefono
    adminBDD.email = email ?? adminBDD.email

    await adminBDD.save()

    res.status(200).json(adminBDD)
}

export {
    registro,
    confirmarMail,
    recuperarPassword,
    comprobarTokenPasword,
    crearNuevoPassword,
    login,
    verAdministradores,
    actualizarAdministrador,
    eliminarAdministrador,
    perfil,
    actualizarPassword,
    actualizarPerfil
}
