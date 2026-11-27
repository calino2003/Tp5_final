import type { Prisma } from '../generated/prisma/client.js';
import prisma from '../config/prisma.js';

class CompaniaModel {

    async crear(compania: Record<string, any>) {
        const { nombre, telefono } = compania;
        return prisma.companias_envio.create({ data: { nombre, telefono: telefono ?? null } });
    }

    async obtenerTodos(filtros: Record<string, any> = {}) {
        const where: Prisma.companias_envioWhereInput = {};
        if (filtros.nombre) where.nombre = { contains: String(filtros.nombre) };
        if (filtros.telefono) where.telefono = String(filtros.telefono);
        return prisma.companias_envio.findMany({ where });
    }

    // Cuántos pedidos envió cada compañía, ordenado de mayor a menor
    async obtenerEstadisticas() {
        const companias = await prisma.companias_envio.findMany({
            select: { id_compania: true, nombre: true, _count: { select: { pedidos: true } } },
            orderBy: { pedidos: { _count: 'desc' } }
        });
        return companias.map(c => ({ id_compania: c.id_compania, nombre: c.nombre, pedidos: c._count.pedidos }));
    }

    async obtenerPorId(id: number) {
        return prisma.companias_envio.findUnique({ where: { id_compania: id } });
    }

    async actualizar(id: number, compania: Record<string, any>) {
        const { nombre, telefono } = compania;
        return prisma.companias_envio.update({
            where: { id_compania: id },
            data: { nombre, telefono: telefono ?? null }
        });
    }

    async actualizarParcial(id: number, compania: Record<string, any>) {
        const permitidas = ['nombre', 'telefono'];
        const data = Object.fromEntries(Object.entries(compania).filter(([campo]) => permitidas.includes(campo)));
        if (Object.keys(data).length === 0) return null;
        return prisma.companias_envio.update({ where: { id_compania: id }, data });
    }

    async eliminar(id: number) {
        return prisma.companias_envio.delete({ where: { id_compania: id } });
    }

    // ============================================================
    //  Cobertura M:N (compania_envio_localidad)
    // ============================================================

    // Devuelve la compañía y todas las localidades a las que llega con costo y demora
    async obtenerLocalidades(idCompania: number) {
        const compania = await prisma.companias_envio.findUnique({
            where: { id_compania: idCompania },
            include: {
                compania_envio_localidad: {
                    include: {
                        localidades: {
                            include: {
                                provincias: {
                                    include: { paises: { select: { nombre: true, codigo_iso2: true } } }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!compania) return null;

        return {
            id_compania: compania.id_compania,
            compania: compania.nombre,
            cobertura: compania.compania_envio_localidad.map(item => ({
                id_localidad: item.id_localidad,
                localidad: item.localidades.nombre,
                provincia: item.localidades.provincias.nombre,
                pais: item.localidades.provincias.paises.nombre,
                costo_envio: item.costo_envio !== null ? Number(item.costo_envio) : null,
                dias_entrega: item.dias_entrega
            }))
        };
    }

    // Asocia una localidad a la cobertura de la compañía
    async agregarLocalidad(
        idCompania: number,
        datos: { id_localidad: number; costo_envio?: number | null; dias_entrega?: number | null }
    ) {
        return prisma.compania_envio_localidad.create({
            data: {
                id_compania: idCompania,
                id_localidad: datos.id_localidad,
                costo_envio: datos.costo_envio ?? null,
                dias_entrega: datos.dias_entrega ?? null
            }
        });
    }

    // Quita una localidad de la cobertura de la compañía usando la clave compuesta
    async quitarLocalidad(idCompania: number, idLocalidad: number) {
        return prisma.compania_envio_localidad.delete({
            where: {
                id_compania_id_localidad: {
                    id_compania: idCompania,
                    id_localidad: idLocalidad
                }
            }
        });
    }
}

export default new CompaniaModel();