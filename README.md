# ✨ CleanMate AI - Optimización Nativa con Inteligencia Artificial

![CleanMate AI Logo](web/assets/logo.svg)

> **"Tu PC más inteligente, rápido y seguro."**

**CleanMate AI** no es solo otro limpiador de archivos. Es un **agente de mantenimiento autónomo** potenciado por **Grok AI** que entiende el contexto de tu sistema Windows. Combina algoritmos de limpieza profunda con diagnósticos predictivos de Inteligencia Artificial para mantener tu equipo en estado óptimo sin intervención humana.

---

## 🚀 Características Principales

### 🧠 Inteligencia Artificial Nativa
- **Diagnóstico Contextual:** Analiza logs y patrones de uso para sugerir optimizaciones reales, no genéricas.
- **Consultas a Grok:** Integración directa con la API de Grok (xAI) para interpretar errores del sistema y ofrecer soluciones en lenguaje natural.

### 🛡️ Seguridad "Safe-Core"
- **Integridad Garantizada:** NUNCA elimina un archivo sin validación previa.
- **Modo Simulación (Dry-Run):** Previsualiza exactamente qué bytes se liberarán antes de tocar el disco.
- **Protección de Datos:** Limpia cachés de navegadores (Chrome, Edge, Brave, Firefox) preservando cookies de sesión y contraseñas.

### ⚡ Rendimiento Adaptativo
- **Limpieza Profunda:** Elimina temporales, logs antiguos, volcados de memoria y residuos de actualizaciones de Windows.
- **Backend Proxy Seguro:** Arquitectura moderna con servidor intermedio para proteger tus claves de API.
- **Monitorización de Recursos:** Vigila CPU y RAM en tiempo real para ejecutar tareas pesadas solo cuando el PC está inactivo.

---

## 🛠️ Instalación y Uso

### Opción A: Usuario Final (Recomendado)
Simplemente descarga el ejecutable portable desde nuestra web o la sección de [Releases](https://github.com/wilycol/CleanMateAI/releases).
1. Ejecuta `CleanMateAI.exe`.
2. El agente analizará tu sistema y esperará tu confirmación.

### Opción B: Desarrolladores (Código Fuente)

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/wilycol/CleanMateAI.git
   cd CleanMateAI
   ```

2. **Crear entorno virtual (Opcional pero recomendado):**
   ```bash
   python -m venv venv
   .\venv\Scripts\activate
   ```

3. **Instalar dependencias:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Ejecutar en modo desarrollo:**
   ```bash
   python cleanmate.py --dry-run
   ```

---

## 🏗️ Arquitectura del Proyecto

El sistema consta de tres pilares fundamentales:

1.  **Core (Python):** Scripts modulares (`cleanmate.py`, `temp_cleaner.py`) que interactúan con la API de Windows.
2.  **Backend (Flask):** Un servidor proxy (`backend/server.py`) que gestiona las peticiones a la IA de forma segura.
3.  **Frontend (Web):** Landing page estática (`web/index.html`) para distribución y documentación.

---

## 🤝 Contribuir
Este proyecto es de código abierto. Si tienes ideas para mejorar la heurística de limpieza o nuevos prompts para la IA:
1. Haz un Fork.
2. Crea una rama (`git checkout -b feature/nueva-idea`).
3. Envía un Pull Request.

---

**Desarrollado con ❤️ y 🤖 por [Tu Nombre/Equipo]**
*Versión 1.0.0 | Compatible con Windows 10/11*