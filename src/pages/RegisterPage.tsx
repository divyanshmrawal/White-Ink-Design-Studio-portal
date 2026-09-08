import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, Building2, ArrowLeft, ArrowRight } from 'lucide-react';
import { BrandLogo } from '../components/common/BrandLogo';

interface RegisterPageProps {
  onNavigateToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigateToLogin }) => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await register({
        name: name.trim(),
        companyName: companyName.trim() || `${name.trim()}'s Company`,
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
      });
    } catch (err: any) {
      setError(err.message || 'Company registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F4E5] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <BrandLogo className="mx-auto h-auto w-48 max-w-full object-contain mb-4" />
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-black">
          Register Your Company
        </h2>
        <p className="mt-1 text-sm text-black/70 font-medium">
          Create your client organization workspace and administrator account
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
                Full Name <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gold-600">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Jordan Rivera"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-gold-300 text-black rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-gold-500 focus:border-gold-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5">
                Company Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gold-600">
                  <Building2 className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g., Acme Studios Inc."
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-gold-300 text-black rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-gold-500 focus:border-gold-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5">
                Work Email <span className="text-rose-600">*</span>
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
                Password <span className="text-rose-600">*</span>
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
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-gold-300 text-black rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-gold-500 focus:border-gold-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5">
                Confirm Password <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gold-600">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-gold-300 text-black rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-gold-500 focus:border-gold-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold text-black bg-gold-500 hover:bg-gold-600 transition-all duration-150 shadow-sm border border-gold-600 disabled:opacity-50 mt-4 cursor-pointer btn-hover-lift"
            >
              {isLoading ? 'Registering company...' : 'Register Company'}
              <ArrowRight className="h-4 w-4 stroke-[2.5]" />
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="inline-flex items-center gap-1.5 text-xs text-black/80 hover:text-black font-bold cursor-pointer hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Already have an account? Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
