// routes/cliente_rutas.js
import { Router } from 'express'
import {
  registro, confirmarMail, recuperarPassword, comprobarTokenPasword, crearNuevoPassword,
  login, verClientes, actualizarCliente, eliminarCliente, perfil, actualizarPassword,
  actualizarPerfil, actualizarFotoPerfil, eliminarFotoPerfil, actualizarEstadoClienteById 
} from '../controllers/cliente_controllers.js'
import { verificarTokenJWT } from '../middleware/JWT.js'
import multer from 'multer'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import cloudinary from '../config/cloudinary.js'

const router = Router()

// Guard simple de Admin (asume que tu middleware llena req.adminBDD)
const requireAdmin = (req, res, next) => {
  if (!req.adminBDD) return res.status(403).json({ msg: 'Acceso denegado' })
  next()
}

// Storage Cloudinary (genera req.file.path y req.file.filename)
const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: 'usuarios/clientes',
    resource_type: 'image',
    public_id: `cli_${req.params?.id || 'anon'}_${Date.now()}`
  })
})
const uploadClienteFoto = multer({ storage })

/* Publicas: registro/confirmacion/auth */
router.post('/registro', registro)
router.get('/confirmar/:token', confirmarMail)
router.post('/login', login)
router.post('/recuperar-password', recuperarPassword)
router.get('/comprobar-token/:token', comprobarTokenPasword)
router.post('/nuevo-password/:token', crearNuevoPassword)

/* CRUD (solo admin) */
router.get('/todos', verificarTokenJWT, requireAdmin, verClientes)
router.put('/actualizar/:id', verificarTokenJWT, requireAdmin, actualizarCliente)
router.delete('/eliminar/:id', verificarTokenJWT, requireAdmin, eliminarCliente)

/* Perfil protegido + foto */
router.get('/perfil', verificarTokenJWT, perfil)
router.put('/cliente/:id', verificarTokenJWT, actualizarPerfil)
router.put('/cliente/actualizarpassword/:id', verificarTokenJWT, actualizarPassword)
router.put('/cliente/foto/:id', verificarTokenJWT, uploadClienteFoto.single('foto'), actualizarFotoPerfil)
router.delete('/cliente/foto/:id', verificarTokenJWT, eliminarFotoPerfil)
// Estado (solo Admin)
router.put('/estado/:id', verificarTokenJWT, requireAdmin, actualizarEstadoClienteById)

export default router

