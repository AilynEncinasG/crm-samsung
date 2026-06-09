import { useEffect, useState } from 'react'

const API_URL = 'http://localhost:8000/api/inteligencia-predictiva/'

export default function InteligenciaPredictiva() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarPredicciones()
  }, [])

  const cargarPredicciones = async () => {
    try {
      setLoading(true)

      const response = await fetch(API_URL)

      if (!response.ok) {
        throw new Error('Error al cargar inteligencia predictiva')
      }

      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error(error)
      alert('No se pudieron cargar las predicciones')
    } finally {
      setLoading(false)
    }
  }

  const obtenerClaseRiesgo = (riesgo) => {
    if (riesgo === 'ALTO') return 'badge danger'
    if (riesgo === 'MEDIO') return 'badge warning'
    return 'badge success'
  }

  const obtenerClaseTendencia = (tendencia) => {
    if (tendencia === 'CRECIENTE') return 'badge warning'
    if (tendencia === 'DECRECIENTE') return 'badge success'
    return 'badge neutral'
  }

  if (loading) {
    return <p>Cargando inteligencia predictiva...</p>
  }

  if (!data) {
    return <p>No existen datos predictivos disponibles.</p>
  }

  const resumen = data.resumen || {}
  const predicciones = data.predicciones || []

  return (
    <div>
      <h1>Inteligencia Artificial Predictiva</h1>

      <p>
        Este módulo permite analizar la demanda estimada, identificar productos
        con inventario crítico y generar recomendaciones de reposición para
        apoyar la toma de decisiones.
      </p>

      <div className="grid-cards">
        <div className="card">
          <h3>Productos analizados</h3>
          <p>{resumen.productos_analizados || 0}</p>
        </div>

        <div className="card">
          <h3>Productos críticos</h3>
          <p>{resumen.productos_criticos || 0}</p>
        </div>

        <div className="card">
          <h3>Demanda total estimada</h3>
          <p>{resumen.demanda_total_estimada || 0}</p>
        </div>

        <div className="card">
          <h3>Fecha de generación</h3>
          <p>{resumen.fecha_generacion || 'Sin fecha'}</p>
        </div>
      </div>

      <section className="card">
        <h2>Método predictivo utilizado</h2>
        <p>{resumen.metodo}</p>
      </section>

      <section className="card">
        <h2>Predicción de demanda e inventario crítico</h2>

        {predicciones.length === 0 ? (
          <p>No existen predicciones generadas.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID Producto</th>
                <th>Producto</th>
                <th>Stock actual</th>
                <th>Demanda estimada</th>
                <th>Riesgo</th>
                <th>Tendencia</th>
                <th>Reposición sugerida</th>
                <th>Recomendación</th>
              </tr>
            </thead>

            <tbody>
              {predicciones.map((item) => (
                <tr key={item.producto_id}>
                  <td>{item.producto_id}</td>
                  <td>{item.producto}</td>
                  <td>{item.stock_actual}</td>
                  <td>{item.demanda_estimada}</td>
                  <td>
                    <span className={obtenerClaseRiesgo(item.nivel_riesgo)}>
                      {item.nivel_riesgo}
                    </span>
                  </td>
                  <td>
                    <span className={obtenerClaseTendencia(item.tendencia)}>
                      {item.tendencia}
                    </span>
                  </td>
                  <td>{item.reposicion_sugerida}</td>
                  <td>{item.recomendacion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2>Interpretación estratégica</h2>
        <p>
          Los productos con riesgo alto requieren reposición prioritaria debido
          a que presentan demanda estimada mayor al stock disponible. Los
          productos con riesgo bajo deben mantenerse en seguimiento para futuras
          variaciones de demanda.
        </p>
      </section>
    </div>
  )
}