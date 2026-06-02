import { useEffect, useState } from "react";

const API_URL = "http://localhost:8000/api/inteligencia-predictiva/";

function obtenerColorRiesgo(riesgo) {
  if (riesgo === "ALTO") return "#dc2626";
  if (riesgo === "MEDIO") return "#f59e0b";
  return "#16a34a";
}

function InteligenciaPredictiva() {
  const [resumen, setResumen] = useState(null);
  const [predicciones, setPredicciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargarPredicciones = async () => {
    try {
      setCargando(true);
      setError("");

      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error("No se pudo obtener la información predictiva.");
      }

      const data = await response.json();

      setResumen(data.resumen || {});
      setPredicciones(data.predicciones || []);
    } catch (err) {
      setError(err.message || "Error al cargar inteligencia predictiva.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPredicciones();
  }, []);

  if (cargando) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Inteligencia Predictiva</h1>
        <p>Cargando predicciones...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Inteligencia Predictiva</h1>
        <div style={styles.error}>{error}</div>
        <button style={styles.button} onClick={cargarPredicciones}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Inteligencia Predictiva</h1>
          <p style={styles.subtitle}>
            Predicción de demanda comercial e identificación de inventario crítico.
          </p>
        </div>

        <button style={styles.button} onClick={cargarPredicciones}>
          Actualizar
        </button>
      </div>

      {resumen && (
        <div style={styles.cards}>
          <div style={styles.card}>
            <span style={styles.cardLabel}>Productos analizados</span>
            <strong style={styles.cardValue}>{resumen.productos_analizados}</strong>
          </div>

          <div style={styles.card}>
            <span style={styles.cardLabel}>Productos críticos</span>
            <strong style={styles.cardValue}>{resumen.productos_criticos}</strong>
          </div>

          <div style={styles.card}>
            <span style={styles.cardLabel}>Demanda estimada total</span>
            <strong style={styles.cardValue}>{resumen.demanda_total_estimada}</strong>
          </div>

          <div style={styles.card}>
            <span style={styles.cardLabel}>Fecha de generación</span>
            <strong style={styles.cardDate}>{resumen.fecha_generacion}</strong>
          </div>
        </div>
      )}

      <div style={styles.methodBox}>
        <strong>Método aplicado: </strong>
        {resumen?.metodo}
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Producto</th>
              <th style={styles.th}>Stock actual</th>
              <th style={styles.th}>Demanda estimada</th>
              <th style={styles.th}>Riesgo</th>
              <th style={styles.th}>Tendencia</th>
              <th style={styles.th}>Reposición sugerida</th>
              <th style={styles.th}>Recomendación</th>
            </tr>
          </thead>

          <tbody>
            {predicciones.map((item) => (
              <tr key={item.producto_id}>
                <td style={styles.td}>{item.producto}</td>
                <td style={styles.td}>{item.stock_actual}</td>
                <td style={styles.td}>{item.demanda_estimada}</td>
                <td style={styles.td}>
                  <span
                    style={{
                      ...styles.badge,
                      backgroundColor: obtenerColorRiesgo(item.nivel_riesgo),
                    }}
                  >
                    {item.nivel_riesgo}
                  </span>
                </td>
                <td style={styles.td}>{item.tendencia}</td>
                <td style={styles.td}>{item.reposicion_sugerida}</td>
                <td style={styles.td}>{item.recomendacion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "24px",
    backgroundColor: "#f8fafc",
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "24px",
  },
  title: {
    margin: 0,
    fontSize: "30px",
    color: "#0f172a",
  },
  subtitle: {
    marginTop: "8px",
    color: "#64748b",
  },
  button: {
    backgroundColor: "#1428a0",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    padding: "10px 16px",
    cursor: "pointer",
    fontWeight: "600",
  },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginBottom: "20px",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "18px",
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.08)",
    border: "1px solid #e2e8f0",
  },
  cardLabel: {
    display: "block",
    color: "#64748b",
    fontSize: "14px",
    marginBottom: "8px",
  },
  cardValue: {
    fontSize: "32px",
    color: "#1428a0",
  },
  cardDate: {
    fontSize: "16px",
    color: "#1428a0",
  },
  methodBox: {
    backgroundColor: "#ffffff",
    border: "1px solid #dbeafe",
    borderRadius: "12px",
    padding: "14px",
    marginBottom: "20px",
    color: "#1e293b",
  },
  tableContainer: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.08)",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "14px",
    backgroundColor: "#1428a0",
    color: "#ffffff",
    fontSize: "14px",
  },
  td: {
    padding: "14px",
    borderBottom: "1px solid #e2e8f0",
    color: "#334155",
    fontSize: "14px",
  },
  badge: {
    color: "#ffffff",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "700",
  },
  error: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    padding: "14px",
    borderRadius: "10px",
    marginBottom: "16px",
  },
};

export default InteligenciaPredictiva;