import React, { useState } from 'react';
import { User, Mail, Shield, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { BrandLogo } from '../components/common/BrandLogo';
import { api } from '../services/api';
import { Role } from '../types';

interface RegisterPageProps {
  onNavigateToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigateToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Please fill in your name and email address.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await api.requestAccess({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        requestedRole: 'ADMIN' as Role,
      });
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit access request.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F4E5] flex flex-col justify-center py-12 sm:px-6 lg:px-8 animate-gold-fade-in">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <BrandLogo className="mx-auto h-auto w-48 max-w-full object-contain mb-4" />
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-black">
          Request Staff Access
        </h2>
        <p className="mt-1 text-sm text-black/70 font-medium">
          Submit your request for an internal Admin account at White Ink Design Studio
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white border-2 border-gold-300 py-8 px-6 shadow-xl rounded-2xl sm:px-10">
          {isSubmitted ? (
            <div className="text-center py-4 space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold-100 border-2 border-gold-400 text-gold-700">
                <CheckCircle2 className="h-8 w-8 stroke-[2.5]" />
              </div>
              <h3 className="text-lg font-bold text-black">Request Submitted!</h3>
              <div className="p-4 bg-gold-50 border border-gold-200 rounded-xl text-left text-xs sm:text-sm text-black/90 leading-relaxed font-medium">
                Your request has been submitted. Our Super Admin will review it and share your login credentials with you separately.
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onNavigateToLogin}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold text-black bg-gold-500 hover:bg-gold-600 transition-all duration-150 shadow-sm border border-gold-600 cursor-pointer btn-hover-lift"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Return to Sign In
                </button>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-5 p-3.5 text-xs text-rose-800 bg-rose-50 border border-rose-300 rounded-lg font-medium">
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
                      placeholder="name@whiteink.com"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-gold-300 text-black rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-gold-500 focus:border-gold-600"
                    />
                  </div>
                </div>

                <div className="p-3 bg-gold-50/70 border border-gold-200 rounded-xl flex items-center gap-3">
                  <div className="p-2 bg-gold-100 rounded-lg border border-gold-300 text-gold-700 shrink-0">
                    <Shield className="h-4 w-4 stroke-[2.5]" />
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-black block">Requested Role: Admin</span>
                    <span className="text-black/65">Internal staff leadership managing team operations and projects.</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold text-black bg-gold-500 hover:bg-gold-600 transition-all duration-150 shadow-sm border border-gold-600 disabled:opacity-50 cursor-pointer btn-hover-lift"
                  >
                    {isLoading ? 'Submitting Request...' : 'Submit Access Request'}
                    <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                  </button>
                </div>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};
