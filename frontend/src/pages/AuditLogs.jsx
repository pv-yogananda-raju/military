import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { Terminal, Search, RefreshCw, Server, Laptop, HelpCircle } from 'lucide-react';

const AuditLogs = ({ onTriggerToast }) => {
  const { authFetch } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      let url = `/logs?limit=80&search=${search}`;
      if (moduleFilter) url += `&module=${moduleFilter}`;
      
      const res = await authFetch(url);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (error) {
      console.error('[Fetch Logs Error]', error);
      onTriggerToast('Failed to fetch system audit logs.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search, moduleFilter]);

  const getModuleBadge = (mod) => {
    switch (mod) {
      case 'Authentication':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
      case 'Officers':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
      case 'Intelligence':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      case 'Missions':
        return 'bg-purple-500/10 border-purple-500/30 text-purple-400';
      case 'Evidence':
        return 'bg-pink-500/10 border-pink-500/30 text-pink-400';
      case 'Concurrency':
        return 'bg-green-500/10 border-green-500/40 text-tactical-greenLight font-black';
      default:
        return 'bg-tactical-panel border-tactical-border text-tactical-gray';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-tactical-panel border border-tactical-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user, action, log ID..."
              className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 pl-10 pr-4 text-xs font-mono text-white placeholder-tactical-gray/50"
            />
            <Search className="absolute left-3.5 top-2.5 w-4.5 h-4.5 text-tactical-gray" />
          </div>

          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-xs font-mono text-white"
          >
            <option value="">All System Modules</option>
            <option value="Authentication">Authentication</option>
            <option value="Officers">Officers Directory</option>
            <option value="Intelligence">Intel Archives</option>
            <option value="Missions">Missions Control</option>
            <option value="Evidence">Evidence vault</option>
            <option value="Concurrency">Concurrency & Threads</option>
            <option value="System">System core</option>
          </select>
        </div>

        <button 
          onClick={fetchLogs}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-tactical-border border border-tactical-border hover:bg-tactical-border/60 text-white font-mono text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          <span>REFRESH LOGS</span>
        </button>
      </div>

      {/* 2. Audit logs records table */}
      {loading ? (
        <TableSkeleton rows={8} />
      ) : logs.length > 0 ? (
        <div className="bg-tactical-panel border border-tactical-border rounded-xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-mono">
              <thead>
                <tr className="bg-slate-950/40 border-b border-tactical-border text-tactical-gray font-bold uppercase tracking-wider">
                  <th className="px-6 py-3.5">Log ID</th>
                  <th className="px-6 py-3.5">User Operative</th>
                  <th className="px-6 py-3.5">Module</th>
                  <th className="px-6 py-3.5">Action Executed</th>
                  <th className="px-6 py-3.5">Access Node (IP)</th>
                  <th className="px-6 py-3.5">Security Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tactical-border/40 text-tactical-text text-[11px] leading-relaxed">
                {logs.map((log) => (
                  <tr key={log.logId} className="hover:bg-tactical-border/10 transition-all">
                    <td className="px-6 py-3.5 font-bold text-white tracking-widest">{log.logId}</td>
                    <td className="px-6 py-3.5 text-white font-semibold truncate max-w-[130px]">{log.user}</td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-bold border uppercase ${getModuleBadge(log.module)}`}>
                        {log.module}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-white">{log.action}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center space-x-1.5 text-tactical-gray text-[10px]">
                        {(log.deviceDetails || '').includes('Server') ? (
                          <Server className="w-3 h-3 text-tactical-greenLight" />
                        ) : (
                          <Laptop className="w-3 h-3 text-tactical-gray" />
                        )}
                        <span className="truncate max-w-[110px]">{(log.deviceDetails || 'Console')} • {log.ipAddress}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-tactical-gray text-[10px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="py-24 text-center font-mono text-xs text-tactical-gray border border-dashed border-tactical-border rounded-xl">
          NO CLASSIFIED TRANSACTION ACTIONS LOGGED.
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
