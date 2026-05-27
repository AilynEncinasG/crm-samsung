import { useEffect, useState } from 'react'
import api from '../services/api'

export default function Repartidores() {
  const [repartidores, setRepartidores] = useState([])
  const [mostrarInactivos, setMostrarInactivos] = useState(false)

  const [form, setForm] = useState({
    nombre_completo: '',
    vehiculo: '',
    placa: '',
    telefono: '',
  })

  const [editandoId, setEditandoId] = useState(null)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const normalizar = (data) => data.results || data

  const cargarRepartidores = async () => {
    try {
      const url = mostrarInactivos
        ? '/repartidores/?incluir_inactivos=1'
        : '/repartidores/'

      const res = await api.get(url)
      setRepartidores(normalizar(res.data))
      setError('')
    } catch (err) {
      setError('No se pudieron cargar los repartidores.')
    }
  }

  useEffect(() => {
    cargarRepartidores()
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
      nombre_completo: '',
      vehiculo: '',
      placa: '',
      telefono: '',
    })
    setEditandoId(null)
  }

  const guardarRepartidor = async (e) => {
    e.preventDefault()
    setMensaje('')
    setError('')
    setCargando(true)

    try {
      const payload = {
        nombre_completo: form.nombre_completo,
        vehiculo: form.vehiculo,
        placa: form.placa,
        telefono: form.telefono,
      }

      if (editandoId) {
        await api.put(`/repartidores/${editandoId}/`, payload)
        setMensaje('Repartidor actualizado correctamente.')
      } else {
        await api.post('/repartidores/', payload)
        setMensaje('Repartidor registrado correctamente.')
      }

      limpiarFormulario()
      await cargarRepartidores()
    } catch (err) {
      setError('No se pudo guardar el repartidor.')
    } finally {
      setCargando(false)
    }
  }

  const editarRepartidor = (repartidor) => {
    setEditandoId(repartidor.id)
    setForm({
      nombre_completo: repartidor.nombre_completo || '',
      vehiculo: repartidor.vehiculo || '',
      placa: repartidor.placa || '',
      telefono: repartidor.telefono || '',
    })
    setMensaje('')
    setError('')
  }

  const desactivarRepartidor = async (repartidor) => {
    const confirmado = window.confirm(
      `¿Desactivar al repartidor ${repartidor.nombre_completo}?`
    )

    if (!confirmado) return

    try {
      await api.delete(`/repartidores/${repartidor.id}/`)
      setMensaje('Repartidor desactivado correctamente.')
      await cargarRepartidores()
    } catch (err) {
      setError('No se pudo desactivar el repartidor.')
    }
  }

  const reactivarRepartidor = async (repartidor) => {
    try {
      await api.patch(`/repartidores/${repartidor.id}/reactivar/`)
      setMensaje('Repartidor reactivado correctamente.')
      await cargarRepartidores()
    } catch (err) {
      setError('No se pudo reactivar el repartidor.')
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Repartidores</h1>
          <p>Administración de repartidores para entregas de pedidos.</p>
        </div>

        <div className="header-actions">
          <button onClick={() => setMostrarInactivos(!mostrarInactivos)}>
            {mostrarInactivos ? 'Ver solo activos' : 'Ver inactivos'}
          </button>

          <button onClick={cargarRepartidores}>Actualizar</button>
        </div>
      </div>

      {mensaje && <div className="alert success">{mensaje}</div>}
      {error && <div className="alert error">{error}</div>}

      <section className="card">
        <h2>{editandoId ? 'Editar repartidor' : 'Registrar nuevo repartidor'}</h2>

        <form className="form-grid" onSubmit={guardarRepartidor}>
          <label>
            Nombre completo
            <input
              type="text"
              name="nombre_completo"
              value={form.nombre_completo}
              onChange={cambiarCampo}
              required
            />
          </label>

          <label>
            Vehículo
            <input
              type="text"
              name="vehiculo"
              value={form.vehiculo}
              onChange={cambiarCampo}
            />
          </label>

          <label>
            Placa
            <input
              type="text"
              name="placa"
              value={form.placa}
              onChange={cambiarCampo}
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
                ? 'Actualizar repartidor'
                : 'Registrar repartidor'}
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
        <h2>Repartidores registrados</h2>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre completo</th>
              <th>Vehículo</th>
              <th>Placa</th>
              <th>Teléfono</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {repartidores.length === 0 ? (
              <tr>
                <td colSpan="7">No hay repartidores registrados.</td>
              </tr>
            ) : (
              repartidores.map((repartidor) => (
                <tr key={repartidor.id}>
                  <td>{repartidor.id}</td>
                  <td>{repartidor.nombre_completo}</td>
                  <td>{repartidor.vehiculo || 'Sin vehículo'}</td>
                  <td>{repartidor.placa || 'Sin placa'}</td>
                  <td>{repartidor.telefono || 'Sin teléfono'}</td>
                  <td>
                    {repartidor.activo ? (
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
                        onClick={() => editarRepartidor(repartidor)}
                      >
                        Editar
                      </button>

                      {repartidor.activo ? (
                        <button
                          type="button"
                          className="small-button danger-button"
                          onClick={() => desactivarRepartidor(repartidor)}
                        >
                          Desactivar
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="small-button success-button"
                          onClick={() => reactivarRepartidor(repartidor)}
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