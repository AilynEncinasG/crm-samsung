from datetime import datetime
from django.core.management.base import BaseCommand
from django.db import connections, transaction


class Command(BaseCommand):
    help = 'Carga datos desde la base transaccional hacia el Data Warehouse'

    def handle(self, *args, **kwargs):
        self.stdout.write('Iniciando carga del Data Warehouse...')

        with transaction.atomic(using='dw'):
            self.limpiar_dw()
            fecha_map = self.cargar_dim_fecha()
            cliente_map = self.cargar_dim_cliente()
            producto_map = self.cargar_dim_producto()
            empleado_map = self.cargar_dim_empleado()
            logistica_map = self.cargar_dim_logistica()
            total_facts = self.cargar_fact_ventas(
                fecha_map,
                cliente_map,
                producto_map,
                empleado_map,
                logistica_map,
            )

        self.stdout.write(
            self.style.SUCCESS(
                f'Data Warehouse cargado correctamente. Registros en Fact_Ventas_Global: {total_facts}'
            )
        )

    def limpiar_dw(self):
        with connections['dw'].cursor() as cursor:
            tablas = [
                'Fact_Ventas_Global',
                'Dim_Cliente',
                'Dim_Producto',
                'Dim_Empleado',
                'Dim_Logistica',
                'Dim_Fecha',
            ]

            for tabla in tablas:
                cursor.execute(f'DELETE FROM {tabla};')

            reiniciar_identidad = [
                'Fact_Ventas_Global',
                'Dim_Cliente',
                'Dim_Producto',
                'Dim_Empleado',
                'Dim_Logistica',
            ]

            for tabla in reiniciar_identidad:
                cursor.execute(f"DBCC CHECKIDENT ('{tabla}', RESEED, 0);")

        self.stdout.write('DW limpiado correctamente.')

    def cargar_dim_fecha(self):
        fecha_map = {}

        with connections['default'].cursor() as origen:
            origen.execute("""
                SELECT DISTINCT CONVERT(DATE, P.FechaPedido) AS Fecha
                FROM Pedido P
                INNER JOIN Cliente C ON C.ID = P.ClienteID
                INNER JOIN DetallePedido DP ON DP.PedidoID = P.ID
                INNER JOIN Producto PR ON PR.ID = DP.ProductoID
                WHERE C.Activo = 1
                  AND PR.Activo = 1
                ORDER BY Fecha
            """)

            fechas = origen.fetchall()

        with connections['dw'].cursor() as destino:
            for row in fechas:
                fecha = row[0]

                if isinstance(fecha, str):
                    fecha = datetime.strptime(fecha, '%Y-%m-%d').date()

                fecha_key = int(fecha.strftime('%Y%m%d'))
                mes_nombre = fecha.strftime('%B')
                trimestre = ((fecha.month - 1) // 3) + 1
                es_fin_semana = 1 if fecha.weekday() >= 5 else 0

                destino.execute("""
                    INSERT INTO Dim_Fecha (
                        FechaKey,
                        Fecha,
                        Anio,
                        Mes,
                        MesNombre,
                        Trimestre,
                        EsFinDeSemana
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, [
                    fecha_key,
                    fecha,
                    fecha.year,
                    fecha.month,
                    mes_nombre,
                    trimestre,
                    es_fin_semana,
                ])

                fecha_map[fecha] = fecha_key

        self.stdout.write(f'Dim_Fecha cargada: {len(fecha_map)} registros.')
        return fecha_map

    def cargar_dim_cliente(self):
        cliente_map = {}

        with connections['default'].cursor() as origen:
            origen.execute("""
                SELECT
                    ID,
                    CONCAT(Nombre, ' ', ISNULL(Apellidos, '')) AS NombreCompleto,
                    Email,
                    Segmento
                FROM Cliente
                WHERE Activo = 1
                ORDER BY ID
            """)

            clientes = origen.fetchall()

        with connections['dw'].cursor() as destino:
            for cliente in clientes:
                id_original, nombre_completo, email, segmento = cliente

                destino.execute("""
                    INSERT INTO Dim_Cliente (
                        ID_Original,
                        NombreCompleto,
                        Email,
                        Segmento
                    )
                    OUTPUT INSERTED.ClienteKey
                    VALUES (%s, %s, %s, %s)
                """, [
                    id_original,
                    nombre_completo,
                    email,
                    segmento,
                ])

                cliente_key = destino.fetchone()[0]
                cliente_map[id_original] = cliente_key

        self.stdout.write(f'Dim_Cliente cargada: {len(cliente_map)} registros.')
        return cliente_map

    def cargar_dim_producto(self):
        producto_map = {}

        with connections['default'].cursor() as origen:
            origen.execute("""
                SELECT
                    PR.ID,
                    PR.Nombre,
                    ISNULL(CAT.NombreCategoria, 'Sin categoría') AS Categoria,
                    PR.Gama
                FROM Producto PR
                LEFT JOIN Categoria CAT ON CAT.ID = PR.CategoriaID
                WHERE PR.Activo = 1
                ORDER BY PR.ID
            """)

            productos = origen.fetchall()

        with connections['dw'].cursor() as destino:
            for producto in productos:
                id_original, nombre_producto, categoria, gama = producto

                destino.execute("""
                    INSERT INTO Dim_Producto (
                        ID_Original,
                        NombreProducto,
                        Categoria,
                        Gama
                    )
                    OUTPUT INSERTED.ProductoKey
                    VALUES (%s, %s, %s, %s)
                """, [
                    id_original,
                    nombre_producto,
                    categoria,
                    gama,
                ])

                producto_key = destino.fetchone()[0]
                producto_map[id_original] = producto_key

        self.stdout.write(f'Dim_Producto cargada: {len(producto_map)} registros.')
        return producto_map

    def cargar_dim_empleado(self):
        empleado_map = {}

        with connections['default'].cursor() as origen:
            origen.execute("""
                SELECT
                    E.ID,
                    CONCAT(E.Nombre, ' ', ISNULL(E.Apellido, '')) AS NombreCompleto,
                    E.Cargo,
                    ISNULL(T.NombreTienda, 'Sin tienda') AS Tienda,
                    ISNULL(T.Ciudad, 'Sin ciudad') AS CiudadTienda
                FROM Empleado E
                LEFT JOIN Tienda T ON T.ID = E.TiendaID
                ORDER BY E.ID
            """)

            empleados = origen.fetchall()

        with connections['dw'].cursor() as destino:
            for empleado in empleados:
                id_original, nombre_completo, cargo, tienda, ciudad = empleado

                destino.execute("""
                    INSERT INTO Dim_Empleado (
                        ID_Original,
                        NombreCompleto,
                        Cargo,
                        Tienda,
                        CiudadTienda
                    )
                    OUTPUT INSERTED.EmpleadoKey
                    VALUES (%s, %s, %s, %s, %s)
                """, [
                    id_original,
                    nombre_completo,
                    cargo,
                    tienda,
                    ciudad,
                ])

                empleado_key = destino.fetchone()[0]
                empleado_map[id_original] = empleado_key

        self.stdout.write(f'Dim_Empleado cargada: {len(empleado_map)} registros.')
        return empleado_map

    def cargar_dim_logistica(self):
        logistica_map = {}

        with connections['default'].cursor() as origen:
            origen.execute("""
                SELECT DISTINCT
                    ISNULL(R.NombreCompleto, 'Sin repartidor') AS RepartidorNombre,
                    ISNULL(R.Vehiculo, 'Sin vehículo') AS Vehiculo,
                    ISNULL(P.MetodoEnvio, 'Sin método') AS MetodoEnvio,
                    ISNULL(A.NombreAlmacen, 'Sin almacén') AS AlmacenOrigen
                FROM Pedido P
                LEFT JOIN Repartidor R ON R.ID = P.RepartidorID
                LEFT JOIN Almacen A ON A.ID = P.AlmacenOrigenID
                INNER JOIN Cliente C ON C.ID = P.ClienteID
                WHERE C.Activo = 1
            """)

            registros = origen.fetchall()

        with connections['dw'].cursor() as destino:
            for row in registros:
                repartidor, vehiculo, metodo_envio, almacen = row
                clave = (repartidor, vehiculo, metodo_envio, almacen)

                destino.execute("""
                    INSERT INTO Dim_Logistica (
                        RepartidorNombre,
                        Vehiculo,
                        MetodoEnvio,
                        AlmacenOrigen
                    )
                    OUTPUT INSERTED.LogisticaKey
                    VALUES (%s, %s, %s, %s)
                """, [
                    repartidor,
                    vehiculo,
                    metodo_envio,
                    almacen,
                ])

                logistica_key = destino.fetchone()[0]
                logistica_map[clave] = logistica_key

        self.stdout.write(f'Dim_Logistica cargada: {len(logistica_map)} registros.')
        return logistica_map

    def cargar_fact_ventas(
        self,
        fecha_map,
        cliente_map,
        producto_map,
        empleado_map,
        logistica_map,
    ):
        total_insertados = 0
        total_omitidos = 0

        with connections['default'].cursor() as origen:
            origen.execute("""
                SELECT
                    CONVERT(DATE, P.FechaPedido) AS Fecha,
                    C.ID AS ClienteID,
                    PR.ID AS ProductoID,
                    E.ID AS EmpleadoID,
                    ISNULL(R.NombreCompleto, 'Sin repartidor') AS RepartidorNombre,
                    ISNULL(R.Vehiculo, 'Sin vehículo') AS Vehiculo,
                    ISNULL(P.MetodoEnvio, 'Sin método') AS MetodoEnvio,
                    ISNULL(A.NombreAlmacen, 'Sin almacén') AS AlmacenOrigen,
                    DP.Cantidad AS CantidadVendida,
                    DP.Cantidad * DP.PrecioUnitarioVenta AS IngresoBruto,
                    DP.Cantidad * DP.CostoUnitarioHistorico AS CostoTotalLote,
                    P.SatisfaccionCliente,
                    P.ErrorEnOrden,
                    CASE
                        WHEN P.FechaEntregaReal IS NULL THEN NULL
                        ELSE DATEDIFF(DAY, P.FechaPedido, P.FechaEntregaReal)
                    END AS TiempoEntregaDias,
                    E.Capacitado
                FROM DetallePedido DP
                INNER JOIN Pedido P ON P.ID = DP.PedidoID
                INNER JOIN Cliente C ON C.ID = P.ClienteID
                INNER JOIN Producto PR ON PR.ID = DP.ProductoID
                INNER JOIN Empleado E ON E.ID = P.EmpleadoID
                LEFT JOIN Repartidor R ON R.ID = P.RepartidorID
                LEFT JOIN Almacen A ON A.ID = P.AlmacenOrigenID
            """)

            ventas = origen.fetchall()

        self.stdout.write(f'Ventas encontradas en OLTP: {len(ventas)} registros.')

        with connections['dw'].cursor() as destino:
            for venta in ventas:
                (
                    fecha,
                    cliente_id,
                    producto_id,
                    empleado_id,
                    repartidor,
                    vehiculo,
                    metodo_envio,
                    almacen,
                    cantidad_vendida,
                    ingreso_bruto,
                    costo_total_lote,
                    satisfaccion,
                    error_en_pedido,
                    tiempo_entrega_dias,
                    capacitado,
                ) = venta

                # Normalizar fecha para que coincida con Dim_Fecha
                if isinstance(fecha, datetime):
                    fecha = fecha.date()

                if isinstance(fecha, str):
                    fecha = datetime.strptime(fecha[:10], '%Y-%m-%d').date()

                fecha_key = fecha_map.get(fecha)
                cliente_key = cliente_map.get(cliente_id)
                producto_key = producto_map.get(producto_id)
                empleado_key = empleado_map.get(empleado_id)

                clave_logistica = (
                    repartidor or 'Sin repartidor',
                    vehiculo or 'Sin vehículo',
                    metodo_envio or 'Sin método',
                    almacen or 'Sin almacén',
                )

                logistica_key = logistica_map.get(clave_logistica)

                if (
                    fecha_key is None or
                    cliente_key is None or
                    producto_key is None or
                    empleado_key is None or
                    logistica_key is None
                ):
                    total_omitidos += 1

                    self.stdout.write(
                        self.style.WARNING(
                            'Venta omitida -> '
                            f'fecha_key={fecha_key}, '
                            f'cliente_key={cliente_key}, '
                            f'producto_key={producto_key}, '
                            f'empleado_key={empleado_key}, '
                            f'logistica_key={logistica_key}, '
                            f'clave_logistica={clave_logistica}'
                        )
                    )

                    continue

                destino.execute("""
                    INSERT INTO Fact_Ventas_Global (
                        FechaKey,
                        ClienteKey,
                        ProductoKey,
                        EmpleadoKey,
                        LogisticaKey,
                        CantidadVendida,
                        IngresoBruto,
                        CostoTotalLote,
                        PuntajeSatisfaccion,
                        ErrorEnPedido,
                        TiempoEntregaDias,
                        EsCapacitado
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, [
                    fecha_key,
                    cliente_key,
                    producto_key,
                    empleado_key,
                    logistica_key,
                    cantidad_vendida,
                    ingreso_bruto,
                    costo_total_lote,
                    satisfaccion,
                    error_en_pedido,
                    tiempo_entrega_dias,
                    capacitado,
                ])

                total_insertados += 1

        self.stdout.write(f'Ventas insertadas en Fact_Ventas_Global: {total_insertados}')
        self.stdout.write(f'Ventas omitidas: {total_omitidos}')

        return total_insertados