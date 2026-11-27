import type { Prisma } from '../generated/prisma/client.js';
import prisma from '../config/prisma.js';

const incluirLocalidad = {
    localidades: {
        select: {
            id_localidad: true,
            nombre: true,
            codigo_postal: true,
            provincias: {
                select: {
                    id_provincia: true,
                    nombre: true,
                    paises: { select: { id_pais: true, nombre: true, codigo_iso2: true } }
                }
            }
        }
    }
};

class ProveedorModel {

    async crear(proveedor: Record<string, any>) {
        const { razon_social, cuit, telefono, email, id_localidad } = proveedor;
        return prisma.proveedores.create({
            data: {
                razon_social,
                cuit,
                telefono: telefono ?? null,
                email: email ?? null,
                id_localidad: id_localidad != null ? Number(id_localidad) : null
            }
        });
    }

    async obtenerTodos(filtros: Record<string, any> = {}) {
        const where: Prisma.proveedoresWhereInput = {};
        if (filtros.razon_social) where.razon_social = { contains: String(filtros.razon_social) };
        if (filtros.cuit) where.cuit = String(filtros.cuit);
        if (filtros.email) where.email = { contains: String(filtros.email) };
        if (filtros.id_localidad) where.id_localidad = Number(filtros.id_localidad);

        return prisma.proveedores.findMany({
            where,
            include: incluirLocalidad
        });
    }

    async obtenerEstadisticas() {
        const [proveedores, stocks] = await Promise.all([
            prisma.proveedores.findMany({
                select: { id_proveedor: true, razon_social: true, _count: { select: { productos: true } } },
                orderBy: { productos: { _count: 'desc' } }
            }),
            prisma.productos.groupBy({ by: ['id_proveedor'], _sum: { stock: true } })
        ]);

        const stockPorProveedor = new Map(stocks.map(s => [s.id_proveedor, s._sum.stock ?? 0]));
        return proveedores.map(p => ({
            id_proveedor: p.id_proveedor,
            razon_social: p.razon_social,
            productos: p._count.productos,
            stock_total: stockPorProveedor.get(p.id_proveedor) ?? 0
        }));
    }

    async obtenerPorId(id: number) {
        return prisma.proveedores.findUnique({
            where: { id_proveedor: id },
            include: incluirLocalidad
        });
    }

    async actualizar(id: number, proveedor: Record<string, any>) {
        const { razon_social, cuit, telefono, email, id_localidad } = proveedor;
        return prisma.proveedores.update({
            where: { id_proveedor: id },
            data: {
                razon_social,
                cuit,
                telefono: telefono ?? null,
                email: email ?? null,
                id_localidad: id_localidad != null ? Number(id_localidad) : null
            }
        });
    }

    async actualizarParcial(id: number, proveedor: Record<string, any>) {
        const permitidas = ['razon_social', 'cuit', 'telefono', 'email', 'id_localidad'];
        const data: Record<string, any> = {};

        for (const campo of permitidas) {
            if (proveedor[campo] !== undefined) {
                data[campo] = campo === 'id_localidad'
                    ? (proveedor[campo] === null ? null : Number(proveedor[campo]))
                    : proveedor[campo];
            }
        }

        if (Object.keys(data).length === 0) return null;
        return prisma.proveedores.update({ where: { id_proveedor: id }, data });
    }

    async eliminar(id: number) {
        return prisma.proveedores.delete({ where: { id_proveedor: id } });
    }
}

export default new ProveedorModel();