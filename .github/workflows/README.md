# GitHub Actions Workflows

Este directorio contiene los workflows de GitHub Actions para el proyecto SnapReceipt.

## Workflows Disponibles

### 1. Angular Build (`angular-build.yml`)

**Propósito**: Compila la aplicación Angular automáticamente en cada push.

**Triggers**:
- Push a las ramas: `main`, `master`, `develop`
- Pull requests a las ramas: `main`, `master`, `develop`

**Características**:
- Ejecuta en múltiples versiones de Node.js (18.x, 20.x) para asegurar compatibilidad
- Instala dependencias con `npm ci`
- Ejecuta el linter (`npm run lint`)
- Compila la aplicación Angular (`npm run build`)
- Sube los artefactos de compilación (carpeta `www/`) para descargar

**Artefactos**:
- Nombre: `angular-build-[node-version]`
- Ubicación: Carpeta `www/`
- Retención: 7 días

### 2. Build Android APK (`android-build.yml`)

**Propósito**: Compila el APK de Android bajo demanda.

**Triggers**:
- Manual (workflow_dispatch) desde la pestaña "Actions" en GitHub

**Parámetros**:
- `build_type`: Tipo de compilación
  - `debug`: APK de debug (por defecto)
  - `release`: APK de release (requiere firma)

**Características**:
- Configura Node.js 20.x
- Configura Java 17 y Android SDK
- Instala dependencias con `npm ci`
- Compila la aplicación Angular
- Añade y sincroniza la plataforma Android con Capacitor
- Compila el APK de Android (debug o release)
- Sube el APK como artefacto descargable

**Artefactos**:
- Nombre: `snapreceipt-debug.apk` o `snapreceipt-release.apk`
- Ubicación: `android/app/build/outputs/apk/[debug|release]/*.apk`
- Retención: 30 días

## Cómo Usar

### Ejecutar el Build de Angular
El workflow de Angular se ejecuta automáticamente en cada push o pull request a las ramas principales. No requiere acción manual.

### Compilar APK de Android

1. Ve a la pestaña **Actions** en GitHub
2. Selecciona el workflow **"Build Android APK"**
3. Haz clic en el botón **"Run workflow"**
4. Selecciona el tipo de build (debug o release)
5. Haz clic en **"Run workflow"** para iniciar
6. Espera a que el workflow complete
7. Descarga el APK desde la sección de **Artifacts** en la página del workflow

## Requisitos

### Para Angular Build
- Código compatible con Node.js 18.x y 20.x
- Todas las dependencias listadas en `package.json`

### Para Android Build
- Configuración de Capacitor en `capacitor.config.ts`
- Dependencias de `@capacitor/android` en `package.json`
- Para builds de release: configuración de firma en `android/app/build.gradle` (no incluido por seguridad)

## Notas de Seguridad

- Los secrets como API keys NO se incluyen en los workflows
- Para builds de release firmados, necesitas configurar secrets en GitHub:
  - `ANDROID_KEYSTORE`: Archivo keystore codificado en base64
  - `ANDROID_KEY_ALIAS`: Alias de la key
  - `ANDROID_KEY_PASSWORD`: Password de la key
  - `ANDROID_STORE_PASSWORD`: Password del keystore

## Solución de Problemas

### El workflow de Angular falla
- Verifica que `package.json` tenga todos los scripts necesarios
- Revisa los logs del workflow para errores específicos
- Asegúrate de que las dependencias estén actualizadas

### El workflow de Android falla
- Verifica que Capacitor esté correctamente configurado
- Revisa que `capacitor.config.ts` tenga la configuración correcta
- Para builds de release, asegúrate de tener la configuración de firma

## Mejoras Futuras

- [ ] Añadir tests automatizados al workflow de Angular
- [ ] Implementar firma automática para APKs de release
- [ ] Añadir notificaciones en caso de fallo
- [ ] Crear workflow para compilar iOS (requiere macOS runner)
- [ ] Implementar cache de Gradle para builds más rápidos de Android

## 3. Supabase Edge Functions (`supabase-functions.yml`)

**Propósito**: Valida y despliega automáticamente las Edge Functions de Supabase.

**Triggers**:
- Push a las ramas: `main`, `master` (con cambios en `supabase/functions/**`)
- Pull requests a las ramas: `main`, `master` (con cambios en `supabase/functions/**`)
- Manual (workflow_dispatch) con opciones de entorno

**Características**:
- ✅ Valida sintaxis TypeScript con Deno
- 🚀 Despliega automáticamente a producción en merge a main
- 🎯 Permite despliegue manual con selección de entorno
- 📋 Genera resumen de despliegue
- 🔍 Verifica que todos los secrets estén configurados

**Parámetros (Manual)**:
- `environment`: Entorno de despliegue
  - `production`: Producción (por defecto)
  - `staging`: Staging/desarrollo
- `deploy`: Realizar despliegue o solo validar
  - `true`: Validar y desplegar (por defecto)
  - `false`: Solo validar

**Jobs**:

1. **Validate**: 
   - Instala Deno
   - Valida sintaxis TypeScript de todas las funciones
   - Lista las funciones encontradas
   - Se ejecuta siempre (PRs, push, manual)

2. **Deploy**:
   - Instala Supabase CLI
   - Verifica credenciales configuradas
   - Enlaza al proyecto Supabase
   - Despliega todas las funciones
   - Genera resumen de despliegue
   - Solo se ejecuta en push a main/master o manualmente

**Secrets Requeridos**:

Para que el workflow funcione, debes configurar estos secrets en GitHub:

### `SUPABASE_ACCESS_TOKEN`

**Cómo obtenerlo:**
1. Ve a [Supabase Dashboard](https://app.supabase.com/)
2. Haz clic en tu icono de perfil (arriba a la derecha)
3. Ve a "Account Settings"
4. Navega a "Access Tokens"
5. Haz clic en "Generate New Token"
6. Dale un nombre (ej: "GitHub Actions Deploy")
7. Copia el token (¡guárdalo de forma segura!)

**Añadir a GitHub:**
1. Ve a tu repositorio en GitHub
2. Navega a: **Settings** → **Secrets and variables** → **Actions**
3. Haz clic en "New repository secret"
4. Nombre: `SUPABASE_ACCESS_TOKEN`
5. Valor: Pega tu token de acceso de Supabase
6. Haz clic en "Add secret"

### `SUPABASE_PROJECT_ID`

**Cómo obtenerlo:**
1. Ve a [Supabase Dashboard](https://app.supabase.com/)
2. Selecciona tu proyecto
3. Ve a "Project Settings" (icono ⚙️ en la barra lateral)
4. En "General settings", encuentra "Reference ID"
5. Copia el ID de referencia del proyecto (formato: `xxxxxxxxxxxxx`)

**Añadir a GitHub:**
1. Ve a tu repositorio en GitHub
2. Navega a: **Settings** → **Secrets and variables** → **Actions**
3. Haz clic en "New repository secret"
4. Nombre: `SUPABASE_PROJECT_ID`
5. Valor: Pega el ID de referencia de tu proyecto
6. Haz clic en "Add secret"

**Uso**:

### Automático (Recomendado)

1. **Durante Desarrollo**:
   - Crea una rama y modifica las Edge Functions
   - Abre un pull request
   - GitHub Actions valida automáticamente tus funciones
   - Revisa el workflow "Supabase Edge Functions" para resultados
   - Corrige cualquier error antes de hacer merge

2. **Al hacer Merge a Main**:
   - Haz merge de tu pull request a main/master
   - GitHub Actions automáticamente:
     - Valida las funciones nuevamente
     - Despliega todas las funciones a producción
     - Muestra resumen de despliegue
   - ¡Tus Edge Functions están ahora en vivo! 🎉

### Manual

1. Ve a la pestaña **Actions** en GitHub
2. Selecciona el workflow **"Supabase Edge Functions"**
3. Haz clic en **"Run workflow"**
4. Elige opciones:
   - **Environment**: production o staging
   - **Deploy**: true (desplegar) o false (solo validar)
5. Haz clic en **"Run workflow"**
6. Monitorea el progreso en la ejecución del workflow

**Estructura Esperada**:

```
supabase/
└── functions/
    ├── process-receipt/
    │   └── index.ts
    ├── otra-funcion/
    │   └── index.ts
    └── README.md
```

**Pruebas Locales**:

Antes de hacer push, puedes probar localmente:

```bash
# Validar sintaxis TypeScript
deno check supabase/functions/process-receipt/index.ts

# Probar despliegue (requiere Supabase CLI)
npm install -g supabase
supabase login
supabase link --project-ref tu-project-id
supabase functions deploy process-receipt
```

**Solución de Problemas**:

- **Error: "SUPABASE_ACCESS_TOKEN secret is not set!"**
  - Solución: Añade el secret como se describe arriba

- **Error: "SUPABASE_PROJECT_ID secret is not set!"**
  - Solución: Añade el secret como se describe arriba

- **Error: "No Edge Functions found!"**
  - Solución: Verifica que tus funciones estén en `supabase/functions/` con la estructura correcta

- **Error: "Syntax errors found"**
  - Solución: Revisa los logs del workflow para errores específicos de TypeScript
  - Prueba localmente con: `deno check supabase/functions/tu-funcion/index.ts`

- **Error: "Failed to deploy: function-name"**
  - Solución: Verifica que el nombre de la función sea válido (minúsculas, guiones)
  - Verifica que tu proyecto Supabase tenga Edge Functions habilitadas
  - Revisa la salida del CLI de Supabase en los logs del workflow

**Seguridad**:

- Los tokens de acceso tienen acceso completo al proyecto - manténlos seguros
- Usa GitHub Environments para protección adicional
- Rota los tokens periódicamente
- Revisa los logs del workflow cuidadosamente (los secrets están enmascarados)
- Nunca hagas commit de tokens al repositorio

