import type { Prisma } from '../generated/prisma/client.js';
import prisma from '../config/prisma.js';

class TerritorioModel {
    async obtenerPaises() {
        return prisma.paises.findMany({
            where: { activo: true },
            orderBy: { nombre: 'asc' }
        });
    }

    async obtenerProvincias(filtros: Record<string, any> = {}) {
        const where: Prisma.provinciasWhereInput = { activo: true };
        if (filtros.id_pais) where.id_pais = Number(filtros.id_pais);
        if (filtros.nombre) where.nombre = { contains: String(filtros.nombre) };

        return prisma.provincias.findMany({
            where,
            include: {
                paises: { select: { id_pais: true, nombre: true, codigo_iso2: true } }
            },
            orderBy: { nombre: 'asc' }
        });
    }

    async obtenerLocalidades(filtros: Record<string, any> = {}) {
        const where: Prisma.localidadesWhereInput = { activo: true };
        if (filtros.id_provincia) where.id_provincia = Number(filtros.id_provincia);
        if (filtros.id_pais) where.provincias = { id_pais: Number(filtros.id_pais) };
        if (filtros.nombre) where.nombre = { contains: String(filtros.nombre) };

        return prisma.localidades.findMany({
            where,
            include: {
                provincias: {
                    select: {
                        id_provincia: true,
                        nombre: true,
                        paises: { select: { id_pais: true, nombre: true, codigo_iso2: true } }
                    }
                }
            },
            orderBy: { nombre: 'asc' }
        });
    }

    async obtenerLocalidadPorId(id: number) {
        return prisma.localidades.findUnique({
            where: { id_localidad: id },
            include: {
                provincias: {
                    select: {
                        id_provincia: true,
                        nombre: true,
                        paises: { select: { id_pais: true, nombre: true, codigo_iso2: true } }
                    }
                },
                _count: {
                    select: { clientes: true, proveedores: true, empleados: true }
                }
            }
        });
    }

    async crearLocalidad(datos: Record<string, any>) {
        return prisma.localidades.create({
            data: {
                id_provincia: Number(datos.id_provincia),
                nombre: datos.nombre,
                codigo_postal: datos.codigo_postal ?? null
            }
        });
    }

    // Si la localidad tiene clientes/pedidos/proveedores asociados, MySQL lanza
    // error de FK (RESTRICT) y el errorHandler global responde 409 automáticamente.
    async eliminarLocalidad(id: number) {
        return prisma.localidades.delete({
            where: { id_localidad: id }
        });
    }
}

export default new TerritorioModel();