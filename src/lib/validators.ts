// Input validation and sanitization utilities

export const isValidEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim().toLowerCase());
};

export const normalizeEmail = (email: string): string => {
  return email.trim().toLowerCase();
};

export const validateProjectInput = (name: string): { valid: boolean; error?: string } => {
  const trimmed = name.trim();
  if (!trimmed) {
    return { valid: false, error: 'El nombre del proyecto es obligatorio.' };
  }
  if (trimmed.length < 3) {
    return { valid: false, error: 'El nombre debe tener al menos 3 caracteres.' };
  }
  if (trimmed.length > 100) {
    return { valid: false, error: 'El nombre no puede exceder 100 caracteres.' };
  }
  return { valid: true };
};

export const validateTaskInput = (
  title: string,
  status: string,
  priority: string
): { valid: boolean; error?: string } => {
  const trimmed = title.trim();
  if (!trimmed) {
    return { valid: false, error: 'El título de la tarea es obligatorio.' };
  }
  if (trimmed.length < 2) {
    return { valid: false, error: 'El título debe tener al menos 2 caracteres.' };
  }
  if (trimmed.length > 150) {
    return { valid: false, error: 'El título no puede superar 150 caracteres.' };
  }

  const validStatuses = ['pending', 'in_progress', 'completed'];
  if (!validStatuses.includes(status)) {
    return { valid: false, error: 'Estado de tarea inválido.' };
  }

  const validPriorities = ['low', 'medium', 'high'];
  if (!validPriorities.includes(priority)) {
    return { valid: false, error: 'Prioridad de tarea inválida.' };
  }

  return { valid: true };

  
};

export const sanitizeTitle = (text: string): string => {
    return text.replace(/\s+/g, ' ').trim();
};
