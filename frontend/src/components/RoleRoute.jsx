import { Navigate } from 'react-router-dom'

export default function RoleRoute({ rolesPermitidos, children }) {
  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null')

  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  if (!rolesPermitidos.includes(usuario.rol_nombre)) {
    return <Navigate to="/no-autorizado" replace />
  }

  return children
}