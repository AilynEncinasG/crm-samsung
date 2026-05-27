# CRM Samsung - Sistema de Integracion Comercial e Inventario

Sistema web CRM desarrollado con Django REST Framework, React, SQL Server en la nube, Data Warehouse y Power BI.

## Arquitectura

React -> Django REST API -> SQL Server Transaccional -> ETL Django -> Data Warehouse -> Power BI

## Tecnologias

- Python
- Django
- Django REST Framework
- React
- Vite
- Docker
- SQL Server
- Data Warehouse
- Power BI
- Git / GitHub

## Modulos principales

- Dashboard operativo
- Clientes
- Productos
- Inventario
- Ventas
- Compras
- Proveedores
- Repartidores
- Seguimiento de pedidos
- Reportes Data Warehouse
- ETL hacia DW_Samsung

## Bases de datos

### Base transaccional

samsung_electronics

Contiene la operacion diaria del sistema:

- Clientes
- Productos
- Pedidos
- Detalle de pedidos
- Compras
- Proveedores
- Inventario
- Stock
- Movimientos
- Usuarios
- Auditoria

### Data Warehouse

DW_Samsung

Modelo estrella:

- Dim_Cliente
- Dim_Producto
- Dim_Empleado
- Dim_Logistica
- Dim_Fecha
- Fact_Ventas_Global

## Configuracion del proyecto

### 1. Copiar variables de entorno

Backend:

```bash
cd backend
cp .env.example .env
```

Frontend:

```bash
cd frontend
cp .env.example .env
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

### 2. Levantar con Docker

Desde la raiz del proyecto:

```bash
docker compose up --build
```

### 3. Accesos

Frontend:

```text
http://localhost:5173/
```

Backend:

```text
http://localhost:8000/api/
```

Health check:

```text
http://localhost:8000/api/health/
```

## Ejecutar ETL

Con Docker corriendo:

```bash
docker compose exec backend python manage.py cargar_dw
```

Este comando extrae datos desde la base transaccional, transforma dimensiones y hechos, y carga el Data Warehouse.

## Power BI

Power BI debe conectarse al Data Warehouse:

```text
Servidor: DW_Samsung.mssql.somee.com
Base de datos: DW_Samsung
Modo: Importar
```

Tablas recomendadas:

- Dim_Cliente
- Dim_Producto
- Dim_Empleado
- Dim_Logistica
- Dim_Fecha
- Fact_Ventas_Global

Relaciones recomendadas:

- Fact_Ventas_Global.FechaKey -> Dim_Fecha.FechaKey
- Fact_Ventas_Global.ClienteKey -> Dim_Cliente.ClienteKey
- Fact_Ventas_Global.ProductoKey -> Dim_Producto.ProductoKey
- Fact_Ventas_Global.EmpleadoKey -> Dim_Empleado.EmpleadoKey
- Fact_Ventas_Global.LogisticaKey -> Dim_Logistica.LogisticaKey

Medidas DAX recomendadas:

```DAX
Total Ingresos = SUM(Fact_Ventas_Global[IngresoBruto])
```

```DAX
Total Costos = SUM(Fact_Ventas_Global[CostoTotalLote])
```

```DAX
Utilidad Neta = SUM(Fact_Ventas_Global[UtilidadNeta])
```

```DAX
Cantidad Vendida = SUM(Fact_Ventas_Global[CantidadVendida])
```

```DAX
Satisfaccion Promedio = AVERAGE(Fact_Ventas_Global[PuntajeSatisfaccion])
```

```DAX
Margen % = DIVIDE([Utilidad Neta], [Total Ingresos], 0)
```

## Flujo funcional del sistema

### Ventas

1. El usuario registra una venta desde React.
2. React envia los datos a Django REST API.
3. Django registra el pedido y su detalle en SQL Server.
4. SQL Server ejecuta el trigger de venta.
5. El stock se descuenta automaticamente.
6. El sistema actualiza el lote.
7. Se registra un movimiento de inventario como SALIDA_VENTA.

### Compras

1. El usuario registra una compra desde React.
2. React envia los datos a Django REST API.
3. Django registra la orden de compra y su detalle.
4. SQL Server ejecuta el trigger de compra.
5. El stock aumenta automaticamente.
6. Se crea un lote nuevo.
7. Se registra un movimiento de inventario como ENTRADA_COMPRA.

### Data Warehouse

1. El usuario ejecuta el comando ETL.
2. Django extrae datos desde la base transaccional.
3. El proceso transforma los datos en dimensiones y hechos.
4. Los datos son cargados en DW_Samsung.
5. Power BI consume el Data Warehouse para reportes gerenciales.

## Eliminacion logica

El sistema aplica eliminacion logica para evitar perdida de informacion historica.

Entidades con eliminacion logica:

- Clientes
- Productos
- Proveedores
- Repartidores

Cuando una entidad se desactiva:

- No aparece en nuevos registros operativos.
- No se elimina fisicamente de la base.
- Puede ser reactivada posteriormente.
- Sus datos historicos se conservan para trazabilidad.

## Comandos utiles

Levantar proyecto:

```bash
docker compose up --build
```

Detener contenedores:

```bash
docker compose down
```

Ejecutar ETL:

```bash
docker compose exec backend python manage.py cargar_dw
```

Ver estado de Git:

```bash
git status
```

Primer commit:

```bash
git add .
git commit -m "Inicializa sistema CRM Samsung con Django React Docker SQL Server DW y Power BI"
```

Subir a GitHub:

```bash
git branch -M main
git remote add origin https://github.com/TU_USUARIO/crm-samsung.git
git push -u origin main
```

## Seguridad

No subir archivos .env reales al repositorio.

Archivos que no deben subirse:

- backend/.env
- frontend/.env
- credenciales reales
- contrasenas
- SECRET_KEY real

Archivos que si deben subirse:

- backend/.env.example
- frontend/.env.example

## Autores

- Ailyn Lenny Encinas Gutierrez
- Denilson Asis Saavedra Mamani

## Proyecto academico

Sistema de integracion CRM para el mejoramiento del control y seguimiento de la informacion comercial e inventario en la gestion empresarial aplicada a Samsung.
