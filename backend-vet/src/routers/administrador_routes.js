
// src/routers/administrador_routes.js
import { Router } from 'express';
import {
  registro,
  confirmarMail,
  recuperarPassword,
  comprobarTokenPasword,
  crearNuevoPassword,
  verAdministradores,
  actualizarAdministrador,
  eliminarAdministrador,
  login,
  perfil,
  actualizarPassword,
  actualizarPerfil,
  actualizarFotoPerfil,
  eliminarFotoPerfil
} from '../controllers/administrador_controllers.js';

import { verificarTokenJWT } from '../middleware/JWT.js';

// 👇 Configurar Multer + CloudinaryStorage directamente aquí (sin upload.js)
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

const router = Router();

// Storage específico para fotos de administradores.
// Produce req.file.path (secure_url) y req.file.filename (public_id) igual que en Emprendimientos.
const adminFotoStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: 'usuarios/administradores',        // carpeta en Cloudinary
    resource_type: 'image',
    // public_id simple para garantizar filename; puedes dejar que Cloudinary lo genere automáticamente.
    public_id: `admin_${req.params?.id || 'anon'}_${Date.now()}`
    // Sin transformaciones/filters adicionales; replicamos el comportamiento base de Emprendimientos.
  }),
});

const uploadAdminFoto = multer({ storage: adminFotoStorage });

router.post('/registro', registro);
router.get('/confirmar/:token', confirmarMail);
router.post('/recuperarpassword', recuperarPassword);
router.get('/recuperarpassword/:token', comprobarTokenPasword);
router.post('/nuevopassword/:token', crearNuevoPassword);
router.get('/todos', verAdministradores);
router.put('/actualizar/:id', actualizarAdministrador);
router.delete('/eliminar/:id', eliminarAdministrador);
router.post('/login', login);
router.get('/perfil', verificarTokenJWT, perfil);
router.put('/administradore/:id', verificarTokenJWT, actualizarPerfil);
router.put('/administradore/actualizarpassword/:id', verificarTokenJWT, actualizarPassword);

// Subir/actualizar foto de perfil (Cloudinary) – campo FormData: "foto"
router.put(
  '/administradore/foto/:id',
  verificarTokenJWT,
  uploadAdminFoto.single('foto'),
  actualizarFotoPerfil
);

// Eliminar foto de perfil
router.delete(
  '/administradore/foto/:id',
  verificarTokenJWT,
  eliminarFotoPerfil
);

export default router;
