// routes/cliente_rutas.js
import { Router } from 'express'
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
} from '../controllers/cliente_controllers.js'
import { verificarTokenJWT } from '../middleware/JWT.js'

const router = Router()

// Registro y confirmación
router.post('/registro', registro)
router.get('/confirmar/:token', confirmarMail)

// Autenticación
router.post('/login', login)

// Recuperación de contraseña
router.post('/recuperar-password', recuperarPassword)
router.get('/comprobar-token/:token', comprobarTokenPasword)
router.post('/nuevo-password/:token', crearNuevoPassword)

// Gestión de clientes
router.get('/todos', verClientes)
router.put('/actualizar/:id', actualizarCliente) // fallback que tu front intenta si /estado falla
router.delete('/eliminar/:id', eliminarCliente)

// Perfil protegido
router.get('/perfil', verificarTokenJWT, perfil)
router.put('/cliente/:id', verificarTokenJWT, actualizarPerfil)
router.put('/cliente/actualizarpassword/:id', verificarTokenJWT, actualizarPassword)

// *** Ruta EXACTA que consume tu frontend para cambiar estado ***
router.put('/estado/:id', /* opcional: verificarTokenJWT, */ actualizarEstadoClienteById)

export default router
