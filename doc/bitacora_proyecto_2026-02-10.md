# Bitácora del Proyecto CleanMate AI

## Historial de Cambios y Decisiones

### [2026-02-10] Inicio del Registro Formal
- **Creación de Estructura de Documentación**: Se estableció la carpeta `doc/` para centralizar la memoria del proyecto.
- **Resolución de Conflictos Python**: Se detectó contaminación de paquetes globales. Se procedió a crear un entorno virtual (`venv`) para aislar las dependencias del proyecto.
- **Reconstrucción del Ejecutable**: Se solucionó el error crítico `pyimod02_importers` limpiando builds corruptos y reinstalando PyInstaller en un entorno limpio.
- **Decisión de Arquitectura API**: Se seleccionó la **Opción B (Backend Proxy)** para la gestión de la API Key de Grok. Esto permite que los usuarios finales usen la IA sin configurar sus propias claves, centralizando la seguridad en un servidor intermedio.
- **Estrategia de Distribución**: Se acordó crear una página estática para GitHub Pages (integración con Wily devs) para la descarga del `.exe`.

## Estado Actual
- **Core**: Funcional y estable.
- **Seguridad**: Modo `dry-run` reforzado para afectar a todos los módulos.
- **Infraestructura**: Migrando a entorno virtual aislado.
