// routers/favoritoRoutes.js
import { Router } from 'express';
import {
  toggleFavorite,
  listMyFavorites,
  listFavoritesByUserPublic,
  getFavoriteById,
  updateFavorite,
  deleteFavorite
} from '../controllers/favoritoController.js';
import { verificarTokenJWT } from '../middleware/JWT.js';

const router = Router();

/**
 * NOTAS:
 * - Toggle, listar propios, actualizar y eliminar requieren autenticación.
 * - Listar por usuario y obtener por id son públicos (según tu requerimiento).
 */

// Crear / alternar favorito (autenticado)
router.post('/toggle', verificarTokenJWT, toggleFavorite);

// Listar favoritos del usuario autenticado
router.get('/mine', verificarTokenJWT, listMyFavorites);

// Listar favoritos públicos de un usuario (por ejemplo en su perfil público)
router.get('/user/:userId', listFavoritesByUserPublic);

// Obtener favorito por id (solo si está activo)
router.get('/:id', getFavoriteById);

// Actualizar favorito (solo propietario o admin)
router.put('/:id', verificarTokenJWT, updateFavorite);

// Eliminar favorito (solo propietario o admin)
router.delete('/:id', verificarTokenJWT, deleteFavorite);

export default router;
