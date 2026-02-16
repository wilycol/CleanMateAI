import React, { useState, useEffect } from 'react';
import AIChat from './AIChat';

const ReportItem = ({ report }) => {
    const [expanded, setExpanded] = useState(false);
    const errors = report.stats?.errors || [];
    const hasErrors = errors.length > 0;
    const typeLabel = report.type === 'analysis' ? 'Análisis' : 'Limpieza';
    const mainStatLabel = report.type === 'analysis' ? 'Espacio Detectado' : 'Espacio Liberado';
    const mainStatValue = report.type === 'analysis'
        ? (report.stats?.spaceRecoverableMB || 0)
        : (report.stats?.freedMB || 0);
    const filesLabel = report.type === 'analysis' ? 'Archivos Detectados' : 'Archivos Eliminados';
    const filesValue = report.type === 'analysis'
        ? (report.stats?.fileCount || 0)
        : (report.stats?.filesDeleted || 0);

    return (
        <div style={{ background: '#333', padding: '10px', borderRadius: '5px', marginBottom: '10px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ color: '#00C851', fontWeight: 'bold' }}>{typeLabel}</span>
                <span style={{ color: '#888' }}>{new Date(report.timestamp).toLocaleString()}</span>
            </div>
            <div style={{ color: '#ccc' }}>
                <div>{mainStatLabel}: {mainStatValue} MB</div>
                <div>{filesLabel}: {filesValue}</div>
                {hasErrors && (
                    <div style={{ marginTop: '5px' }}>
                        <button 
                            onClick={() => setExpanded(!expanded)}
                            style={{ 
                                background: 'none', 
                                border: 'none', 
                                color: '#ffbb33', 
                                cursor: 'pointer', 
                                padding: 0,
                                textDecoration: 'underline',
                                fontSize: '12px'
                            }}
                        >
                            {expanded ? 'Ocultar advertencias' : `Ver ${errors.length} advertencias`}
                        </button>
                    </div>
                )}
            </div>
            {expanded && hasErrors && (
                <div style={{ marginTop: '10px', maxHeight: '150px', overflowY: 'auto', background: '#222', padding: '5px', borderRadius: '3px' }}>
                    {errors.map((e, i) => (
                        <div key={i} style={{ color: '#ff4444', fontSize: '11px', marginBottom: '3px', borderBottom: '1px solid #444', paddingBottom: '2px' }}>
                            <div style={{ fontWeight: 'bold' }}>{e.error}</div>
                            <div style={{ color: '#888', wordBreak: 'break-all' }}>{e.path}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

function App() {
  const [stats, setStats] = useState({ cpu: 0, ram: 0, disk: 0, status: 'good' });
  const [phase, setPhase] = useState('idle'); // idle, analyzing, confirmation, cleaning, complete
  const [analysis, setAnalysis] = useState(null);
  const [progress, setProgress] = useState({ percent: 0, currentFile: '' });
  const [report, setReport] = useState(null);
  const [reportsHistory, setReportsHistory] = useState([]);
  const [showReports, setShowReports] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [appVersion, setAppVersion] = useState('');

  console.log("🔥 RENDERER ACTIVO - App.jsx cargado correctamente");

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) {
      console.warn("electronAPI no disponible; ejecutando en entorno web puro");
      setStats({ cpu: 0, ram: 0, disk: 0, status: 'good' });
      setAppVersion('dev');
      return;
    }

    const fetchStats = async () => {
      const s = await api.getSystemStats();
      setStats(s);
    };

    fetchStats();
    api.getAppVersion()
      .then((version) => setAppVersion(version))
      .catch((e) => console.error('Error obteniendo versión de la app', e));

    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleReports = async () => {
    if (!window.electronAPI) {
      setShowReports(!showReports);
      return;
    }
    if (!showReports) {
        try {
            const history = await window.electronAPI.getReports();
            setReportsHistory(history);
        } catch (e) {
            console.error("Error fetching reports", e);
        }
    }
    setShowReports(!showReports);
  };

  const handleAnalyze = async () => {
    if (!window.electronAPI) {
      console.warn("Acción de análisis no disponible fuera de Electron");
      return;
    }
    console.log("CleanMateAI | Iniciando análisis del sistema");
    setPhase('analyzing');
    
    window.electronAPI.onProgress((data) => {
        console.log("CleanMateAI | Progreso análisis", data);
        setProgress(data);
    });

    try {
        const result = await window.electronAPI.analyzeSystem();
        console.log("CleanMateAI | Análisis completado", result);
        setAnalysis(result);
        setPhase('confirmation');
    } catch (e) {
        console.error("CleanMateAI | Analysis failed", e);
        setPhase('idle');
    } finally {
        window.electronAPI.removeProgressListeners();
    }
  };

  const handleStartOptimization = async () => {
    if (!window.electronAPI) {
      console.warn("Acción de limpieza no disponible fuera de Electron");
      return;
    }
    console.log("CleanMateAI | Iniciando limpieza");
    setPhase('cleaning');
    
    window.electronAPI.onProgress((data) => {
        console.log("CleanMateAI | Progreso limpieza", data);
        setProgress(data);
    });

    try {
        const startTime = Date.now();
        const cleanupResult = await window.electronAPI.runCleanup();
        const endTime = Date.now();
        
        window.electronAPI.removeProgressListeners();

        const duration = ((endTime - startTime) / 1000).toFixed(2);
        console.log("CleanMateAI | Limpieza completada", { cleanupResult, duration });

        setReport({
            ...cleanupResult,
            duration
        });
        setPhase('complete');
        
        setAiResponse('Generando reporte inteligente...');
        const aiResult = await window.electronAPI.askAI({
            systemStats: stats,
            cleanupStats: cleanupResult
        });
        const message = aiResult.choices?.[0]?.message?.content || "Optimización completada con éxito.";
        console.log("CleanMateAI | Respuesta IA", aiResult);
        setAiResponse(message);
        try {
            const history = await window.electronAPI.getReports();
            setReportsHistory(history);
        } catch (e) {
            console.error("Error refreshing reports history", e);
        }
    } catch (error) {
        console.error("CleanMateAI | Optimization failed", error);
        setPhase('idle');
    }
  };

  const handleChatActionStart = (action) => {
      if (!window.electronAPI) return;
      if (action.type === 'analyze') {
          setPhase('analyzing');
      } else if (action.type === 'clean') {
          setPhase('cleaning');
          // We need to attach listeners here too if the action was triggered from chat
          window.electronAPI.onProgress((data) => {
            setProgress(data);
          });
      }
  };

  const handleChatActionComplete = (action, result) => {
      if (!window.electronAPI) return;
      if (action.type === 'analyze') {
          setAnalysis(result);
          setPhase('confirmation');
      } else if (action.type === 'clean') {
          // Remove listeners
          window.electronAPI.removeProgressListeners();
          
          setReport({
              ...result,
              duration: 'N/A' // Duration calculation might need adjustment here
          });
          setPhase('complete');
      }
  };

  const getStatusColor = () => {
    if (stats.status === 'critical') return '#ff4444';
    if (stats.status === 'warning') return '#ffbb33';
    return '#00C851';
  };

  const downloadReport = () => {
    const element = document.createElement("a");
    const file = new Blob([JSON.stringify({ report, analysis, aiResponse }, null, 2)], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "CleanMate_Report.json";
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
  };

  const renderConfirmation = () => (
    <div className="confirmation-view" style={cardStyle}>
       <h2 style={{marginBottom: '20px'}}>Análisis Completado</h2>
       
       <div className="summary-grid" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px'}}>
           <div style={{background: '#333', padding: '15px', borderRadius: '10px'}}>
               <div style={{color: '#888', fontSize: '12px'}}>Espacio a Liberar</div>
               <div style={{color: '#00C851', fontSize: '24px', fontWeight: 'bold'}}>{analysis?.spaceRecoverableMB || 0} MB</div>
           </div>
           <div style={{background: '#333', padding: '15px', borderRadius: '10px'}}>
               <div style={{color: '#888', fontSize: '12px'}}>Archivos Basura</div>
               <div style={{color: '#ffbb33', fontSize: '24px', fontWeight: 'bold'}}>{analysis?.fileCount || 0}</div>
           </div>
       </div>
       
       {analysis?.message && (
           <div className="ai-insight" style={{background: 'rgba(0, 200, 81, 0.1)', padding: '15px', borderRadius: '10px', marginBottom: '25px', textAlign: 'left', borderLeft: '3px solid #00C851'}}>
               <h4 style={{margin: '0 0 5px 0', fontSize: '14px', color: '#00C851'}}>🤖 Análisis IA</h4>
               <p style={{margin: 0, fontSize: '13px', color: '#ddd'}}>{analysis.message}</p>
           </div>
       )}

       <div className="actions" style={{display: 'flex', gap: '15px', justifyContent: 'center'}}>
           <button 
               onClick={() => setPhase('idle')}
               style={{...buttonStyle, background: 'transparent', border: '1px solid #666', boxShadow: 'none'}}
           >
               Cancelar
           </button>
           <button 
               onClick={handleStartOptimization}
               style={buttonStyle}
           >
               LIMPIAR AHORA
           </button>
       </div>
    </div>
  );

  console.log("App renderizando correctamente sin errores críticos");

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#1a1a1a', color: 'white', fontFamily: 'Segoe UI, sans-serif' }}>
      {/* Title Bar */}
      <div className="title-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', WebkitAppRegion: 'drag' }}>
        <div style={{ fontSize: '11px', color: '#888', WebkitAppRegion: 'no-drag' }}>
          CleanMate AI {appVersion ? `v${appVersion}` : ''}
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button onClick={toggleReports} style={{ background: 'none', border: 'none', color: showReports ? '#00C851' : '#888', cursor: 'pointer', WebkitAppRegion: 'no-drag', fontSize: '16px', marginRight: '10px' }} title="Historial de Reportes">
              🕒
          </button>
          <button onClick={() => setIsChatOpen(!isChatOpen)} style={{ background: 'none', border: 'none', color: isChatOpen ? '#00C851' : '#888', cursor: 'pointer', WebkitAppRegion: 'no-drag', fontSize: '16px', marginRight: '10px' }} title="Chat AI">
              🤖
          </button>
          <button onClick={() => window.electronAPI.minimize()} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', WebkitAppRegion: 'no-drag', fontSize: '16px' }}>_</button>
          <button onClick={() => window.electronAPI.close()} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', WebkitAppRegion: 'no-drag', marginLeft: '10px', fontSize: '16px' }}>X</button>
        </div>
      </div>

      <AIChat 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)}
        onActionTrigger={handleChatActionStart}
        onActionComplete={handleChatActionComplete}
      />

      {/* Reports History Modal */}
      {showReports && (
        <div style={{
            position: 'absolute',
            top: '40px',
            right: '20px',
            width: '300px',
            maxHeight: '400px',
            background: '#2a2a2a',
            borderRadius: '10px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
            zIndex: 1000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{ padding: '15px', borderBottom: '1px solid #444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '16px' }}>Historial de Reportes</h3>
                <button onClick={() => setShowReports(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', padding: '10px' }}>
                {reportsHistory.length === 0 ? (
                    <p style={{ color: '#888', textAlign: 'center', fontSize: '13px' }}>No hay reportes guardados.</p>
                ) : (
                    reportsHistory.map(r => (
                        <ReportItem key={r.id} report={r} />
                    ))
                )}
            </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto' }}>
        <h1 style={{ marginBottom: '20px', fontWeight: '300', letterSpacing: '1px' }}>CleanMate <span style={{ color: '#00C851', fontWeight: 'bold' }}>AI</span></h1>
        
        {/* Status Circle */}
        <div style={{ 
            width: '120px', 
            height: '120px', 
            borderRadius: '50%', 
            border: `4px solid ${getStatusColor()}`,
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            marginBottom: '30px',
            boxShadow: `0 0 15px ${getStatusColor()}40`
        }}>
            <h2 style={{ fontSize: '18px', margin: 0 }}>{stats.status.toUpperCase()}</h2>
        </div>

        {/* Floating Chat Button */}
        {!isChatOpen && (
            <button 
                onClick={() => setIsChatOpen(true)}
                style={{
                    position: 'absolute',
                    bottom: '20px',
                    right: '20px',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'linear-gradient(45deg, #00C851, #007bff)',
                    border: 'none',
                    color: 'white',
                    fontSize: '24px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                    zIndex: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                title="Hablar con CleanMate AI"
            >
                🤖
            </button>
        )}

      {phase === 'idle' && (
        <div className="dashboard">
          <div className="stats-grid">
            <div className="stat-card">
              <h3>CPU</h3>
              <div className="value">{stats.cpu}%</div>
              <div className="bar"><div style={{width: `${stats.cpu}%`}}></div></div>
            </div>
            <div className="stat-card">
              <h3>RAM</h3>
              <div className="value">{stats.ram}%</div>
              <div className="bar"><div style={{width: `${stats.ram}%`}}></div></div>
            </div>
            <div className="stat-card">
              <h3>DISCO</h3>
              <div className="value">{stats.disk}%</div>
              <div className="bar"><div style={{width: `${stats.disk}%`}}></div></div>
            </div>
          </div>

          <div className="action-area">
             <button className="btn-primary big-btn" onClick={handleAnalyze}>
                ANALIZAR SISTEMA
             </button>
             <div className="history-link">
                <button onClick={toggleReports} style={{background:'none', border:'none', color:'#888', cursor:'pointer', textDecoration:'underline'}}>
                    {showReports ? 'Ocultar Historial' : 'Ver Historial de Limpiezas'}
                </button>
             </div>
          </div>
          
          {showReports && (
              <div className="reports-history" style={{marginTop: '20px', maxHeight: '200px', overflowY: 'auto'}}>
                  {reportsHistory.map((r, i) => (
                      <ReportItem key={i} report={r} />
                  ))}
              </div>
          )}
        </div>
      )}

      {(phase === 'analyzing' || phase === 'cleaning') && (
        <div className="progress-view">
           <h2>{phase === 'analyzing' ? 'Analizando Sistema...' : 'Optimizando...'}</h2>
           <div className="progress-container">
              <div className="progress-bar" style={{width: `${progress.percent}%`}}></div>
           </div>
           <div className="progress-status">
               <span>{progress.status || (phase === 'analyzing' ? 'Escaneando archivos...' : 'Eliminando basura...')}</span>
               <span>{progress.percent}%</span>
           </div>
           <div style={{ fontSize: '12px', color: '#666', marginTop: '5px', height: '20px', overflow: 'hidden' }}>
               {progress.currentFile ? `Procesando: ${progress.currentFile.slice(-40)}` : 'Iniciando motor...'}
           </div>
        </div>
      )}

      {phase === 'confirmation' && renderConfirmation()}

      {phase === 'complete' && report && (
        <div className="complete-view">
           <div className="success-icon">✨</div>
           <h2>¡Optimización Completada!</h2>
           <div className="result-summary">
               <div className="result-item">
                   <span>Espacio Liberado</span>
                   <strong>{report.freedMB} MB</strong>
               </div>
               <div className="result-item">
                   <span>Archivos Eliminados</span>
                   <strong>{report.filesDeleted}</strong>
               </div>
           </div>
           
           <div style={{ marginTop: '20px' }}>
                <h4 style={{ fontSize: '14px', color: '#ccc', textAlign: 'left' }}>Categorías Afectadas:</h4>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
                    {Object.keys(analysis?.categories || {}).map(cat => (
                        <span key={cat} style={{ background: '#333', padding: '5px 10px', borderRadius: '15px', fontSize: '11px', color: '#00C851' }}>
                            ✓ {cat}
                        </span>
                    ))}
                </div>
           </div>

           <button className="btn-primary" onClick={() => setPhase('idle')}>Volver al Inicio</button>
        </div>
      )}

      </div>
    </div>
  );
}

const StatCard = ({ label, value }) => (
    <div style={{ background: '#2a2a2a', padding: '15px', borderRadius: '10px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: '12px', color: '#888', marginBottom: '5px' }}>{label}</div>
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#eee' }}>{value}</div>
    </div>
);

const buttonStyle = {
    background: 'linear-gradient(45deg, #007bff, #0056b3)',
    color: 'white',
    border: 'none',
    padding: '12px 30px',
    borderRadius: '25px',
    fontSize: '16px',
    cursor: 'pointer',
    fontWeight: 'bold',
    boxShadow: '0 4px 15px rgba(0,123,255,0.3)',
    transition: 'transform 0.2s',
};

const cardStyle = {
    background: '#2a2a2a', 
    padding: '25px', 
    borderRadius: '15px', 
    width: '100%', 
    maxWidth: '400px', 
    textAlign: 'center',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
    animation: 'fadeIn 0.5s ease'
};

export default App;
