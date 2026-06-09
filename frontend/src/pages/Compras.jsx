//frontend/src/pages/Compras.jsx
import { useEffect, useState } from 'react'
import api from '../services/api'

export default function Compras() {
  const [proveedores, setProveedores] = useState([])
  const [productos, setProductos] = useState([])
  const [almacenes, setAlmacenes] = useState([])
  const [compras, setCompras] = useState([])
  const [detalleCompras, setDetalleCompras] = useState([])
  const [stock, setStock] = useState([])
  const [movimientos, setMovimientos] = useState([])

  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null')

  const [form, setForm] = useState({
    proveedor_id: '',
    producto_id: '',
    almacen_id: usuario?.almacen_asignado || '',
    cantidad: 1,
    precio_compra_unitario: '',
  })

  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [cargandoDatos, setCargandoDatos] = useState(true)

  const normalizar = (data) => data.results || data

  const cargarDatos = async () => {
    setCargandoDatos(true)
    setError('')

    try {
      const [
        proveedoresRes,
        productosRes,
        almacenesRes,
        comprasRes,
        detalleComprasRes,
        stockRes,
        movimientosRes,
      ] = await Promise.all([
        api.get('/proveedores/'),
        api.get('/productos/'),
        api.get('/almacenes/'),
        api.get('/ordenes-compra/'),
        api.get('/detalle-compras/'),
        api.get('/stock/'),
        api.get('/movimientos-inventario/'),
      ])

      setProveedores(normalizar(proveedoresRes.data))
      setProductos(normalizar(productosRes.data))
      setAlmacenes(normalizar(almacenesRes.data))
      setCompras(normalizar(comprasRes.data))
      setDetalleCompras(normalizar(detalleComprasRes.data))
      setStock(normalizar(stockRes.data))
      setMovimientos(normalizar(movimientosRes.data))
    } catch (err) {
      console.error(err)
      setError('No se pudieron cargar los datos de compras.')
    } finally {
      setCargandoDatos(false)
    }
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

  const almacenSeleccionado = almacenes.find(
    (a) => String(a.id) === String(form.almacen_id)
  )

  const proveedorSeleccionado = proveedores.find(
    (p) => String(p.id) === String(form.proveedor_id)
  )

  const stockSeleccionado = stock.find(
    (s) =>
      String(s.producto) === String(form.producto_id) &&
      String(s.almacen) === String(form.almacen_id)
  )

  const cantidad = Number(form.cantidad || 0)
  const precioCompra = Number(form.precio_compra_unitario || 0)
  const totalCompra = cantidad * precioCompra
  const stockActual = Number(stockSeleccionado?.stock_total || 0)
  const stockProyectado = stockActual + cantidad

  const comprasOrdenadas = [...compras].sort(
    (a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0)
  )

  const movimientosEntrada = movimientos.filter((mov) =>
    String(mov.tipo_movimiento || '').includes('ENTRADA')
  )

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

  const buscarProducto = (id) => {
    const producto = productos.find((item) => String(item.id) === String(id))
    return producto ? producto.nombre : `Producto #${id}`
  }

  const buscarDetallePorOrden = (ordenId) => {
    return detalleCompras.filter(
      (detalle) => String(detalle.orden_compra) === String(ordenId)
    )
  }

  const registrarCompra = async (e) => {
    e.preventDefault()
    setMensaje('')
    setError('')
    setCargando(true)

    if (!form.proveedor_id || !form.producto_id || !form.almacen_id) {
      setError('Selecciona proveedor, producto y almacén.')
      setCargando(false)
      return
    }

    if (cantidad <= 0) {
      setError('La cantidad debe ser mayor a 0.')
      setCargando(false)
      return
    }

    if (precioCompra <= 0) {
      setError('El precio de compra debe ser mayor a 0.')
      setCargando(false)
      return
    }

    try {
      const usuario = JSON.parse(localStorage.getItem('usuario') || 'null')

      if (!usuario) {
        setError('No existe una sesión activa. Inicia sesión nuevamente.')
        setCargando(false)
        return
      }

      const payload = {
        proveedor_id: Number(form.proveedor_id),
        almacen_id: Number(form.almacen_id),
        producto_id: Number(form.producto_id),
        cantidad,
        precio_compra_unitario: precioCompra,
        usuario_id: Number(usuario.id),
      }

      const res = await api.post('/registrar-compra/', payload)

      setMensaje(
        `Compra registrada correctamente. Orden #${res.data.orden_compra_id}. Total: ${formatoMoneda(res.data.total)}`
      )

      setForm({
        proveedor_id: '',
        producto_id: '',
        almacen_id: '',
        cantidad: 1,
        precio_compra_unitario: '',
      })

      await cargarDatos()
    } catch (err) {
      console.error(err)

      const detalle =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        'No se pudo registrar la compra.'

      setError(detalle)
    } finally {
      setCargando(false)
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Compras</h1>
          <p>
            Registro de compras a proveedores, actualización de stock, generación
            de lotes y movimientos de entrada al inventario.
          </p>
        </div>

        <button type="button" onClick={cargarDatos}>
          Actualizar
        </button>
      </div>

      {mensaje && <div className="alert success">{mensaje}</div>}
      {error && <div className="alert error">{error}</div>}

      {cargandoDatos ? (
        <div className="card">Cargando compras...</div>
      ) : (
        <>
          <section className="kpi-grid">
            <div className="kpi-card">
              <span>Órdenes registradas</span>
              <strong>{compras.length}</strong>
            </div>

            <div className="kpi-card">
              <span>Proveedores activos</span>
              <strong>{proveedores.filter((p) => p.activo).length}</strong>
            </div>

            <div className="kpi-card">
              <span>Detalles de compra</span>
              <strong>{detalleCompras.length}</strong>
            </div>

            <div className="kpi-card">
              <span>Entradas inventario</span>
              <strong>{movimientosEntrada.length}</strong>
            </div>
          </section>

          <section className="card">
            <h2>Registrar nueva compra</h2>

            <form className="form-grid" onSubmit={registrarCompra}>
              <label>
                Proveedor
                <select
                  name="proveedor_id"
                  value={form.proveedor_id}
                  onChange={cambiarCampo}
                  required
                >
                  <option value="">Seleccionar proveedor</option>
                  {proveedores.map((proveedor) => (
                    <option key={proveedor.id} value={proveedor.id}>
                      {proveedor.nombre_proveedor}
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
                      {producto.nombre} - {formatoMoneda(producto.precio_venta_sugerido)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Almacén destino
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
                Precio compra unitario
                <input
                  type="number"
                  name="precio_compra_unitario"
                  value={form.precio_compra_unitario}
                  min="0.01"
                  step="0.01"
                  onChange={cambiarCampo}
                  required
                />
              </label>

              <div className="venta-resumen">
                <p>
                  <strong>Proveedor:</strong>{' '}
                  {proveedorSeleccionado
                    ? proveedorSeleccionado.nombre_proveedor
                    : 'Seleccione proveedor'}
                </p>

                <p>
                  <strong>Producto:</strong>{' '}
                  {productoSeleccionado
                    ? productoSeleccionado.nombre
                    : 'Seleccione producto'}
                </p>

                <p>
                  <strong>Almacén destino:</strong>{' '}
                  {almacenSeleccionado
                    ? almacenSeleccionado.nombre_almacen
                    : 'Seleccione almacén'}
                </p>

                <p>
                  <strong>Stock actual:</strong>{' '}
                  {form.producto_id && form.almacen_id
                    ? stockSeleccionado
                      ? stockActual
                      : 0
                    : 'Seleccione producto y almacén'}
                </p>

                <p>
                  <strong>Stock proyectado:</strong>{' '}
                  {form.producto_id && form.almacen_id
                    ? stockProyectado
                    : 'Seleccione producto y almacén'}
                </p>

                <p>
                  <strong>Total compra:</strong> {formatoMoneda(totalCompra)}
                </p>
              </div>

              <button type="submit" disabled={cargando}>
                {cargando ? 'Registrando...' : 'Registrar compra'}
              </button>
            </form>
          </section>

          <section className="card">
            <h2>Órdenes de compra registradas</h2>

            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Proveedor</th>
                  <th>Almacén destino</th>
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Detalle</th>
                </tr>
              </thead>

              <tbody>
                {comprasOrdenadas.length === 0 ? (
                  <tr>
                    <td colSpan="6">No hay compras registradas.</td>
                  </tr>
                ) : (
                  comprasOrdenadas.map((compra) => {
                    const detalles = buscarDetallePorOrden(compra.id)

                    return (
                      <tr key={compra.id}>
                        <td>{compra.id}</td>
                        <td>{compra.proveedor_nombre || compra.proveedor}</td>
                        <td>{compra.almacen_nombre || compra.almacen_destino}</td>
                        <td>{formatearFecha(compra.fecha)}</td>
                        <td>{formatoMoneda(compra.total)}</td>
                        <td>
                          {detalles.length === 0
                            ? 'Sin detalle'
                            : detalles
                                .map(
                                  (detalle) =>
                                    `${detalle.producto_nombre || buscarProducto(detalle.producto)} (${detalle.cantidad})`
                                )
                                .join(', ')}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </section>

          <section className="card">
            <h2>Detalle de compras</h2>

            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Orden</th>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio unitario</th>
                  <th>Subtotal</th>
                </tr>
              </thead>

              <tbody>
                {detalleCompras.length === 0 ? (
                  <tr>
                    <td colSpan="6">No hay detalles de compra registrados.</td>
                  </tr>
                ) : (
                  detalleCompras.map((detalle) => (
                    <tr key={detalle.id}>
                      <td>{detalle.id}</td>
                      <td>{detalle.orden_compra}</td>
                      <td>{detalle.producto_nombre || buscarProducto(detalle.producto)}</td>
                      <td>{detalle.cantidad}</td>
                      <td>{formatoMoneda(detalle.precio_compra_unitario)}</td>
                      <td>
                        {formatoMoneda(
                          Number(detalle.cantidad || 0) *
                            Number(detalle.precio_compra_unitario || 0)
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>

          <section className="card">
            <h2>Entradas al inventario por compras</h2>

            <table>
              <thead>
                <tr>
                  <th>ID Movimiento</th>
                  <th>Producto</th>
                  <th>Almacén</th>
                  <th>Lote</th>
                  <th>Tipo</th>
                  <th>Cantidad</th>
                  <th>Fecha</th>
                </tr>
              </thead>

              <tbody>
                {movimientosEntrada.length === 0 ? (
                  <tr>
                    <td colSpan="7">No existen entradas por compra registradas.</td>
                  </tr>
                ) : (
                  movimientosEntrada.map((mov) => (
                    <tr key={mov.id}>
                      <td>{mov.id}</td>
                      <td>{buscarProducto(mov.producto)}</td>
                      <td>
                        {
                          almacenes.find(
                            (almacen) => String(almacen.id) === String(mov.almacen)
                          )?.nombre_almacen
                        }
                      </td>
                      <td>{mov.lote || '-'}</td>
                      <td>
                        <span className="badge success">
                          {mov.tipo_movimiento}
                        </span>
                      </td>
                      <td>{mov.cantidad}</td>
                      <td>{formatearFecha(mov.fecha)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>

          <section className="card">
            <h2>Interpretación del módulo</h2>
            <p>
              El módulo de compras permite registrar adquisiciones realizadas a
              proveedores y actualizar el inventario mediante entradas,
              generación de lotes y movimientos de compra. Esta información
              fortalece la planificación de reposiciones y el análisis de
              abastecimiento.
            </p>
          </section>
        </>
      )}
    </>
  )
}