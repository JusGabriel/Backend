// models/Favorito.js
import { Schema, model } from 'mongoose';

const favoritoSchema = new Schema({
  usuario: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario', // Ajusta el nombre del modelo de usuario si usas otro (e.g. 'User')
    required: true,
    index: true
  },

  // referencia al documento marcado (producto o emprendimiento)
  item: {
    type: Schema.Types.ObjectId,
    required: true
  },

  // modelo objetivo: permite uso de refPath si lo deseas
  itemModel: {
    type: String,
    required: true,
    enum: ['Producto', 'Emprendimiento']
  },

  // snapshot mínimo para evitar consultas obligatorias al mostrar la lista de favoritos
  meta: {
    nombre: { type: String, default: null },           // nombre o nombreComercial
    descripcion: { type: String, default: null },
    precio: { type: Number, default: null },           // solo para productos
    imagen: { type: String, default: null },
    slug: { type: String, default: null },
    // info del emprendimiento (útil cuando el favorito es producto)
    emprendimiento: {
      _id: { type: Schema.Types.ObjectId, default: null },
      nombreComercial: { type: String, default: null }
    }
  },

  // control de estado (soft delete / toggle)
  activo: {
    type: Boolean,
    default: true,
    index: true
  },

  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// índice único para evitar que el mismo usuario marque dos veces el mismo item
favoritoSchema.index({ usuario: 1, itemModel: 1, item: 1 }, { unique: true });

/**
 * Método estático: toggle
 * - Si no existe => crea favorito (activo: true)
 * - Si existe y activo => desactiva (soft delete)
 * - Si existe y no activo => reactiva
 * Devuelve un objeto con { action: 'created'|'removed'|'reactivated', favorito }
 */
favoritoSchema.statics.toggle = async function(usuarioId, itemId, itemModel, meta = {}) {
  const Favorito = this;
  const filtro = { usuario: usuarioId, item: itemId, itemModel };

  let favorito = await Favorito.findOne(filtro);

  if (!favorito) {
    // crear nuevo
    favorito = await Favorito.create({
      ...filtro,
      meta,
      activo: true,
      deletedAt: null
    });
    return { action: 'created', favorito };
  }

  // existe: alternar estado (soft-delete)
  if (favorito.activo) {
    favorito.activo = false;
    favorito.deletedAt = new Date();
    await favorito.save();
    return { action: 'removed', favorito };
  } else {
    favorito.activo = true;
    favorito.deletedAt = null;
    // opcional: actualizar snapshot meta si quieres mantenerlo fresco
    if (meta && Object.keys(meta).length) favorito.meta = { ...favorito.meta, ...meta };
    await favorito.save();
    return { action: 'reactivated', favorito };
  }
};

/**
 * Método estático: isFavorite
 * - Comprueba si un usuario tiene marcado un item (y opcionalmente que esté activo)
 */
favoritoSchema.statics.isFavorite = async function(usuarioId, itemId, itemModel) {
  const Favorito = this;
  const doc = await Favorito.findOne({ usuario: usuarioId, item: itemId, itemModel, activo: true }).lean();
  return Boolean(doc);
};

export default model('Favorito', favoritoSchema);
