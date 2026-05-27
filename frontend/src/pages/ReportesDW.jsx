import { useEffect, useState } from 'react'
import api from '../services/api'

export default function ReportesDW() {
  const [data, setData] = useState(null)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const cargarReportes = async () => {
    setCargando(true)
    setError('')
    setMensaje('')

    try {
      const res = await api.get('/dashboard-dw/')
      setData(res.data)
    } catch (err) {
      setError('No se pudieron cargar los reportes del Data Warehouse.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarReportes()
  }, [])

  const formatoMoneda = (valor) => {
    const numero = Number(valor || 0)
    return `Bs ${numero.toLocaleString('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  const formatoNumero = (valor) => {
    return Number(valor || 0).toLocaleString('es-BO')
  }

  const kpis = data?.kpis || {}

  const ventasPorProducto = data?.ventas_por_producto || []
  const ventasPorCliente = data?.ventas_por_cliente || []
  const ventasPorFecha = data?.ventas_por_fecha || []
  const ventasPorLogistica = data?.ventas_por_logistica || []

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Reportes Data Warehouse</h1>
          <p>
            Indicadores analíticos cargados desde el DW_Samsung para análisis gerencial.
          </p>
        </div>

        <button onClick={cargarReportes} disabled={cargando}>
          {cargando ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      {mensaje && <div className="alert success">{mensaje}</div>}
      {error && <div className="alert error">{error}</div>}

      {!data ? (
        <div className="card">Cargando reportes...</div>
      ) : (
        <>
          <section className="kpi-grid">
            <div className="kpi-card">
              <span>Registros en fact ventas</span>
              <strong>{formatoNumero(kpis.registros_fact)}</strong>
            </div>

            <div className="kpi-card">
              <span>Ingreso bruto</span>
              <strong>{formatoMoneda(kpis.ingreso_bruto)}</strong>
            </div>

            <div className="kpi-card">
              <span>Costo total</span>
              <strong>{formatoMoneda(kpis.costo_total)}</strong>
            </div>

            <div className="kpi-card">
              <span>Utilidad neta</span>
              <strong>{formatoMoneda(kpis.utilidad_neta)}</strong>
            </div>

            <div className="kpi-card">
              <span>Cantidad vendida</span>
              <strong>{formatoNumero(kpis.cantidad_vendida)}</strong>
            </div>

            <div className="kpi-card">
              <span>Satisfacción promedio</span>
              <strong>{Number(kpis.satisfaccion_promedio || 0).toFixed(2)}</strong>
            </div>
          </section>

          <section className="dashboard-grid">
            <div className="card">
              <h2>Ventas por producto</h2>

              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Ingreso</th>
                    <th>Utilidad</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasPorProducto.length === 0 ? (
                    <tr>
                      <td colSpan="4">No hay información en el DW.</td>
                    </tr>
                  ) : (
                    ventasPorProducto.map((item) => (
                      <tr key={item.producto}>
                        <td>{item.producto}</td>
                        <td>{formatoNumero(item.cantidad)}</td>
                        <td>{formatoMoneda(item.ingreso)}</td>
                        <td>{formatoMoneda(item.utilidad)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="card">
              <h2>Ventas por cliente</h2>

              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Cantidad</th>
                    <th>Ingreso</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasPorCliente.length === 0 ? (
                    <tr>
                      <td colSpan="3">No hay información en el DW.</td>
                    </tr>
                  ) : (
                    ventasPorCliente.map((item) => (
                      <tr key={item.cliente}>
                        <td>{item.cliente}</td>
                        <td>{formatoNumero(item.cantidad)}</td>
                        <td>{formatoMoneda(item.ingreso)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="card">
              <h2>Ventas por fecha</h2>

              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Ingreso</th>
                    <th>Utilidad</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasPorFecha.length === 0 ? (
                    <tr>
                      <td colSpan="3">No hay información en el DW.</td>
                    </tr>
                  ) : (
                    ventasPorFecha.map((item) => (
                      <tr key={item.fecha}>
                        <td>{item.fecha}</td>
                        <td>{formatoMoneda(item.ingreso)}</td>
                        <td>{formatoMoneda(item.utilidad)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="card">
              <h2>Ventas por logística</h2>

              <table>
                <thead>
                  <tr>
                    <th>Repartidor</th>
                    <th>Método</th>
                    <th>Almacén</th>
                    <th>Cantidad</th>
                    <th>Ingreso</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasPorLogistica.length === 0 ? (
                    <tr>
                      <td colSpan="5">No hay información en el DW.</td>
                    </tr>
                  ) : (
                    ventasPorLogistica.map((item, index) => (
                      <tr key={index}>
                        <td>{item.repartidor}</td>
                        <td>{item.metodo_envio}</td>
                        <td>{item.almacen}</td>
                        <td>{formatoNumero(item.cantidad)}</td>
                        <td>{formatoMoneda(item.ingreso)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  )
}