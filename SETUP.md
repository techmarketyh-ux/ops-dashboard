# Guía de instalación — Ops Dashboard

## Lo que necesitas antes de empezar
- Cuenta de GitHub (gratis): https://github.com
- Cuenta de Vercel (gratis): https://vercel.com
- Cuenta de Google (para Google Sheets y Google Cloud)

---

## PASO 1 — Subir el código a GitHub

1. Ve a https://github.com/new
2. Ponle nombre: `ops-dashboard`
3. Deja todo por defecto y haz clic en "Create repository"
4. Descarga e instala Git: https://git-scm.com/downloads
5. Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/TU_USUARIO/ops-dashboard.git
git push -u origin main
```

---

## PASO 2 — Configurar Google Cloud y Google Sheets

### 2a. Crear el proyecto en Google Cloud

1. Ve a https://console.cloud.google.com
2. Haz clic en "Seleccionar proyecto" → "Nuevo proyecto"
3. Nombre: `ops-dashboard` → Crear
4. En el menú lateral: **APIs y servicios** → **Biblioteca**
5. Busca "Google Sheets API" → Habilitar

### 2b. Crear cuenta de servicio

1. En **APIs y servicios** → **Credenciales**
2. Clic en "Crear credenciales" → "Cuenta de servicio"
3. Nombre: `ops-dashboard-service`
4. Haz clic en la cuenta creada → pestaña **Claves**
5. Agregar clave → JSON → se descarga un archivo `.json`
6. Abre ese archivo y copia todo el contenido — lo necesitas en el Paso 4

### 2c. Crear el Google Sheet

1. Ve a https://sheets.google.com → crea una hoja nueva
2. Ponle nombre: `Ops Dashboard`
3. Copia el ID de la URL: `https://docs.google.com/spreadsheets/d/[ESTE_ES_EL_ID]/edit`
4. Comparte la hoja con el email de la cuenta de servicio (lo encuentras en el JSON, campo `client_email`)
   - Permisos: **Editor**

---

## PASO 3 — Deploy en Vercel

1. Ve a https://vercel.com → "Add New Project"
2. Conecta tu GitHub y selecciona el repositorio `ops-dashboard`
3. Framework: Next.js (lo detecta automáticamente)
4. Haz clic en "Deploy" — tarda ~2 minutos

---

## PASO 4 — Configurar variables de entorno en Vercel

1. En Vercel, ve a tu proyecto → **Settings** → **Environment Variables**
2. Agrega estas dos variables:

**Variable 1:**
- Name: `GOOGLE_SPREADSHEET_ID`
- Value: el ID que copiaste en el Paso 2c

**Variable 2:**
- Name: `GOOGLE_SERVICE_ACCOUNT_JSON`
- Value: el contenido completo del archivo JSON descargado en el Paso 2b
  (pega todo el JSON en una sola línea)

3. Haz clic en **Save**
4. Ve a **Deployments** → haz clic en los tres puntos del último deploy → **Redeploy**

---

## PASO 5 — Usar el dashboard

Tu dashboard está disponible en: `https://ops-dashboard-xxx.vercel.app`

### Cómo subir reportes:
1. Abre el dashboard
2. Sube los archivos de Meta Ads, TikTok Ads, Rocket y Shopify
3. Si tienes productos con nombres distintos entre campaña y Rocket, configura el mapeo
4. Haz clic en "Calcular métricas"
5. El dashboard muestra todo y automáticamente actualiza el Google Sheet

### Para actualizar Rocket frecuentemente:
- Sube el reporte actualizado del mes — el sistema hace upsert por ID de pedido
- Los estados se actualizan automáticamente sin duplicar

---

## Cómo modificar el dashboard en el futuro

Cualquier cambio que quieras hacer (nueva métrica, nuevo color, nueva sección) lo hacemos juntos en Claude:
1. Me describes el cambio
2. Te genero el código actualizado
3. Reemplazas el archivo correspondiente en GitHub
4. Vercel hace el redeploy automáticamente (en ~1 minuto)

---

## Estructura de archivos clave

```
src/
  app/
    page.tsx          ← UI completa del dashboard
    api/process/
      route.ts        ← Lógica del servidor, procesa archivos
  lib/
    types.ts          ← Tipos de datos
    metrics.ts        ← Cálculo de todas las métricas
    sheets.ts         ← Integración con Google Sheets
    parsers/
      meta.ts         ← Lector de reportes Meta Ads
      tiktok.ts       ← Lector de reportes TikTok Ads
      rocket.ts       ← Lector de reportes Rocket
      shopify.ts      ← Lector de reportes Shopify
```
