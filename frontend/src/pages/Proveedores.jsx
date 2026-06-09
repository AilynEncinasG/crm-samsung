//frontend/src/pages/Proveedores.jsx
import { useEffect, useState } from 'react'
import api from '../services/api'

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([])
  const [compras, setCompras] = useState([])
  const [mostrarInactivos, setMostrarInactivos] = useState(false)

  const [form, setForm] = useState({
    nombre_proveedor: '',
    telefono: '',
  })

  const [editandoId, setEditandoId] = useState(null)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [cargandoDatos, setCargandoDatos] = useState(true)

  const normalizar = (data) => data.results || data

  const cargarDatos = async () => {
    setCargandoDatos(true)
    setError('')

    try {
      const proveedoresUrl = mostrarInactivos
        ? '/proveedores/?incluir_inactivos=1'
        : '/proveedores/'

      const [proveedoresRes, comprasRes] = await Promise.all([
        api.get(proveedoresUrl),
        api.get('/ordenes-compra/'),
      ])

      setProveedores(normalizar(proveedoresRes.data))
      setCompras(normalizar(comprasRes.data))
    } catch (err) {
      console.error(err)
      setError('No se pudieron cargar los proveedores.')
    } finally {
      setCargandoDatos(false)
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
      nombre_proveedor: '',
      telefono: '',
    })
    setEditandoId(null)
  }

  const guardarProveedor = async (e) => {
    e.preventDefault()
    setMensaje('')
    setError('')
    setCargando(true)

    if (!form.nombre_proveedor.trim()) {
      setError('El nombre del proveedor es obligatorio.')
      setCargando(false)
      return
    }

    try {
      const payload = {
        nombre_proveedor: form.nombre_proveedor,
        telefono: form.telefono,
        activo: true,
      }

      if (editandoId) {
        await api.put(`/proveedores/${editandoId}/`, payload)
        setMensaje('Proveedor actualizado correctamente.')
      } else {
        await api.post('/proveedores/', payload)
        setMensaje('Proveedor registrado correctamente.')
      }

      limpiarFormulario()
      await cargarDatos()
    } catch (err) {
      console.error(err)
      setError('No se pudo guardar el proveedor.')
    } finally {
      setCargando(false)
    }
  }

  const editarProveedor = (proveedor) => {
    setEditandoId(proveedor.id)
    setForm({
      nombre_proveedor: proveedor.nombre_proveedor || '',
      telefono: proveedor.telefono || '',
    })
    setMensaje('')
    setError('')
  }

  const desactivarProveedor = async (proveedor) => {
    const confirmado = window.confirm(
      `¿Desactivar el proveedor ${proveedor.nombre_proveedor}?`
    )

    if (!confirmado) return

    try {
      await api.delete(`/proveedores/${proveedor.id}/`)
      setMensaje('Proveedor desactivado correctamente.')
      await cargarDatos()
    } catch (err) {
      console.error(err)
      setError('No se pudo desactivar el proveedor.')
    }
  }

  const reactivarProveedor = async (proveedor) => {
    try {
      await api.patch(`/proveedores/${proveedor.id}/reactivar/`)
      setMensaje('Proveedor reactivado correctamente.')
      await cargarDatos()
    } catch (err) {
      console.error(err)
      setError('No se pudo reactivar el proveedor.')
    }
  }

  const comprasPorProveedor = (proveedorId) => {
    return compras.filter(
      (compra) => String(compra.proveedor) === String(proveedorId)
    )
  }

  const totalCompradoPorProveedor = (proveedorId) => {
    return comprasPorProveedor(proveedorId).reduce(
      (total, compra) => total + Number(compra.total || 0),
      0
    )
  }

  const formatoMoneda = (valor) => {
    return Number(valor || 0).toLocaleString('es-BO', {
      style: 'currency',
      currency: 'BOB',
    })
  }

  const totalProveedores = proveedores.length
  const proveedoresActivos = proveedores.filter((p) => p.activo).length
  const totalCompras = compras.reduce(
    (total, compra) => total + Number(compra.total || 0),
    0
  )

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Proveedores</h1>
          <p>
            Administración de proveedores, abastecimiento y relación con órdenes
            de compra.
          </p>
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

      {cargandoDatos ? (
        <div className="card">Cargando proveedores...</div>
      ) : (
        <>
          <section className="kpi-grid">
            <div className="kpi-card">
              <span>Proveedores registrados</span>
              <strong>{totalProveedores}</strong>
            </div>

            <div className="kpi-card">
              <span>Proveedores activos</span>
              <strong>{proveedoresActivos}</strong>
            </div>

            <div className="kpi-card">
              <span>Órdenes de compra</span>
              <strong>{compras.length}</strong>
            </div>

            <div className="kpi-card">
              <span>Total comprado</span>
              <strong>{formatoMoneda(totalCompras)}</strong>
            </div>
          </section>

          <section className="card">
            <h2>{editandoId ? 'Editar proveedor' : 'Registrar proveedor'}</h2>

            <form className="form-grid" onSubmit={guardarProveedor}>
              <label>
                Nombre proveedor
                <input
                  type="text"
                  name="nombre_proveedor"
                  value={form.nombre_proveedor}
                  onChange={cambiarCampo}
                  placeholder="Ej: Samsung Bolivia Distribuidor"
                  required
                />
              </label>

              <label>
                Teléfono
                <input
                  type="text"
                  name="telefono"
                  value={form.telefono}
                  onChange={cambiarCampo}
                  placeholder="Ej: 73074412"
                />
              </label>

              <button type="submit" disabled={cargando}>
                {cargando
                  ? 'Guardando...'
                  : editandoId
                    ? 'Actualizar proveedor'
                    : 'Registrar proveedor'}
              </button>

              {editandoId && (
                <button type="button" onClick={limpiarFormulario}>
                  Cancelar edición
                </button>
              )}
            </form>
          </section>

          <section className="card">
            <h2>Listado de proveedores</h2>

            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Proveedor</th>
                  <th>Teléfono</th>
                  <th>Estado</th>
                  <th>Compras</th>
                  <th>Total comprado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {proveedores.length === 0 ? (
                  <tr>
                    <td colSpan="7">No hay proveedores registrados.</td>
                  </tr>
                ) : (
                  proveedores.map((proveedor) => {
                    const cantidadCompras = comprasPorProveedor(proveedor.id).length
                    const totalComprado = totalCompradoPorProveedor(proveedor.id)

                    return (
                      <tr key={proveedor.id}>
                        <td>{proveedor.id}</td>
                        <td>{proveedor.nombre_proveedor}</td>
                        <td>{proveedor.telefono || '-'}</td>
                        <td>
                          <span
                            className={
                              proveedor.activo
                                ? 'badge success'
                                : 'badge danger'
                            }
                          >
                            {proveedor.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td>{cantidadCompras}</td>
                        <td>{formatoMoneda(totalComprado)}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => editarProveedor(proveedor)}
                          >
                            Editar
                          </button>

                          {proveedor.activo ? (
                            <button
                              type="button"
                              onClick={() => desactivarProveedor(proveedor)}
                            >
                              Desactivar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => reactivarProveedor(proveedor)}
                            >
                              Reactivar
                            </button>
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
            <h2>Compras por proveedor</h2>

            <table>
              <thead>
                <tr>
                  <th>Proveedor</th>
                  <th>Órdenes registradas</th>
                  <th>Total comprado</th>
                  <th>Participación</th>
                </tr>
              </thead>

              <tbody>
                {proveedores.map((proveedor) => {
                  const cantidadCompras = comprasPorProveedor(proveedor.id).length
                  const totalComprado = totalCompradoPorProveedor(proveedor.id)
                  const participacion =
                    totalCompras > 0
                      ? ((totalComprado / totalCompras) * 100).toFixed(2)
                      : '0.00'

                  return (
                    <tr key={proveedor.id}>
                      <td>{proveedor.nombre_proveedor}</td>
                      <td>{cantidadCompras}</td>
                      <td>{formatoMoneda(totalComprado)}</td>
                      <td>{participacion}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>

          <section className="card">
            <h2>Interpretación del módulo</h2>
            <p>
              El módulo de proveedores permite administrar la información de
              abastecimiento y relacionarla con las órdenes de compra. Esta
              relación ayuda a analizar qué proveedor suministra productos,
              cuánto se compra y cómo contribuye a la reposición del inventario.
            </p>
          </section>
        </>
      )}
    </>
  )
}