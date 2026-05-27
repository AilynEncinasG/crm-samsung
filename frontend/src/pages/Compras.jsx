import { useEffect, useState } from 'react'
import api from '../services/api'

export default function Compras() {
  const [proveedores, setProveedores] = useState([])
  const [productos, setProductos] = useState([])
  const [almacenes, setAlmacenes] = useState([])
  const [compras, setCompras] = useState([])
  const [stock, setStock] = useState([])

  const [form, setForm] = useState({
    proveedor_id: '',
    producto_id: '',
    almacen_id: '',
    cantidad: 1,
    precio_compra_unitario: '',
  })

  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const normalizar = (data) => data.results || data

  const cargarDatos = async () => {
    const [
      proveedoresRes,
      productosRes,
      almacenesRes,
      comprasRes,
      stockRes,
    ] = await Promise.all([
      api.get('/proveedores/'),
      api.get('/productos/'),
      api.get('/almacenes/'),
      api.get('/ordenes-compra/'),
      api.get('/stock/'),
    ])

    setProveedores(normalizar(proveedoresRes.data))
    setProductos(normalizar(productosRes.data))
    setAlmacenes(normalizar(almacenesRes.data))
    setCompras(normalizar(comprasRes.data))
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

  const totalCompra =
    Number(form.cantidad || 0) * Number(form.precio_compra_unitario || 0)

  const registrarCompra = async (e) => {
    e.preventDefault()
    setMensaje('')
    setError('')
    setCargando(true)

    try {
      const payload = {
        proveedor_id: Number(form.proveedor_id),
        almacen_id: Number(form.almacen_id),
        producto_id: Number(form.producto_id),
        cantidad: Number(form.cantidad),
        precio_compra_unitario: Number(form.precio_compra_unitario),
        usuario_id: 1,
      }

      const res = await api.post('/registrar-compra/', payload)

      setMensaje(
        `Compra registrada correctamente. Orden #${res.data.orden_compra_id}. Total: Bs ${res.data.total}`
      )

      setForm((actual) => ({
        ...actual,
        cantidad: 1,
        precio_compra_unitario: '',
      }))

      await cargarDatos()
    } catch (err) {
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
      <h1>Compras / Proveedores</h1>

      <section className="card">
        <h2>Registrar nueva compra</h2>

        {mensaje && <div className="alert success">{mensaje}</div>}
        {error && <div className="alert error">{error}</div>}

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
                  {producto.nombre}
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
              min="0"
              step="0.01"
              onChange={cambiarCampo}
              required
            />
          </label>

          <div className="venta-resumen">
            <p>
              <strong>Producto:</strong>{' '}
              {productoSeleccionado ? productoSeleccionado.nombre : 'Seleccione producto'}
            </p>
            <p>
              <strong>Stock actual:</strong>{' '}
              {stockSeleccionado ? stockSeleccionado.stock_total : 'Sin selección'}
            </p>
            <p>
              <strong>Total compra:</strong> Bs {totalCompra.toFixed(2)}
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
            </tr>
          </thead>
          <tbody>
            {compras.length === 0 ? (
              <tr>
                <td colSpan="5">No hay compras registradas.</td>
              </tr>
            ) : (
              compras.map((compra) => (
                <tr key={compra.id}>
                  <td>{compra.id}</td>
                  <td>{compra.proveedor_nombre || compra.proveedor}</td>
                  <td>{compra.almacen_destino_nombre || compra.almacen_destino}</td>
                  <td>{compra.fecha}</td>
                  <td>Bs {compra.total}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </>
  )
}