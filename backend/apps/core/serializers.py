# backend/apps/core/serializers.py
from rest_framework import serializers
from .models import (
    Tienda, Departamento, Empleado, Rol, Almacen, Usuario, Categoria, Producto,
    StockAlmacen, Lote, MovimientoInventario, Repartidor, Cliente, Pedido,
    DetallePedido, Proveedor, OrdenCompra, DetalleCompra, Auditoria
)


class TiendaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tienda
        fields = '__all__'


class DepartamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Departamento
        fields = '__all__'


class EmpleadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Empleado
        fields = '__all__'


class RolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rol
        fields = '__all__'


class AlmacenSerializer(serializers.ModelSerializer):
    tienda_nombre = serializers.CharField(source='tienda.nombre_tienda', read_only=True)

    class Meta:
        model = Almacen
        fields = [
            'id',
            'nombre_almacen',
            'ubicacion',
            'tienda',
            'tienda_nombre',
        ]


class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['id', 'empleado', 'almacen_asignado', 'username', 'rol', 'ultimo_acceso', 'activo']


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = '__all__'


class ProductoSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='categoria.nombre_categoria', read_only=True)

    class Meta:
        model = Producto
        fields = [
            'id',
            'nombre',
            'categoria',
            'categoria_nombre',
            'precio_venta_sugerido',
            'gama',
            'activo',
            'odoo_template_id',
            'odoo_product_id',
            'odoo_sync_status',
            'odoo_last_sync',
        ]


class StockAlmacenSerializer(serializers.ModelSerializer):
    almacen_nombre = serializers.CharField(source='almacen.nombre_almacen', read_only=True)
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)

    class Meta:
        model = StockAlmacen
        fields = ['almacen', 'almacen_nombre', 'producto', 'producto_nombre', 'stock_total']


class LoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lote
        fields = '__all__'


class MovimientoInventarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = MovimientoInventario
        fields = '__all__'


class RepartidorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Repartidor
        fields = [
            'id',
            'nombre_completo',
            'vehiculo',
            'placa',
            'telefono',
            'activo',
        ]


class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = [
            'id',
            'nombre',
            'apellidos',
            'email',
            'segmento',
            'activo',
            'odoo_partner_id',
            'odoo_sync_status',
            'odoo_last_sync',
        ]


class PedidoSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.SerializerMethodField()
    almacen_nombre = serializers.SerializerMethodField()
    repartidor_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Pedido
        fields = [
            'id',
            'cliente',
            'cliente_nombre',
            'empleado',
            'almacen_origen',
            'almacen_nombre',
            'repartidor',
            'repartidor_nombre',
            'fecha_pedido',
            'fecha_entrega_real',
            'metodo_envio',
            'total',
            'estado',
            'satisfaccion_cliente',
            'error_en_orden',
            'odoo_invoice_id',
            'odoo_invoice_name',
            'estado_factura_odoo',
            'odoo_invoice_url',
            'odoo_last_sync',
        ]

    def get_cliente_nombre(self, obj):
        if obj.cliente:
            apellidos = obj.cliente.apellidos or ''
            return f'{obj.cliente.nombre} {apellidos}'.strip()
        return ''

    def get_almacen_nombre(self, obj):
        if obj.almacen_origen:
            return obj.almacen_origen.nombre_almacen
        return ''

    def get_repartidor_nombre(self, obj):
        if obj.repartidor:
            return obj.repartidor.nombre_completo
        return ''


class DetallePedidoSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)

    class Meta:
        model = DetallePedido
        fields = '__all__'


class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = [
            'id',
            'nombre_proveedor',
            'telefono',
            'activo',
        ]


class OrdenCompraSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.CharField(source='proveedor.nombre_proveedor', read_only=True)

    class Meta:
        model = OrdenCompra
        fields = '__all__'


class DetalleCompraSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)

    class Meta:
        model = DetalleCompra
        fields = '__all__'


class AuditoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Auditoria
        fields = '__all__'
