import { NavLink, Route, Routes } from 'react-router-dom'
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

export default function App() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>CRM Samsung</h2>
        <NavLink to="/">Dashboard</NavLink>
        <NavLink to="/clientes">Clientes</NavLink>
        <NavLink to="/productos">Productos</NavLink>
        <NavLink to="/inventario">Inventario</NavLink>
        <NavLink to="/ventas">Ventas</NavLink>
        <NavLink to="/compras">Compras</NavLink>
        <NavLink to="/proveedores">Proveedores</NavLink>
        <NavLink to="/repartidores">Repartidores</NavLink>
        <NavLink to="/reportes-dw">Reportes DW</NavLink>
        <NavLink to="/integracion-odoo">Integración Odoo</NavLink>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/productos" element={<Productos />} />
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/ventas" element={<Ventas />} />
          <Route path="/compras" element={<Compras />} />
          <Route path="/proveedores" element={<Proveedores />} />
          <Route path="/repartidores" element={<Repartidores />} />
          <Route path="/reportes-dw" element={<ReportesDW />} />
          <Route path="/integracion-odoo" element={<IntegracionOdoo />} />
        </Routes>
      </main>
    </div>
  )
}
