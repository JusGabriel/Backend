
// routes/cliente_rutas.js
import { Router } from "express"
import {
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
} from "../controllers/cliente_controllers.js"
import { verificarTokenJWT } from '../middleware/JWT.js'

import multer from 'multer'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import cloudinary from '../config/cloudinary.js'

const router = Router()

const requireRole = (...roles) => (req, res, next) => {
  const rol =
    req.adminBDD?.rol ||
    req.emprendedorBDD?.rol ||
    req.clienteBDD?.rol ||
    null

  if (!rol || !roles.includes(rol)) {
    return res.status(403).json({ msg: 'No autorizado' })
  }
  next()
}

const clienteFotoStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: 'usuarios/clientes',
    resource_type: 'image',
    public_id: `cli_${req.params?.id || 'anon'}_${Date.now()}`
  }),
})

const uploadClienteFoto = multer({ storage: clienteFotoStorage })

// Registro y confirmación
router.post("/registro", registro)
router.get("/confirmar/:token", confirmarMail)

// Autenticación
router.post("/login", login)

// Recuperación de contraseña
router.post("/recuperar-password", recuperarPassword)
router.get("/comprobar-token/:token", comprobarTokenPasword)
router.post("/nuevo-password/:token", crearNuevoPassword)

// Gestión de clientes
router.get("/todos", verClientes)
router.put("/actualizar/:id", actualizarCliente)
router.delete("/eliminar/:id", eliminarCliente)

// Perfil protegido
router.get("/perfil", verificarTokenJWT, perfil)
router.put("/cliente/:id", verificarTokenJWT, actualizarPerfil)
router.put("/cliente/actualizarpassword/:id", verificarTokenJWT, actualizarPassword)

// Foto de perfil
router.put(
  "/cliente/foto/:id",
  verificarTokenJWT,
  uploadClienteFoto.single('foto'),
  actualizarFotoPerfil
)
router.delete(
  "/cliente/foto/:id",
  verificarTokenJWT,
  eliminarFotoPerfil
)

// Estado + auditoría
// ⚠️ Cambio de estado SIN middleware (según tu requerimiento)
router.put("/estado/:id", actualizarEstadoClienteById)

// Auditoría puede quedar protegida (o abrirla si prefieres)
router.get(
  "/estado/:id/auditoria",
  verificarTokenJWT,
  requireRole('Administrador'),
  listarAuditoriaCliente
)

export default router
