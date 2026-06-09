# backend/apps/core/views.py
from django.db import connection, connections, transaction
from rest_framework import (viewsets, status)
from rest_framework.decorators import (api_view, permission_classes)
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
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
from django.utils import timezone
from math import ceil
from collections import defaultdict
from django.contrib.auth.hashers import check_password
from django.test import RequestFactory
import socket
import os
import json
import requests

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

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

def registrar_auditoria(usuario_id, accion, tabla_afectada, registro_id=None, valor_anterior=None, valor_nuevo=None):
    try:
        usuario = Usuario.objects.filter(id=usuario_id).first() if usuario_id else None

        Auditoria.objects.create(
            usuario=usuario,
            accion=accion,
            tabla_afectada=tabla_afectada,
            registro_id=registro_id,
            valor_anterior=json.dumps(valor_anterior, ensure_ascii=False) if valor_anterior is not None else None,
            valor_nuevo=json.dumps(valor_nuevo, ensure_ascii=False) if valor_nuevo is not None else None,
            ip_maquina=socket.gethostname(),
            fecha=timezone.now()
        )
    except Exception as e:
        print(f'Error registrando auditoría: {e}')

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
                
                registrar_auditoria(
                    usuario_id=usuario_id,
                    accion='REGISTRO_VENTA',
                    tabla_afectada='Pedido',
                    registro_id=pedido_id,
                    valor_nuevo={
                        'pedido_id': pedido_id,
                        'cliente_id': cliente_id,
                        'empleado_id': empleado_id,
                        'almacen_id': almacen_id,
                        'repartidor_id': repartidor_id,
                        'producto_id': producto_id,
                        'cantidad': cantidad,
                        'total': float(total),
                        'estado': 'Pendiente',
                    }
                )
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

                registrar_auditoria(
                    usuario_id=usuario_id,
                    accion='REGISTRO_COMPRA',
                    tabla_afectada='OrdenCompra',
                    registro_id=orden_compra_id,
                    valor_nuevo={
                        'orden_compra_id': orden_compra_id,
                        'proveedor_id': proveedor_id,
                        'almacen_id': almacen_id,
                        'producto_id': producto_id,
                        'cantidad': cantidad,
                        'precio_compra_unitario': precio_compra_unitario,
                        'total': total,
                        'lote_id': lote_id,
                    }
                )

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

def registrar_log_odoo(tipo_operacion, entidad, registro_id, estado, mensaje):
    try:
        with connections['default'].cursor() as cursor:
            cursor.execute("""
                INSERT INTO IntegracionOdooLog (
                    TipoOperacion,
                    Entidad,
                    RegistroID,
                    Estado,
                    Mensaje
                )
                VALUES (%s, %s, %s, %s, %s)
            """, [
                tipo_operacion,
                entidad,
                registro_id,
                estado,
                mensaje,
            ])
    except Exception:
        pass


@api_view(['POST'])
def sincronizar_cliente_odoo(request, cliente_id):
    try:
        cliente = Cliente.objects.get(id=cliente_id)

        if not cliente.activo:
            return Response(
                {'error': 'No se puede sincronizar un cliente inactivo.'},
                status=400
            )

        client = OdooClient()
        resultado = client.crear_o_actualizar_cliente(cliente)

        cliente.odoo_partner_id = resultado['partner_id']
        cliente.odoo_sync_status = resultado['accion']
        cliente.odoo_last_sync = timezone.now()
        cliente.save()

        registrar_log_odoo(
            'SINCRONIZAR_CLIENTE',
            'Cliente',
            cliente.id,
            'OK',
            f"Cliente sincronizado con Odoo. Partner ID: {resultado['partner_id']}. Acción: {resultado['accion']}"
        )

        return Response({
            'mensaje': 'Cliente sincronizado correctamente con Odoo',
            'cliente_id': cliente.id,
            'odoo_partner_id': cliente.odoo_partner_id,
            'accion': resultado['accion'],
        })

    except Cliente.DoesNotExist:
        return Response(
            {'error': 'Cliente no encontrado.'},
            status=404
        )

    except Exception as e:
        registrar_log_odoo(
            'SINCRONIZAR_CLIENTE',
            'Cliente',
            cliente_id,
            'ERROR',
            str(e)
        )

        return Response(
            {'error': str(e)},
            status=500
        )


@api_view(['POST'])
def sincronizar_clientes_odoo(request):
    clientes = Cliente.objects.filter(activo=True).order_by('id')

    total = 0
    errores = []

    for cliente in clientes:
        try:
            client = OdooClient()
            resultado = client.crear_o_actualizar_cliente(cliente)

            cliente.odoo_partner_id = resultado['partner_id']
            cliente.odoo_sync_status = resultado['accion']
            cliente.odoo_last_sync = timezone.now()
            cliente.save()

            registrar_log_odoo(
                'SINCRONIZAR_CLIENTES',
                'Cliente',
                cliente.id,
                'OK',
                f"Cliente sincronizado con Odoo. Partner ID: {resultado['partner_id']}. Acción: {resultado['accion']}"
            )

            total += 1

        except Exception as e:
            errores.append({
                'cliente_id': cliente.id,
                'error': str(e)
            })

            registrar_log_odoo(
                'SINCRONIZAR_CLIENTES',
                'Cliente',
                cliente.id,
                'ERROR',
                str(e)
            )

    return Response({
        'mensaje': 'Sincronización de clientes finalizada',
        'clientes_sincronizados': total,
        'errores': errores,
    })

@api_view(['POST'])
def sincronizar_producto_odoo(request, producto_id):
    try:
        producto = Producto.objects.get(id=producto_id)

        if not producto.activo:
            return Response(
                {'error': 'No se puede sincronizar un producto inactivo.'},
                status=400
            )

        client = OdooClient()
        resultado = client.crear_o_actualizar_producto(producto)

        producto.odoo_template_id = resultado['template_id']
        producto.odoo_product_id = resultado['product_id']
        producto.odoo_sync_status = resultado['accion']
        producto.odoo_last_sync = timezone.now()
        producto.save()

        registrar_log_odoo(
            'SINCRONIZAR_PRODUCTO',
            'Producto',
            producto.id,
            'OK',
            f"Producto sincronizado con Odoo. Template ID: {resultado['template_id']}. Product ID: {resultado['product_id']}. Acción: {resultado['accion']}"
        )

        return Response({
            'mensaje': 'Producto sincronizado correctamente con Odoo',
            'producto_id': producto.id,
            'odoo_template_id': producto.odoo_template_id,
            'odoo_product_id': producto.odoo_product_id,
            'accion': resultado['accion'],
        })

    except Producto.DoesNotExist:
        return Response(
            {'error': 'Producto no encontrado.'},
            status=404
        )

    except Exception as e:
        registrar_log_odoo(
            'SINCRONIZAR_PRODUCTO',
            'Producto',
            producto_id,
            'ERROR',
            str(e)
        )

        return Response(
            {'error': str(e)},
            status=500
        )


@api_view(['POST'])
def sincronizar_productos_odoo(request):
    productos = Producto.objects.filter(activo=True).order_by('id')

    total = 0
    errores = []

    for producto in productos:
        try:
            client = OdooClient()
            resultado = client.crear_o_actualizar_producto(producto)

            producto.odoo_template_id = resultado['template_id']
            producto.odoo_product_id = resultado['product_id']
            producto.odoo_sync_status = resultado['accion']
            producto.odoo_last_sync = timezone.now()
            producto.save()

            registrar_log_odoo(
                'SINCRONIZAR_PRODUCTOS',
                'Producto',
                producto.id,
                'OK',
                f"Producto sincronizado con Odoo. Template ID: {resultado['template_id']}. Product ID: {resultado['product_id']}. Acción: {resultado['accion']}"
            )

            total += 1

        except Exception as e:
            errores.append({
                'producto_id': producto.id,
                'error': str(e)
            })

            registrar_log_odoo(
                'SINCRONIZAR_PRODUCTOS',
                'Producto',
                producto.id,
                'ERROR',
                str(e)
            )

    return Response({
        'mensaje': 'Sincronización de productos finalizada',
        'productos_sincronizados': total,
        'errores': errores,
    })

@api_view(['POST'])
def facturar_pedido_odoo(request, pedido_id):
    try:
        pedido = Pedido.objects.get(id=pedido_id)

        if pedido.odoo_invoice_id:
            return Response({
                'mensaje': 'El pedido ya tiene factura en Odoo',
                'pedido_id': pedido.id,
                'odoo_invoice_id': pedido.odoo_invoice_id,
                'odoo_invoice_name': pedido.odoo_invoice_name,
                'estado_factura_odoo': pedido.estado_factura_odoo,
                'odoo_invoice_url': pedido.odoo_invoice_url,
            })

        cliente = pedido.cliente

        if not cliente.activo:
            return Response(
                {'error': 'No se puede facturar un pedido de cliente inactivo.'},
                status=400
            )

        client = OdooClient()

        # Sincronizar cliente si todavía no existe en Odoo
        resultado_cliente = client.crear_o_actualizar_cliente(cliente)
        cliente.odoo_partner_id = resultado_cliente['partner_id']
        cliente.odoo_sync_status = resultado_cliente['accion']
        cliente.odoo_last_sync = timezone.now()
        cliente.save()

        detalles = DetallePedido.objects.filter(pedido=pedido).select_related('producto')

        if not detalles.exists():
            return Response(
                {'error': 'El pedido no tiene detalle de productos.'},
                status=400
            )

        lineas_odoo = []

        for detalle in detalles:
            producto = detalle.producto

            if not producto.activo:
                return Response(
                    {'error': f'El producto {producto.nombre} está inactivo y no puede facturarse.'},
                    status=400
                )

            # Sincronizar producto si todavía no existe en Odoo
            resultado_producto = client.crear_o_actualizar_producto(producto)
            producto.odoo_template_id = resultado_producto['template_id']
            producto.odoo_product_id = resultado_producto['product_id']
            producto.odoo_sync_status = resultado_producto['accion']
            producto.odoo_last_sync = timezone.now()
            producto.save()

            if not producto.odoo_product_id:
                return Response(
                    {'error': f'No se pudo obtener el Product ID de Odoo para {producto.nombre}.'},
                    status=500
                )

            lineas_odoo.append({
                'product_id': producto.odoo_product_id,
                'nombre': producto.nombre,
                'cantidad': detalle.cantidad,
                'precio_unitario': detalle.precio_unitario_venta,
            })

        resultado_factura = client.crear_factura_cliente(
            partner_id=cliente.odoo_partner_id,
            lineas=lineas_odoo,
            pedido_id=pedido.id,
        )

        pedido.odoo_invoice_id = resultado_factura['invoice_id']
        pedido.odoo_invoice_name = resultado_factura['invoice_name']
        pedido.estado_factura_odoo = resultado_factura['estado']
        pedido.odoo_invoice_url = resultado_factura['url']
        pedido.odoo_last_sync = timezone.now()
        pedido.save()

        registrar_log_odoo(
            'FACTURAR_PEDIDO',
            'Pedido',
            pedido.id,
            'OK',
            f"Factura creada en Odoo. Invoice ID: {pedido.odoo_invoice_id}. Factura: {pedido.odoo_invoice_name}"
        )

        registrar_auditoria(
            usuario_id=request.data.get('usuario_id'),
            accion='FACTURACION_ODOO',
            tabla_afectada='Pedido',
            registro_id=pedido.id,
            valor_nuevo={
                'pedido_id': pedido.id,
                'odoo_invoice_id': pedido.odoo_invoice_id,
                'odoo_invoice_name': pedido.odoo_invoice_name,
                'estado_factura_odoo': pedido.estado_factura_odoo,
                'odoo_invoice_url': pedido.odoo_invoice_url,
            }
        )

        return Response({
            'mensaje': 'Factura creada correctamente en Odoo',
            'pedido_id': pedido.id,
            'odoo_invoice_id': pedido.odoo_invoice_id,
            'odoo_invoice_name': pedido.odoo_invoice_name,
            'estado_factura_odoo': pedido.estado_factura_odoo,
            'odoo_invoice_url': pedido.odoo_invoice_url,
        }, status=201)

    except Pedido.DoesNotExist:
        return Response(
            {'error': 'Pedido no encontrado.'},
            status=404
        )

    except Exception as e:
        registrar_log_odoo(
            'FACTURAR_PEDIDO',
            'Pedido',
            pedido_id,
            'ERROR',
            str(e)
        )

        return Response(
            {'error': str(e)},
            status=500
        )

@api_view(['GET'])
def stock_list(request):
    try:
        with connections['default'].cursor() as cursor:
            cursor.execute("""
                SELECT
                    SA.AlmacenID AS almacen,
                    A.NombreAlmacen AS almacen_nombre,
                    SA.ProductoID AS producto,
                    P.Nombre AS producto_nombre,
                    SA.StockTotal AS stock_total
                FROM StockAlmacen SA
                INNER JOIN Almacen A ON A.ID = SA.AlmacenID
                INNER JOIN Producto P ON P.ID = SA.ProductoID
                ORDER BY A.NombreAlmacen, P.Nombre
            """)

            columns = [col[0] for col in cursor.description]
            data = [
                dict(zip(columns, row))
                for row in cursor.fetchall()
            ]

            return Response(data)

    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
def odoo_resumen(request):
    try:
        client = OdooClient()
        estado_odoo = client.estado()

        def fetch_one(sql, params=None):
            with connections['default'].cursor() as cursor:
                cursor.execute(sql, params or [])
                row = cursor.fetchone()
                return row[0] if row else 0

        def fetch_all(sql, params=None):
            with connections['default'].cursor() as cursor:
                cursor.execute(sql, params or [])
                columns = [col[0] for col in cursor.description]
                return [
                    dict(zip(columns, row))
                    for row in cursor.fetchall()
                ]

        kpis = {
            'odoo_conectado': estado_odoo.get('conectado', False),
            'odoo_usuarios_activos': estado_odoo.get('usuarios_activos', 0),
            'odoo_contactos_activos': estado_odoo.get('contactos_activos', 0),
            'odoo_productos_activos': estado_odoo.get('productos_activos', 0),

            'clientes_sincronizados': fetch_one("""
                SELECT COUNT(*) 
                FROM Cliente 
                WHERE OdooPartnerID IS NOT NULL
            """),

            'productos_sincronizados': fetch_one("""
                SELECT COUNT(*) 
                FROM Producto 
                WHERE OdooProductID IS NOT NULL
            """),

            'pedidos_facturados': fetch_one("""
                SELECT COUNT(*) 
                FROM Pedido 
                WHERE OdooInvoiceID IS NOT NULL
            """),

            'pedidos_pendientes_factura': fetch_one("""
                SELECT COUNT(*) 
                FROM Pedido 
                WHERE OdooInvoiceID IS NULL
            """),

            'errores_integracion': fetch_one("""
                SELECT COUNT(*) 
                FROM IntegracionOdooLog 
                WHERE Estado = 'ERROR'
            """),
        }

        ultimos_logs = fetch_all("""
            SELECT TOP 10
                ID AS id,
                TipoOperacion AS tipo_operacion,
                Entidad AS entidad,
                RegistroID AS registro_id,
                Estado AS estado,
                Mensaje AS mensaje,
                CONVERT(VARCHAR(19), Fecha, 120) AS fecha
            FROM IntegracionOdooLog
            ORDER BY ID DESC
        """)

        ultimas_facturas = fetch_all("""
            SELECT TOP 10
                P.ID AS pedido_id,
                CONCAT(C.Nombre, ' ', ISNULL(C.Apellidos, '')) AS cliente,
                P.Total AS total,
                P.OdooInvoiceID AS odoo_invoice_id,
                P.OdooInvoiceName AS odoo_invoice_name,
                P.EstadoFacturaOdoo AS estado_factura_odoo,
                P.OdooInvoiceURL AS odoo_invoice_url,
                CONVERT(VARCHAR(19), P.OdooLastSync, 120) AS fecha_sync
            FROM Pedido P
            INNER JOIN Cliente C ON C.ID = P.ClienteID
            WHERE P.OdooInvoiceID IS NOT NULL
            ORDER BY P.OdooLastSync DESC
        """)

        return Response({
            'kpis': kpis,
            'version_odoo': estado_odoo.get('version', {}),
            'ultimos_logs': ultimos_logs,
            'ultimas_facturas': ultimas_facturas,
        })

    except Exception as e:
        return Response({
            'error': str(e)
        }, status=500)
    
def _obtener_valor(objeto, posibles_campos, valor_defecto=0):
    """
    Obtiene el primer atributo existente dentro de una lista de posibles nombres.
    Esto ayuda a que el motor predictivo funcione aunque algunos campos tengan nombres distintos.
    """
    for campo in posibles_campos:
        if hasattr(objeto, campo):
            valor = getattr(objeto, campo)
            return valor if valor is not None else valor_defecto
    return valor_defecto


def _a_numero(valor):
    """
    Convierte valores Decimal, None o strings numéricos a float.
    """
    try:
        return float(valor or 0)
    except (TypeError, ValueError):
        return 0


def _calcular_inteligencia_predictiva():
    """
    Motor predictivo inicial para estimar demanda comercial e inventario crítico.
    Funciona con pocos datos reales usando reglas, promedios y comportamiento histórico.
    """

    hoy = timezone.now()
    limite_30_dias = hoy - timezone.timedelta(days=30)
    limite_15_dias = hoy - timezone.timedelta(days=15)
    limite_30_a_15_dias = hoy - timezone.timedelta(days=30)

    ventas_por_producto = defaultdict(float)
    ventas_ultimos_30 = defaultdict(float)
    ventas_ultimos_15 = defaultdict(float)
    ventas_15_anteriores = defaultdict(float)
    fechas_por_producto = defaultdict(list)

    detalles = DetallePedido.objects.select_related("producto", "pedido").all()

    for detalle in detalles:
        producto_id = getattr(detalle, "producto_id", None)
        if not producto_id:
            continue

        cantidad = _a_numero(_obtener_valor(detalle, ["cantidad", "cantidad_producto", "unidades"], 0))
        pedido = getattr(detalle, "pedido", None)
        fecha_pedido = getattr(pedido, "fecha_pedido", None) if pedido else None

        ventas_por_producto[producto_id] += cantidad

        if fecha_pedido:
            fechas_por_producto[producto_id].append(fecha_pedido)

            if fecha_pedido >= limite_30_dias:
                ventas_ultimos_30[producto_id] += cantidad

            if fecha_pedido >= limite_15_dias:
                ventas_ultimos_15[producto_id] += cantidad

            if limite_30_a_15_dias <= fecha_pedido < limite_15_dias:
                ventas_15_anteriores[producto_id] += cantidad

    stock_por_producto = defaultdict(float)

    for stock in StockAlmacen.objects.all():
        producto_id = getattr(stock, "producto_id", None)
        if not producto_id:
            continue

        cantidad_stock = _a_numero(
            _obtener_valor(
                stock,
                ["cantidad", "stock", "cantidad_disponible", "stock_actual"],
                0
            )
        )

        stock_por_producto[producto_id] += cantidad_stock

    predicciones = []

    for producto in Producto.objects.all():
        producto_id = producto.id
        nombre_producto = _obtener_valor(producto, ["nombre", "nombre_producto", "descripcion"], "Producto sin nombre")

        total_vendido = ventas_por_producto.get(producto_id, 0)
        stock_actual = stock_por_producto.get(producto_id, 0)

        fechas = fechas_por_producto.get(producto_id, [])

        if fechas:
            fecha_min = min(fechas)
            fecha_max = max(fechas)
            dias_historial = max((fecha_max - fecha_min).days + 1, 1)
            meses_historial = max(dias_historial / 30, 1)
        else:
            meses_historial = 1

        demanda_30 = ventas_ultimos_30.get(producto_id, 0)

        if demanda_30 > 0:
            demanda_estimada = ceil(demanda_30)
        elif total_vendido > 0:
            demanda_estimada = ceil(total_vendido / meses_historial)
        else:
            demanda_estimada = 0

        venta_reciente = ventas_ultimos_15.get(producto_id, 0)
        venta_anterior = ventas_15_anteriores.get(producto_id, 0)

        if venta_reciente > venta_anterior:
            tendencia = "CRECIENTE"
        elif venta_reciente < venta_anterior:
            tendencia = "BAJA"
        elif total_vendido > 0:
            tendencia = "ESTABLE"
        else:
            tendencia = "SIN DATOS SUFICIENTES"

        if demanda_estimada <= 0 and stock_actual > 0:
            nivel_riesgo = "BAJO"
        elif stock_actual <= 0 and demanda_estimada > 0:
            nivel_riesgo = "ALTO"
        elif demanda_estimada > 0:
            cobertura = stock_actual / demanda_estimada

            if cobertura <= 0.5:
                nivel_riesgo = "ALTO"
            elif cobertura <= 1:
                nivel_riesgo = "MEDIO"
            else:
                nivel_riesgo = "BAJO"
        else:
            nivel_riesgo = "BAJO"

        stock_objetivo = ceil(demanda_estimada * 1.2)
        reposicion_sugerida = max(stock_objetivo - stock_actual, 0)

        if nivel_riesgo == "ALTO":
            recomendacion = "Reponer producto de forma prioritaria."
        elif nivel_riesgo == "MEDIO":
            recomendacion = "Monitorear producto y planificar reposición."
        else:
            recomendacion = "Mantener seguimiento regular del producto."

        predicciones.append({
            "producto_id": producto_id,
            "producto": nombre_producto,
            "stock_actual": int(stock_actual),
            "demanda_estimada": int(demanda_estimada),
            "nivel_riesgo": nivel_riesgo,
            "tendencia": tendencia,
            "reposicion_sugerida": int(reposicion_sugerida),
            "recomendacion": recomendacion,
        })

    orden_riesgo = {"ALTO": 1, "MEDIO": 2, "BAJO": 3}

    predicciones = sorted(
        predicciones,
        key=lambda item: (
            orden_riesgo.get(item["nivel_riesgo"], 4),
            -item["demanda_estimada"]
        )
    )

    productos_criticos = [
        item for item in predicciones
        if item["nivel_riesgo"] in ["ALTO", "MEDIO"]
    ]

    resumen = {
        "productos_analizados": len(predicciones),
        "productos_criticos": len(productos_criticos),
        "demanda_total_estimada": sum(item["demanda_estimada"] for item in predicciones),
        "fecha_generacion": hoy.strftime("%Y-%m-%d %H:%M:%S"),
        "metodo": "Motor predictivo inicial basado en reglas, historial de ventas, stock disponible y tendencia reciente."
    }

    return {
        "resumen": resumen,
        "predicciones": predicciones
    }


@api_view(["GET"])
def inteligencia_predictiva(request):
    """
    Endpoint principal de inteligencia artificial predictiva.
    Devuelve demanda estimada, inventario crítico, tendencia y recomendación de reposición.
    """
    try:
        data = _calcular_inteligencia_predictiva()
        return Response(data)
    except Exception as error:
        return Response(
            {
                "error": "No se pudo generar la inteligencia predictiva.",
                "detalle": str(error)
            },
            status=500
        )


def _numero(valor, defecto=0):
    try:
        if valor is None:
            return defecto
        return float(valor)
    except (TypeError, ValueError):
        return defecto


def _entero(valor, defecto=0):
    return int(_numero(valor, defecto))


def _moneda(valor):
    return f"Bs {_numero(valor):,.2f}"


def _tomar_top(lista, limite=3):
    if not isinstance(lista, list):
        return []
    return lista[:limite]


def _clasificar_pregunta(pregunta):
    texto = (pregunta or '').lower()

    if any(p in texto for p in ['inventario', 'stock', 'reposicion', 'reposición', 'producto crítico', 'productos críticos']):
        return 'inventario'
    if any(p in texto for p in ['cliente', 'clientes', 'crm', 'satisfaccion', 'satisfacción', 'oportunidades comerciales']):
        return 'clientes'

    if any(p in texto for p in ['financiera', 'utilidad', 'ingreso', 'costo', 'rentabilidad']):
        return 'financiera'

    if any(p in texto for p in ['ventas', 'venta', 'pedidos', 'comercial']):
        return 'clientes'
    
    if any(p in texto for p in ['odoo', 'factura', 'facturación', 'integración', 'integracion']):
        return 'odoo'
    if any(p in texto for p in ['auditoria', 'auditoría', 'seguridad', 'usuario', 'trazabilidad']):
        return 'seguridad'

    return 'general'


def _generar_asistente_local_avanzado(pregunta, contexto):
    dashboard_data = contexto.get('dashboard_operativo', {}) or {}
    dw_data = contexto.get('dashboard_data_warehouse', {}) or {}
    ia_data = contexto.get('inteligencia_predictiva', {}) or {}
    odoo_data = contexto.get('integracion_odoo', {}) or {}
    auditorias = contexto.get('auditoria_reciente', []) or []

    kpis = dashboard_data.get('kpis', {}) or {}
    kpis_dw = dw_data.get('kpis', {}) or {}
    resumen_ia = ia_data.get('resumen', {}) or {}
    predicciones = ia_data.get('predicciones', []) or []
    kpis_odoo = odoo_data.get('kpis', {}) or {}

    ventas_producto = dw_data.get('ventas_por_producto', []) or []
    ventas_cliente = dw_data.get('ventas_por_cliente', []) or []
    ventas_logistica = dw_data.get('ventas_por_logistica', []) or []
    stock_bajo = dashboard_data.get('stock_bajo', []) or []
    logs_odoo = odoo_data.get('ultimos_logs', []) or []

    ingreso = _numero(kpis_dw.get('ingreso_bruto'))
    costo = _numero(kpis_dw.get('costo_total'))
    utilidad = _numero(kpis_dw.get('utilidad_neta'))
    cantidad_vendida = _numero(kpis_dw.get('cantidad_vendida'))
    satisfaccion = _numero(kpis_dw.get('satisfaccion_promedio'))

    clientes = _entero(kpis.get('clientes'))
    pedidos = _entero(kpis.get('pedidos'))
    stock_total = _entero(kpis.get('stock_total'))
    compras_total = _numero(kpis.get('compras_total'))

    productos_analizados = _entero(resumen_ia.get('productos_analizados'))
    productos_criticos = _entero(resumen_ia.get('productos_criticos'))
    demanda_total = _entero(resumen_ia.get('demanda_total_estimada'))

    pedidos_facturados = _entero(kpis_odoo.get('pedidos_facturados'))
    pendientes_factura = _entero(kpis_odoo.get('pedidos_pendientes_factura'))
    errores_odoo = _entero(kpis_odoo.get('errores_integracion'))
    odoo_conectado = bool(kpis_odoo.get('odoo_conectado'))

    margen = (utilidad / ingreso * 100) if ingreso > 0 else 0
    cobertura_demanda = (stock_total / demanda_total) if demanda_total > 0 else None

    predicciones_riesgo = [
        p for p in predicciones
        if str(p.get('nivel_riesgo', '')).upper() in ['ALTO', 'MEDIO']
    ]
    predicciones_riesgo = sorted(
        predicciones_riesgo,
        key=lambda p: (
            0 if str(p.get('nivel_riesgo', '')).upper() == 'ALTO' else 1,
            -_numero(p.get('demanda_estimada'))
        )
    )

    riesgos = []
    decisiones = []
    oportunidades = []

    if productos_criticos > 0:
        nombres = ', '.join([p.get('producto', 'Producto') for p in _tomar_top(predicciones_riesgo, 3)])
        riesgos.append(f'Inventario: existen {productos_criticos} productos críticos. Principales: {nombres}.')
        decisiones.append('Priorizar compras de reposición para productos con riesgo ALTO y revisar cobertura por almacén.')

    if stock_total < 100:
        riesgos.append(f'Inventario: el stock total es {stock_total}, por debajo de una meta operativa sugerida de 100 unidades.')
        decisiones.append('Definir una política de stock mínimo y programar reposiciones automáticas por producto.')

    if cobertura_demanda is not None and cobertura_demanda < 1:
        riesgos.append(f'Demanda: el stock cubre aproximadamente {cobertura_demanda:.2f} veces la demanda estimada; existe riesgo de desabastecimiento.')
        decisiones.append('Cruzar demanda estimada con compras pendientes y acelerar abastecimiento de productos de alta rotación.')

    if margen < 15:
        riesgos.append(f'Finanzas: el margen estimado es {margen:.2f}%, por debajo de un nivel saludable sugerido de 15%.')
        decisiones.append('Revisar costos por lote, precios de venta y utilidad por producto para mejorar rentabilidad.')
    else:
        oportunidades.append(f'Finanzas: el margen estimado es {margen:.2f}%, lo que muestra una rentabilidad positiva.')

    if clientes < 10:
        riesgos.append(f'CRM: existen {clientes} clientes activos; la base comercial aún es reducida.')
        decisiones.append('Aplicar campañas de fidelización, segmentación y seguimiento comercial para ampliar clientes recurrentes.')

    if satisfaccion and satisfaccion < 4:
        riesgos.append(f'Clientes: la satisfacción promedio es {satisfaccion:.2f}, requiere atención.')
        decisiones.append('Analizar pedidos con errores, tiempos de entrega y experiencia del cliente.')
    elif satisfaccion >= 4:
        oportunidades.append(f'Clientes: la satisfacción promedio es {satisfaccion:.2f}, indicador favorable para fidelización.')

    if pendientes_factura > 0:
        riesgos.append(f'Odoo: existen {pendientes_factura} pedidos pendientes de factura.')
        decisiones.append('Regularizar facturación en Odoo para mantener trazabilidad contable y comercial.')

    if errores_odoo > 0:
        riesgos.append(f'Odoo: se registran {errores_odoo} errores de integración.')
        decisiones.append('Revisar logs de integración y sincronización de clientes/productos.')
    else:
        oportunidades.append('Odoo: no se registran errores de integración, lo que favorece continuidad operativa.')

    if not odoo_conectado:
        riesgos.append('Odoo: el estado de conexión no aparece como activo.')
        decisiones.append('Verificar disponibilidad del servicio Odoo antes de facturar pedidos.')

    if not riesgos:
        riesgos.append('No se detectan riesgos críticos en los indicadores principales.')
        decisiones.append('Mantener monitoreo periódico del CMI, inventario, Odoo y reportes DW.')

    pregunta_tipo = _clasificar_pregunta(pregunta)

    enfoque = {
        'inventario': 'El foco del análisis está en inventario, demanda estimada, productos críticos y reposición.',
        'financiera': 'El foco del análisis está en ingresos, costos, utilidad y rentabilidad.',
        'clientes': 'El foco del análisis está en CRM, clientes, pedidos y satisfacción.',
        'odoo': 'El foco del análisis está en integración Odoo, facturación y sincronización.',
        'seguridad': 'El foco del análisis está en trazabilidad, usuarios y auditoría reciente.',
        'general': 'El análisis evalúa de forma integral las perspectivas financiera, clientes, procesos internos y aprendizaje.'
    }.get(pregunta_tipo, '')

    top_productos = _tomar_top(ventas_producto, 3)
    top_clientes = _tomar_top(ventas_cliente, 3)
    top_logistica = _tomar_top(ventas_logistica, 2)
    top_logs = _tomar_top(logs_odoo, 3)
    top_auditoria = _tomar_top(auditorias, 5)

    def lista_o_vacio(items, formatter):
        if not items:
            return '- Sin datos relevantes disponibles.'
        return '\n'.join([f'- {formatter(item)}' for item in items])

    productos_txt = lista_o_vacio(
        top_productos,
        lambda p: f"{p.get('producto', 'Producto')} | Cantidad: {p.get('cantidad', 0)} | Ingreso: {_moneda(p.get('ingreso', 0))} | Utilidad: {_moneda(p.get('utilidad', 0))}"
    )

    clientes_txt = lista_o_vacio(
        top_clientes,
        lambda c: f"{c.get('cliente', 'Cliente')} | Cantidad: {c.get('cantidad', 0)} | Ingreso: {_moneda(c.get('ingreso', 0))}"
    )

    criticos_txt = lista_o_vacio(
        _tomar_top(predicciones_riesgo, 5),
        lambda p: f"{p.get('producto', 'Producto')} | Riesgo: {p.get('nivel_riesgo')} | Stock: {p.get('stock_actual')} | Demanda: {p.get('demanda_estimada')} | Reposición sugerida: {p.get('reposicion_sugerida')}"
    )

    stock_bajo_txt = lista_o_vacio(
        _tomar_top(stock_bajo, 5),
        lambda s: f"{s.get('producto', 'Producto')} en {s.get('almacen', 'Almacén')} | Stock: {s.get('stock')}"
    )

    logistica_txt = lista_o_vacio(
        top_logistica,
        lambda l: f"{l.get('repartidor', 'Repartidor')} | {l.get('metodo_envio', 'Método')} | {l.get('almacen', 'Almacén')} | Ingreso: {_moneda(l.get('ingreso', 0))}"
    )

    auditoria_txt = lista_o_vacio(
        top_auditoria,
        lambda a: f"{a.get('accion', 'Acción')} en {a.get('tabla_afectada', 'tabla')} #{a.get('registro_id', '-')} por {a.get('usuario__username') or 'Sistema'}"
    )

    riesgos_txt = '\n'.join([f'- {r}' for r in riesgos])
    decisiones_txt = '\n'.join([f'- {d}' for d in decisiones])
    oportunidades_txt = '\n'.join([f'- {o}' for o in oportunidades]) if oportunidades else '- No se detectaron oportunidades destacadas adicionales.'

    return f"""
Asistente IA Local Estratégico

Pregunta analizada:
{pregunta}

Enfoque:
{enfoque}

Resumen ejecutivo:
- Ingreso bruto: {_moneda(ingreso)}
- Costo total: {_moneda(costo)}
- Utilidad neta: {_moneda(utilidad)}
- Margen estimado: {margen:.2f}%
- Clientes activos: {clientes}
- Pedidos registrados: {pedidos}
- Cantidad vendida: {cantidad_vendida:,.0f}
- Stock total: {stock_total}
- Demanda total estimada: {demanda_total}
- Productos analizados por IA: {productos_analizados}
- Productos críticos: {productos_criticos}
- Pedidos facturados en Odoo: {pedidos_facturados}
- Pendientes de factura: {pendientes_factura}
- Errores Odoo: {errores_odoo}

Productos críticos y reposición sugerida:
{criticos_txt}

Productos con stock bajo:
{stock_bajo_txt}

Productos con mayor impacto comercial:
{productos_txt}

Clientes con mayor ingreso:
{clientes_txt}

Logística destacada:
{logistica_txt}

Trazabilidad y auditoría reciente:
{auditoria_txt}

Riesgos detectados:
{riesgos_txt}

Oportunidades:
{oportunidades_txt}

Decisiones recomendadas para gerencia:
{decisiones_txt}

Conclusión:
El sistema está operando como un Sistema de Información Estratégico porque integra CRM, ventas, inventario, compras, Odoo, Data Warehouse, auditoría e inteligencia predictiva. El asistente local analiza esos datos en conjunto y transforma los registros operativos en recomendaciones gerenciales sin depender de servicios externos de pago.
""".strip()


@api_view(['POST'])
@permission_classes([AllowAny])
def asistente_cmi_ia(request):
    """
    Asistente IA Local Real para el Cuadro de Mando Integral.
    Usa Ollama local para generar análisis estratégico con un LLM local.
    Si Ollama no está disponible, usa análisis local estable.
    """
    pregunta = request.data.get('pregunta', '').strip()

    pregunta_lower = pregunta.lower()

    saludos = ['hola', 'holi', 'buenas', 'como estas', 'cómo estás', 'hey']

    if any(saludo in pregunta_lower for saludo in saludos) and len(pregunta_lower.split()) <= 5:
        return Response({
            'pregunta': pregunta,
            'respuesta': (
                '¡Holiii! Estoy listo para ayudarte 😊\n\n'
                'Puedo analizar clientes, ventas, inventario, rentabilidad, Odoo, auditoría, '
                'Data Warehouse o el Cuadro de Mando Integral del sistema.'
            ),
            'modo': 'Asistente conversacional local',
            'fuentes_analizadas': []
        })

    try:
        factory = RequestFactory()

        def obtener_data_get(view_func, path):
            http_request = factory.get(path)
            response = view_func(http_request)

            if hasattr(response, 'data'):
                return response.data

            try:
                return json.loads(response.content.decode('utf-8'))
            except Exception:
                return {}

        dashboard_data = obtener_data_get(dashboard, '/api/dashboard/')
        dw_data = obtener_data_get(dashboard_dw, '/api/dashboard-dw/')
        ia_data = obtener_data_get(inteligencia_predictiva, '/api/inteligencia-predictiva/')
        odoo_data = obtener_data_get(odoo_resumen, '/api/odoo/resumen/')

        auditorias_recientes = list(
            Auditoria.objects.select_related('usuario')
            .order_by('-fecha')[:10]
            .values(
                'id',
                'accion',
                'tabla_afectada',
                'registro_id',
                'fecha',
                'usuario__username'
            )
        )

        contexto = {
            'dashboard_operativo': dashboard_data,
            'dashboard_data_warehouse': dw_data,
            'inteligencia_predictiva': ia_data,
            'integracion_odoo': odoo_data,
            'auditoria_reciente': auditorias_recientes,
        }

        ollama_url = os.getenv('OLLAMA_URL', 'http://ollama:11434')
        ollama_model = os.getenv('OLLAMA_MODEL', 'llama3.2:3b')

        prompt_sistema = """
Eres un asistente IA local estratégico para un Sistema de Información Estratégico de Samsung Technology.

Reglas obligatorias:
- Responde SIEMPRE en español.
- Usa ÚNICAMENTE los datos autorizados que recibes en el contexto.
- No inventes cifras, totales, productos, clientes ni estados.
- Si el usuario saluda o hace conversación casual, responde de forma amable y breve, sin mostrar reportes.
- Si el usuario pregunta por clientes y ventas, enfócate en clientes, ventas, ingresos, pedidos y oportunidades comerciales.
- Si el usuario pide no hablar de inventario, NO menciones inventario salvo que sea indispensable para explicar una oportunidad comercial.
- No digas “no tengo información” si el contexto contiene datos.
- Si falta un dato, indica exactamente qué dato falta.
- Sé ejecutivo, claro, formal y orientado a gerencia.
- Evita repetir todo el sistema si la pregunta es específica.

Formato recomendado:
1. Respuesta directa
2. Hallazgos principales
3. Riesgos u oportunidades
4. Decisiones recomendadas
5. Conclusión gerencial
"""

        prompt_usuario = f"""
Pregunta del usuario:
{pregunta}

Datos autorizados del sistema:
{json.dumps(contexto, ensure_ascii=False, default=str)}

Instrucción:
Responde exactamente a la pregunta del usuario usando solo los datos anteriores.
No agregues secciones que no correspondan a la pregunta.
Si la pregunta es casual, responde casualmente y ofrece ayuda.
"""

        try:
            ollama_response = requests.post(
                f'{ollama_url}/api/chat',
                json={
                    'model': ollama_model,
                    'messages': [
                        {'role': 'system', 'content': prompt_sistema},
                        {'role': 'user', 'content': prompt_usuario},
                    ],
                    'stream': False,
                    'options': {
                        'temperature': 0.3,
                        'top_p': 0.9,
                    }
                },
                timeout=120
            )

            if ollama_response.ok:
                data = ollama_response.json()
                respuesta = data.get('message', {}).get('content', '').strip()

                if respuesta:
                    return Response({
                        'pregunta': pregunta,
                        'respuesta': respuesta,
                        'modo': f'LLM local real con Ollama ({ollama_model})',
                        'fuentes_analizadas': [
                            'Dashboard operativo',
                            'Data Warehouse',
                            'Inteligencia Predictiva',
                            'Integración Odoo',
                            'Auditoría reciente',
                        ]
                    })

            print('Ollama respondió error:', ollama_response.text)

        except Exception as e:
            print(f'Ollama no disponible, usando análisis local estable. Detalle: {e}')

        # Fallback si Ollama no responde
        respuesta_local = _generar_asistente_local_avanzado(pregunta, contexto)

        return Response({
            'pregunta': pregunta,
            'respuesta': respuesta_local,
            'modo': 'IA local estratégica sin LLM',
            'fuentes_analizadas': [
                'Dashboard operativo',
                'Data Warehouse',
                'Inteligencia Predictiva',
                'Integración Odoo',
                'Auditoría reciente',
            ]
        })

    except Exception as e:
        return Response(
            {'error': f'Error al generar análisis IA local: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([AllowAny])
def login_usuario(request):
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response(
            {'error': 'Usuario y contraseña son obligatorios.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        usuario = Usuario.objects.select_related(
            'rol',
            'empleado',
            'almacen_asignado'
        ).get(username=username, activo=True)
    except Usuario.DoesNotExist:
        return Response(
            {'error': 'Credenciales incorrectas.'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    password_bd = usuario.password_hash or ''

    password_valido = False

    # Soporta contraseña hasheada de Django
    try:
        password_valido = check_password(password, password_bd)
    except Exception:
        password_valido = False

    # Fallback por si en tu BD está guardada como texto plano para demo
    if not password_valido and password == password_bd:
        password_valido = True

    if not password_valido:
        return Response(
            {'error': 'Credenciales incorrectas.'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    usuario.ultimo_acceso = timezone.now()
    usuario.save()

    empleado_nombre = ''
    if usuario.empleado:
        apellido = usuario.empleado.apellido or ''
        empleado_nombre = f'{usuario.empleado.nombre} {apellido}'.strip()
    
    return Response({
        'mensaje': 'Login correcto.',
        'usuario': {
            'id': usuario.id,
            'username': usuario.username,
            'empleado': usuario.empleado.id if usuario.empleado else None,
            'empleado_nombre': empleado_nombre,
            'rol': usuario.rol.id if usuario.rol else None,
            'rol_nombre': usuario.rol.nombre_rol if usuario.rol else '',
            'almacen_asignado': usuario.almacen_asignado.id if usuario.almacen_asignado else None,
            'almacen_nombre': usuario.almacen_asignado.nombre_almacen if usuario.almacen_asignado else '',
            'ultimo_acceso': usuario.ultimo_acceso,
            'activo': usuario.activo,
        }
    })