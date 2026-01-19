
// routes/cliente_rutas.js
import { Router } from 'express'
import {
  registro, confirmarMail, recuperarPassword, comprobarTokenPasword, crearNuevoPassword,
  login, verClientes, actualizarCliente, eliminarCliente, perfil, actualizarPassword,
  actualizarPerfil, actualizarEstadoClienteById, actualizarFotoPerfil, eliminarFotoPerfil,
  listarAuditoriaCliente,
  advertirClienteById
} from '../controllers/cliente_controllers.js'
import { verificarTokenJWT } from '../middleware/JWT.js'
import multer from 'multer'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import cloudinary from '../config/cloudinary.js'

const router = Router()

// ✅ Guard de Admin SIN tocar tu middleware (usa req.adminBDD que tu middleware llena)
const requireAdmin = (req, res, next) => {
  if (!req.adminBDD) return res.status(403).json({ msg: 'Acceso denegado' })
  next()
}

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: 'usuarios/clientes',
    resource_type: 'image',
    public_id: `cli_${req.params?.id || 'anon'}_${Date.now()}`
  })
})
const uploadClienteFoto = multer({ storage })

// Registro / confirmación / auth (público)
router.post('/registro', registro)
router.get('/confirmar/:token', confirmarMail)
router.post('/login', login)
router.post('/recuperar-password', recuperarPassword)
router.get('/comprobar-token/:token', comprobarTokenPasword)
router.post('/nuevo-password/:token', crearNuevoPassword)

// CRUD (solo Admin)
router.get('/todos', verificarTokenJWT, requireAdmin, verClientes)
router.put('/actualizar/:id', verificarTokenJWT, requireAdmin, actualizarCliente)
router.delete('/eliminar/:id', verificarTokenJWT, requireAdmin, eliminarCliente)

// Perfil protegido + foto
router.get('/perfil', verificarTokenJWT, perfil)
router.put('/cliente/:id', verificarTokenJWT, actualizarPerfil)
router.put('/cliente/actualizarpassword/:id', verificarTokenJWT, actualizarPassword)
router.put('/cliente/foto/:id', verificarTokenJWT, uploadClienteFoto.single('foto'), actualizarFotoPerfil)
router.delete('/cliente/foto/:id', verificarTokenJWT, eliminarFotoPerfil)

// Estado (solo Admin)
router.put('/estado/:id', verificarTokenJWT, requireAdmin, actualizarEstadoClienteById)

// Progresión de advertencia (solo Admin)
router.put('/estado/:id/advertir', verificarTokenJWT, requireAdmin, advertirClienteById)

// Auditoría (solo Admin)
router.get('/estado/:id/auditoria', verificarTokenJWT, requireAdmin, listarAuditoriaCliente)

export default router
