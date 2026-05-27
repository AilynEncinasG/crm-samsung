from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TiendaViewSet, DepartamentoViewSet, EmpleadoViewSet, RolViewSet,
    AlmacenViewSet, UsuarioViewSet, CategoriaViewSet, ProductoViewSet,
    StockAlmacenViewSet, LoteViewSet, MovimientoInventarioViewSet,
    RepartidorViewSet, ClienteViewSet, PedidoViewSet, DetallePedidoViewSet,
    ProveedorViewSet, OrdenCompraViewSet, DetalleCompraViewSet, AuditoriaViewSet,
    health, dashboard, dashboard_dw, registrar_venta, registrar_compra, reactivar_cliente, reactivar_producto, reactivar_proveedor, reactivar_repartidor,
    actualizar_estado_pedido, detalle_pedido_completo
)

router = DefaultRouter()
router.register('tiendas', TiendaViewSet)
router.register('departamentos', DepartamentoViewSet)
router.register('empleados', EmpleadoViewSet)
router.register('roles', RolViewSet)
router.register('almacenes', AlmacenViewSet)
router.register('usuarios', UsuarioViewSet)
router.register('categorias', CategoriaViewSet)
router.register('productos', ProductoViewSet, basename='producto')
router.register('stock', StockAlmacenViewSet)
router.register('lotes', LoteViewSet)
router.register('movimientos-inventario', MovimientoInventarioViewSet)
router.register('repartidores', RepartidorViewSet, basename='repartidor')
router.register('clientes', ClienteViewSet, basename='cliente')
router.register('pedidos', PedidoViewSet)
router.register('detalle-pedidos', DetallePedidoViewSet)
router.register('proveedores', ProveedorViewSet, basename='proveedor')
router.register('ordenes-compra', OrdenCompraViewSet)
router.register('detalle-compras', DetalleCompraViewSet)
router.register('auditoria', AuditoriaViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('health/', health),
    path('dashboard/', dashboard),
    path('dashboard-dw/', dashboard_dw),
    path('registrar-venta/', registrar_venta),
    path('registrar-compra/', registrar_compra),
    path('clientes/<int:cliente_id>/reactivar/', reactivar_cliente),
    path('productos/<int:producto_id>/reactivar/', reactivar_producto),
    path('proveedores/<int:proveedor_id>/reactivar/', reactivar_proveedor),
    path('repartidores/<int:repartidor_id>/reactivar/', reactivar_repartidor),
    path('pedidos/<int:pedido_id>/estado/', actualizar_estado_pedido),
    path('pedidos/<int:pedido_id>/detalle-completo/', detalle_pedido_completo),
]
