import { useEffect, useState } from 'react'
import api from '../services/api'

export default function Clientes() {
  const [mostrarInactivos, setMostrarInactivos] = useState(false)
  const [clientes, setClientes] = useState([])
  const [form, setForm] = useState({
    nombre: '',
    apellidos: '',
    email: '',
    segmento: 'Nuevo',
  })

  const [editandoId, setEditandoId] = useState(null)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const normalizar = (data) => data.results || data

  const cargarClientes = async () => {
    try {
      const url = mostrarInactivos
        ? '/clientes/?incluir_inactivos=1'
        : '/clientes/'

      const res = await api.get(url)
      setClientes(normalizar(res.data))
      setError('')
    } catch (err) {
      setError('No se pudieron cargar los clientes.')
    }
  }

  useEffect(() => {
    cargarClientes()
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
      apellidos: '',
      email: '',
      segmento: 'Nuevo',
    })
    setEditandoId(null)
  }

  const guardarCliente = async (e) => {
    e.preventDefault()
    setMensaje('')
    setError('')
    setCargando(true)

    try {
      const payload = {
        nombre: form.nombre,
        apellidos: form.apellidos,
        email: form.email,
        segmento: form.segmento,
      }

      if (editandoId) {
        await api.put(`/clientes/${editandoId}/`, payload)
        setMensaje('Cliente actualizado correctamente.')
      } else {
        await api.post('/clientes/', payload)
        setMensaje('Cliente registrado correctamente.')
      }

      limpiarFormulario()
      await cargarClientes()
    } catch (err) {
      setError('No se pudo guardar el cliente.')
    } finally {
      setCargando(false)
    }
  }

  const editarCliente = (cliente) => {
    setEditandoId(cliente.id)
    setForm({
      nombre: cliente.nombre || '',
      apellidos: cliente.apellidos || '',
      email: cliente.email || '',
      segmento: cliente.segmento || 'Nuevo',
    })
    setMensaje('')
    setError('')
  }

  const eliminarCliente = async (cliente) => {
    const confirmado = window.confirm(
      `¿Eliminar al cliente ${cliente.nombre} ${cliente.apellidos || ''}?`
    )

    if (!confirmado) return

    try {
      await api.delete(`/clientes/${cliente.id}/`)
      setMensaje('Cliente eliminado correctamente.')
      await cargarClientes()
    } catch (err) {
      setError('No se pudo eliminar el cliente. Puede estar asociado a pedidos.')
    }
  }
  const reactivarCliente = async (cliente) => {
    try {
      await api.patch(`/clientes/${cliente.id}/reactivar/`)
      setMensaje('Cliente reactivado correctamente.')
      await cargarClientes()
    } catch (err) {
      setError('No se pudo reactivar el cliente.')
    }
  }

  return (
    <>
      <div className="header-actions">
        <button onClick={() => setMostrarInactivos(!mostrarInactivos)}>
          {mostrarInactivos ? 'Ver solo activos' : 'Ver inactivos'}
        </button>

        <button onClick={cargarClientes}>Actualizar</button>
      </div>

      {mensaje && <div className="alert success">{mensaje}</div>}
      {error && <div className="alert error">{error}</div>}

      <section className="card">
        <h2>{editandoId ? 'Editar cliente' : 'Registrar nuevo cliente'}</h2>

        <form className="form-grid" onSubmit={guardarCliente}>
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
            Apellidos
            <input
              type="text"
              name="apellidos"
              value={form.apellidos}
              onChange={cambiarCampo}
            />
          </label>

          <label>
            Email
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={cambiarCampo}
            />
          </label>

          <label>
            Segmento
            <select
              name="segmento"
              value={form.segmento}
              onChange={cambiarCampo}
            >
              <option value="Nuevo">Nuevo</option>
              <option value="Frecuente">Frecuente</option>
              <option value="Premium">Premium</option>
              <option value="Corporativo">Corporativo</option>
            </select>
          </label>

          <button type="submit" disabled={cargando}>
            {cargando
              ? 'Guardando...'
              : editandoId
                ? 'Actualizar cliente'
                : 'Registrar cliente'}
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
        <h2>Clientes registrados</h2>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre completo</th>
              <th>Email</th>
              <th>Segmento</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {clientes.length === 0 ? (
              <tr>
                <td colSpan="6">No hay clientes registrados.</td>
              </tr>
            ) : (
              clientes.map((cliente) => (
                <tr key={cliente.id}>
                  <td>{cliente.id}</td>
                  <td>
                    {cliente.nombre} {cliente.apellidos || ''}
                  </td>
                  <td>{cliente.email || 'Sin email'}</td>
                  <td>
                    <span className="badge">{cliente.segmento}</span>
                  </td>
                  <td>
                    {cliente.activo ? (
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
                        onClick={() => editarCliente(cliente)}
                      >
                        Editar
                      </button>

                      {cliente.activo ? (
                        <button
                          type="button"
                          className="small-button danger-button"
                          onClick={() => eliminarCliente(cliente)}
                        >
                          Desactivar
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="small-button success-button"
                          onClick={() => reactivarCliente(cliente)}
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