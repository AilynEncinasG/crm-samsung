import { useEffect, useState } from 'react'
import api from '../services/api'

export default function Inventario() {
  const [stock, setStock] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)

  const normalizar = (data) => data.results || data

  const cargarInventario = async () => {
    setCargando(true)
    setError('')

    try {
      const [stockRes, movimientosRes] = await Promise.all([
        api.get('/stock/'),
        api.get('/movimientos-inventario/'),
      ])

      setStock(normalizar(stockRes.data))
      setMovimientos(normalizar(movimientosRes.data))
    } catch (err) {
      setError('No se pudo cargar el inventario.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarInventario()
  }, [])

  const stockTotal = stock.reduce(
    (total, item) => total + Number(item.stock_total || item.stockTotal || 0),
    0
  )

  const productosStockBajo = stock.filter(
    (item) => Number(item.stock_total || item.stockTotal || 0) <= 5
  )

  const entradas = movimientos.filter((m) =>
    String(m.tipo_movimiento || m.tipoMovimiento || '').includes('ENTRADA')
  )

  const salidas = movimientos.filter((m) =>
    String(m.tipo_movimiento || m.tipoMovimiento || '').includes('SALIDA')
  )

  const nombreProducto = (item) =>
    item.producto_nombre ||
    item.nombre_producto ||
    item.producto ||
    `Producto #${item.producto_id || ''}`

  const nombreAlmacen = (item) =>
    item.almacen_nombre ||
    item.nombre_almacen ||
    item.almacen ||
    `Almacén #${item.almacen_id || ''}`

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Inventario</h1>
          <p>Control de stock, almacenes y movimientos de productos.</p>
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
              <span>Productos en stock bajo</span>
              <strong>{productosStockBajo.length}</strong>
            </div>

            <div className="kpi-card">
              <span>Entradas registradas</span>
              <strong>{entradas.length}</strong>
            </div>

            <div className="kpi-card">
              <span>Salidas registradas</span>
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
                    const cantidad = Number(item.stock_total || item.stockTotal || 0)

                    return (
                      <tr key={index}>
                        <td>{nombreProducto(item)}</td>
                        <td>{nombreAlmacen(item)}</td>
                        <td>{cantidad}</td>
                        <td>
                          {cantidad <= 5 ? (
                            <span className="badge warning">Stock bajo</span>
                          ) : (
                            <span className="badge success-badge">Disponible</span>
                          )}
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
                  <th>Tipo</th>
                  <th>Cantidad</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.length === 0 ? (
                  <tr>
                    <td colSpan="6">No hay movimientos registrados.</td>
                  </tr>
                ) : (
                  movimientos.map((mov) => {
                    const tipo = mov.tipo_movimiento || mov.tipoMovimiento || ''

                    return (
                      <tr key={mov.id}>
                        <td>{mov.id}</td>
                        <td>{nombreProducto(mov)}</td>
                        <td>{nombreAlmacen(mov)}</td>
                        <td>
                          <span
                            className={
                              String(tipo).includes('ENTRADA')
                                ? 'badge success-badge'
                                : 'badge warning'
                            }
                          >
                            {tipo}
                          </span>
                        </td>
                        <td>{mov.cantidad}</td>
                        <td>{mov.fecha}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </section>
        </>
      )}
    </>
  )
}