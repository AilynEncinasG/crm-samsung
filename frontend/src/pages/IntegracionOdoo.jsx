import { useEffect, useState } from 'react'
import api from '../services/api'

export default function IntegracionOdoo() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const cargarResumen = async () => {
    setCargando(true)
    setError('')

    try {
      const res = await api.get('/odoo/resumen/')
      setData(res.data)
    } catch (err) {
      const detalle =
        err.response?.data?.error ||
        'No se pudo cargar el resumen de integración Odoo.'
      setError(detalle)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarResumen()
  }, [])

  const formatoMoneda = (valor) => {
    const numero = Number(valor || 0)
    return `Bs ${numero.toLocaleString('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  const kpis = data?.kpis || {}
  const logs = data?.ultimos_logs || []
  const facturas = data?.ultimas_facturas || []
  const version = data?.version_odoo || {}

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Integración Odoo</h1>
          <p>
            Estado de conexión, sincronización de clientes/productos y facturación ERP.
          </p>
        </div>

        <button onClick={cargarResumen} disabled={cargando}>
          {cargando ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}

      {!data ? (
        <div className="card">Cargando integración Odoo...</div>
      ) : (
        <>
          <section className="card">
            <h2>Estado de conexión</h2>

            <div className="odoo-status">
              {kpis.odoo_conectado ? (
                <span className="badge success-badge">Conectado a Odoo</span>
              ) : (
                <span className="badge warning">Sin conexión</span>
              )}

              <p>
                <strong>Versión Odoo:</strong>{' '}
                {version.server_version || 'No disponible'}
              </p>
            </div>
          </section>

          <section className="kpi-grid">
            <div className="kpi-card">
              <span>Contactos en Odoo</span>
              <strong>{kpis.odoo_contactos_activos || 0}</strong>
            </div>

            <div className="kpi-card">
              <span>Productos en Odoo</span>
              <strong>{kpis.odoo_productos_activos || 0}</strong>
            </div>

            <div className="kpi-card">
              <span>Clientes sincronizados</span>
              <strong>{kpis.clientes_sincronizados || 0}</strong>
            </div>

            <div className="kpi-card">
              <span>Productos sincronizados</span>
              <strong>{kpis.productos_sincronizados || 0}</strong>
            </div>

            <div className="kpi-card">
              <span>Pedidos facturados</span>
              <strong>{kpis.pedidos_facturados || 0}</strong>
            </div>

            <div className="kpi-card">
              <span>Pendientes de factura</span>
              <strong>{kpis.pedidos_pendientes_factura || 0}</strong>
            </div>
          </section>

          <section className="card">
            <h2>Últimas facturas Odoo</h2>

            <table>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Total</th>
                  <th>Factura Odoo</th>
                  <th>Estado</th>
                  <th>Fecha sync</th>
                </tr>
              </thead>

              <tbody>
                {facturas.length === 0 ? (
                  <tr>
                    <td colSpan="6">No hay facturas generadas en Odoo.</td>
                  </tr>
                ) : (
                  facturas.map((factura) => (
                    <tr key={factura.pedido_id}>
                      <td>#{factura.pedido_id}</td>
                      <td>{factura.cliente}</td>
                      <td>{formatoMoneda(factura.total)}</td>
                      <td>
                        <a
                          href={
                            factura.odoo_invoice_url ||
                            `http://localhost:8069/web#id=${factura.odoo_invoice_id}&model=account.move&view_type=form`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="badge success-badge"
                        >
                          {factura.odoo_invoice_name ||
                            `Factura ${factura.odoo_invoice_id}`}
                        </a>
                      </td>
                      <td>
                        <span className="badge">
                          {factura.estado_factura_odoo}
                        </span>
                      </td>
                      <td>{factura.fecha_sync || 'Sin fecha'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>

          <section className="card">
            <h2>Últimos logs de integración</h2>

            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Operación</th>
                  <th>Entidad</th>
                  <th>Registro</th>
                  <th>Estado</th>
                  <th>Mensaje</th>
                  <th>Fecha</th>
                </tr>
              </thead>

              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="7">No hay logs de integración.</td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.id}</td>
                      <td>{log.tipo_operacion}</td>
                      <td>{log.entidad}</td>
                      <td>{log.registro_id}</td>
                      <td>
                        {log.estado === 'OK' ? (
                          <span className="badge success-badge">OK</span>
                        ) : (
                          <span className="badge warning">ERROR</span>
                        )}
                      </td>
                      <td>{log.mensaje}</td>
                      <td>{log.fecha}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        </>
      )}
    </>
  )
}