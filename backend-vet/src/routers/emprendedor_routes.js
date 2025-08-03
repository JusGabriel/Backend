import { Router } from "express"
import {
  registro,
  confirmarMail,
  recuperarPassword,
  cambiarPassword,
  login,
  perfil,
  verEmprendedores,
  actualizarEmprendedor,
  eliminarEmprendedor
} from "../controllers/emprendedor_controllers.js"
import { verificarTokenJWT } from '../middleware/JWT.js'

const router = Router()

// Registro y confirmación de cuenta
router.post("/registro", registro)
router.get("/confirmar/:token", confirmarMail)

// Recuperación de contraseña
router.post("/recuperarpassword", recuperarPassword)
router.post("/cambiarpassword/:token", cambiarPassword)

// Login
router.post('/login', login)

// Rutas protegidas con JWT
router.get('/perfil', verificarTokenJWT, perfil) // Obtener perfil autenticado
router.put('/actualizar/:id', verificarTokenJWT, actualizarEmprendedor) // Actualizar datos
router.delete('/eliminar/:id', verificarTokenJWT, eliminarEmprendedor) // Eliminar cuenta

// Ruta pública para ver todos los emprendedores (solo si es necesario)
router.get("/todos", verEmprendedores)

export default router
