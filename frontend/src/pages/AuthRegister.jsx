import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';

export default function AuthRegister({ roleTitle, role, loginPath }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    // Enforce Password Strength: Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(password)) {
      setError('Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.');
      return;
    }

    try {
      setError('');
      setLoading(true);
      await register(name, email, password, role);
      if (role === 'admin') {
         navigate('/admin/dashboard');
      } else if (role === 'staff') {
         navigate('/staff/dashboard');
      } else {
         navigate('/dashboard');
      }
    } catch (err) {
      setError('Failed to create account: ' + err.message);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="mb-8 flex items-center justify-center space-x-3 bg-slate-900 px-6 py-3 rounded-full border border-slate-800">
        <div className="bg-emerald-500/20 p-2 rounded-full">
          <MapPin className="text-emerald-400 w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          VenueFlow {roleTitle}
        </h1>
      </div>
      <div className="bg-slate-900 p-8 rounded-2xl w-full max-w-md border border-slate-800 shadow-2xl">
        <h2 className="text-xl font-semibold mb-6 text-center text-slate-200">Create Account</h2>
        {error && <div aria-live="assertive" className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm text-slate-400 mb-1">Full Name</label>
            <input 
              id="name"
              type="text" 
              required 
              value={name} 
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-4 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm text-slate-400 mb-1">Email</label>
            <input 
              id="email"
              type="email" 
              required 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-4 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm text-slate-400 mb-1">Password</label>
            <input 
              id="password"
              type="password" 
              required 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-4 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button 
            disabled={loading} 
            aria-busy={loading}
            className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50 focus:ring-2 focus:ring-emerald-400 focus:outline-none"
            type="submit"
          >
            {loading ? 'Processing...' : 'Register'}
          </button>
        </form>
        {loginPath && (
          <div className="mt-4 text-center text-sm text-slate-400">
          Already have an account? <Link to="/login" className="text-emerald-400 font-medium underline hover:text-emerald-300">Login</Link>
        </div>
        )}
      </div>
    </div>
  );
}
