import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Menu, ShieldAlert, Cpu, Check, Activity, RefreshCw } from 'lucide-react';

const Header = ({ activeTab, setSidebarOpen, workerStatus }) => {
  const { user } = useAuth();
  const [showThreadsPanel, setShowThreadsPanel] = useState(false);

  const getBreadcrumbTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'TACTICAL COMMAND GRID';
      case 'comms': return 'SECURE COMMAND COMMUNICATION CENTRE';
      case 'officers': return 'OFFICER RESOURCE DIRECTORY';
      case 'intelligence': return 'INTELLIGENCE FILES & RECON ARCHIVES';
      case 'suspects': return 'CLASSIFIED ROGUE SUSPECT REGISTRY';
      case 'missions': return 'TACTICAL MISSION CONTROL CENTRE';
      case 'evidence': return 'SECURE CRYPTO-EVIDENCE LOCKER';
      case 'alerts': return 'LIVE SECTOR THREAT ALERT REGISTER';
      case 'logs': return 'SECURE SYSTEM AUDIT RECORDERS';
      case 'analytics': return 'ANALYTICS & STATISTICAL AGGREGATES';
      case 'settings': return 'PORTAL & PERMISSION CONTROLS';
      case 'profile': return 'OPERATIVE PORTFOLIO MATRIX';
      default: return 'COMMAND PORTAL';
    }
  };

  return (
    <header className="h-16 border-b border-tactical-border bg-tactical-panel/90 backdrop-blur flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center space-x-3">
        {/* Mobile menu trigger */}
        <button 
          onClick={() => setSidebarOpen(prev => !prev)}
          className="md:hidden p-1.5 rounded-lg border border-tactical-border bg-tactical-bg hover:bg-tactical-border text-tactical-text hover:text-white"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div>
          <h2 className="text-xs md:text-sm font-extrabold font-mono tracking-widest text-white">
            {getBreadcrumbTitle()}
          </h2>
        </div>
      </div>

      {/* Action panel & Thread coordinator */}
      <div className="flex items-center space-x-4">
        {/* Concurrency thread stats popup trigger */}
        <div className="relative">
          <button
            onClick={() => setShowThreadsPanel(!showThreadsPanel)}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-[10px] font-mono tracking-wider transition-all duration-200
              ${showThreadsPanel 
                ? 'bg-tactical-green/20 border-tactical-green text-tactical-greenLight shadow-glowGreen' 
                : 'bg-tactical-bg border-tactical-border text-tactical-text hover:bg-tactical-border/50 hover:text-white'}`}
          >
            <Cpu className="w-3.5 h-3.5 animate-pulse" />
            <span className="hidden sm:inline">CONCURRENT THREADS: ACTIVE</span>
            <span className="sm:hidden">THREADS</span>
          </button>

          {/* Real-time thread workers monitor portal */}
          {showThreadsPanel && (
            <div className="absolute right-0 mt-2 w-80 bg-tactical-panel border border-tactical-border rounded-xl shadow-2xl p-4 z-50 text-xs font-mono text-tactical-text">
              <div className="flex items-center justify-between pb-2 border-b border-tactical-border mb-3">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-tactical-greenLight animate-pulse" />
                  <span className="font-extrabold text-white">DBMS CONCURRENCY SYSTEM</span>
                </div>
                <span className="text-[9px] bg-tactical-green/20 border border-tactical-green/50 text-tactical-greenLight px-1.5 py-0.5 rounded uppercase">
                  Multi-Threaded
                </span>
              </div>
              <p className="text-[10px] text-tactical-gray leading-relaxed mb-3">
                Native Node.js `worker_threads` executing concurrent read/writes to MongoDB:
              </p>

              <div className="space-y-3">
                {/* Thread 1: Threat Monitor */}
                <div className="flex items-start justify-between bg-tactical-bg p-2 rounded-lg border border-tactical-border/60">
                  <div>
                    <p className="text-[10px] font-bold text-white">Thread-1: Threat Monitor</p>
                    <p className="text-[9px] text-tactical-gray">Polled: {workerStatus.threatMonitor?.monitoredCount ?? 0} critical threats</p>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tactical-greenLight opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-tactical-greenLight"></span>
                    </span>
                    <span className="text-[9px] text-tactical-greenLight font-bold">RUNNING</span>
                  </div>
                </div>

                {/* Thread 2: Evidence Processing */}
                <div className="flex items-start justify-between bg-tactical-bg p-2 rounded-lg border border-tactical-border/60">
                  <div>
                    <p className="text-[10px] font-bold text-white">Thread-2: Crypto Engine</p>
                    <p className="text-[9px] text-tactical-gray">SHA-256 Hashing: Queue Online</p>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tactical-greenLight opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-tactical-greenLight"></span>
                    </span>
                    <span className="text-[9px] text-tactical-greenLight font-bold">RUNNING</span>
                  </div>
                </div>

                {/* Thread 3: Deadline Sentinel */}
                <div className="flex items-start justify-between bg-tactical-bg p-2 rounded-lg border border-tactical-border/60">
                  <div>
                    <p className="text-[10px] font-bold text-white">Thread-3: Mission Deadlines</p>
                    <p className="text-[9px] text-tactical-gray">Scans timeline alerts</p>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tactical-greenLight opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-tactical-greenLight"></span>
                    </span>
                    <span className="text-[9px] text-tactical-greenLight font-bold">RUNNING</span>
                  </div>
                </div>

                {/* Thread 4: User simulator */}
                <div className="flex items-start justify-between bg-tactical-bg p-2 rounded-lg border border-tactical-border/60">
                  <div>
                    <p className="text-[10px] font-bold text-white">Thread-4: Traffic Simulator</p>
                    <p className="text-[9px] text-tactical-gray">Last Action: {workerStatus.simulator?.actionLogged ? workerStatus.simulator.actionLogged.split(' ')[0] : 'Scanning...'}</p>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tactical-greenLight opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-tactical-greenLight"></span>
                    </span>
                    <span className="text-[9px] text-tactical-greenLight font-bold">RUNNING</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-tactical-border flex justify-between items-center text-[9px] text-tactical-gray">
                <span>DBMS CONCURRENCY LEVEL 4</span>
                <span className="text-tactical-greenLight font-bold">SECURE PIPELINE</span>
              </div>
            </div>
          )}
        </div>

        {/* User rank label and status badge */}
        {user && user.clearanceLevel && (
          <div className="hidden sm:flex items-center space-x-2 border-l border-tactical-border pl-4">
            <span className="text-[10px] bg-tactical-border text-tactical-text px-2 py-1 rounded font-mono font-bold tracking-wider">
              {user.clearanceLevel.toUpperCase()}
            </span>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
