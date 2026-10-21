# SyncBoard — Versión Inicial (v0.1.0)
## Sistemas Interactivos Distribuidos

SyncBoard es una plataforma colaborativa para la gestión de proyectos académicos y tareas mediante tableros Kanban, basada en una arquitectura distribuida con React, Supabase y PostgreSQL.

---

## 1. Estado Actual de la Versión Inicial

Esta primera entrega establece la base ejecutable y reproducible de la arquitectura:

- **Frontend React 18 + Vite + TypeScript**: Completamente tipado, modular y compilable.
- **Autenticación (Supabase Auth)**: Registro, inicio de sesión, recuperación de contraseña y gestión de perfil.
- **Persistencia PostgreSQL**: Migración inicial con RLS, claves foráneas compuestas, funciones transaccionales (`create_project_with_owner`, `soft_delete_project`, `accept_project_invitation`) y trigger de perfiles.
- **Tablero Kanban Base**: Tres columnas (`Pendiente`, `En progreso`, `Completada`), tarjetas interactivas con cambio de estado, prioridades, fechas límite y asignación de integrantes.
- **Invitaciones por Correo**: Bandeja de entrada para aceptar/rechazar invitaciones, modal de invitación y Edge Function preparada.
- **Registro de Actividad**: Vista cronológica de eventos en proyectos.
- **Infraestructura de Calidad**: Vitest configurado con pruebas unitarias, GitHub Actions workflow para CI y configuración Docker para Supabase CLI.

---

## 2. Requisitos Previos

- **Node.js**: v18 o superior (v20+ recomendado).
- **npm**: v9 o superior.
- **Docker Desktop** (opcional para ejecutar Supabase localmente).

---

## 3. Puesta en Marcha Rápida

### 3.1. Instalar dependencias
```bash
npm install
```

### 3.2. Configurar variables de entorno
```bash
cp .env.example .env
```

### 3.3. Comprobar calidad y compilar
```bash
# Verificación de tipos TypeScript
npm run lint

# Ejecutar pruebas unitarias
npm run test

# Compilación de producción
npm run build
```

### 3.4. Iniciar servidor de desarrollo
```bash
npm run dev
```

La aplicación abrirá en `http://localhost:5173`.
