import type { Prisma } from '../generated/prisma/client.js';
import prisma from '../config/prisma.js';
import detallePedidoModel from './detalles_pedido.model.js';

const ESTADOS_ENUM = ['pendiente', 'enviado', 'entregado', 'cancelado'] as const;
type EstadoEnum = (typeof ESTADOS_ENUM)[number];

// Arma un texto legible para congelar la dirección de envío si no la mandaron a mano
function armarDireccionTexto(cliente: {
    calle: string | null;
    numero: string | null;
    piso: string | null;
    departamento: string | null;
    direccion: string | null;
    localidades?: { nombre: string } | null;
} | null): string | null {
    if (!cliente) return null;
    if (cliente.calle) {
        const calleYNum = [cliente.calle, cliente.numero].filter(Boolean).join(' ');
        const extras = [
            cliente.piso ? `Piso ${cliente.piso}` : null,
            cliente.departamento ? `Depto ${cliente.departamento}` : null,
            cliente.localidades?.nombre ?? null
        ];
        return [calleYNum, ...extras].filter(Boolean).join(', ');
    }
    return cliente.direccion ?? null;
}

// Mantiene sincronizado el ENUM legado (estado) con el catálogo nuevo (id_estado)
async function resolverEstado(estadoInput?: string, idEstadoInput?: number | null): Promise<{
    estado: EstadoEnum;
    id_estado: number | null;
}> {
    if (idEstadoInput != null) {
        const fila = await prisma.estados_pedido.findUnique({
            where: { id_estado: Number(idEstadoInput) }
        });
        const codigo = fila?.codigo;
        const estadoLegado: EstadoEnum =
            codigo && (ESTADOS_ENUM as readonly string[]).includes(codigo)
                ? (codigo as EstadoEnum)
                : 'pendiente';
        return { estado: estadoLegado, id_estado: Number(idEstadoInput) };
    }

    const estadoFinal: EstadoEnum =
        estadoInput && (ESTADOS_ENUM as readonly string[]).includes(estadoInput)
            ? (estadoInput as EstadoEnum)
            : 'pendiente';

    const fila = await prisma.estados_pedido.findUnique({
        where: { codigo: estadoFinal }
    });

    return { estado: estadoFinal, id_estado: fila?.id_estado ?? null };
}

class PedidoModel {

    async crear(pedido: Record<string, any>) {
        const {
            estado,
            id_estado,
            id_cliente,
            id_empleado,
            id_compania,
            moneda,
            tipo_cambio,
            id_localidad_envio,
            direccion_envio
        } = pedido;

        const estadoResuelto = await resolverEstado(estado, id_estado);

        // Patrón de instantánea: si no se indicó localidad o dirección de entrega,
        // copiamos y congelamos la dirección actual del cliente al momento de la venta.
        let localidadFinal: number | null =
            id_localidad_envio !== undefined ? (id_localidad_envio === null ? null : Number(id_localidad_envio)) : null;
        let direccionFinal: string | null =
            direccion_envio !== undefined ? (direccion_envio ?? null) : null;

        if (id_localidad_envio === undefined || direccion_envio === undefined) {
            const cliente = await prisma.clientes.findUnique({
                where: { id_cliente: Number(id_cliente) },
                include: { localidades: { select: { nombre: true } } }
            });
            if (id_localidad_envio === undefined) {
                localidadFinal = cliente?.id_localidad ?? null;
            }
            if (direccion_envio === undefined) {
                direccionFinal = armarDireccionTexto(cliente);
            }
        }

        return prisma.pedidos.create({
            data: {
                estado: estadoResuelto.estado,
                id_estado: estadoResuelto.id_estado,
                id_cliente: Number(id_cliente),
                id_empleado: Number(id_empleado),
                id_compania: id_compania != null ? Number(id_compania) : null,
                moneda: moneda ? String(moneda).toUpperCase() : 'ARS',
                tipo_cambio: tipo_cambio != null ? Number(tipo_cambio) : null,
                id_localidad_envio: localidadFinal,
                direccion_envio: direccionFinal
            }
        });
    }

    // GET con filtros: ?cliente=...&empleado=...&estado=...&desde=...&hasta=...&id_localidad=...
    async obtenerTodos(filtros: Record<string, any> = {}) {
        const where: Prisma.pedidosWhereInput = {};
        if (filtros.cliente) where.clientes = { nombre: { contains: String(filtros.cliente) } };
        if (filtros.empleado) where.empleados = { nombre: { contains: String(filtros.empleado) } };
        if (filtros.estado) where.estado = String(filtros.estado) as Prisma.pedidosWhereInput['estado'];
        if (filtros.id_localidad) where.id_localidad_envio = Number(filtros.id_localidad);

        const fecha: Prisma.DateTimeNullableFilter = {};
        if (filtros.desde) fecha.gte = new Date(String(filtros.desde));
        if (filtros.hasta) fecha.lt = new Date(String(filtros.hasta));
        if (Object.keys(fecha).length > 0) where.fecha = fecha;

        const pedidos = await prisma.pedidos.findMany({
            where,
            include: {
                clientes: { select: { nombre: true, apellido: true } },
                empleados: { select: { nombre: true, apellido: true } },
                companias_envio: { select: { nombre: true } },
                estados_pedido: { select: { id_estado: true, codigo: true } },
                localidades: {
                    select: {
                        id_localidad: true,
                        nombre: true,
                        provincias: { select: { nombre: true } }
                    }
                }
            }
        });

        return pedidos.map(p => ({
            id_pedido: p.id_pedido,
            fecha: p.fecha,
            total: p.total,
            moneda: p.moneda,
            tipo_cambio: p.tipo_cambio,
            estado: p.estados_pedido?.codigo ?? p.estado,
            id_estado: p.id_estado,
            id_localidad_envio: p.id_localidad_envio,
            localidad_envio: p.localidades?.nombre ?? null,
            provincia_envio: p.localidades?.provincias?.nombre ?? null,
            direccion_envio: p.direccion_envio,
            cliente_nombre: p.clientes?.nombre ?? null,
            cliente_apellido: p.clientes?.apellido ?? null,
            empleado_nombre: p.empleados?.nombre ?? null,
            empleado_apellido: p.empleados?.apellido ?? null,
            compania_nombre: p.companias_envio?.nombre ?? null
        }));
    }

    async obtenerEstadisticas() {
        const r = await prisma.pedidos.aggregate({
            _count: true,
            _sum: { total: true },
            _avg: { total: true },
            _max: { total: true },
            _min: { total: true }
        });
        return {
            cantidad: r._count,
            total: r._sum.total,
            promedio: r._avg.total,
            maximo: r._max.total,
            minimo: r._min.total
        };
    }

    async obtenerTotalesPorCliente() {
        const [clientes, totales] = await Promise.all([
            prisma.clientes.findMany({
                select: { id_cliente: true, nombre: true, apellido: true, _count: { select: { pedidos: true } } }
            }),
            prisma.pedidos.groupBy({ by: ['id_cliente'], _sum: { total: true } })
        ]);

        const gastadoPorCliente = new Map(totales.map(t => [t.id_cliente, Number(t._sum.total ?? 0)]));
        return clientes
            .map(c => ({
                id_cliente: c.id_cliente,
                nombre: c.nombre,
                apellido: c.apellido,
                pedidos: c._count.pedidos,
                total_gastado: gastadoPorCliente.get(c.id_cliente) ?? 0
            }))
            .sort((a, b) => b.total_gastado - a.total_gastado);
    }

    async obtenerPorId(id: number) {
        const p = await prisma.pedidos.findUnique({
            where: { id_pedido: id },
            include: {
                clientes: { select: { nombre: true } },
                empleados: { select: { nombre: true } },
                companias_envio: { select: { nombre: true } },
                estados_pedido: { select: { id_estado: true, codigo: true } },
                localidades: {
                    select: {
                        id_localidad: true,
                        nombre: true,
                        provincias: { select: { nombre: true } }
                    }
                }
            }
        });
        if (!p) return null;

        const { clientes, empleados, companias_envio, estados_pedido, localidades, ...pedido } = p;
        return {
            ...pedido,
            estado: estados_pedido?.codigo ?? pedido.estado,
            cliente: clientes?.nombre ?? null,
            empleado: empleados?.nombre ?? null,
            compania: companias_envio?.nombre ?? null,
            localidad_envio: localidades?.nombre ?? null,
            provincia_envio: localidades?.provincias?.nombre ?? null
        };
    }

    async actualizar(id: number, pedido: Record<string, any>) {
        const {
            estado,
            id_estado,
            id_cliente,
            id_empleado,
            id_compania,
            moneda,
            tipo_cambio,
            id_localidad_envio,
            direccion_envio
        } = pedido;

        const estadoResuelto = await resolverEstado(estado, id_estado);

        return prisma.$transaction(async (tx) => {
            const actualizado = await tx.pedidos.update({
                where: { id_pedido: id },
                data: {
                    estado: estadoResuelto.estado,
                    id_estado: estadoResuelto.id_estado,
                    id_cliente: Number(id_cliente),
                    id_empleado: Number(id_empleado),
                    id_compania: id_compania != null ? Number(id_compania) : null,
                    moneda: moneda ? String(moneda).toUpperCase() : 'ARS',
                    tipo_cambio: tipo_cambio != null ? Number(tipo_cambio) : null,
                    id_localidad_envio: id_localidad_envio != null ? Number(id_localidad_envio) : null,
                    direccion_envio: direccion_envio ?? null
                }
            });
            await detallePedidoModel.recalcularTotalPedido(tx, id);
            return actualizado;
        });
    }

    async actualizarParcial(id: number, pedido: Record<string, any>) {
        const data: Record<string, any> = {};

        if (pedido.estado !== undefined || pedido.id_estado !== undefined) {
            const estadoResuelto = await resolverEstado(pedido.estado, pedido.id_estado);
            data.estado = estadoResuelto.estado;
            data.id_estado = estadoResuelto.id_estado;
        }
        if (pedido.id_cliente !== undefined) data.id_cliente = Number(pedido.id_cliente);
        if (pedido.id_empleado !== undefined) data.id_empleado = Number(pedido.id_empleado);
        if (pedido.id_compania !== undefined) {
            data.id_compania = pedido.id_compania === null ? null : Number(pedido.id_compania);
        }
        if (pedido.moneda !== undefined) data.moneda = String(pedido.moneda).toUpperCase();
        if (pedido.tipo_cambio !== undefined) {
            data.tipo_cambio = pedido.tipo_cambio === null ? null : Number(pedido.tipo_cambio);
        }
        if (pedido.id_localidad_envio !== undefined) {
            data.id_localidad_envio =
                pedido.id_localidad_envio === null ? null : Number(pedido.id_localidad_envio);
        }
        if (pedido.direccion_envio !== undefined) data.direccion_envio = pedido.direccion_envio;

        if (Object.keys(data).length === 0) return null;

        return prisma.$transaction(async (tx) => {
            const actualizado = await tx.pedidos.update({ where: { id_pedido: id }, data });
            await detallePedidoModel.recalcularTotalPedido(tx, id);
            return actualizado;
        });
    }

    async eliminar(id: number) {
        return prisma.pedidos.delete({ where: { id_pedido: id } });
    }
}

export default new PedidoModel();