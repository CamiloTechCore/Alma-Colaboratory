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

## Cambios Recientes

### 🔐 Autenticación Mejorada para Rol QA (Última Actualización)
- **Eliminación de Selector LDAP**: Los usuarios QA ya no necesitan seleccionar su usuario LDAP manualmente
- **Autenticación Automática**: El sistema usa automáticamente el usuario autenticado para las búsquedas
- **Filtrado Inteligente de Equipos**: Solo se muestran equipos donde el QA tiene casos pendientes
- **Selección Automática de Equipo**: Si el QA tiene un solo equipo, se selecciona automáticamente
- **Interfaz Simplificada**: Se oculta el selector de LDAP y se muestra un mensaje informativo
- **Seguridad Reforzada**: Los QA solo pueden ver y gestionar sus propios casos asignados

### 📊 Sistema de Métricas en Tiempo Real (Nueva Funcionalidad)
- **Tarjetas de Estado**: Visualización de métricas basadas en la columna ESTADO_ALMA
- **Categorías de Métricas**:
  - **Pendientes**: Suma de "Pendiente" + "Error en registro"
  - **Realizados**: Casos marcados como "Realizado"
  - **Aperturados**: Casos marcados como "Aperturado"
- **Comportamiento por Rol**:
  - **QA**: Métricas específicas del usuario autenticado
  - **Administrador**: Métricas globales de toda la base de datos + filtros dinámicos
  - **QS**: Sin métricas (solo pestaña QA)
- **Filtros Dinámicos (Administrador)**:
  - Métricas se actualizan automáticamente con cada filtro aplicado
  - Filtros soportados: Usuario LDAP, Equipo, Sample Date, Canal, Proceso, Tipo de Acción, Oficina
  - Métricas globales cuando no hay filtros aplicados
- **Actualización Automática**: Las métricas se actualizan automáticamente al:
  - Seleccionar usuario/equipo
  - Aplicar/limpiar filtros (Administrador)
  - Finalizar un caso
  - Abrir un enlace
  - Refrescar la pestaña
- **Diseño Responsivo**: Tarjetas con gradientes y animaciones hover
- **Animación Suave**: Transición fluida de números sin interrumpir la visualización

### 🚀 Optimizaciones de Rendimiento (Anterior)
- **Sistema de Caché Inteligente**:
  - Caché de Asignaciones: 5 minutos para datos de casos
  - Caché de Equipos QA: 10 minutos para equipos específicos
  - Caché de Registros QA: 5 minutos para datos de seguimiento
  - Caché de Usuarios LDAP: 6 horas (mantenido)
- **Optimización de Lectura de Datos**:
  - Cambio de `getDisplayValues()` a `getValues()` para mejor rendimiento
  - Procesamiento optimizado de datos en el backend
  - Limpieza automática de caché cuando se actualizan datos
- **Tiempos de Carga Mejorados**:
  - Primera carga: 15-30 segundos → **5-10 segundos**
  - Cargas subsecuentes: **1-3 segundos** (con caché)
  - Usuarios QA: **2-5 segundos** (datos filtrados)

### 👤 Funcionalidad Específica para Usuarios QA
- **Autenticación Automática**: Los usuarios QA no necesitan seleccionar su LDAP manualmente
- **Filtro LDAP Oculto**: El campo de selección de LDAP se oculta automáticamente para usuarios QA
- **Carga de Equipos Inteligente**: Solo se muestran equipos donde el QA tiene casos pendientes
- **Selección Automática**: Si el QA tiene un solo equipo, se selecciona automáticamente
- **Mensaje Informativo**: Se muestra "Viendo solo tus casos asignados" para claridad
- **Seguridad Mejorada**: Los QA solo ven sus propios casos asignados
- **Búsqueda Automática**: La búsqueda se genera automáticamente desde el grid de usuario autenticado

### 🛠️ Herramientas de Administración
- **Botón "Limpiar Caché"**: Disponible solo para administradores
  - Permite limpiar toda la caché del sistema
  - Fuerza recarga de datos desde las hojas de cálculo
  - Útil cuando se actualizan datos importantes
- **Gestión Automática de Caché**:
  - Limpieza automática al finalizar casos
  - Invalidación inteligente de caché por equipo
  - Monitoreo de rendimiento integrado

### 📊 Sistema de Notificaciones
- **Notificaciones en Tiempo Real**: Sistema completo de notificaciones para usuarios QA y QS
- **Envío Automático**: Las notificaciones se envían cuando un Administrador o QS responde a consultas
- **Prevención de Duplicados**: Sistema para evitar notificaciones repetidas

### 🔄 Gestión de Caché de Usuarios
- **Botón "Actualizar Usuarios"**: Disponible solo para administradores
- **Limpieza de Caché**: Permite limpiar la caché de usuarios LDAP
- **Recarga Forzada**: Fuerza una recarga desde la hoja de cálculo

### 🎨 Mejoras en la Interfaz de Usuario
- **Botón de Actualización**: Por pestaña con indicador visual de carga
- **Mejor Organización**: Controles y formularios más intuitivos
- **Estilos Mejorados**: Multi-select y validaciones optimizadas
- **Carga Progresiva**: Procesamiento de datos en chunks para mejor rendimiento
- **Medición de Tiempo**: Monitoreo del tiempo de carga en consola

### 📈 Funcionalidades de Seguimiento QA Mejoradas
- **Sistema de Estados Robusto**: Para registros QA
- **Validación Mejorada**: Campos obligatorios más estrictos
- **Manejo de Fechas**: Mejor gestión de timestamps
- **Filtrado por Roles**: Más preciso (QA ve solo sus registros, QS ve registros marcados como vistos)
- **Paginación Optimizada**: Para grandes volúmenes de datos

### 🔒 Seguridad y Validación
- **Validación de Contraseñas**: Para todos los roles (Administrador, QA, QS)
- **Verificación Estricta**: Permisos por rol
- **Mejor Manejo de Errores**: Logging mejorado
- **Control de Acceso**: Restricciones específicas por rol

## Configuración de Caché

| Tipo de Datos | Tiempo de Caché | Razón |
|---------------|-----------------|-------|
| Asignaciones | 5 minutos | Datos que cambian frecuentemente |
| Equipos QA | 10 minutos | Datos relativamente estables |
| Registros QA | 5 minutos | Datos que se actualizan regularmente |
| Usuarios LDAP | 6 horas | Datos muy estables |

## Funciones de Gestión de Caché

### Backend (Codigo.gs)
- `clearAssignmentsCache(team)`: Limpia caché específica por equipo
- `clearAllCache()`: Limpia toda la caché del sistema
- Limpieza automática al finalizar casos

### Frontend (Index.html)
- `handleClearAllCache()`: Maneja la limpieza de caché desde la interfaz
- Monitoreo de tiempo de carga
- Procesamiento en chunks para mejor rendimiento

## Recomendaciones de Uso

### Para Administradores
1. **Monitorear logs** para identificar cuellos de botella
2. **Usar "Limpiar Caché"** cuando se actualicen datos importantes
3. **Ajustar tiempos de caché** según el uso real si es necesario

### Para Usuarios QA
1. **Experiencia simplificada**: No necesitan seleccionar su LDAP
2. **Carga más rápida**: Solo ven sus casos asignados
3. **Equipos automáticos**: Se cargan solo los equipos relevantes

### Para Usuarios QS
1. **Acceso restringido**: Solo ven registros marcados como vistos
2. **Notificaciones automáticas**: Reciben alertas cuando hay respuestas

## Rendimiento Esperado

### Tiempos de Carga Típicos
- **Primera carga (sin caché)**: 5-10 segundos
- **Cargas subsecuentes (con caché)**: 1-3 segundos
- **Usuarios QA (datos filtrados)**: 2-5 segundos
- **Actualización de datos**: 1-2 segundos

### Optimizaciones Implementadas
✅ **Caché inteligente** para datos frecuentemente consultados  
✅ **Filtrado eficiente** en el backend  
✅ **Carga progresiva** en el frontend  
✅ **Gestión automática** de caché  
✅ **Herramientas de administración** para control manual  

---

Para cualquier ajuste adicional, personalización o reporte de errores, contactar al desarrollador o administrador del sistema.