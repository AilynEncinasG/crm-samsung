//frontend/src/pages/Inventario.jsx
import { useEffect, useState } from 'react'
import api from '../services/api'

export default function Inventario() {
  const [stock, setStock] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [lotes, setLotes] = useState([])
  const [productos, setProductos] = useState([])
  const [almacenes, setAlmacenes] = useState([])
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)

  const normalizar = (data) => data.results || data

  const cargarInventario = async () => {
    setCargando(true)
    setError('')

    try {
      const [
        stockRes,
        movimientosRes,
        lotesRes,
        productosRes,
        almacenesRes,
      ] = await Promise.all([
        api.get('/stock/'),
        api.get('/movimientos-inventario/'),
        api.get('/lotes/'),
        api.get('/productos/'),
        api.get('/almacenes/'),
      ])

      setStock(normalizar(stockRes.data))
      setMovimientos(normalizar(movimientosRes.data))
      setLotes(normalizar(lotesRes.data))
      setProductos(normalizar(productosRes.data))
      setAlmacenes(normalizar(almacenesRes.data))
    } catch (err) {
      console.error(err)
      setError('No se pudo cargar el inventario.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarInventario()
  }, [])

  const buscarProducto = (id) => {
    const producto = productos.find((item) => String(item.id) === String(id))
    return producto ? producto.nombre : `Producto #${id}`
  }

  const buscarAlmacen = (id) => {
    const almacen = almacenes.find((item) => String(item.id) === String(id))
    return almacen ? almacen.nombre_almacen : `Almacén #${id}`
  }

  const formatearFecha = (fecha) => {
    if (!fecha) return 'Sin fecha'

    return new Date(fecha).toLocaleString('es-BO', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  const obtenerEstadoStock = (cantidad) => {
    if (cantidad <= 5) return 'Crítico'
    if (cantidad <= 10) return 'Bajo'
    return 'Disponible'
  }

  const obtenerClaseStock = (cantidad) => {
    if (cantidad <= 5) return 'badge danger'
    if (cantidad <= 10) return 'badge warning'
    return 'badge success'
  }

  const stockTotal = stock.reduce(
    (total, item) => total + Number(item.stock_total || 0),
    0
  )

  const productosStockCritico = stock.filter(
    (item) => Number(item.stock_total || 0) <= 5
  )

  const productosStockBajo = stock.filter((item) => {
    const cantidad = Number(item.stock_total || 0)
    return cantidad > 5 && cantidad <= 10
  })

  const entradas = movimientos.filter((m) =>
    String(m.tipo_movimiento || '').includes('ENTRADA')
  )

  const salidas = movimientos.filter((m) =>
    String(m.tipo_movimiento || '').includes('SALIDA')
  )

  const lotesCriticos = lotes.filter(
    (lote) => Number(lote.cantidad_actual || 0) <= 5
  )

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Inventario</h1>
          <p>
            Control de stock por almacén, lotes y movimientos de entrada o
            salida de productos.
          </p>
        </div>

        <button onClick={cargarInventario}>Actualizar</button>
      </div>

      {error && <div className="alert error">{error}</div>}

      {cargando ? (
        <div className="card">Cargando inventario...</div>
      ) : (
        <>
          <section className="kpi-grid">
            <div className="kpi-card">
              <span>Stock total</span>
              <strong>{stockTotal}</strong>
            </div>

            <div className="kpi-card">
              <span>Stock crítico</span>
              <strong>{productosStockCritico.length}</strong>
            </div>

            <div className="kpi-card">
              <span>Stock bajo</span>
              <strong>{productosStockBajo.length}</strong>
            </div>

            <div className="kpi-card">
              <span>Lotes registrados</span>
              <strong>{lotes.length}</strong>
            </div>

            <div className="kpi-card">
              <span>Entradas</span>
              <strong>{entradas.length}</strong>
            </div>

            <div className="kpi-card">
              <span>Salidas</span>
              <strong>{salidas.length}</strong>
            </div>
          </section>

          <section className="card">
            <h2>Stock por almacén</h2>

            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Almacén</th>
                  <th>Stock</th>
                  <th>Estado</th>
                </tr>
              </thead>

              <tbody>
                {stock.length === 0 ? (
                  <tr>
                    <td colSpan="4">No hay stock registrado.</td>
                  </tr>
                ) : (
                  stock.map((item, index) => {
                    const cantidad = Number(item.stock_total || 0)

                    return (
                      <tr key={`${item.almacen}-${item.producto}-${index}`}>
                        <td>{item.producto_nombre || buscarProducto(item.producto)}</td>
                        <td>{item.almacen_nombre || buscarAlmacen(item.almacen)}</td>
                        <td>{cantidad}</td>
                        <td>
                          <span className={obtenerClaseStock(cantidad)}>
                            {obtenerEstadoStock(cantidad)}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </section>

          <section className="card">
            <h2>Lotes de productos</h2>

            <table>
              <thead>
                <tr>
                  <th>ID Lote</th>
                  <th>Producto</th>
                  <th>Almacén</th>
                  <th>Cantidad inicial</th>
                  <th>Cantidad actual</th>
                  <th>Costo compra</th>
                  <th>Fecha ingreso</th>
                  <th>Estado</th>
                </tr>
              </thead>

              <tbody>
                {lotes.length === 0 ? (
                  <tr>
                    <td colSpan="8">No hay lotes registrados.</td>
                  </tr>
                ) : (
                  lotes.map((lote) => {
                    const cantidadActual = Number(lote.cantidad_actual || 0)

                    return (
                      <tr key={lote.id}>
                        <td>{lote.id}</td>
                        <td>{buscarProducto(lote.producto)}</td>
                        <td>{buscarAlmacen(lote.almacen)}</td>
                        <td>{lote.cantidad_inicial}</td>
                        <td>{lote.cantidad_actual}</td>
                        <td>Bs {Number(lote.costo_compra || 0).toFixed(2)}</td>
                        <td>{formatearFecha(lote.fecha_ingreso)}</td>
                        <td>
                          <span className={obtenerClaseStock(cantidadActual)}>
                            {obtenerEstadoStock(cantidadActual)}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </section>

          <section className="card">
            <h2>Movimientos de inventario</h2>

            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Producto</th>
                  <th>Almacén</th>
                  <th>Lote</th>
                  <th>Tipo</th>
                  <th>Cantidad</th>
                  <th>Fecha</th>
                  <th>Usuario</th>
                </tr>
              </thead>

              <tbody>
                {movimientos.length === 0 ? (
                  <tr>
                    <td colSpan="8">No hay movimientos registrados.</td>
                  </tr>
                ) : (
                  movimientos.map((mov) => {
                    const tipo = mov.tipo_movimiento || ''
                    const esEntrada = String(tipo).includes('ENTRADA')

                    return (
                      <tr key={mov.id}>
                        <td>{mov.id}</td>
                        <td>{buscarProducto(mov.producto)}</td>
                        <td>{buscarAlmacen(mov.almacen)}</td>
                        <td>{mov.lote || '-'}</td>
                        <td>
                          <span className={esEntrada ? 'badge success' : 'badge warning'}>
                            {tipo}
                          </span>
                        </td>
                        <td>{mov.cantidad}</td>
                        <td>{formatearFecha(mov.fecha)}</td>
                        <td>{mov.usuario || 'Sistema'}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </section>

          <section className="card">
            <h2>Interpretación del inventario</h2>
            <p>
              El inventario permite controlar la disponibilidad real de productos
              por almacén, revisar lotes disponibles y analizar movimientos de
              entrada y salida. Los productos o lotes con cantidades bajas se
              consideran críticos para apoyar decisiones de reposición.
            </p>

            <p>
              Lotes en estado crítico: <strong>{lotesCriticos.length}</strong>
            </p>
          </section>
        </>
      )}
    </>
  )
}