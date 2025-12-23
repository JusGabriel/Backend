// routes/cliente_rutas.js
import { Router } from "express"
import {
  registro,
  confirmarMail,
  recuperarPassword,
  comprobarTokenPasword,
  crearNuevoPassword,
  login,
  verClientes,
  actualizarCliente,
  eliminarCliente,
  perfil,
  actualizarPassword,
  actualizarPerfil,
  actualizarEstadoClienteById
} from "../controllers/cliente_controllers.js"
import { verificarTokenJWT } from '../middleware/JWT.js'

const router = Router()

// Registro y confirmación
router.post("/registro", registro)
router.get("/confirmar/:token", confirmarMail)

// Autenticación
router.post("/login", login)

// Recuperación de contraseña
router.post("/recuperar-password", recuperarPassword)
router.get("/comprobar-token/:token", comprobarTokenPasword)
router.post("/nuevo-password/:token", crearNuevoPassword)

// Gestión de clientes
router.get("/todos", verClientes)
router.put("/actualizar/:id", actualizarCliente)
router.delete("/eliminar/:id", eliminarCliente)

// Perfil protegido
router.get("/perfil", verificarTokenJWT, perfil)
router.put("/cliente/:id", verificarTokenJWT, actualizarPerfil)
router.put("/cliente/actualizarpassword/:id", verificarTokenJWT, actualizarPassword)

// *** NUEVO: Editar estado del cliente por ID (ruta que usa tu front) ***
router.put("/estado/:id", /* opcional: verificarTokenJWT, */ actualizarEstadoClienteById)

export default router
