from django.db import models


class Tienda(models.Model):
    id = models.AutoField(db_column='ID', primary_key=True)
    nombre_tienda = models.CharField(db_column='NombreTienda', max_length=100)
    ciudad = models.CharField(db_column='Ciudad', max_length=100, blank=True, null=True)
    direccion = models.CharField(db_column='Direccion', max_length=255, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Tienda'

    def __str__(self):
        return self.nombre_tienda


class Departamento(models.Model):
    id = models.AutoField(db_column='ID', primary_key=True)
    nombre_departamento = models.CharField(db_column='NombreDepartamento', max_length=100)

    class Meta:
        managed = False
        db_table = 'Departamento'


class Empleado(models.Model):
    id = models.AutoField(db_column='ID', primary_key=True)
    tienda = models.ForeignKey(Tienda, models.DO_NOTHING, db_column='TiendaID', blank=True, null=True)
    departamento = models.ForeignKey(Departamento, models.DO_NOTHING, db_column='DepartamentoID', blank=True, null=True)
    nombre = models.CharField(db_column='Nombre', max_length=100)
    apellido = models.CharField(db_column='Apellido', max_length=100, blank=True, null=True)
    cargo = models.CharField(db_column='Cargo', max_length=50, blank=True, null=True)
    capacitado = models.BooleanField(db_column='Capacitado', default=False)

    class Meta:
        managed = False
        db_table = 'Empleado'

    def __str__(self):
        return f'{self.nombre} {self.apellido or ""}'.strip()


class Rol(models.Model):
    id = models.AutoField(db_column='ID', primary_key=True)
    nombre_rol = models.CharField(db_column='NombreRol', max_length=50)

    class Meta:
        managed = False
        db_table = 'Rol'


class Almacen(models.Model):
    id = models.AutoField(db_column='ID', primary_key=True)
    nombre_almacen = models.CharField(db_column='NombreAlmacen', max_length=100)
    ubicacion = models.CharField(db_column='Ubicacion', max_length=255, blank=True, null=True)
    tienda = models.ForeignKey(Tienda, models.DO_NOTHING, db_column='TiendaID', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Almacen'

    def __str__(self):
        return self.nombre_almacen


class Usuario(models.Model):
    id = models.AutoField(db_column='ID', primary_key=True)
    empleado = models.ForeignKey(Empleado, models.DO_NOTHING, db_column='EmpleadoID', blank=True, null=True)
    almacen_asignado = models.ForeignKey(Almacen, models.DO_NOTHING, db_column='AlmacenAsignadoID', blank=True, null=True)
    username = models.CharField(db_column='Username', unique=True, max_length=50)
    password_hash = models.CharField(db_column='PasswordHash', max_length=255)
    rol = models.ForeignKey(Rol, models.DO_NOTHING, db_column='RolID', blank=True, null=True)
    ultimo_acceso = models.DateTimeField(db_column='UltimoAcceso', blank=True, null=True)
    activo = models.BooleanField(db_column='Activo', default=True)

    class Meta:
        managed = False
        db_table = 'Usuario'


class Categoria(models.Model):
    id = models.AutoField(db_column='ID', primary_key=True)
    nombre_categoria = models.CharField(db_column='NombreCategoria', max_length=100)

    class Meta:
        managed = False
        db_table = 'Categoria'

    def __str__(self):
        return self.nombre_categoria


class Producto(models.Model):
    id = models.AutoField(db_column='ID', primary_key=True)
    nombre = models.CharField(db_column='Nombre', max_length=150)
    categoria = models.ForeignKey(Categoria, models.DO_NOTHING, db_column='CategoriaID', blank=True, null=True)
    precio_venta_sugerido = models.DecimalField(db_column='PrecioVentaSugerido', max_digits=18, decimal_places=2)
    gama = models.CharField(db_column='Gama', max_length=50, blank=True, null=True)
    activo = models.BooleanField(db_column='Activo', default=True)
    
    class Meta:
        managed = False
        db_table = 'Producto'

    def __str__(self):
        return self.nombre


class StockAlmacen(models.Model):
    almacen = models.ForeignKey(
        Almacen,
        db_column='AlmacenID',
        on_delete=models.DO_NOTHING
    )
    producto = models.ForeignKey(
        Producto,
        db_column='ProductoID',
        on_delete=models.DO_NOTHING
    )
    stock_total = models.IntegerField(db_column='StockTotal', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'StockAlmacen'
        unique_together = (('almacen', 'producto'),)


class Lote(models.Model):
    id = models.AutoField(db_column='ID', primary_key=True)
    producto = models.ForeignKey(Producto, models.DO_NOTHING, db_column='ProductoID', blank=True, null=True)
    almacen = models.ForeignKey(Almacen, models.DO_NOTHING, db_column='AlmacenID', blank=True, null=True)
    cantidad_inicial = models.IntegerField(db_column='CantidadInicial', blank=True, null=True)
    cantidad_actual = models.IntegerField(db_column='CantidadActual', blank=True, null=True)
    costo_compra = models.DecimalField(db_column='CostoCompra', max_digits=18, decimal_places=2, blank=True, null=True)
    fecha_ingreso = models.DateTimeField(db_column='FechaIngreso', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Lote'


class MovimientoInventario(models.Model):
    id = models.AutoField(db_column='ID', primary_key=True)
    producto = models.ForeignKey(Producto, models.DO_NOTHING, db_column='ProductoID', blank=True, null=True)
    almacen = models.ForeignKey(Almacen, models.DO_NOTHING, db_column='AlmacenID', blank=True, null=True)
    lote = models.ForeignKey(Lote, models.DO_NOTHING, db_column='LoteID', blank=True, null=True)
    tipo_movimiento = models.CharField(db_column='TipoMovimiento', max_length=20, blank=True, null=True)
    cantidad = models.IntegerField(db_column='Cantidad', blank=True, null=True)
    fecha = models.DateTimeField(db_column='Fecha', blank=True, null=True)
    usuario = models.ForeignKey(Usuario, models.DO_NOTHING, db_column='UsuarioID', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'MovimientoInventario'


class Repartidor(models.Model):
    id = models.AutoField(db_column='ID', primary_key=True)
    nombre_completo = models.CharField(db_column='NombreCompleto', max_length=255, blank=True, null=True)
    vehiculo = models.CharField(db_column='Vehiculo', max_length=50, blank=True, null=True)
    placa = models.CharField(db_column='Placa', max_length=20, blank=True, null=True)
    telefono = models.CharField(db_column='Telefono', max_length=20, blank=True, null=True)
    activo = models.BooleanField(db_column='Activo', default=True)

    class Meta:
        managed = False
        db_table = 'Repartidor'


class Cliente(models.Model):
    id = models.AutoField(db_column='ID', primary_key=True)
    nombre = models.CharField(db_column='Nombre', max_length=100)
    apellidos = models.CharField(db_column='Apellidos', max_length=100, blank=True, null=True)
    email = models.EmailField(db_column='Email', max_length=100, blank=True, null=True)
    segmento = models.CharField(db_column='Segmento', max_length=50, default='Nuevo')
    activo = models.BooleanField(db_column='Activo', default=True)
    odoo_partner_id = models.IntegerField(db_column='OdooPartnerID', blank=True, null=True)
    odoo_sync_status = models.CharField(db_column='OdooSyncStatus', max_length=50, blank=True, null=True)
    odoo_last_sync = models.DateTimeField(db_column='OdooLastSync', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Cliente'

    def __str__(self):
        return f'{self.nombre} {self.apellidos or ""}'.strip()


class Pedido(models.Model):
    id = models.AutoField(db_column='ID', primary_key=True)
    cliente = models.ForeignKey(Cliente, models.DO_NOTHING, db_column='ClienteID', blank=True, null=True)
    empleado = models.ForeignKey(Empleado, models.DO_NOTHING, db_column='EmpleadoID', blank=True, null=True)
    almacen_origen = models.ForeignKey(Almacen, models.DO_NOTHING, db_column='AlmacenOrigenID', blank=True, null=True)
    repartidor = models.ForeignKey(Repartidor, models.DO_NOTHING, db_column='RepartidorID', blank=True, null=True)
    fecha_pedido = models.DateTimeField(db_column='FechaPedido', blank=True, null=True)
    fecha_entrega_real = models.DateTimeField(db_column='FechaEntregaReal', blank=True, null=True)
    metodo_envio = models.CharField(db_column='MetodoEnvio', max_length=50, blank=True, null=True)
    total = models.DecimalField(db_column='Total', max_digits=18, decimal_places=2, blank=True, null=True)
    estado = models.CharField(db_column='Estado', max_length=50, blank=True, null=True)
    satisfaccion_cliente = models.IntegerField(db_column='SatisfaccionCliente', blank=True, null=True)
    error_en_orden = models.BooleanField(db_column='ErrorEnOrden', default=False)

    class Meta:
        managed = False
        db_table = 'Pedido'


class DetallePedido(models.Model):
    id = models.AutoField(db_column='ID', primary_key=True)
    pedido = models.ForeignKey(Pedido, models.DO_NOTHING, db_column='PedidoID', blank=True, null=True)
    producto = models.ForeignKey(Producto, models.DO_NOTHING, db_column='ProductoID', blank=True, null=True)
    lote = models.ForeignKey(Lote, models.DO_NOTHING, db_column='LoteID', blank=True, null=True)
    cantidad = models.IntegerField(db_column='Cantidad', blank=True, null=True)
    precio_unitario_venta = models.DecimalField(db_column='PrecioUnitarioVenta', max_digits=18, decimal_places=2, blank=True, null=True)
    costo_unitario_historico = models.DecimalField(db_column='CostoUnitarioHistorico', max_digits=18, decimal_places=2, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'DetallePedido'


class Proveedor(models.Model):
    id = models.AutoField(db_column='ID', primary_key=True)
    nombre_proveedor = models.CharField(db_column='NombreProveedor', max_length=150, blank=True, null=True)
    telefono = models.CharField(db_column='Telefono', max_length=20, blank=True, null=True)
    activo = models.BooleanField(db_column='Activo', default=True)

    class Meta:
        managed = False
        db_table = 'Proveedor'


class OrdenCompra(models.Model):
    id = models.AutoField(db_column='ID', primary_key=True)
    proveedor = models.ForeignKey(Proveedor, models.DO_NOTHING, db_column='ProveedorID', blank=True, null=True)
    almacen_destino = models.ForeignKey(Almacen, models.DO_NOTHING, db_column='AlmacenDestinoID', blank=True, null=True)
    fecha = models.DateTimeField(db_column='Fecha', blank=True, null=True)
    total = models.DecimalField(db_column='Total', max_digits=18, decimal_places=2, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'OrdenCompra'


class DetalleCompra(models.Model):
    id = models.AutoField(db_column='ID', primary_key=True)
    orden_compra = models.ForeignKey(OrdenCompra, models.DO_NOTHING, db_column='OrdenCompraID', blank=True, null=True)
    producto = models.ForeignKey(Producto, models.DO_NOTHING, db_column='ProductoID', blank=True, null=True)
    cantidad = models.IntegerField(db_column='Cantidad', blank=True, null=True)
    precio_compra_unitario = models.DecimalField(db_column='PrecioCompraUnitario', max_digits=18, decimal_places=2, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'DetalleCompra'


class Auditoria(models.Model):
    id = models.AutoField(db_column='ID', primary_key=True)
    usuario = models.ForeignKey(Usuario, models.DO_NOTHING, db_column='UsuarioID', blank=True, null=True)
    accion = models.CharField(db_column='Accion', max_length=50, blank=True, null=True)
    tabla_afectada = models.CharField(db_column='TablaAfectada', max_length=50, blank=True, null=True)
    registro_id = models.IntegerField(db_column='RegistroID', blank=True, null=True)
    valor_anterior = models.TextField(db_column='ValorAnterior', blank=True, null=True)
    valor_nuevo = models.TextField(db_column='ValorNuevo', blank=True, null=True)
    ip_maquina = models.CharField(db_column='IP_Maquina', max_length=50, blank=True, null=True)
    fecha = models.DateTimeField(db_column='Fecha', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Auditoria'
