import express from "express";
import {
  crearProducto,
  obtenerProductosPorEmprendedor,
  obtenerProducto,
  actualizarProducto,
  eliminarProducto,
  obtenerTodosLosProductos
} from "../controllers/productoController.js";

import verificarAutenticacionEmprendedor from "../middlewares/autenticacionEmprendedor.js";

const router = express.Router();

// Crear producto
router.post("/", verificarAutenticacionEmprendedor, crearProducto);

// Productos de un emprendedor específico
router.get("/emprendedor/:emprendedorId", obtenerProductosPorEmprendedor);

// Obtener 1 producto
router.get("/:id", obtenerProducto);

// Actualizar producto
router.put("/:id", verificarAutenticacionEmprendedor, actualizarProducto);

// Eliminar producto
router.delete("/:id", verificarAutenticacionEmprendedor, eliminarProducto);

// Obtener todos los productos (público)
router.get("/", obtenerTodosLosProductos);

export default router;
