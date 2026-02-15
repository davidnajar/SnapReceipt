# SnapReceipt

SnapReceipt es una aplicación móvil desarrollada con Ionic/Angular que permite capturar fotos de tickets y recibos, extraer datos automáticamente usando inteligencia artificial (Gemini 1.5 Flash), y almacenarlos en una base de datos (Supabase).

## Características

- 🔐 **Autenticación**: Sistema completo de registro e inicio de sesión con Supabase Auth
- 📸 **Captura de Recibos**: Usa la cámara nativa del dispositivo para capturar fotos de tickets
- 🤖 **Extracción Automática**: Utiliza Gemini 1.5 Flash AI para extraer datos estructurados (fecha, total, comercio, items, categoría)
- 💾 **Almacenamiento Seguro**: Guarda los datos y las imágenes en Supabase con aislamiento por usuario
- 🔑 **API Keys Personales**: Cada usuario configura su propia API key de Gemini
- ⚙️ **Configuración**: Página de ajustes para gestionar preferencias y API keys
- 🛡️ **Seguridad**: Row Level Security (RLS) garantiza que cada usuario solo acceda a sus propios datos
- 📱 **Diseño Responsive**: Interfaz moderna y adaptable con componentes Ionic
- ⚡ **Rendimiento**: Optimizado para procesamiento rápido de imágenes

## Stack Tecnológico

- **Framework**: Ionic 8 + Angular 18
- **Lenguaje**: TypeScript
- **Capacitor**: Para acceso a funcionalidades nativas (cámara)
- **API de IA**: Google Gemini 1.5 Flash
- **Base de Datos**: Supabase (PostgreSQL + Storage)

## Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- [Node.js](https://nodejs.org/) (v18 o superior)
- [npm](https://www.npmjs.com/) (v9 o superior)
- [Ionic CLI](https://ionicframework.com/docs/cli) - Instalar con: `npm install -g @ionic/cli`
- Una cuenta de [Google AI Studio](https://makersuite.google.com/) para obtener la API key de Gemini
- Una cuenta de [Supabase](https://supabase.com/) para la base de datos y almacenamiento

## Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/davidnajar/SnapReceipt.git
   cd SnapReceipt
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno de Supabase**

   Edita el archivo `src/environments/environment.ts` y configura tus credenciales de Supabase:

   ```typescript
   export const environment = {
     production: false,
     gemini: {
       apiKey: 'YOUR_GEMINI_API_KEY_HERE'  // No es necesario configurar aquí, cada usuario usará su propia key
     },
     supabase: {
       url: 'TU_URL_DE_SUPABASE_AQUI',
       anonKey: 'TU_ANON_KEY_DE_SUPABASE_AQUI'
     }
   };
   ```
   
   **Nota**: La API key de Gemini ya no se configura aquí. Cada usuario configurará su propia API key en la aplicación después de registrarse.

4. **Configurar Supabase**

   a. Crea un nuevo proyecto en [Supabase](https://supabase.com/dashboard)
   
   b. Aplica las migraciones de base de datos:
   - Ve a la carpeta `supabase/migrations/`
   - Ejecuta cada archivo SQL en orden (001, 002, 003, 004, 005) en el SQL Editor de Supabase
   - Ver instrucciones detalladas en [supabase/README.md](supabase/README.md)
   
   c. Crea un bucket de Storage llamado `receipts`:
   - Ve a Storage en el dashboard de Supabase
   - Crea un nuevo bucket llamado `receipts`
   - Las políticas de acceso se configuran automáticamente mediante las migraciones

   d. Habilita la autenticación por email:
   - Ve a Authentication > Providers en el dashboard de Supabase
   - Asegúrate de que "Email" esté habilitado

5. **Registro y Configuración de Usuario**

   a. Registra una cuenta en la aplicación
   
   b. Ve a la página de Settings en la aplicación
   
   c. Obtén tu API Key de Gemini:
   - Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Crea una nueva API key
   - **Importante**: Cada usuario necesita su propia API key de Gemini
   
   d. Ingresa tu API key en la página de Settings de la aplicación
   
   e. Para instrucciones detalladas, consulta la página "Cómo obtener Gemini API Key" dentro de la aplicación

## Comandos de Desarrollo

### Ejecutar en el navegador
```bash
npm start
# o
ionic serve
```

La aplicación se abrirá en `http://localhost:8100`

### Compilar para producción
```bash
npm run build
# o
ionic build --prod
```

### Ejecutar pruebas
```bash
npm test
```

### Ejecutar linter
```bash
npm run lint
```

## Desarrollo Móvil

### Agregar plataformas nativas

**iOS** (requiere macOS):
```bash
ionic cap add ios
ionic cap sync ios
ionic cap open ios
```

**Android**:
```bash
ionic cap add android
ionic cap sync android
ionic cap open android
```

### Sincronizar cambios
Después de hacer cambios en el código web:
```bash
ionic cap sync
```

### Ejecutar en dispositivo/emulador
```bash
# iOS
ionic cap run ios

# Android
ionic cap run android
```

## Estructura del Proyecto

```
SnapReceipt/
├── src/
│   ├── app/
│   │   ├── guards/            # Guards de autenticación
│   │   ├── home/              # Página principal con FAB y captura
│   │   ├── login/             # Página de inicio de sesión
│   │   ├── register/          # Página de registro
│   │   ├── settings/          # Página de configuración (API key)
│   │   ├── gemini-guide/      # Guía para obtener API key
│   │   ├── models/            # Interfaces TypeScript (Receipt)
│   │   ├── services/          # Servicios (Camera, Gemini, Supabase)
│   │   ├── app.component.*    # Componente raíz
│   │   ├── app.module.ts      # Módulo principal
│   │   └── app-routing.module.ts
│   ├── assets/                # Recursos estáticos
│   ├── environments/          # Configuración de entornos
│   ├── theme/                 # Estilos globales e Ionic
│   ├── global.scss            # Estilos globales
│   ├── index.html             # HTML principal
│   ├── main.ts               # Punto de entrada
│   └── polyfills.ts          # Polyfills
├── supabase/
│   ├── migrations/            # Migraciones SQL
│   └── README.md             # Documentación de migraciones
├── capacitor.config.ts        # Configuración de Capacitor
├── angular.json              # Configuración de Angular
├── package.json              # Dependencias
└── tsconfig.json            # Configuración de TypeScript
```

## Flujo de Usuario

1. El usuario abre la aplicación y ve la pantalla de login
2. Si no tiene cuenta, se registra con email y contraseña
3. Después de registrarse/iniciar sesión, accede a la pantalla principal
4. Configura su API key de Gemini en la página de Configuración (primer uso)
5. Regresa a la pantalla principal y ve un botón FAB (Floating Action Button) en la esquina inferior derecha
6. Presiona el botón FAB con el ícono de cámara
7. Se abre la cámara nativa del dispositivo
8. Captura una foto del ticket/recibo
6. La aplicación muestra un indicador de carga mientras procesa
7. La imagen se envía a Gemini AI para extraer los datos
8. Se muestra un diálogo de confirmación con los datos extraídos
9. Si el usuario confirma, la imagen se sube a Supabase Storage
10. Los datos se guardan en la tabla de Supabase
11. Se muestra un mensaje de éxito

## Modelo de Datos

### Receipt Interface
```typescript
interface Receipt {
  id?: string;                 // UUID generado por Supabase
  date: string;               // Fecha en formato YYYY-MM-DD
  total: number;              // Monto total
  merchant: string;           // Nombre del comercio
  items?: ReceiptItem[];      // Array de items (opcional)
  category?: string;          // Categoría (groceries, restaurant, etc.)
  imageUrl?: string;          // URL de la imagen en Supabase Storage
  createdAt?: Date;           // Fecha de creación
}

interface ReceiptItem {
  name: string;               // Nombre del producto
  price: number;              // Precio unitario
  quantity: number;           // Cantidad
}
```

## Servicios

### CameraService
Gestiona la captura de fotos usando Capacitor Camera:
- `capturePhoto()`: Abre la cámara y captura una foto
- `checkCameraPermissions()`: Verifica permisos de cámara
- `requestCameraPermissions()`: Solicita permisos de cámara

### GeminiService
Maneja la comunicación con Google Gemini AI:
- `extractReceiptData(base64Image)`: Envía imagen y recibe datos estructurados en JSON
- `isConfigured()`: Verifica si la API key está configurada

### SupabaseService
Gestiona el almacenamiento en Supabase:
- `uploadReceiptImage(base64Image, fileName)`: Sube imagen a Storage
- `saveReceipt(receipt)`: Guarda datos en la tabla
- `getReceipts()`: Obtiene todos los recibos guardados
- `isConfigured()`: Verifica si las credenciales están configuradas

## Solución de Problemas

### La cámara no se abre
- Verifica que los permisos de cámara estén concedidos
- En iOS, asegúrate de tener la descripción de privacidad en Info.plist
- En Android, verifica los permisos en AndroidManifest.xml

### Error al extraer datos con Gemini
- Verifica que tu API key de Gemini sea válida
- Asegúrate de tener conexión a internet
- Revisa la consola del navegador para mensajes de error detallados

### Error al guardar en Supabase
- Verifica que las credenciales de Supabase sean correctas
- Asegúrate de que la tabla `receipts` esté creada
- Verifica que el bucket `receipts` exista y sea público
- Revisa las políticas de Row Level Security (RLS) si están activas

### Error de compilación
- Elimina `node_modules` y `package-lock.json`, luego ejecuta `npm install`
- Limpia el caché de Ionic: `ionic repair`
- Verifica que tengas las versiones correctas de Node.js y npm

## Próximas Características

- [ ] Lista de recibos guardados
- [ ] Búsqueda y filtrado de recibos
- [ ] Edición manual de datos extraídos
- [ ] Estadísticas y gráficos de gastos
- [ ] Exportación a PDF/CSV
- [ ] Modo offline con sincronización
- [ ] Soporte para múltiples idiomas
- [ ] Compartir recibos con otros usuarios

## Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Haz fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crea un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## Contacto

- **Autor**: David Najar
- **GitHub**: [@davidnajar](https://github.com/davidnajar)
- **Repositorio**: [SnapReceipt](https://github.com/davidnajar/SnapReceipt)

## Agradecimientos

- [Ionic Framework](https://ionicframework.com/)
- [Angular](https://angular.io/)
- [Capacitor](https://capacitorjs.com/)
- [Google Gemini AI](https://ai.google.dev/)
- [Supabase](https://supabase.com/)
