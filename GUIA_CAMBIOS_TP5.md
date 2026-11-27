# Guía de Cambios y Estudio — TP5 Distribuidora (Nivel 0 / Escalabilidad)

Este documento resume **todo lo que se modificó en la base de datos, Prisma y la API** para responder a las observaciones del profesor, explicando el *porqué* de cada decisión para poder estudiar y defender el proyecto.

---

## 1. Decisión de alcance: qué se implementó y qué se descartó

Al revisar los scripts sugeridos inicialmente se decidió implementar **únicamente la Capa 1 (Nivel 0)** y frenar ahí:

* **Se aplicó:** Nivel territorial en 3 capas (`paises` → `provincias` → `localidades`), cobertura M:N de compañías de envío, documentos internacionales, catálogo de estados de pedido, fechas y bonificaciones de empleados, patrón de instantánea en pedidos, restricciones de integridad y collation unificada (`utf8mb4_unicode_ci`).
* **Se descartó `02_distribuidora.sql` (Capa 2):** agregaba 13 tablas de un ERP completo (depósitos, lotes, movimientos de stock con signo, presentaciones, listas de precio, órdenes de compra) y cambiaba la clave primaria de `detalles_pedido`. Eso no fue pedido por el profesor y rompía casi toda la API y los tests actuales.
* **Se descartó la parte destructiva de `03_limpieza_destructiva.sql`:** eliminaba columnas como `productos.stock` o `productos.id_proveedor` asumiendo la Capa 2. Sí se aplicó la parte sana: unificar toda la base en `utf8mb4_unicode_ci` desde `database.sql`.
* **Criterio de compatibilidad:** se mantuvieron `clientes.dni`, `clientes.direccion` y `pedidos.estado` conviviendo con los campos nuevos para no romper ningún endpoint ni prueba previa del TP5.

---

## 2. Qué cambió en la Base de Datos (`database.sql` y `prisma/schema.prisma`)

Ambos archivos quedaron **100% sincronizados** (describen exactamente las mismas 15 tablas, tipos, claves foráneas e índices).

### 2.1 Las 7 tablas nuevas

| Tabla | Para qué sirve | Detalle clave |
| :--- | :--- | :--- |
| `paises` | Nivel 1 territorial | Usa estándares internacionales (`codigo_iso2`, `codigo_iso3`, `moneda` ISO 4217 y `prefijo_telefono`). |
| `provincias` | Nivel 2 territorial | Depende de `paises` (`id_pais`). Tiene `UNIQUE(id_pais, nombre)` para evitar duplicados. |
| `localidades` | Nivel 3 territorial (pedido del profe) | Depende de `provincias` (`id_provincia`). Tiene `UNIQUE(id_provincia, nombre)` y `RESTRICT` implícito al borrar (no se puede eliminar una ciudad que tiene clientes). |
| `compania_envio_localidad` | Cobertura de envíos (relación M:N) | Une `companias_envio` con `localidades` usando PK compuesta `(id_compania, id_localidad)`, más `costo_envio` y `dias_entrega`. |
| `tipos_documento` | Documentos internacionales | Catálogo con `DNI`, `PASAPORTE`, `CPF`, `RUT`, `CI_UY`, `SSN` y sus longitudes válidas. |
| `estados_pedido` | Catálogo de estados | Reemplaza la rigidez del `ENUM`: permite sumar nuevos estados con un `INSERT` sin hacer `ALTER TABLE`. |
| `bonificaciones` | Historial de bonos a empleados | Registra cada bonificación (`cumpleanos`, `antiguedad`, `otro`) como un hecho histórico, no como una columna fija en `empleados`. |

### 2.2 Mejoras sobre las 8 tablas existentes

* **`clientes`:** suma `id_localidad` (FK), dirección desglosada (`calle`, `numero` como `VARCHAR` porque existen direcciones como `"km 5"`, `piso`, `departamento`, `codigo_postal`, `direccion_referencia`), documento internacional (`id_tipo_documento`, `numero_documento`, `id_pais_emisor` con `UNIQUE` compuesto para que dos pasaportes de distinto país no choquen), baja lógica (`activo`) e índice en `apellido`.
* **`empleados`:** suma `fecha_nacimiento`, `fecha_ingreso`, `fecha_salida` e `id_localidad` (FK).
* **`proveedores`:** suma `id_localidad` (FK).
* **`productos`:** suma `moneda` (default `'ARS'`), `activo` (baja lógica) e índice en `nombre`.
* **`pedidos`:**
  * `id_cliente` e `id_empleado` pasaron a ser `NOT NULL` (imposible registrar ventas huérfanas).
  * Suma `id_localidad_envio` (FK para informes) y `direccion_envio` (texto congelado).
  * Suma `moneda` (`'ARS'`), `tipo_cambio` (instantánea al momento de vender) e `id_estado` (FK a `estados_pedido`).
  * Suma índices en `fecha` y `(id_cliente, fecha)` para acelerar informes por rango.
* **`detalles_pedido`:** suma `CHECK (subtotal = cantidad * precio_unitario)` para que la propia base impida guardar subtotales incoherentes.
* **`usuario`:** suma `id_empleado` (`UNIQUE` FK a `empleados`), `email` y `rol`.
* **Collation global:** todas las tablas quedaron en `utf8mb4_unicode_ci` (a diferencia de `general_ci`, distingue `"Nuñez"` de `"Nunez"`).

---

## 3. Qué cambió en el código de la API (`src/`)

Se respetó la arquitectura en capas del proyecto (**Routes → Validators → Controllers → Models → Prisma**).

### Archivos nuevos
* `src/routes/territorio.routes.ts`
* `src/controllers/territorio.controller.ts`
* `src/models/territorio.model.ts`
* `src/validators/territorio.validators.ts`
* Conectado en `src/app.ts` mediante `app.use('/api', territorioRoutes);`.

### Archivos modificados

| Módulo | Archivos editados | Qué se agregó |
| :--- | :--- | :--- |
| **Empleados** | `empleados.model.ts`<br>`empleados.validators.ts` | Acepta `fecha_nacimiento`, `fecha_ingreso`, `fecha_salida` e `id_localidad` (validando existencia real en BD). Calcula `edad` y `anios_antiguedad` al vuelo sin guardarlos en MySQL. Suma filtro `?id_localidad=`. |
| **Clientes** | `clientes.model.ts`<br>`clientes.validators.ts` | Acepta dirección normalizada (`id_localidad`, `calle`, `numero`, etc.) y campos de documento internacional validando que los IDs existan en sus tablas. Devuelve localidad, provincia, país y tipo de documento en los `GET`. Suma filtros `?id_localidad=` y `?numero_documento=`. |
| **Proveedores** | `proveedores.model.ts`<br>`proveedores.validators.ts` | Acepta `id_localidad` (validando existencia en BD), devuelve localidad/provincia/país y suma filtro `?id_localidad=`. |
| **Pedidos** | `pedidos.model.ts`<br>`pedidos.validators.ts` | Hace obligatorio `id_empleado`. Aplica el patrón de instantánea: si no se manda dirección de envío al crear, congela automáticamente la dirección actual del cliente. Sincroniza `estado` (ENUM) con `id_estado` (catálogo). Acepta `moneda`, `tipo_cambio` y filtro `?id_localidad=`. |
| **Informes** | `informe.model.ts`<br>`informe.controller.ts`<br>`informe.routes.ts` | Nueva consulta SQL pura (`resumenPorLocalidad`) agrupando clientes y pedidos por separado antes de unirlos (evita multiplicar filas). Expuesto dentro de `GET /api/informe` y en `GET /api/informe/localidades`. |
| **Compañías** | `companias.model.ts`<br>`companias.controller.ts`<br>`companias.routes.ts` | Endpoints de cobertura M:N sobre `compania_envio_localidad` (listar, agregar y quitar localidades cubiertas con costo y días de entrega). |

---

## 4. Mapa de endpoints nuevos y actualizados (para probar)

### Territorio
* `GET /api/paises` — Lista países activos.
* `GET /api/provincias?id_pais=1` — Lista provincias (filtrable por país y nombre).
* `GET /api/localidades?id_provincia=16` — Lista localidades con su provincia y país.
* `GET /api/localidades/:id` — Detalle de una localidad con conteo de clientes, proveedores y empleados.
* `POST /api/localidades` — Crea una localidad validando que exista la provincia.
* `DELETE /api/localidades/:id` — Intenta borrarla; si tiene clientes asignados, MySQL la protege (`RESTRICT`) y la API responde `409`.

### Filtros y relaciones agregadas
* `GET /api/clientes?id_localidad=1` — Filtra clientes de Bariloche (o `2` para El Bolsón).
* `GET /api/empleados?id_localidad=1` — Filtra empleados por localidad y devuelve `edad` y `anios_antiguedad` calculados.
* `GET /api/proveedores?id_localidad=1` — Filtra proveedores por localidad.
* `GET /api/pedidos?id_localidad=1` — Filtra pedidos por localidad de entrega y muestra `direccion_envio`, `moneda` y `tipo_cambio`.

### Informes y cobertura M:N
* `GET /api/informe/localidades` — Clientes, pedidos y facturación agrupados por localidad, provincia y país.
* `GET /api/informe` — Informe general (ahora incluye `resumen_por_localidad`).
* `GET /api/companias/1/localidades` — Localidades cubiertas por Andreani con costo y días de entrega.
* `POST /api/companias/:id/localidades` — Agrega cobertura (`{ "id_localidad": 3, "costo_envio": 4500, "dias_entrega": 2 }`).
* `DELETE /api/companias/:id/localidades/:idLocalidad` — Quita una localidad de la cobertura.

---

## 5. Cómo levantar estos cambios en otra compu (pasos para Leo)

1. Hacer `git pull` para bajar los cambios del repositorio.
2. Importar el archivo `database.sql` actualizado en phpMyAdmin (recrea la base `distribuidora_ipap` completa con las 15 tablas y los datos de ejemplo).
3. En la terminal dentro del proyecto correr:
   ```bash
   npm install
   npx prisma generate
   npx tsc --noEmit
   npm run dev