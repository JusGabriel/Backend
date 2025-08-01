import { Router } from "express"
import {
    registro,
    confirmarMail,
    recuperarPassword,
    comprobarTokenPasword,
    crearNuevoPassword,
    verAdministradores,
    actualizarAdministrador,
    eliminarAdministrador,
    login,
    perfil,
    actualizarPassword,
    actualizarPerfil
} from "../controllers/administrador_controllers.js";
import { verificarTokenJWT } from '../middleware/JWT.js'

const router = Router()

router.post("/registro", registro)  
router.get("/confirmar/:token", confirmarMail)
router.post('/recuperarpassword',recuperarPassword) 
router.get('/recuperarpassword/:token',comprobarTokenPasword)
router.post('/nuevopassword/:token',crearNuevoPassword) 
router.get("/todos", verAdministradores) 
router.put("/actualizar/:id", actualizarAdministrador);
router.delete("/eliminar/:id", eliminarAdministrador);
router.post('/login',login)
router.get('/perfil',verificarTokenJWT,perfil)
router.put('/admin/:id',verificarTokenJWT,actualizarPerfil)
router.put('/admin/actualizarpassword/:id',verificarTokenJWT,actualizarPassword)

export default router