
// routers/emprendedor_routes.js
import { Router } from "express"
import {
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
  actualizarFotoPerfil,   // 👈 nuevo
  eliminarFotoPerfil      // 👈 nuevo
} from "../controllers/emprendedor_controllers.js"

import { verificarTokenJWT } from '../middleware/JWT.js'

// ⬇️ Multer + CloudinaryStorage (sin upload.js)
import multer from 'multer'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import cloudinary from '../config/cloudinary.js'

const router = Router()

// Storage para fotos de emprendedores.
// Genera req.file.path (secure_url) y req.file.filename (public_id), como en Emprendimientos/Administrador.
const emprendedorFotoStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: 'usuarios/emprendedores',                 // carpeta en Cloudinary
    resource_type: 'image',
    public_id: `empr_${req.params?.id || 'anon'}_${Date.now()}`
    // Sin transformaciones extra para replicar patrón base.
  }),
})

const uploadEmprendedorFoto = multer({ storage: emprendedorFotoStorage })

// Registro y confirmación de cuenta
router.post("/registro", registro)
router.get("/confirmar/:token", confirmarMail)

// Recuperación de contraseña
router.post("/recuperarpassword", recuperarPassword)
router.get("/recuperarpassword/:token", comprobarTokenPasword)
router.post("/nuevopassword/:token", crearNuevoPassword)

// Login
router.post('/login', login)

// Perfil autenticado y acciones protegidas
router.get('/perfil', verificarTokenJWT, perfil)
router.put('/emprendedore/:id', verificarTokenJWT, actualizarPerfil)
router.put('/emprendedore/actualizarpassword/:id', verificarTokenJWT, actualizarPassword)

// 📸 Foto de perfil (solo archivo, Cloudinary)
router.put(
  '/emprendedore/foto/:id',
  verificarTokenJWT,
  uploadEmprendedorFoto.single('foto'),   // campo FormData: "foto"
  actualizarFotoPerfil
)

router.delete(
  '/emprendedore/foto/:id',
  verificarTokenJWT,
  eliminarFotoPerfil
)

// CRUD emprendedores (general)
router.get("/todos", verEmprendedores)
router.put('/actualizar/:id', verificarTokenJWT, actualizarEmprendedor)
router.delete('/eliminar/:id', eliminarEmprendedor)

export default router
