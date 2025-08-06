import jwt from "jsonwebtoken"
import Administrador from "../models/Administrador.js"
import Emprendedor from "../models/Emprendedor.js"
import Cliente from "../models/Cliente.js"

const crearTokenJWT = (id, rol) => {
    return jwt.sign({ id, rol }, process.env.JWT_SECRET, { expiresIn: "1d" })
}

const verificarTokenJWT = async (req, res, next) => {
    const { authorization } = req.headers

    if (!authorization) {
        return res.status(401).json({ msg: "Acceso denegado: token no proporcionado o inválido" })
    }

    try {
        const token = authorization.split(" ")[1]
        const { id, rol } = jwt.verify(token, process.env.JWT_SECRET)

        if (rol === "Administrador") {
            // Aquí quitamos .lean() para obtener documento completo con _id ObjectId
            req.adminBDD = await Administrador.findById(id).select("-password")
            if (!req.adminBDD) {
                return res.status(404).json({ msg: "Administrador no encontrado" })
            }
        } else if (rol === "Emprendedor") {
            req.emprendedorBDD = await Emprendedor.findById(id).select("-password")
            if (!req.emprendedorBDD) {
                return res.status(404).json({ msg: "Emprendedor no encontrado" })
            }
        } else if (rol === "Cliente") {
            req.clienteBDD = await Cliente.findById(id).select("-password")
            if (!req.clienteBDD) {
                return res.status(404).json({ msg: "Cliente no encontrado" })
            }
        } else {
            return res.status(403).json({ msg: "Rol no autorizado" })
        }

        next()
    } catch (error) {
        return res.status(401).json({ msg: "Token inválido o expirado" })
    }
}

export {
    crearTokenJWT,
    verificarTokenJWT
}
