import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Shield, User, Lock, Mail, ArrowRight, Activity, Cpu, Fingerprint } from 'lucide-react';

/**
 * AuthPortal
 * 
 * Unified Tactical Entry Portal for VenueFlow.
 * Handles Login and Registration for all roles (Admin, Staff, Attendee).
 */
export default function AuthPortal() {
  const { login, register, userProfile, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine if we start in Register mode based on URL
  const [isRegister, setIsRegister] = useState(location.pathname === '/register');
  const [role, setRole] = useState('attendee'); // Default role for registration
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [serviceKey, setServiceKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync state with URL if user navigates via browser buttons
  useEffect(() => {
    setIsRegister(location.pathname === '/register');
  }, [location.pathname]);

  // Redirection Logic after successful Auth
  useEffect(() => {
    if (userProfile && !loading) {
      const targetRole = userProfile.role;
      if (targetRole === 'admin') navigate('/admin/dashboard', { replace: true });
      else if (targetRole === 'staff') navigate('/staff/dashboard', { replace: true });
      else navigate('/dashboard', { replace: true });
    }
  }, [userProfile, loading, navigate]);

  const validatePassword = (pass) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    return regex.test(pass);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!validatePassword(password)) {
          throw new Error('Password must be 8+ chars with Uppercase, Lowercase, Number, and Special Char.');
        }
        await register(name, email, password, role, serviceKey);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse decoration-delay-2000" />
      
      {/* Brand Header */}
      <div className="mb-12 flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-1000">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/20 mb-6 border border-emerald-400/30">
          <MapPin className="text-white w-8 h-8" />
        </div>
        <h1 className="text-4xl font-black tracking-tighter text-white italic">
          VENUE<span className="text-emerald-500">FLOW</span>
        </h1>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">AI-Driven Crowd Orchestration</p>
      </div>

      {/* Main Auth Container */}
      <div className="w-full max-w-lg bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] p-1 shadow-2xl relative z-10">
        
        {/* State Toggle */}
        <div className="grid grid-cols-2 p-2 b-2">
          <button 
            onClick={() => { setIsRegister(false); navigate('/login'); }}
            className={`py-4 rounded-[2rem] text-xs font-black uppercase tracking-widest transition-all ${!isRegister ? 'bg-slate-800 text-emerald-400 shadow-lg border border-slate-700' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Tactical Login
          </button>
          <button
            onClick={() => { setIsRegister(true); navigate('/register'); }}
            className={`py-4 rounded-[2rem] text-xs font-black uppercase tracking-widest transition-all ${isRegister ? 'bg-slate-800 text-emerald-400 shadow-lg border border-slate-700' : 'text-slate-400 hover:text-slate-200'}`}
          >
            New Enrollment
          </button>
        </div>

        <div className="p-8 md:p-12 pt-6">
          <h2 className="text-2xl font-bold text-white mb-2">{isRegister ? 'Identity Enrollment' : 'Secure Entry'}</h2>
          <p className="text-slate-500 text-xs mb-8">
            {isRegister ? 'Configure your credential profile for secure venue access.' : 'Provide authorized credentials to access your tactical dashboard.'}
          </p>

          {error && (
            <div className="mb-6 bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center space-x-3 animate-in shake duration-300">
              <Shield className="text-rose-500 shrink-0" size={18} />
              <p className="text-rose-500 text-xs font-bold leading-tight">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {isRegister && (
              <div className="space-y-6">
                {/* Role Selector */}
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    type="button"
                    onClick={() => setRole('attendee')}
                    className={`p-4 rounded-2xl border transition-all flex flex-col items-center space-y-2 ${role === 'attendee' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                  >
                    <User size={20} />
                    <span className="text-[10px] font-black uppercase">Attendee</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setRole('staff')}
                    className={`p-4 rounded-2xl border transition-all flex flex-col items-center space-y-2 ${role === 'staff' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                  >
                    <Activity size={20} />
                    <span className="text-[10px] font-black uppercase">Venue Staff</span>
                  </button>
                </div>

                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                  <input 
                    id="serviceKey"
                    type="password"
                    placeholder="SERVICE KEY (OPTIONAL)"
                    aria-label="Service security key for administrative access"
                    value={serviceKey}
                    onChange={(e) => setServiceKey(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-700 placeholder:font-black placeholder:text-[10px]"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-700 pointer-events-none">
                    REQUIRED FOR ADMIN
                  </div>
                </div>

                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                  <input 
                    id="name"
                    type="text"
                    required
                    placeholder="FULL LEGAL NAME"
                    aria-label="Full legal name for identity enrollment"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-700 placeholder:font-black placeholder:text-[10px]"
                  />
                </div>
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
              <input 
                id="email"
                type="email"
                required
                placeholder="AUTHENTICATION EMAIL"
                aria-label="Authentication email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-700 placeholder:font-black placeholder:text-[10px]"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
              <input 
                id="password"
                type="password"
                required
                placeholder="SECURE ACCESS KEY"
                aria-label="Secure password or access key"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-700 placeholder:font-black placeholder:text-[10px]"
              />
            </div>

            <button 
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-900/20 flex items-center justify-center space-x-3 group"
            >
              {loading ? (
                <>
                  <Cpu className="animate-spin" size={18} />
                  <span>SYNCING WITH CORE...</span>
                </>
              ) : (
                <>
                  <span>{isRegister ? 'FINALIZE ENROLLMENT' : 'ESTABLISH LINK'}</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Biometric Visual Mock */}
          <div className="mt-12 flex items-center justify-center space-x-4 opacity-20">
             <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-slate-700" />
             <Fingerprint size={24} className="text-slate-500" />
             <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-slate-700" />
          </div>
          
          <p className="text-center mt-6 text-slate-600 text-[10px] font-bold uppercase tracking-widest">
             Encryption level: AES-256 MIL-SPEC
          </p>
        </div>
      </div>
    </div>
  );
}
