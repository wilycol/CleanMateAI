import React, { useState, useEffect, useRef } from 'react';

const AIChat = ({ isOpen, onClose, onActionTrigger }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [status, setStatus] = useState('idle'); // idle, thinking, recording
    const [mode, setMode] = useState('analysis'); // analysis, optimization, hardware
    const messagesEndRef = useRef(null);
    const recognitionRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            loadHistory();
        }
    }, [isOpen]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const loadHistory = async () => {
        const history = await window.electronAPI.chatGetHistory();
        setMessages(history);
        
        // Intelligent Greeting if history is empty
        if (history.length === 0) {
            setStatus('thinking');
            try {
                const greeting = await window.electronAPI.chatGetGreeting(mode);
                setMessages([{ role: 'assistant', message: greeting }]);
            } catch (e) {
                console.error("Failed to get greeting", e);
                setMessages([{ role: 'assistant', message: "Hola. ¿En qué puedo ayudarte hoy?" }]);
            } finally {
                setStatus('idle');
            }
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSendMessage = async (text, isAuto = false) => {
        if (!text.trim()) return;

        if (!isAuto) {
            const userMsg = { role: 'user', message: text, timestamp: new Date().toISOString() };
            setMessages(prev => [...prev, userMsg]);
            setInput('');
        }

        setStatus('thinking');
        
        try {
            const response = await window.electronAPI.chatSendMessage(text, mode);
            setMessages(prev => [...prev, response]);
        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, { role: 'assistant', message: "Lo siento, tuve un error de conexión." }]);
        } finally {
            setStatus('idle');
        }
    };

    const handleExecuteAction = async (action) => {
        if (!action) return;
        
        try {
             setStatus('thinking');
             if (onActionTrigger) onActionTrigger(action);
             
             const result = await window.electronAPI.chatExecuteAction(action);
             
             if (onActionComplete) onActionComplete(action, result);

             if (result.success) {
                 setMessages(prev => [...prev, { role: 'assistant', message: `✅ Acción "${action.label}" completada con éxito.` }]);
             } else {
                 setMessages(prev => [...prev, { role: 'assistant', message: `❌ Error al ejecutar: ${result.message}` }]);
             }
        } catch (e) {
             setMessages(prev => [...prev, { role: 'assistant', message: `❌ Fallo crítico: ${e.message}` }]);
        } finally {
            setStatus('idle');
        }
    };

    const handleClearHistory = async () => {
        await window.electronAPI.chatClearHistory();
        setMessages([]);
        loadHistory(); // Reload greeting
    };

    const startVoiceInput = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Tu sistema no soporta reconocimiento de voz nativo.");
            return;
        }

        if (status === 'recording') {
            recognitionRef.current?.stop();
            setStatus('idle');
            return;
        }

        const recognition = new window.webkitSpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.continuous = false;
        recognition.interimResults = false;
        
        recognition.onstart = () => setStatus('recording');
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setInput(prev => (prev ? prev + ' ' : '') + transcript);
        };

        recognition.onerror = (event) => {
            console.error("Speech Error:", event.error);
            setStatus('idle');
        };

        recognition.onend = () => {
            setStatus('idle');
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    if (!isOpen) return null;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div style={{display: 'flex', flexDirection: 'column'}}>
                    <span>🤖 CleanMate Copilot</span>
                    <div style={styles.modeSelector}>
                        <span 
                            style={mode === 'analysis' ? styles.modeActive : styles.mode} 
                            onClick={() => setMode('analysis')}
                        >Análisis</span>
                        <span 
                            style={mode === 'optimization' ? styles.modeActive : styles.mode} 
                            onClick={() => setMode('optimization')}
                        >Optimización</span>
                         <span 
                            style={mode === 'hardware' ? styles.modeActive : styles.mode} 
                            onClick={() => setMode('hardware')}
                        >HW</span>
                    </div>
                </div>
                <button onClick={onClose} style={styles.closeBtn}>×</button>
            </div>

            <div style={styles.chatArea}>
                {messages.map((msg, idx) => (
                    <div key={idx} style={{ 
                        ...styles.messageRow, 
                        justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' 
                    }}>
                        <div style={{ 
                            ...styles.bubble, 
                            background: msg.role === 'user' ? '#007bff' : '#333',
                            color: 'white'
                        }}>
                            <p style={{ margin: 0 }}>{msg.message}</p>
                            
                            {msg.actionSuggestion && (
                                <div style={styles.actionCard}>
                                    <div style={{fontWeight: 'bold', marginBottom: '5px'}}>{msg.actionSuggestion.label}</div>
                                    <div style={{fontSize: '12px', marginBottom: '10px', color: '#ccc'}}>{msg.actionSuggestion.description}</div>
                                    <button 
                                        onClick={() => handleExecuteAction(msg.actionSuggestion)}
                                        style={styles.actionBtn}
                                    >
                                        ▶ Ejecutar
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                
                {status === 'thinking' && (
                    <div style={{ ...styles.messageRow, justifyContent: 'flex-start' }}>
                        <div style={{ ...styles.bubble, background: '#333', fontStyle: 'italic', color: '#888' }}>
                            🧠 Procesando...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {status === 'recording' && (
                <div style={styles.recordingOverlay}>
                    <div className="pulse">🎙️ Escuchando...</div>
                    <button onClick={() => recognitionRef.current?.stop()} style={{marginTop: '10px', background: 'none', border: '1px solid white', color: 'white', borderRadius: '5px'}}>Detener</button>
                </div>
            )}

            <div style={styles.inputArea}>
                <button onClick={handleClearHistory} style={styles.iconBtn} title="Borrar historial">🗑️</button>
                <button 
                    onClick={startVoiceInput} 
                    style={{...styles.iconBtn, color: status === 'recording' ? '#ff4444' : '#888'}} 
                    title="Voz"
                >
                    🎙️
                </button>
                <input 
                    type="text" 
                    value={input} 
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(input)}
                    placeholder="Escribe algo..."
                    style={styles.input}
                />
                <button onClick={() => handleSendMessage(input)} style={styles.sendBtn}>➤</button>
            </div>
        </div>
    );
};

const styles = {
    container: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: '350px',
        height: '100%',
        background: '#1e1e1e',
        borderLeft: '1px solid #333',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-5px 0 15px rgba(0,0,0,0.5)',
        zIndex: 1000
    },
    header: {
        padding: '10px 15px',
        borderBottom: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'start',
        fontWeight: 'bold',
        background: '#252525'
    },
    modeSelector: {
        display: 'flex',
        gap: '10px',
        fontSize: '10px',
        marginTop: '5px'
    },
    mode: {
        cursor: 'pointer',
        color: '#666',
        padding: '2px 6px',
        borderRadius: '10px',
        background: '#111'
    },
    modeActive: {
        cursor: 'pointer',
        color: 'white',
        background: '#007bff',
        padding: '2px 6px',
        borderRadius: '10px'
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        color: '#888',
        fontSize: '20px',
        cursor: 'pointer'
    },
    chatArea: {
        flex: 1,
        padding: '15px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
    },
    messageRow: {
        display: 'flex',
        width: '100%'
    },
    bubble: {
        maxWidth: '85%',
        padding: '10px 15px',
        borderRadius: '15px',
        fontSize: '14px',
        lineHeight: '1.4'
    },
    inputArea: {
        padding: '15px',
        borderTop: '1px solid #333',
        display: 'flex',
        gap: '8px',
        background: '#252525',
        alignItems: 'center'
    },
    input: {
        flex: 1,
        background: '#333',
        border: 'none',
        padding: '10px',
        borderRadius: '20px',
        color: 'white',
        outline: 'none'
    },
    sendBtn: {
        background: '#007bff',
        border: 'none',
        color: 'white',
        width: '35px',
        height: '35px',
        borderRadius: '50%',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    iconBtn: {
        background: 'none',
        border: 'none',
        fontSize: '16px',
        cursor: 'pointer',
        color: '#888',
        padding: '5px'
    },
    actionCard: {
        marginTop: '10px',
        padding: '10px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.2)'
    },
    actionBtn: {
        background: '#00C851',
        border: 'none',
        color: 'white',
        padding: '5px 15px',
        borderRadius: '15px',
        fontSize: '12px',
        cursor: 'pointer',
        width: '100%'
    },
    recordingOverlay: {
        position: 'absolute',
        bottom: '70px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.8)',
        padding: '10px 20px',
        borderRadius: '20px',
        color: 'white',
        textAlign: 'center',
        zIndex: 1100
    }
};

export default AIChat;
