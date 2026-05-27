import { useEffect, useState } from 'react'
import api from '../services/api'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const cargarDashboard = async () => {
    try {
      const res = await api.get('/dashboard/')
      setData(res.data)
      setError('')
    } catch (err) {
      setError('No se pudo cargar el dashboard.')
      setData(null)
    }
  }

  useEffect(() => {
    cargarDashboard()
  }, [])

  const formatoMoneda = (valor) => {
    const numero = Number(valor || 0)
    return `Bs ${numero.toLocaleString('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  const kpis = data?.kpis || {}

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Dashboard Gerencial</h1>
          <p>Resumen comercial, inventario y compras del sistema CRM Samsung.</p>
        </div>

        <button onClick={cargarDashboard}>Actualizar</button>
      </div>

      {error && <div className="alert error">{error}</div>}

      {!data ? (
        <div className="card">Cargando dashboard...</div>
      ) : (
        <>
          <section className="kpi-grid">
            <KpiCard titulo="Clientes" valor={kpis.clientes} />
            <KpiCard titulo="Productos" valor={kpis.productos} />
            <KpiCard titulo="Pedidos" valor={kpis.pedidos} />
            <KpiCard titulo="Ventas totales" valor={formatoMoneda(kpis.ventas_total)} />
            <KpiCard titulo="Stock total" valor={kpis.stock_total} />
            <KpiCard titulo="Compras totales" valor={formatoMoneda(kpis.compras_total)} />
          </section>

          <section className="dashboard-grid">
            <div className="card">
              <h2>Últimos pedidos</h2>

              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Cliente</th>
                    <th>Fecha</th>
                    <th>Total</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ultimos_pedidos.length === 0 ? (
                    <tr>
                      <td colSpan="5">No hay pedidos registrados.</td>
                    </tr>
                  ) : (
                    data.ultimos_pedidos.map((pedido) => (
                      <tr key={pedido.id}>
                        <td>{pedido.id}</td>
                        <td>{pedido.cliente}</td>
                        <td>{pedido.fecha}</td>
                        <td>{formatoMoneda(pedido.total)}</td>
                        <td>
                          <span className="badge">{pedido.estado}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="card">
              <h2>Productos más vendidos</h2>

              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Ingreso</th>
                  </tr>
                </thead>
                <tbody>
                  {data.productos_mas_vendidos.length === 0 ? (
                    <tr>
                      <td colSpan="3">Aún no hay ventas suficientes.</td>
                    </tr>
                  ) : (
                    data.productos_mas_vendidos.map((item) => (
                      <tr key={item.producto}>
                        <td>{item.producto}</td>
                        <td>{item.cantidad_vendida}</td>
                        <td>{formatoMoneda(item.ingreso_total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="card">
              <h2>Stock bajo</h2>

              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Almacén</th>
                    <th>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {data.stock_bajo.length === 0 ? (
                    <tr>
                      <td colSpan="3">No hay productos con stock bajo.</td>
                    </tr>
                  ) : (
                    data.stock_bajo.map((item) => (
                      <tr key={`${item.producto}-${item.almacen}`}>
                        <td>{item.producto}</td>
                        <td>{item.almacen}</td>
                        <td>
                          <span className="badge warning">{item.stock}</span>
                        </td>
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

function KpiCard({ titulo, valor }) {
  return (
    <div className="kpi-card">
      <span>{titulo}</span>
      <strong>{valor ?? 0}</strong>
    </div>
  )
}