// models/Conversacion.js
import { Schema, model } from 'mongoose'

const conversacionSchema = new Schema({
  participantes: [
    {
      id: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: 'participantes.rol'
      },
      rol: {
        type: String,
        required: true,
        enum: ['Administrador', 'Emprendedor', 'Cliente']
      }
    }
  ],
  ultimaActualizacion: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

export default model('Conversacion', conversacionSchema)
