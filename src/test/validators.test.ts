import { describe, it, expect } from 'vitest';
import { isValidEmail, normalizeEmail, validateProjectInput, validateTaskInput } from '../lib/validators';
import { formatStatus, formatPriority, formatDate } from '../lib/formatters';

describe('Validators Unit Tests', () => {
  it('validates email addresses correctly', () => {
    expect(isValidEmail('estudiante@universidad.edu')).toBe(true);
    expect(isValidEmail('usuario.prueba@dominio.com')).toBe(true);
    expect(isValidEmail('correo-invalido')).toBe(false);
    expect(isValidEmail('sin-arroba.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  it('normalizes email addresses to lowercase and trims spaces', () => {
    expect(normalizeEmail('  Estudiante@Universidad.EDU  ')).toBe('estudiante@universidad.edu');
  });

  it('validates project input', () => {
    expect(validateProjectInput('').valid).toBe(false);
    expect(validateProjectInput('ab').valid).toBe(false);
    expect(validateProjectInput('Proyecto Sistemas Distribuidos').valid).toBe(true);
  });

  it('validates task input and status restrictions', () => {
    expect(validateTaskInput('', 'pending', 'medium').valid).toBe(false);
    expect(validateTaskInput('Tarea válida', 'pending', 'medium').valid).toBe(true);
    expect(validateTaskInput('Tarea válida', 'in_progress', 'high').valid).toBe(true);
    expect(validateTaskInput('Tarea válida', 'completed', 'low').valid).toBe(true);
    expect(validateTaskInput('Tarea inválida', 'invalid_status', 'high').valid).toBe(false);
    expect(validateTaskInput('Tarea inválida', 'pending', 'invalid_priority').valid).toBe(false);
  });
});

describe('Formatters Unit Tests', () => {
  it('formats task status to Spanish labels', () => {
    expect(formatStatus('pending')).toBe('Pendiente');
    expect(formatStatus('in_progress')).toBe('En progreso');
    expect(formatStatus('completed')).toBe('Completada');
  });

  it('formats task priorities to Spanish labels', () => {
    expect(formatPriority('low')).toBe('Baja');
    expect(formatPriority('medium')).toBe('Media');
    expect(formatPriority('high')).toBe('Alta');
  });

  it('formats dates consistently', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate('2026-10-21')).toContain('2026');
  });
});
