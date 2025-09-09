# Changelog - Golf App

## v1.2 - 2025-01-09

### 🔧 Correcciones Críticas
- **[VIDEOS ADMIN]** Solucionado problema de persistencia de videos para administradores
  - Videos ya no aparecen y desaparecen después de refrescar la página
  - Eliminación mejorada con sincronización forzada desde Firebase
  - Resueltas condiciones de carrera entre autenticación y carga de videos
  - Videos eliminados ya no reaparecen por conflictos de sincronización
  - Mejorado manejo de permisos cuando no se puede eliminar de Firebase

### ✨ Nuevas Funcionalidades  
- **[EXPORTACIÓN CSV]** Agregado botón de descarga CSV en listado de alumnos
  - Exporta todos los campos del formulario (20 campos completos)
  - Formato CSV compatible con Excel con codificación UTF-8
  - Escapado correcto de caracteres especiales y comas
  - Disponible en `/alumnos.html` solo para administradores

### 🎨 Mejoras de UX
- **[VIDEOS]** Removido modal molesto después de agregar videos
  - Ya no aparece ventana emergente con instrucciones de consola
  - Código de sincronización sigue disponible en consola para desarrolladores
  - Flujo más limpio: agregar video → mensaje de éxito → listo

### 🔧 Mejoras Técnicas
- Re-renderizado automático de videos después de determinar estado admin
- Sincronización forzada entre localStorage y Firebase para admin users
- Mejor logging y debugging para operaciones de video
- Optimización de consultas de eliminación de videos

---

## v1.1 - Anterior

### Funcionalidades Base
- Sistema de registro de estudiantes con Firebase Firestore
- Autenticación de usuarios con Firebase Auth
- Gestión de videos para administradores
- Generador de códigos QR
- Sistema de notas por alumno (solo administradores)
- Interfaz responsive con Tailwind CSS
- Navegación por pestañas
- Funcionalidades diferenciadas por rol (usuario/admin)

---

**Desarrollado para gestión de estudiantes de golf** 🏌️‍♂️