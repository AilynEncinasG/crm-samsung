import { useEffect, useState } from 'react'

const API_URL = 'http://localhost:8000/api/almacenes/'
const TIENDAS_URL = 'http://localhost:8000/api/tiendas/'

export default function Almacenes() {
  const [almacenes, setAlmacenes] = useState([])
  const [tiendas, setTiendas] = useState([])
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({
    nombre_almacen: '',
    ubicacion: '',
    tienda: '',
  })

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      setLoading(true)

      const [almacenesRes, tiendasRes] = await Promise.all([
        fetch(API_URL),
        fetch(TIENDAS_URL),
      ])

      if (!almacenesRes.ok) {
        throw new Error('Error al cargar almacenes')
      }

      if (!tiendasRes.ok) {
        throw new Error('Error al cargar tiendas')
      }

      const almacenesData = await almacenesRes.json()
      const tiendasData = await tiendasRes.json()

      setAlmacenes(almacenesData)
      setTiendas(tiendasData)
    } catch (error) {
      console.error(error)
      alert('No se pudieron cargar los datos de almacenes')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target

    setForm({
      ...form,
      [name]: value,
    })
  }

  const registrarAlmacen = async (e) => {
    e.preventDefault()

    if (!form.nombre_almacen || !form.ubicacion || !form.tienda) {
      alert('Completa todos los campos')
      return
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre_almacen: form.nombre_almacen,
          ubicacion: form.ubicacion,
          tienda: Number(form.tienda),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error(errorData)
        alert('Error al registrar el almacén')
        return
      }

      setForm({
        nombre_almacen: '',
        ubicacion: '',
        tienda: '',
      })

      await cargarDatos()
      alert('Almacén registrado correctamente')
    } catch (error) {
      console.error(error)
      alert('Error de conexión con el servidor')
    }
  }

  const eliminarAlmacen = async (id) => {
    const confirmar = confirm('¿Seguro que deseas eliminar este almacén?')

    if (!confirmar) return

    try {
      const response = await fetch(`${API_URL}${id}/`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        alert('No se pudo eliminar el almacén')
        return
      }

      await cargarDatos()
      alert('Almacén eliminado correctamente')
    } catch (error) {
      console.error(error)
      alert('Error de conexión con el servidor')
    }
  }

  return (
    <div>
      <h1>Gestión de Almacenes</h1>
      <p>
        Este módulo permite registrar y consultar almacenes asociados a tiendas,
        fortaleciendo el control de inventario por ubicación.
      </p>

      <section className="card">
        <h2>Registrar almacén</h2>

        <form onSubmit={registrarAlmacen} className="form-grid">
          <input
            type="text"
            name="nombre_almacen"
            placeholder="Nombre del almacén"
            value={form.nombre_almacen}
            onChange={handleChange}
          />

          <input
            type="text"
            name="ubicacion"
            placeholder="Ubicación"
            value={form.ubicacion}
            onChange={handleChange}
          />

          <select name="tienda" value={form.tienda} onChange={handleChange}>
            <option value="">Seleccione una tienda</option>
            {tiendas.map((tienda) => (
              <option key={tienda.id} value={tienda.id}>
                {tienda.nombre_tienda}
              </option>
            ))}
          </select>

          <button type="submit">Registrar almacén</button>
        </form>
      </section>

      <section className="card">
        <h2>Listado de almacenes</h2>

        {loading ? (
          <p>Cargando almacenes...</p>
        ) : almacenes.length === 0 ? (
          <p>No existen almacenes registrados.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre almacén</th>
                <th>Ubicación</th>
                <th>Tienda</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {almacenes.map((almacen) => (
                <tr key={almacen.id}>
                  <td>{almacen.id}</td>
                  <td>{almacen.nombre_almacen}</td>
                  <td>{almacen.ubicacion}</td>
                  <td>{almacen.tienda_nombre || almacen.tienda}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => eliminarAlmacen(almacen.id)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}