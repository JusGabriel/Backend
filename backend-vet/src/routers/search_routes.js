// routes/search_routes.js
import { Router } from 'express';
import {
  unifiedSearch,
  suggest,
  searchProductosController,
  searchEmprendimientosController,
  searchEmprendedoresController
} from '../controllers/search_controller.js';

const router = Router();

// Búsqueda unificada (multi‑modelo)
router.get('/search', unifiedSearch);

// Autocompletado (prefijo)
router.get('/search/suggest', suggest);

// Endpoints por entidad (opcionales)
router.get('/productos/search',       searchProductosController);
router.get('/emprendimientos/search', searchEmprendimientosController);
router.get('/emprendedores/search',   searchEmprendedoresController);

export default router;
