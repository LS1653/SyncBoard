import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { KanbanBoard } from '../features/tasks/KanbanBoard';
import { ProjectMember } from '../types/database.types';

const mockRemoveChannel = vi.fn();
const mockSubscribe = vi.fn().mockReturnValue({ id: 'mock-channel' });
const mockOn = vi.fn().mockReturnValue({ subscribe: mockSubscribe });
const mockChannel = vi.fn().mockReturnValue({ on: mockOn });

const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    channel: (...args: unknown[]) => mockChannel(...args),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
  },
}));

vi.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@syncboard.edu' },
    profile: { id: 'user-1', display_name: 'Usuario Test', created_at: '2026-10-01T00:00:00Z' },
    session: null,
    loading: false,
  }),
}));

const mockMembers: ProjectMember[] = [
  {
    project_id: 'proj-1',
    user_id: 'user-1',
    role: 'owner',
    joined_at: '2026-10-01T00:00:00Z',
    profiles: {
      id: 'user-1',
      display_name: 'Usuario Test',
      created_at: '2026-10-01T00:00:00Z',
    },
  },
];

describe('KanbanBoard Keyboard Shortcut (N) - Issue #41', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrder.mockResolvedValue({ data: [], error: null });
  });

  it('opens TaskModal with default status "pending" when pressing "n" outside interactive inputs', async () => {
    render(<KanbanBoard projectId="proj-1" members={mockMembers} />);

    await waitFor(() => {
      expect(screen.getByText('Pendiente')).toBeInTheDocument();
    });

    // Modal should not be open initially (check modal submit button "Crear Tarea")
    expect(screen.queryByRole('button', { name: /crear tarea/i })).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'n' });

    expect(screen.getByRole('button', { name: /crear tarea/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/diseñar esquema relacional/i)).toBeInTheDocument();

    // Verify default status is 'pending'
    const statusSelects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    const modalStatusSelect = statusSelects.find(
      (select) =>
        Array.from(select.options).some((opt) => opt.value === 'in_progress') &&
        Array.from(select.options).length === 3
    );
    expect(modalStatusSelect?.value).toBe('pending');
  });

  it('does not open TaskModal when pressing "n" while focused on an INPUT, TEXTAREA, or SELECT', async () => {
    render(
      <div>
        <input data-testid="external-input" type="text" />
        <textarea data-testid="external-textarea" />
        <KanbanBoard projectId="proj-1" members={mockMembers} />
      </div>
    );

    await waitFor(() => {
      expect(screen.getByText('Pendiente')).toBeInTheDocument();
    });

    // 1. Focused on an INPUT
    const input = screen.getByTestId('external-input');
    input.focus();
    fireEvent.keyDown(input, { key: 'n' });
    expect(screen.queryByRole('button', { name: /crear tarea/i })).not.toBeInTheDocument();

    // 2. Focused on a TEXTAREA
    const textarea = screen.getByTestId('external-textarea');
    textarea.focus();
    fireEvent.keyDown(textarea, { key: 'N' });
    expect(screen.queryByRole('button', { name: /crear tarea/i })).not.toBeInTheDocument();

    // 3. Focused on a SELECT (e.g. assignee filter in KanbanBoard)
    const selects = screen.getAllByRole('combobox');
    selects[0].focus();
    fireEvent.keyDown(selects[0], { key: 'n' });
    expect(screen.queryByRole('button', { name: /crear tarea/i })).not.toBeInTheDocument();
  });

  it('removes the keydown listener when KanbanBoard unmounts', async () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<KanbanBoard projectId="proj-1" members={mockMembers} />);

    await waitFor(() => {
      expect(screen.getByText('Pendiente')).toBeInTheDocument();
    });

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });
});
