import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Settings, Shield, Database, Cpu, Users, Terminal } from 'lucide-react';

const SettingsPanel = () => {
  const { user } = useAuth();

  const systemParameters = [
    { name: 'Gateway Gateway Port', value: '5000' },
    { name: 'Active Collections', value: '7 collections online' },
    { name: 'Index Structures', value: 'Compound & Text indices compiled' },
    { name: 'Node.js Version', value: 'v18.17.0+' },
    { name: 'Database Latency', value: '24ms (Secure SSL)' },
  ];

  return (
    <div className="space-y-6 max-w-4xl font-mono text-xs">
      {/* 1. Database Connection Panel */}
      <div className="bg-tactical-panel border border-tactical-border rounded-2xl p-5 shadow-tactical space-y-4">
        <h3 className="text-xs font-bold tracking-widest text-white uppercase flex items-center space-x-2 pb-3 border-b border-tactical-border/40">
          <Database className="w-4 h-4 text-tactical-greenLight" />
          <span>MongoDB Atlas Connection Cluster</span>
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-tactical-bg p-3 rounded-xl border border-tactical-border/40">
            <span className="text-[8px] text-tactical-gray block uppercase font-bold">Mongoose State</span>
            <span className="text-tactical-greenLight font-bold flex items-center space-x-1.5 mt-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tactical-greenLight opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-tactical-greenLight"></span>
              </span>
              <span>ONLINE</span>
            </span>
          </div>

          <div className="bg-tactical-bg p-3 rounded-xl border border-tactical-border/40">
            <span className="text-[8px] text-tactical-gray block uppercase font-bold">Database Cluster</span>
            <span className="text-white font-bold mt-1 block">Atlas Secured (AWS)</span>
          </div>

          <div className="bg-tactical-bg p-3 rounded-xl border border-tactical-border/40">
            <span className="text-[8px] text-tactical-gray block uppercase font-bold">Query Index Status</span>
            <span className="text-tactical-greenLight font-bold mt-1 block">COMPILED</span>
          </div>
        </div>
      </div>

      {/* 2. Concurrency status matrix */}
      <div className="bg-tactical-panel border border-tactical-border rounded-2xl p-5 shadow-tactical space-y-4">
        <h3 className="text-xs font-bold tracking-widest text-white uppercase flex items-center space-x-2 pb-3 border-b border-tactical-border/40">
          <Cpu className="w-4 h-4 text-tactical-blue" />
          <span>Thread Concurrency Spawning Options</span>
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-2.5 bg-tactical-bg border border-tactical-border/60 rounded-xl">
            <div className="space-y-0.5">
              <h4 className="text-white font-bold">Thread-1: Threat Scanner Polling</h4>
              <p className="text-[10px] text-tactical-gray">Auto-triggers critical alert collection documents in MongoDB</p>
            </div>
            <span className="bg-tactical-green/10 border border-tactical-green/40 text-tactical-greenLight px-2 py-0.5 rounded text-[9px] font-bold">
              ACTIVE (8s loop)
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-tactical-bg border border-tactical-border/60 rounded-xl">
            <div className="space-y-0.5">
              <h4 className="text-white font-bold">Thread-2: Cryptographic Checksum Hashing</h4>
              <p className="text-[10px] text-tactical-gray">Calculates SHA-256 signatures for queued evidence uploads concurrently</p>
            </div>
            <span className="bg-tactical-green/10 border border-tactical-green/40 text-tactical-greenLight px-2 py-0.5 rounded text-[9px] font-bold">
              ACTIVE (5s loop)
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-tactical-bg border border-tactical-border/60 rounded-xl">
            <div className="space-y-0.5">
              <h4 className="text-white font-bold">Thread-3: Operational Deadline Sentinel</h4>
              <p className="text-[10px] text-tactical-gray">Escalates expired timelines and writes warning logs to MongoDB</p>
            </div>
            <span className="bg-tactical-green/10 border border-tactical-green/40 text-tactical-greenLight px-2 py-0.5 rounded text-[9px] font-bold">
              ACTIVE (10s loop)
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-tactical-bg border border-tactical-border/60 rounded-xl">
            <div className="space-y-0.5">
              <h4 className="text-white font-bold">Thread-4: Operatives Active Simulator</h4>
              <p className="text-[10px] text-tactical-gray">Injects database queries concurrently simulating field activities</p>
            </div>
            <span className="bg-tactical-green/10 border border-tactical-green/40 text-tactical-greenLight px-2 py-0.5 rounded text-[9px] font-bold">
              ACTIVE (15s loop)
            </span>
          </div>
        </div>
      </div>

      {/* 3. System Signatures */}
      <div className="bg-tactical-panel border border-tactical-border rounded-2xl p-5 shadow-tactical space-y-4">
        <h3 className="text-xs font-bold tracking-widest text-white uppercase flex items-center space-x-2 pb-3 border-b border-tactical-border/40">
          <Terminal className="w-4 h-4 text-tactical-gray" />
          <span>System Architect Signatures</span>
        </h3>
        
        <div className="p-4 bg-slate-950/40 border border-tactical-border/80 rounded-xl space-y-3 leading-relaxed">
          <p className="text-[10px] text-tactical-gray uppercase tracking-wider font-bold">
            Project Creators:
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-white">
              <span className="font-extrabold font-mono">P V YOGANANDA RAJU</span>
            </div>
            <div className="flex items-center justify-between text-xs text-white">
              <span className="font-extrabold font-mono">ROHIT B SOIMARADDI</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
