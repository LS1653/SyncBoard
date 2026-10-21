# Guía de Desarrollo Local — SyncBoard

Esta guía detalla los pasos para clonar, configurar, ejecutar y probar **SyncBoard** en un entorno de desarrollo local reproducible.

---

## 1. Requisitos Previos

- **Node.js**: Versión 18 o superior (Recomendado v20+ / v22 LTS).
- **npm**: Versión 9 o superior.
- **Git**: Versión 2.20+.
- **Docker Desktop**: Con soporte Linux containers (requerido para Supabase CLI local).
- **Supabase CLI**: Instalado o ejecutable mediante `npx supabase`.

---

## 2. Instalación Paso a Paso

### 2.1. Clonar el repositorio
```bash
git clone <URL_DEL_REPOSITORIO> syncboard
cd syncboard
```

### 2.2. Instalar dependencias del frontend
```bash
npm install
```

### 2.3. Configurar variables de entorno
Copia la plantilla de variables:
```bash
cp .env.example .env
```
Contenido predeterminado para desarrollo local:
```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.mock-key-for-development
```

---

## 3. Entorno Supabase Local con Docker

Asegúrate de que Docker Desktop esté encendido y funcionando.

### 3.1. Iniciar servicios de Supabase
```bash
npx supabase start
```
Este comando levantará los contenedores de:
- PostgreSQL (`localhost:54322`)
- Supabase Studio Dashboard (`http://localhost:54323`)
- Supabase API Gateway (`http://localhost:54321`)
- Inbucket Email Server (`http://localhost:54324`)
- Realtime Server

### 3.2. Aplicar migraciones y datos semilla (seed)
```bash
# Aplica la migración inicial y ejecuta supabase/seed.sql
npx supabase db reset
```

### 3.3. Obtener credenciales locales
```bash
npx supabase status
```
Copia el `API URL` y el `anon key` en tu archivo `.env`.

---

## 4. Ejecución de la Aplicación

### 4.1. Iniciar el servidor de desarrollo Vite
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:5173`.

### 4.2. Iniciar la Edge Function localmente (Opcional)
Para probar la Edge Function `manage-project-invitation` en tu máquina:
```bash
npx supabase functions serve manage-project-invitation --no-verify-jwt
```

---

## 5. Pruebas y Calidad de Código

Antes de enviar cualquier pull request, ejecuta la suite de validación:

```bash
# 1. Comprobación estricta de tipos TypeScript
npm run lint

# 2. Batería de pruebas unitarias y de componentes (Vitest)
npm run test

# 3. Compilación de paquete de producción
npm run build
```

---

## 6. Usuarios de Prueba Preconfigurados (Semilla)

El archivo `supabase/seed.sql` proporciona las siguientes cuentas de prueba:

| Usuario | Correo | Rol de Demostración |
|---|---|---|
| **Alice Gómez** | `alice@universidad.edu` | Propietaria del proyecto de prueba |
| **Bob Martínez** | `bob@universidad.edu` | Integrante activo del proyecto |
| **Carlos Rodríguez** | `carlos@universidad.edu` | Invitado con invitación pendiente |

---

## 7. Solución de Problemas Frecuentes

### Docker daemon no encontrado
- **Error**: `failed to connect to the docker API`.
- **Causa**: Docker Desktop está cerrado o aún no ha iniciado el motor.
- **Solución**: Abre Docker Desktop y espera a que el icono se ponga verde antes de ejecutar `npx supabase start`.

### Desfase de esquema en base de datos
- **Solución**: Ejecuta `npx supabase db reset` para restablecer la base de datos limpia con las migraciones y seed.
