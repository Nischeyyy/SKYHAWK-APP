import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { Bird, Lock, Mail, AlertCircle } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login(email, password);
      if (data.user?.role !== 'admin') {
        setError('Access denied. Manager accounts only.');
        setLoading(false);
        return;
      }
      localStorage.setItem('mgr_token', data.access_token);
      localStorage.setItem('mgr_user', JSON.stringify(data.user));
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-900 rounded-2xl mb-4 shadow-sm">
            <Bird size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Skyhawk</h1>
          <p className="text-gray-500 text-sm mt-1">Manager Portal</p>
        </div>

        {/* Card */}
        <div className="card space-y-5 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Sign in</h2>
            <p className="text-gray-500 text-sm mt-0.5">Admin credentials required</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-red-600 text-sm">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input pl-9"
                  placeholder="admin@skyhawk.com"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input pl-9"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-xs text-gray-500 text-center">
            Demo: admin@skyhawk.com / Admin123
          </p>
        </div>
      </div>
    </div>
  );
}
