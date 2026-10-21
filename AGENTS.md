# Guía de Agentes y Colaboración — SyncBoard

Bienvenido al equipo de ingeniería de **SyncBoard**. Este documento define el marco de trabajo, estándares de código, reglas de seguridad y protocolos de relevo (handoff) para que agentes de IA y desarrolladores humanos colaboren sin fricciones ni regresiones.

---

## 1. Contexto del Proyecto

**SyncBoard** es una plataforma colaborativa de gestión de proyectos académicos y tareas mediante tableros Kanban interactivos. Está diseñada para la asignatura *Sistemas Interactivos Distribuidos*, demostrando patrones modernos de arquitectura cliente-servidor distribuida:
- Autenticación segura y autorización granular (RLS).
- Persistencia e integridad relacional con PostgreSQL.
- Transacciones atómicas en base de datos.
- Sincronización en tiempo real orientada a eventos con Supabase Realtime.
- Lógica de negocio de servidor en Edge Functions.
- Eliminación lógica (soft-delete) para auditoría e integridad referencial.

---

## 2. Pila Tecnológica Aprobada

| Capa | Tecnología | Propósito |
|---|---|---|
| **Frontend** | React 18 + Vite | SPA moderna y rápida |
| **Lenguaje** | TypeScript (Modo Estricto) | Seguridad de tipos de extremo a extremo |
| **Estilos** | Tailwind CSS + Lucide Icons | UI accesible, responsiva y limpia |
| **Persistencia** | PostgreSQL 15 | Relaciones, constraints, triggers y RPCs |
| **BaaS** | Supabase | Auth, Database, Storage, Realtime |
| **Backend Lógico** | Supabase Edge Functions (Deno) | `manage-project-invitation` |
| **Testing** | Vitest + React Testing Library | Pruebas unitarias, de integración y componentes |
| **CI/CD** | GitHub Actions | Validación automática en PRs y push a main |
| **Despliegue** | Vercel (Frontend) + Supabase Cloud | Ambientes desacoplados |

> **IMPORTANTE**: No incorporar Redux, Express, Prisma/TypeORM, websockets directos manuales ni orquestadores multiagente externos.

---

## 3. Estructura del Repositorio

```
syncboard/
├── AGENTS.md                          # Protocolo y normas para agentes de IA
├── README.md                          # Visión general y guía rápida
├── docs/
│   ├── backlog.md                     # Tablero maestro de historias y tareas
│   ├── handoff-template.md            # Plantilla formal de traspaso
│   ├── architecture.md                # Diseño arquitectónico y flujos distribuidos
│   ├── data-model.md                  # Esquema relacional, RLS e índices
│   └── development.md                 # Guía paso a paso de setup local y Docker
├── src/
│   ├── components/                    # Componentes UI reutilizables (layout, modales, etc.)
│   ├── features/                      # Módulos por dominio funcional
│   │   ├── auth/                      # Login, Registro, Recuperación, Perfil
│   │   ├── projects/                  # CRUD proyectos, miembros, soft delete
│   │   ├── tasks/                     # Kanban board, modal tareas, filtros
│   │   ├── invitations/               # Bandeja de invitaciones y diálogo de envío
│   │   └── activity/                  # Historial cronológico de eventos
│   ├── lib/                           # Cliente Supabase, utilidades, validadores
│   ├── pages/                         # Vistas principales de enrutamiento
│   └── test/                          # Configuración y mocks de pruebas
├── supabase/
│   ├── config.toml                    # Configuración Supabase CLI local
│   ├── migrations/                    # Migraciones versionadas en SQL puro
│   ├── functions/
│   │   └── manage-project-invitation/ # Edge Function con lógica de servidor
│   └── seed.sql                       # Datos semilla reproducibles
├── .github/
│   └── workflows/ci.yml               # Pipeline de integración continua
├── .env.example                       # Variables públicas sin secretos
├── package.json                       # Dependencias y scripts
└── vite.config.ts                     # Configuración Vite y Vitest
```

---

## 4. Comandos Disponibles

Ejecutar siempre desde la raíz del proyecto:

```bash
# Desarrollo local frontend
npm run dev

# Verificación de tipos TypeScript
npm run lint

# Pruebas automatizadas (Vitest)
npm run test

# Compilación de producción
npm run build

# Entorno local Supabase (requiere Docker Desktop activo)
npx supabase start
npx supabase stop
npx supabase status
npx supabase db reset
```

---

## 5. Reglas de Git y Flujo de Pull Requests

1. **Ramas Descriptivas**:
   - `feat/<modulo>-<descripcion>` (ej. `feat/tasks-kanban-board`)
   - `fix/<modulo>-<descripcion>` (ej. `fix/invitation-validation`)
   - `test/<descripcion>` (ej. `test/invitation-acceptance`)
   - `docs/<descripcion>` (ej. `docs/architecture-diagrams`)
2. **Mensajes de Commit Convencionales**:
   - `feat: ...`, `fix: ...`, `test: ...`, `docs: ...`, `refactor: ...`
3. **Requisitos para Fusionar**:
   - `npm run lint` debe terminar con código 0.
   - `npm run test` debe pasar todas las pruebas.
   - `npm run build` debe generar el paquete de producción sin advertencias graves.
   - El backlog (`docs/backlog.md`) debe actualizar el estado de la tarea.

---

## 6. Procedimiento para Iniciar una Tarea

Antes de tocar cualquier archivo, el agente o desarrollador debe:
1. Inspeccionar `AGENTS.md` y revisar las decisiones arquitectónicas.
2. Leer `docs/backlog.md` para identificar la tarea asignada, sus dependencias y criterios de aceptación.
3. Comprobar el estado real del repositorio (`git status`, `git branch`). **No asumir estados previos sin verificar**.
4. Confirmar que las dependencias de la tarea están resueltas.
5. Desarrollar exclusivamente el alcance acordado, sin añadir dependencias o capas innecesarias.

---

## 7. Procedimiento para Finalizar y Traspasar (Handoff)

Al concluir el trabajo:
1. Ejecutar las comprobaciones obligatorias:
   - `npm run lint`
   - `npm run test`
   - `npm run build`
2. Actualizar el archivo `docs/backlog.md` cambiando el estado a `Completada` o `En revisión`, registrando la evidencia.
3. Generar un documento de relevo basado en `docs/handoff-template.md` resumiendo cambios, comandos ejecutados y resultados reales.

---

## 8. Seguridad y Manejo de Secretos

- **NUNCA** incluir `service_role_key`, tokens privados o contraseñas en archivos de cliente, código fuente o commits.
- El cliente frontend solo tiene acceso a `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- Toda validación crítica debe ejecutarse en el servidor (PostgreSQL constraints, RLS o Edge Functions).
