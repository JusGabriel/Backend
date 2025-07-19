import { Schema, model } from 'mongoose'

const notificacionSchema = new Schema({
    mensaje: {
        type: String,
        required: true,
        trim: true
    },
    usuario: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: 'rol'  // Cliente o Emprendedor
    },
    rol: {
        type: String,
        enum: ['Cliente', 'Emprendedor', 'Administrador'],
        required: true
    },
    leido: {
        type: Boolean,
        default: false
    },
    fecha: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
})

export default model('Notificacion', notificacionSchema)
