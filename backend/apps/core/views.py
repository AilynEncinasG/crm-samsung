from django.db import connection, connections, transaction
from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import (
    Tienda, Departamento, Empleado, Rol, Almacen, Usuario, Categoria, Producto,
    StockAlmacen, Lote, MovimientoInventario, Repartidor, Cliente, Pedido,
    DetallePedido, Proveedor, OrdenCompra, DetalleCompra, Auditoria
)
from .serializers import (
    TiendaSerializer, DepartamentoSerializer, EmpleadoSerializer, RolSerializer,
    AlmacenSerializer, UsuarioSerializer, CategoriaSerializer, ProductoSerializer,
    StockAlmacenSerializer, LoteSerializer, MovimientoInventarioSerializer,
    RepartidorSerializer, ClienteSerializer, PedidoSerializer, DetallePedidoSerializer,
    ProveedorSerializer, OrdenCompraSerializer, DetalleCompraSerializer, AuditoriaSerializer
)
from apps.integraciones.services.odoo_client import OdooClient

class TiendaViewSet(viewsets.ModelViewSet):
    queryset = Tienda.objects.all()
    serializer_class = TiendaSerializer


class DepartamentoViewSet(viewsets.ModelViewSet):
    queryset = Departamento.objects.all()
    serializer_class = DepartamentoSerializer


class EmpleadoViewSet(viewsets.ModelViewSet):
    queryset = Empleado.objects.select_related('tienda', 'departamento').all()
    serializer_class = EmpleadoSerializer


class RolViewSet(viewsets.ModelViewSet):
    queryset = Rol.objects.all()
    serializer_class = RolSerializer


class AlmacenViewSet(viewsets.ModelViewSet):
    queryset = Almacen.objects.select_related('tienda').all()
    serializer_class = AlmacenSerializer


class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.select_related('empleado', 'almacen_asignado', 'rol').all()
    serializer_class = UsuarioSerializer


class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer


class ProductoViewSet(viewsets.ModelViewSet):
    serializer_class = ProductoSerializer
    queryset = Producto.objects.all()

    def get_queryset(self):
        incluir_inactivos = self.request.query_params.get('incluir_inactivos')

        if incluir_inactivos == '1':
            return Producto.objects.all().order_by('id')

        return Producto.objects.filter(activo=True).order_by('id')

    def perform_destroy(self, instance):
        instance.activo = False
        instance.save()


class StockAlmacenViewSet(viewsets.ModelViewSet):
    queryset = StockAlmacen.objects.select_related('almacen', 'producto').all()
    serializer_class = StockAlmacenSerializer


class LoteViewSet(viewsets.ModelViewSet):
    queryset = Lote.objects.select_related('producto', 'almacen').all()
    serializer_class = LoteSerializer


class MovimientoInventarioViewSet(viewsets.ModelViewSet):
    queryset = MovimientoInventario.objects.select_related('producto', 'almacen', 'lote', 'usuario').all()
    serializer_class = MovimientoInventarioSerializer


class RepartidorViewSet(viewsets.ModelViewSet):
    serializer_class = RepartidorSerializer
    queryset = Repartidor.objects.all()

    def get_queryset(self):
        incluir_inactivos = self.request.query_params.get('incluir_inactivos')

        if incluir_inactivos == '1':
            return Repartidor.objects.all().order_by('id')

        return Repartidor.objects.filter(activo=True).order_by('id')

    def perform_destroy(self, instance):
        instance.activo = False
        instance.save()


class ClienteViewSet(viewsets.ModelViewSet):
    serializer_class = ClienteSerializer
    queryset = Cliente.objects.all()

    def get_queryset(self):
        incluir_inactivos = self.request.query_params.get('incluir_inactivos')

        if incluir_inactivos == '1':
            return Cliente.objects.all().order_by('id')

        return Cliente.objects.filter(activo=True).order_by('id')

    def perform_destroy(self, instance):
        instance.activo = False
        instance.save()


class PedidoViewSet(viewsets.ModelViewSet):
    queryset = Pedido.objects.select_related('cliente', 'empleado', 'almacen_origen', 'repartidor').all()
    serializer_class = PedidoSerializer


class DetallePedidoViewSet(viewsets.ModelViewSet):
    queryset = DetallePedido.objects.select_related('pedido', 'producto', 'lote').all()
    serializer_class = DetallePedidoSerializer


class ProveedorViewSet(viewsets.ModelViewSet):
    serializer_class = ProveedorSerializer
    queryset = Proveedor.objects.all()

    def get_queryset(self):
        incluir_inactivos = self.request.query_params.get('incluir_inactivos')

        if incluir_inactivos == '1':
            return Proveedor.objects.all().order_by('id')

        return Proveedor.objects.filter(activo=True).order_by('id')

    def perform_destroy(self, instance):
        instance.activo = False
        instance.save()


class OrdenCompraViewSet(viewsets.ModelViewSet):
    queryset = OrdenCompra.objects.select_related('proveedor', 'almacen_destino').all()
    serializer_class = OrdenCompraSerializer


class DetalleCompraViewSet(viewsets.ModelViewSet):
    queryset = DetalleCompra.objects.select_related('orden_compra', 'producto').all()
    serializer_class = DetalleCompraSerializer


class AuditoriaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Auditoria.objects.select_related('usuario').all()
    serializer_class = AuditoriaSerializer


def fetch_one(sql, params=None, using='default'):
    with connections[using].cursor() as cursor:
        cursor.execute(sql, params or [])
        row = cursor.fetchone()
        return row[0] if row else 0


@api_view(['GET'])
def health(request):
    return Response({'status': 'ok', 'service': 'CRM Samsung API'})


@api_view(['GET'])
def dashboard(request):
    def fetch_all(sql, params=None):
        with connections['default'].cursor() as cursor:
            cursor.execute(sql, params or [])
            columns = [col[0] for col in cursor.description]
            return [
                dict(zip(columns, row))
                for row in cursor.fetchall()
            ]

    kpis = {
        'clientes': fetch_one('SELECT COUNT(*) FROM Cliente WHERE Activo = 1'),
        'productos': fetch_one('SELECT COUNT(*) FROM Producto WHERE Activo = 1'),
        'pedidos': fetch_one("""
            SELECT COUNT(*)
            FROM Pedido P
            INNER JOIN Cliente C ON C.ID = P.ClienteID
            WHERE C.Activo = 1
        """),
        'ventas_total': fetch_one("""
            SELECT COALESCE(SUM(P.Total), 0)
            FROM Pedido P
            INNER JOIN Cliente C ON C.ID = P.ClienteID
            WHERE C.Activo = 1
        """),
        'stock_total': fetch_one('SELECT COALESCE(SUM(StockTotal), 0) FROM StockAlmacen'),
        'compras_total': fetch_one('SELECT COALESCE(SUM(Total), 0) FROM OrdenCompra'),
    }

    ultimos_pedidos = fetch_all("""
        SELECT TOP 5
            P.ID AS id,
            CONCAT(C.Nombre, ' ', ISNULL(C.Apellidos, '')) AS cliente,
            CONVERT(VARCHAR(10), P.FechaPedido, 103) AS fecha,
            P.Total AS total,
            P.Estado AS estado
        FROM Pedido P
        INNER JOIN Cliente C ON C.ID = P.ClienteID
        WHERE C.Activo = 1
        ORDER BY P.ID DESC
    """)

    productos_mas_vendidos = fetch_all("""
        SELECT TOP 5
            PR.Nombre AS producto,
            SUM(DP.Cantidad) AS cantidad_vendida,
            SUM(DP.Cantidad * DP.PrecioUnitarioVenta) AS ingreso_total
        FROM DetallePedido DP
        INNER JOIN Producto PR ON PR.ID = DP.ProductoID
        INNER JOIN Pedido P ON P.ID = DP.PedidoID
        INNER JOIN Cliente C ON C.ID = P.ClienteID
        WHERE C.Activo = 1 AND PR.Activo = 1
        GROUP BY PR.Nombre
        ORDER BY cantidad_vendida DESC
    """)

    stock_bajo = fetch_all("""
        SELECT TOP 5
            PR.Nombre AS producto,
            A.NombreAlmacen AS almacen,
            SA.StockTotal AS stock
        FROM StockAlmacen SA
        INNER JOIN Producto PR ON PR.ID = SA.ProductoID
        INNER JOIN Almacen A ON A.ID = SA.AlmacenID
        WHERE SA.StockTotal <= 5
        ORDER BY SA.StockTotal ASC
    """)

    return Response({
        'kpis': kpis,
        'ultimos_pedidos': ultimos_pedidos,
        'productos_mas_vendidos': productos_mas_vendidos,
        'stock_bajo': stock_bajo,
    })


@api_view(['GET'])
def dashboard_dw(request):
    def fetch_one_dw(sql, params=None):
        with connections['dw'].cursor() as cursor:
            cursor.execute(sql, params or [])
            row = cursor.fetchone()
            return row[0] if row else 0

    def fetch_all_dw(sql, params=None):
        with connections['dw'].cursor() as cursor:
            cursor.execute(sql, params or [])
            columns = [col[0] for col in cursor.description]
            return [
                dict(zip(columns, row))
                for row in cursor.fetchall()
            ]

    kpis = {
        'registros_fact': fetch_one_dw("""
            SELECT COUNT(*) 
            FROM Fact_Ventas_Global
        """),
        'ingreso_bruto': fetch_one_dw("""
            SELECT COALESCE(SUM(IngresoBruto), 0) 
            FROM Fact_Ventas_Global
        """),
        'costo_total': fetch_one_dw("""
            SELECT COALESCE(SUM(CostoTotalLote), 0) 
            FROM Fact_Ventas_Global
        """),
        'utilidad_neta': fetch_one_dw("""
            SELECT COALESCE(SUM(UtilidadNeta), 0) 
            FROM Fact_Ventas_Global
        """),
        'cantidad_vendida': fetch_one_dw("""
            SELECT COALESCE(SUM(CantidadVendida), 0) 
            FROM Fact_Ventas_Global
        """),
        'satisfaccion_promedio': fetch_one_dw("""
            SELECT COALESCE(AVG(CAST(PuntajeSatisfaccion AS FLOAT)), 0) 
            FROM Fact_Ventas_Global
        """),
    }

    ventas_por_producto = fetch_all_dw("""
        SELECT TOP 5
            DP.NombreProducto AS producto,
            SUM(F.CantidadVendida) AS cantidad,
            SUM(F.IngresoBruto) AS ingreso,
            SUM(F.UtilidadNeta) AS utilidad
        FROM Fact_Ventas_Global F
        INNER JOIN Dim_Producto DP ON DP.ProductoKey = F.ProductoKey
        GROUP BY DP.NombreProducto
        ORDER BY cantidad DESC
    """)

    ventas_por_cliente = fetch_all_dw("""
        SELECT TOP 5
            DC.NombreCompleto AS cliente,
            SUM(F.CantidadVendida) AS cantidad,
            SUM(F.IngresoBruto) AS ingreso
        FROM Fact_Ventas_Global F
        INNER JOIN Dim_Cliente DC ON DC.ClienteKey = F.ClienteKey
        GROUP BY DC.NombreCompleto
        ORDER BY ingreso DESC
    """)

    ventas_por_fecha = fetch_all_dw("""
        SELECT
            CONVERT(VARCHAR(10), DF.Fecha, 103) AS fecha,
            SUM(F.IngresoBruto) AS ingreso,
            SUM(F.UtilidadNeta) AS utilidad
        FROM Fact_Ventas_Global F
        INNER JOIN Dim_Fecha DF ON DF.FechaKey = F.FechaKey
        GROUP BY DF.Fecha
        ORDER BY DF.Fecha
    """)

    ventas_por_logistica = fetch_all_dw("""
        SELECT TOP 5
            DL.RepartidorNombre AS repartidor,
            DL.MetodoEnvio AS metodo_envio,
            DL.AlmacenOrigen AS almacen,
            SUM(F.CantidadVendida) AS cantidad,
            SUM(F.IngresoBruto) AS ingreso
        FROM Fact_Ventas_Global F
        INNER JOIN Dim_Logistica DL ON DL.LogisticaKey = F.LogisticaKey
        GROUP BY DL.RepartidorNombre, DL.MetodoEnvio, DL.AlmacenOrigen
        ORDER BY ingreso DESC
    """)

    return Response({
        'kpis': kpis,
        'ventas_por_producto': ventas_por_producto,
        'ventas_por_cliente': ventas_por_cliente,
        'ventas_por_fecha': ventas_por_fecha,
        'ventas_por_logistica': ventas_por_logistica,
    })

@api_view(['POST'])
def registrar_venta(request):
    data = request.data

    try:
        cliente_id = int(data.get('cliente_id'))
        empleado_id = int(data.get('empleado_id', 1))
        almacen_id = int(data.get('almacen_id'))
        repartidor_id = int(data.get('repartidor_id'))
        producto_id = int(data.get('producto_id'))
        cantidad = int(data.get('cantidad'))
        usuario_id = int(data.get('usuario_id', 1))
        metodo_envio = data.get('metodo_envio', 'Delivery')
        satisfaccion = int(data.get('satisfaccion_cliente', 5))
    except (TypeError, ValueError):
        return Response(
            {
                'error': 'Datos inválidos. Verifica cliente, producto, almacén, repartidor y cantidad.'
            },
            status=400
        )

    if cantidad <= 0:
        return Response({'error': 'La cantidad debe ser mayor a 0.'}, status=400)

    try:
        with transaction.atomic(using='default'):
            with connections['default'].cursor() as cursor:

                # Validar cliente activo
                cursor.execute("""
                    SELECT ID
                    FROM Cliente
                    WHERE ID = %s AND Activo = 1
                """, [cliente_id])

                cliente_row = cursor.fetchone()

                if not cliente_row:
                    return Response(
                        {'error': 'El cliente no existe o está inactivo.'},
                        status=404
                    )

                # Validar empleado
                cursor.execute("""
                    SELECT ID
                    FROM Empleado
                    WHERE ID = %s
                """, [empleado_id])

                empleado_row = cursor.fetchone()

                if not empleado_row:
                    return Response(
                        {'error': 'El empleado no existe.'},
                        status=404
                    )

                # Validar almacén
                cursor.execute("""
                    SELECT ID
                    FROM Almacen
                    WHERE ID = %s
                """, [almacen_id])

                almacen_row = cursor.fetchone()

                if not almacen_row:
                    return Response(
                        {'error': 'El almacén no existe.'},
                        status=404
                    )

                # Validar repartidor activo
                cursor.execute("""
                    SELECT ID
                    FROM Repartidor
                    WHERE ID = %s AND Activo = 1
                """, [repartidor_id])

                repartidor_row = cursor.fetchone()

                if not repartidor_row:
                    return Response(
                        {'error': 'El repartidor no existe o está inactivo.'},
                        status=404
                    )

                # Validar producto activo y obtener precio
                cursor.execute("""
                    SELECT PrecioVentaSugerido
                    FROM Producto
                    WHERE ID = %s AND Activo = 1
                """, [producto_id])

                producto_row = cursor.fetchone()

                if not producto_row:
                    return Response(
                        {'error': 'El producto no existe o está inactivo.'},
                        status=404
                    )

                precio_unitario = producto_row[0]

                # Validar stock disponible
                cursor.execute("""
                    SELECT StockTotal
                    FROM StockAlmacen
                    WHERE ProductoID = %s AND AlmacenID = %s
                """, [producto_id, almacen_id])

                stock_row = cursor.fetchone()

                if not stock_row:
                    return Response(
                        {'error': 'No existe stock para ese producto en ese almacén.'},
                        status=400
                    )

                stock_disponible = stock_row[0]

                if stock_disponible < cantidad:
                    return Response(
                        {'error': f'Stock insuficiente. Disponible: {stock_disponible}'},
                        status=400
                    )

                # Obtener lote disponible
                cursor.execute("""
                    SELECT TOP 1 ID, CostoCompra
                    FROM Lote
                    WHERE ProductoID = %s
                      AND AlmacenID = %s
                      AND CantidadActual >= %s
                    ORDER BY FechaIngreso ASC, ID ASC
                """, [producto_id, almacen_id, cantidad])

                lote_row = cursor.fetchone()

                if not lote_row:
                    return Response(
                        {'error': 'No existe lote disponible para este producto.'},
                        status=400
                    )

                lote_id = lote_row[0]
                costo_unitario = lote_row[1]
                total = precio_unitario * cantidad

                # Crear pedido
                cursor.execute("""
                    INSERT INTO Pedido (
                        ClienteID,
                        EmpleadoID,
                        AlmacenOrigenID,
                        RepartidorID,
                        MetodoEnvio,
                        Total,
                        Estado,
                        SatisfaccionCliente,
                        ErrorEnOrden
                    )
                    OUTPUT INSERTED.ID
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, [
                    cliente_id,
                    empleado_id,
                    almacen_id,
                    repartidor_id,
                    metodo_envio,
                    total,
                    'Pendiente',
                    satisfaccion,
                    0
                ])

                pedido_id = cursor.fetchone()[0]

                # Crear detalle de pedido
                # Esto activa el trigger TR_RestarStockVenta y descuenta StockAlmacen.
                cursor.execute("""
                    INSERT INTO DetallePedido (
                        PedidoID,
                        ProductoID,
                        LoteID,
                        Cantidad,
                        PrecioUnitarioVenta,
                        CostoUnitarioHistorico
                    )
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, [
                    pedido_id,
                    producto_id,
                    lote_id,
                    cantidad,
                    precio_unitario,
                    costo_unitario
                ])

                # Actualizar lote
                cursor.execute("""
                    UPDATE Lote
                    SET CantidadActual = CantidadActual - %s
                    WHERE ID = %s
                """, [cantidad, lote_id])

                # Registrar movimiento
                cursor.execute("""
                    INSERT INTO MovimientoInventario (
                        ProductoID,
                        AlmacenID,
                        LoteID,
                        TipoMovimiento,
                        Cantidad,
                        UsuarioID
                    )
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, [
                    producto_id,
                    almacen_id,
                    lote_id,
                    'SALIDA_VENTA',
                    cantidad,
                    usuario_id
                ])

                return Response({
                    'mensaje': 'Venta registrada correctamente',
                    'pedido_id': pedido_id,
                    'producto_id': producto_id,
                    'cantidad': cantidad,
                    'total': float(total)
                }, status=201)

    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
def registrar_compra(request):
    data = request.data

    try:
        proveedor_id = int(data.get('proveedor_id'))
        almacen_id = int(data.get('almacen_id'))
        producto_id = int(data.get('producto_id'))
        cantidad = int(data.get('cantidad'))
        precio_compra_unitario = float(data.get('precio_compra_unitario'))
        usuario_id = int(data.get('usuario_id', 1))
    except (TypeError, ValueError):
        return Response(
            {'error': 'Datos inválidos. Verifica proveedor, almacén, producto, cantidad y precio.'},
            status=400
        )

    if cantidad <= 0:
        return Response({'error': 'La cantidad debe ser mayor a 0.'}, status=400)

    if precio_compra_unitario <= 0:
        return Response({'error': 'El precio de compra debe ser mayor a 0.'}, status=400)

    try:
        with transaction.atomic(using='default'):
            with connections['default'].cursor() as cursor:
                # Validar proveedor
                cursor.execute("""
                    SELECT ID
                    FROM Proveedor
                    WHERE ID = %s AND Activo = 1
                """, [proveedor_id])

                if not cursor.fetchone():
                    return Response({'error': 'El proveedor no existe o está inactivo.'}, status=404)

                # Validar almacén
                cursor.execute("""
                    SELECT ID
                    FROM Almacen
                    WHERE ID = %s
                """, [almacen_id])

                if not cursor.fetchone():
                    return Response({'error': 'El almacén no existe.'}, status=404)

                # Validar producto
                cursor.execute("""
                    SELECT ID
                    FROM Producto
                    WHERE ID = %s AND Activo = 1
                """, [producto_id])

                if not cursor.fetchone():
                    return Response({'error': 'El producto no existe o está inactivo.'}, status=404)

                total = cantidad * precio_compra_unitario

                # Crear orden de compra
                cursor.execute("""
                    INSERT INTO OrdenCompra (
                        ProveedorID,
                        AlmacenDestinoID,
                        Total
                    )
                    OUTPUT INSERTED.ID
                    VALUES (%s, %s, %s)
                """, [
                    proveedor_id,
                    almacen_id,
                    total
                ])

                orden_compra_id = cursor.fetchone()[0]

                # Crear detalle de compra.
                # IMPORTANTE: esto activa TR_ActualizarStockCompra.
                # El trigger crea Lote y aumenta StockAlmacen.
                cursor.execute("""
                    INSERT INTO DetalleCompra (
                        OrdenCompraID,
                        ProductoID,
                        Cantidad,
                        PrecioCompraUnitario
                    )
                    VALUES (%s, %s, %s, %s)
                """, [
                    orden_compra_id,
                    producto_id,
                    cantidad,
                    precio_compra_unitario
                ])

                # Buscar el lote recién creado por el trigger
                cursor.execute("""
                    SELECT TOP 1 ID
                    FROM Lote
                    WHERE ProductoID = %s
                      AND AlmacenID = %s
                      AND CantidadInicial = %s
                      AND CostoCompra = %s
                    ORDER BY FechaIngreso DESC, ID DESC
                """, [
                    producto_id,
                    almacen_id,
                    cantidad,
                    precio_compra_unitario
                ])

                row = cursor.fetchone()
                lote_id = row[0] if row else None

                # Registrar movimiento de inventario
                cursor.execute("""
                    INSERT INTO MovimientoInventario (
                        ProductoID,
                        AlmacenID,
                        LoteID,
                        TipoMovimiento,
                        Cantidad,
                        UsuarioID
                    )
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, [
                    producto_id,
                    almacen_id,
                    lote_id,
                    'ENTRADA_COMPRA',
                    cantidad,
                    usuario_id
                ])

                return Response({
                    'mensaje': 'Compra registrada correctamente',
                    'orden_compra_id': orden_compra_id,
                    'producto_id': producto_id,
                    'cantidad': cantidad,
                    'total': total
                }, status=201)

    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['PATCH'])
def reactivar_cliente(request, cliente_id):
    try:
        cliente = Cliente.objects.get(id=cliente_id)
        cliente.activo = True
        cliente.save()

        return Response({
            'mensaje': 'Cliente reactivado correctamente',
            'cliente_id': cliente.id
        })

    except Cliente.DoesNotExist:
        return Response(
            {'error': 'Cliente no encontrado.'},
            status=404
        )

@api_view(['PATCH'])
def reactivar_producto(request, producto_id):
    try:
        producto = Producto.objects.get(id=producto_id)
        producto.activo = True
        producto.save()

        return Response({
            'mensaje': 'Producto reactivado correctamente',
            'producto_id': producto.id
        })

    except Producto.DoesNotExist:
        return Response(
            {'error': 'Producto no encontrado.'},
            status=404
        )

@api_view(['PATCH'])
def reactivar_proveedor(request, proveedor_id):
    try:
        proveedor = Proveedor.objects.get(id=proveedor_id)
        proveedor.activo = True
        proveedor.save()

        return Response({
            'mensaje': 'Proveedor reactivado correctamente',
            'proveedor_id': proveedor.id
        })

    except Proveedor.DoesNotExist:
        return Response(
            {'error': 'Proveedor no encontrado.'},
            status=404
        )

@api_view(['PATCH'])
def reactivar_repartidor(request, repartidor_id):
    try:
        repartidor = Repartidor.objects.get(id=repartidor_id)
        repartidor.activo = True
        repartidor.save()

        return Response({
            'mensaje': 'Repartidor reactivado correctamente',
            'repartidor_id': repartidor.id
        })

    except Repartidor.DoesNotExist:
        return Response(
            {'error': 'Repartidor no encontrado.'},
            status=404
        )

@api_view(['PATCH'])
def actualizar_estado_pedido(request, pedido_id):
    nuevo_estado = request.data.get('estado')

    estados_validos = [
        'Pendiente',
        'En preparación',
        'Enviado',
        'Entregado',
        'Cancelado',
    ]

    if nuevo_estado not in estados_validos:
        return Response(
            {'error': 'Estado no válido.'},
            status=400
        )

    try:
        with connections['default'].cursor() as cursor:
            cursor.execute("""
                SELECT ID, Estado
                FROM Pedido
                WHERE ID = %s
            """, [pedido_id])

            pedido = cursor.fetchone()

            if not pedido:
                return Response(
                    {'error': 'Pedido no encontrado.'},
                    status=404
                )

            if nuevo_estado == 'Entregado':
                cursor.execute("""
                    UPDATE Pedido
                    SET Estado = %s,
                        FechaEntregaReal = GETDATE()
                    WHERE ID = %s
                """, [nuevo_estado, pedido_id])
            else:
                cursor.execute("""
                    UPDATE Pedido
                    SET Estado = %s
                    WHERE ID = %s
                """, [nuevo_estado, pedido_id])

            return Response({
                'mensaje': 'Estado del pedido actualizado correctamente',
                'pedido_id': pedido_id,
                'estado': nuevo_estado
            })

    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
def detalle_pedido_completo(request, pedido_id):
    try:
        with connections['default'].cursor() as cursor:
            cursor.execute("""
                SELECT 
                    P.ID AS pedido_id,
                    CONCAT(C.Nombre, ' ', ISNULL(C.Apellidos, '')) AS cliente,
                    CONCAT(E.Nombre, ' ', ISNULL(E.Apellido, '')) AS empleado,
                    A.NombreAlmacen AS almacen,
                    R.NombreCompleto AS repartidor,
                    P.FechaPedido,
                    P.FechaEntregaReal,
                    P.MetodoEnvio,
                    P.Total,
                    P.Estado,
                    P.SatisfaccionCliente,
                    P.ErrorEnOrden
                FROM Pedido P
                INNER JOIN Cliente C ON C.ID = P.ClienteID
                INNER JOIN Empleado E ON E.ID = P.EmpleadoID
                INNER JOIN Almacen A ON A.ID = P.AlmacenOrigenID
                INNER JOIN Repartidor R ON R.ID = P.RepartidorID
                WHERE P.ID = %s
            """, [pedido_id])

            row = cursor.fetchone()

            if not row:
                return Response(
                    {'error': 'Pedido no encontrado.'},
                    status=404
                )

            columns = [col[0] for col in cursor.description]
            pedido = dict(zip(columns, row))

            cursor.execute("""
                SELECT
                    DP.ID AS detalle_id,
                    PR.Nombre AS producto,
                    DP.Cantidad,
                    DP.PrecioUnitarioVenta,
                    DP.CostoUnitarioHistorico,
                    DP.Cantidad * DP.PrecioUnitarioVenta AS subtotal
                FROM DetallePedido DP
                INNER JOIN Producto PR ON PR.ID = DP.ProductoID
                WHERE DP.PedidoID = %s
            """, [pedido_id])

            detalle_columns = [col[0] for col in cursor.description]
            detalles = [
                dict(zip(detalle_columns, detalle))
                for detalle in cursor.fetchall()
            ]

            return Response({
                'pedido': pedido,
                'detalles': detalles
            })

    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
def odoo_estado(request):
    try:
        client = OdooClient()
        estado = client.estado()
        return Response(estado)

    except Exception as e:
        return Response({
            'conectado': False,
            'error': str(e)
        }, status=500)