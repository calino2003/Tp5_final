import type { NextFunction, Request, Response } from 'express';
import territorioModel from '../models/territorio.model.js';
import { leerId, ID_INVALIDO } from '../utils/params.js';

class TerritorioController {
    async obtenerPaises(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const paises = await territorioModel.obtenerPaises();
            res.status(200).json(paises);
        } catch (error) {
            next(error);
        }
    }

    async obtenerProvincias(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const provincias = await territorioModel.obtenerProvincias(req.query);
            res.status(200).json(provincias);
        } catch (error) {
            next(error);
        }
    }

    async obtenerLocalidades(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const localidades = await territorioModel.obtenerLocalidades(req.query);
            res.status(200).json(localidades);
        } catch (error) {
            next(error);
        }
    }

    async obtenerLocalidadPorId(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = leerId(req.params.id);
            if (id === null) {
                res.status(400).json(ID_INVALIDO);
                return;
            }
            const localidad = await territorioModel.obtenerLocalidadPorId(id);
            if (!localidad) {
                res.status(404).json({ error: 'Localidad no encontrada.' });
                return;
            }
            res.status(200).json(localidad);
        } catch (error) {
            next(error);
        }
    }

    async crearLocalidad(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const nueva = await territorioModel.crearLocalidad(req.body);
            res.status(201).json({
                mensaje: 'Localidad creada exitosamente',
                id_localidad: nueva.id_localidad
            });
        } catch (error) {
            next(error);
        }
    }

    async eliminarLocalidad(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = leerId(req.params.id);
            if (id === null) {
                res.status(400).json(ID_INVALIDO);
                return;
            }
            await territorioModel.eliminarLocalidad(id);
            res.status(200).json({ mensaje: 'Localidad eliminada exitosamente' });
        } catch (error) {
            next(error);
        }
    }
}

export default new TerritorioController();