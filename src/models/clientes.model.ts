import type { Prisma } from '../generated/prisma/client.js';
import prisma from '../config/prisma.js';

// Datos relacionados que devolvemos al consultar clientes
const incluirRelaciones = {
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
    },
    tipos_documento: {
        select: { id_tipo_documento: true, codigo: true, nombre: true }
    }
};

class ClienteModel {

    async crear(cliente: Record<string, any>) {
        const {
            nombre, apellido, dni,
            id_tipo_documento, numero_documento, id_pais_emisor,
            id_localidad, calle, numero, piso, departamento, codigo_postal,
            direccion_referencia, direccion, telefono
        } = cliente;

        return prisma.clientes.create({
            data: {
                nombre,
                apellido,
                dni,
                id_tipo_documento: id_tipo_documento != null ? Number(id_tipo_documento) : null,
                numero_documento: numero_documento ?? null,
                id_pais_emisor: id_pais_emisor != null ? Number(id_pais_emisor) : null,
                id_localidad: id_localidad != null ? Number(id_localidad) : null,
                calle: calle ?? null,
                numero: numero ?? null,
                piso: piso ?? null,
                departamento: departamento ?? null,
                codigo_postal: codigo_postal ?? null,
                direccion_referencia: direccion_referencia ?? null,
                direccion: direccion ?? null,
                telefono: telefono ?? null
            }
        });
    }

    // Acepta filtros opcionales por query string: ?dni=...&nombre=...&apellido=...&id_localidad=...
    async obtenerTodos(filtros: Record<string, any> = {}) {
        const where: Prisma.clientesWhereInput = {};
        if (filtros.dni) where.dni = String(filtros.dni);
        if (filtros.numero_documento) where.numero_documento = String(filtros.numero_documento);
        if (filtros.nombre) where.nombre = { contains: String(filtros.nombre) };
        if (filtros.apellido) where.apellido = { contains: String(filtros.apellido) };
        if (filtros.id_localidad) where.id_localidad = Number(filtros.id_localidad);

        return prisma.clientes.findMany({
            where,
            include: incluirRelaciones
        });
    }

    // Devuelve cuántos clientes hay y cuántos tienen teléfono cargado
    async obtenerEstadisticas() {
        const [cantidad, conTelefono] = await Promise.all([
            prisma.clientes.count(),
            prisma.clientes.count({ where: { telefono: { not: null } } })
        ]);
        return { cantidad, con_telefono: conTelefono };
    }

    async obtenerPorId(id: number) {
        return prisma.clientes.findUnique({
            where: { id_cliente: id },
            include: incluirRelaciones
        });
    }

    async actualizar(id: number, cliente: Record<string, any>) {
        const {
            nombre, apellido, dni,
            id_tipo_documento, numero_documento, id_pais_emisor,
            id_localidad, calle, numero, piso, departamento, codigo_postal,
            direccion_referencia, direccion, telefono
        } = cliente;

        return prisma.clientes.update({
            where: { id_cliente: id },
            data: {
                nombre,
                apellido,
                dni,
                id_tipo_documento: id_tipo_documento != null ? Number(id_tipo_documento) : null,
                numero_documento: numero_documento ?? null,
                id_pais_emisor: id_pais_emisor != null ? Number(id_pais_emisor) : null,
                id_localidad: id_localidad != null ? Number(id_localidad) : null,
                calle: calle ?? null,
                numero: numero ?? null,
                piso: piso ?? null,
                departamento: departamento ?? null,
                codigo_postal: codigo_postal ?? null,
                direccion_referencia: direccion_referencia ?? null,
                direccion: direccion ?? null,
                telefono: telefono ?? null
            }
        });
    }

    // PATCH: solo actualiza los campos que llegaron, no todos
    async actualizarParcial(id: number, cliente: Record<string, any>) {
        const permitidas = [
            'nombre', 'apellido', 'dni',
            'id_tipo_documento', 'numero_documento', 'id_pais_emisor',
            'id_localidad', 'calle', 'numero', 'piso', 'departamento',
            'codigo_postal', 'direccion_referencia', 'direccion', 'telefono'
        ];
        const camposEnteros = ['id_tipo_documento', 'id_pais_emisor', 'id_localidad'];
        const data: Record<string, any> = {};

        for (const campo of permitidas) {
            if (cliente[campo] !== undefined) {
                if (camposEnteros.includes(campo)) {
                    data[campo] = cliente[campo] === null ? null : Number(cliente[campo]);
                } else {
                    data[campo] = cliente[campo];
                }
            }
        }

        if (Object.keys(data).length === 0) return null;

        return prisma.clientes.update({ where: { id_cliente: id }, data });
    }

    async eliminar(id: number) {
        return prisma.clientes.delete({ where: { id_cliente: id } });
    }
}

export default new ClienteModel();