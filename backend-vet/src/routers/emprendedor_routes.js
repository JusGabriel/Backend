import { Router } from "express"
import {
  registro,
  confirmarMail,
  recuperarPassword,
  cambiarPassword,
  verEmprendedores,
  actualizarEmprendedor,
  eliminarEmprendedor
} from "../controllers/emprendedor_controllers.js"

const router = Router()

// Crear emprendedor
router.post("/registro", registro)

// Confirmar cuenta con token
router.get("/confirmar/:token", confirmarMail)

// Recuperar contraseña (envía token por email)
router.post("/recuperarpassword", recuperarPassword)

// Cambiar contraseña usando el token
router.post("/cambiarpassword/:token", cambiarPassword)

// Ver todos los emprendedores
router.get("/todos", verEmprendedores)

// Actualizar emprendedor por ID
router.put("/actualizar/:id", actualizarEmprendedor)

// Eliminar emprendedor por ID
router.delete("/eliminar/:id", eliminarEmprendedor)

export default router
