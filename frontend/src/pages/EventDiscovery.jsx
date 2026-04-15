import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
  Calendar, 
  MapPin, 
  Loader2, 
  User, 
  Shield, 
  Activity, 
  Menu, 
  X, 
  ChevronRight,
  Zap,
  Ticket
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const LandingPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (location.state?.error || location.state?.message) {
      setToast(location.state.error || location.state.message);
      // clear state to prevent toast on refresh
      window.history.replaceState({}, document.title);
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [location]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/events/list`);
        const data = response.data;
        if (Array.isArray(data)) {
          setEvents(data.slice(0, 6)); // Show top 6
        } else if (data && typeof data === 'object') {
          setEvents(Object.values(data).slice(0, 6));
        }
      } catch (error) {
        console.error("Failed to fetch events:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-500/30">
      {/* ─── Navigation ───────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/40">
              <Zap className="text-white fill-white" size={20} />
            </div>
            <span className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              VENUEFLOW
            </span>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <a href="#events" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Events</a>
            <a href="#features" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Technology</a>
            {currentUser ? (
              <button 
                disabled={!userProfile}
                onClick={() => {
                  if (!userProfile) return;
                  const role = userProfile.role;
                  if (role === 'admin') navigate('/admin/dashboard');
                  else if (role === 'staff') navigate('/staff/dashboard');
                  else navigate('/dashboard');
                }}
                className="bg-white text-slate-950 px-6 py-2.5 rounded-full text-sm font-bold hover:bg-slate-200 transition-all active:scale-95 shadow-lg shadow-white/10 disabled:opacity-50 disabled:cursor-wait"
              >
                {userProfile ? 'Go to Dashboard' : 'Verifying Role...'}
              </button>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="text-sm font-bold text-slate-100 hover:bg-white/5 px-4 py-2.5 rounded-full transition-all">
                  Log In
                </Link>
                <Link to="/register" className="bg-blue-600 text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-blue-500 transition-all active:scale-95 shadow-lg shadow-blue-900/20">
                  Join Now
                </Link>
              </div>
            )}
          </div>

          <button aria-label="Toggle Navigation Menu" aria-expanded={isMenuOpen} className="md:hidden text-slate-400" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {/* ─── Toast Notification ────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-blue-500/20 px-6 py-4 rounded-3xl shadow-2xl flex items-center space-x-4">
            <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400">
              <Shield size={20} />
            </div>
            <p className="text-sm font-bold text-slate-100 pr-4">{toast}</p>
            <button aria-label="Close Notification" onClick={() => setToast(null)} className="text-slate-500 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* ─── Hero Section ────────────────────────────────────────────────────── */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-blue-600/20 blur-[120px] rounded-full -z-10 opacity-50" />
        <div className="absolute top-40 right-0 w-96 h-96 bg-violet-600/10 blur-[100px] rounded-full -z-10" />

        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full backdrop-blur-sm animate-fade-in">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Next-Gen Crowd Routing</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[0.9] text-white">
            Experience the <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-violet-400 to-emerald-400">Future of Arenas.</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
            VenueFlow leverages Gemini 2.5 Flash to provide real-time AI crowd intelligence, 
            smart entry routing, and live heatmaps for a seamless event experience.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <button 
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto bg-blue-600 text-white px-10 py-5 rounded-2xl text-lg font-black hover:bg-blue-500 transition-all hover:scale-[1.02] active:scale-95 shadow-2xl shadow-blue-900/40 flex items-center justify-center space-x-2"
            >
              <span>Get Started</span>
              <ChevronRight size={20} />
            </button>
            <a 
              href="#events"
              className="w-full sm:w-auto bg-white/5 border border-white/10 text-white px-10 py-5 rounded-2xl text-lg font-bold hover:bg-white/10 transition-all active:scale-95"
            >
              Explore Events
            </a>
          </div>
        </div>
      </section>

      {/* ─── Featured Events ─────────────────────────────────────────────────── */}
      <section id="events" className="py-24 px-6 bg-slate-900/30">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <h2 className="text-4xl font-black tracking-tight text-white">Featured Events</h2>
              <p className="text-slate-400 font-medium max-w-md">Discover world-class matches and performances currently powered by our AI orchestration.</p>
            </div>
            <button className="text-blue-400 font-bold flex items-center space-x-2 hover:text-blue-300 transition-colors">
              <span>View Schedule</span>
              <ArrowRight size={18} />
            </button>
          </div>

          {loading ? (
             <div className="flex flex-col items-center justify-center py-20">
               <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {events.map((event) => (
                <div 
                  key={event.id}
                  className="group bg-slate-900/50 border border-white/5 rounded-[2.5rem] overflow-hidden transition-all duration-500"
                >
                  <div className="h-64 bg-slate-800 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent z-10" />
                    <div className="absolute inset-0 bg-blue-600/10 z-0" />
                    {/* Placeholder for event visuals */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-20">
                      <Activity size={120} className="text-white" />
                    </div>
                    
                    <div className="absolute top-6 left-6 z-20">
                      <span className="bg-blue-600/90 backdrop-blur-md text-white border border-white/10 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl">
                        {(event?.type || 'Live').replace('_', ' ')}
                      </span>
                    </div>

                    <div className="absolute bottom-8 left-8 right-8 z-20">
                      <h3 className="text-2xl font-black text-white leading-tight">{event.name}</h3>
                    </div>
                  </div>

                  <div className="p-8 space-y-6">
                    <div className="flex flex-col space-y-3">
                      <div className="flex items-center text-slate-400 text-sm font-medium bg-white/5 w-fit px-3 py-1.5 rounded-xl border border-white/5">
                        <Calendar size={14} className="mr-2 text-blue-400" />
                        {new Date(event.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="flex items-center text-slate-400 text-sm font-medium bg-white/5 w-fit px-3 py-1.5 rounded-xl border border-white/5">
                        <MapPin size={14} className="mr-2 text-violet-400" />
                        {event.venue_name || 'Global Arena'}
                      </div>
                    </div>

                    <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                      <div className="flex -space-x-2">
                         {[1,2,3].map(i => (
                           <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">
                             <User size={12} />
                           </div>
                         ))}
                         <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-blue-600 flex items-center justify-center text-[8px] font-black text-white">
                           +12k
                         </div>
                      </div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Powered by AI</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="space-y-4 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Zap size={16} className="text-white" />
              </div>
              <span className="text-xl font-black tracking-tighter">VENUEFLOW</span>
            </div>
            <p className="text-slate-400 text-sm font-medium max-w-xs">
              Optimizing every second of your event journey with state-of-the-art crowd intelligence.
            </p>
          </div>
          
          <div className="flex flex-col items-center md:items-end space-y-4">
            <div className="flex items-center space-x-6 text-slate-400" role="group" aria-label="Social Links">
              <Shield size={20} className="hover:text-white transition-colors cursor-pointer" aria-label="Security" />
              <Activity size={20} className="hover:text-white transition-colors cursor-pointer" aria-label="Status" />
              <Zap size={20} className="hover:text-white transition-colors cursor-pointer" aria-label="Fast Performance" />
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">
              © 2026 VenueFlow • Built for Hackathons
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Helper components missing from above imports
const ArrowRight = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12h14m-7-7 7 7-7 7" />
  </svg>
);

export default LandingPage;
