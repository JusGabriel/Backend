import { Schema, model } from 'mongoose'

const quejaSugerenciaSchema = new Schema({
    mensaje: {
        type: String,
        required: true,
        trim: true
    },
    tipo: {
        type: String,
        enum: ['queja', 'sugerencia'],
        required: true
    },
    remitente: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: 'rol'  // referencia dinámica (Cliente o Emprendedor)
    },
    rol: {
        type: String,
        enum: ['Cliente', 'Emprendedor', 'Administrador'],
        required: true
    },
    fecha: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
})

export default model('QuejaSugerencia', quejaSugerenciaSchema)
