import {createHotContext as __vite__createHotContext} from "/@vite/client";
import.meta.hot = __vite__createHotContext("/src/AIChat.jsx");
import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=7abda97d";
const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import*as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
let prevRefreshReg;
let prevRefreshSig;
if (import.meta.hot && !inWebWorker) {
    if (!window.$RefreshReg$) {
        throw new Error("@vitejs/plugin-react can't detect preamble. Something is wrong.");
    }
    prevRefreshReg = window.$RefreshReg$;
    prevRefreshSig = window.$RefreshSig$;
    window.$RefreshReg$ = RefreshRuntime.getRefreshReg("C:/Users/Usuario/Documents/trae_projects/CleanMate AI/src/AIChat.jsx");
    window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$();
import __vite__cjsImport3_react from "/node_modules/.vite/deps/react.js?v=7abda97d";
const React = __vite__cjsImport3_react.__esModule ? __vite__cjsImport3_react.default : __vite__cjsImport3_react;
const useState = __vite__cjsImport3_react["useState"];
const useEffect = __vite__cjsImport3_react["useEffect"];
const useRef = __vite__cjsImport3_react["useRef"];
const AIChat = ({isOpen, onClose, onActionTrigger, onActionComplete})=>{
    _s();
    const [messages,setMessages] = useState([]);
    const [input,setInput] = useState("");
    const [status,setStatus] = useState("idle");
    const [mode,setMode] = useState("analysis");
    const messagesEndRef = useRef(null);
    const recognitionRef = useRef(null);
    useEffect(()=>{
        if (isOpen) {
            loadHistory();
        }
    }
    , [isOpen]);
    useEffect(()=>{
        scrollToBottom();
    }
    , [messages]);
    const loadHistory = async()=>{
        const history = await window.electronAPI.chatGetHistory();
        setMessages(history);
        if (history.length === 0) {
            setStatus("thinking");
            try {
                const greeting = await window.electronAPI.chatGetGreeting(mode);
                setMessages([{
                    role: "assistant",
                    message: greeting
                }]);
            } catch (e) {
                console.error("Failed to get greeting", e);
                setMessages([{
                    role: "assistant",
                    message: "Hola. ¿En qué puedo ayudarte hoy?"
                }]);
            } finally {
                setStatus("idle");
            }
        }
    }
    ;
    const scrollToBottom = ()=>{
        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth"
        });
    }
    ;
    const handleSendMessage = async(text,isAuto=false)=>{
        if (!text.trim())
            return;
        if (!isAuto) {
            const userMsg = {
                role: "user",
                message: text,
                timestamp: (/* @__PURE__ */
                new Date()).toISOString()
            };
            setMessages((prev)=>[...prev, userMsg]);
            setInput("");
        }
        setStatus("thinking");
        try {
            const response = await window.electronAPI.chatSendMessage(text, mode);
            setMessages((prev)=>[...prev, response]);
        } catch (error) {
            console.error("Chat Error:", error);
            setMessages((prev)=>[...prev, {
                role: "assistant",
                message: "Lo siento, tuve un error de conexión."
            }]);
        } finally {
            setStatus("idle");
        }
    }
    ;
    const handleExecuteAction = async(action)=>{
        if (!action)
            return;
        try {
            setStatus("thinking");
            if (onActionTrigger)
                onActionTrigger(action);
            const result = await window.electronAPI.chatExecuteAction(action);
            if (onActionComplete)
                onActionComplete(action, result);
            if (result.success) {
                setMessages((prev)=>[...prev, {
                    role: "assistant",
                    message: `✅ Acción "${action.label}" completada con éxito.`
                }]);
            } else {
                setMessages((prev)=>[...prev, {
                    role: "assistant",
                    message: `❌ Error al ejecutar: ${result.message}`
                }]);
            }
        } catch (e) {
            setMessages((prev)=>[...prev, {
                role: "assistant",
                message: `❌ Fallo crítico: ${e.message}`
            }]);
        } finally {
            setStatus("idle");
        }
    }
    ;
    const handleClearHistory = async()=>{
        try {
            const ok = await window.electronAPI.chatClearHistory();
            if (ok === false) {
                setMessages((prev)=>[...prev, {
                    role: "assistant",
                    message: "No pude borrar el historial de chat. Reintenta o revisa permisos."
                }]);
                return;
            }
            setMessages([]);
            await loadHistory();
        } catch (e) {
            setMessages((prev)=>[...prev, {
                role: "assistant",
                message: "Error al borrar historial (IPC)."
            }]);
        }
    }
    ;
    const startVoiceInput = ()=>{
        if (!("webkitSpeechRecognition"in window)) {
            alert("Tu sistema no soporta reconocimiento de voz nativo.");
            return;
        }
        if (status === "recording") {
            recognitionRef.current?.stop();
            setStatus("idle");
            return;
        }
        const recognition = new window.webkitSpeechRecognition();
        recognition.lang = "es-ES";
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.onstart = ()=>setStatus("recording");
        recognition.onresult = (event)=>{
            const transcript = event.results[0][0].transcript;
            setInput((prev)=>(prev ? prev + " " : "") + transcript);
        }
        ;
        recognition.onerror = (event)=>{
            console.error("Speech Error:", event.error);
            setStatus("idle");
        }
        ;
        recognition.onend = ()=>{
            setStatus("idle");
        }
        ;
        recognitionRef.current = recognition;
        recognition.start();
    }
    ;
    if (!isOpen)
        return null;
    return /* @__PURE__ */
    jsxDEV("div", {
        style: styles.container,
        children: [/* @__PURE__ */
        jsxDEV("div", {
            style: styles.header,
            children: [/* @__PURE__ */
            jsxDEV("div", {
                style: {
                    display: "flex",
                    flexDirection: "column"
                },
                children: [/* @__PURE__ */
                jsxDEV("span", {
                    children: "🤖 CleanMate Copilot"
                }, void 0, false, {
                    fileName: "C:/Users/Usuario/Documents/trae_projects/CleanMate AI/src/AIChat.jsx",
                    lineNumber: 165,
                    columnNumber: 21
                }, this), /* @__PURE__ */
                jsxDEV("div", {
                    style: styles.modeSelector,
                    children: [/* @__PURE__ */
                    jsxDEV("span", {
                        style: mode === "analysis" ? styles.modeActive : styles.mode,
                        onClick: ()=>setMode("analysis"),
                        children: "Análisis"
                    }, void 0, false, {
                        fileName: "C:/Users/Usuario/Documents/trae_projects/CleanMate AI/src/AIChat.jsx",
                        lineNumber: 167,
                        columnNumber: 25
                    }, this), /* @__PURE__ */
                    jsxDEV("span", {
                        style: mode === "optimization" ? styles.modeActive : styles.mode,
                        onClick: ()=>setMode("optimization"),
                        children: "Optimización"
                    }, void 0, false, {
                        fileName: "C:/Users/Usuario/Documents/trae_projects/CleanMate AI/src/AIChat.jsx",
                        lineNumber: 171,
                        columnNumber: 25
                    }, this), /* @__PURE__ */
                    jsxDEV("span", {
                        style: mode === "hardware" ? styles.modeActive : styles.mode,
                        onClick: ()=>setMode("hardware"),
                        children: "HW"
                    }, void 0, false, {
                        fileName: "C:/Users/Usuario/Documents/trae_projects/CleanMate AI/src/AIChat.jsx",
                        lineNumber: 175,
                        columnNumber: 26
                    }, this)]
                }, void 0, true, {
                    fileName: "C:/Users/Usuario/Documents/trae_projects/CleanMate AI/src/AIChat.jsx",
                    lineNumber: 166,
                    columnNumber: 21
                }, this)]
            }, void 0, true, {
                fileName: "C:/Users/Usuario/Documents/trae_projects/CleanMate AI/src/AIChat.jsx",
                lineNumber: 164,
                columnNumber: 17
            }, this), /* @__PURE__ */
            jsxDEV("button", {
                onClick: onClose,
                style: styles.closeBtn,
                children: "×"
            }, void 0, false, {
                fileName: "C:/Users/Usuario/Documents/trae_projects/CleanMate AI/src/AIChat.jsx",
                lineNumber: 181,
                columnNumber: 17
            }, this)]
        }, void 0, true, {
            fileName: "C:/Users/Usuario/Documents/trae_projects/CleanMate AI/src/AIChat.jsx",
            lineNumber: 163,
            columnNumber: 13
        }, this), /* @__PURE__ */
        jsxDEV("div", {
            style: styles.chatArea,
            children: [messages.map((msg,idx)=>/* @__PURE__ */
            jsxDEV("div", {
                style: {
                    ...styles.messageRow,
                    justifyContent: msg.role === "user" ? "flex-end" : "flex-start"
                },
                children: /* @__PURE__ */
                jsxDEV("div", {
                    style: {
                        ...styles.bubble,
                        background: msg.role === "user" ? "#007bff" : "#333",
                        color: "white"
                    },
                    children: [/* @__PURE__ */
                    jsxDEV("p", {
                        style: {
                            margin: 0
                        },
                        children: msg.message
                    }, void 0, false, {
                        fileName: "C:/Users/Usuario/Documents/trae_projects/CleanMate AI/src/AIChat.jsx",
                        lineNumber: 195,
                        columnNumber: 29
                    }, this), msg.actionSuggestion && /* @__PURE__ */
                    jsxDEV("div", {
                        style: styles.actionCard,
                        children: [/* @__PURE__ */
                        jsxDEV("div", {
                            style: {
                                fontWeight: "bold",
                                marginBottom: "5px"
                            },
                            children: msg.actionSuggestion.label
                        }, void 0, false, {
                            fileName: "C:/Users/Usuario/Documents/trae_projects/CleanMate AI/src/AIChat.jsx",
                            lineNumber: 199,
                            columnNumber: 37
                        }, this), /* @__PURE__ */
                        jsxDEV("div", {
                            style: {
                                fontSize: "12px",
                                marginBottom: "10px",
                                color: "#ccc"
                            },
                            children: msg.actionSuggestion.description
                        }, void 0, false, {
                            fileName: "C:/Users/Usuario/Documents/trae_projects/CleanMate AI/src/AIChat.jsx",
                            lineNumber: 200,
                            columnNumber: 37
                        }, this), /* @__PURE__ */
                        jsxDEV("button", {
                            onClick: ()=>handleExecuteAction(msg.actionSuggestion),
                            style: styles.actionBtn,
                            children: "▶ Ejecutar"
                        }, void 0, false, {
                            fileName: "C:/Users/Usuario/Documents/trae_projects/CleanMate AI/src/AIChat.jsx",
                            lineNumber: 201,
                            columnNumber: 37
                        }, this)]
                    }, void 0, true, {
                        fileName: "C:/Users/Usuario/Documents/trae_projects/CleanMate AI/src/AIChat.jsx",
                        lineNumber: 198,
                        columnNumber: 13
                    }, this)]
                }, void 0, true, {
                    fileName: "C:/Users/Usuario/Documents/trae_projects/CleanMate AI/src/AIChat.jsx",
                    lineNumber: 190,
                    columnNumber: 25
                }, this)
            }, idx, false, {
                fileName: "C:/Users/Usuario/Documents/trae_projects/CleanMate AI/src/AIChat.jsx",
                lineNumber: 186,
                columnNumber: 9
            }, this)), status === "thinking" && /* @__PURE__ */
            jsxDEV("div", {
                style: {
                    ...styles.messageRow,
                    justifyContent: "flex-start"
                },
                children: /* @__PURE__ */
                jsxDEV("div", {
                    style: {
                        ...styles.bubble,
                        background: "#333",
                        fontStyle: "italic",
                        color: "#888"
                    },
                    children: "🧠 Procesando..."
                }, void 0, false, {
                    fileName: "C:/Users/Usuario/Documents/trae_projects/CleanMate AI/src/AIChat.jsx",
                    lineNumber: 215,
                    columnNumber: 25
                }, this)
            }, void 0, false, {
                fileName: "C:/Users/Usuario/Documents/trae_projects/CleanMate AI/src/AIChat.jsx",
                lineNumber: 214,
                columnNumber: 9
            }, this), /* @__PURE__ */
            jsxDEV("div", {
                ref: messagesEndRef
            }, void 0, false, {
                fileName: "C:/Users/Usuario/Documents/trae_projects/CleanMate AI/src/AIChat.jsx",
                lineNumber: 220,
                columnNumber: 17
            }, this)]
        }, void 0, true, {
            fileName: "C:/Users/Usuario/Documents/trae_projects/CleanMate AI/src/AIChat.jsx",
            lineNumber: 184,
            columnNumber: 13
        }, this), status === "recording" && /* @__PURE__ */
        jsxDEV("div", {
            style: styles.recordingOverlay,
            children: [/* @__PURE__ */
            jsxDEV("div", {
                className: "pulse",
                children: "🎙️ Escuchando..."
            }, void 0, false, {
                fileName: "C:/Users/Usuario/Documents/trae_projects/CleanMate AI/src/AIChat.jsx",
                lineNumber: 225,
                columnNumber: 21
            }, this), /* @__PURE__ */
            jsxDEV("button", {
                onClick: ()=>recognitionRef.current?.stop(),
                style: {
                    marginTop: "10px",
                    background: "none",
                    border: "1px solid white",
                    color: "white",
                    borderRadius: "5px"
                },
                children: "Detener"
            }, void 0, false, {
                fileName: "C:/Users/Usuario/Documents/trae_projects/CleanMate AI/src/AIChat.jsx",
                lineNumber: 226,
                columnNumber: 21
            }, this)]
        }, void 0, true, {
            fileName: "C:/Users/Usuario/Documents/trae_projects/CleanMate AI/src/AIChat.jsx",
            lineNumber: 224,
            columnNumber: 7
        }, this), /* @__PURE__ */
        jsxDEV("div", {
            style: styles.inputArea,
            children: [/* @__PURE__ */
            jsxDEV("button", {
                onClick: handleClearHistory,
                style: styles.iconBtn,
                title: "Borrar historial",
                children: "🗑️"
            }, void 0, false, {
                fileName: "C:/Users/Usuario/Documents/trae_projects/CleanMate AI/src/AIChat.jsx",
                lineNumber: 231,
                columnNumber: 17
            }, this), /* @__PURE__ */
            jsxDEV("button", {
                onClick: startVoiceInput,
                style: {
                    ...styles.iconBtn,
                    color: status === "recording" ? "#ff4444" : "#888"
                },
                title: "Voz",
                children: "🎙️"
            }, void 0, false, {
                fileName: "C:/Users/Usuario/Documents/trae_projects/CleanMate AI/src/AIChat.jsx",
                lineNumber: 232,
                columnNumber: 17
            }, this), /* @__PURE__ */
            jsxDEV("input", {
                type: "text",
                value: input,
                onChange: (e)=>setInput(e.target.value),
                onKeyPress: (e)=>e.key === "Enter" && handleSendMessage(input),
                placeholder: "Escribe algo...",
                style: styles.input
            }, void 0, false, {
                fileName: "C:/Users/Usuario/Documents/trae_projects/CleanMate AI/src/AIChat.jsx",
                lineNumber: 239,
                columnNumber: 17
            }, this), /* @__PURE__ */
            jsxDEV("button", {
                onClick: ()=>handleSendMessage(input),
                style: styles.sendBtn,
                children: "➤"
            }, void 0, false, {
                fileName: "C:/Users/Usuario/Documents/trae_projects/CleanMate AI/src/AIChat.jsx",
                lineNumber: 247,
                columnNumber: 17
            }, this)]
        }, void 0, true, {
            fileName: "C:/Users/Usuario/Documents/trae_projects/CleanMate AI/src/AIChat.jsx",
            lineNumber: 230,
            columnNumber: 13
        }, this)]
    }, void 0, true, {
        fileName: "C:/Users/Usuario/Documents/trae_projects/CleanMate AI/src/AIChat.jsx",
        lineNumber: 162,
        columnNumber: 5
    }, this);
}
;
_s(AIChat, "7lhIykWP42JvZ4y8ge2c15K22E8=");
_c = AIChat;
const styles = {
    container: {
        position: "absolute",
        top: 0,
        right: 0,
        width: "350px",
        height: "100%",
        background: "#1e1e1e",
        borderLeft: "1px solid #333",
        display: "flex",
        flexDirection: "column",
        boxShadow: "-5px 0 15px rgba(0,0,0,0.5)",
        zIndex: 1e3
    },
    header: {
        padding: "10px 15px",
        borderBottom: "1px solid #333",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "start",
        fontWeight: "bold",
        background: "#252525"
    },
    modeSelector: {
        display: "flex",
        gap: "10px",
        fontSize: "10px",
        marginTop: "5px"
    },
    mode: {
        cursor: "pointer",
        color: "#666",
        padding: "2px 6px",
        borderRadius: "10px",
        background: "#111"
    },
    modeActive: {
        cursor: "pointer",
        color: "white",
        background: "#007bff",
        padding: "2px 6px",
        borderRadius: "10px"
    },
    closeBtn: {
        background: "none",
        border: "none",
        color: "#888",
        fontSize: "20px",
        cursor: "pointer"
    },
    chatArea: {
        flex: 1,
        padding: "15px",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "10px"
    },
    messageRow: {
        display: "flex",
        width: "100%"
    },
    bubble: {
        maxWidth: "85%",
        padding: "10px 15px",
        borderRadius: "15px",
        fontSize: "14px",
        lineHeight: "1.4"
    },
    inputArea: {
        padding: "15px",
        borderTop: "1px solid #333",
        display: "flex",
        gap: "8px",
        background: "#252525",
        alignItems: "center"
    },
    input: {
        flex: 1,
        background: "#333",
        border: "none",
        padding: "10px",
        borderRadius: "20px",
        color: "white",
        outline: "none"
    },
    sendBtn: {
        background: "#007bff",
        border: "none",
        color: "white",
        width: "35px",
        height: "35px",
        borderRadius: "50%",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
    },
    iconBtn: {
        background: "none",
        border: "none",
        fontSize: "16px",
        cursor: "pointer",
        color: "#888",
        padding: "5px"
    },
    actionCard: {
        marginTop: "10px",
        padding: "10px",
        background: "rgba(255,255,255,0.1)",
        borderRadius: "8px",
        border: "1px solid rgba(255,255,255,0.2)"
    },
    actionBtn: {
        background: "#00C851",
        border: "none",
        color: "white",
        padding: "5px 15px",
        borderRadius: "15px",
        fontSize: "12px",
        cursor: "pointer",
        width: "100%"
    },
    recordingOverlay: {
        position: "absolute",
        bottom: "70px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(0,0,0,0.8)",
        padding: "10px 20px",
        borderRadius: "20px",
        color: "white",
        textAlign: "center",
        zIndex: 1100
    }
};
export default AIChat;
var _c;
$RefreshReg$(_c, "AIChat");
if (import.meta.hot && !inWebWorker) {
    window.$RefreshReg$ = prevRefreshReg;
    window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
    RefreshRuntime.__hmr_import(import.meta.url).then((currentExports)=>{
        RefreshRuntime.registerExportsForReactRefresh("C:/Users/Usuario/Documents/trae_projects/CleanMate AI/src/AIChat.jsx", currentExports);
        import.meta.hot.accept((nextExports)=>{
            if (!nextExports)
                return;
            const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("C:/Users/Usuario/Documents/trae_projects/CleanMate AI/src/AIChat.jsx", currentExports, nextExports);
            if (invalidateMessage)
                import.meta.hot.invalidate(invalidateMessage);
        }
        );
    }
    );
}

//# sourceMappingURL=data:application/json;base64,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QSxJQUNSN0MsU0FBUztBQUFBLElBQ1QyQyxZQUFZO0FBQUEsSUFDWmpDLGdCQUFnQjtBQUFBLEVBQ3BCO0FBQUEsRUFDQWtCLFNBQVM7QUFBQSxJQUNMaEIsWUFBWTtBQUFBLElBQ1phLFFBQVE7QUFBQSxJQUNSTixVQUFVO0FBQUEsSUFDVjBCLFFBQVE7QUFBQSxJQUNSaEMsT0FBTztBQUFBLElBQ1A0QixTQUFTO0FBQUEsRUFDYjtBQUFBLEVBQ0F6QixZQUFZO0FBQUEsSUFDUlEsV0FBVztBQUFBLElBQ1hpQixTQUFTO0FBQUEsSUFDVDdCLFlBQVk7QUFBQSxJQUNaYyxjQUFjO0FBQUEsSUFDZEQsUUFBUTtBQUFBLEVBQ1o7QUFBQSxFQUNBSixXQUFXO0FBQUEsSUFDUFQsWUFBWTtBQUFBLElBQ1phLFFBQVE7QUFBQSxJQUNSWixPQUFPO0FBQUEsSUFDUDRCLFNBQVM7QUFBQSxJQUNUZixjQUFjO0FBQUEsSUFDZFAsVUFBVTtBQUFBLElBQ1YwQixRQUFRO0FBQUEsSUFDUlQsT0FBTztBQUFBLEVBQ1g7QUFBQSxFQUNBYixrQkFBa0I7QUFBQSxJQUNkVSxVQUFVO0FBQUEsSUFDVm1CLFFBQVE7QUFBQSxJQUNSQyxNQUFNO0FBQUEsSUFDTkMsV0FBVztBQUFBLElBQ1gxQyxZQUFZO0FBQUEsSUFDWjZCLFNBQVM7QUFBQSxJQUNUZixjQUFjO0FBQUEsSUFDZGIsT0FBTztBQUFBLElBQ1AwQyxXQUFXO0FBQUEsSUFDWGYsUUFBUTtBQUFBLEVBQ1o7QUFDSjtBQUVBLGVBQWVoSDtBQUFPLElBQUFnSTtBQUFBLGFBQUFBLElBQUEiLCJuYW1lcyI6WyJSZWFjdCIsInVzZVN0YXRlIiwidXNlRWZmZWN0IiwidXNlUmVmIiwiQUlDaGF0IiwiaXNPcGVuIiwib25DbG9zZSIsIm9uQWN0aW9uVHJpZ2dlciIsIm9uQWN0aW9uQ29tcGxldGUiLCJfcyIsIm1lc3NhZ2VzIiwic2V0TWVzc2FnZXMiLCJpbnB1dCIsInNldElucHV0Iiwic3RhdHVzIiwic2V0U3RhdHVzIiwibW9kZSIsInNldE1vZGUiLCJtZXNzYWdlc0VuZFJlZiIsInJlY29nbml0aW9uUmVmIiwibG9hZEhpc3RvcnkiLCJzY3JvbGxUb0JvdHRvbSIsImhpc3RvcnkiLCJ3aW5kb3ciLCJlbGVjdHJvbkFQSSIsImNoYXRHZXRIaXN0b3J5IiwibGVuZ3RoIiwiZ3JlZXRpbmciLCJjaGF0R2V0R3JlZXRpbmciLCJyb2xlIiwibWVzc2FnZSIsImUiLCJjb25zb2xlIiwiZXJyb3IiLCJjdXJyZW50Iiwic2Nyb2xsSW50b1ZpZXciLCJiZWhhdmlvciIsImhhbmRsZVNlbmRNZXNzYWdlIiwidGV4dCIsImlzQXV0byIsInRyaW0iLCJ1c2VyTXNnIiwidGltZXN0YW1wIiwiRGF0ZSIsInRvSVNPU3RyaW5nIiwicHJldiIsInJlc3BvbnNlIiwiY2hhdFNlbmRNZXNzYWdlIiwiaGFuZGxlRXhlY3V0ZUFjdGlvbiIsImFjdGlvbiIsInJlc3VsdCIsImNoYXRFeGVjdXRlQWN0aW9uIiwic3VjY2VzcyIsImxhYmVsIiwiaGFuZGxlQ2xlYXJIaXN0b3J5Iiwib2siLCJjaGF0Q2xlYXJIaXN0b3J5Iiwic3RhcnRWb2ljZUlucHV0IiwiYWxlcnQiLCJzdG9wIiwicmVjb2duaXRpb24iLCJ3ZWJraXRTcGVlY2hSZWNvZ25pdGlvbiIsImxhbmciLCJjb250aW51b3VzIiwiaW50ZXJpbVJlc3VsdHMiLCJvbnN0YXJ0Iiwib25yZXN1bHQiLCJldmVudCIsInRyYW5zY3JpcHQiLCJyZXN1bHRzIiwib25lcnJvciIsIm9uZW5kIiwic3RhcnQiLCJzdHlsZXMiLCJjb250YWluZXIiLCJoZWFkZXIiLCJkaXNwbGF5IiwiZmxleERpcmVjdGlvbiIsIm1vZGVTZWxlY3RvciIsIm1vZGVBY3RpdmUiLCJjbG9zZUJ0biIsImNoYXRBcmVhIiwibWFwIiwibXNnIiwiaWR4IiwibWVzc2FnZVJvdyIsImp1c3RpZnlDb250ZW50IiwiYnViYmxlIiwiYmFja2dyb3VuZCIsImNvbG9yIiwibWFyZ2luIiwiYWN0aW9uU3VnZ2VzdGlvbiIsImFjdGlvbkNhcmQiLCJmb250V2VpZ2h0IiwibWFyZ2luQm90dG9tIiwiZm9udFNpemUiLCJkZXNjcmlwdGlvbiIsImFjdGlvbkJ0biIsImZvbnRTdHlsZSIsInJlY29yZGluZ092ZXJsYXkiLCJtYXJnaW5Ub3AiLCJib3JkZXIiLCJib3JkZXJSYWRpdXMiLCJpbnB1dEFyZWEiLCJpY29uQnRuIiwidGFyZ2V0IiwidmFsdWUiLCJrZXkiLCJzZW5kQnRuIiwicG9zaXRpb24iLCJ0b3AiLCJyaWdodCIsIndpZHRoIiwiaGVpZ2h0IiwiYm9yZGVyTGVmdCIsImJveFNoYWRvdyIsInpJbmRleCIsInBhZGRpbmciLCJib3JkZXJCb3R0b20iLCJhbGlnbkl0ZW1zIiwiZ2FwIiwiY3Vyc29yIiwiZmxleCIsIm92ZXJmbG93WSIsIm1heFdpZHRoIiwibGluZUhlaWdodCIsImJvcmRlclRvcCIsIm91dGxpbmUiLCJib3R0b20iLCJsZWZ0IiwidHJhbnNmb3JtIiwidGV4dEFsaWduIiwiX2MiXSwic291cmNlcyI6WyJBSUNoYXQuanN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBSZWFjdCwgeyB1c2VTdGF0ZSwgdXNlRWZmZWN0LCB1c2VSZWYgfSBmcm9tICdyZWFjdCc7XG5cbmNvbnN0IEFJQ2hhdCA9ICh7IGlzT3Blbiwgb25DbG9zZSwgb25BY3Rpb25UcmlnZ2VyLCBvbkFjdGlvbkNvbXBsZXRlIH0pID0+IHtcbiAgICBjb25zdCBbbWVzc2FnZXMsIHNldE1lc3NhZ2VzXSA9IHVzZVN0YXRlKFtdKTtcbiAgICBjb25zdCBbaW5wdXQsIHNldElucHV0XSA9IHVzZVN0YXRlKCcnKTtcbiAgICBjb25zdCBbc3RhdHVzLCBzZXRTdGF0dXNdID0gdXNlU3RhdGUoJ2lkbGUnKTsgLy8gaWRsZSwgdGhpbmtpbmcsIHJlY29yZGluZ1xuICAgIGNvbnN0IFttb2RlLCBzZXRNb2RlXSA9IHVzZVN0YXRlKCdhbmFseXNpcycpOyAvLyBhbmFseXNpcywgb3B0aW1pemF0aW9uLCBoYXJkd2FyZVxuICAgIGNvbnN0IG1lc3NhZ2VzRW5kUmVmID0gdXNlUmVmKG51bGwpO1xuICAgIGNvbnN0IHJlY29nbml0aW9uUmVmID0gdXNlUmVmKG51bGwpO1xuXG4gICAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICAgICAgaWYgKGlzT3Blbikge1xuICAgICAgICAgICAgbG9hZEhpc3RvcnkoKTtcbiAgICAgICAgfVxuICAgIH0sIFtpc09wZW5dKTtcblxuICAgIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgICAgIHNjcm9sbFRvQm90dG9tKCk7XG4gICAgfSwgW21lc3NhZ2VzXSk7XG5cbiAgICBjb25zdCBsb2FkSGlzdG9yeSA9IGFzeW5jICgpID0+IHtcbiAgICAgICAgY29uc3QgaGlzdG9yeSA9IGF3YWl0IHdpbmRvdy5lbGVjdHJvbkFQSS5jaGF0R2V0SGlzdG9yeSgpO1xuICAgICAgICBzZXRNZXNzYWdlcyhoaXN0b3J5KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEludGVsbGlnZW50IEdyZWV0aW5nIGlmIGhpc3RvcnkgaXMgZW1wdHlcbiAgICAgICAgaWYgKGhpc3RvcnkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBzZXRTdGF0dXMoJ3RoaW5raW5nJyk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGdyZWV0aW5nID0gYXdhaXQgd2luZG93LmVsZWN0cm9uQVBJLmNoYXRHZXRHcmVldGluZyhtb2RlKTtcbiAgICAgICAgICAgICAgICBzZXRNZXNzYWdlcyhbeyByb2xlOiAnYXNzaXN0YW50JywgbWVzc2FnZTogZ3JlZXRpbmcgfV0pO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gZ2V0IGdyZWV0aW5nXCIsIGUpO1xuICAgICAgICAgICAgICAgIHNldE1lc3NhZ2VzKFt7IHJvbGU6ICdhc3Npc3RhbnQnLCBtZXNzYWdlOiBcIkhvbGEuIMK/RW4gcXXDqSBwdWVkbyBheXVkYXJ0ZSBob3k/XCIgfV0pO1xuICAgICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgICAgICBzZXRTdGF0dXMoJ2lkbGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBzY3JvbGxUb0JvdHRvbSA9ICgpID0+IHtcbiAgICAgICAgbWVzc2FnZXNFbmRSZWYuY3VycmVudD8uc2Nyb2xsSW50b1ZpZXcoeyBiZWhhdmlvcjogXCJzbW9vdGhcIiB9KTtcbiAgICB9O1xuXG4gICAgY29uc3QgaGFuZGxlU2VuZE1lc3NhZ2UgPSBhc3luYyAodGV4dCwgaXNBdXRvID0gZmFsc2UpID0+IHtcbiAgICAgICAgaWYgKCF0ZXh0LnRyaW0oKSkgcmV0dXJuO1xuXG4gICAgICAgIGlmICghaXNBdXRvKSB7XG4gICAgICAgICAgICBjb25zdCB1c2VyTXNnID0geyByb2xlOiAndXNlcicsIG1lc3NhZ2U6IHRleHQsIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpIH07XG4gICAgICAgICAgICBzZXRNZXNzYWdlcyhwcmV2ID0+IFsuLi5wcmV2LCB1c2VyTXNnXSk7XG4gICAgICAgICAgICBzZXRJbnB1dCgnJyk7XG4gICAgICAgIH1cblxuICAgICAgICBzZXRTdGF0dXMoJ3RoaW5raW5nJyk7XG4gICAgICAgIFxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB3aW5kb3cuZWxlY3Ryb25BUEkuY2hhdFNlbmRNZXNzYWdlKHRleHQsIG1vZGUpO1xuICAgICAgICAgICAgc2V0TWVzc2FnZXMocHJldiA9PiBbLi4ucHJldiwgcmVzcG9uc2VdKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJDaGF0IEVycm9yOlwiLCBlcnJvcik7XG4gICAgICAgICAgICBzZXRNZXNzYWdlcyhwcmV2ID0+IFsuLi5wcmV2LCB7IHJvbGU6ICdhc3Npc3RhbnQnLCBtZXNzYWdlOiBcIkxvIHNpZW50bywgdHV2ZSB1biBlcnJvciBkZSBjb25leGnDs24uXCIgfV0pO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgc2V0U3RhdHVzKCdpZGxlJyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgaGFuZGxlRXhlY3V0ZUFjdGlvbiA9IGFzeW5jIChhY3Rpb24pID0+IHtcbiAgICAgICAgaWYgKCFhY3Rpb24pIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgc2V0U3RhdHVzKCd0aGlua2luZycpO1xuICAgICAgICAgICAgIGlmIChvbkFjdGlvblRyaWdnZXIpIG9uQWN0aW9uVHJpZ2dlcihhY3Rpb24pO1xuICAgICAgICAgICAgIFxuICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHdpbmRvdy5lbGVjdHJvbkFQSS5jaGF0RXhlY3V0ZUFjdGlvbihhY3Rpb24pO1xuICAgICAgICAgICAgIFxuICAgICAgICAgICAgIGlmIChvbkFjdGlvbkNvbXBsZXRlKSBvbkFjdGlvbkNvbXBsZXRlKGFjdGlvbiwgcmVzdWx0KTtcblxuICAgICAgICAgICAgIGlmIChyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgICBzZXRNZXNzYWdlcyhwcmV2ID0+IFsuLi5wcmV2LCB7IHJvbGU6ICdhc3Npc3RhbnQnLCBtZXNzYWdlOiBg4pyFIEFjY2nDs24gXCIke2FjdGlvbi5sYWJlbH1cIiBjb21wbGV0YWRhIGNvbiDDqXhpdG8uYCB9XSk7XG4gICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgc2V0TWVzc2FnZXMocHJldiA9PiBbLi4ucHJldiwgeyByb2xlOiAnYXNzaXN0YW50JywgbWVzc2FnZTogYOKdjCBFcnJvciBhbCBlamVjdXRhcjogJHtyZXN1bHQubWVzc2FnZX1gIH1dKTtcbiAgICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICBzZXRNZXNzYWdlcyhwcmV2ID0+IFsuLi5wcmV2LCB7IHJvbGU6ICdhc3Npc3RhbnQnLCBtZXNzYWdlOiBg4p2MIEZhbGxvIGNyw610aWNvOiAke2UubWVzc2FnZX1gIH1dKTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHNldFN0YXR1cygnaWRsZScpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IGhhbmRsZUNsZWFySGlzdG9yeSA9IGFzeW5jICgpID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IG9rID0gYXdhaXQgd2luZG93LmVsZWN0cm9uQVBJLmNoYXRDbGVhckhpc3RvcnkoKTtcbiAgICAgICAgICAgIGlmIChvayA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICBzZXRNZXNzYWdlcyhwcmV2ID0+IFsuLi5wcmV2LCB7IHJvbGU6ICdhc3Npc3RhbnQnLCBtZXNzYWdlOiBcIk5vIHB1ZGUgYm9ycmFyIGVsIGhpc3RvcmlhbCBkZSBjaGF0LiBSZWludGVudGEgbyByZXZpc2EgcGVybWlzb3MuXCIgfV0pO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNldE1lc3NhZ2VzKFtdKTtcbiAgICAgICAgICAgIGF3YWl0IGxvYWRIaXN0b3J5KCk7IC8vIFJlbG9hZCBncmVldGluZ1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBzZXRNZXNzYWdlcyhwcmV2ID0+IFsuLi5wcmV2LCB7IHJvbGU6ICdhc3Npc3RhbnQnLCBtZXNzYWdlOiBcIkVycm9yIGFsIGJvcnJhciBoaXN0b3JpYWwgKElQQykuXCIgfV0pO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHN0YXJ0Vm9pY2VJbnB1dCA9ICgpID0+IHtcbiAgICAgICAgaWYgKCEoJ3dlYmtpdFNwZWVjaFJlY29nbml0aW9uJyBpbiB3aW5kb3cpKSB7XG4gICAgICAgICAgICBhbGVydChcIlR1IHNpc3RlbWEgbm8gc29wb3J0YSByZWNvbm9jaW1pZW50byBkZSB2b3ogbmF0aXZvLlwiKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzdGF0dXMgPT09ICdyZWNvcmRpbmcnKSB7XG4gICAgICAgICAgICByZWNvZ25pdGlvblJlZi5jdXJyZW50Py5zdG9wKCk7XG4gICAgICAgICAgICBzZXRTdGF0dXMoJ2lkbGUnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHJlY29nbml0aW9uID0gbmV3IHdpbmRvdy53ZWJraXRTcGVlY2hSZWNvZ25pdGlvbigpO1xuICAgICAgICByZWNvZ25pdGlvbi5sYW5nID0gJ2VzLUVTJztcbiAgICAgICAgcmVjb2duaXRpb24uY29udGludW91cyA9IGZhbHNlO1xuICAgICAgICByZWNvZ25pdGlvbi5pbnRlcmltUmVzdWx0cyA9IGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgcmVjb2duaXRpb24ub25zdGFydCA9ICgpID0+IHNldFN0YXR1cygncmVjb3JkaW5nJyk7XG4gICAgICAgIFxuICAgICAgICByZWNvZ25pdGlvbi5vbnJlc3VsdCA9IChldmVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdHJhbnNjcmlwdCA9IGV2ZW50LnJlc3VsdHNbMF1bMF0udHJhbnNjcmlwdDtcbiAgICAgICAgICAgIHNldElucHV0KHByZXYgPT4gKHByZXYgPyBwcmV2ICsgJyAnIDogJycpICsgdHJhbnNjcmlwdCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmVjb2duaXRpb24ub25lcnJvciA9IChldmVudCkgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIlNwZWVjaCBFcnJvcjpcIiwgZXZlbnQuZXJyb3IpO1xuICAgICAgICAgICAgc2V0U3RhdHVzKCdpZGxlJyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmVjb2duaXRpb24ub25lbmQgPSAoKSA9PiB7XG4gICAgICAgICAgICBzZXRTdGF0dXMoJ2lkbGUnKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZWNvZ25pdGlvblJlZi5jdXJyZW50ID0gcmVjb2duaXRpb247XG4gICAgICAgIHJlY29nbml0aW9uLnN0YXJ0KCk7XG4gICAgfTtcblxuICAgIGlmICghaXNPcGVuKSByZXR1cm4gbnVsbDtcblxuICAgIHJldHVybiAoXG4gICAgICAgIDxkaXYgc3R5bGU9e3N0eWxlcy5jb250YWluZXJ9PlxuICAgICAgICAgICAgPGRpdiBzdHlsZT17c3R5bGVzLmhlYWRlcn0+XG4gICAgICAgICAgICAgICAgPGRpdiBzdHlsZT17e2Rpc3BsYXk6ICdmbGV4JywgZmxleERpcmVjdGlvbjogJ2NvbHVtbid9fT5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4+8J+kliBDbGVhbk1hdGUgQ29waWxvdDwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBzdHlsZT17c3R5bGVzLm1vZGVTZWxlY3Rvcn0+XG4gICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZT17bW9kZSA9PT0gJ2FuYWx5c2lzJyA/IHN0eWxlcy5tb2RlQWN0aXZlIDogc3R5bGVzLm1vZGV9IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldE1vZGUoJ2FuYWx5c2lzJyl9XG4gICAgICAgICAgICAgICAgICAgICAgICA+QW7DoWxpc2lzPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU9e21vZGUgPT09ICdvcHRpbWl6YXRpb24nID8gc3R5bGVzLm1vZGVBY3RpdmUgOiBzdHlsZXMubW9kZX0gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0TW9kZSgnb3B0aW1pemF0aW9uJyl9XG4gICAgICAgICAgICAgICAgICAgICAgICA+T3B0aW1pemFjacOzbjwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZT17bW9kZSA9PT0gJ2hhcmR3YXJlJyA/IHN0eWxlcy5tb2RlQWN0aXZlIDogc3R5bGVzLm1vZGV9IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldE1vZGUoJ2hhcmR3YXJlJyl9XG4gICAgICAgICAgICAgICAgICAgICAgICA+SFc8L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17b25DbG9zZX0gc3R5bGU9e3N0eWxlcy5jbG9zZUJ0bn0+w5c8L2J1dHRvbj5cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICA8ZGl2IHN0eWxlPXtzdHlsZXMuY2hhdEFyZWF9PlxuICAgICAgICAgICAgICAgIHttZXNzYWdlcy5tYXAoKG1zZywgaWR4KSA9PiAoXG4gICAgICAgICAgICAgICAgICAgIDxkaXYga2V5PXtpZHh9IHN0eWxlPXt7IFxuICAgICAgICAgICAgICAgICAgICAgICAgLi4uc3R5bGVzLm1lc3NhZ2VSb3csIFxuICAgICAgICAgICAgICAgICAgICAgICAganVzdGlmeUNvbnRlbnQ6IG1zZy5yb2xlID09PSAndXNlcicgPyAnZmxleC1lbmQnIDogJ2ZsZXgtc3RhcnQnIFxuICAgICAgICAgICAgICAgICAgICB9fT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgc3R5bGU9e3sgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4uc3R5bGVzLmJ1YmJsZSwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogbXNnLnJvbGUgPT09ICd1c2VyJyA/ICcjMDA3YmZmJyA6ICcjMzMzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xvcjogJ3doaXRlJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfX0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHAgc3R5bGU9e3sgbWFyZ2luOiAwIH19Pnttc2cubWVzc2FnZX08L3A+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge21zZy5hY3Rpb25TdWdnZXN0aW9uICYmIChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBzdHlsZT17c3R5bGVzLmFjdGlvbkNhcmR9PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBzdHlsZT17e2ZvbnRXZWlnaHQ6ICdib2xkJywgbWFyZ2luQm90dG9tOiAnNXB4J319Pnttc2cuYWN0aW9uU3VnZ2VzdGlvbi5sYWJlbH08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgc3R5bGU9e3tmb250U2l6ZTogJzEycHgnLCBtYXJnaW5Cb3R0b206ICcxMHB4JywgY29sb3I6ICcjY2NjJ319Pnttc2cuYWN0aW9uU3VnZ2VzdGlvbi5kZXNjcmlwdGlvbn08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gaGFuZGxlRXhlY3V0ZUFjdGlvbihtc2cuYWN0aW9uU3VnZ2VzdGlvbil9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3N0eWxlcy5hY3Rpb25CdG59XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg4pa2IEVqZWN1dGFyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB7c3RhdHVzID09PSAndGhpbmtpbmcnICYmIChcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBzdHlsZT17eyAuLi5zdHlsZXMubWVzc2FnZVJvdywganVzdGlmeUNvbnRlbnQ6ICdmbGV4LXN0YXJ0JyB9fT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgc3R5bGU9e3sgLi4uc3R5bGVzLmJ1YmJsZSwgYmFja2dyb3VuZDogJyMzMzMnLCBmb250U3R5bGU6ICdpdGFsaWMnLCBjb2xvcjogJyM4ODgnIH19PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIPCfp6AgUHJvY2VzYW5kby4uLlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAgPGRpdiByZWY9e21lc3NhZ2VzRW5kUmVmfSAvPlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIHtzdGF0dXMgPT09ICdyZWNvcmRpbmcnICYmIChcbiAgICAgICAgICAgICAgICA8ZGl2IHN0eWxlPXtzdHlsZXMucmVjb3JkaW5nT3ZlcmxheX0+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicHVsc2VcIj7wn46Z77iPIEVzY3VjaGFuZG8uLi48L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiByZWNvZ25pdGlvblJlZi5jdXJyZW50Py5zdG9wKCl9IHN0eWxlPXt7bWFyZ2luVG9wOiAnMTBweCcsIGJhY2tncm91bmQ6ICdub25lJywgYm9yZGVyOiAnMXB4IHNvbGlkIHdoaXRlJywgY29sb3I6ICd3aGl0ZScsIGJvcmRlclJhZGl1czogJzVweCd9fT5EZXRlbmVyPC9idXR0b24+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICApfVxuXG4gICAgICAgICAgICA8ZGl2IHN0eWxlPXtzdHlsZXMuaW5wdXRBcmVhfT5cbiAgICAgICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9e2hhbmRsZUNsZWFySGlzdG9yeX0gc3R5bGU9e3N0eWxlcy5pY29uQnRufSB0aXRsZT1cIkJvcnJhciBoaXN0b3JpYWxcIj7wn5eR77iPPC9idXR0b24+XG4gICAgICAgICAgICAgICAgPGJ1dHRvbiBcbiAgICAgICAgICAgICAgICAgICAgb25DbGljaz17c3RhcnRWb2ljZUlucHV0fSBcbiAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3suLi5zdHlsZXMuaWNvbkJ0biwgY29sb3I6IHN0YXR1cyA9PT0gJ3JlY29yZGluZycgPyAnI2ZmNDQ0NCcgOiAnIzg4OCd9fSBcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU9XCJWb3pcIlxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAg8J+Ome+4j1xuICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIDxpbnB1dCBcbiAgICAgICAgICAgICAgICAgICAgdHlwZT1cInRleHRcIiBcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU9e2lucHV0fSBcbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U9eyhlKSA9PiBzZXRJbnB1dChlLnRhcmdldC52YWx1ZSl9XG4gICAgICAgICAgICAgICAgICAgIG9uS2V5UHJlc3M9eyhlKSA9PiBlLmtleSA9PT0gJ0VudGVyJyAmJiBoYW5kbGVTZW5kTWVzc2FnZShpbnB1dCl9XG4gICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyPVwiRXNjcmliZSBhbGdvLi4uXCJcbiAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3N0eWxlcy5pbnB1dH1cbiAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gaGFuZGxlU2VuZE1lc3NhZ2UoaW5wdXQpfSBzdHlsZT17c3R5bGVzLnNlbmRCdG59PuKepDwvYnV0dG9uPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICk7XG59O1xuXG5jb25zdCBzdHlsZXMgPSB7XG4gICAgY29udGFpbmVyOiB7XG4gICAgICAgIHBvc2l0aW9uOiAnYWJzb2x1dGUnLFxuICAgICAgICB0b3A6IDAsXG4gICAgICAgIHJpZ2h0OiAwLFxuICAgICAgICB3aWR0aDogJzM1MHB4JyxcbiAgICAgICAgaGVpZ2h0OiAnMTAwJScsXG4gICAgICAgIGJhY2tncm91bmQ6ICcjMWUxZTFlJyxcbiAgICAgICAgYm9yZGVyTGVmdDogJzFweCBzb2xpZCAjMzMzJyxcbiAgICAgICAgZGlzcGxheTogJ2ZsZXgnLFxuICAgICAgICBmbGV4RGlyZWN0aW9uOiAnY29sdW1uJyxcbiAgICAgICAgYm94U2hhZG93OiAnLTVweCAwIDE1cHggcmdiYSgwLDAsMCwwLjUpJyxcbiAgICAgICAgekluZGV4OiAxMDAwXG4gICAgfSxcbiAgICBoZWFkZXI6IHtcbiAgICAgICAgcGFkZGluZzogJzEwcHggMTVweCcsXG4gICAgICAgIGJvcmRlckJvdHRvbTogJzFweCBzb2xpZCAjMzMzJyxcbiAgICAgICAgZGlzcGxheTogJ2ZsZXgnLFxuICAgICAgICBqdXN0aWZ5Q29udGVudDogJ3NwYWNlLWJldHdlZW4nLFxuICAgICAgICBhbGlnbkl0ZW1zOiAnc3RhcnQnLFxuICAgICAgICBmb250V2VpZ2h0OiAnYm9sZCcsXG4gICAgICAgIGJhY2tncm91bmQ6ICcjMjUyNTI1J1xuICAgIH0sXG4gICAgbW9kZVNlbGVjdG9yOiB7XG4gICAgICAgIGRpc3BsYXk6ICdmbGV4JyxcbiAgICAgICAgZ2FwOiAnMTBweCcsXG4gICAgICAgIGZvbnRTaXplOiAnMTBweCcsXG4gICAgICAgIG1hcmdpblRvcDogJzVweCdcbiAgICB9LFxuICAgIG1vZGU6IHtcbiAgICAgICAgY3Vyc29yOiAncG9pbnRlcicsXG4gICAgICAgIGNvbG9yOiAnIzY2NicsXG4gICAgICAgIHBhZGRpbmc6ICcycHggNnB4JyxcbiAgICAgICAgYm9yZGVyUmFkaXVzOiAnMTBweCcsXG4gICAgICAgIGJhY2tncm91bmQ6ICcjMTExJ1xuICAgIH0sXG4gICAgbW9kZUFjdGl2ZToge1xuICAgICAgICBjdXJzb3I6ICdwb2ludGVyJyxcbiAgICAgICAgY29sb3I6ICd3aGl0ZScsXG4gICAgICAgIGJhY2tncm91bmQ6ICcjMDA3YmZmJyxcbiAgICAgICAgcGFkZGluZzogJzJweCA2cHgnLFxuICAgICAgICBib3JkZXJSYWRpdXM6ICcxMHB4J1xuICAgIH0sXG4gICAgY2xvc2VCdG46IHtcbiAgICAgICAgYmFja2dyb3VuZDogJ25vbmUnLFxuICAgICAgICBib3JkZXI6ICdub25lJyxcbiAgICAgICAgY29sb3I6ICcjODg4JyxcbiAgICAgICAgZm9udFNpemU6ICcyMHB4JyxcbiAgICAgICAgY3Vyc29yOiAncG9pbnRlcidcbiAgICB9LFxuICAgIGNoYXRBcmVhOiB7XG4gICAgICAgIGZsZXg6IDEsXG4gICAgICAgIHBhZGRpbmc6ICcxNXB4JyxcbiAgICAgICAgb3ZlcmZsb3dZOiAnYXV0bycsXG4gICAgICAgIGRpc3BsYXk6ICdmbGV4JyxcbiAgICAgICAgZmxleERpcmVjdGlvbjogJ2NvbHVtbicsXG4gICAgICAgIGdhcDogJzEwcHgnXG4gICAgfSxcbiAgICBtZXNzYWdlUm93OiB7XG4gICAgICAgIGRpc3BsYXk6ICdmbGV4JyxcbiAgICAgICAgd2lkdGg6ICcxMDAlJ1xuICAgIH0sXG4gICAgYnViYmxlOiB7XG4gICAgICAgIG1heFdpZHRoOiAnODUlJyxcbiAgICAgICAgcGFkZGluZzogJzEwcHggMTVweCcsXG4gICAgICAgIGJvcmRlclJhZGl1czogJzE1cHgnLFxuICAgICAgICBmb250U2l6ZTogJzE0cHgnLFxuICAgICAgICBsaW5lSGVpZ2h0OiAnMS40J1xuICAgIH0sXG4gICAgaW5wdXRBcmVhOiB7XG4gICAgICAgIHBhZGRpbmc6ICcxNXB4JyxcbiAgICAgICAgYm9yZGVyVG9wOiAnMXB4IHNvbGlkICMzMzMnLFxuICAgICAgICBkaXNwbGF5OiAnZmxleCcsXG4gICAgICAgIGdhcDogJzhweCcsXG4gICAgICAgIGJhY2tncm91bmQ6ICcjMjUyNTI1JyxcbiAgICAgICAgYWxpZ25JdGVtczogJ2NlbnRlcidcbiAgICB9LFxuICAgIGlucHV0OiB7XG4gICAgICAgIGZsZXg6IDEsXG4gICAgICAgIGJhY2tncm91bmQ6ICcjMzMzJyxcbiAgICAgICAgYm9yZGVyOiAnbm9uZScsXG4gICAgICAgIHBhZGRpbmc6ICcxMHB4JyxcbiAgICAgICAgYm9yZGVyUmFkaXVzOiAnMjBweCcsXG4gICAgICAgIGNvbG9yOiAnd2hpdGUnLFxuICAgICAgICBvdXRsaW5lOiAnbm9uZSdcbiAgICB9LFxuICAgIHNlbmRCdG46IHtcbiAgICAgICAgYmFja2dyb3VuZDogJyMwMDdiZmYnLFxuICAgICAgICBib3JkZXI6ICdub25lJyxcbiAgICAgICAgY29sb3I6ICd3aGl0ZScsXG4gICAgICAgIHdpZHRoOiAnMzVweCcsXG4gICAgICAgIGhlaWdodDogJzM1cHgnLFxuICAgICAgICBib3JkZXJSYWRpdXM6ICc1MCUnLFxuICAgICAgICBjdXJzb3I6ICdwb2ludGVyJyxcbiAgICAgICAgZGlzcGxheTogJ2ZsZXgnLFxuICAgICAgICBhbGlnbkl0ZW1zOiAnY2VudGVyJyxcbiAgICAgICAganVzdGlmeUNvbnRlbnQ6ICdjZW50ZXInXG4gICAgfSxcbiAgICBpY29uQnRuOiB7XG4gICAgICAgIGJhY2tncm91bmQ6ICdub25lJyxcbiAgICAgICAgYm9yZGVyOiAnbm9uZScsXG4gICAgICAgIGZvbnRTaXplOiAnMTZweCcsXG4gICAgICAgIGN1cnNvcjogJ3BvaW50ZXInLFxuICAgICAgICBjb2xvcjogJyM4ODgnLFxuICAgICAgICBwYWRkaW5nOiAnNXB4J1xuICAgIH0sXG4gICAgYWN0aW9uQ2FyZDoge1xuICAgICAgICBtYXJnaW5Ub3A6ICcxMHB4JyxcbiAgICAgICAgcGFkZGluZzogJzEwcHgnLFxuICAgICAgICBiYWNrZ3JvdW5kOiAncmdiYSgyNTUsMjU1LDI1NSwwLjEpJyxcbiAgICAgICAgYm9yZGVyUmFkaXVzOiAnOHB4JyxcbiAgICAgICAgYm9yZGVyOiAnMXB4IHNvbGlkIHJnYmEoMjU1LDI1NSwyNTUsMC4yKSdcbiAgICB9LFxuICAgIGFjdGlvbkJ0bjoge1xuICAgICAgICBiYWNrZ3JvdW5kOiAnIzAwQzg1MScsXG4gICAgICAgIGJvcmRlcjogJ25vbmUnLFxuICAgICAgICBjb2xvcjogJ3doaXRlJyxcbiAgICAgICAgcGFkZGluZzogJzVweCAxNXB4JyxcbiAgICAgICAgYm9yZGVyUmFkaXVzOiAnMTVweCcsXG4gICAgICAgIGZvbnRTaXplOiAnMTJweCcsXG4gICAgICAgIGN1cnNvcjogJ3BvaW50ZXInLFxuICAgICAgICB3aWR0aDogJzEwMCUnXG4gICAgfSxcbiAgICByZWNvcmRpbmdPdmVybGF5OiB7XG4gICAgICAgIHBvc2l0aW9uOiAnYWJzb2x1dGUnLFxuICAgICAgICBib3R0b206ICc3MHB4JyxcbiAgICAgICAgbGVmdDogJzUwJScsXG4gICAgICAgIHRyYW5zZm9ybTogJ3RyYW5zbGF0ZVgoLTUwJSknLFxuICAgICAgICBiYWNrZ3JvdW5kOiAncmdiYSgwLDAsMCwwLjgpJyxcbiAgICAgICAgcGFkZGluZzogJzEwcHggMjBweCcsXG4gICAgICAgIGJvcmRlclJhZGl1czogJzIwcHgnLFxuICAgICAgICBjb2xvcjogJ3doaXRlJyxcbiAgICAgICAgdGV4dEFsaWduOiAnY2VudGVyJyxcbiAgICAgICAgekluZGV4OiAxMTAwXG4gICAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgQUlDaGF0O1xuIl0sImZpbGUiOiJDOi9Vc2Vycy9Vc3VhcmlvL0RvY3VtZW50cy90cmFlX3Byb2plY3RzL0NsZWFuTWF0ZSBBSS9zcmMvQUlDaGF0LmpzeCJ9
