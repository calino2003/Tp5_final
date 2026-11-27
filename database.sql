-- ============================================================
--  TP N° 5 - TypeScript + ORM Prisma: Distribuidora
--  Script sincronizado con prisma/schema.prisma (Nivel 0 - Escalabilidad)
--
--  Incluye las correcciones originales del TP4/TP5 más la evolución
--  solicitada para escalar local e internacionalmente:
--    * Nivel territorial en 3 capas: paises -> provincias -> localidades
--    * Cobertura M:N: compania_envio_localidad
--    * Documentos internacionales (tipos_documento + id_pais_emisor)
--    * Catálogo de estados de pedido (estados_pedido) + compatibilidad ENUM
--    * Empleados con fecha_nacimiento, fecha_ingreso, fecha_salida y bonificaciones
--    * Patrón de instantánea en pedidos (id_localidad_envio + direccion_envio + moneda/tipo_cambio)
--    * Integridad: CHECK (subtotal = cantidad * precio_unitario), sin ventas huérfanas,
--      índices de informes y collation unificada utf8mb4_unicode_ci (distingue ñ de n)
-- ============================================================

CREATE DATABASE IF NOT EXISTS `distribuidora_ipap`
    DEFAULT CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

ALTER DATABASE `distribuidora_ipap`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE `distribuidora_ipap`;

-- Se eliminan las tablas en orden inverso a sus dependencias (hijas antes que padres)
DROP TABLE IF EXISTS `usuario`;
DROP TABLE IF EXISTS `bonificaciones`;
DROP TABLE IF EXISTS `compania_envio_localidad`;
DROP TABLE IF EXISTS `detalles_pedido`;
DROP TABLE IF EXISTS `pedidos`;
DROP TABLE IF EXISTS `productos`;
DROP TABLE IF EXISTS `proveedores`;
DROP TABLE IF EXISTS `clientes`;
DROP TABLE IF EXISTS `empleados`;
DROP TABLE IF EXISTS `companias_envio`;
DROP TABLE IF EXISTS `estados_pedido`;
DROP TABLE IF EXISTS `tipos_documento`;
DROP TABLE IF EXISTS `localidades`;
DROP TABLE IF EXISTS `provincias`;
DROP TABLE IF EXISTS `paises`;

-- ============================================================
--  1. TABLAS TERRITORIALES Y CATÁLOGOS
-- ============================================================

CREATE TABLE `paises` (
    `id_pais`          INT         NOT NULL AUTO_INCREMENT,
    `nombre`           VARCHAR(60) NOT NULL,
    `codigo_iso2`      CHAR(2)     NOT NULL,
    `codigo_iso3`      CHAR(3)     NOT NULL,
    `moneda`           CHAR(3)     NOT NULL DEFAULT 'ARS',
    `prefijo_telefono` VARCHAR(6)  DEFAULT NULL,
    `activo`           TINYINT(1)  NOT NULL DEFAULT 1,
    `created_at`       DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`       DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id_pais`),
    UNIQUE KEY `uq_paises_iso2` (`codigo_iso2`),
    UNIQUE KEY `uq_paises_iso3` (`codigo_iso3`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `provincias` (
    `id_provincia` INT         NOT NULL AUTO_INCREMENT,
    `id_pais`      INT         NOT NULL,
    `nombre`       VARCHAR(80) NOT NULL,
    `codigo`       VARCHAR(20) DEFAULT NULL,
    `activo`       TINYINT(1)  NOT NULL DEFAULT 1,
    `created_at`   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id_provincia`),
    UNIQUE KEY `uq_provincias_pais_nombre` (`id_pais`, `nombre`),
    CONSTRAINT `fk_provincias_pais`
        FOREIGN KEY (`id_pais`) REFERENCES `paises` (`id_pais`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `localidades` (
    `id_localidad`  INT         NOT NULL AUTO_INCREMENT,
    `id_provincia`  INT         NOT NULL,
    `nombre`        VARCHAR(80) NOT NULL,
    `codigo_postal` VARCHAR(10) DEFAULT NULL,
    `activo`        TINYINT(1)  NOT NULL DEFAULT 1,
    `created_at`    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id_localidad`),
    UNIQUE KEY `uq_localidades_provincia_nombre` (`id_provincia`, `nombre`),
    CONSTRAINT `fk_localidades_provincia`
        FOREIGN KEY (`id_provincia`) REFERENCES `provincias` (`id_provincia`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tipos_documento` (
    `id_tipo_documento` INT         NOT NULL AUTO_INCREMENT,
    `codigo`            VARCHAR(12) NOT NULL,
    `nombre`            VARCHAR(40) NOT NULL,
    `longitud_min`      TINYINT     NOT NULL,
    `longitud_max`      TINYINT     NOT NULL,
    `requiere_pais`     TINYINT(1)  NOT NULL DEFAULT 1,
    `activo`            TINYINT(1)  NOT NULL DEFAULT 1,
    PRIMARY KEY (`id_tipo_documento`),
    UNIQUE KEY `uq_tipos_documento_codigo` (`codigo`),
    CONSTRAINT `chk_tipos_documento_longitud` CHECK (`longitud_min` <= `longitud_max`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `estados_pedido` (
    `id_estado` INT         NOT NULL AUTO_INCREMENT,
    `codigo`    VARCHAR(20) NOT NULL,
    `orden`     TINYINT     NOT NULL,
    `activo`    TINYINT(1)  NOT NULL DEFAULT 1,
    PRIMARY KEY (`id_estado`),
    UNIQUE KEY `uq_estados_pedido_codigo` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  2. TABLAS DEL NEGOCIO
-- ============================================================

CREATE TABLE `companias_envio` (
    `id_compania` INT(11)      NOT NULL AUTO_INCREMENT,
    `nombre`      VARCHAR(100) NOT NULL,
    `telefono`    VARCHAR(20)  DEFAULT NULL,
    `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id_compania`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `compania_envio_localidad` (
    `id_compania`  INT           NOT NULL,
    `id_localidad` INT           NOT NULL,
    `costo_envio`  DECIMAL(10,2) DEFAULT NULL,
    `dias_entrega` TINYINT       DEFAULT NULL,
    PRIMARY KEY (`id_compania`, `id_localidad`),
    CONSTRAINT `chk_cel_costo` CHECK (`costo_envio` IS NULL OR `costo_envio` >= 0),
    CONSTRAINT `fk_cel_compania`
        FOREIGN KEY (`id_compania`)  REFERENCES `companias_envio` (`id_compania`) ON UPDATE CASCADE,
    CONSTRAINT `fk_cel_localidad`
        FOREIGN KEY (`id_localidad`) REFERENCES `localidades` (`id_localidad`)    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `clientes` (
    `id_cliente`           INT(11)      NOT NULL AUTO_INCREMENT,
    `nombre`               VARCHAR(50)  NOT NULL,
    `apellido`             VARCHAR(50)  NOT NULL,
    `id_tipo_documento`    INT          DEFAULT NULL,
    `numero_documento`     VARCHAR(30)  DEFAULT NULL,
    `id_pais_emisor`       INT          DEFAULT NULL,
    `dni`                  VARCHAR(15)  NOT NULL,
    `id_localidad`         INT          DEFAULT NULL,
    `calle`                VARCHAR(100) DEFAULT NULL,
    `numero`               VARCHAR(12)  DEFAULT NULL,
    `piso`                 VARCHAR(10)  DEFAULT NULL,
    `departamento`         VARCHAR(10)  DEFAULT NULL,
    `codigo_postal`        VARCHAR(10)  DEFAULT NULL,
    `direccion_referencia` VARCHAR(150) DEFAULT NULL,
    `direccion`            VARCHAR(150) DEFAULT NULL,
    `telefono`             VARCHAR(20)  DEFAULT NULL,
    `activo`               TINYINT(1)   NOT NULL DEFAULT 1,
    `created_at`           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id_cliente`),
    UNIQUE KEY `dni` (`dni`),
    UNIQUE KEY `uq_cliente_documento` (`id_tipo_documento`, `id_pais_emisor`, `numero_documento`),
    KEY `idx_clientes_apellido` (`apellido`),
    CONSTRAINT `fk_clientes_tipo_documento`
        FOREIGN KEY (`id_tipo_documento`) REFERENCES `tipos_documento` (`id_tipo_documento`) ON UPDATE CASCADE,
    CONSTRAINT `fk_clientes_pais_emisor`
        FOREIGN KEY (`id_pais_emisor`)    REFERENCES `paises` (`id_pais`)                    ON UPDATE CASCADE,
    CONSTRAINT `fk_clientes_localidad`
        FOREIGN KEY (`id_localidad`)      REFERENCES `localidades` (`id_localidad`)          ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `empleados` (
    `id_empleado`      INT(11)     NOT NULL AUTO_INCREMENT,
    `nombre`           VARCHAR(50) NOT NULL,
    `apellido`         VARCHAR(50) NOT NULL,
    `cargo`            VARCHAR(50) DEFAULT NULL,
    `fecha_nacimiento` DATE        DEFAULT NULL,
    `fecha_ingreso`    DATE        DEFAULT NULL,
    `fecha_salida`     DATE        DEFAULT NULL,
    `id_localidad`     INT         DEFAULT NULL,
    `activo`           TINYINT(1)  NOT NULL DEFAULT 1,
    `created_at`       DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`       DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id_empleado`),
    CONSTRAINT `fk_empleados_localidad`
        FOREIGN KEY (`id_localidad`) REFERENCES `localidades` (`id_localidad`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `bonificaciones` (
    `id_bonificacion` INT           NOT NULL AUTO_INCREMENT,
    `id_empleado`     INT           NOT NULL,
    `tipo`            VARCHAR(20)   NOT NULL,
    `fecha`           DATE          NOT NULL,
    `monto`           DECIMAL(10,2) NOT NULL,
    `moneda`          CHAR(3)       NOT NULL DEFAULT 'ARS',
    `motivo`          VARCHAR(150)  DEFAULT NULL,
    `created_at`      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id_bonificacion`),
    KEY `idx_bonif_empleado_fecha` (`id_empleado`, `fecha`),
    CONSTRAINT `chk_bonif_monto` CHECK (`monto` >= 0),
    CONSTRAINT `chk_bonif_tipo`  CHECK (`tipo` IN ('cumpleanos', 'antiguedad', 'otro')),
    CONSTRAINT `fk_bonif_empleado`
        FOREIGN KEY (`id_empleado`) REFERENCES `empleados` (`id_empleado`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `usuario` (
    `id_usuario`  INT(11)      NOT NULL AUTO_INCREMENT,
    `id_empleado` INT          DEFAULT NULL,
    `username`    VARCHAR(50)  NOT NULL,
    `password`    VARCHAR(255) NOT NULL,
    `email`       VARCHAR(100) DEFAULT NULL,
    `rol`         VARCHAR(30)  NOT NULL DEFAULT 'operador',
    PRIMARY KEY (`id_usuario`),
    UNIQUE KEY `usuario_username_key` (`username`),
    UNIQUE KEY `uq_usuario_empleado` (`id_empleado`),
    CONSTRAINT `fk_usuario_empleado`
        FOREIGN KEY (`id_empleado`) REFERENCES `empleados` (`id_empleado`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `proveedores` (
    `id_proveedor` INT(11)      NOT NULL AUTO_INCREMENT,
    `razon_social` VARCHAR(100) NOT NULL,
    `cuit`         VARCHAR(15)  NOT NULL,
    `telefono`     VARCHAR(20)  DEFAULT NULL,
    `email`        VARCHAR(100) DEFAULT NULL,
    `id_localidad` INT          DEFAULT NULL,
    `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id_proveedor`),
    UNIQUE KEY `cuit` (`cuit`),
    CONSTRAINT `fk_proveedores_localidad`
        FOREIGN KEY (`id_localidad`) REFERENCES `localidades` (`id_localidad`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `productos` (
    `id_producto`     INT(11)       NOT NULL AUTO_INCREMENT,
    `nombre`          VARCHAR(100)  NOT NULL,
    `descripcion`     TEXT          DEFAULT NULL,
    `precio_unitario` DECIMAL(10,2) NOT NULL CHECK (`precio_unitario` >= 0),
    `moneda`          CHAR(3)       NOT NULL DEFAULT 'ARS',
    `stock`           INT(11)       NOT NULL DEFAULT 0 CHECK (`stock` >= 0),
    `activo`          TINYINT(1)    NOT NULL DEFAULT 1,
    `id_proveedor`    INT(11)       DEFAULT NULL,
    `created_at`      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id_producto`),
    KEY `idx_productos_nombre` (`nombre`),
    CONSTRAINT `fk_productos_proveedor`
        FOREIGN KEY (`id_proveedor`) REFERENCES `proveedores` (`id_proveedor`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pedidos` (
    `id_pedido`          INT(11)       NOT NULL AUTO_INCREMENT,
    `fecha`              DATETIME      DEFAULT CURRENT_TIMESTAMP,
    `total`              DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (`total` >= 0),
    `moneda`             CHAR(3)       NOT NULL DEFAULT 'ARS',
    `tipo_cambio`        DECIMAL(12,6) DEFAULT NULL,
    `estado`             ENUM('pendiente','enviado','entregado','cancelado') NOT NULL DEFAULT 'pendiente',
    `id_estado`          INT           DEFAULT NULL,
    `id_cliente`         INT(11)       NOT NULL,
    `id_empleado`        INT(11)       NOT NULL,
    `id_compania`        INT(11)       DEFAULT NULL,
    `id_localidad_envio` INT           DEFAULT NULL,
    `direccion_envio`    VARCHAR(200)  DEFAULT NULL,
    `created_at`         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id_pedido`),
    KEY `idx_pedidos_fecha` (`fecha`),
    KEY `idx_pedidos_cliente_fecha` (`id_cliente`, `fecha`),
    CONSTRAINT `fk_pedidos_cliente`
        FOREIGN KEY (`id_cliente`)         REFERENCES `clientes` (`id_cliente`)        ON UPDATE CASCADE,
    CONSTRAINT `fk_pedidos_empleado`
        FOREIGN KEY (`id_empleado`)        REFERENCES `empleados` (`id_empleado`)      ON UPDATE CASCADE,
    CONSTRAINT `fk_pedidos_compania`
        FOREIGN KEY (`id_compania`)        REFERENCES `companias_envio` (`id_compania`) ON UPDATE CASCADE,
    CONSTRAINT `fk_pedidos_estado`
        FOREIGN KEY (`id_estado`)          REFERENCES `estados_pedido` (`id_estado`)   ON UPDATE CASCADE,
    CONSTRAINT `fk_pedidos_localidad_envio`
        FOREIGN KEY (`id_localidad_envio`) REFERENCES `localidades` (`id_localidad`)   ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `detalles_pedido` (
    `id_pedido`       INT(11)       NOT NULL,
    `id_producto`     INT(11)       NOT NULL,
    `cantidad`        INT(11)       NOT NULL CHECK (`cantidad` > 0),
    `precio_unitario` DECIMAL(10,2) NOT NULL CHECK (`precio_unitario` >= 0),
    `subtotal`        DECIMAL(10,2) NOT NULL CHECK (`subtotal` >= 0),
    `created_at`      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id_pedido`, `id_producto`),
    CONSTRAINT `chk_detalle_subtotal` CHECK (`subtotal` = `cantidad` * `precio_unitario`),
    CONSTRAINT `fk_detalles_pedido`
        FOREIGN KEY (`id_pedido`)   REFERENCES `pedidos` (`id_pedido`)     ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_detalles_producto`
        FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  3. DATOS DE REFERENCIA Y EJEMPLO (SEED)
-- ============================================================

INSERT INTO `paises` (`nombre`, `codigo_iso2`, `codigo_iso3`, `moneda`, `prefijo_telefono`) VALUES
('Argentina', 'AR', 'ARG', 'ARS', '+54'),
('Uruguay',   'UY', 'URY', 'UYU', '+598'),
('Chile',     'CL', 'CHL', 'CLP', '+56'),
('Brasil',    'BR', 'BRA', 'BRL', '+55'),
('Paraguay',  'PY', 'PRY', 'PYG', '+595');

INSERT INTO `provincias` (`id_pais`, `nombre`, `codigo`) VALUES
(1, 'Buenos Aires', 'AR-B'),
(1, 'Ciudad Autónoma de Buenos Aires', 'AR-C'),
(1, 'Catamarca', 'AR-K'),
(1, 'Chaco', 'AR-H'),
(1, 'Chubut', 'AR-U'),
(1, 'Córdoba', 'AR-X'),
(1, 'Corrientes', 'AR-W'),
(1, 'Entre Ríos', 'AR-E'),
(1, 'Formosa', 'AR-P'),
(1, 'Jujuy', 'AR-Y'),
(1, 'La Pampa', 'AR-L'),
(1, 'La Rioja', 'AR-F'),
(1, 'Mendoza', 'AR-M'),
(1, 'Misiones', 'AR-N'),
(1, 'Neuquén', 'AR-Q'),
(1, 'Río Negro', 'AR-R'),
(1, 'Salta', 'AR-A'),
(1, 'San Juan', 'AR-J'),
(1, 'San Luis', 'AR-D'),
(1, 'Santa Cruz', 'AR-Z'),
(1, 'Santa Fe', 'AR-S'),
(1, 'Santiago del Estero', 'AR-G'),
(1, 'Tierra del Fuego', 'AR-V'),
(1, 'Tucumán', 'AR-T');

INSERT INTO `localidades` (`id_provincia`, `nombre`, `codigo_postal`) VALUES
((SELECT `id_provincia` FROM `provincias` WHERE `codigo` = 'AR-R'), 'Bariloche', '8400'),
((SELECT `id_provincia` FROM `provincias` WHERE `codigo` = 'AR-R'), 'El Bolsón', '8430'),
((SELECT `id_provincia` FROM `provincias` WHERE `codigo` = 'AR-R'), 'Viedma',    '8500'),
((SELECT `id_provincia` FROM `provincias` WHERE `codigo` = 'AR-Q'), 'Neuquén',   '8300'),
((SELECT `id_provincia` FROM `provincias` WHERE `codigo` = 'AR-C'), 'Ciudad Autónoma de Buenos Aires', 'C1000');

INSERT INTO `tipos_documento` (`codigo`, `nombre`, `longitud_min`, `longitud_max`, `requiere_pais`) VALUES
('DNI',       'Documento Nacional de Identidad',  7,  8, 1),
('PASAPORTE', 'Pasaporte',                        6, 20, 1),
('CPF',       'Cadastro de Pessoas Físicas (BR)', 11, 11, 1),
('RUT',       'Rol Único Tributario (CL)',        8,  9, 1),
('CI_UY',     'Cédula de Identidad (UY)',         7,  8, 1),
('SSN',       'Social Security Number (US)',      9,  9, 1);

INSERT INTO `estados_pedido` (`codigo`, `orden`) VALUES
('pendiente', 1),
('enviado',   2),
('entregado', 3),
('cancelado', 4);

INSERT INTO `clientes`
(`nombre`, `apellido`, `id_tipo_documento`, `numero_documento`, `id_pais_emisor`, `dni`,
 `id_localidad`, `calle`, `numero`, `direccion`, `telefono`)
VALUES
('Juan Carlos', 'Del Castillo', 1, '30123456', 1, '30123456', 1, NULL,           NULL,   'San Carlos de Bariloche',      '2944-123456'),
('María Laura', 'Fernández',    1, '28456789', 1, '28456789', 1, 'Mitre',        '450',  'Mitre 450, Bariloche',         '2944-556677'),
('Roberto',     'Sosa',         1, '25987654', 1, '25987654', 1, 'Av. Bustillo', 'km 5', 'Av. Bustillo km 5, Bariloche', NULL),
('Lucía',       'Mendoza',      1, '35111222', 1, '35111222', 1, 'Elflein',      '120',  'Elflein 120, Bariloche',       '2944-889900'),
('Pedro',       'Almonacid',    1, '27333444', 1, '27333444', 2, 'Ruta 40',      'km 2', 'Ruta 40 km 2, El Bolsón',      '2944-112233');

INSERT INTO `companias_envio` (`nombre`, `telefono`) VALUES
('Andreani Logística', '0810-122-1122'),
('OCA Logística',      '0810-999-0622'),
('Correo Argentino',   '0800-222-3639');

INSERT INTO `compania_envio_localidad` (`id_compania`, `id_localidad`, `costo_envio`, `dias_entrega`) VALUES
(1, 1, 3500.00, 1),
(1, 2, 5200.00, 2),
(2, 1, 3900.00, 2),
(3, 1, 2800.00, 3);

INSERT INTO `empleados` (`nombre`, `apellido`, `cargo`, `fecha_nacimiento`, `fecha_ingreso`, `id_localidad`) VALUES
('Carlos', 'Giménez', 'Supervisor de Logística', '1985-06-15', '2020-03-01', 1),
('Ana',    'Beltrán', 'Vendedora',               '1992-11-20', '2022-08-10', 1),
('Martín', 'Quiroga', 'Repartidor',              '1990-02-05', '2023-01-15', 1);

INSERT INTO `bonificaciones` (`id_empleado`, `tipo`, `fecha`, `monto`, `moneda`, `motivo`) VALUES
(1, 'antiguedad', '2026-03-01', 50000.00, 'ARS', 'Plus por 6 años de antigüedad'),
(2, 'cumpleanos', '2026-11-20', 25000.00, 'ARS', 'Bonificación por cumpleaños');

INSERT INTO `usuario` (`id_empleado`, `username`, `password`, `email`, `rol`) VALUES
(1, 'cgimenez', '$2b$10$hashDeEjemploSoloEstructura', 'carlos.gimenez@distribuidora.com', 'admin');

INSERT INTO `proveedores` (`razon_social`, `cuit`, `telefono`, `email`, `id_localidad`) VALUES
('Mayorista Bariloche SRL',    '30-87654321-0', '2944-654321', 'contacto@mayoristabrc.com',  1),
('Mayorista Bolsón SRL',       '30-87654541-0', '2944-674321', 'contactobol@mayoristaeb.com', 2),
('Distribuidora Patagonia SA', '30-70123456-5', '2944-700123', 'ventas@distpatagonia.com',   1),
('Alimentos del Sur SRL',      '30-71234567-8', '2944-712345', 'info@alimentosdelsur.com',   1);

INSERT INTO `productos` (`nombre`, `descripcion`, `precio_unitario`, `moneda`, `stock`, `id_proveedor`) VALUES
('Coca Cola 2.25L',         'Gaseosa sabor cola envase retornable', 2500.50, 'ARS', 100, 2),
('Sprite 2.25L',            'Gaseosa lima limón',                   2450.00, 'ARS',  80, 2),
('Agua Mineral 2L',         'Agua mineral sin gas',                 1200.00, 'ARS', 150, 1),
('Cerveza Quilmes 1L',      'Cerveza rubia retornable',             2100.00, 'ARS', 120, 3),
('Fideos Spaghetti 500g',   'Fideos secos de trigo candeal',        1350.75, 'ARS', 200, 1),
('Aceite de Girasol 900ml', 'Aceite de girasol botella plástica',   3200.00, 'ARS',   8, 4),
('Yerba Mate 1kg',          'Yerba mate con palo',                  5400.00, 'ARS',  90, 1),
('Galletitas de Agua 300g', 'Galletitas de agua clásicas',          1800.25, 'ARS',  25, 4);

INSERT INTO `pedidos`
(`fecha`, `total`, `moneda`, `estado`, `id_estado`, `id_cliente`, `id_empleado`, `id_compania`, `id_localidad_envio`, `direccion_envio`)
VALUES
(CURRENT_TIMESTAMP,     8601.00, 'ARS', 'entregado', 3, 1, 1, 1, 1, 'San Carlos de Bariloche'),
('2026-09-15 11:30:00', 17904.50, 'ARS', 'enviado',   2, 2, 2, 2, 1, 'Mitre 450, Bariloche'),
('2026-09-28 09:45:00', 20400.00, 'ARS', 'pendiente', 1, 3, 2, 1, 1, 'Av. Bustillo km 5, Bariloche'),
('2026-10-05 16:20:00', 14500.50, 'ARS', 'entregado', 3, 1, 3, 3, 1, 'San Carlos de Bariloche'),
('2026-10-08 12:00:00', 18002.50, 'ARS', 'cancelado', 4, 4, 1, 2, 1, 'Elflein 120, Bariloche'),
('2026-10-14 15:10:00', 28200.00, 'ARS', 'enviado',   2, 5, 3, 3, 2, 'Ruta 40 km 2, El Bolsón');

INSERT INTO `detalles_pedido` (`id_pedido`, `id_producto`, `cantidad`, `precio_unitario`, `subtotal`) VALUES
(1, 1,  2, 2500.50,  5001.00),
(1, 3,  3, 1200.00,  3600.00),
(2, 2,  4, 2450.00,  9800.00),
(2, 5,  6, 1350.75,  8104.50),
(3, 7,  2, 5400.00, 10800.00),
(3, 6,  3, 3200.00,  9600.00),
(4, 4,  6, 2000.00, 12000.00),
(4, 1,  1, 2500.50,  2500.50),
(5, 8, 10, 1800.25, 18002.50),
(6, 3, 12, 1200.00, 14400.00),
(6, 4,  4, 2100.00,  8400.00),
(6, 7,  1, 5400.00,  5400.00);