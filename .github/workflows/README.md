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
