import type { Schema } from 'express-validator';
import prisma from '../config/prisma.js';
import { textoFiltro, textoObligatorio, textoOpcional } from './helpers.js';

// POST /api/localidades
export const crearLocalidad: Schema = {
    nombre: textoObligatorio('nombre', 80),
    codigo_postal: textoOpcional('codigo_postal', 10),
    id_provincia: {
        exists: { errorMessage: 'El campo id_provincia es obligatorio.' },
        isInt: {
            options: { min: 1 },
            errorMessage: 'El campo id_provincia debe ser un número entero positivo.'
        },
        toInt: true,
        custom: {
            options: async (value: number) => {
                const existe = await prisma.provincias.findUnique({
                    where: { id_provincia: Number(value) }
                });
                if (!existe) {
                    throw new Error(`La provincia con id ${value} no existe.`);
                }
                return true;
            }
        }
    }
};

// Filtros para GET /api/provincias (?id_pais=1&nombre=Rio)
export const filtrosProvincias: Schema = {
    id_pais: {
        optional: true,
        isInt: {
            options: { min: 1 },
            errorMessage: 'El filtro id_pais debe ser un número entero positivo.'
        },
        toInt: true
    },
    nombre: textoFiltro('nombre', 80)
};

// Filtros para GET /api/localidades (?id_provincia=16&id_pais=1&nombre=Bariloche)
export const filtrosLocalidades: Schema = {
    id_provincia: {
        optional: true,
        isInt: {
            options: { min: 1 },
            errorMessage: 'El filtro id_provincia debe ser un número entero positivo.'
        },
        toInt: true
    },
    id_pais: {
        optional: true,
        isInt: {
            options: { min: 1 },
            errorMessage: 'El filtro id_pais debe ser un número entero positivo.'
        },
        toInt: true
    },
    nombre: textoFiltro('nombre', 80)
};