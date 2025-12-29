
// src/controllers/comentario_controllers.js
import mongoose from 'mongoose';
import Comentario from '../models/Comentario.js';
import Producto from '../models/Productos.js';
import Emprendimiento from '../models/Emprendimiento.js';

/** Obtiene el actor actual desde req (set por verificarTokenJWT) */
function getActorFromRequest(req) {
  if (req.adminBDD) {
    return { usuarioId: req.adminBDD._id, usuarioTipo: 'Administrador' };
  }
  if (req.emprendedorBDD) {
    return { usuarioId: req.emprendedorBDD._id, usuarioTipo: 'Emprendedor' };
  }
  if (req.clienteBDD) {
    return { usuarioId: req.clienteBDD._id, usuarioTipo: 'Cliente' };
  }
  return null;
}

/** Valida si un ObjectId es válido */
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/** Crea un comentario (Producto o Emprendimiento) */
export async function crearComentario(req, res) {
  try {
    const actor = getActorFromRequest(req);
    if (!actor) return res.status(401).json({ msg: 'No autenticado' });

    const { destinoTipo, destinoId, texto } = req.body;

    if (!['Producto', 'Emprendimiento'].includes(destinoTipo)) {
      return res.status(400).json({ msg: 'destinoTipo debe ser "Producto" o "Emprendimiento"' });
    }
    if (!isValidObjectId(destinoId)) {
      return res.status(400).json({ msg: 'destinoId no es un ObjectId válido' });
    }
    if (typeof texto !== 'string' || !texto.trim()) {
      return res.status(400).json({ msg: 'El texto del comentario es obligatorio' });
    }
    const textoClean = texto.trim().slice(0, 1000);

    // Verificar que exista el destino
    if (destinoTipo === 'Producto') {
      const prod = await Producto.findById(destinoId).select('_id').lean();
      if (!prod) return res.status(404).json({ msg: 'Producto no encontrado' });
    } else {
      const emp = await Emprendimiento.findById(destinoId).select('_id').lean();
      if (!emp) return res.status(404).json({ msg: 'Emprendimiento no encontrado' });
    }

    const comentario = await Comentario.create({
      usuario: actor.usuarioId,
      usuarioTipo: actor.usuarioTipo,
      destinoId,
      destinoTipo,
      texto: textoClean
    });

    // Devolver con populate del autor
    const populated = await Comentario.findById(comentario._id)
      .populate('usuario', 'nombre apellido email rol')
      .lean();

    return res.status(201).json(populated);
  } catch (error) {
    console.error('crearComentario error:', error);
    return res.status(500).json({ msg: 'Error al crear comentario', error: error.message });
  }
}

/** Listar comentarios por Producto (público) */
export async function listarComentariosProducto(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ msg: 'ID de producto inválido' });

    // (Opcional) validar existencia
    const prod = await Producto.findById(id).select('_id').lean();
    if (!prod) return res.status(404).json({ msg: 'Producto no encontrado' });

    const comentarios = await Comentario.find({
      destinoId: id,
      destinoTipo: 'Producto'
    })
      .sort({ createdAt: -1 })
      .populate('usuario', 'nombre apellido email rol')
      .lean();

    return res.status(200).json(comentarios);
  } catch (error) {
    console.error('listarComentariosProducto error:', error);
    return res.status(500).json({ msg: 'Error al listar comentarios', error: error.message });
  }
}

/** Listar comentarios por Emprendimiento (público) */
export async function listarComentariosEmprendimiento(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ msg: 'ID de emprendimiento inválido' });

    const emp = await Emprendimiento.findById(id).select('_id').lean();
    if (!emp) return res.status(404).json({ msg: 'Emprendimiento no encontrado' });

    const comentarios = await Comentario.find({
      destinoId: id,
      destinoTipo: 'Emprendimiento'
    })
      .sort({ createdAt: -1 })
      .populate('usuario', 'nombre apellido email rol')
      .lean();

    return res.status(200).json(comentarios);
  } catch (error) {
    console.error('listarComentariosEmprendimiento error:', error);
    return res.status(500).json({ msg: 'Error al listar comentarios', error: error.message });
  }
}

/** Elimina comentario (autor o Admin) */
export async function eliminarComentario(req, res) {
  try {
    const actor = getActorFromRequest(req);
    if (!actor) return res.status(401).json({ msg: 'No autenticado' });

    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ msg: 'ID de comentario inválido' });

    const comentario = await Comentario.findById(id);
    if (!comentario) return res.status(404).json({ msg: 'Comentario no encontrado' });

    const esAutor = String(comentario.usuario) === String(actor.usuarioId);
    const esAdmin = actor.usuarioTipo === 'Administrador';

    if (!esAutor && !esAdmin) {
      return res.status(403).json({ msg: 'No autorizado para eliminar este comentario' });
    }

    await comentario.deleteOne();
    return res.status(200).json({ msg: 'Comentario eliminado' });
  } catch (error) {
    console.error('eliminarComentario error:', error);
    return res.status(500).json({ msg: 'Error al eliminar comentario', error: error.message });
  }
}
