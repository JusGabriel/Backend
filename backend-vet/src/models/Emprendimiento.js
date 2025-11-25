import { Schema, model } from "mongoose";

const productoSchema = new Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },

  descripcion: {
    type: String,
    trim: true
  },

  precio: {
    type: Number,
    required: true
  },

  imagen: {
    type: String,
    trim: true
  },

  // Relación correcta -> pertenece a un emprendimiento
  emprendimiento: {
    type: Schema.Types.ObjectId,
    ref: 'Emprendimiento',
    required: true
  },

  categoria: {
    type: Schema.Types.ObjectId,
    ref: 'Categoria',
    default: null
  },

  stock: {
    type: Number,
    default: 0
  },

  estado: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default model("Producto", productoSchema);
