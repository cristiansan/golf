## Golf App — README (v0.5)

![Preview](https://github.com/user-attachments/assets/4066f40b-04f7-41e3-84f5-1dd0614d0e73)
![Preview]https://github.com/user-attachments/assets/edd333a2-8c30-4152-9a40-2523fc60ef62)



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
  - `admin_key_hash` = SHA‑256 de "5991" (string en hex de 64 chars).

3) Reglas de Firestore
- Pego y publico estas reglas (conservo mis reglas de `formularios` y añado el bloque `config/admin` y un cierre por defecto):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Clave de administrador
    match /config/admin {
      allow read: if request.auth != null; // requiere sesión (anónima ok)
      allow write: if false;               // no editable desde el cliente
    }

    // Formularios
    match /formularios/{docId} {
      allow read: if true; // o if request.auth != null; si quiero restringir
      allow create: if request.auth != null
        && request.resource.data.keys().hasOnly([
          'nombre','nacimiento','edad','domicilio','ciudad','nacionalidad',
          'telefono','email','ocupacion','alergias','lesiones','condicion',
          'apto','apto_vto','apto_file_name','apto_file_url','apto_file_path','apto_file_size',
          'anios','handicap','frecuencia','club','modalidad','clases_previas',
          'createdAt'
        ]);
      allow update, delete: if false;
    }

    // Bloqueo por defecto del resto
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

4) Reglas de Storage (opcional, si subo aptos)
``` 
service firebase.storage {
  match /b/{bucket}/o {
    match /aptos/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.resource.size < 5 * 1024 * 1024;
    }
    match /{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

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


