
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

// ⬇️ Multer + CloudinaryStorage (sin upload.js)
import multer from 'multer'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import cloudinary from '../config/cloudinary.js'

const router = Router()

// ✅ Middleware de rol inline (simple)
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

// Storage para fotos de clientes.
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

// 📸 Foto de perfil (solo archivo, Cloudinary)
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

// *** Editar estado del cliente por ID (con auditoría embebida) ***
// Solo Administrador puede cambiar estado
router.put(
  "/estado/:id",
  verificarTokenJWT,
  requireRole('Administrador'),
  actualizarEstadoClienteById
)

// *** Consultar histórico de auditoría embebida ***
// Solo Administrador
router.get(
  "/estado/:id/auditoria",
  verificarTokenJWT,
  requireRole('Administrador'),
  listarAuditoriaCliente
)

export default router
