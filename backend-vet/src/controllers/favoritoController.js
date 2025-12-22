// controllers/favoritoController.js
import Favorito from '../models/Favorito.js';
import mongoose from 'mongoose';

/**
 * Helper: obtener id de usuario autenticado y rol desde los middlewares existentes
 */
function getAuthUserId(req) {
  if (req.adminBDD) return { id: req.adminBDD._id.toString(), rol: 'Administrador' };
  if (req.emprendedorBDD) return { id: req.emprendedorBDD._id.toString(), rol: 'Emprendedor' };
  if (req.clienteBDD) return { id: req.clienteBDD._id.toString(), rol: 'Cliente' };
  return null;
}

/**
 * POST /api/favoritos/toggle
 * Body: { itemId, itemModel, meta }
 * - itemModel: 'Producto' | 'Emprendimiento'
 * - meta: optional snapshot
 */
export const toggleFavorite = async (req, res) => {
  try {
    const user = getAuthUserId(req);
    if (!user) return res.status(401).json({ msg: 'Autenticación requerida' });

    const { itemId, itemModel, meta } = req.body;
    if (!itemId || !itemModel) return res.status(400).json({ msg: 'itemId y itemModel son obligatorios' });

    if (!mongoose.Types.ObjectId.isValid(itemId)) return res.status(400).json({ msg: 'itemId inválido' });
    if (!['Producto', 'Emprendimiento'].includes(itemModel)) return res.status(400).json({ msg: 'itemModel inválido' });

    // Delegate to el método estático toggle del modelo Favorito (ya implementado)
    const result = await Favorito.toggle(user.id, itemId, itemModel, meta || {});

    return res.status(200).json(result);
  } catch (err) {
    // En caso de un conflicto por índice único en alta concurrente, tratamos de recuperar
    if (err?.code === 11000) {
      try {
        const doc = await Favorito.findOne({ usuario: req.user?._id, item: req.body.itemId, itemModel: req.body.itemModel });
        if (doc) return res.status(200).json({ action: doc.activo ? 'exists' : 'reactivated', favorito: doc });
      } catch (e) { /* ignore */ }
    }
    console.error(err);
    return res.status(500).json({ msg: 'Error interno al alternar favorito' });
  }
};

/**
 * GET /api/favoritos/mine
 * Lista los favoritos del usuario autenticado (activos por defecto).
 */
export const listMyFavorites = async (req, res) => {
  try {
    const user = getAuthUserId(req);
    if (!user) return res.status(401).json({ msg: 'Autenticación requerida' });

    const favoritos = await Favorito.find({ usuario: user.id, activo: true })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(favoritos);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: 'Error interno al obtener favoritos' });
  }
};

/**
 * GET /api/favoritos/user/:userId
 * Público: obtiene favoritos ACTIVOS de un usuario (útil para mostrar en perfil público).
 */
export const listFavoritesByUserPublic = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ msg: 'userId inválido' });

    const favoritos = await Favorito.find({ usuario: userId, activo: true })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(favoritos);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: 'Error al listar favoritos públicos' });
  }
};

/**
 * GET /api/favoritos/:id
 * Público: obtiene un favorito por id solo si está activo.
 * Si quieres permitir ver inactivos para el propietario/admin, ajusta la lógica.
 */
export const getFavoriteById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ msg: 'id inválido' });

    const favorito = await Favorito.findById(id).lean();
    if (!favorito || !favorito.activo) return res.status(404).json({ msg: 'Favorito no encontrado' });

    return res.status(200).json(favorito);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: 'Error al obtener favorito' });
  }
};

/**
 * PUT /api/favoritos/:id
 * Actualizar meta o activo. Solo propietario (o admin) puede hacerlo.
 * Body: { activo?, meta? }
 */
export const updateFavorite = async (req, res) => {
  try {
    const auth = getAuthUserId(req);
    if (!auth) return res.status(401).json({ msg: 'Autenticación requerida' });

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ msg: 'id inválido' });

    const favorito = await Favorito.findById(id);
    if (!favorito) return res.status(404).json({ msg: 'Favorito no encontrado' });

    // check ownership or admin
    if (favortoMatchOwner(favorito, auth) === false && auth.rol !== 'Administrador') {
      return res.status(403).json({ msg: 'No autorizado' });
    }

    const { activo, meta } = req.body;
    if (typeof activo === 'boolean') favorito.activo = activo;
    if (meta && typeof meta === 'object') favorito.meta = { ...favortoMergeMeta(favorito.meta, meta) };

    await favorito.save();
    return res.status(200).json({ msg: 'Favorito actualizado', favorito });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: 'Error al actualizar favorito' });
  }
};

/**
 * DELETE /api/favoritos/:id
 * Eliminar físico. Solo propietario o admin.
 */
export const deleteFavorite = async (req, res) => {
  try {
    const auth = getAuthUserId(req);
    if (!auth) return res.status(401).json({ msg: 'Autenticación requerida' });

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ msg: 'id inválido' });

    const favorito = await Favorito.findById(id);
    if (!favorito) return res.status(404).json({ msg: 'Favorito no encontrado' });

    if (favortoMatchOwner(favorito, auth) === false && auth.rol !== 'Administrador') {
      return res.status(403).json({ msg: 'No autorizado' });
    }

    await favorito.deleteOne();
    return res.status(200).json({ msg: 'Favorito eliminado correctamente' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: 'Error al eliminar favorito' });
  }
};

/* ------------------ Helpers internos ------------------ */
function favortoMatchOwner(favDoc, auth) {
  try {
    const docUserId = String(favDoc.usuario);
    return docUserId === String(auth.id);
  } catch (e) {
    return false;
  }
}

function favortoMergeMeta(existingMeta = {}, newMeta = {}) {
  return { ...existingMeta, ...newMeta };
}
