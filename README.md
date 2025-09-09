## Golf App — README (v1.2)

![Menu User](https://github.com/user-attachments/assets/736d311e-ee49-4129-9dca-334949de6ab3)
![Menu Admin](https://github.com/user-attachments/assets/edd333a2-8c30-4152-9a40-2523fc60ef62)

![Generador de QR](https://github.com/user-attachments/assets/bf98850e-cbbf-43fa-8380-613853a44caa)
![Agregar videos](https://github.com/user-attachments/assets/06a64f17-b78d-488d-bc3d-d723fa33fc67)


### v1.2
- Guardado del formulario en Firestore con creación/actualización, `ownerUid` y timestamps.
- Confirmación al guardar datos.
- Validación manual del formulario (pestañas ocultas) y `novalidate` en el form.
- Prellenado completo al seleccionar alumno (nacimiento, domicilio, ciudad, selects y textareas).
- Eliminado botón “Cargar demo” y lógica asociada.

### v1.0
- Edición de alumnos desde listado: prellenado del formulario y permanencia en la sección correspondiente.
- Guardado del formulario con serverTimestamp, ownerUid y distinción crear/actualizar; exclusión de archivos del payload.
- Compatibilidad y permisos Firestore: creación/actualización del usuario admin en `usuarios` con `role: 'admin'`.
- Ajustes de reglas para permitir edición por admin/propietario y nuevos campos (modalidad_otro, updatedAt, ownerUid).
- UI: overlay de login simplificado retirando textos redundantes; correcciones de errores (función no definida, permisos).

### v0.5
- Implementé login de administrador tocando el logo, validando la clave desde Firebase (Firestore). Acepto `admin_key` en texto plano o `admin_key_hash` (SHA-256).
- Reorganicé el menú: por defecto muestro Formulario, Videos y QR. Al loguearme como admin aparece el bloque “Admin” con “Agregar Links” y “Alumnos”.
- Creé la página `alumnos.html` con listado alfabético. Al tocar un alumno, completo automáticamente el formulario en `index.html` y lo muestro.
- Añadí la sección “Videos” (solo lectura) que muestra el listado de videos. “Agregar Links” quedó solo para admin (añadir/eliminar), el resto no puede editar ni borrar.
- En la sección de QR centré los botones y agregué “Compartir”: comparto el QR (imagen) y el link. Si el navegador no soporta archivos, comparto el link y hago fallback copiando el link y abriendo la imagen.
- Activé `experimentalAutoDetectLongPolling` en Firestore para mejorar compatibilidad de red y evitar errores 400 del canal WebChannel.
- Subí la versión visible a v0.5 y agregué scroll en el changelog para ver contenido largo.
- Limpié Tailwind local: uso CDN, así que puedo borrar `node_modules`, `package.json` y `package-lock.json` sin romper nada.

### Cómo correr el proyecto
- No necesito build. Abro `index.html` en el navegador (por ejemplo, con GitHub Pages o un servidor estático simple).

### Configuración de Firebase (imprescindible)
1) Autenticación
- Habilito “Anonymous” en Authentication → Sign-in method.
- En Authentication → Settings → Authorized domains, agrego mi dominio (por ejemplo `cristiansan.github.io` y `localhost`).

2) Firestore: documento con la clave de admin
- Creo el documento `config/admin` y le agrego UNO de estos campos:
  - `admin_key` = "5991" (string, recomendado para empezar), o
  
### Cómo uso el modo Admin
- Abro el menú lateral y toco el logo. Ingreso la clave. Si coincide con Firebase, quedo logueado como admin.
- Al estar como admin, veo el bloque “Admin” con “Agregar Links” y “Alumnos”.

### Cómo funcionan Videos y Agregar Links
- “Videos” muestra los videos en modo solo lectura. Puedo abrirlos pero no editarlos, borrarlos ni compartirlos desde ahí.
- “Agregar Links” (solo admin) me pide la clave para añadir. El borrado también está protegido.
- Hoy el listado de videos se guarda en el almacenamiento local del navegador; si quiero, puedo migrarlo a Firestore para compartirlos entre dispositivos.

### Cómo funciona Alumnos
- En `alumnos.html` veo el listado alfabético de alumnos cargados (colección `formularios`).
- Si toco un nombre, vuelvo a `index.html` y completo automáticamente el formulario con sus datos.

### Estructura mínima de archivos
- `index.html`, `main.js`, `styles.css`
- `alumnos.html`, `alumnos.js`
- `logo.jpeg`
- `vendor/qrcode.min.js`

### Changelog
- v0.5: Admin por logo y clave en Firebase; bloque Admin en menú; Alumnos con prellenado de formulario; Videos solo lectura; QR compartir + botones centrados; mejoras de compatibilidad Firestore; versión visible y scroll en changelog.
- v0.4: Guardado de formularios en Firestore, subida de apto a Storage, autenticación anónima, mejoras de UI.
- v0.3: Cálculo automático de edad y ajustes de campos.
- v0.2: Simplificación de Links y seguridad básica.
- v0.1: Migración de estilos y organización inicial.


