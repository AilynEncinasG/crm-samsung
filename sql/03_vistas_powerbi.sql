USE DW_Samsung;
GO

CREATE OR ALTER VIEW vw_ventas_resumen AS
SELECT
    f.HechoKey,
    df.Fecha,
    df.Anio,
    df.Mes,
    df.MesNombre,
    dc.NombreCompleto AS Cliente,
    dc.Segmento,
    dp.NombreProducto,
    dp.Categoria,
    dp.Gama,
    de.NombreCompleto AS Empleado,
    de.Tienda,
    dl.RepartidorNombre,
    dl.MetodoEnvio,
    dl.AlmacenOrigen,
    f.CantidadVendida,
    f.IngresoBruto,
    f.CostoTotalLote,
    f.UtilidadNeta,
    f.PuntajeSatisfaccion,
    f.ErrorEnPedido,
    f.TiempoEntregaDias,
    f.EsCapacitado
FROM Fact_Ventas_Global f
INNER JOIN Dim_Fecha df ON df.FechaKey = f.FechaKey
INNER JOIN Dim_Cliente dc ON dc.ClienteKey = f.ClienteKey
INNER JOIN Dim_Producto dp ON dp.ProductoKey = f.ProductoKey
LEFT JOIN Dim_Empleado de ON de.EmpleadoKey = f.EmpleadoKey
LEFT JOIN Dim_Logistica dl ON dl.LogisticaKey = f.LogisticaKey;
GO

CREATE OR ALTER VIEW vw_kpis_ventas AS
SELECT
    COUNT(*) AS TotalRegistrosVenta,
    SUM(CantidadVendida) AS UnidadesVendidas,
    SUM(IngresoBruto) AS IngresoBruto,
    SUM(CostoTotalLote) AS CostoTotal,
    SUM(UtilidadNeta) AS UtilidadNeta,
    AVG(CAST(PuntajeSatisfaccion AS DECIMAL(10,2))) AS SatisfaccionPromedio,
    SUM(CASE WHEN ErrorEnPedido = 1 THEN 1 ELSE 0 END) AS PedidosConError
FROM Fact_Ventas_Global;
GO

CREATE OR ALTER VIEW vw_productos_mas_vendidos AS
SELECT
    dp.NombreProducto,
    dp.Categoria,
    dp.Gama,
    SUM(f.CantidadVendida) AS UnidadesVendidas,
    SUM(f.IngresoBruto) AS IngresoBruto,
    SUM(f.UtilidadNeta) AS UtilidadNeta
FROM Fact_Ventas_Global f
INNER JOIN Dim_Producto dp ON dp.ProductoKey = f.ProductoKey
GROUP BY dp.NombreProducto, dp.Categoria, dp.Gama;
GO
