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
  eliminarCliente
} from "../controllers/cliente_controllers.js"

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

export default router
