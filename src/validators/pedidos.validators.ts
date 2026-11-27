import type { Schema } from 'express-validator';
import prisma from '../config/prisma.js';
import {
    enteroObligatorio,
    enteroOpcional,
    fechaFiltro,
    importeOpcional,
    textoFiltro,
    textoOpcional
} from './helpers.js';

// Esquemas de pedidos - capa de validación (express-validator)

// Valores del ENUM legado (conviven con la tabla estados_pedido hasta la limpieza final)
export const ESTADOS_PEDIDO = ['pendiente', 'enviado', 'entregado', 'cancelado'];

const estadoPedido = {
    optional: true,
    isIn: {
        options: [ESTADOS_PEDIDO],
        errorMessage: `El estado debe ser uno de: ${ESTADOS_PEDIDO.join(', ')}.`
    }
};

// Valida que id_estado exista en el catálogo estados_pedido
const idEstadoOpcional = {
    optional: { options: { values: 'null' as const } },
    isInt: {
        options: { min: 1 },
        errorMessage: "El campo 'id_estado' debe ser un número entero positivo."
    },
    toInt: true,
    custom: {
        options: async (value: number) => {
            const existe = await prisma.estados_pedido.findUnique({
                where: { id_estado: Number(value) }
            });
            if (!existe) {
                throw new Error(`El estado de pedido con id ${value} no existe.`);
            }
            return true;
        }
    }
};

// Valida que id_localidad_envio exista en la tabla localidades
const localidadEnvioOpcional = {
    optional: { options: { values: 'null' as const } },
    isInt: {
        options: { min: 1 },
        errorMessage: "El campo 'id_localidad_envio' debe ser un número entero positivo."
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

// Código de moneda ISO 4217 (ej: ARS, USD, CLP, BRL)
const monedaOpcional = {
    optional: true,
    isString: { errorMessage: "El campo 'moneda' debe ser texto." },
    isLength: {
        options: { min: 3, max: 3 },
        errorMessage: "El campo 'moneda' debe ser un código ISO de 3 letras (ej: ARS, USD)."
    }
};

const tipoCambioOpcional = {
    optional: { options: { values: 'null' as const } },
    isFloat: {
        options: { gt: 0 },
        errorMessage: "El campo 'tipo_cambio' debe ser un número mayor a 0."
    },
    toFloat: true
};

// POST /api/pedidos
// id_cliente e id_empleado son obligatorios (en la BD son NOT NULL para evitar ventas huérfanas)
export const crearPedido: Schema = {
    id_cliente: enteroObligatorio('id_cliente'),
    id_empleado: enteroObligatorio('id_empleado'),
    id_compania: enteroOpcional('id_compania', 1),
    estado: estadoPedido,
    id_estado: idEstadoOpcional,
    moneda: monedaOpcional,
    tipo_cambio: tipoCambioOpcional,
    id_localidad_envio: localidadEnvioOpcional,
    direccion_envio: textoOpcional('direccion_envio', 200),
    total: importeOpcional('total')
};

// PUT /api/pedidos/:id -> reemplaza el registro: cliente y empleado siguen siendo obligatorios
export const actualizarPedido: Schema = { ...crearPedido };

// PATCH /api/pedidos/:id -> todo es opcional, se modifica solo lo que llega
export const actualizarPedidoParcial: Schema = {
    id_cliente: enteroOpcional('id_cliente', 1),
    id_empleado: enteroOpcional('id_empleado', 1),
    id_compania: enteroOpcional('id_compania', 1),
    estado: estadoPedido,
    id_estado: idEstadoOpcional,
    moneda: monedaOpcional,
    tipo_cambio: tipoCambioOpcional,
    id_localidad_envio: localidadEnvioOpcional,
    direccion_envio: textoOpcional('direccion_envio', 200),
    total: importeOpcional('total')
};

// Filtros de GET /api/pedidos (?cliente=...&empleado=...&estado=...&desde=...&hasta=...&id_localidad=...)
export const filtrosPedido: Schema = {
    cliente: textoFiltro('cliente', 50),
    empleado: textoFiltro('empleado', 50),
    estado: {
        optional: { options: { values: 'falsy' } },
        isIn: {
            options: [ESTADOS_PEDIDO],
            errorMessage: `El estado debe ser uno de: ${ESTADOS_PEDIDO.join(', ')}.`
        }
    },
    id_localidad: {
        optional: true,
        isInt: {
            options: { min: 1 },
            errorMessage: "El filtro 'id_localidad' debe ser un número entero positivo."
        },
        toInt: true
    },
    desde: fechaFiltro('desde'),
    hasta: fechaFiltro('hasta')
};