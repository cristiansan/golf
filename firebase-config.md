# Configuración de Firebase Authentication

## Pasos para habilitar la autenticación en tu proyecto:

### 1. Ir a Firebase Console
- Ve a [https://console.firebase.google.com/](https://console.firebase.google.com/)
- Selecciona tu proyecto: `golf-f3b84`

### 2. Habilitar Authentication
- En el menú lateral izquierdo, haz clic en **"Authentication"**
- Haz clic en **"Get started"**

### 3. Configurar métodos de inicio de sesión

#### Email/Password (Recomendado para empezar)
- En la pestaña **"Sign-in method"**
- Haz clic en **"Email/Password"**
- Activa **"Enable"**
- Marca **"Email link (passwordless sign-in)"** si quieres (opcional)
- Haz clic en **"Save"**

#### Google (Opcional)
- Haz clic en **"Google"**
- Activa **"Enable"**
- Selecciona un **"Project support email"**
- Haz clic en **"Save"**

### 4. Configurar dominio autorizado (opcional)
- En la pestaña **"Settings"**
- En **"Authorized domains"**, agrega tu dominio si lo tienes
- Para desarrollo local, `localhost` ya está incluido

### 5. Reglas de Firestore (opcional pero recomendado)
Ve a **"Firestore Database"** → **"Rules"** y actualiza las reglas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuarios pueden leer/escribir solo sus propios datos
    match /usuarios/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Formularios: solo usuarios autenticados pueden crear
    match /formularios/{document} {
      allow read, write: if request.auth != null;
    }

    // Reservas: usuarios autenticados pueden crear y leer todas las reservas
    match /reservas/{document} {
      allow read, write: if request.auth != null;
    }

    // Videos públicos: lectura pública, escritura autenticada
    match /videos_publicos/{document} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Config: solo lectura pública
    match /config/{document} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Funcionalidades implementadas:

✅ **Login con email/password**  
✅ **Registro de nuevos usuarios**  
✅ **Login con Google**  
✅ **Recuperación de contraseña**  
✅ **Logout**  
✅ **Persistencia de sesión**  
✅ **Validación de formularios**  
✅ **Manejo de errores**  
✅ **UI responsive**  
✅ **Sistema de admin automático**  
✅ **Acceso a Alumnos y Agregar Videos para admins**  

## Uso:

1. **Crear cuenta**: Los usuarios pueden registrarse con email y contraseña
2. **Iniciar sesión**: Con email/password o Google
3. **Recuperar contraseña**: Envío de email de recuperación
4. **Cerrar sesión**: Botón en el header cuando están logueados

## Seguridad:

- Las contraseñas se almacenan de forma segura en Firebase
- Validación de formularios en frontend y backend
- Reglas de Firestore para proteger datos
- Autenticación requerida para operaciones sensibles

## Sistema de Admin:

### Cómo funciona:
1. **Campo admin**: Los usuarios con `admin: true` en su perfil tienen acceso automático a las funciones de administrador
2. **Verificación automática**: Al hacer login, el sistema verifica automáticamente si el usuario es admin
3. **UI dinámica**: Las opciones de admin aparecen/desaparecen según el estado del usuario

### Funciones de admin:
- **Ver sección "Alumnos"** en el menú lateral
- **Ver sección "Agregar Links"** para agregar videos de YouTube
- **Acceso completo** a todas las funcionalidades

### Hacer admin a un usuario:
```javascript
// En la consola del navegador (solo para desarrollo)
makeUserAdmin('email@ejemplo.com')
```

### Estructura en Firestore:
```javascript
// Colección: usuarios
{
  uid: "user_id_from_firebase_auth",
  nombre: "Nombre del Usuario",
  email: "email@ejemplo.com",
  admin: true,  // ← Campo que determina si es admin
  createdAt: timestamp
}
```

## Notas:

- El sistema mantiene la funcionalidad existente de autenticación anónima para formularios
- Los usuarios logueados tienen acceso completo a todas las funcionalidades
- Los usuarios admin ven automáticamente las opciones de administrador
- La sesión persiste entre recargas de página
- Compatible con el sistema de admin existente
