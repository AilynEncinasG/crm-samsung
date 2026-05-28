import { useEffect, useState } from 'react'
import api from '../services/api'

export default function Ventas() {
  const [clientes, setClientes] = useState([])
  const [productos, setProductos] = useState([])
  const [almacenes, setAlmacenes] = useState([])
  const [repartidores, setRepartidores] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [stock, setStock] = useState([])
  const [pedidoDetalle, setPedidoDetalle] = useState(null)
  const [mostrandoDetalle, setMostrandoDetalle] = useState(false)

  const [form, setForm] = useState({
    cliente_id: '',
    producto_id: '',
    almacen_id: '',
    repartidor_id: '',
    cantidad: 1,
    metodo_envio: 'Delivery',
    satisfaccion_cliente: 5,
  })

  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const normalizar = (data) => data.results || data

  const cargarDatos = async () => {
    const [
      clientesRes,
      productosRes,
      almacenesRes,
      repartidoresRes,
      pedidosRes,
      stockRes,
    ] = await Promise.all([
      api.get('/clientes/'),
      api.get('/productos/'),
      api.get('/almacenes/'),
      api.get('/repartidores/'),
      api.get('/pedidos/'),
      api.get('/stock/'),
    ])

    setClientes(normalizar(clientesRes.data))
    setProductos(normalizar(productosRes.data))
    setAlmacenes(normalizar(almacenesRes.data))
    setRepartidores(normalizar(repartidoresRes.data))
    setPedidos(normalizar(pedidosRes.data))
    setStock(normalizar(stockRes.data))
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  const cambiarCampo = (e) => {
    const { name, value } = e.target
    setForm((actual) => ({
      ...actual,
      [name]: value,
    }))
  }

  const productoSeleccionado = productos.find(
    (p) => String(p.id) === String(form.producto_id)
  )

  const stockSeleccionado = stock.find(
    (s) =>
      String(s.producto) === String(form.producto_id) &&
      String(s.almacen) === String(form.almacen_id)
  )

  const registrarVenta = async (e) => {
    e.preventDefault()
    setMensaje('')
    setError('')
    setCargando(true)

    try {
      const payload = {
        cliente_id: Number(form.cliente_id),
        empleado_id: 1,
        almacen_id: Number(form.almacen_id),
        repartidor_id: Number(form.repartidor_id),
        producto_id: Number(form.producto_id),
        cantidad: Number(form.cantidad),
        usuario_id: 1,
        metodo_envio: form.metodo_envio,
        satisfaccion_cliente: Number(form.satisfaccion_cliente),
      }

      const res = await api.post('/registrar-venta/', payload)

      setMensaje(
        `Venta registrada correctamente. Pedido #${res.data.pedido_id}. Total: Bs ${res.data.total}`
      )

      setForm((actual) => ({
        ...actual,
        cantidad: 1,
      }))

      await cargarDatos()
    } catch (err) {
      const detalle =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        'No se pudo registrar la venta.'

      setError(detalle)
    } finally {
      setCargando(false)
    }
  }
  const cambiarEstadoPedido = async (pedidoId, estado) => {
    setMensaje('')
    setError('')

    try {
      await api.patch(`/pedidos/${pedidoId}/estado/`, { estado })
      setMensaje(`Pedido #${pedidoId} actualizado a: ${estado}`)
      await cargarDatos()
    } catch (err) {
      const detalle =
        err.response?.data?.error ||
        'No se pudo actualizar el estado del pedido.'

      setError(detalle)
    }
  }

  const verDetallePedido = async (pedidoId) => {
    setMensaje('')
    setError('')

    try {
      const res = await api.get(`/pedidos/${pedidoId}/detalle-completo/`)
      setPedidoDetalle(res.data)
      setMostrandoDetalle(true)
    } catch (err) {
      setError('No se pudo cargar el detalle del pedido.')
    }
  }

  const cerrarDetalle = () => {
    setPedidoDetalle(null)
    setMostrandoDetalle(false)
  }

  const generarFacturaOdoo = async (pedidoId) => {
    setMensaje('')
    setError('')

    try {
      const res = await api.post(`/odoo/pedidos/${pedidoId}/facturar/`)
      setMensaje(
        `Factura Odoo creada: ${res.data.odoo_invoice_name} - ID ${res.data.odoo_invoice_id}`
      )
      await cargarDatos()
    } catch (err) {
      const detalle =
        err.response?.data?.error ||
        'No se pudo generar la factura en Odoo.'

      setError(detalle)
    }
  }

  return (
    <>
      <h1>Ventas / Pedidos</h1>

      <section className="card">
        <h2>Registrar nueva venta</h2>

        {mensaje && <div className="alert success">{mensaje}</div>}
        {error && <div className="alert error">{error}</div>}

        <form className="form-grid" onSubmit={registrarVenta}>
          <label>
            Cliente
            <select
              name="cliente_id"
              value={form.cliente_id}
              onChange={cambiarCampo}
              required
            >
              <option value="">Seleccionar cliente</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre} {cliente.apellidos || ''}
                </option>
              ))}
            </select>
          </label>

          <label>
            Producto
            <select
              name="producto_id"
              value={form.producto_id}
              onChange={cambiarCampo}
              required
            >
              <option value="">Seleccionar producto</option>
              {productos.map((producto) => (
                <option key={producto.id} value={producto.id}>
                  {producto.nombre} - Bs {producto.precio_venta_sugerido}
                </option>
              ))}
            </select>
          </label>

          <label>
            Almacén
            <select
              name="almacen_id"
              value={form.almacen_id}
              onChange={cambiarCampo}
              required
            >
              <option value="">Seleccionar almacén</option>
              {almacenes.map((almacen) => (
                <option key={almacen.id} value={almacen.id}>
                  {almacen.nombre_almacen}
                </option>
              ))}
            </select>
          </label>

          <label>
            Repartidor
            <select
              name="repartidor_id"
              value={form.repartidor_id}
              onChange={cambiarCampo}
              required
            >
              <option value="">Seleccionar repartidor</option>
              {repartidores.map((repartidor) => (
                <option key={repartidor.id} value={repartidor.id}>
                  {repartidor.nombre_completo}
                </option>
              ))}
            </select>
          </label>

          <label>
            Cantidad
            <input
              type="number"
              name="cantidad"
              value={form.cantidad}
              min="1"
              onChange={cambiarCampo}
              required
            />
          </label>

          <label>
            Método de envío
            <select
              name="metodo_envio"
              value={form.metodo_envio}
              onChange={cambiarCampo}
            >
              <option value="Delivery">Delivery</option>
              <option value="Recojo en tienda">Recojo en tienda</option>
            </select>
          </label>

          <label>
            Satisfacción
            <select
              name="satisfaccion_cliente"
              value={form.satisfaccion_cliente}
              onChange={cambiarCampo}
            >
              <option value="5">5 - Excelente</option>
              <option value="4">4 - Buena</option>
              <option value="3">3 - Regular</option>
              <option value="2">2 - Mala</option>
              <option value="1">1 - Muy mala</option>
            </select>
          </label>

          <div className="venta-resumen">
            <p>
              <strong>Precio:</strong>{' '}
              {productoSeleccionado
                ? `Bs ${productoSeleccionado.precio_venta_sugerido}`
                : 'Seleccione producto'}
            </p>
            <p>
              <strong>Stock disponible:</strong>{' '}
              {stockSeleccionado ? stockSeleccionado.stock_total : 'Sin selección'}
            </p>
          </div>

          <button type="submit" disabled={cargando}>
            {cargando ? 'Registrando...' : 'Registrar venta'}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Pedidos registrados</h2>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Factura Odoo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.length === 0 ? (
              <tr>
                <td colSpan="7">No hay pedidos registrados.</td>
              </tr>
            ) : (
              pedidos.map((pedido) => (
                <tr key={pedido.id}>
                  <td>{pedido.id}</td>
                  <td>{pedido.cliente_nombre || pedido.cliente}</td>
                  <td>{pedido.fecha_pedido}</td>
                  <td>Bs {pedido.total}</td>
                  <td>
                    <select
                      value={pedido.estado || 'Pendiente'}
                      onChange={(e) =>
                        cambiarEstadoPedido(pedido.id, e.target.value)
                      }
                    >
                      <option value="Pendiente">Pendiente</option>
                      <option value="En preparación">En preparación</option>
                      <option value="Enviado">Enviado</option>
                      <option value="Entregado">Entregado</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>
                  </td>
                  <td>
                    {pedido.odoo_invoice_id ? (
                      <a
                        href={pedido.odoo_invoice_url || `http://localhost:8069/web#id=${pedido.odoo_invoice_id}&model=account.move&view_type=form`}
                        target="_blank"
                        rel="noreferrer"
                        className="badge success-badge"
                      >
                        {pedido.odoo_invoice_name || `Factura ${pedido.odoo_invoice_id}`}
                      </a>
                    ) : (
                      <span className="badge warning">Pendiente</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="small-button"
                      onClick={() => verDetallePedido(pedido.id)}
                    >
                      Ver detalle
                    </button>
                    {!pedido.odoo_invoice_id && (
                      <button
                        type="button"
                        className="small-button success-button"
                        onClick={() => generarFacturaOdoo(pedido.id)}
                      >
                        Facturar Odoo
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
      {mostrandoDetalle && pedidoDetalle && (
        <section className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Detalle del pedido #{pedidoDetalle.pedido.pedido_id}</h2>
              <button type="button" onClick={cerrarDetalle}>
                Cerrar
              </button>
            </div>

            <div className="detalle-grid">
              <p><strong>Cliente:</strong> {pedidoDetalle.pedido.cliente}</p>
              <p><strong>Empleado:</strong> {pedidoDetalle.pedido.empleado}</p>
              <p><strong>Almacén:</strong> {pedidoDetalle.pedido.almacen}</p>
              <p><strong>Repartidor:</strong> {pedidoDetalle.pedido.repartidor}</p>
              <p><strong>Método envío:</strong> {pedidoDetalle.pedido.MetodoEnvio}</p>
              <p><strong>Estado:</strong> {pedidoDetalle.pedido.Estado}</p>
              <p><strong>Total:</strong> Bs {pedidoDetalle.pedido.Total}</p>
            </div>

            <h3>Productos del pedido</h3>

            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio venta</th>
                  <th>Costo</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {pedidoDetalle.detalles.map((detalle) => (
                  <tr key={detalle.detalle_id}>
                    <td>{detalle.producto}</td>
                    <td>{detalle.Cantidad}</td>
                    <td>Bs {detalle.PrecioUnitarioVenta}</td>
                    <td>Bs {detalle.CostoUnitarioHistorico}</td>
                    <td>Bs {detalle.subtotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  )
}