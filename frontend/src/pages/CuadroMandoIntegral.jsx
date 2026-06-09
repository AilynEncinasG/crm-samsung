import { useEffect, useMemo, useState } from 'react'

const DASHBOARD_URL = 'http://localhost:8000/api/dashboard/'
const DASHBOARD_DW_URL = 'http://localhost:8000/api/dashboard-dw/'
const IA_URL = 'http://localhost:8000/api/inteligencia-predictiva/'
const ODOO_URL = 'http://localhost:8000/api/odoo/resumen/'
const ASISTENTE_IA_URL = 'http://localhost:8000/api/cmi/asistente-ia/'

const INDICADORES_INICIALES = [
  {
    id: 1,
    perspectiva: 'Financiera',
    nombre: 'Ingreso bruto',
    metrica: 'ingreso_bruto',
    meta: 100000,
    tipoMeta: 'mayor_igual',
    descripcion: 'Medir el ingreso generado por las ventas consolidadas.',
  },
  {
    id: 2,
    perspectiva: 'Financiera',
    nombre: 'Utilidad neta',
    metrica: 'utilidad_neta',
    meta: 15000,
    tipoMeta: 'mayor_igual',
    descripcion: 'Evaluar la ganancia neta obtenida por la operación comercial.',
  },
  {
    id: 3,
    perspectiva: 'Clientes',
    nombre: 'Clientes activos',
    metrica: 'clientes',
    meta: 20,
    tipoMeta: 'mayor_igual',
    descripcion: 'Evaluar el crecimiento de la base de clientes del CRM.',
  },
  {
    id: 4,
    perspectiva: 'Clientes',
    nombre: 'Satisfacción promedio',
    metrica: 'satisfaccion_promedio',
    meta: 5,
    tipoMeta: 'mayor_igual',
    descripcion: 'Medir la satisfacción registrada en los pedidos.',
  },
  {
    id: 5,
    perspectiva: 'Procesos internos',
    nombre: 'Stock total disponible',
    metrica: 'stock_total',
    meta: 100,
    tipoMeta: 'mayor_igual',
    descripcion: 'Controlar la disponibilidad general de productos.',
  },
  {
    id: 6,
    perspectiva: 'Procesos internos',
    nombre: 'Errores de integración Odoo',
    metrica: 'errores_integracion',
    meta: 0,
    tipoMeta: 'menor_igual',
    descripcion: 'Controlar errores en la integración empresarial con Odoo.',
  },
  {
    id: 7,
    perspectiva: 'Aprendizaje y crecimiento',
    nombre: 'Productos analizados por IA',
    metrica: 'productos_analizados_ia',
    meta: 6,
    tipoMeta: 'mayor_igual',
    descripcion: 'Medir el alcance del motor predictivo sobre los productos.',
  },
  {
    id: 8,
    perspectiva: 'Aprendizaje y crecimiento',
    nombre: 'Productos críticos detectados',
    metrica: 'productos_criticos_ia',
    meta: 0,
    tipoMeta: 'menor_igual',
    descripcion: 'Identificar riesgos de desabastecimiento mediante inteligencia predictiva.',
  },
]

const PREGUNTAS_RAPIDAS = [
  {
    titulo: 'Clientes y ventas',
    pregunta:
      'Analiza clientes, ventas y oportunidades comerciales. No me hables de inventario salvo que sea necesario.',
  },
  {
    titulo: 'Rentabilidad',
    pregunta:
      'Analiza rentabilidad, utilidad, costos e ingresos. Dame decisiones gerenciales concretas.',
  },
  {
    titulo: 'Inventario crítico',
    pregunta:
      'Analiza inventario, productos críticos, demanda estimada y reposición sugerida.',
  },
  {
    titulo: 'Odoo y auditoría',
    pregunta:
      'Analiza integración Odoo, facturación, auditoría y trazabilidad del sistema.',
  },
  {
    titulo: 'Decisión gerencial',
    pregunta:
      'Según los datos actuales, ¿qué decisiones estratégicas debería tomar gerencia esta semana?',
  },
]

export default function CuadroMandoIntegral() {
  const [dashboard, setDashboard] = useState(null)
  const [dw, setDw] = useState(null)
  const [ia, setIa] = useState(null)
  const [odoo, setOdoo] = useState(null)
  const [loading, setLoading] = useState(true)

  const [preguntaIA, setPreguntaIA] = useState(PREGUNTAS_RAPIDAS[0].pregunta)
  const [respuestaIA, setRespuestaIA] = useState('')
  const [modoIA, setModoIA] = useState('')
  const [fuentesIA, setFuentesIA] = useState([])
  const [cargandoIA, setCargandoIA] = useState(false)

  const [indicadores, setIndicadores] = useState(() => {
    const guardados = localStorage.getItem('indicadores_cmi')
    return guardados ? JSON.parse(guardados) : INDICADORES_INICIALES
  })

  const [form, setForm] = useState({
    perspectiva: 'Financiera',
    nombre: '',
    metrica: 'ingreso_bruto',
    meta: '',
    tipoMeta: 'mayor_igual',
    descripcion: '',
  })

  useEffect(() => {
    cargarDatos()
  }, [])

  useEffect(() => {
    localStorage.setItem('indicadores_cmi', JSON.stringify(indicadores))
  }, [indicadores])

  const cargarDatos = async () => {
    try {
      setLoading(true)

      const [dashboardRes, dwRes, iaRes, odooRes] = await Promise.all([
        fetch(DASHBOARD_URL),
        fetch(DASHBOARD_DW_URL),
        fetch(IA_URL),
        fetch(ODOO_URL),
      ])

      if (!dashboardRes.ok) throw new Error('Error al cargar dashboard')
      if (!dwRes.ok) throw new Error('Error al cargar Data Warehouse')
      if (!iaRes.ok) throw new Error('Error al cargar Inteligencia Predictiva')
      if (!odooRes.ok) throw new Error('Error al cargar Odoo')

      setDashboard(await dashboardRes.json())
      setDw(await dwRes.json())
      setIa(await iaRes.json())
      setOdoo(await odooRes.json())
    } catch (error) {
      console.error(error)
      alert('No se pudieron cargar los datos del Cuadro de Mando Integral')
    } finally {
      setLoading(false)
    }
  }

  const consultarAsistenteIA = async (preguntaOpcional = null) => {
    const preguntaFinal = preguntaOpcional || preguntaIA

    if (!preguntaFinal.trim()) {
      alert('Escribe una pregunta para el asistente IA local.')
      return
    }

    setPreguntaIA(preguntaFinal)
    setCargandoIA(true)
    setRespuestaIA('')
    setModoIA('')
    setFuentesIA([])

    try {
      const response = await fetch(ASISTENTE_IA_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pregunta: preguntaFinal,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo generar el análisis IA')
      }

      setRespuestaIA(data.respuesta)
      setModoIA(data.modo || 'IA local')
      setFuentesIA(data.fuentes_analizadas || [])
    } catch (error) {
      console.error(error)
      setRespuestaIA(`No se pudo consultar el asistente IA. ${error.message}`)
      setModoIA('Error de conexión')
      setFuentesIA([])
    } finally {
      setCargandoIA(false)
    }
  }

  const metricasDisponibles = useMemo(() => {
    const kpis = dashboard?.kpis || {}
    const kpisDw = dw?.kpis || {}
    const resumenIa = ia?.resumen || {}
    const kpisOdoo = odoo?.kpis || {}

    return {
      ventas_total: Number(kpis.ventas_total || 0),
      compras_total: Number(kpis.compras_total || 0),
      clientes: Number(kpis.clientes || 0),
      pedidos: Number(kpis.pedidos || 0),
      productos: Number(kpis.productos || 0),
      stock_total: Number(kpis.stock_total || 0),

      ingreso_bruto: Number(kpisDw.ingreso_bruto || 0),
      costo_total: Number(kpisDw.costo_total || 0),
      utilidad_neta: Number(kpisDw.utilidad_neta || 0),
      cantidad_vendida: Number(kpisDw.cantidad_vendida || 0),
      satisfaccion_promedio: Number(kpisDw.satisfaccion_promedio || 0),

      productos_analizados_ia: Number(resumenIa.productos_analizados || 0),
      productos_criticos_ia: Number(resumenIa.productos_criticos || 0),
      demanda_total_estimada: Number(resumenIa.demanda_total_estimada || 0),

      clientes_sincronizados: Number(kpisOdoo.clientes_sincronizados || 0),
      productos_sincronizados: Number(kpisOdoo.productos_sincronizados || 0),
      pedidos_facturados: Number(kpisOdoo.pedidos_facturados || 0),
      pedidos_pendientes_factura: Number(kpisOdoo.pedidos_pendientes_factura || 0),
      errores_integracion: Number(kpisOdoo.errores_integracion || 0),
    }
  }, [dashboard, dw, ia, odoo])

  const nombresMetricas = {
    ventas_total: 'Ventas totales',
    compras_total: 'Compras totales',
    clientes: 'Clientes activos',
    pedidos: 'Pedidos registrados',
    productos: 'Productos activos',
    stock_total: 'Stock total',

    ingreso_bruto: 'Ingreso bruto',
    costo_total: 'Costo total',
    utilidad_neta: 'Utilidad neta',
    cantidad_vendida: 'Cantidad vendida',
    satisfaccion_promedio: 'Satisfacción promedio',

    productos_analizados_ia: 'Productos analizados por IA',
    productos_criticos_ia: 'Productos críticos por IA',
    demanda_total_estimada: 'Demanda total estimada',

    clientes_sincronizados: 'Clientes sincronizados Odoo',
    productos_sincronizados: 'Productos sincronizados Odoo',
    pedidos_facturados: 'Pedidos facturados Odoo',
    pedidos_pendientes_factura: 'Pedidos pendientes de factura',
    errores_integracion: 'Errores de integración',
  }

  const perspectivas = [
    'Financiera',
    'Clientes',
    'Procesos internos',
    'Aprendizaje y crecimiento',
  ]

  const formatoNumero = (valor) => {
    return Number(valor || 0).toLocaleString('es-BO')
  }

  const formatoMoneda = (valor) => {
    return Number(valor || 0).toLocaleString('es-BO', {
      style: 'currency',
      currency: 'BOB',
    })
  }

  const formatoResultado = (metrica, valor) => {
    const metricasMoneda = [
      'ventas_total',
      'compras_total',
      'ingreso_bruto',
      'costo_total',
      'utilidad_neta',
    ]

    if (metricasMoneda.includes(metrica)) {
      return formatoMoneda(valor)
    }

    return formatoNumero(valor)
  }

  const calcularEstado = (resultado, meta, tipoMeta) => {
    const valor = Number(resultado || 0)
    const objetivo = Number(meta || 0)

    if (tipoMeta === 'menor_igual') {
      if (valor <= objetivo) return 'Cumplido'
      if (objetivo === 0) return 'En riesgo'
      if (valor <= objetivo * 1.3) return 'En progreso'
      return 'En riesgo'
    }

    if (valor >= objetivo) return 'Cumplido'
    if (valor >= objetivo * 0.7) return 'En progreso'
    return 'En riesgo'
  }

  const calcularAvance = (resultado, meta, tipoMeta) => {
    const valor = Number(resultado || 0)
    const objetivo = Number(meta || 0)

    if (objetivo === 0) {
      return tipoMeta === 'menor_igual' && valor === 0 ? 100 : 0
    }

    if (tipoMeta === 'menor_igual') {
      if (valor <= objetivo) return 100

      const avance = 100 - ((valor - objetivo) / objetivo) * 100
      return Math.max(0, Math.min(100, Math.round(avance)))
    }

    return Math.min(100, Math.round((valor / objetivo) * 100))
  }

  const obtenerClaseEstado = (estado) => {
    if (estado === 'Cumplido') return 'badge success'
    if (estado === 'En progreso') return 'badge warning'
    return 'badge danger'
  }

  const generarAnalisis = (indicador, estado) => {
    if (estado === 'Cumplido') {
      return `El indicador "${indicador.nombre}" cumple la meta definida. Se recomienda mantener seguimiento.`
    }

    if (estado === 'En progreso') {
      return `El indicador "${indicador.nombre}" está avanzando, pero aún requiere acciones de mejora.`
    }

    return `El indicador "${indicador.nombre}" está en riesgo. Gerencia debe tomar acciones correctivas.`
  }

  const cambiarCampo = (e) => {
    const { name, value } = e.target

    setForm((actual) => ({
      ...actual,
      [name]: value,
    }))
  }

  const agregarIndicador = (e) => {
    e.preventDefault()

    if (!form.nombre.trim() || form.meta === '') {
      alert('Completa el nombre del indicador y la meta.')
      return
    }

    const nuevoIndicador = {
      id: Date.now(),
      perspectiva: form.perspectiva,
      nombre: form.nombre,
      metrica: form.metrica,
      meta: Number(form.meta),
      tipoMeta: form.tipoMeta,
      descripcion: form.descripcion,
    }

    setIndicadores((actual) => [...actual, nuevoIndicador])

    setForm({
      perspectiva: 'Financiera',
      nombre: '',
      metrica: 'ingreso_bruto',
      meta: '',
      tipoMeta: 'mayor_igual',
      descripcion: '',
    })
  }

  const eliminarIndicador = (id) => {
    const confirmar = confirm('¿Deseas eliminar este indicador del CMI?')
    if (!confirmar) return

    setIndicadores((actual) => actual.filter((item) => item.id !== id))
  }

  const restaurarIndicadores = () => {
    const confirmar = confirm(
      '¿Deseas restaurar los indicadores iniciales del Cuadro de Mando Integral?'
    )

    if (!confirmar) return

    setIndicadores(INDICADORES_INICIALES)
  }

  const indicadoresCalculados = indicadores.map((indicador) => {
    const resultado = metricasDisponibles[indicador.metrica] ?? 0
    const estado = calcularEstado(resultado, indicador.meta, indicador.tipoMeta)
    const avance = calcularAvance(resultado, indicador.meta, indicador.tipoMeta)

    return {
      ...indicador,
      resultado,
      estado,
      avance,
      analisis: generarAnalisis(indicador, estado),
    }
  })

  const totalIndicadores = indicadoresCalculados.length
  const cumplidos = indicadoresCalculados.filter((item) => item.estado === 'Cumplido').length
  const enRiesgo = indicadoresCalculados.filter((item) => item.estado === 'En riesgo').length
  const enProgreso = indicadoresCalculados.filter((item) => item.estado === 'En progreso').length

  const cumplimiento =
    totalIndicadores > 0
      ? Math.round((cumplidos / totalIndicadores) * 100)
      : 0

  const kpisDw = dw?.kpis || {}
  const resumenIa = ia?.resumen || {}
  const kpisOdoo = odoo?.kpis || {}

  if (loading) {
    return <p>Cargando Cuadro de Mando Integral...</p>
  }

  return (
    <div className="cmi-page">
      <div className="page-header">
        <div>
          <h1>Cuadro de Mando Integral</h1>
          <p>
            Gestión estratégica basada en indicadores reales del CRM, ventas,
            inventario, Data Warehouse, integración Odoo e inteligencia predictiva.
          </p>
        </div>

        <button type="button" onClick={cargarDatos}>
          Actualizar datos
        </button>
      </div>

      <div className="grid-cards cmi-summary-grid">
        <div className="card cmi-card-main">
          <h3>Cumplimiento general</h3>
          <p>{cumplimiento}%</p>
        </div>

        <div className="card">
          <h3>Indicadores</h3>
          <p>{totalIndicadores}</p>
        </div>

        <div className="card">
          <h3>Cumplidos</h3>
          <p>{cumplidos}</p>
        </div>

        <div className="card">
          <h3>En progreso</h3>
          <p>{enProgreso}</p>
        </div>

        <div className="card">
          <h3>En riesgo</h3>
          <p>{enRiesgo}</p>
        </div>

        <div className="card">
          <h3>Utilidad neta</h3>
          <p>{formatoMoneda(kpisDw.utilidad_neta)}</p>
        </div>

        <div className="card">
          <h3>Productos críticos IA</h3>
          <p>{resumenIa.productos_criticos || 0}</p>
        </div>

        <div className="card">
          <h3>Errores Odoo</h3>
          <p>{kpisOdoo.errores_integracion || 0}</p>
        </div>
      </div>

      <section className="card cmi-ai-panel">
        <div className="ai-header">
          <div>
            <span className="ai-kicker">Asistente IA Local</span>
            <h2>Asistente Estratégico del CMI</h2>
            <p>
              Consulta al modelo local de IA sobre clientes, ventas, inventario,
              rentabilidad, Odoo, auditoría o decisiones gerenciales.
            </p>
          </div>

          <div className="ai-status">
            <span className="status-dot"></span>
            {modoIA || 'IA local disponible'}
          </div>
        </div>

        <div className="quick-questions">
          {PREGUNTAS_RAPIDAS.map((item) => (
            <button
              key={item.titulo}
              type="button"
              onClick={() => consultarAsistenteIA(item.pregunta)}
              disabled={cargandoIA}
            >
              {item.titulo}
            </button>
          ))}
        </div>

        <textarea
          value={preguntaIA}
          onChange={(e) => setPreguntaIA(e.target.value)}
          rows="4"
          placeholder="Ej: ¿Qué decisiones debe tomar gerencia esta semana?"
        />

        <button
          type="button"
          className="ai-main-button"
          onClick={() => consultarAsistenteIA()}
          disabled={cargandoIA}
        >
          {cargandoIA ? 'Analizando con IA local...' : 'Analizar con IA'}
        </button>

        {respuestaIA && (
          <div className="ai-response">
            <div className="ai-response-top">
              <strong>Respuesta del asistente</strong>
              <span>{modoIA}</span>
            </div>

            {fuentesIA.length > 0 && (
              <p className="ai-sources">
                <strong>Fuentes:</strong> {fuentesIA.join(', ')}
              </p>
            )}

            <pre>{respuestaIA}</pre>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Agregar nueva meta estratégica</h2>

        <form className="form-grid" onSubmit={agregarIndicador}>
          <label>
            Perspectiva
            <select
              name="perspectiva"
              value={form.perspectiva}
              onChange={cambiarCampo}
            >
              {perspectivas.map((perspectiva) => (
                <option key={perspectiva} value={perspectiva}>
                  {perspectiva}
                </option>
              ))}
            </select>
          </label>

          <label>
            Nombre del indicador
            <input
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={cambiarCampo}
              placeholder="Ej: Incrementar clientes activos"
            />
          </label>

          <label>
            Métrica real del sistema
            <select name="metrica" value={form.metrica} onChange={cambiarCampo}>
              {Object.keys(metricasDisponibles).map((metrica) => (
                <option key={metrica} value={metrica}>
                  {nombresMetricas[metrica] || metrica}
                </option>
              ))}
            </select>
          </label>

          <label>
            Tipo de meta
            <select
              name="tipoMeta"
              value={form.tipoMeta}
              onChange={cambiarCampo}
            >
              <option value="mayor_igual">Mayor o igual a la meta</option>
              <option value="menor_igual">Menor o igual a la meta</option>
            </select>
          </label>

          <label>
            Meta
            <input
              type="number"
              name="meta"
              value={form.meta}
              onChange={cambiarCampo}
              placeholder="Ej: 100000"
            />
          </label>

          <label>
            Descripción
            <input
              type="text"
              name="descripcion"
              value={form.descripcion}
              onChange={cambiarCampo}
              placeholder="¿Qué busca medir esta meta?"
            />
          </label>

          <button type="submit">Agregar indicador</button>
          <button type="button" onClick={restaurarIndicadores}>
            Restaurar iniciales
          </button>
        </form>
      </section>

      {perspectivas.map((perspectiva) => {
        const indicadoresPerspectiva = indicadoresCalculados.filter(
          (item) => item.perspectiva === perspectiva
        )

        return (
          <section className="card cmi-section" key={perspectiva}>
            <h2>{perspectiva}</h2>

            {indicadoresPerspectiva.length === 0 ? (
              <p>No hay indicadores configurados para esta perspectiva.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Indicador</th>
                    <th>Métrica real</th>
                    <th>Resultado</th>
                    <th>Meta</th>
                    <th>Avance</th>
                    <th>Estado</th>
                    <th>Análisis automático</th>
                    <th>Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {indicadoresPerspectiva.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.nombre}</strong>
                        <br />
                        <small>{item.descripcion}</small>
                      </td>

                      <td>{nombresMetricas[item.metrica] || item.metrica}</td>

                      <td>{formatoResultado(item.metrica, item.resultado)}</td>

                      <td>{formatoResultado(item.metrica, item.meta)}</td>

                      <td>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${item.avance}%` }}
                          />
                        </div>
                        <small>{item.avance}%</small>
                      </td>

                      <td>
                        <span className={obtenerClaseEstado(item.estado)}>
                          {item.estado}
                        </span>
                      </td>

                      <td>{item.analisis}</td>

                      <td>
                        <button
                          type="button"
                          onClick={() => eliminarIndicador(item.id)}
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
        )
      })}

      <section className="card">
        <h2>Interpretación estratégica</h2>
        <p>
          El Cuadro de Mando Integral convierte datos operativos del CRM,
          ventas, inventario, Odoo, Data Warehouse e inteligencia predictiva en
          indicadores estratégicos para gerencia.
        </p>

        <p>
          Además, el asistente IA local con Ollama permite consultar el estado
          del sistema en lenguaje natural y obtener recomendaciones gerenciales
          sin depender de servicios externos de pago.
        </p>
      </section>
    </div>
  )
}