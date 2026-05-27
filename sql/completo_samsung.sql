-- CRM/completo_samsung.sql
-- =============================================
-- PARTE 1: BASE DE DATOS TRANSACCIONAL (OLTP)
-- =============================================
CREATE DATABASE samsung_electronics;
GO
USE samsung_electronics;
GO

-- 1.1 TABLAS DE INFRAESTRUCTURA
CREATE TABLE Tienda (
    ID INT PRIMARY KEY IDENTITY(1,1),
    NombreTienda NVARCHAR(100) NOT NULL,
    Ciudad NVARCHAR(100),
    Direccion NVARCHAR(255)
);

CREATE TABLE Departamento (
    ID INT PRIMARY KEY IDENTITY(1,1),
    NombreDepartamento NVARCHAR(100) NOT NULL
);

CREATE TABLE Empleado (
    ID INT PRIMARY KEY IDENTITY(1,1),
    TiendaID INT FOREIGN KEY REFERENCES Tienda(ID),
    DepartamentoID INT FOREIGN KEY REFERENCES Departamento(ID),
    Nombre NVARCHAR(100) NOT NULL,
    Apellido NVARCHAR(100),
    Cargo NVARCHAR(50),
    Capacitado BIT DEFAULT 0 
);

CREATE TABLE Rol (
    ID INT PRIMARY KEY IDENTITY(1,1),
    NombreRol NVARCHAR(50) NOT NULL 
);

CREATE TABLE Almacen (
    ID INT PRIMARY KEY IDENTITY(1,1),
    NombreAlmacen NVARCHAR(100) NOT NULL,
    Ubicacion NVARCHAR(255),
    TiendaID INT FOREIGN KEY REFERENCES Tienda(ID)
);

CREATE TABLE Usuario (
    ID INT PRIMARY KEY IDENTITY(1,1),
    EmpleadoID INT FOREIGN KEY REFERENCES Empleado(ID),
    AlmacenAsignadoID INT FOREIGN KEY REFERENCES Almacen(ID),
    Username NVARCHAR(50) UNIQUE NOT NULL,
    PasswordHash NVARCHAR(255) NOT NULL,
    RolID INT FOREIGN KEY REFERENCES Rol(ID),
    UltimoAcceso DATETIME,
    Activo BIT DEFAULT 1
);

-- 1.2 TABLAS DE INVENTARIO Y LOTES
CREATE TABLE Categoria (
    ID INT PRIMARY KEY IDENTITY(1,1),
    NombreCategoria NVARCHAR(100) NOT NULL
);

CREATE TABLE Producto (
    ID INT PRIMARY KEY IDENTITY(1,1),
    Nombre NVARCHAR(150) NOT NULL,
    CategoriaID INT FOREIGN KEY REFERENCES Categoria(ID),
    PrecioVentaSugerido DECIMAL(18,2) NOT NULL,
    Gama NVARCHAR(50)
);

CREATE TABLE StockAlmacen (
    AlmacenID INT FOREIGN KEY REFERENCES Almacen(ID),
    ProductoID INT FOREIGN KEY REFERENCES Producto(ID),
    StockTotal INT DEFAULT 0,
    PRIMARY KEY (AlmacenID, ProductoID)
);

CREATE TABLE Lote (
    ID INT PRIMARY KEY IDENTITY(1,1),
    ProductoID INT FOREIGN KEY REFERENCES Producto(ID),
    AlmacenID INT FOREIGN KEY REFERENCES Almacen(ID),
    CantidadInicial INT,
    CantidadActual INT,
    CostoCompra DECIMAL(18,2),
    FechaIngreso DATETIME DEFAULT GETDATE()
);

CREATE TABLE MovimientoInventario (
    ID INT PRIMARY KEY IDENTITY(1,1),
    ProductoID INT FOREIGN KEY REFERENCES Producto(ID),
    AlmacenID INT FOREIGN KEY REFERENCES Almacen(ID),
    LoteID INT FOREIGN KEY REFERENCES Lote(ID),
    TipoMovimiento NVARCHAR(20),
    Cantidad INT,
    Fecha DATETIME DEFAULT GETDATE(),
    UsuarioID INT FOREIGN KEY REFERENCES Usuario(ID)
);

-- 1.3 TABLAS DE LOGÍSTICA Y VENTAS
CREATE TABLE Repartidor (
    ID INT PRIMARY KEY IDENTITY(1,1),
    NombreCompleto NVARCHAR(255),
    Vehiculo NVARCHAR(50),
    Placa NVARCHAR(20),
    Telefono NVARCHAR(20),
    Activo BIT DEFAULT 1
);

CREATE TABLE Cliente (
    ID INT PRIMARY KEY IDENTITY(1,1),
    Nombre NVARCHAR(100) NOT NULL,
    Apellidos NVARCHAR(100),
    Email NVARCHAR(100),
    Segmento NVARCHAR(50) DEFAULT 'Nuevo'
);

CREATE TABLE Pedido (
    ID INT PRIMARY KEY IDENTITY(1,1),
    ClienteID INT FOREIGN KEY REFERENCES Cliente(ID),
    EmpleadoID INT FOREIGN KEY REFERENCES Empleado(ID),
    AlmacenOrigenID INT FOREIGN KEY REFERENCES Almacen(ID),
    RepartidorID INT FOREIGN KEY REFERENCES Repartidor(ID),
    FechaPedido DATETIME DEFAULT GETDATE(),
    FechaEntregaReal DATETIME,
    MetodoEnvio NVARCHAR(50),
    Total DECIMAL(18,2),
    Estado NVARCHAR(50),
    SatisfaccionCliente INT CHECK (SatisfaccionCliente BETWEEN 1 AND 5),
    ErrorEnOrden BIT DEFAULT 0 
);

CREATE TABLE DetallePedido (
    ID INT PRIMARY KEY IDENTITY(1,1),
    PedidoID INT FOREIGN KEY REFERENCES Pedido(ID),
    ProductoID INT FOREIGN KEY REFERENCES Producto(ID),
    LoteID INT FOREIGN KEY REFERENCES Lote(ID),
    Cantidad INT,
    PrecioUnitarioVenta DECIMAL(18,2),
    CostoUnitarioHistorico DECIMAL(18,2)
);

-- 1.4 COMPRAS Y AUDITORÍA
CREATE TABLE Proveedor (
    ID INT PRIMARY KEY IDENTITY(1,1),
    NombreProveedor NVARCHAR(150),
    Telefono NVARCHAR(20)
);

CREATE TABLE OrdenCompra (
    ID INT PRIMARY KEY IDENTITY(1,1),
    ProveedorID INT FOREIGN KEY REFERENCES Proveedor(ID),
    AlmacenDestinoID INT FOREIGN KEY REFERENCES Almacen(ID),
    Fecha DATETIME DEFAULT GETDATE(),
    Total DECIMAL(18,2)
);

CREATE TABLE DetalleCompra (
    ID INT PRIMARY KEY IDENTITY(1,1),
    OrdenCompraID INT FOREIGN KEY REFERENCES OrdenCompra(ID),
    ProductoID INT FOREIGN KEY REFERENCES Producto(ID),
    Cantidad INT,
    PrecioCompraUnitario DECIMAL(18,2)
);

CREATE TABLE Auditoria (
    ID INT PRIMARY KEY IDENTITY(1,1),
    UsuarioID INT FOREIGN KEY REFERENCES Usuario(ID),
    Accion NVARCHAR(50),
    TablaAfectada NVARCHAR(50),
    RegistroID INT,
    ValorAnterior NVARCHAR(MAX),
    ValorNuevo NVARCHAR(MAX),
    IP_Maquina NVARCHAR(50),
    Fecha DATETIME DEFAULT GETDATE()
);
GO

-- =============================================
-- 2. TRIGGERS (EL MOTOR DE INTELIGENCIA)
-- =============================================

-- T1: Actualiza Stock y Crea Lote al Comprar
CREATE TRIGGER TR_ActualizarStockCompra
ON DetalleCompra
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Lote (ProductoID, AlmacenID, CantidadInicial, CantidadActual, CostoCompra)
    SELECT i.ProductoID, oc.AlmacenDestinoID, i.Cantidad, i.Cantidad, i.PrecioCompraUnitario
    FROM inserted i JOIN OrdenCompra oc ON i.OrdenCompraID = oc.ID;

    MERGE StockAlmacen AS Target
    USING (SELECT i.ProductoID, oc.AlmacenDestinoID, i.Cantidad FROM inserted i JOIN OrdenCompra oc ON i.OrdenCompraID = oc.ID) AS Source
    ON (Target.ProductoID = Source.ProductoID AND Target.AlmacenID = Source.AlmacenDestinoID)
    WHEN MATCHED THEN UPDATE SET Target.StockTotal = Target.StockTotal + Source.Cantidad
    WHEN NOT MATCHED THEN INSERT (AlmacenID, ProductoID, StockTotal) VALUES (Source.AlmacenDestinoID, Source.ProductoID, Source.Cantidad);
END;
GO

-- T2: Restar Stock automáticamente al Vender
CREATE TRIGGER TR_RestarStockVenta
ON DetallePedido
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE SA
    SET SA.StockTotal = SA.StockTotal - i.Cantidad
    FROM StockAlmacen SA
    JOIN inserted i ON SA.ProductoID = i.ProductoID
    JOIN Pedido P ON i.PedidoID = P.ID
    WHERE SA.AlmacenID = P.AlmacenOrigenID;
END;
GO

-- T3: Auditoría de cambios de precio
CREATE TRIGGER TR_AuditoriaPrecios
ON Producto
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF UPDATE(PrecioVentaSugerido)
    BEGIN
        INSERT INTO Auditoria (UsuarioID, Accion, TablaAfectada, RegistroID, ValorAnterior, ValorNuevo, IP_Maquina)
        SELECT (SELECT TOP 1 ID FROM Usuario WHERE Activo = 1), 'CAMBIO_PRECIO', 'Producto', i.ID, 
               CAST(d.PrecioVentaSugerido AS NVARCHAR(MAX)), CAST(i.PrecioVentaSugerido AS NVARCHAR(MAX)), HOST_NAME()
        FROM inserted i JOIN deleted d ON i.ID = d.ID;
    END
END;
GO

-- =============================================
-- 3. DATA WAREHOUSE (OLAP)
-- =============================================
CREATE DATABASE DW_Samsung;
GO
USE DW_Samsung;
GO

CREATE TABLE Dim_Cliente (
    ClienteKey INT PRIMARY KEY IDENTITY(1,1),
    ID_Original INT,
    NombreCompleto NVARCHAR(255),
    Email NVARCHAR(100),
    Segmento NVARCHAR(50)
);

CREATE TABLE Dim_Producto (
    ProductoKey INT PRIMARY KEY IDENTITY(1,1),
    ID_Original INT,
    NombreProducto NVARCHAR(150),
    Categoria NVARCHAR(100),
    Gama NVARCHAR(50)
);

CREATE TABLE Dim_Empleado (
    EmpleadoKey INT PRIMARY KEY IDENTITY(1,1),
    ID_Original INT,
    NombreCompleto NVARCHAR(255),
    Cargo NVARCHAR(50),
    Tienda NVARCHAR(100),
    CiudadTienda NVARCHAR(100)
);

CREATE TABLE Dim_Logistica (
    LogisticaKey INT PRIMARY KEY IDENTITY(1,1),
    RepartidorNombre NVARCHAR(255),
    Vehiculo NVARCHAR(50),
    MetodoEnvio NVARCHAR(50),
    AlmacenOrigen NVARCHAR(100)
);

CREATE TABLE Dim_Fecha (
    FechaKey INT PRIMARY KEY, -- Formato YYYYMMDD
    Fecha DATE,
    Anio INT,
    Mes INT,
    MesNombre NVARCHAR(20),
    Trimestre INT,
    EsFinDeSemana BIT
);

CREATE TABLE Fact_Ventas_Global (
    HechoKey INT PRIMARY KEY IDENTITY(1,1),
    FechaKey INT FOREIGN KEY REFERENCES Dim_Fecha(FechaKey),
    ClienteKey INT FOREIGN KEY REFERENCES Dim_Cliente(ClienteKey),
    ProductoKey INT FOREIGN KEY REFERENCES Dim_Producto(ProductoKey),
    EmpleadoKey INT FOREIGN KEY REFERENCES Dim_Empleado(EmpleadoKey),
    LogisticaKey INT FOREIGN KEY REFERENCES Dim_Logistica(LogisticaKey),
    CantidadVendida INT,
    IngresoBruto DECIMAL(18,2),
    CostoTotalLote DECIMAL(18,2),
    UtilidadNeta AS (IngresoBruto - CostoTotalLote),
    PuntajeSatisfaccion INT,
    ErrorEnPedido BIT,
    TiempoEntregaDias INT,
    EsCapacitado BIT
);
GO