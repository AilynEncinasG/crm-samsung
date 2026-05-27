import { useEffect, useState } from 'react'
import api from '../services/api'

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([])
  const [mostrarInactivos, setMostrarInactivos] = useState(false)

  const [form, setForm] = useState({
    nombre_proveedor: '',
    telefono: '',
  })

  const [editandoId, setEditandoId] = useState(null)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const normalizar = (data) => data.results || data

  const cargarProveedores = async () => {
    try {
      const url = mostrarInactivos
        ? '/proveedores/?incluir_inactivos=1'
        : '/proveedores/'

      const res = await api.get(url)
      setProveedores(normalizar(res.data))
      setError('')
    } catch (err) {
      setError('No se pudieron cargar los proveedores.')
    }
  }

  useEffect(() => {
    cargarProveedores()
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

    try {
      const payload = {
        nombre_proveedor: form.nombre_proveedor,
        telefono: form.telefono,
      }

      if (editandoId) {
        await api.put(`/proveedores/${editandoId}/`, payload)
        setMensaje('Proveedor actualizado correctamente.')
      } else {
        await api.post('/proveedores/', payload)
        setMensaje('Proveedor registrado correctamente.')
      }

      limpiarFormulario()
      await cargarProveedores()
    } catch (err) {
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
      await cargarProveedores()
    } catch (err) {
      setError('No se pudo desactivar el proveedor.')
    }
  }

  const reactivarProveedor = async (proveedor) => {
    try {
      await api.patch(`/proveedores/${proveedor.id}/reactivar/`)
      setMensaje('Proveedor reactivado correctamente.')
      await cargarProveedores()
    } catch (err) {
      setError('No se pudo reactivar el proveedor.')
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Proveedores</h1>
          <p>Administración de proveedores para compras y abastecimiento.</p>
        </div>

        <div className="header-actions">
          <button onClick={() => setMostrarInactivos(!mostrarInactivos)}>
            {mostrarInactivos ? 'Ver solo activos' : 'Ver inactivos'}
          </button>

          <button onClick={cargarProveedores}>Actualizar</button>
        </div>
      </div>

      {mensaje && <div className="alert success">{mensaje}</div>}
      {error && <div className="alert error">{error}</div>}

      <section className="card">
        <h2>{editandoId ? 'Editar proveedor' : 'Registrar nuevo proveedor'}</h2>

        <form className="form-grid" onSubmit={guardarProveedor}>
          <label>
            Nombre proveedor
            <input
              type="text"
              name="nombre_proveedor"
              value={form.nombre_proveedor}
              onChange={cambiarCampo}
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
        <h2>Proveedores registrados</h2>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Proveedor</th>
              <th>Teléfono</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {proveedores.length === 0 ? (
              <tr>
                <td colSpan="5">No hay proveedores registrados.</td>
              </tr>
            ) : (
              proveedores.map((proveedor) => (
                <tr key={proveedor.id}>
                  <td>{proveedor.id}</td>
                  <td>{proveedor.nombre_proveedor}</td>
                  <td>{proveedor.telefono || 'Sin teléfono'}</td>
                  <td>
                    {proveedor.activo ? (
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
                        onClick={() => editarProveedor(proveedor)}
                      >
                        Editar
                      </button>

                      {proveedor.activo ? (
                        <button
                          type="button"
                          className="small-button danger-button"
                          onClick={() => desactivarProveedor(proveedor)}
                        >
                          Desactivar
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="small-button success-button"
                          onClick={() => reactivarProveedor(proveedor)}
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