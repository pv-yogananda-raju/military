import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Lock, User, Loader2, Award, Building, Mail, Phone, Key } from 'lucide-react';

const Login = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  
  // Login fields
  const [officerId, setOfficerId] = useState('');
  const [password, setPassword] = useState('');
  
  // Register fields
  const [regData, setRegData] = useState({
    officerId: '',
    fullName: '',
    rank: '',
    role: 'Field Officer',
    department: '',
    clearanceLevel: 'Level 1',
    email: '',
    phone: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!officerId.trim() || !password.trim()) {
      setError('Required field validation mismatch: Enter ID and password.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    const res = await login(officerId.toUpperCase(), password);
    setLoading(false);

    if (!res.success) {
      setError(res.message || 'Clearance Denied: Cryptographic credentials mismatch.');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const { officerId, fullName, rank, department, email, phone, password } = regData;

    if (!officerId.trim() || !fullName.trim() || !rank.trim() || !department.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      setError('Required validation mismatch: Complete all security profile fields.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    const res = await register(regData);
    setLoading(false);

    if (res.success) {
      setSuccessMsg(res.message || 'Enlistment request submitted. Operational profile is pending Admin Commander activation.');
      setRegData({
        officerId: '',
        fullName: '',
        rank: '',
        role: 'Field Officer',
        department: '',
        clearanceLevel: 'Level 1',
        email: '',
        phone: '',
        password: '',
      });
    } else {
      setError(res.message || 'Enlistment rejected: Verification failure.');
    }
  };

  return (
    <div className="min-h-screen bg-tactical-bg flex flex-col justify-between items-center px-4 relative overflow-hidden font-sans tactical-grid-bg">
      {/* DRDO System Grid Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/30 via-tactical-bg to-tactical-bg z-0 pointer-events-none"></div>

      {/* Main card panel */}
      <div className="w-full max-w-xl my-auto z-10 py-8">
        <div className="bg-tactical-panel border border-tactical-border rounded-2xl shadow-tactical p-8 relative overflow-hidden">
          {/* Top Operational Status Indicator */}
          <div className="absolute top-0 left-0 w-full h-[4px] bg-tactical-green"></div>

          {/* DRDO/ISRO Mission Control Header */}
          <div className="flex flex-col items-center space-y-3 mb-6">
            <div className="p-3 bg-tactical-green/10 text-tactical-green rounded-2xl border border-tactical-border">
              <ShieldAlert className="w-8 h-8 animate-pulse-tactical text-tactical-green" />
            </div>
            <div className="text-center font-mono">
              <h1 className="text-xl font-black text-white tracking-widest leading-none">MISCS</h1>
              <p className="text-[10px] text-tactical-gray tracking-widest uppercase mt-1.5 font-bold">
                Tactical Signals & Surveillance Command Console
              </p>
              <div className="flex items-center justify-center space-x-1.5 mt-2">
                <span className="h-1.5 w-1.5 bg-tactical-green rounded-full animate-ping"></span>
                <span className="text-[9px] text-tactical-green font-bold tracking-wider uppercase">Secure Link Online</span>
              </div>
            </div>
          </div>

          {/* MODE TOGGLE SWITCH (DRDO Style) */}
          <div className="flex border-b border-tactical-border mb-6 p-1 bg-slate-950/40 rounded-xl">
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={`w-1/2 py-2 text-center text-xs font-mono font-bold tracking-widest rounded-lg transition-all
                ${mode === 'login' 
                  ? 'bg-tactical-border text-white border border-tactical-border shadow-glowGreen' 
                  : 'text-tactical-gray hover:text-white'}`}
            >
              SECURE SIGN-IN
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); }}
              className={`w-1/2 py-2 text-center text-xs font-mono font-bold tracking-widest rounded-lg transition-all
                ${mode === 'register' 
                  ? 'bg-tactical-border text-white border border-tactical-border shadow-glowGreen' 
                  : 'text-tactical-gray hover:text-white'}`}
            >
              ENLIST OPERATIVE
            </button>
          </div>

          {/* Feedback Feeds */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-tactical-red/10 border border-tactical-red/30 text-tactical-red text-xs font-mono font-bold flex items-start space-x-2">
              <span className="font-extrabold">[!]</span>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3 rounded-xl bg-tactical-green/10 border border-tactical-green/30 text-tactical-green text-xs font-mono font-bold flex items-start space-x-2">
              <span className="font-extrabold">[+]</span>
              <span>{successMsg}</span>
            </div>
          )}

          {/* Mode-Based Form Controllers */}
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] text-tactical-gray font-mono font-bold tracking-widest uppercase mb-1.5">
                  Operative Officer ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={officerId}
                    onChange={(e) => setOfficerId(e.target.value)}
                    placeholder="E.G. OFF-101"
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-3 pl-11 pr-4 text-xs font-mono text-white tracking-widest placeholder-tactical-gray/30 transition-all uppercase glow-border-hover"
                  />
                  <User className="absolute left-4 top-3.5 w-4 h-4 text-tactical-gray" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-tactical-gray font-mono font-bold tracking-widest uppercase mb-1.5">
                  Cryptographic Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-3 pl-11 pr-4 text-xs font-mono text-white tracking-widest placeholder-tactical-gray/30 transition-all glow-border-hover"
                  />
                  <Lock className="absolute left-4 top-3.5 w-4 h-4 text-tactical-gray" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 bg-tactical-green text-white font-mono font-bold tracking-widest py-3.5 rounded-xl hover:bg-opacity-95 active:scale-[0.99] transition-all text-xs cursor-pointer shadow-glowGreen"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>VERIFYING CLEARANCE...</span>
                  </>
                ) : (
                  <span>AUTHORIZE DECRYPTION</span>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-4 font-mono text-xs text-white">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-tactical-gray font-bold tracking-widest uppercase mb-1">
                    Officer ID (Unique)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={regData.officerId}
                      onChange={(e) => setRegData({ ...regData, officerId: e.target.value })}
                      placeholder="E.G. OFF-105"
                      className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 pl-9 pr-3 text-[11px] placeholder-tactical-gray/30 transition-all uppercase glow-border-hover"
                    />
                    <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-tactical-gray" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-tactical-gray font-bold tracking-widest uppercase mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={regData.fullName}
                      onChange={(e) => setRegData({ ...regData, fullName: e.target.value })}
                      placeholder="E.G. Capt. Aarav Sharma"
                      className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 pl-9 pr-3 text-[11px] placeholder-tactical-gray/30 transition-all glow-border-hover"
                    />
                    <Award className="absolute left-3 top-2.5 w-3.5 h-3.5 text-tactical-gray" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-tactical-gray font-bold tracking-widest uppercase mb-1">
                    Officer Rank
                  </label>
                  <input
                    type="text"
                    required
                    value={regData.rank}
                    onChange={(e) => setRegData({ ...regData, rank: e.target.value })}
                    placeholder="E.G. Captain"
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-[11px] placeholder-tactical-gray/30 transition-all glow-border-hover"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-tactical-gray font-bold tracking-widest uppercase mb-1">
                    Tactical Department
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={regData.department}
                      onChange={(e) => setRegData({ ...regData, department: e.target.value })}
                      placeholder="E.G. Cyber Warfare"
                      className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 pl-9 pr-3 text-[11px] placeholder-tactical-gray/30 transition-all glow-border-hover"
                    />
                    <Building className="absolute left-3 top-2.5 w-3.5 h-3.5 text-tactical-gray" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-tactical-gray font-bold tracking-widest uppercase mb-1">
                    Clearance Gate
                  </label>
                  <select
                    value={regData.clearanceLevel}
                    onChange={(e) => setRegData({ ...regData, clearanceLevel: e.target.value })}
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-[11px] text-white"
                  >
                    <option value="Level 1">Level 1 Clearance</option>
                    <option value="Level 2">Level 2 Clearance</option>
                    <option value="Level 3">Level 3 Clearance</option>
                    <option value="Top Secret">Top Secret Clearance</option>
                    <option value="Cosmic Top Secret">Cosmic Top Secret</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-tactical-gray font-bold tracking-widest uppercase mb-1">
                    System Role
                  </label>
                  <select
                    value={regData.role}
                    onChange={(e) => setRegData({ ...regData, role: e.target.value })}
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-[11px] text-white"
                  >
                    <option value="Field Officer">Field Officer</option>
                    <option value="Intelligence Officer">Intelligence Officer</option>
                    <option value="Surveillance Analyst">Surveillance Analyst</option>
                    <option value="Admin Commander">Admin Commander</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-tactical-gray font-bold tracking-widest uppercase mb-1">
                    Secure Email Contact
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={regData.email}
                      onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                      placeholder="operative@miscs.gov.in"
                      className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 pl-9 pr-3 text-[11px] placeholder-tactical-gray/30 transition-all glow-border-hover"
                    />
                    <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-tactical-gray" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-tactical-gray font-bold tracking-widest uppercase mb-1">
                    Satellite Comms Phone
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={regData.phone}
                      onChange={(e) => setRegData({ ...regData, phone: e.target.value })}
                      placeholder="+91 98765..."
                      className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 pl-9 pr-3 text-[11px] placeholder-tactical-gray/30 transition-all glow-border-hover"
                    />
                    <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 text-tactical-gray" />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] text-tactical-gray font-bold tracking-widest uppercase mb-1">
                    Cryptographic Passkey
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={regData.password}
                      onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 pl-9 pr-3 text-[11px] placeholder-tactical-gray/30 transition-all glow-border-hover"
                    />
                    <Key className="absolute left-3 top-2.5 w-3.5 h-3.5 text-tactical-gray" />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 bg-tactical-green text-white font-mono font-bold tracking-widest py-3 rounded-xl hover:bg-opacity-95 active:scale-[0.99] transition-all text-xs cursor-pointer shadow-glowGreen mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>ENLISTING OPERATIVE...</span>
                  </>
                ) : (
                  <span>INITIALIZE ENLISTMENT & SIGN-IN</span>
                )}
              </button>
            </form>
          )}

          {/* Quick Notice Panel */}
          <div className="mt-8 pt-6 border-t border-tactical-border text-center font-mono">
            <p className="text-[8px] text-tactical-gray leading-normal">
              WARNING: SECURED SURVEILLANCE GATEWAY INTERCEPT ACTIVE. SECURED UNDER SYSTEM DIRECTIVE-A5. UNAUTHORIZED SYSTEM USAGE DETECTED WILL BE AUTOMATICALLY LOGGED, TRACED, AND CIVILLY/OPERATIONALLY PROSECUTED.
            </p>
          </div>
        </div>
      </div>

      {/* Premium responsive footer crediting team */}
      <footer className="w-full py-6 text-center z-10 font-mono">
        <p className="text-[10px] tracking-widest text-tactical-gray hover:text-white transition-all duration-300">
          Made by <span className="text-white font-bold">P V Yogananda Raju</span> and <span className="text-white font-bold">Rohit B Soimaraddi</span>
        </p>
      </footer>
    </div>
  );
};

export default Login;
