
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
  actualizarFotoPerfil,  // 👈 nuevo
  eliminarFotoPerfil     // 👈 nuevo
} from '../controllers/administrador_controllers.js';

import { verificarTokenJWT } from '../middleware/JWT.js';
import upload, { setUploadFolder } from '../middleware/upload.js';

const router = Router();

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

// 👇 NUEVO: subir/eliminar foto de perfil
router.put(
  '/administradore/foto/:id',
  verificarTokenJWT,
  setUploadFolder('usuarios/administradores'),  // carpeta Cloudinary
  upload.single('foto'),                         // campo en FormData
  actualizarFotoPerfil
);

router.delete(
  '/administradore/foto/:id',
  verificarTokenJWT,
  eliminarFotoPerfil
);

export default router;
