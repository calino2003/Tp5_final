import type { NextFunction, Request, Response } from 'express';
import informeModel from '../models/informe.model.js';

class InformeController {
    async generarInforme(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const [resumen, topClientes, stockBajo, empleados, porLocalidad] = await Promise.all([
                informeModel.resumenGeneral(),
                informeModel.topClientesPorFacturacion(),
                informeModel.productosStockBajo(),
                informeModel.rendimientoEmpleados(),
                informeModel.resumenPorLocalidad()
            ]);

            res.status(200).json({
                titulo: 'Informe General – Distribuidora IPAP',
                generado_en: new Date().toISOString(),
                resumen_general: resumen,
                top_5_clientes_por_facturacion: topClientes,
                productos_con_stock_bajo: stockBajo,
                rendimiento_empleados: empleados,
                resumen_por_localidad: porLocalidad
            });
        } catch (error) {
            next(error);
        }
    }

    async informePorLocalidad(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const datos = await informeModel.resumenPorLocalidad();
            res.status(200).json({
                titulo: 'Informe por Localidad – Distribuidora IPAP',
                generado_en: new Date().toISOString(),
                localidades: datos
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new InformeController();