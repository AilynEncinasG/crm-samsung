import { useEffect, useMemo, useState } from 'react'

const USUARIOS_URL = 'http://localhost:8000/api/usuarios/'
const ROLES_URL = 'http://localhost:8000/api/roles/'
const AUDITORIA_URL = 'http://localhost:8000/api/auditoria/'

export default function SeguridadAuditoria() {
  const [usuarios, setUsuarios] = useState([])
  const [roles, setRoles] = useState([])
  const [auditoria, setAuditoria] = useState([])
  const [loading, setLoading] = useState(true)

  const [filtroAccion, setFiltroAccion] = useState('')
  const [filtroUsuario, setFiltroUsuario] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [detalleSeleccionado, setDetalleSeleccionado] = useState(null)

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      setLoading(true)

      const [usuariosRes, rolesRes, auditoriaRes] = await Promise.all([
        fetch(USUARIOS_URL),
        fetch(ROLES_URL),
        fetch(AUDITORIA_URL),
      ])

      if (!usuariosRes.ok) throw new Error('Error al cargar usuarios')
      if (!rolesRes.ok) throw new Error('Error al cargar roles')
      if (!auditoriaRes.ok) throw new Error('Error al cargar auditoría')

      const usuariosData = await usuariosRes.json()
      const rolesData = await rolesRes.json()
      const auditoriaData = await auditoriaRes.json()

      setUsuarios(usuariosData.results || usuariosData)
      setRoles(rolesData.results || rolesData)
      setAuditoria(auditoriaData.results || auditoriaData)
    } catch (error) {
      console.error(error)
      alert('No se pudieron cargar los datos de seguridad')
    } finally {
      setLoading(false)
    }
  }

  const obtenerNombreRol = (rolId) => {
    const rol = roles.find((item) => String(item.id) === String(rolId))
    return rol ? rol.nombre_rol : rolId || 'Sin rol'
  }

  const formatearFecha = (fecha) => {
    if (!fecha) return 'Sin fecha'

    const fechaObj = new Date(fecha)

    if (Number.isNaN(fechaObj.getTime())) {
      return fecha
    }

    return fechaObj.toLocaleString('es-BO', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  const obtenerClaseAccion = (accion) => {
    if (accion === 'REGISTRO_VENTA') return 'badge success'
    if (accion === 'REGISTRO_COMPRA') return 'badge success'
    if (accion === 'FACTURACION_ODOO') return 'badge warning'
    if (accion === 'CAMBIO_PRECIO') return 'badge neutral'
    return 'badge'
  }

  const obtenerTextoAccion = (accion) => {
    const textos = {
      REGISTRO_VENTA: 'Venta registrada',
      REGISTRO_COMPRA: 'Compra registrada',
      FACTURACION_ODOO: 'Factura Odoo',
      CAMBIO_PRECIO: 'Cambio de precio',
    }

    return textos[accion] || accion || 'Sin acción'
  }

  const accionesDisponibles = useMemo(() => {
    return [...new Set(auditoria.map((item) => item.accion).filter(Boolean))]
  }, [auditoria])

  const usuariosAuditoria = useMemo(() => {
    return [
      ...new Set(
        auditoria
          .map((item) => item.usuario_nombre || item.usuario)
          .filter(Boolean)
      ),
    ]
  }, [auditoria])

  const auditoriaOrdenada = useMemo(() => {
    return [...auditoria].sort(
      (a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0)
    )
  }, [auditoria])

  const auditoriaFiltrada = useMemo(() => {
    return auditoriaOrdenada.filter((item) => {
      const texto = `${item.accion || ''} ${item.tabla_afectada || ''} ${
        item.usuario_nombre || item.usuario || ''
      } ${item.registro_id || ''}`.toLowerCase()

      const coincideBusqueda = texto.includes(busqueda.toLowerCase())
      const coincideAccion = filtroAccion ? item.accion === filtroAccion : true
      const coincideUsuario = filtroUsuario
        ? String(item.usuario_nombre || item.usuario) === String(filtroUsuario)
        : true

      return coincideBusqueda && coincideAccion && coincideUsuario
    })
  }, [auditoriaOrdenada, busqueda, filtroAccion, filtroUsuario])

  const totalVentas = auditoria.filter(
    (item) => item.accion === 'REGISTRO_VENTA'
  ).length

  const totalCompras = auditoria.filter(
    (item) => item.accion === 'REGISTRO_COMPRA'
  ).length

  const totalFacturas = auditoria.filter(
    (item) => item.accion === 'FACTURACION_ODOO'
  ).length

  const totalCambiosPrecio = auditoria.filter(
    (item) => item.accion === 'CAMBIO_PRECIO'
  ).length

  const usuariosActivos = usuarios.filter((usuario) => usuario.activo).length

  const limpiarFiltros = () => {
    setFiltroAccion('')
    setFiltroUsuario('')
    setBusqueda('')
  }

  const mostrarValor = (valor) => {
    if (!valor) return 'Sin datos'

    try {
      const parsed = JSON.parse(valor)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return valor
    }
  }

  if (loading) {
    return <p>Cargando seguridad y auditoría...</p>
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Seguridad y Auditoría</h1>
          <p>
            Control de usuarios, roles y trazabilidad de acciones críticas
            realizadas dentro del sistema.
          </p>
        </div>

        <button type="button" onClick={cargarDatos}>
          Actualizar
        </button>
      </div>

      <div className="grid-cards">
        <div className="card">
          <h3>Usuarios registrados</h3>
          <p>{usuarios.length}</p>
        </div>

        <div className="card">
          <h3>Usuarios activos</h3>
          <p>{usuariosActivos}</p>
        </div>

        <div className="card">
          <h3>Roles del sistema</h3>
          <p>{roles.length}</p>
        </div>

        <div className="card">
          <h3>Eventos auditados</h3>
          <p>{auditoria.length}</p>
        </div>
      </div>

      <section className="kpi-grid">
        <div className="kpi-card">
          <span>Ventas auditadas</span>
          <strong>{totalVentas}</strong>
        </div>

        <div className="kpi-card">
          <span>Compras auditadas</span>
          <strong>{totalCompras}</strong>
        </div>

        <div className="kpi-card">
          <span>Facturas Odoo</span>
          <strong>{totalFacturas}</strong>
        </div>

        <div className="kpi-card">
          <span>Cambios de precio</span>
          <strong>{totalCambiosPrecio}</strong>
        </div>
      </section>

      <section className="card">
        <h2>Usuarios del sistema</h2>

        {usuarios.length === 0 ? (
          <p>No existen usuarios registrados.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Usuario</th>
                <th>Empleado</th>
                <th>Rol</th>
                <th>Almacén asignado</th>
                <th>Último acceso</th>
                <th>Estado</th>
              </tr>
            </thead>

            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td>{usuario.id}</td>
                  <td>{usuario.username}</td>
                  <td>{usuario.empleado_nombre || usuario.empleado || '-'}</td>
                  <td>{usuario.rol_nombre || obtenerNombreRol(usuario.rol)}</td>
                  <td>
                    {usuario.almacen_nombre ||
                      usuario.almacen_asignado ||
                      'Sin almacén'}
                  </td>
                  <td>
                    {usuario.ultimo_acceso
                      ? formatearFecha(usuario.ultimo_acceso)
                      : 'Sin fecha'}
                  </td>
                  <td>
                    <span className={usuario.activo ? 'badge success' : 'badge danger'}>
                      {usuario.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2>Roles registrados</h2>

        {roles.length === 0 ? (
          <p>No existen roles registrados.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre del rol</th>
                <th>Descripción funcional</th>
              </tr>
            </thead>

            <tbody>
              {roles.map((rol) => (
                <tr key={rol.id}>
                  <td>{rol.id}</td>
                  <td>{rol.nombre_rol}</td>
                  <td>
                    {rol.nombre_rol === 'Administrador' &&
                      'Acceso completo al sistema, seguridad y auditoría.'}
                    {rol.nombre_rol === 'Vendedor' &&
                      'Gestión comercial, clientes, pedidos y facturación.'}
                    {rol.nombre_rol === 'Encargado Inventario' &&
                      'Gestión de productos, almacenes, compras e inventario.'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2>Auditoría de acciones</h2>

        <div className="form-grid">
          <label>
            Buscar
            <input
              type="text"
              placeholder="Buscar por acción, tabla, usuario o registro"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </label>

          <label>
            Filtrar por acción
            <select
              value={filtroAccion}
              onChange={(e) => setFiltroAccion(e.target.value)}
            >
              <option value="">Todas las acciones</option>
              {accionesDisponibles.map((accion) => (
                <option key={accion} value={accion}>
                  {obtenerTextoAccion(accion)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Filtrar por usuario
            <select
              value={filtroUsuario}
              onChange={(e) => setFiltroUsuario(e.target.value)}
            >
              <option value="">Todos los usuarios</option>
              {usuariosAuditoria.map((usuario) => (
                <option key={usuario} value={usuario}>
                  {usuario}
                </option>
              ))}
            </select>
          </label>

          <button type="button" onClick={limpiarFiltros}>
            Limpiar filtros
          </button>
        </div>

        <p>
          Mostrando <strong>{auditoriaFiltrada.length}</strong> de{' '}
          <strong>{auditoria.length}</strong> registros.
        </p>

        {auditoriaFiltrada.length === 0 ? (
          <p>No existen acciones registradas con los filtros seleccionados.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Usuario</th>
                <th>Acción</th>
                <th>Tabla afectada</th>
                <th>Registro</th>
                <th>IP / Equipo</th>
                <th>Fecha</th>
                <th>Detalle</th>
              </tr>
            </thead>

            <tbody>
              {auditoriaFiltrada.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.usuario_nombre || item.usuario || 'Sistema'}</td>
                  <td>
                    <span className={obtenerClaseAccion(item.accion)}>
                      {obtenerTextoAccion(item.accion)}
                    </span>
                  </td>
                  <td>{item.tabla_afectada || 'Sin tabla'}</td>
                  <td>{item.registro_id || '-'}</td>
                  <td>{item.ip_maquina || '-'}</td>
                  <td>{formatearFecha(item.fecha)}</td>
                  <td>
                    <button type="button" onClick={() => setDetalleSeleccionado(item)}>
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {detalleSeleccionado && (
        <section className="card">
          <div className="page-header">
            <div>
              <h2>Detalle de auditoría #{detalleSeleccionado.id}</h2>
              <p>
                Acción realizada por{' '}
                <strong>
                  {detalleSeleccionado.usuario_nombre ||
                    detalleSeleccionado.usuario ||
                    'Sistema'}
                </strong>
              </p>
            </div>

            <button type="button" onClick={() => setDetalleSeleccionado(null)}>
              Cerrar detalle
            </button>
          </div>

          <table>
            <tbody>
              <tr>
                <th>Acción</th>
                <td>{obtenerTextoAccion(detalleSeleccionado.accion)}</td>
              </tr>
              <tr>
                <th>Tabla afectada</th>
                <td>{detalleSeleccionado.tabla_afectada || '-'}</td>
              </tr>
              <tr>
                <th>Registro relacionado</th>
                <td>{detalleSeleccionado.registro_id || '-'}</td>
              </tr>
              <tr>
                <th>Equipo/IP</th>
                <td>{detalleSeleccionado.ip_maquina || '-'}</td>
              </tr>
              <tr>
                <th>Fecha</th>
                <td>{formatearFecha(detalleSeleccionado.fecha)}</td>
              </tr>
            </tbody>
          </table>

          <h3>Valor anterior</h3>
          <pre>{mostrarValor(detalleSeleccionado.valor_anterior)}</pre>

          <h3>Valor nuevo</h3>
          <pre>{mostrarValor(detalleSeleccionado.valor_nuevo)}</pre>
        </section>
      )}

      <section className="card">
        <h2>Interpretación de seguridad</h2>
        <p>
          Este módulo permite verificar qué usuario realizó una operación, sobre
          qué entidad del sistema, en qué momento y con qué datos. Esto fortalece
          la trazabilidad de ventas, compras, facturación, productos y cambios
          relevantes dentro del sistema.
        </p>
      </section>
    </div>
  )
}