import React, { useState, useEffect } from 'react';
import AIChat from './AIChat';

function App() {
  const [stats, setStats] = useState({ cpu: 0, ram: 0, disk: 0, status: 'good' });
  const [phase, setPhase] = useState('idle'); // idle, analyzing, confirmation, cleaning, complete
  const [analysis, setAnalysis] = useState(null);
  const [progress, setProgress] = useState({ percent: 0, currentFile: '' });
  const [report, setReport] = useState(null);
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

  const handleAnalyze = async () => {
    setPhase('analyzing');
    const result = await window.electronAPI.analyzeSystem();
    setAnalysis(result);
    setPhase('confirmation');
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

  const handleChatAction = (action) => {
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
        <button onClick={() => setIsChatOpen(!isChatOpen)} style={{ background: 'none', border: 'none', color: isChatOpen ? '#00C851' : '#888', cursor: 'pointer', WebkitAppRegion: 'no-drag', fontSize: '16px', marginRight: '10px' }}>
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
            <div style={{ textAlign: 'center' }}>
                <p>Escaneando sistema...</p>
                <div className="spinner"></div>
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
