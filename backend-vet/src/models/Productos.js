
// models/Productos.js
import { Schema, model } from 'mongoose';

const productoSchema = new Schema({
  nombre: { type: String, required: true, trim: true },
  descripcion: { type: String, trim: true, default: '' },
  precio: { type: Number, required: true, default: 0 },

  // URL pública de Cloudinary
  imagen: { type: String, trim: true, default: null },
  // public_id de Cloudinary (para poder hacer destroy al reemplazar/eliminar)
  imagenPublicId: { type: String, trim: true, default: null },

  emprendimiento: {
    type: Schema.Types.ObjectId,
    ref: 'Emprendimiento',
    required: true
  },
  categoria: {
    type: Schema.Types.ObjectId,
    ref: 'Categoria',
    required: false,
    default: null
  },
  stock: { type: Number, default: 0 },
  estado: { type: Boolean, default: true }
}, {
  timestamps: true
});

export default model('Producto', productoSchema);
