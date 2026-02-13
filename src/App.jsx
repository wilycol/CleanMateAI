import React, { useState, useEffect } from 'react';
import AIChat from './AIChat';

const ReportItem = ({ report }) => {
    const [expanded, setExpanded] = useState(false);
    const errors = report.stats?.errors || [];
    const hasErrors = errors.length > 0;

    return (
        <div style={{ background: '#333', padding: '10px', borderRadius: '5px', marginBottom: '10px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ color: '#00C851', fontWeight: 'bold' }}>Limpieza</span>
                <span style={{ color: '#888' }}>{new Date(report.timestamp).toLocaleString()}</span>
            </div>
            <div style={{ color: '#ccc' }}>
                <div>Liberado: {report.stats?.freedMB || 0} MB</div>
                <div>Archivos: {report.stats?.filesDeleted || 0}</div>
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

  useEffect(() => {
    const fetchStats = async () => {
      const s = await window.electronAPI.getSystemStats();
      setStats(s);
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleReports = async () => {
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
    setPhase('analyzing');
    
    // Listen for progress during analysis too
    window.electronAPI.onProgress((data) => {
        setProgress(data);
    });

    try {
        const result = await window.electronAPI.analyzeSystem();
        setAnalysis(result);
        setPhase('confirmation');
    } catch (e) {
        console.error("Analysis failed", e);
        setPhase('idle');
    } finally {
        window.electronAPI.removeProgressListeners();
    }
  };

  const handleStartOptimization = async () => {
    setPhase('cleaning');
    
    // Listen for progress
    window.electronAPI.onProgress((data) => {
        setProgress(data);
    });

    try {
        const startTime = Date.now();
        const cleanupResult = await window.electronAPI.runCleanup();
        const endTime = Date.now();
        
        // Remove listeners
        window.electronAPI.removeProgressListeners();

        setReport({
            ...cleanupResult,
            duration: ((endTime - startTime) / 1000).toFixed(2)
        });
        setPhase('complete');
        
        // Ask AI in background
        setAiResponse('Generando reporte inteligente...');
        const aiResult = await window.electronAPI.askAI({
            systemStats: stats,
            cleanupStats: cleanupResult
        });
        const message = aiResult.choices?.[0]?.message?.content || "Optimización completada con éxito.";
        setAiResponse(message);

    } catch (error) {
        console.error("Optimization failed", error);
        setPhase('idle'); // or error state
    }
  };

  const handleChatActionStart = (action) => {
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#1a1a1a', color: 'white', fontFamily: 'Segoe UI, sans-serif' }}>
      {/* Title Bar */}
      <div className="title-bar" style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px', WebkitAppRegion: 'drag' }}>
        <button onClick={toggleReports} style={{ background: 'none', border: 'none', color: showReports ? '#00C851' : '#888', cursor: 'pointer', WebkitAppRegion: 'no-drag', fontSize: '16px', marginRight: '10px' }} title="Historial de Reportes">
            🕒
        </button>
        <button onClick={() => setIsChatOpen(!isChatOpen)} style={{ background: 'none', border: 'none', color: isChatOpen ? '#00C851' : '#888', cursor: 'pointer', WebkitAppRegion: 'no-drag', fontSize: '16px', marginRight: '10px' }} title="Chat AI">
            🤖
        </button>
        <button onClick={() => window.electronAPI.minimize()} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', WebkitAppRegion: 'no-drag', fontSize: '16px' }}>_</button>
        <button onClick={() => window.electronAPI.close()} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', WebkitAppRegion: 'no-drag', marginLeft: '10px', fontSize: '16px' }}>X</button>
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

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', width: '100%', maxWidth: '400px', marginBottom: '30px' }}>
            <StatCard label="CPU" value={`${stats.cpu}%`} />
            <StatCard label="RAM" value={`${stats.ram}%`} />
            <StatCard label="DISK" value={`${stats.disk}%`} />
        </div>

        {/* Phase: IDLE */}
        {phase === 'idle' && (
            <button 
                onClick={handleAnalyze} 
                style={buttonStyle}
            >
                Analizar PC
            </button>
        )}

        {/* Phase: ANALYZING */}
        {phase === 'analyzing' && (
            <div style={{ textAlign: 'center', width: '100%', maxWidth: '400px' }}>
                <p style={{ marginBottom: '15px' }}>Escaneando sistema...</p>
                <div className="spinner" style={{ margin: '0 auto 20px auto' }}></div>
                
                {/* Progress Detail */}
                <div style={{ fontSize: '12px', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', background: '#222', padding: '8px', borderRadius: '4px' }}>
                    {progress.currentFile || 'Inicializando...'}
                </div>
            </div>
        )}

        {/* Phase: CONFIRMATION */}
        {phase === 'confirmation' && analysis && (
            <div style={cardStyle}>
                <h3>Análisis Completado</h3>
                <div style={{ margin: '15px 0', textAlign: 'left' }}>
                    <p>📦 Espacio recuperable: <b>{analysis.spaceRecoverableMB} MB</b></p>
                    <p>🚀 Mejora estimada: <b>{analysis.estimatedPerformanceGain}%</b></p>
                    <p>🗑️ Archivos a eliminar: <b>{analysis.fileCount}</b></p>
                    {analysis.readOnlyFiles.length > 0 && (
                        <p style={{ color: '#ffbb33' }}>⚠️ {analysis.readOnlyFiles.length} archivos de solo lectura detectados.</p>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button onClick={() => setPhase('idle')} style={{ ...buttonStyle, background: '#444' }}>Cancelar</button>
                    <button onClick={handleStartOptimization} style={buttonStyle}>Optimizar Ahora</button>
                </div>
            </div>
        )}

        {/* Phase: CLEANING */}
        {phase === 'cleaning' && (
            <div style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
                <p style={{ marginBottom: '10px' }}>Optimizando tu equipo...</p>
                
                {/* Progress Bar Container */}
                <div style={{ width: '100%', height: '10px', background: '#333', borderRadius: '5px', overflow: 'hidden', marginBottom: '10px' }}>
                    <div style={{ 
                        width: `${progress.percent}%`, 
                        height: '100%', 
                        background: 'linear-gradient(90deg, #00C851, #007bff)',
                        transition: 'width 0.3s ease' 
                    }}></div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888' }}>
                    <span>{progress.percent}%</span>
                    <span style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {progress.currentFile}
                    </span>
                </div>
            </div>
        )}

        {/* Phase: COMPLETE */}
        {phase === 'complete' && report && (
            <div style={cardStyle}>
                <h3 style={{ color: '#00C851' }}>¡Optimización Exitosa!</h3>
                <div style={{ margin: '15px 0', textAlign: 'left' }}>
                    <p>✅ Espacio liberado: <b>{report.freedMB} MB</b></p>
                    <p>⏱️ Tiempo total: <b>{report.duration}s</b></p>
                    <p>📂 Archivos eliminados: <b>{report.filesDeleted}</b></p>
                </div>
                
                <div style={{ background: '#2a2a2a', padding: '10px', borderRadius: '5px', fontSize: '13px', marginBottom: '15px' }}>
                    <strong>🤖 CleanMate AI:</strong>
                    <p style={{ marginTop: '5px', color: '#ccc' }}>{aiResponse}</p>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button onClick={downloadReport} style={{ ...buttonStyle, background: '#444', fontSize: '14px', padding: '10px 20px' }}>Descargar Reporte</button>
                    <button onClick={() => setPhase('idle')} style={{ ...buttonStyle, fontSize: '14px', padding: '10px 20px' }}>Finalizar</button>
                </div>
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
