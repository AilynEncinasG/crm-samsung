import { useEffect, useState } from 'react'
import api from '../services/api'

export default function Productos() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [mostrarInactivos, setMostrarInactivos] = useState(false)

  const [form, setForm] = useState({
    nombre: '',
    categoria: '',
    precio_venta_sugerido: '',
    gama: 'Media',
  })

  const [editandoId, setEditandoId] = useState(null)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const normalizar = (data) => data.results || data

  const cargarDatos = async () => {
    try {
      const productosUrl = mostrarInactivos
        ? '/productos/?incluir_inactivos=1'
        : '/productos/'

      const [productosRes, categoriasRes] = await Promise.all([
        api.get(productosUrl),
        api.get('/categorias/'),
      ])

      setProductos(normalizar(productosRes.data))
      setCategorias(normalizar(categoriasRes.data))
      setError('')
    } catch (err) {
      setError('No se pudieron cargar los productos.')
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [mostrarInactivos])

  const cambiarCampo = (e) => {
    const { name, value } = e.target

    setForm((actual) => ({
      ...actual,
      [name]: value,
    }))
  }

  const limpiarFormulario = () => {
    setForm({
      nombre: '',
      categoria: '',
      precio_venta_sugerido: '',
      gama: 'Media',
    })
    setEditandoId(null)
  }

  const guardarProducto = async (e) => {
    e.preventDefault()
    setMensaje('')
    setError('')
    setCargando(true)

    try {
      const payload = {
        nombre: form.nombre,
        categoria: Number(form.categoria),
        precio_venta_sugerido: Number(form.precio_venta_sugerido),
        gama: form.gama,
      }

      if (editandoId) {
        await api.put(`/productos/${editandoId}/`, payload)
        setMensaje('Producto actualizado correctamente.')
      } else {
        await api.post('/productos/', payload)
        setMensaje('Producto registrado correctamente.')
      }

      limpiarFormulario()
      await cargarDatos()
    } catch (err) {
      setError('No se pudo guardar el producto.')
    } finally {
      setCargando(false)
    }
  }

  const editarProducto = (producto) => {
    setEditandoId(producto.id)
    setForm({
      nombre: producto.nombre || '',
      categoria: producto.categoria || '',
      precio_venta_sugerido: producto.precio_venta_sugerido || '',
      gama: producto.gama || 'Media',
    })
    setMensaje('')
    setError('')
  }

  const desactivarProducto = async (producto) => {
    const confirmado = window.confirm(
      `¿Desactivar el producto ${producto.nombre}?`
    )

    if (!confirmado) return

    try {
      await api.delete(`/productos/${producto.id}/`)
      setMensaje('Producto desactivado correctamente.')
      await cargarDatos()
    } catch (err) {
      setError('No se pudo desactivar el producto.')
    }
  }

  const reactivarProducto = async (producto) => {
    try {
      await api.patch(`/productos/${producto.id}/reactivar/`)
      setMensaje('Producto reactivado correctamente.')
      await cargarDatos()
    } catch (err) {
      setError('No se pudo reactivar el producto.')
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Productos</h1>
          <p>Administración de productos, categorías, precios y gama.</p>
        </div>

        <div className="header-actions">
          <button onClick={() => setMostrarInactivos(!mostrarInactivos)}>
            {mostrarInactivos ? 'Ver solo activos' : 'Ver inactivos'}
          </button>

          <button onClick={cargarDatos}>Actualizar</button>
        </div>
      </div>

      {mensaje && <div className="alert success">{mensaje}</div>}
      {error && <div className="alert error">{error}</div>}

      <section className="card">
        <h2>{editandoId ? 'Editar producto' : 'Registrar nuevo producto'}</h2>

        <form className="form-grid" onSubmit={guardarProducto}>
          <label>
            Nombre
            <input
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={cambiarCampo}
              required
            />
          </label>

          <label>
            Categoría
            <select
              name="categoria"
              value={form.categoria}
              onChange={cambiarCampo}
              required
            >
              <option value="">Seleccionar categoría</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nombre_categoria}
                </option>
              ))}
            </select>
          </label>

          <label>
            Precio venta sugerido
            <input
              type="number"
              name="precio_venta_sugerido"
              value={form.precio_venta_sugerido}
              min="0"
              step="0.01"
              onChange={cambiarCampo}
              required
            />
          </label>

          <label>
            Gama
            <select name="gama" value={form.gama} onChange={cambiarCampo}>
              <option value="Alta">Alta</option>
              <option value="Media">Media</option>
              <option value="Baja">Baja</option>
              <option value="Accesorio">Accesorio</option>
            </select>
          </label>

          <button type="submit" disabled={cargando}>
            {cargando
              ? 'Guardando...'
              : editandoId
                ? 'Actualizar producto'
                : 'Registrar producto'}
          </button>

          {editandoId && (
            <button
              type="button"
              className="secondary-button"
              onClick={limpiarFormulario}
            >
              Cancelar edición
            </button>
          )}
        </form>
      </section>

      <section className="card">
        <h2>Productos registrados</h2>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Precio venta</th>
              <th>Gama</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {productos.length === 0 ? (
              <tr>
                <td colSpan="7">No hay productos registrados.</td>
              </tr>
            ) : (
              productos.map((producto) => (
                <tr key={producto.id}>
                  <td>{producto.id}</td>
                  <td>{producto.nombre}</td>
                  <td>{producto.categoria_nombre || producto.categoria}</td>
                  <td>Bs {producto.precio_venta_sugerido}</td>
                  <td>
                    <span className="badge">{producto.gama}</span>
                  </td>
                  <td>
                    {producto.activo ? (
                      <span className="badge success-badge">Activo</span>
                    ) : (
                      <span className="badge warning">Inactivo</span>
                    )}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="small-button"
                        onClick={() => editarProducto(producto)}
                      >
                        Editar
                      </button>

                      {producto.activo ? (
                        <button
                          type="button"
                          className="small-button danger-button"
                          onClick={() => desactivarProducto(producto)}
                        >
                          Desactivar
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="small-button success-button"
                          onClick={() => reactivarProducto(producto)}
                        >
                          Reactivar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </>
  )
}