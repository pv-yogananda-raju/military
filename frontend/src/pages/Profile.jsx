import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { resolveMediaUrl } from '../config';
import { User, Shield, Mail, Phone, ImageIcon, Loader2, Save, Download } from 'lucide-react';

const Profile = ({ onTriggerToast, refreshData }) => {
  const { user, authFetch } = useAuth();
  
  // States
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [rank, setRank] = useState(user?.rank || '');
  const [profileImage, setProfileImage] = useState(user?.profileImage || '');
  const [email, setEmail] = useState(user?.contactDetails?.email || '');
  const [phone, setPhone] = useState(user?.contactDetails?.phone || '');
  const [password, setPassword] = useState('');
  
  const [uploadingPic, setUploadingPic] = useState(false);
  const [fullscreenId, setFullscreenId] = useState(false);

  // Dynamic CDN script loader for html2pdf.js
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleProfilePicUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onTriggerToast('Tactical Alert: Only image formats (JPG, PNG, WEBP) are authorized for profile photos.', 'error');
      return;
    }

    try {
      setUploadingPic(true);
      const fd = new FormData();
      fd.append('file', file);

      const res = await authFetch('/upload', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        setProfileImage(data.file.fileUrl);
        onTriggerToast('Classified profile photo uploaded successfully! Click Apply Changes to sync.', 'success');
      } else {
        onTriggerToast(data.message, 'error');
      }
    } catch (err) {
      console.error('[Profile Pic Upload Error]', err);
      onTriggerToast('Failed to upload profile photo.', 'error');
    } finally {
      setUploadingPic(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !rank.trim() || !email.trim() || !phone.trim()) {
      onTriggerToast('Required fields cannot be left empty.', 'warning');
      return;
    }

    try {
      setLoading(true);
      const res = await authFetch(`/officers/${user.officerId}`, {
        method: 'PUT',
        body: JSON.stringify({
          fullName,
          rank,
          profileImage,
          email,
          phone,
          password: password ? password : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onTriggerToast('Operative profile synced directly with MongoDB!', 'success');
        // Refresh contexts and re-load new state
        if (refreshData) refreshData();
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        onTriggerToast(data.message, 'error');
      }
    } catch (error) {
      console.error('[Update Profile Error]', error);
      onTriggerToast('Failed to modify profile records.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('tactical-id-card-container');
    if (!element) return;
    
    if (window.html2pdf) {
      const opt = {
        margin: 5,
        filename: `TACTICAL_ID_${user.officerId}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };
      
      window.html2pdf().set(opt).from(element).save();
      onTriggerToast('Classified Access Pass PDF downloaded successfully!', 'success');
    } else {
      onTriggerToast('Tactical PDF compiler is initializing. Please retry in a few seconds.', 'warning');
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ⚠️ Critical Suspended Alert Banner */}
      {(user.status || '').toUpperCase() === 'SUSPENDED' && (
        <div 
          className="bg-gradient-to-r from-red-950 via-red-900 to-red-950 border border-tactical-red/60 text-tactical-redLight px-6 py-4 rounded-2xl flex items-center justify-between shadow-tactical animate-pulse"
          style={{ boxShadow: '0 0 15px rgba(255, 61, 61, 0.2)' }}
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-tactical-red/20 rounded-xl border border-tactical-red/40 text-tactical-red">
              <span className="font-extrabold text-sm leading-none block">⚠️</span>
            </div>
            <div>
              <h4 className="font-extrabold text-white text-xs uppercase tracking-wider">SECURITY NOTICE: Operative Clearance Suspended</h4>
              <p className="text-[10px] text-tactical-gray font-mono mt-0.5">THIS OPERATIVE PROFILE HAS BEEN OFFICIALLY SUSPENDED BY ORDER OF COMMAND DIRECTIVE. ALL SYSTEM CLEARANCES TERMINATED.</p>
            </div>
          </div>
          <span className="bg-tactical-red text-slate-950 font-black px-2.5 py-0.5 rounded text-[8px] tracking-widest uppercase">SUSPENDED</span>
        </div>
      )}

      {/* 1. Tactical ID access pass display card container */}
      <div className="bg-tactical-panel border border-tactical-border rounded-2xl p-6 shadow-tactical relative overflow-hidden space-y-6">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-cyan-500 shadow-[0_0_8px_#06b6d4]"></div>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-tactical-border/60 pb-4 gap-4">
          <div>
            <h3 className="text-sm font-black font-mono tracking-widest text-white uppercase flex items-center space-x-2">
              <Shield className="w-4 h-4 text-cyan-400 filter drop-shadow(0 0 3px rgba(6,182,212,0.4))" />
              <span>Tactical Security ID Access Pass</span>
            </h3>
            <p className="text-[9px] text-tactical-gray font-mono uppercase mt-1">Class-4 secure matrix access credentials</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFullscreenId(true)}
              className="flex items-center space-x-2 bg-slate-900 border border-cyan-500/40 hover:border-cyan-400 text-cyan-400 font-mono text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.15)] transition-all uppercase hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="text-[10px]">🔍</span>
              <span>Inspect Fullscreen</span>
            </button>
            
            <button
              onClick={handleDownloadPDF}
              className="flex items-center space-x-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-black px-4 py-2.5 rounded-xl cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.3)] transition-all uppercase hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="w-4 h-4 text-slate-950" />
              <span>Download PDF Access Pass</span>
            </button>
          </div>
        </div>

        <div 
          id="tactical-id-card-container" 
          className="flex flex-col md:flex-row gap-8 justify-center items-center p-6 bg-slate-950/40 rounded-2xl border border-tactical-border/40"
          style={{ width: '960px', margin: '0 auto' }}
        >
          {/* FRONT SIDE */}
          <div className="w-[440px] h-[272px] bg-gradient-to-br from-[#0b0f19] via-[#05070c] to-[#010203] border-2 border-cyan-500/50 rounded-2xl p-5 flex flex-col justify-between relative shadow-[0_0_30px_rgba(6,182,212,0.2)] overflow-hidden font-mono text-white select-none transition-all">
            {/* Sleek Top Neon Highlight Bar */}
            <div className="absolute top-0 left-0 w-full h-[5px] bg-gradient-to-r from-[#FF9933] via-[#FFFFFF] to-[#138808] z-20 shadow-md"></div>

            {/* Cyber Diagonal Watermark Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.015)_1px,transparent_1px)] bg-[size:8px_8px] pointer-events-none z-0"></div>
            
            {/* circular circuit SVG watermark */}
            <svg viewBox="0 0 100 100" className="absolute top-1/2 left-[60%] -translate-x-1/2 -translate-y-1/2 w-48 h-48 opacity-[0.09] pointer-events-none select-none z-0 text-cyan-400 filter drop-shadow(0 0 4px rgba(6,182,212,0.5))">
              <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="1" fill="none" strokeDasharray="4 4" />
              <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="0.75" fill="none" />
              <circle cx="50" cy="50" r="12" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <path d="M 50 10 L 50 90 M 10 50 L 90 50" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
              <path d="M 25 25 L 35 35 L 35 65 L 25 75 M 75 25 L 65 35 L 65 65 L 75 75" stroke="currentColor" strokeWidth="0.75" fill="none" />
              <circle cx="50" cy="22" r="2" fill="currentColor" />
              <circle cx="50" cy="78" r="2" fill="currentColor" />
              <circle cx="22" cy="50" r="2" fill="currentColor" />
              <circle cx="78" cy="50" r="2" fill="currentColor" />
            </svg>

            {/* Card Header */}
            <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2.5 z-10 mt-1">
              <div className="flex items-center space-x-2.5">
                <Shield className="w-6 h-6 text-cyan-400 filter drop-shadow(0 0 3px rgba(6,182,212,0.6))" />
                <div className="text-left leading-none">
                  <h4 className="text-[10px] font-black tracking-widest leading-none text-white font-mono uppercase">SECURE MATRIX TACTICAL COMMAND</h4>
                  <p className="text-[6.5px] text-cyan-400 font-extrabold uppercase tracking-widest leading-none mt-1">OPERATIONAL SECURED ACCESS PASS • CLASS-4 LEVEL ALPHA</p>
                </div>
              </div>
              <span className={`text-[6.5px] border font-black px-2 py-0.5 rounded tracking-widest uppercase font-mono shadow-sm
                ${(user.status || '').toUpperCase() === 'SUSPENDED' 
                  ? 'bg-red-950/40 border-red-500/50 text-red-400 animate-pulse' 
                  : 'bg-cyan-950/40 border-cyan-500/50 text-cyan-400'
                }`}
              >
                {(user.status || 'Active').toUpperCase()}
              </span>
            </div>

            {/* Card Middle Content */}
            <div className="flex items-stretch gap-8 py-3 z-10 flex-1">
              {/* Profile Pic with cyber frames */}
              <div className="relative w-24 h-28 flex-shrink-0 border-2 border-cyan-500/40 bg-slate-950 p-0.5 rounded-xl shadow-2xl overflow-hidden flex items-center justify-center">
                <img 
                  src={resolveMediaUrl(profileImage || user.profileImage)} 
                  alt={user.fullName} 
                  className="w-full h-full object-cover rounded-lg cursor-pointer hover:scale-105 transition-all"
                  onClick={() => {
                    const orig = profileImage || user.profileImage;
                    window.open(orig && (orig.startsWith('http://') || orig.startsWith('https://')) ? orig : resolveMediaUrl(orig), '_blank');
                  }}
                  title="Click to view full photo in new tab"
                />
                {/* Photo Scanning Sweep Bar */}
                <div className="absolute inset-x-0.5 top-0.5 h-[2px] bg-cyan-400 shadow-[0_0_10px_#06b6d4] animate-[bounce_3s_infinite] opacity-80"></div>
                <div className="absolute bottom-0.5 inset-x-0.5 bg-slate-950/85 text-[5.5px] text-center text-cyan-400 font-black py-0.5 tracking-wider uppercase border border-cyan-500/15 rounded">
                  BIOMETRIC.OK
                </div>
              </div>

              {/* Main Identity Information */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 text-left leading-none">
                <div>
                  <p className="text-[6.5px] text-slate-400 uppercase tracking-widest font-extrabold">OPERATIVE ID NUMBER</p>
                  <p className="text-[13px] font-black tracking-widest text-cyan-400 uppercase font-mono mt-0.5 filter drop-shadow(0 0 2px rgba(6,182,212,0.4))">{user.officerId}</p>
                </div>

                <div>
                  <p className="text-[6.5px] text-slate-400 uppercase tracking-widest font-extrabold">NAME</p>
                  <div className="text-[12px] font-black text-white uppercase font-sans mt-0.5 tracking-wide leading-tight whitespace-normal break-words max-w-[270px]">
                    {fullName || user.fullName}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-tactical-border/20 pt-1.5">
                  <div>
                    <p className="text-[6.5px] text-slate-400 uppercase tracking-widest font-bold font-mono">OFFICIAL RANK</p>
                    <p className="text-[10px] font-bold text-white uppercase truncate mt-0.5 font-mono">{rank || user.rank}</p>
                  </div>
                  <div>
                    <p className="text-[6.5px] text-slate-400 uppercase tracking-widest font-bold font-mono">SYSTEM ACCESS</p>
                    <p className="text-[10px] font-black text-cyan-400 uppercase truncate mt-0.5 font-mono">{user.clearanceLevel}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card Footer */}
            <div className="flex items-center justify-between border-t border-cyan-500/30 pt-2.5 z-10 text-[6.5px]">
              <div className="leading-tight text-left">
                <p className="text-[5.8px] text-slate-400 uppercase tracking-wider font-extrabold">ASSIGNED DIVISION</p>
                <p className="text-white font-extrabold uppercase truncate max-w-[220px] mt-0.5 tracking-wider">{user.branchUnit || 'CYBER WARFARE DIVISION'}</p>
              </div>
              {/* Clean Digital Hash Security Block */}
              <div className="text-left min-w-[80px] border-l border-tactical-border/30 pl-2.5">
                <p className="text-[4.8px] text-slate-400 uppercase font-extrabold tracking-widest">SECURITY HASH</p>
                <p className="text-[6px] font-mono text-cyan-400 mt-0.5 leading-none tracking-widest uppercase">
                  {`SHA256::${(fullName || user.fullName).substring(0, 3).toUpperCase()}${user.officerId}`}
                </p>
              </div>
              {/* CSS Styled Cyber Barcode */}
              <div className="flex items-end space-x-[2px] h-6 opacity-80 flex-shrink-0 bg-slate-950/60 p-0.5 rounded border border-cyan-500/20">
                <div className="w-[2px] h-full bg-cyan-400"></div>
                <div className="w-[3px] h-[90%] bg-cyan-400"></div>
                <div className="w-[1px] h-full bg-cyan-400"></div>
                <div className="w-[2px] h-[75%] bg-cyan-400"></div>
                <div className="w-[1.5px] h-full bg-cyan-400"></div>
                <div className="w-[3px] h-[80%] bg-cyan-400"></div>
                <div className="w-[1px] h-full bg-cyan-400"></div>
                <div className="w-[2.5px] h-full bg-cyan-400"></div>
              </div>
            </div>
          </div>

          {/* BACK SIDE */}
          <div className="w-[440px] h-[272px] bg-gradient-to-br from-[#0b0f19] via-[#05070c] to-[#010203] border-2 border-cyan-500/50 rounded-2xl p-5 flex flex-col justify-between relative shadow-[0_0_30px_rgba(6,182,212,0.2)] overflow-hidden font-mono text-white select-none transition-all">
            {/* Sleek Top Neon Highlight Bar */}
            <div className="absolute top-0 left-0 w-full h-[5px] bg-gradient-to-r from-[#FF9933] via-[#FFFFFF] to-[#138808] z-20 shadow-md"></div>

            {/* REALISTIC BLACK MAGNETIC STRIPE */}
            <div className="absolute top-[5px] left-0 w-full h-[32px] bg-[#0c0c0c] border-y border-black shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] z-10"></div>

            {/* Cyber Diagonal Watermark Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.015)_1px,transparent_1px)] bg-[size:8px_8px] pointer-events-none z-0"></div>

            {/* circular circuit SVG watermark */}
            <svg viewBox="0 0 100 100" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 opacity-[0.06] pointer-events-none select-none z-0 text-cyan-400">
              <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="1" fill="none" strokeDasharray="4 4" />
              <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="0.75" fill="none" />
              <circle cx="50" cy="50" r="12" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <path d="M 50 10 L 50 90 M 10 50 L 90 50" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
              <path d="M 25 25 L 35 35 L 35 65 L 25 75 M 75 25 L 65 35 L 65 65 L 75 75" stroke="currentColor" strokeWidth="0.75" fill="none" />
            </svg>

            {/* Header (shifted down below magnetic stripe) */}
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2.5 z-10 mt-[40px]">
              <div className="leading-tight text-left">
                <h4 className="text-[10px] font-black tracking-widest text-white font-mono uppercase">BIOMETRIC MATRIX RECORD</h4>
                <p className="text-[6px] text-cyan-400 font-extrabold uppercase tracking-widest leading-none mt-1">SECURED QUANTUM SYSTEM DIRECTIVE</p>
              </div>
              <div className="flex flex-col items-end text-right">
                <span className="text-[6px] text-slate-400 uppercase tracking-widest font-extrabold font-mono">BLOOD GROUP</span>
                <span className="text-[12px] font-black text-red-400 leading-none mt-1 filter drop-shadow(0 0 2px rgba(239,68,68,0.4))">{user.bloodGroup || 'O+'}</span>
              </div>
            </div>

            {/* Middle grid list of read-only metrics */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 py-3 text-[10px] leading-tight text-left z-10 flex-1 border-b border-cyan-500/20">
              <div>
                <p className="text-[6.5px] text-slate-400 uppercase tracking-wider font-extrabold">DATE OF BIRTH</p>
                <p className="text-white font-bold text-[9px] mt-0.5">{user.dob || '1988-06-15'}</p>
              </div>
              <div>
                <p className="text-[6.5px] text-slate-400 uppercase tracking-wider font-extrabold">DATE OF ENLISTMENT</p>
                <p className="text-white font-bold text-[9px] mt-0.5">{user.enlistmentDate || '2010-08-20'}</p>
              </div>
              <div>
                <p className="text-[6.5px] text-slate-400 uppercase tracking-wider font-extrabold">CREDENTIAL ISSUE DATE</p>
                <p className="text-white font-bold text-[9px] mt-0.5">{user.cardIssueDate || '2025-01-01'}</p>
              </div>
              <div>
                <p className="text-[6.5px] text-slate-400 uppercase tracking-wider font-extrabold">EXPIRATION TERMINUS</p>
                <p className="text-white font-bold text-[9px] mt-0.5">{user.cardExpirationDate || '2035-01-01'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[6.5px] text-slate-400 uppercase tracking-wider font-extrabold">IDENTIFICATION MARKINGS</p>
                <div className="text-white font-bold text-[8.5px] uppercase mt-0.5 leading-normal whitespace-normal break-words">
                  {user.identificationMarks || 'NONE DECLARED.'}
                </div>
              </div>
            </div>

            {/* National Tricolor Flag & Ashoka Chakra Emblem */}
            <div className="flex items-center justify-center py-1.5 z-10 bg-slate-950/40 border-y border-tactical-border/20 my-1">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-6 flex flex-col border border-slate-700/50 rounded-[1px] overflow-hidden flex-shrink-0 relative shadow-md">
                  <div className="h-1/3 bg-[#FF9933]"></div>
                  <div className="h-1/3 bg-[#FFFFFF] flex items-center justify-center relative">
                    {/* Ashoka Chakra with 24 Spokes SVG */}
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#000080] animate-[spin_25s_linear_infinite]">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.2" fill="none" />
                      <circle cx="12" cy="12" r="2" fill="currentColor" />
                      {Array.from({ length: 12 }).map((_, i) => (
                        <line 
                          key={i} 
                          x1="12" 
                          y1="12" 
                          x2={12 + 10 * Math.cos((i * Math.PI) / 6)} 
                          y2={12 + 10 * Math.sin((i * Math.PI) / 6)} 
                          stroke="currentColor" 
                          strokeWidth="0.6" 
                        />
                      ))}
                    </svg>
                  </div>
                  <div className="h-1/3 bg-[#138808]"></div>
                </div>
                <div className="leading-none text-left font-mono">
                  <span className="text-[7.5px] font-black text-white tracking-widest block uppercase">NATIONAL SURVEILLANCE DIRECTIVE</span>
                  <span className="text-[5.5px] font-bold text-tactical-gray tracking-wider block mt-0.5 uppercase">GOVERNMENT OF INDIA • MIN. OF DEFENCE</span>
                </div>
              </div>
            </div>

            {/* Warning notice & signature stamp */}
            <div className="pt-3 z-10 text-left flex flex-col justify-between gap-1 text-[5.5px]">
              <p className="text-slate-400 uppercase tracking-wider leading-normal text-[5px]">
                WARNING: CLASSIFIED OPERATIONAL SECURITY ASSET. UNAUTHORIZED POSSESSION, DUPLICATION, OR LOGISTICS EXPORT IS A CRITICAL VIOLATION OF TACTICAL MATRIX INTEL DIRECTIVES.
              </p>
              <div className="flex justify-between items-center mt-1 text-[6.5px]">
                <div>
                  <span className="text-slate-400 uppercase font-extrabold">ISSUING AUTHORITY: </span>
                  <span className="text-white font-extrabold uppercase tracking-wide">{user.issuingAuthority || 'SECURED SYSTEM COMMAND'}</span>
                </div>
                {/* Clean Command Auth Stamp block */}
                <div className="text-right pr-2">
                  <span className="font-mono text-cyan-400 text-[8.5px] leading-none block font-black uppercase tracking-wider">COMMAND.AUTH.2209</span>
                  <span className="text-[4.5px] text-slate-400 uppercase tracking-widest font-extrabold mt-0.5 block">SECURE TELEMETRY SEAL</span>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="text-[6px] text-cyan-400 font-black border border-cyan-500/40 px-1.5 py-0.5 rounded uppercase bg-cyan-950/20 tracking-wider filter drop-shadow(0 0 1px rgba(6,182,212,0.3))">
                    SYSTEM AUDITED SEAL
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-tactical-panel border border-tactical-border rounded-2xl p-6 shadow-tactical">
        <h3 className="text-xs font-bold font-mono tracking-widest text-white mb-6 uppercase pb-3 border-b border-tactical-border/60">
          Update Operative Parameters
        </h3>

        <form onSubmit={handleUpdateProfile} className="space-y-5 font-mono text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1.5">Operative Full Name (MongoDB Sync)</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2.5 pl-10 pr-4 text-white"
                />
                <User className="absolute left-3.5 top-3 w-4 h-4 text-tactical-gray" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1.5">Operative Rank (MongoDB Sync)</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={rank}
                  onChange={(e) => setRank(e.target.value)}
                  className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2.5 pl-10 pr-4 text-white"
                />
                <Shield className="absolute left-3.5 top-3 w-4 h-4 text-tactical-gray" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1.5">Secure Email Contact</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2.5 pl-10 pr-4 text-white"
                />
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-tactical-gray" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1.5">Satellite Comms Phone</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2.5 pl-10 pr-4 text-white"
                />
                <Phone className="absolute left-3.5 top-3 w-4 h-4 text-tactical-gray" />
              </div>
            </div>

            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1.5">Profile Photo URL (MongoDB Sync)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={profileImage}
                    onChange={(e) => setProfileImage(e.target.value)}
                    placeholder="URL link to soldier profile"
                    className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2.5 pl-10 pr-4 text-white text-[10px]"
                  />
                  <ImageIcon className="absolute left-3.5 top-3 w-4 h-4 text-tactical-gray" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1.5">Upload Photo</label>
                <div className="relative">
                  <input
                    type="file"
                    onChange={handleProfilePicUpload}
                    disabled={uploadingPic}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                    accept="image/*"
                  />
                  <div className={`w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 rounded-xl py-2.5 px-3 text-center text-[10px] text-tactical-text font-bold uppercase transition-all flex items-center justify-center space-x-1.5
                    ${uploadingPic ? 'animate-pulse' : ''}`}>
                    {uploadingPic ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Select File</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1.5">Change Password (Optional)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to preserve password"
                className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2.5 px-3 text-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-tactical-border/60">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-tactical-green text-white rounded-xl shadow-glowGreen font-bold cursor-pointer flex items-center space-x-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>SYNCING WITH DATABASE...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>APPLY CHANGES</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 3. Fullscreen ID Card Inspection Modal */}
      {fullscreenId && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setFullscreenId(false)}
        >
          <div 
            className="w-full max-w-5xl rounded-3xl p-6 bg-[#030712]/80 border border-cyan-500/20 shadow-[0_0_50px_rgba(6,182,212,0.15)] relative space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-cyan-500/20 pb-4">
              <div className="flex items-center space-x-3">
                <Shield className="w-6 h-6 text-cyan-400 filter drop-shadow(0 0 4px rgba(6,182,212,0.5))" />
                <div>
                  <h3 className="text-sm md:text-base font-extrabold font-mono tracking-widest text-white uppercase">
                    HIGH-RESOLUTION DIAGNOSTIC CARD INSPECTION
                  </h3>
                  <p className="text-[9px] text-cyan-400/80 font-mono uppercase tracking-wider mt-0.5">
                    VERIFIED SECURE INTERFACE PROTOCOL • CLEARANCE ALPHA-ACTIVE
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFullscreenId(false)}
                className="px-4 py-2 border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 hover:bg-cyan-500/10 rounded-xl transition-all font-mono text-xs font-black cursor-pointer shadow-[0_0_8px_rgba(6,182,212,0.1)]"
              >
                CLOSE DIAGNOSTICS
              </button>
            </div>

            {/* Enlarged Dual-Sided Cards View */}
            <div className="flex flex-col lg:flex-row gap-8 justify-center items-center py-6">
              {/* FRONT SIDE */}
              <div className="w-[440px] h-[272px] bg-gradient-to-br from-[#0b0f19] via-[#05070c] to-[#010203] border-2 border-cyan-500/50 rounded-2xl p-5 flex flex-col justify-between relative shadow-[0_0_30px_rgba(6,182,212,0.2)] overflow-hidden font-mono text-white select-none transition-all">
                {/* Sleek Top Neon Highlight Bar */}
                <div className="absolute top-0 left-0 w-full h-[5px] bg-gradient-to-r from-[#FF9933] via-[#FFFFFF] to-[#138808] z-20 shadow-md"></div>

                {/* Cyber Diagonal Watermark Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.015)_1px,transparent_1px)] bg-[size:8px_8px] pointer-events-none z-0"></div>
                
                {/* circular circuit SVG watermark */}
                <svg viewBox="0 0 100 100" className="absolute top-1/2 left-[60%] -translate-x-1/2 -translate-y-1/2 w-48 h-48 opacity-[0.09] pointer-events-none select-none z-0 text-cyan-400 filter drop-shadow(0 0 4px rgba(6,182,212,0.5))">
                  <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="1" fill="none" strokeDasharray="4 4" />
                  <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="0.75" fill="none" />
                  <circle cx="50" cy="50" r="12" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  <path d="M 50 10 L 50 90 M 10 50 L 90 50" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
                  <path d="M 25 25 L 35 35 L 35 65 L 25 75 M 75 25 L 65 35 L 65 65 L 75 75" stroke="currentColor" strokeWidth="0.75" fill="none" />
                  <circle cx="50" cy="22" r="2" fill="currentColor" />
                  <circle cx="50" cy="78" r="2" fill="currentColor" />
                  <circle cx="22" cy="50" r="2" fill="currentColor" />
                  <circle cx="78" cy="50" r="2" fill="currentColor" />
                </svg>

                {/* Card Header */}
                <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2.5 z-10 mt-1">
                  <div className="flex items-center space-x-2.5">
                    <Shield className="w-6 h-6 text-cyan-400 filter drop-shadow(0 0 3px rgba(6,182,212,0.6))" />
                    <div className="text-left leading-none">
                      <h4 className="text-[10px] font-black tracking-widest leading-none text-white font-mono uppercase">SECURE MATRIX TACTICAL COMMAND</h4>
                      <p className="text-[6.5px] text-cyan-400 font-extrabold uppercase tracking-widest leading-none mt-1">OPERATIONAL SECURED ACCESS PASS • CLASS-4 LEVEL ALPHA</p>
                    </div>
                  </div>
                  <span className={`text-[6.5px] border font-black px-2 py-0.5 rounded tracking-widest uppercase font-mono shadow-sm
                    ${(user.status || '').toUpperCase() === 'SUSPENDED' 
                      ? 'bg-red-950/40 border-red-500/50 text-red-400 animate-pulse' 
                      : 'bg-cyan-950/40 border-cyan-500/50 text-cyan-400'
                    }`}
                  >
                    {(user.status || 'Active').toUpperCase()}
                  </span>
                </div>

                {/* Card Middle Content */}
                <div className="flex items-stretch gap-8 py-3 z-10 flex-1">
                  {/* Profile Pic with cyber frames */}
                  <div className="relative w-24 h-28 flex-shrink-0 border-2 border-cyan-500/40 bg-slate-950 p-0.5 rounded-xl shadow-2xl overflow-hidden flex items-center justify-center">
                    <img 
                      src={resolveMediaUrl(profileImage || user.profileImage)} 
                      alt={user.fullName} 
                      className="w-full h-full object-cover rounded-lg cursor-pointer hover:scale-105 transition-all"
                      onClick={() => {
                        const orig = profileImage || user.profileImage;
                        window.open(orig && (orig.startsWith('http://') || orig.startsWith('https://')) ? orig : resolveMediaUrl(orig), '_blank');
                      }}
                      title="Click to view full photo in new tab"
                    />
                    {/* Photo Scanning Sweep Bar */}
                    <div className="absolute inset-x-0.5 top-0.5 h-[2px] bg-cyan-400 shadow-[0_0_10px_#06b6d4] animate-[bounce_3s_infinite] opacity-80"></div>
                    <div className="absolute bottom-0.5 inset-x-0.5 bg-slate-950/85 text-[5.5px] text-center text-cyan-400 font-black py-0.5 tracking-wider uppercase border border-cyan-500/15 rounded">
                      BIOMETRIC.OK
                    </div>
                  </div>

                  {/* Main Identity Information */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 text-left leading-none">
                    <div>
                      <p className="text-[6.5px] text-slate-400 uppercase tracking-widest font-extrabold">OPERATIVE ID NUMBER</p>
                      <p className="text-[13px] font-black tracking-widest text-cyan-400 uppercase font-mono mt-0.5 filter drop-shadow(0 0 2px rgba(6,182,212,0.4))">{user.officerId}</p>
                    </div>

                    <div>
                      <p className="text-[6.5px] text-slate-400 uppercase tracking-widest font-extrabold">NAME</p>
                      <div className="text-[12px] font-black text-white uppercase font-sans mt-0.5 tracking-wide leading-tight whitespace-normal break-words max-w-[270px]">
                        {fullName || user.fullName}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-tactical-border/20 pt-1.5">
                      <div>
                        <p className="text-[6.5px] text-slate-400 uppercase tracking-widest font-bold font-mono">OFFICIAL RANK</p>
                        <p className="text-[10px] font-bold text-white uppercase truncate mt-0.5 font-mono">{rank || user.rank}</p>
                      </div>
                      <div>
                        <p className="text-[6.5px] text-slate-400 uppercase tracking-widest font-bold font-mono">SYSTEM ACCESS</p>
                        <p className="text-[10px] font-black text-cyan-400 uppercase truncate mt-0.5 font-mono">{user.clearanceLevel}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="flex items-center justify-between border-t border-cyan-500/30 pt-2.5 z-10 text-[6.5px]">
                  <div className="leading-tight text-left">
                    <p className="text-[5.8px] text-slate-400 uppercase tracking-wider font-extrabold">ASSIGNED DIVISION</p>
                    <p className="text-white font-extrabold uppercase truncate max-w-[220px] mt-0.5 tracking-wider">{user.branchUnit || 'CYBER WARFARE DIVISION'}</p>
                  </div>
                  {/* Clean Digital Hash Security Block */}
                  <div className="text-left min-w-[80px] border-l border-tactical-border/30 pl-2.5">
                    <p className="text-[4.8px] text-slate-400 uppercase font-extrabold tracking-widest">SECURITY HASH</p>
                    <p className="text-[6px] font-mono text-cyan-400 mt-0.5 leading-none tracking-widest uppercase">
                      {`SHA256::${(fullName || user.fullName).substring(0, 3).toUpperCase()}${user.officerId}`}
                    </p>
                  </div>
                  {/* CSS Styled Cyber Barcode */}
                  <div className="flex items-end space-x-[2px] h-6 opacity-80 flex-shrink-0 bg-slate-950/60 p-0.5 rounded border border-cyan-500/20">
                    <div className="w-[2px] h-full bg-cyan-400"></div>
                    <div className="w-[3px] h-[90%] bg-cyan-400"></div>
                    <div className="w-[1px] h-full bg-cyan-400"></div>
                    <div className="w-[2px] h-[75%] bg-cyan-400"></div>
                    <div className="w-[1.5px] h-full bg-cyan-400"></div>
                    <div className="w-[3px] h-[80%] bg-cyan-400"></div>
                    <div className="w-[1px] h-full bg-cyan-400"></div>
                    <div className="w-[2.5px] h-full bg-cyan-400"></div>
                  </div>
                </div>
              </div>

              {/* BACK SIDE */}
              <div className="w-[440px] h-[272px] bg-gradient-to-br from-[#0b0f19] via-[#05070c] to-[#010203] border-2 border-cyan-500/50 rounded-2xl p-5 flex flex-col justify-between relative shadow-[0_0_30px_rgba(6,182,212,0.2)] overflow-hidden font-mono text-white select-none transition-all">
                {/* Sleek Top Neon Highlight Bar */}
                <div className="absolute top-0 left-0 w-full h-[5px] bg-gradient-to-r from-[#FF9933] via-[#FFFFFF] to-[#138808] z-20 shadow-md"></div>

                {/* REALISTIC BLACK MAGNETIC STRIPE */}
                <div className="absolute top-[5px] left-0 w-full h-[32px] bg-[#0c0c0c] border-y border-black shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] z-10"></div>

                {/* Cyber Diagonal Watermark Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.015)_1px,transparent_1px)] bg-[size:8px_8px] pointer-events-none z-0"></div>

                {/* circular circuit SVG watermark */}
                <svg viewBox="0 0 100 100" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 opacity-[0.06] pointer-events-none select-none z-0 text-cyan-400">
                  <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="1" fill="none" strokeDasharray="4 4" />
                  <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="0.75" fill="none" />
                  <circle cx="50" cy="50" r="12" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  <path d="M 50 10 L 50 90 M 10 50 L 90 50" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
                  <path d="M 25 25 L 35 35 L 35 65 L 25 75 M 75 25 L 65 35 L 65 65 L 75 75" stroke="currentColor" strokeWidth="0.75" fill="none" />
                </svg>

                {/* Header (shifted down below magnetic stripe) */}
                <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2.5 z-10 mt-[40px]">
                  <div className="leading-tight text-left">
                    <h4 className="text-[10px] font-black tracking-widest text-white font-mono uppercase">BIOMETRIC MATRIX RECORD</h4>
                    <p className="text-[6px] text-cyan-400 font-extrabold uppercase tracking-widest leading-none mt-1">SECURED QUANTUM SYSTEM DIRECTIVE</p>
                  </div>
                  <div className="flex flex-col items-end text-right">
                    <span className="text-[6px] text-slate-400 uppercase tracking-widest font-extrabold font-mono">BLOOD GROUP</span>
                    <span className="text-[12px] font-black text-red-400 leading-none mt-1 filter drop-shadow(0 0 2px rgba(239,68,68,0.4))">{user.bloodGroup || 'O+'}</span>
                  </div>
                </div>

                {/* Middle grid list of read-only metrics */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 py-3 text-[10px] leading-tight text-left z-10 flex-1 border-b border-cyan-500/20">
                  <div>
                    <p className="text-[6.5px] text-slate-400 uppercase tracking-wider font-extrabold">DATE OF BIRTH</p>
                    <p className="text-white font-bold text-[9px] mt-0.5">{user.dob || '1988-06-15'}</p>
                  </div>
                  <div>
                    <p className="text-[6.5px] text-slate-400 uppercase tracking-wider font-extrabold">DATE OF ENLISTMENT</p>
                    <p className="text-white font-bold text-[9px] mt-0.5">{user.enlistmentDate || '2010-08-20'}</p>
                  </div>
                  <div>
                    <p className="text-[6.5px] text-slate-400 uppercase tracking-wider font-extrabold">CREDENTIAL ISSUE DATE</p>
                    <p className="text-white font-bold text-[9px] mt-0.5">{user.cardIssueDate || '2025-01-01'}</p>
                  </div>
                  <div>
                    <p className="text-[6.5px] text-slate-400 uppercase tracking-wider font-extrabold">EXPIRATION TERMINUS</p>
                    <p className="text-white font-bold text-[9px] mt-0.5">{user.cardExpirationDate || '2035-01-01'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[6.5px] text-slate-400 uppercase tracking-wider font-extrabold">IDENTIFICATION MARKINGS</p>
                    <div className="text-white font-bold text-[8.5px] uppercase mt-0.5 leading-normal whitespace-normal break-words">
                      {user.identificationMarks || 'NONE DECLARED.'}
                    </div>
                  </div>
                </div>

                {/* National Tricolor Flag & Ashoka Chakra Emblem */}
                <div className="flex items-center justify-center py-1.5 z-10 bg-slate-950/40 border-y border-tactical-border/20 my-1">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-6 flex flex-col border border-slate-700/50 rounded-[1px] overflow-hidden flex-shrink-0 relative shadow-md">
                      <div className="h-1/3 bg-[#FF9933]"></div>
                      <div className="h-1/3 bg-[#FFFFFF] flex items-center justify-center relative">
                        {/* Ashoka Chakra with 24 Spokes SVG */}
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#000080] animate-[spin_25s_linear_infinite]">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.2" fill="none" />
                          <circle cx="12" cy="12" r="2" fill="currentColor" />
                          {Array.from({ length: 12 }).map((_, i) => (
                            <line 
                              key={i} 
                              x1="12" 
                              y1="12" 
                              x2={12 + 10 * Math.cos((i * Math.PI) / 6)} 
                              y2={12 + 10 * Math.sin((i * Math.PI) / 6)} 
                              stroke="currentColor" 
                              strokeWidth="0.6" 
                            />
                          ))}
                        </svg>
                      </div>
                      <div className="h-1/3 bg-[#138808]"></div>
                    </div>
                    <div className="leading-none text-left font-mono">
                      <span className="text-[7.5px] font-black text-white tracking-widest block uppercase">NATIONAL SURVEILLANCE DIRECTIVE</span>
                      <span className="text-[5.5px] font-bold text-tactical-gray tracking-wider block mt-0.5 uppercase">GOVERNMENT OF INDIA • MIN. OF DEFENCE</span>
                    </div>
                  </div>
                </div>

                {/* Warning notice & signature stamp */}
                <div className="pt-3 z-10 text-left flex flex-col justify-between gap-1 text-[5.5px]">
                  <p className="text-slate-400 uppercase tracking-wider leading-normal text-[5px]">
                    WARNING: CLASSIFIED OPERATIONAL SECURITY ASSET. UNAUTHORIZED POSSESSION, DUPLICATION, OR LOGISTICS EXPORT IS A CRITICAL VIOLATION OF TACTICAL MATRIX INTEL DIRECTIVES.
                  </p>
                  <div className="flex justify-between items-center mt-1 text-[6.5px]">
                    <div>
                      <span className="text-slate-400 uppercase font-extrabold">ISSUING AUTHORITY: </span>
                      <span className="text-white font-extrabold uppercase tracking-wide">{user.issuingAuthority || 'SECURED SYSTEM COMMAND'}</span>
                    </div>
                    {/* Clean Command Auth Stamp block instead of signatures */}
                    <div className="text-right pr-2">
                      <span className="font-mono text-cyan-400 text-[8px] leading-none block font-black uppercase tracking-wider">COMMAND.AUTH.2209</span>
                      <span className="text-[4.5px] text-slate-400 uppercase tracking-widest font-extrabold mt-0.5 block">SECURE TELEMETRY SEAL</span>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="text-[6px] text-cyan-400 font-black border border-cyan-500/40 px-1.5 py-0.5 rounded uppercase bg-cyan-950/20 tracking-wider filter drop-shadow(0 0 1px rgba(6,182,212,0.3))">
                        SYSTEM AUDITED SEAL
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Alert / Notice inside Fullscreen Inspect modal */}
            <div className="text-center text-[9px] font-mono text-cyan-400/50 uppercase select-none tracking-widest">
              CLICK ANYWHERE OUTSIDE OR PRESS CLOSE TO EXIT SECURE TELEMETRY SCREEN
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
