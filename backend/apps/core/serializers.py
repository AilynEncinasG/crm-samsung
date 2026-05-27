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
    class Meta:
        model = Almacen
        fields = '__all__'


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
        fields = '__all__'


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
        fields = '__all__'


class PedidoSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='cliente.nombre', read_only=True)

    class Meta:
        model = Pedido
        fields = '__all__'


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
