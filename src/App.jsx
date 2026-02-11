import React, { useState, useEffect } from 'react';

function App() {
  const [stats, setStats] = useState({ cpu: 0, ram: 0, disk: 0, status: 'good' });
  const [cleaning, setCleaning] = useState(false);
  const [report, setReport] = useState(null);
  const [aiResponse, setAiResponse] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      const s = await window.electronAPI.getSystemStats();
      setStats(s);
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleOptimize = async () => {
    setCleaning(true);
    setAiResponse('Analizando con IA...');
    
    // 1. Run Cleanup
    const cleanupStats = await window.electronAPI.runCleanup();
    
    // 2. Ask AI
    const aiResult = await window.electronAPI.askAI({
        systemStats: stats,
        cleanupStats: cleanupStats
    });

    setReport(cleanupStats);
    
    // Extract message from Grok/OpenAI format
    const message = aiResult.choices?.[0]?.message?.content || "Análisis completado.";
    setAiResponse(message);
    
    setCleaning(false);
  };

  const getStatusColor = () => {
    if (stats.status === 'critical') return '#ff4444';
    if (stats.status === 'warning') return '#ffbb33';
    return '#00C851';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Title Bar */}
      <div className="title-bar">
        <button className="control-btn" onClick={() => window.electronAPI.minimize()}>_</button>
        <button className="control-btn" onClick={() => window.electronAPI.close()}>X</button>
      </div>

      {/* Main Content */}
      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h1 style={{ marginBottom: '30px' }}>CleanMate AI</h1>
        
        {/* Status Circle */}
        <div style={{ 
            width: '150px', 
            height: '150px', 
            borderRadius: '50%', 
            border: `5px solid ${getStatusColor()}`,
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            marginBottom: '30px',
            boxShadow: `0 0 20px ${getStatusColor()}`
        }}>
            <h2 style={{ fontSize: '24px' }}>{stats.status.toUpperCase()}</h2>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', width: '100%', marginBottom: '30px' }}>
            <StatCard label="CPU" value={`${stats.cpu}%`} />
            <StatCard label="RAM" value={`${stats.ram}%`} />
            <StatCard label="DISK" value={`${stats.disk}%`} />
        </div>

        {/* Action Button */}
        <button 
            onClick={handleOptimize} 
            disabled={cleaning}
            style={{
                background: cleaning ? '#333' : '#007bff',
                color: 'white',
                border: 'none',
                padding: '15px 40px',
                borderRadius: '30px',
                fontSize: '18px',
                cursor: cleaning ? 'wait' : 'pointer',
                transition: 'transform 0.2s',
                transform: cleaning ? 'scale(0.95)' : 'scale(1)'
            }}
        >
            {cleaning ? 'Optimizando...' : 'Optimizar Ahora'}
        </button>

        {/* AI Report Area */}
        {report && (
            <div style={{ marginTop: '20px', width: '100%', background: '#222', padding: '15px', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span>Liberado: <b>{report.freedMB} MB</b></span>
                    <span>Archivos: <b>{report.filesDeleted}</b></span>
                </div>
                <div style={{ borderTop: '1px solid #444', paddingTop: '10px', fontSize: '14px', lineHeight: '1.4', color: '#ccc' }}>
                    <strong>🤖 CleanMate AI dice:</strong>
                    <p>{aiResponse}</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
    return (
        <div style={{ background: '#222', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#888' }}>{label}</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{value}</div>
        </div>
    );
}

export default App;
