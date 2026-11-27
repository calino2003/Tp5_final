import type { Prisma } from '../generated/prisma/client.js';
import prisma from '../config/prisma.js';

// Convierte un texto "AAAA-MM-DD" en un objeto Date válido para Prisma/MySQL
function aFecha(valor: unknown): Date | null {
    if (valor === null || valor === undefined || valor === '') return null;
    const texto = String(valor);
    return new Date(texto.length === 10 ? `${texto}T00:00:00.000Z` : texto);
}

// Calcula años transcurridos al vuelo (edad o antigüedad) sin guardarlos en la BD
function calcularAnios(fecha: Date | null): number | null {
    if (!fecha) return null;
    const hoy = new Date();
    let anios = hoy.getFullYear() - fecha.getUTCFullYear();
    const mes = hoy.getMonth() - fecha.getUTCMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < fecha.getUTCDate())) {
        anios--;
    }
    return anios >= 0 ? anios : 0;
}

class EmpleadoModel {
    // Agrega los campos calculados (edad y antigüedad) a cada empleado que devuelve la API
    private formatearEmpleado<T extends { fecha_nacimiento: Date | null; fecha_ingreso: Date | null }>(emp: T) {
        return {
            ...emp,
            edad: calcularAnios(emp.fecha_nacimiento),
            anios_antiguedad: calcularAnios(emp.fecha_ingreso)
        };
    }

    async crear(empleado: Record<string, any>) {
        const { nombre, apellido, cargo, fecha_nacimiento, fecha_ingreso, fecha_salida, id_localidad } = empleado;
        return prisma.empleados.create({
            data: {
                nombre,
                apellido,
                cargo: cargo ?? null,
                fecha_nacimiento: aFecha(fecha_nacimiento),
                fecha_ingreso: aFecha(fecha_ingreso),
                fecha_salida: aFecha(fecha_salida),
                id_localidad: id_localidad != null ? Number(id_localidad) : null
            }
        });
    }

    async obtenerTodos(filtros: Record<string, any> = {}) {
        // [TP5 SOFT DELETE] Solo se listan los empleados activos.
        const where: Prisma.empleadosWhereInput = { activo: true };
        if (filtros.nombre) where.nombre = { contains: String(filtros.nombre) };
        if (filtros.apellido) where.apellido = { contains: String(filtros.apellido) };
        if (filtros.cargo) where.cargo = { contains: String(filtros.cargo) };
        if (filtros.id_localidad) where.id_localidad = Number(filtros.id_localidad);

        const empleados = await prisma.empleados.findMany({
            where,
            include: {
                localidades: { select: { id_localidad: true, nombre: true } }
            }
        });

        return empleados.map(e => this.formatearEmpleado(e));
    }

    async obtenerEstadisticas() {
        const [empleados, totales] = await Promise.all([
            prisma.empleados.findMany({
                select: { id_empleado: true, nombre: true, apellido: true, activo: true, _count: { select: { pedidos: true } } }
            }),
            prisma.pedidos.groupBy({ by: ['id_empleado'], _sum: { total: true } })
        ]);

        const vendidoPorEmpleado = new Map(totales.map(t => [t.id_empleado, Number(t._sum.total ?? 0)]));
        return empleados
            .map(e => ({
                id_empleado: e.id_empleado,
                nombre: e.nombre,
                apellido: e.apellido,
                activo: e.activo,
                pedidos: e._count.pedidos,
                total_vendido: vendidoPorEmpleado.get(e.id_empleado) ?? 0
            }))
            .sort((a, b) => b.total_vendido - a.total_vendido);
    }

    async obtenerPorId(id: number) {
        const empleado = await prisma.empleados.findFirst({
            where: { id_empleado: id, activo: true },
            include: {
                localidades: { select: { id_localidad: true, nombre: true } }
            }
        });
        return empleado ? this.formatearEmpleado(empleado) : null;
    }

    async actualizar(id: number, empleado: Record<string, any>) {
        const { nombre, apellido, cargo, fecha_nacimiento, fecha_ingreso, fecha_salida, id_localidad } = empleado;
        return prisma.empleados.update({
            where: { id_empleado: id },
            data: {
                nombre,
                apellido,
                cargo: cargo ?? null,
                fecha_nacimiento: aFecha(fecha_nacimiento),
                fecha_ingreso: aFecha(fecha_ingreso),
                fecha_salida: aFecha(fecha_salida),
                id_localidad: id_localidad != null ? Number(id_localidad) : null
            }
        });
    }

    async actualizarParcial(id: number, empleado: Record<string, any>) {
        const permitidas = ['nombre', 'apellido', 'cargo', 'fecha_nacimiento', 'fecha_ingreso', 'fecha_salida', 'id_localidad'];
        const camposFecha = ['fecha_nacimiento', 'fecha_ingreso', 'fecha_salida'];
        const data: Record<string, any> = {};

        for (const campo of permitidas) {
            if (empleado[campo] !== undefined) {
                if (camposFecha.includes(campo)) {
                    data[campo] = aFecha(empleado[campo]);
                } else if (campo === 'id_localidad') {
                    data[campo] = empleado[campo] === null ? null : Number(empleado[campo]);
                } else {
                    data[campo] = empleado[campo];
                }
            }
        }

        if (Object.keys(data).length === 0) return null;
        return prisma.empleados.update({ where: { id_empleado: id }, data });
    }

    async eliminar(id: number) {
        return prisma.empleados.update({
            where: { id_empleado: id },
            data: { activo: false }
        });
    }

    async reactivar(id: number) {
        return prisma.empleados.update({
            where: { id_empleado: id },
            data: { activo: true }
        });
    }
}

export default new EmpleadoModel();