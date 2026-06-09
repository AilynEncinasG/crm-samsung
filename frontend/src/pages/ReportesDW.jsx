import { useEffect, useState } from 'react'

const API_URL = 'http://localhost:8000/api/dashboard-dw/'

export default function ReportesDW() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarDashboardDW()
  }, [])

  const cargarDashboardDW = async () => {
    try {
      setLoading(true)

      const response = await fetch(API_URL)

      if (!response.ok) {
        throw new Error('Error al cargar dashboard DW')
      }

      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error(error)
      alert('No se pudieron cargar los reportes del Data Warehouse')
    } finally {
      setLoading(false)
    }
  }

  const formatoMoneda = (valor) => {
    const numero = Number(valor || 0)

    return numero.toLocaleString('es-BO', {
      style: 'currency',
      currency: 'BOB',
    })
  }

  const formatoNumero = (valor) => {
    return Number(valor || 0).toLocaleString('es-BO')
  }

  if (loading) {
    return <p>Cargando reportes del Data Warehouse...</p>
  }

  if (!data) {
    return <p>No existen datos disponibles del Data Warehouse.</p>
  }

  const kpis = data.kpis || {}
  const ventasPorProducto = data.ventas_por_producto || []
  const ventasPorCliente = data.ventas_por_cliente || []
  const ventasPorFecha = data.ventas_por_fecha || []
  const ventasPorLogistica = data.ventas_por_logistica || []

  return (
    <div>
      <h1>Reportes Data Warehouse</h1>

      <p>
        Este módulo presenta indicadores consolidados del Data Warehouse para
        apoyar el análisis comercial, financiero, logístico y gerencial.
      </p>

      <div className="grid-cards">
        <div className="card">
          <h3>Registros analíticos</h3>
          <p>{formatoNumero(kpis.registros_fact)}</p>
        </div>

        <div className="card">
          <h3>Ingreso bruto</h3>
          <p>{formatoMoneda(kpis.ingreso_bruto)}</p>
        </div>

        <div className="card">
          <h3>Costo total</h3>
          <p>{formatoMoneda(kpis.costo_total)}</p>
        </div>

        <div className="card">
          <h3>Utilidad neta</h3>
          <p>{formatoMoneda(kpis.utilidad_neta)}</p>
        </div>

        <div className="card">
          <h3>Cantidad vendida</h3>
          <p>{formatoNumero(kpis.cantidad_vendida)}</p>
        </div>

        <div className="card">
          <h3>Satisfacción promedio</h3>
          <p>{kpis.satisfaccion_promedio || 0}</p>
        </div>
      </div>

      <section className="card">
        <h2>Resumen ETL</h2>
        <p>
          La información presentada corresponde a datos consolidados para
          análisis gerencial. El flujo representa la transformación de datos
          operativos de ventas, clientes, productos, almacenes y logística hacia
          una estructura analítica del Data Warehouse.
        </p>

        <table>
          <thead>
            <tr>
              <th>Proceso</th>
              <th>Estado</th>
              <th>Uso estratégico</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>Extracción</td>
              <td>Completada</td>
              <td>Obtención de datos desde pedidos, productos y clientes</td>
            </tr>
            <tr>
              <td>Transformación</td>
              <td>Completada</td>
              <td>Consolidación de importes, costos, utilidad y cantidades</td>
            </tr>
            <tr>
              <td>Carga</td>
              <td>Completada</td>
              <td>Datos disponibles para reportes y dashboards</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Ventas por producto</h2>

        {ventasPorProducto.length === 0 ? (
          <p>No existen ventas por producto.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad vendida</th>
                <th>Ingreso</th>
                <th>Utilidad</th>
              </tr>
            </thead>

            <tbody>
              {ventasPorProducto.map((item) => (
                <tr key={item.producto}>
                  <td>{item.producto}</td>
                  <td>{item.cantidad}</td>
                  <td>{formatoMoneda(item.ingreso)}</td>
                  <td>{formatoMoneda(item.utilidad)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2>Ventas por cliente</h2>

        {ventasPorCliente.length === 0 ? (
          <p>No existen ventas por cliente.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Cantidad comprada</th>
                <th>Ingreso generado</th>
              </tr>
            </thead>

            <tbody>
              {ventasPorCliente.map((item) => (
                <tr key={item.cliente}>
                  <td>{item.cliente}</td>
                  <td>{item.cantidad}</td>
                  <td>{formatoMoneda(item.ingreso)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2>Ventas por fecha</h2>

        {ventasPorFecha.length === 0 ? (
          <p>No existen ventas por fecha.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Ingreso</th>
                <th>Utilidad</th>
              </tr>
            </thead>

            <tbody>
              {ventasPorFecha.map((item) => (
                <tr key={item.fecha}>
                  <td>{item.fecha}</td>
                  <td>{formatoMoneda(item.ingreso)}</td>
                  <td>{formatoMoneda(item.utilidad)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2>Ventas por logística</h2>

        {ventasPorLogistica.length === 0 ? (
          <p>No existen datos logísticos.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Repartidor</th>
                <th>Método de envío</th>
                <th>Almacén</th>
                <th>Cantidad</th>
                <th>Ingreso</th>
              </tr>
            </thead>

            <tbody>
              {ventasPorLogistica.map((item) => (
                <tr
                  key={`${item.repartidor}-${item.metodo_envio}-${item.almacen}`}
                >
                  <td>{item.repartidor}</td>
                  <td>{item.metodo_envio}</td>
                  <td>{item.almacen}</td>
                  <td>{item.cantidad}</td>
                  <td>{formatoMoneda(item.ingreso)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2>Tablas analíticas representadas</h2>

        <table>
          <thead>
            <tr>
              <th>Tabla DW</th>
              <th>Descripción</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>HechoVentas</td>
              <td>Consolida ventas, cantidades, ingresos, costos y utilidad.</td>
            </tr>
            <tr>
              <td>DimProducto</td>
              <td>Permite analizar resultados por producto.</td>
            </tr>
            <tr>
              <td>DimCliente</td>
              <td>Permite analizar comportamiento comercial por cliente.</td>
            </tr>
            <tr>
              <td>DimTiempo</td>
              <td>Permite analizar ingresos y utilidad por fecha.</td>
            </tr>
            <tr>
              <td>DimAlmacén</td>
              <td>Permite analizar ventas según ubicación logística.</td>
            </tr>
            <tr>
              <td>DimRepartidor</td>
              <td>Permite analizar entregas y ventas por repartidor.</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Interpretación gerencial</h2>
        <p>
          El Data Warehouse permite consolidar datos comerciales para evaluar
          ingresos, costos, utilidad, productos vendidos, clientes principales y
          desempeño logístico. Esta información puede ser utilizada como base
          para dashboards gerenciales y reportes tipo Power BI.
        </p>
      </section>
    </div>
  )
}