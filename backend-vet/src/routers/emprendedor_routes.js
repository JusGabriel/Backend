
// routes/emprendedor_rutas.js
import { Router } from "express"
import {
  registro,
  confirmarMail,
  recuperarPassword,
  comprobarTokenPasword,
  crearNuevoPassword,
  login,
  perfil,
  actualizarPassword,
  actualizarPerfil,
  verEmprendedores,
  actualizarEmprendedor,
  eliminarEmprendedor,
  actualizarEstadoEmprendedorById
} from "../controllers/emprendedor_controllers.js"
import { verificarTokenJWT } from '../middleware/JWT.js'

const router = Router()

// Registro y confirmación de cuenta
router.post("/registro", registro)
router.get("/confirmar/:token", confirmarMail)

// Recuperación de contraseña
router.post("/recuperarpassword", recuperarPassword)
router.get("/recuperarpassword/:token", comprobarTokenPasword)
router.post("/nuevopassword/:token", crearNuevoPassword)

// Login
router.post('/login', login)

// Perfil autenticado y acciones protegidas
router.get('/perfil', verificarTokenJWT, perfil)
router.put('/emprendedore/:id', verificarTokenJWT, actualizarPerfil)                   // (tu ruta existente)
router.put('/emprendedore/actualizarpassword/:id', verificarTokenJWT, actualizarPassword)

// CRUD emprendedores
router.get("/todos", verEmprendedores)
router.put('/actualizar/:id', verificarTokenJWT, actualizarEmprendedor)
router.delete('/eliminar/:id', eliminarEmprendedor)

// *** NUEVO *** Editar estado del emprendedor por ID (usado por tu front) ***
router.put("/estado/:id", /* opcional: verificarTokenJWT, */ actualizarEstadoEmprendedorById)

export default router
