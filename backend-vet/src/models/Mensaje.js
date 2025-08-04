// models/Mensaje.js
import { Schema, model } from 'mongoose'

const mensajeSchema = new Schema({
  conversacion: {
    type: Schema.Types.ObjectId,
    ref: 'Conversacion',
    required: true
  },
  emisor: {
    type: Schema.Types.ObjectId,
    required: true,
    refPath: 'emisorRol'
  },
  emisorRol: {
    type: String,
    enum: ['Administrador', 'Emprendedor', 'Cliente'],
    required: true
  },
  contenido: {
    type: String,
    required: true,
    trim: true
  },
  leido: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

export default model('Mensaje', mensajeSchema)
