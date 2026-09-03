import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, ArrowRight } from 'lucide-react';

interface LoginPageProps {
  onNavigateToRegister: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigateToRegister }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('alex@planforge.io');
  const [password, setPassword] = useState('Admin@123');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setIsLoading(true);
    setError(null);
    try {
      await login(demoEmail, demoPassword);
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const demoAccounts = [
    { email: 'alex@planforge.io', password: 'Admin@123', role: 'SUPER_ADMIN', name: 'Alex Vance', title: 'Super Admin' },
    { email: 'sarah@planforge.io', password: 'Admin@123', role: 'ADMIN', name: 'Sarah Connor', title: 'Project Manager' },
    { email: 'david@planforge.io', password: 'User@123', role: 'TEAM_MEMBER', name: 'David Kim', title: 'Lead Engineer' },
    { email: 'elena@planforge.io', password: 'User@123', role: 'TEAM_MEMBER', name: 'Elena Rostova', title: 'UI/UX Designer' },
    { email: 'jonathan@acmecorp.com', password: 'Client@123', role: 'CLIENT', name: 'Jonathan Sterling', title: 'Acme Client' },
  ];

  return (
    <div className="min-h-screen bg-[#F8F4E5] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto h-12 w-12 rounded-xl bg-black flex items-center justify-center text-gold-400 shadow-sm mb-4 border border-gold-500">
          <Shield className="h-6 w-6" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-black">
          PlanForge PMS
        </h2>
        <p className="mt-1 text-sm text-black/70 font-medium">
          End-to-End Enterprise Project Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white border-2 border-gold-300 py-8 px-6 shadow-xl rounded-2xl sm:px-10">
          {error && (
            <div className="mb-5 p-3.5 text-xs text-black bg-gold-100 border border-gold-400 rounded-lg font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gold-600">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-gold-300 text-black rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-gold-500 focus:border-gold-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gold-600">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-gold-300 text-black rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-gold-500 focus:border-gold-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold text-black bg-gold-500 hover:bg-gold-600 transition-all duration-150 shadow-sm border border-gold-600 disabled:opacity-50 mt-2 cursor-pointer btn-hover-lift"
            >
              {isLoading ? 'Signing in...' : 'Sign in to Dashboard'}
              <ArrowRight className="h-4 w-4 stroke-[2.5]" />
            </button>
          </form>

          {/* Quick Demo Accounts */}
          <div className="mt-6 pt-6 border-t border-gold-200">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-black/75 mb-3 text-center">
              1-Click Demo Logins (Seeded Accounts)
            </p>
            <div className="space-y-1.5">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleDemoLogin(acc.email, acc.password)}
                  disabled={isLoading}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs bg-gold-50/70 hover:bg-gold-100/90 border border-gold-300 rounded-lg text-black transition-colors text-left cursor-pointer group"
                >
                  <div className="truncate">
                    <span className="font-bold text-black">{acc.name}</span>
                    <span className="text-black/70 ml-1.5 font-medium">({acc.title})</span>
                  </div>
                  <span className="text-[10px] font-mono text-black font-extrabold group-hover:underline">
                    {acc.role} →
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-black/80 font-medium">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={onNavigateToRegister}
                className="text-black font-extrabold hover:text-gold-700 underline cursor-pointer"
              >
                Register as Member or Client
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

