import jwt from "jsonwebtoken"
import Administrador from "../models/Administrador.js"

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
            req.adminBDD = await Administrador.findById(id).lean().select("-password")
            
            if (!req.adminBDD) {
                return res.status(404).json({ msg: "Administrador no encontrado" })
            }
            
            return next()
        } else {
            return res.status(403).json({ msg: "Acceso denegado: rol no autorizado" })
        }
    } catch (error) {
        return res.status(401).json({ msg: "Token inválido o expirado" })
    }
}


export { 
    crearTokenJWT,
    verificarTokenJWT 
}
