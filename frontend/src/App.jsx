import { NavLink, Route, Routes, useNavigate } from 'react-router-dom'

import Dashboard from './pages/Dashboard.jsx'
import Clientes from './pages/Clientes.jsx'
import Productos from './pages/Productos.jsx'
import Inventario from './pages/Inventario.jsx'
import Ventas from './pages/Ventas.jsx'
import Compras from './pages/Compras.jsx'
import Proveedores from './pages/Proveedores.jsx'
import Repartidores from './pages/Repartidores.jsx'
import ReportesDW from './pages/ReportesDW.jsx'
import IntegracionOdoo from './pages/IntegracionOdoo.jsx'
import InteligenciaPredictiva from './pages/InteligenciaPredictiva.jsx'
import Almacenes from './pages/Almacenes.jsx'
import CuadroMandoIntegral from './pages/CuadroMandoIntegral.jsx'
import SeguridadAuditoria from './pages/SeguridadAuditoria.jsx'
import Login from './pages/Login.jsx'
import NoAutorizado from './pages/NoAutorizado.jsx'

import ProtectedRoute from './components/ProtectedRoute.jsx'
import RoleRoute from './components/RoleRoute.jsx'

export default function App() {
  const navigate = useNavigate()
  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null')
  const rol = usuario?.rol_nombre

  const ROLES = {
    TODOS: ['Administrador', 'Vendedor', 'Encargado Inventario'],
    ADMIN: ['Administrador'],
    VENTAS: ['Administrador', 'Vendedor'],
    INVENTARIO: ['Administrador', 'Encargado Inventario'],
    GERENCIAL: ['Administrador', 'Encargado Inventario'],
  }

  const puedeVer = (rolesPermitidos) => {
    if (!rol) return false
    return rolesPermitidos.includes(rol)
  }

  const cerrarSesion = () => {
    localStorage.removeItem('usuario')
    navigate('/login')
  }

  const menu = [
    {
      grupo: 'Panel Ejecutivo',
      items: [
        {
          nombre: 'Panel Principal',
          descripcion: 'Vista general del sistema',
          ruta: '/',
          icono: '🏠',
          roles: ROLES.TODOS,
        },
        {
          nombre: 'Cuadro de Mando Integral',
          descripcion: 'Indicadores estratégicos',
          ruta: '/cuadro-mando-integral',
          icono: '🎯',
          roles: ROLES.GERENCIAL,
        },
        {
          nombre: 'Reportes Data Warehouse',
          descripcion: 'Análisis histórico y gerencial',
          ruta: '/reportes-dw',
          icono: '📊',
          roles: ROLES.GERENCIAL,
        },
        {
          nombre: 'Inteligencia Predictiva',
          descripcion: 'Demanda, riesgo y reposición',
          ruta: '/inteligencia-predictiva',
          icono: '🤖',
          roles: ROLES.GERENCIAL,
        },
      ],
    },
    {
      grupo: 'Gestión Comercial CRM',
      items: [
        {
          nombre: 'Clientes',
          descripcion: 'Segmentación y relación comercial',
          ruta: '/clientes',
          icono: '👥',
          roles: ROLES.VENTAS,
        },
        {
          nombre: 'Ventas y Pedidos',
          descripcion: 'Registro comercial',
          ruta: '/ventas',
          icono: '🧾',
          roles: ROLES.VENTAS,
        },
        {
          nombre: 'Repartidores',
          descripcion: 'Logística de entrega',
          ruta: '/repartidores',
          icono: '🚚',
          roles: ROLES.VENTAS,
        },
        {
          nombre: 'Integración Odoo',
          descripcion: 'Facturación empresarial',
          ruta: '/integracion-odoo',
          icono: '🔗',
          roles: ROLES.VENTAS,
        },
      ],
    },
    {
      grupo: 'Inventario y Abastecimiento',
      items: [
        {
          nombre: 'Productos',
          descripcion: 'Catálogo comercial',
          ruta: '/productos',
          icono: '📱',
          roles: ROLES.INVENTARIO,
        },
        {
          nombre: 'Inventario',
          descripcion: 'Stock y movimientos',
          ruta: '/inventario',
          icono: '📦',
          roles: ROLES.INVENTARIO,
        },
        {
          nombre: 'Almacenes',
          descripcion: 'Ubicación y disponibilidad',
          ruta: '/almacenes',
          icono: '🏬',
          roles: ROLES.INVENTARIO,
        },
        {
          nombre: 'Compras',
          descripcion: 'Abastecimiento y lotes',
          ruta: '/compras',
          icono: '🛒',
          roles: ROLES.INVENTARIO,
        },
        {
          nombre: 'Proveedores',
          descripcion: 'Red de suministro',
          ruta: '/proveedores',
          icono: '🤝',
          roles: ROLES.INVENTARIO,
        },
      ],
    },
    {
      grupo: 'Control y Seguridad',
      items: [
        {
          nombre: 'Seguridad y Auditoría',
          descripcion: 'Roles, trazabilidad y accesos',
          ruta: '/seguridad-auditoria',
          icono: '🛡️',
          roles: ROLES.ADMIN,
        },
      ],
    },
  ]

  const itemClass = ({ isActive }) =>
    isActive ? 'sidebar-link active' : 'sidebar-link'

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <div className="app-shell">
              <aside className="sidebar-pro">
                <div className="sidebar-brand">
                  <div className="brand-icon">S</div>

                  <div>
                    <h2>Samsung CRM</h2>
                    <span>Sistema Estratégico</span>
                  </div>
                </div>

                {usuario && (
                  <div className="sidebar-user">
                    <div className="user-avatar">
                      {(usuario.empleado_nombre || usuario.username || 'U')
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="user-info">
                      <strong>{usuario.empleado_nombre || usuario.username}</strong>
                      <span>{usuario.rol_nombre}</span>
                      <small>{usuario.almacen_nombre || 'Sin almacén asignado'}</small>
                    </div>
                  </div>
                )}

                <nav className="sidebar-menu">
                  {menu.map((grupo) => {
                    const itemsVisibles = grupo.items.filter((item) =>
                      puedeVer(item.roles)
                    )

                    if (itemsVisibles.length === 0) return null

                    return (
                      <div className="sidebar-group" key={grupo.grupo}>
                        <p>{grupo.grupo}</p>

                        {itemsVisibles.map((item) => (
                          <NavLink
                            key={item.ruta}
                            to={item.ruta}
                            end={item.ruta === '/'}
                            className={itemClass}
                          >
                            <span className="link-icon">{item.icono}</span>

                            <span className="link-text">
                              <strong>{item.nombre}</strong>
                              <small>{item.descripcion}</small>
                            </span>
                          </NavLink>
                        ))}
                      </div>
                    )
                  })}
                </nav>

                <div className="sidebar-footer">
                  <div className="system-status">
                    <span className="status-dot"></span>
                    Sistema activo
                  </div>

                  <button type="button" onClick={cerrarSesion}>
                    Cerrar sesión
                  </button>
                </div>
              </aside>

              <main className="main-panel">
                <Routes>
                  <Route path="/" element={<Dashboard />} />

                  <Route
                    path="/clientes"
                    element={
                      <RoleRoute rolesPermitidos={ROLES.VENTAS}>
                        <Clientes />
                      </RoleRoute>
                    }
                  />

                  <Route
                    path="/productos"
                    element={
                      <RoleRoute rolesPermitidos={ROLES.INVENTARIO}>
                        <Productos />
                      </RoleRoute>
                    }
                  />

                  <Route
                    path="/inventario"
                    element={
                      <RoleRoute rolesPermitidos={ROLES.INVENTARIO}>
                        <Inventario />
                      </RoleRoute>
                    }
                  />

                  <Route
                    path="/almacenes"
                    element={
                      <RoleRoute rolesPermitidos={ROLES.INVENTARIO}>
                        <Almacenes />
                      </RoleRoute>
                    }
                  />

                  <Route
                    path="/ventas"
                    element={
                      <RoleRoute rolesPermitidos={ROLES.VENTAS}>
                        <Ventas />
                      </RoleRoute>
                    }
                  />

                  <Route
                    path="/compras"
                    element={
                      <RoleRoute rolesPermitidos={ROLES.INVENTARIO}>
                        <Compras />
                      </RoleRoute>
                    }
                  />

                  <Route
                    path="/proveedores"
                    element={
                      <RoleRoute rolesPermitidos={ROLES.INVENTARIO}>
                        <Proveedores />
                      </RoleRoute>
                    }
                  />

                  <Route
                    path="/repartidores"
                    element={
                      <RoleRoute rolesPermitidos={ROLES.VENTAS}>
                        <Repartidores />
                      </RoleRoute>
                    }
                  />

                  <Route
                    path="/reportes-dw"
                    element={
                      <RoleRoute rolesPermitidos={ROLES.GERENCIAL}>
                        <ReportesDW />
                      </RoleRoute>
                    }
                  />

                  <Route
                    path="/cuadro-mando-integral"
                    element={
                      <RoleRoute rolesPermitidos={ROLES.GERENCIAL}>
                        <CuadroMandoIntegral />
                      </RoleRoute>
                    }
                  />

                  <Route
                    path="/integracion-odoo"
                    element={
                      <RoleRoute rolesPermitidos={ROLES.VENTAS}>
                        <IntegracionOdoo />
                      </RoleRoute>
                    }
                  />

                  <Route
                    path="/inteligencia-predictiva"
                    element={
                      <RoleRoute rolesPermitidos={ROLES.GERENCIAL}>
                        <InteligenciaPredictiva />
                      </RoleRoute>
                    }
                  />

                  <Route
                    path="/seguridad-auditoria"
                    element={
                      <RoleRoute rolesPermitidos={ROLES.ADMIN}>
                        <SeguridadAuditoria />
                      </RoleRoute>
                    }
                  />

                  <Route path="/no-autorizado" element={<NoAutorizado />} />
                </Routes>
              </main>
            </div>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}