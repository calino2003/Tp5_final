import type { Schema } from 'express-validator';
import prisma from '../config/prisma.js';
import { textoFiltro, textoObligatorio, textoOpcional } from './helpers.js';

// Valida que id_localidad sea entero positivo y exista en la tabla localidades
const localidadOpcional = {
    optional: { options: { values: 'null' as const } },
    isInt: {
        options: { min: 1 },
        errorMessage: "El campo 'id_localidad' debe ser un número entero positivo."
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

// POST /api/proveedores
export const crearProveedor: Schema = {
    razon_social: textoObligatorio('razon_social', 100),
    cuit: {
        isString: { errorMessage: "El campo 'cuit' debe ser texto." },
        notEmpty: { errorMessage: "El campo 'cuit' es obligatorio." },
        // Acepta el CUIT con o sin guiones (30-75000000-7 / 30750000007)
        matches: { options: /^[\d-]+$/, errorMessage: "El CUIT debe contener solo números y guiones." },
        isLength: { options: { min: 10, max: 13 }, errorMessage: "El CUIT debe tener entre 10 y 13 caracteres." }
    },
    telefono: textoOpcional('telefono', 20),
    email: {
        optional: true,
        isString: { errorMessage: "El campo 'email' debe ser texto." },
        isEmail: { errorMessage: "El formato del email no es válido." },
        isLength: { options: { max: 100 }, errorMessage: "El email no puede superar los 100 caracteres." }
    },
    id_localidad: localidadOpcional
};

// PUT /api/proveedores/:id -> reemplaza el registro
export const actualizarProveedor: Schema = { ...crearProveedor };

// PATCH /api/proveedores/:id -> solo se valida lo que llega
export const actualizarProveedorParcial: Schema = {
    razon_social: textoOpcional('razon_social', 100),
    cuit: {
        optional: true,
        matches: { options: /^[\d-]+$/, errorMessage: "El CUIT debe contener solo números y guiones." },
        isLength: { options: { min: 10, max: 13 }, errorMessage: "El CUIT debe tener entre 10 y 13 caracteres." }
    },
    telefono: textoOpcional('telefono', 20),
    email: {
        optional: true,
        isString: { errorMessage: "El campo 'email' debe ser texto." },
        isEmail: { errorMessage: "El formato del email no es válido." },
        isLength: { options: { max: 100 }, errorMessage: "El email no puede superar los 100 caracteres." }
    },
    id_localidad: localidadOpcional
};

// Filtros de GET /api/proveedores (?razon_social=...&cuit=...&email=...&id_localidad=...)
export const filtrosProveedor: Schema = {
    razon_social: textoFiltro('razon_social', 100),
    cuit: textoFiltro('cuit', 15),
    email: textoFiltro('email', 100),
    id_localidad: {
        optional: true,
        isInt: {
            options: { min: 1 },
            errorMessage: "El filtro 'id_localidad' debe ser un número entero positivo."
        },
        toInt: true
    }
};