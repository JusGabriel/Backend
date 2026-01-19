
// routes/cliente_rutas.js
import { Router } from 'express'
import {
  registro, confirmarMail, recuperarPassword, comprobarTokenPasword, crearNuevoPassword,
  login, verClientes, actualizarCliente, eliminarCliente, perfil, actualizarPassword,
  actualizarPerfil, actualizarEstadoClienteById, actualizarFotoPerfil, eliminarFotoPerfil,
  listarAuditoriaCliente
} from '../controllers/cliente_controllers.js'
import { verificarTokenJWT } from '../middleware/JWT.js'
import multer from 'multer'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import cloudinary from '../config/cloudinary.js'

const router = Router()

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: 'usuarios/clientes',
    resource_type: 'image',
    public_id: `cli_${req.params?.id || 'anon'}_${Date.now()}`
  })
})
const uploadClienteFoto = multer({ storage })

// Registro / confirmación / auth
router.post('/registro', registro)
router.get('/confirmar/:token', confirmarMail)
router.post('/login', login)
router.post('/recuperar-password', recuperarPassword)
router.get('/comprobar-token/:token', comprobarTokenPasword)
router.post('/nuevo-password/:token', crearNuevoPassword)

// CRUD
router.get('/todos', verClientes)
router.put('/actualizar/:id', actualizarCliente)
router.delete('/eliminar/:id', eliminarCliente)

// Perfil protegido + foto
router.get('/perfil', verificarTokenJWT, perfil)
router.put('/cliente/:id', verificarTokenJWT, actualizarPerfil)
router.put('/cliente/actualizarpassword/:id', verificarTokenJWT, actualizarPassword)
router.put('/cliente/foto/:id', verificarTokenJWT, uploadClienteFoto.single('foto'), actualizarFotoPerfil)
router.delete('/cliente/foto/:id', verificarTokenJWT, eliminarFotoPerfil)

// Estado (SIN middleware, según tu requerimiento)
router.put('/estado/:id', actualizarEstadoClienteById)

// Auditoría (si quieres, protégela con JWT)
router.get('/estado/:id/auditoria', verificarTokenJWT, listarAuditoriaCliente)

export default router
