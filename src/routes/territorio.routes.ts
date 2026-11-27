import { Router } from 'express';
import territorioController from '../controllers/territorio.controller.js';
import { validar } from '../middlewares/validar.middleware.js';
import { crearLocalidad, filtrosLocalidades, filtrosProvincias } from '../validators/territorio.validators.js';

const router = Router();

router.get('/paises', territorioController.obtenerPaises);
router.get('/provincias', ...validar(filtrosProvincias, 'query'), territorioController.obtenerProvincias);
router.get('/localidades', ...validar(filtrosLocalidades, 'query'), territorioController.obtenerLocalidades);
router.get('/localidades/:id', territorioController.obtenerLocalidadPorId);
router.post('/localidades', ...validar(crearLocalidad), territorioController.crearLocalidad);
router.delete('/localidades/:id', territorioController.eliminarLocalidad);

export default router;