
// routes/emprendimientoRoutes.js
import { Router } from 'express';
import {
  crearEmprendimiento,
  obtenerMisEmprendimientos,
  obtenerEmprendimiento,
  actualizarEmprendimiento,
  eliminarEmprendimiento,
  obtenerEmprendimientosPublicos,
  obtenerEmprendimientoPorSlug
} from '../controllers/emprendimientoController.js';

import { verificarTokenJWT } from '../middleware/JWT.js';
import upload, { setUploadFolder } from '../middlewares/upload.js';

const router = Router();

// Públicas
router.get('/publicos', obtenerEmprendimientosPublicos);
router.get('/publico/:slug', obtenerEmprendimientoPorSlug);
router.get('/s/:slug', obtenerEmprendimientoPorSlug);
router.get('/:id', obtenerEmprendimiento);

// Protegidas
router.post(
  '/',
  verificarTokenJWT,
  setUploadFolder('emprendimientos'),
  upload.single('logo'),
  crearEmprendimiento
);

router.get('/', verificarTokenJWT, obtenerMisEmprendimientos);

router.put(
  '/:id',
  verificarTokenJWT,
  setUploadFolder('emprendimientos'),
  upload.single('logo'),
  actualizarEmprendimiento
);

router.delete('/:id', verificarTokenJWT, eliminarEmprendimiento);

export default router;
