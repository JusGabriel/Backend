
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
  actualizarFotoPerfil,   // 👈 nuevo
  eliminarFotoPerfil      // 👈 nuevo
} from "../controllers/cliente_controllers.js"
import { verificarTokenJWT } from '../middleware/JWT.js'

// ⬇️ Multer + CloudinaryStorage (sin upload.js)
import multer from 'multer'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import cloudinary from '../config/cloudinary.js'

const router = Router()

// Storage para fotos de clientes.
// Genera req.file.path (secure_url) y req.file.filename (public_id), como en Admin/Emprendedor.
const clienteFotoStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: 'usuarios/clientes',                   // carpeta en Cloudinary
    resource_type: 'image',
    public_id: `cli_${req.params?.id || 'anon'}_${Date.now()}`
    // Sin transformaciones extra para replicar patrón base.
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
  uploadClienteFoto.single('foto'),   // campo FormData: "foto"
  actualizarFotoPerfil
)

router.delete(
  "/cliente/foto/:id",
  verificarTokenJWT,
  eliminarFotoPerfil
)

// *** Editar estado del cliente por ID (ruta que usa tu front) ***
router.put("/estado/:id", /* verificarTokenJWT, */ actualizarEstadoClienteById)

export default router
