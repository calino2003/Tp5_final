import { Router } from 'express';
import informeController from '../controllers/informe.controller.js';

// Rutas del informe - consigna 3.4 + informe territorial por localidad
const router = Router();

router.get('/', informeController.generarInforme);
router.get('/localidades', informeController.informePorLocalidad);

export default router;