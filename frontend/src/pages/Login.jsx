import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function Login() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    username: '',
    password: '',
  })

  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const cambiarCampo = (e) => {
    const { name, value } = e.target

    setForm((actual) => ({
      ...actual,
      [name]: value,
    }))
  }

  const iniciarSesion = async (e) => {
    e.preventDefault()
    setError('')
    setCargando(true)

    try {
      const res = await api.post('/login/', form)

      localStorage.setItem('usuario', JSON.stringify(res.data.usuario))

      navigate('/')
    } catch (err) {
      console.error(err)

      const detalle =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        'No se pudo iniciar sesión.'

      setError(detalle)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>CRM Samsung</h1>
        <p>Sistema de Información Estratégico</p>

        {error && <div className="alert error">{error}</div>}

        <form onSubmit={iniciarSesion}>
          <label>
            Usuario
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={cambiarCampo}
              placeholder="admin"
              required
            />
          </label>

          <label>
            Contraseña
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={cambiarCampo}
              placeholder="admin123"
              required
            />
          </label>

          <button type="submit" disabled={cargando}>
            {cargando ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  )
}