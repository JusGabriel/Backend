import { Schema, model } from 'mongoose'

const chatSchema = new Schema({
    emisor: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: 'emisorRol'
    },
    emisorRol: {
        type: String,
        enum: ['Cliente', 'Emprendedor', 'Administrador'],
        required: true
    },
    receptor: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: 'receptorRol'
    },
    receptorRol: {
        type: String,
        enum: ['Cliente', 'Emprendedor', 'Administrador'],
        required: true
    },
    mensaje: {
        type: String,
        required: true,
        trim: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
})

export default model('Chat', chatSchema)
