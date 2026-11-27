import type { Schema } from 'express-validator';
import prisma from '../config/prisma.js';
import { textoFiltro, textoObligatorio, textoOpcional } from './helpers.js';

// Regla reutilizable para fechas opcionales con formato AAAA-MM-DD (ej: "1990-05-14")
const fechaOpcional = (campo: string) => ({
    optional: { options: { values: 'null' as const } },
    isISO8601: {
        options: { strict: true },
        errorMessage: `El campo ${campo} debe tener formato de fecha válido (AAAA-MM-DD).`
    }
});

// Valida que id_localidad sea un entero positivo y además exista en la tabla localidades
const localidadOpcional = {
    optional: { options: { values: 'null' as const } },
    isInt: {
        options: { min: 1 },
        errorMessage: 'El campo id_localidad debe ser un número entero positivo.'
    },
    toInt: true,
    custom: {
        options: async (value: number) => {
            const existe = await prisma.localidades.findUnique({
                where: { id_localidad: Number(value) }
            });
            if (!existe) {
                throw new Error(`La localidad con id ${value} no existe.`);
            }
            return true;
        }
    }
};

// POST /api/empleados
export const crearEmpleado: Schema = {
    nombre: textoObligatorio('nombre', 50),
    apellido: textoObligatorio('apellido', 50),
    cargo: textoOpcional('cargo', 50),
    fecha_nacimiento: fechaOpcional('fecha_nacimiento'),
    fecha_ingreso: fechaOpcional('fecha_ingreso'),
    fecha_salida: fechaOpcional('fecha_salida'),
    id_localidad: localidadOpcional
};

// PUT /api/empleados/:id -> reemplaza el registro
export const actualizarEmpleado: Schema = { ...crearEmpleado };

// PATCH /api/empleados/:id -> solo se valida lo que llega
export const actualizarEmpleadoParcial: Schema = {
    nombre: textoOpcional('nombre', 50),
    apellido: textoOpcional('apellido', 50),
    cargo: textoOpcional('cargo', 50),
    fecha_nacimiento: fechaOpcional('fecha_nacimiento'),
    fecha_ingreso: fechaOpcional('fecha_ingreso'),
    fecha_salida: fechaOpcional('fecha_salida'),
    id_localidad: localidadOpcional
};

// Filtros de GET /api/empleados (?nombre=...&apellido=...&cargo=...&id_localidad=...)
export const filtrosEmpleado: Schema = {
    nombre: textoFiltro('nombre', 50),
    apellido: textoFiltro('apellido', 50),
    cargo: textoFiltro('cargo', 50),
    id_localidad: {
        optional: true,
        isInt: {
            options: { min: 1 },
            errorMessage: 'El filtro id_localidad debe ser un número entero positivo.'
        },
        toInt: true
    }
};