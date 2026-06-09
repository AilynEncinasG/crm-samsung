import { useEffect, useState } from 'react'

const ESTADO_URL = 'http://localhost:8000/api/odoo/estado/'
const RESUMEN_URL = 'http://localhost:8000/api/odoo/resumen/'
const PEDIDOS_URL = 'http://localhost:8000/api/pedidos/'

export default function IntegracionOdoo() {
  const [estado, setEstado] = useState(null)
  const [resumen, setResumen] = useState(null)
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarDatosOdoo()
  }, [])

  const cargarDatosOdoo = async () => {
    try {
      setLoading(true)

      const [estadoRes, resumenRes, pedidosRes] = await Promise.all([
        fetch(ESTADO_URL),
        fetch(RESUMEN_URL),
        fetch(PEDIDOS_URL),
      ])

      if (!estadoRes.ok) throw new Error('Error al cargar estado de Odoo')
      if (!resumenRes.ok) throw new Error('Error al cargar resumen de Odoo')
      if (!pedidosRes.ok) throw new Error('Error al cargar pedidos')

      const estadoData = await estadoRes.json()
      const resumenData = await resumenRes.json()
      const pedidosData = await pedidosRes.json()

      setEstado(estadoData)
      setResumen(resumenData)
      setPedidos(pedidosData)
    } catch (error) {
      console.error(error)
      alert('No se pudieron cargar los datos de integración con Odoo')
    } finally {
      setLoading(false)
    }
  }

  const formatoMoneda = (valor) => {
    return Number(valor || 0).toLocaleString('es-BO', {
      style: 'currency',
      currency: 'BOB',
    })
  }

  const formatearFecha = (fecha) => {
    if (!fecha) return 'Sin fecha'

    return new Date(fecha).toLocaleString('es-BO', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  const facturarPedido = async (pedidoId) => {
    const confirmar = confirm(`¿Deseas facturar el pedido ${pedidoId} en Odoo?`)

    if (!confirmar) return

    const usuario = JSON.parse(localStorage.getItem('usuario') || 'null')

    try {
      const response = await fetch(
        `http://localhost:8000/api/odoo/pedidos/${pedidoId}/facturar/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            usuario_id: usuario?.id,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        console.error(errorData)
        alert('No se pudo facturar el pedido en Odoo')
        return
      }

      alert('Pedido facturado correctamente en Odoo')
      await cargarDatosOdoo()
    } catch (error) {
      console.error(error)
      alert('Error de conexión al facturar en Odoo')
    }
  }

  if (loading) {
    return <p>Cargando integración con Odoo...</p>
  }

  if (!estado || !resumen) {
    return <p>No existen datos disponibles de integración con Odoo.</p>
  }

  const kpis = resumen.kpis || {}
  const version = resumen.version_odoo || {}
  const logs = resumen.ultimos_logs || []
  const facturas = resumen.ultimas_facturas || []

  return (
    <div>
      <h1>Integración con Odoo</h1>

      <p>
        Este módulo permite verificar la conexión con Odoo, revisar la
        sincronización de clientes y productos, y gestionar la facturación de
        pedidos comerciales.
      </p>

      <div className="grid-cards">
        <div className="card">
          <h3>Estado de conexión</h3>
          <p>{estado.conectado ? 'Conectado' : 'Desconectado'}</p>
        </div>

        <div className="card">
          <h3>Versión Odoo</h3>
          <p>{version.server_version || estado.version?.server_version}</p>
        </div>

        <div className="card">
          <h3>Clientes sincronizados</h3>
          <p>{kpis.clientes_sincronizados || 0}</p>
        </div>

        <div className="card">
          <h3>Productos sincronizados</h3>
          <p>{kpis.productos_sincronizados || 0}</p>
        </div>

        <div className="card">
          <h3>Pedidos facturados</h3>
          <p>{kpis.pedidos_facturados || 0}</p>
        </div>

        <div className="card">
          <h3>Pendientes de factura</h3>
          <p>{kpis.pedidos_pendientes_factura || 0}</p>
        </div>

        <div className="card">
          <h3>Errores integración</h3>
          <p>{kpis.errores_integracion || 0}</p>
        </div>

        <div className="card">
          <h3>Productos activos Odoo</h3>
          <p>{estado.productos_activos || 0}</p>
        </div>
      </div>

      <section className="card">
        <h2>Pedidos y facturación</h2>

        {pedidos.length === 0 ? (
          <p>No existen pedidos registrados.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID Pedido</th>
                <th>Cliente</th>
                <th>Almacén</th>
                <th>Total</th>
                <th>Estado pedido</th>
                <th>Factura Odoo</th>
                <th>Estado factura</th>
                <th>Acción</th>
              </tr>
            </thead>

            <tbody>
              {pedidos.map((pedido) => (
                <tr key={pedido.id}>
                  <td>{pedido.id}</td>
                  <td>{pedido.cliente_nombre || pedido.cliente}</td>
                  <td>{pedido.almacen_nombre || pedido.almacen_origen}</td>
                  <td>{formatoMoneda(pedido.total)}</td>
                  <td>{pedido.estado || 'Sin estado'}</td>
                  <td>
                    {pedido.odoo_invoice_name ? (
                      pedido.odoo_invoice_url ? (
                        <a
                          href={pedido.odoo_invoice_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {pedido.odoo_invoice_name}
                        </a>
                      ) : (
                        pedido.odoo_invoice_name
                      )
                    ) : (
                      'Sin factura'
                    )}
                  </td>
                  <td>{pedido.estado_factura_odoo || 'Pendiente'}</td>
                  <td>
                    {pedido.odoo_invoice_id ? (
                      <span className="badge success">Facturado</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => facturarPedido(pedido.id)}
                      >
                        Facturar en Odoo
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2>Últimas facturas generadas</h2>

        {facturas.length === 0 ? (
          <p>No existen facturas registradas desde Odoo.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Factura</th>
                <th>Estado</th>
                <th>Fecha sync</th>
              </tr>
            </thead>

            <tbody>
              {facturas.map((factura) => (
                <tr key={factura.pedido_id}>
                  <td>{factura.pedido_id}</td>
                  <td>{factura.cliente}</td>
                  <td>{formatoMoneda(factura.total)}</td>
                  <td>
                    {factura.odoo_invoice_url ? (
                      <a
                        href={factura.odoo_invoice_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {factura.odoo_invoice_name}
                      </a>
                    ) : (
                      factura.odoo_invoice_name
                    )}
                  </td>
                  <td>{factura.estado_factura_odoo}</td>
                  <td>{factura.fecha_sync}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2>Últimos logs de integración</h2>

        {logs.length === 0 ? (
          <p>No existen logs de integración.</p>
        ) : (
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
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.id}</td>
                  <td>{log.tipo_operacion}</td>
                  <td>{log.entidad}</td>
                  <td>{log.registro_id}</td>
                  <td>
                    <span
                      className={
                        log.estado === 'OK'
                          ? 'badge success'
                          : 'badge danger'
                      }
                    >
                      {log.estado}
                    </span>
                  </td>
                  <td>{log.mensaje}</td>
                  <td>{log.fecha}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2>Interpretación del módulo</h2>
        <p>
          La integración con Odoo permite vincular la gestión comercial del CRM
          con la facturación empresarial. De esta manera, cada pedido puede
          relacionarse con una factura, conservando el identificador, referencia,
          estado y enlace de consulta generado por Odoo.
        </p>
      </section>
    </div>
  )
}