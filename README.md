# ALMA™ - Sistema de Gestión y Control

## Resumen del Proyecto
ALMA™ es una aplicación desarrollada con Google Apps Script y frontend web, orientada a la gestión operativa y seguimiento de casos y métricas de calidad (QA) para equipos de trabajo. Utiliza Google Sheets como base de datos principal, permitiendo la consulta, registro y visualización de información relevante para usuarios con diferentes roles (Administrador, QA, QS).

### Funcionalidades principales
- **Validación de usuarios** contra un directorio almacenado en Google Sheets.
- **Visualización de métricas operativas**: Total de casos asignados, casos del día, pendientes, aperturados y TMO promedio.
- **Consulta y registro de casos QA** con seguimiento y edición.
- **Gestión de asignaciones** por usuario y equipo.
- **Obtención exacta del valor TMO** desde la hoja `TMO_GeneralMetrics` según el usuario autenticado.

## Estructura del Backend
- El backend está implementado en Google Apps Script (`AppsScript/Code.gs`).
- La base de datos principal es un Google Sheets con varias hojas: Asignaciones, QA, Directorio de Usuarios y TMO_GeneralMetrics.
- El frontend es una SPA en HTML+JS que interactúa con Apps Script mediante `google.script.run`.

## Cambios importantes
- **Obtención exacta del TMO**: El backend ahora retorna el valor de la columna `TMO` de la hoja `TMO_GeneralMetrics` exactamente como se muestra en la hoja, sin conversiones ni formateos adicionales.
- **Eliminación de funciones no utilizadas**: Se eliminaron utilidades administrativas y de mantenimiento que no aportaban a la funcionalidad principal.
- **Optimización de la búsqueda de columnas**: Se mejoró la función de obtención de índices de columna para mayor robustez.
- **Validación estricta de usuario**: Solo usuarios activos y con roles permitidos pueden acceder al sistema.

---

Para cualquier ajuste adicional, personalización o reporte de errores, contactar al desarrollador o administrador del sistema.