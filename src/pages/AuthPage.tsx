import React, { useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { isValidEmail } from '../lib/validators';
import { LayoutDashboard, Lock, Mail, User, AlertCircle, CheckCircle2 } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { signIn, signUp, resetPassword, sessionExpiredMsg, clearSessionMsg } = useAuth();
  const [tab, setTab] = useState<'login' | 'register' | 'recovery'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const clearMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    if (clearSessionMsg) clearSessionMsg();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!isValidEmail(email)) {
      setErrorMessage('Por favor introduce un correo electrónico válido.');
      return;
    }
    if (!password) {
      setErrorMessage('Por favor introduce tu contraseña.');
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      setErrorMessage(
        error.message === 'Invalid login credentials'
          ? 'Credenciales inválidas. Comprueba tu correo y contraseña.'
          : error.message
      );
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!displayName.trim()) {
      setErrorMessage('El nombre visible es obligatorio.');
      return;
    }
    if (!isValidEmail(email)) {
      setErrorMessage('Por favor introduce un correo válido.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, displayName.trim());
    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
    } else {
      setSuccessMessage('Registro exitoso. ¡Bienvenido a SyncBoard!');
    }
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!isValidEmail(email)) {
      setErrorMessage('Por favor introduce un correo electrónico válido.');
      return;
    }

    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
    } else {
      setSuccessMessage('Si el correo está registrado, recibirás un enlace de recuperación.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-3 text-teal-400">
          <div className="p-2.5 bg-teal-500/10 rounded-xl border border-teal-500/20">
            <LayoutDashboard className="w-8 h-8 text-teal-400" />
          </div>
          <span className="text-3xl font-bold tracking-tight text-white">SyncBoard</span>
        </div>
        <h2 className="mt-4 text-center text-sm text-slate-300">
          Gestión Colaborativa de Proyectos Académicos y Kanban Distribuido
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">
          {/* Navegación de pestañas */}
          <div className="flex border-b border-slate-200 mb-6" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'login'}
              onClick={() => { setTab('login'); clearMessages(); }}
              className={`flex-1 py-2 text-center text-sm font-semibold border-b-2 transition-colors ${
                tab === 'login'
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'register'}
              onClick={() => { setTab('register'); clearMessages(); }}
              className={`flex-1 py-2 text-center text-sm font-semibold border-b-2 transition-colors ${
                tab === 'register'
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Registrarse
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'recovery'}
              onClick={() => { setTab('recovery'); clearMessages(); }}
              className={`flex-1 py-2 text-center text-sm font-semibold border-b-2 transition-colors ${
                tab === 'recovery'
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Recuperar
            </button>
          </div>

          {/* Alertas */}
          {sessionExpiredMsg && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{sessionExpiredMsg}</span>
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Formulario Iniciar Sesión */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="estudiante@universidad.edu"
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg text-sm shadow-sm transition disabled:opacity-50"
              >
                {loading ? 'Iniciando sesión...' : 'Entrar a SyncBoard'}
              </button>
            </form>
          )}

          {/* Formulario Registrarse */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre Completo
                </label>
                <div className="relative">
                  <User className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Tu nombre y apellido"
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="estudiante@universidad.edu"
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Contraseña (mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg text-sm shadow-sm transition disabled:opacity-50"
              >
                {loading ? 'Registrando...' : 'Crear Cuenta'}
              </button>
            </form>
          )}

          {/* Formulario Recuperar Acceso */}
          {tab === 'recovery' && (
            <form onSubmit={handleRecovery} className="space-y-4">
              <p className="text-xs text-slate-600">
                Introduce tu correo electrónico y te enviaremos instrucciones para restablecer tu contraseña.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="estudiante@universidad.edu"
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg text-sm shadow-sm transition disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
