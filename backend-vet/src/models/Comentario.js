
// models/Comentario.js
import { Schema, model } from 'mongoose';

const comentarioSchema = new Schema({
  // Autor (simple): id + tipo
  usuarioId:   { type: Schema.Types.ObjectId, required: true },
  usuarioTipo: { type: String, required: true, enum: ['Cliente', 'Emprendedor', 'Administrador'] },

  // Destino (simple): id + tipo
  destinoId:   { type: Schema.Types.ObjectId, required: true },
  destinoTipo: { type: String, required: true, enum: ['Producto', 'Emprendimiento'] },

  // Texto del comentario
  texto: { type: String, required: true, trim: true, minlength: 1, maxlength: 1000 }
}, { timestamps: true });

// Índice útil para listar por destino y ordenar por fecha
comentarioSchema.index({ destinoId: 1, destinoTipo: 1, createdAt: -1 });

export default model('Comentario', comentarioSchema);
