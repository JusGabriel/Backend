import { Schema, model } from 'mongoose'

const emprendimientoSchema = new Schema({
  nombreComercial: {
    type: String,
    required: true,
    trim: true
  },

  slug: {
    type: String,
    unique: true,
    trim: true
  },

  descripcion: {
    type: String,
    default: ''
  },
  logo: {
    type: String, // URL del logoo
    default: null
  },
  ubicacion: {
    direccion: { type: String, default: null },
    ciudad: { type: String, default: null },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },
  contacto: {
    telefono: { type: String, default: null },
    email: { type: String, default: null },
    sitioWeb: { type: String, default: null },
    facebook: { type: String, default: null },
    instagram: { type: String, default: null }
  },
  emprendedor: {
    type: Schema.Types.ObjectId,
    ref: 'Emprendedor',
    required: true
  },
  categorias: [{
    type: Schema.Types.ObjectId,
    ref: 'Categoria'
  }],
  estado: {
    type: String,
    enum: ['Activo', 'Inactivo', 'Suspendido'],
    default: 'Activo'
  }
}, {
  timestamps: true
})

export default model('Emprendimiento', emprendimientoSchema)

