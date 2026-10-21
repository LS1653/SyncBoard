# Backlog Maestro — SyncBoard

Este documento es el registro único de trabajo del proyecto SyncBoard. Ninguna tarea se considera terminada hasta que sus criterios de aceptación estén verificados con evidencia ejecutable.

Estados válidos: `Pendiente`, `En progreso`, `En revisión`, `Bloqueada`, `Completada`.

---

## Tareas del Proyecto

### [TASK-001] Inspección y configuración base del proyecto
- **Prioridad**: Alta
- **Estado**: Completada
- **Dependencias**: Ninguna
- **Rama**: `feat/project-base`
- **Criterios de Aceptación**:
  - React 18, Vite, TypeScript estricto, Tailwind CSS y Vitest configurados.
  - Scripts en `package.json` para dev, build, lint y test funcionales.
  - Archivos `.gitignore` y `.env.example` definidos sin secretos.
- **Evidencia**: `npm install` exitoso, dependencias fijadas en `package-lock.json`.

---

### [TASK-002] Modelo de datos relacional, RLS y procedimientos transaccionales
- **Prioridad**: Alta
- **Estado**: Completada
- **Dependencias**: TASK-001
- **Rama**: `feat/database-schema`
- **Criterios de Aceptación**:
  - Migración SQL `20261021000000_initial_schema.sql` con tablas: `profiles`, `projects`, `project_members`, `project_invitations`, `tasks`, `activity_log`.
  - Restricciones de integridad: estados de tareas, prioridades, roles, foreign key de asignación condicionada a membresía.
  - Procedimientos almacenados: `create_project_with_owner`, `soft_delete_project`, `accept_project_invitation`.
  - Políticas RLS activadas en todas las tablas con filtros `deleted_at IS NULL`.
  - Configuración de publicación para Supabase Realtime en tablas activas.
  - Script de semilla reproducible `supabase/seed.sql`.
- **Evidencia**: Archivos de migración y seed validados sintácticamente.

---

### [TASK-003] Edge Function `manage-project-invitation`
- **Prioridad**: Alta
- **Estado**: Completada
- **Dependencias**: TASK-002
- **Rama**: `feat/edge-function-invitations`
- **Criterios de Aceptación**:
  - Edge Function Deno implementada en `supabase/functions/manage-project-invitation/index.ts`.
  - Validación de token JWT en el encabezado `Authorization`.
  - Acciones soportadas: `create`, `list_received`, `list_project`, `accept`, `reject`, `revoke`.
  - Verificación en servidor de propiedad del proyecto para crear y revocar invitaciones.
  - Invocación transaccional de `accept_project_invitation` para garantizar atomicidad.
  - Headers CORS adecuados para llamadas desde el frontend.
- **Evidencia**: Código TypeScript para Deno completado con manejo exhaustivo de errores y validaciones.

---

### [TASK-004] Capa de Acceso a Datos y Autenticación en Frontend
- **Prioridad**: Alta
- **Estado**: En progreso
- **Dependencias**: TASK-002
- **Rama**: `feat/auth-frontend`
- **Criterios de Aceptación**:
  - Cliente Supabase tipado centralizado en `src/lib/supabase.ts`.
  - Contexto de Autenticación (`AuthContext`) con manejo de sesión, login, registro, recuperación y logout.
  - Rutas protegidas (`ProtectedRoute`) y restauración fluida de sesión.
  - Formularios de autenticación con validación en español y manejo accesible de errores.
- **Evidencia**: Pruebas unitarias de validación y componentes de autenticación.

---

### [TASK-005] Gestión de Proyectos, Membresías y Eliminación Lógica
- **Prioridad**: Alta
- **Estado**: En progreso
- **Dependencias**: TASK-004
- **Rama**: `feat/projects-management`
- **Criterios de Aceptación**:
  - Vista de lista de proyectos activos donde el usuario es miembro.
  - Modal para crear proyecto invocando `create_project_with_owner`.
  - Panel de detalle del proyecto con lista de integrantes.
  - Eliminación lógica del proyecto restringida al propietario con confirmación explícita.
- **Evidencia**: Pruebas de componentes y hooks de proyectos.

---

### [TASK-006] Tablero Kanban Interactivo y CRUD de Tareas
- **Prioridad**: Alta
- **Estado**: En progreso
- **Dependencias**: TASK-005
- **Rama**: `feat/kanban-tasks`
- **Criterios de Aceptación**:
  - Tablero Kanban organizado en 3 columnas: Pendiente (`pending`), En progreso (`in_progress`), Completada (`completed`).
  - Tarjetas de tarea mostrando título, prioridad visual, responsable y fecha límite.
  - Botones y controles para mover tareas entre columnas sin depender exclusivamente de drag & drop.
  - Modal para crear, editar y eliminar tareas.
  - Restricción de asignación validada contra los miembros del proyecto.
  - Filtros por estado y responsable.
- **Evidencia**: Pruebas con React Testing Library verificando cambios de estado y renderizado.

---

### [TASK-007] Bandeja de Invitaciones y Gestión de Integrantes
- **Prioridad**: Media
- **Estado**: En progreso
- **Dependencias**: TASK-003, TASK-005
- **Rama**: `feat/invitations-ui`
- **Criterios de Aceptación**:
  - Bandeja de invitaciones pendientes recibidas para el usuario autenticado.
  - Botones para Aceptar o Rechazar invitación.
  - Modal en el proyecto para que el propietario envíe invitaciones a correos de usuarios registrados.
  - Prevención de invitaciones duplicadas y manejo de estados vencidos.
- **Evidencia**: Pruebas funcionales y de componentes del flujo de invitaciones.

---

### [TASK-008] Supabase Realtime y Registro de Actividad
- **Prioridad**: Alta
- **Estado**: En progreso
- **Dependencias**: TASK-006, TASK-007
- **Rama**: `feat/realtime-activity`
- **Criterios de Aceptación**:
  - Suscripción Realtime a cambios en la tabla `tasks` y `project_members` vinculada al ciclo de vida del componente.
  - Cancelación de canales al desmontar componentes o cambiar de proyecto.
  - Historial de actividad cronológica en el proyecto mostrando eventos de creación, actualización y membresía.
  - Resincronización al reconectar o detectar desfase.
- **Evidencia**: Suscripción desacoplada y pruebas unitarias de actualización.

---

### [TASK-009] Batería de Pruebas Automatizadas y CI/CD
- **Prioridad**: Alta
- **Estado**: En progreso
- **Dependencias**: TASK-004, TASK-006
- **Rama**: `feat/testing-ci`
- **Criterios de Aceptación**:
  - Pruebas unitarias de validadores, formateadores y reglas de negocio en `src/test`.
  - Pruebas de componentes en Vitest + React Testing Library con mocks de Supabase.
  - Pipeline de GitHub Actions en `.github/workflows/ci.yml` ejecutando lint, typecheck, tests y build.
- **Evidencia**: Ejecución local de `npm run test` y `npm run build` con salida exitosa.

---

### [TASK-010] Documentación y Preparación de Despliegue
- **Prioridad**: Media
- **Estado**: En progreso
- **Dependencias**: TASK-001 a TASK-009
- **Rama**: `docs/complete-spec`
- **Criterios de Aceptación**:
  - `README.md` completo y explicativo para estudiantes.
  - `docs/architecture.md`, `docs/data-model.md` y `docs/development.md`.
  - Instrucciones detalladas de despliegue en Vercel y Supabase Cloud.
  - `AGENTS.md` y plantilla de handoff coherentes.
- **Evidencia**: Todos los archivos de documentación creados y verificados.
