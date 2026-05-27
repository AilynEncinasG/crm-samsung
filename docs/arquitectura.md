# Arquitectura del sistema CRM Samsung

## Flujo principal

React consume servicios REST del backend Django. Django se conecta a la base transaccional SQL Server para registrar operaciones comerciales, inventario y compras. Luego un comando ETL carga datos consolidados al Data Warehouse. Power BI se conecta al DW para reportes gerenciales.

```text
React -> Django REST API -> SQL Server OLTP -> ETL -> SQL Server DW -> Power BI
```

## Responsabilidades

- React: interfaz de usuario.
- Django: API, validaciones, reglas de negocio y ETL.
- SQL Server OLTP: datos operativos del sistema.
- SQL Server DW: datos analíticos consolidados.
- Power BI: visualización gerencial.
