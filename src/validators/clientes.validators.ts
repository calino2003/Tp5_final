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

// Valida que id_tipo_documento exista en el catálogo tipos_documento
const tipoDocumentoOpcional = {
    optional: { options: { values: 'null' as const } },
    isInt: {
        options: { min: 1 },
        errorMessage: "El campo 'id_tipo_documento' debe ser un número entero positivo."
    },
    toInt: true,
    custom: {
        options: async (value: number) => {
            const existe = await prisma.tipos_documento.findUnique({
                where: { id_tipo_documento: Number(value) }
            });
            if (!existe) {
                throw new Error(`El tipo de documento con id ${value} no existe.`);
            }
            return true;
        }
    }
};

// Valida que id_pais_emisor exista en la tabla paises
const paisEmisorOpcional = {
    optional: { options: { values: 'null' as const } },
    isInt: {
        options: { min: 1 },
        errorMessage: "El campo 'id_pais_emisor' debe ser un número entero positivo."
    },
    toInt: true,
    custom: {
        options: async (value: number) => {
            const existe = await prisma.paises.findUnique({
                where: { id_pais: Number(value) }
            });
            if (!existe) {
                throw new Error(`El país emisor con id ${value} no existe.`);
            }
            return true;
        }
    }
};

// Campos opcionales compartidos por POST, PUT y PATCH
const camposOpcionalesDireccionYDoc: Schema = {
    id_tipo_documento: tipoDocumentoOpcional,
    numero_documento: textoOpcional('numero_documento', 30),
    id_pais_emisor: paisEmisorOpcional,
    id_localidad: localidadOpcional,
    calle: textoOpcional('calle', 100),
    numero: textoOpcional('numero', 12),
    piso: textoOpcional('piso', 10),
    departamento: textoOpcional('departamento', 10),
    codigo_postal: textoOpcional('codigo_postal', 10),
    direccion_referencia: textoOpcional('direccion_referencia', 150),
    direccion: textoOpcional('direccion', 150),
    telefono: textoOpcional('telefono', 20)
};

// POST /api/clientes
export const crearCliente: Schema = {
    nombre: textoObligatorio('nombre', 50),
    apellido: textoObligatorio('apellido', 50),
    dni: {
        isString: { errorMessage: "El campo 'dni' debe ser texto." },
        notEmpty: { errorMessage: "El campo 'dni' es obligatorio." },
        matches: { options: /^\d+$/, errorMessage: "El DNI debe contener solo números." },
        isLength: { options: { min: 7, max: 8 }, errorMessage: "El DNI debe tener entre 7 y 8 dígitos." }
    },
    ...camposOpcionalesDireccionYDoc
};

// PUT /api/clientes/:id -> reemplaza el registro, mismos campos obligatorios que el POST
export const actualizarCliente: Schema = { ...crearCliente };

// PATCH /api/clientes/:id -> solo se valida lo que efectivamente llega
export const actualizarClienteParcial: Schema = {
    nombre: textoOpcional('nombre', 50),
    apellido: textoOpcional('apellido', 50),
    dni: {
        optional: true,
        matches: { options: /^\d+$/, errorMessage: "El DNI debe contener solo números." },
        isLength: { options: { min: 7, max: 8 }, errorMessage: "El DNI debe tener entre 7 y 8 dígitos." }
    },
    ...camposOpcionalesDireccionYDoc
};

// Filtros de GET /api/clientes (?dni=...&nombre=...&apellido=...&id_localidad=...)
export const filtrosCliente: Schema = {
    dni: textoFiltro('dni', 15),
    numero_documento: textoFiltro('numero_documento', 30),
    nombre: textoFiltro('nombre', 50),
    apellido: textoFiltro('apellido', 50),
    id_localidad: {
        optional: true,
        isInt: {
            options: { min: 1 },
            errorMessage: "El filtro 'id_localidad' debe ser un número entero positivo."
        },
        toInt: true
    }
};