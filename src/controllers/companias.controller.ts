import type { NextFunction, Request, Response } from 'express';
import companiaModel from '../models/companias.model.js';
import { leerId, ID_INVALIDO } from '../utils/params.js';

class CompaniaController {
    async crear(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const resultado = await companiaModel.crear(req.body);
            res.status(201).json({ mensaje: "Compañía de envío creada exitosamente", id_compania: resultado.id_compania });
        } catch (error) {
            next(error);
        }
    }

    async obtenerTodos(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companias = await companiaModel.obtenerTodos(req.query);
            res.status(200).json(companias);
        } catch (error) {
            next(error);
        }
    }

    async obtenerPorId(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = leerId(req.params.id);
            if (id === null) {
                res.status(400).json(ID_INVALIDO);
                return;
            }
            const compania = await companiaModel.obtenerPorId(id);
            if (!compania) {
                res.status(404).json({ error: "Compañía de envío no encontrada." });
                return;
            }
            res.status(200).json(compania);
        } catch (error) {
            next(error);
        }
    }

    async actualizar(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = leerId(req.params.id);
            if (id === null) {
                res.status(400).json(ID_INVALIDO);
                return;
            }
            await companiaModel.actualizar(id, req.body);
            res.status(200).json({ mensaje: "Compañía de envío actualizada exitosamente" });
        } catch (error) {
            next(error);
        }
    }

    async eliminar(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = leerId(req.params.id);
            if (id === null) {
                res.status(400).json(ID_INVALIDO);
                return;
            }
            await companiaModel.eliminar(id);
            res.status(200).json({ mensaje: "Compañía de envío eliminada exitosamente" });
        } catch (error) {
            next(error);
        }
    }

    async actualizarParcial(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = leerId(req.params.id);
            if (id === null) {
                res.status(400).json(ID_INVALIDO);
                return;
            }
            const resultado = await companiaModel.actualizarParcial(id, req.body);
            if (!resultado) {
                res.status(400).json({ error: "Debe enviar al menos un campo válido a modificar." });
                return;
            }
            res.status(200).json({ mensaje: "Compañía de envío actualizada parcialmente" });
        } catch (error) {
            next(error);
        }
    }

    async estadisticas(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const estadisticas = await companiaModel.obtenerEstadisticas();
            res.status(200).json(estadisticas);
        } catch (error) {
            next(error);
        }
    }

    // GET /api/companias/:id/localidades
    async obtenerLocalidades(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = leerId(req.params.id);
            if (id === null) {
                res.status(400).json(ID_INVALIDO);
                return;
            }
            const resultado = await companiaModel.obtenerLocalidades(id);
            if (!resultado) {
                res.status(404).json({ error: "Compañía de envío no encontrada." });
                return;
            }
            res.status(200).json(resultado);
        } catch (error) {
            next(error);
        }
    }

    // POST /api/companias/:id/localidades
    async agregarLocalidad(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const idCompania = leerId(req.params.id);
            if (idCompania === null) {
                res.status(400).json(ID_INVALIDO);
                return;
            }

            const idLocalidad = Number(req.body.id_localidad);
            if (!Number.isInteger(idLocalidad) || idLocalidad < 1) {
                res.status(400).json({ error: "El campo 'id_localidad' es obligatorio y debe ser un entero positivo." });
                return;
            }

            const costoEnvio = req.body.costo_envio !== undefined && req.body.costo_envio !== null
                ? Number(req.body.costo_envio)
                : null;
            if (costoEnvio !== null && (Number.isNaN(costoEnvio) || costoEnvio < 0)) {
                res.status(400).json({ error: "El campo 'costo_envio' debe ser un número mayor o igual a 0." });
                return;
            }

            const diasEntrega = req.body.dias_entrega !== undefined && req.body.dias_entrega !== null
                ? Number(req.body.dias_entrega)
                : null;
            if (diasEntrega !== null && (!Number.isInteger(diasEntrega) || diasEntrega < 0)) {
                res.status(400).json({ error: "El campo 'dias_entrega' debe ser un número entero mayor o igual a 0." });
                return;
            }

            await companiaModel.agregarLocalidad(idCompania, {
                id_localidad: idLocalidad,
                costo_envio: costoEnvio,
                dias_entrega: diasEntrega
            });

            res.status(201).json({ mensaje: "Cobertura agregada exitosamente" });
        } catch (error) {
            next(error);
        }
    }

    // DELETE /api/companias/:id/localidades/:idLocalidad
    async quitarLocalidad(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const idCompania = leerId(req.params.id);
            const idLocalidad = leerId(req.params.idLocalidad);
            if (idCompania === null || idLocalidad === null) {
                res.status(400).json(ID_INVALIDO);
                return;
            }
            await companiaModel.quitarLocalidad(idCompania, idLocalidad);
            res.status(200).json({ mensaje: "Cobertura eliminada exitosamente" });
        } catch (error) {
            next(error);
        }
    }
}

export default new CompaniaController();