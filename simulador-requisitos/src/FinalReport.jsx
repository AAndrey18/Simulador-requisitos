import html2canvas from 'html2canvas';

export default function FinalReport({ reportData, onReturn, onGenerateERS, isLoading }) {
  const handleDownload = async () => {
    const element = document.getElementById('report-dashboard');
    const canvas = await html2canvas(element, { scale: 2 });
    const dataUrl = canvas.toDataURL('image/png');
    
    const link = document.createElement('a');
    link.download = 'Reporte_Simulacion.png';
    link.href = dataUrl;
    link.click();
  };

  if (!reportData) return null;

  return (
    <div className="app-container">
      <header className="app-header" style={{ borderBottom: 'none' }}>
        <div>
          <span style={{color: 'var(--c-dark)', fontWeight: 'bold'}}>Paso Final</span>
          <h1 className="app-main-title">Reporte de Simulación</h1>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {/* NUEVO BOTÓN PARA EL ERS */}
          <button 
            className="primary-btn" 
            onClick={onGenerateERS} 
            disabled={isLoading}
            style={{ backgroundColor: 'var(--c-darkest)' }}
          >
            {isLoading ? '⚙️ Redactando ERS...' : '📄 Generar ERS (IEEE 830)'}
          </button>

          <button className="primary-btn" onClick={handleDownload} style={{ backgroundColor: 'var(--c-dark)' }}>
            📸 Guardar Captura
          </button>
          
          <button className="primary-btn" onClick={onReturn} style={{ backgroundColor: 'var(--c-light)', color: 'var(--c-darkest)' }}>
            ✕ Menú
          </button>
        </div>
      </header>

      <div id="report-dashboard" style={{ padding: '10px', backgroundColor: 'var(--bg-main)' }}>
        
        {/* Apartado 1 */}
        <section className="report-section">
          <div className="section-title-wrapper">
            <h2>Evaluación de la Decisión</h2>
          </div>
          
          <div className="roles-vertical-list">
            {['sponsor', 'usuario', 'cliente'].map((role) => (
              <div key={role} className="card-widget hover-lift role-horizontal-card">
                <h3 className="role-title">Rol: {role.charAt(0).toUpperCase() + role.slice(1)}</h3>
                
                {/* 50/50 Pros y Contras */}
                <div className="pros-cons-grid">
                  <div className="box-pro">
                    <strong>Pros:</strong>
                    <ul className="report-list">
                      {reportData.evaluacion[role].pros.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </div>
                  <div className="box-con">
                    <strong>Contras:</strong>
                    <ul className="report-list">
                      {reportData.evaluacion[role].contras.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Apartado 2 */}
        <section className="report-section">
          <div className="section-title-wrapper">
            <h2>Conclusión del Escenario</h2>
          </div>
          <div className="card-widget hover-lift">
            <p>{reportData.conclusion}</p>
          </div>
        </section>

        {/* Apartado 3 (70/30) */}
        <section className="report-section">
          <div className="section-title-wrapper">
            <h2>Cierre de la Simulación</h2>
          </div>
          <div className="card-widget hover-lift split-30-70" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="box-30">
              <span style={{ fontSize: '3rem', fontWeight: '800', lineHeight: '1', color: 'var(--c-lightest)' }}>
                {reportData.cierre.porcentaje}
              </span>
              <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.8 }}>
                Éxito
              </span>
            </div>
            <div className="box-70" style={{ padding: '1.5rem' }}>
              <p>{reportData.cierre.resultado}</p>
            </div>
          </div>
        </section>

        {/* Apartado 4 */}
        <section className="report-section">
          <div className="section-title-wrapper">
            <h2>Resultados a 6 Meses</h2>
          </div>
          <div className="grid-3-cols">
            <div className="card-widget hover-lift">
              <h3 className="role-title">💰 Sponsor</h3>
              <p>{reportData.resultados6Meses.sponsor}</p>
            </div>
            <div className="card-widget hover-lift">
              <h3 className="role-title">🧑‍💻 Usuario</h3>
              <p>{reportData.resultados6Meses.usuario}</p>
            </div>
            <div className="card-widget hover-lift">
              <h3 className="role-title">🎯 Cliente</h3>
              <p>{reportData.resultados6Meses.cliente}</p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}