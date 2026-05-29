import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import { 
  CardSkeleton, 
  ChartSkeleton, 
  ListSkeleton 
} from '../components/LoadingSkeleton';
import { 
  Layers, 
  ShieldAlert, 
  Users, 
  Lock, 
  Bell, 
  Activity, 
  FileCheck, 
  AlertTriangle,
  Terminal 
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend
} from 'recharts';

const COLORS = ['#238636', '#1f6feb', '#da3633', '#8b949e', '#ea580c'];

const Dashboard = ({ stats, alerts, setAlerts, refreshData, loading }) => {
  const { user, authFetch } = useAuth();
  const isAdmin = user?.role === 'Admin Commander';
  const [recentLogs, setRecentLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  // Worker Thread telemetry states
  const [workers, setWorkers] = useState([]);
  const [workersLoading, setWorkersLoading] = useState(true);

  // Set mounted flag after browser layout paint completes
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Fetch Background Worker thread telemetry
  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const res = await authFetch('/logs/workers');
        const data = await res.json();
        if (data.success) {
          setWorkers(data.workers);
        }
      } catch (error) {
        console.error('[Workers Fetch Error]', error);
      } finally {
        setWorkersLoading(false);
      }
    };

    fetchWorkers();
    const interval = setInterval(fetchWorkers, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch recent audit logs for dashboard feed (Admin only)
  useEffect(() => {
    if (!isAdmin) {
      setLogsLoading(false);
      return;
    }

    const fetchRecentLogs = async () => {
      try {
        const res = await authFetch('/logs?limit=5');
        const data = await res.json();
        if (data.success) {
          setRecentLogs(data.logs);
        }
      } catch (error) {
        console.error('[Logs Fetch Error]', error);
      } finally {
        setLogsLoading(false);
      }
    };

    fetchRecentLogs();
    
    // Auto refresh logs when alerts/stats update
    const interval = setInterval(fetchRecentLogs, 15000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  // Dismiss a specific tactical alert
  const dismissAlert = async (alertId) => {
    try {
      const res = await authFetch(`/alerts/${alertId}/read`, {
        method: 'PUT',
      });
      const data = await res.json();
      if (data.success) {
        // Optimistically update alert state
        setAlerts(prev => prev.map(a => a.alertId === alertId ? { ...a, isRead: true } : a));
        refreshData();
      }
    } catch (error) {
      console.error('[Dismiss Alert Error]', error);
    }
  };

  // Compile datasets for Recharts
  const getThreatChartData = () => {
    if (!stats || !stats.aggregates || !stats.aggregates.reports) return [];
    return Object.entries(stats.aggregates.reports).map(([level, count]) => ({
      name: level,
      value: count,
    }));
  };

  const getMissionChartData = () => {
    if (!stats || !stats.aggregates || !stats.aggregates.missions) return [];
    return Object.entries(stats.aggregates.missions).map(([status, count]) => ({
      name: status,
      value: count,
    }));
  };

  const threatData = getThreatChartData();
  const missionData = getMissionChartData();
  const unreadAlerts = alerts.filter(a => !a.isRead);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Stat Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        {/* Feed Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><ListSkeleton /></div>
          <div><ListSkeleton /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Stat cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Active Operations" 
          value={stats?.counts?.missions ?? 0} 
          icon={Layers} 
          color="blue"
          description={`${stats?.aggregates?.missions?.Active ?? 0} active, ${stats?.aggregates?.missions?.Pending ?? 0} pending`}
        />
        <StatCard 
          title="Intel Reports" 
          value={stats?.counts?.reports ?? 0} 
          icon={ShieldAlert} 
          color="green"
          description={`${stats?.aggregates?.reports?.Critical ?? 0} Critical threat escalations`}
        />
        <StatCard 
          title="Operatives Online" 
          value={stats?.counts?.activeSessions ?? 0} 
          icon={Users} 
          color="green"
          description={`Logged across secure nodes`}
        />
        <StatCard 
          title="Evidence Files" 
          value={stats?.counts?.evidence ?? 0} 
          icon={Lock} 
          color="red"
          description="Checksum secure uploads"
        />
      </div>

      {/* 2. Interactive graphical charting panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Threat Distribution Chart */}
        <div className="bg-tactical-panel border border-tactical-border rounded-xl p-5 min-w-0">
          <h3 className="text-xs font-bold font-mono tracking-widest text-white mb-4 uppercase flex items-center space-x-2">
            <Activity className="w-4 h-4 text-tactical-greenLight" />
            <span>Threat Classification Analysis</span>
          </h3>
          <div className="h-64 relative w-full">
            {mounted && threatData.length > 0 ? (
              <ResponsiveContainer width="99%" height="100%">
                <BarChart data={threatData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#8b949e" fontSize={10} fontFamily="monospace" />
                  <YAxis stroke="#8b949e" fontSize={10} fontFamily="monospace" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d' }}
                    labelStyle={{ color: '#fff', fontFamily: 'monospace' }}
                    itemStyle={{ color: '#4ade80', fontFamily: 'monospace' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {threatData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-mono text-tactical-gray">
                No active threats flagged in database.
              </div>
            )}
          </div>
        </div>

        {/* Mission Completion Chart */}
        <div className="bg-tactical-panel border border-tactical-border rounded-xl p-5 min-w-0">
          <h3 className="text-xs font-bold font-mono tracking-widest text-white mb-4 uppercase flex items-center space-x-2">
            <FileCheck className="w-4 h-4 text-tactical-blue" />
            <span>Operational Mission Statuses</span>
          </h3>
          <div className="h-64 flex flex-col sm:flex-row items-center justify-center relative w-full">
            {mounted && missionData.length > 0 ? (
              <>
                <div className="w-full sm:w-1/2 h-full min-w-0 relative">
                  <ResponsiveContainer width="99%" height="100%">
                    <PieChart>
                      <Pie
                        data={missionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {missionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d' }}
                        itemStyle={{ color: '#fff', fontFamily: 'monospace' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full sm:w-1/2 space-y-2 mt-4 sm:mt-0 font-mono text-[10px]">
                  {missionData.map((item, index) => (
                    <div key={item.name} className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="text-tactical-gray uppercase">{item.name}:</span>
                      <span className="text-white font-bold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-mono text-tactical-gray">
                No missions defined in records.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Feeds layout (Alerts, Workers, and Logs) */}
      <div className={`grid grid-cols-1 ${isAdmin ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}>
        {/* Tactical alerts feed ticker */}
        <div className="bg-tactical-panel border border-tactical-border rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-tactical-border mb-4">
              <h3 className="text-xs font-bold font-mono tracking-widest text-white uppercase flex items-center space-x-2">
                <Bell className="w-4 h-4 text-tactical-red" />
                <span>Threat Advisories</span>
              </h3>
              {unreadAlerts.length > 0 && (
                <span className="text-[7.5px] font-mono bg-tactical-red/10 border border-tactical-red/40 text-tactical-redLight px-1.5 py-0.5 rounded-full animate-pulse">
                  {unreadAlerts.length} ACT
                </span>
              )}
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {unreadAlerts.length > 0 ? (
                unreadAlerts.map((alert) => (
                  <div 
                    key={alert.alertId} 
                    className="p-3 bg-tactical-bg border border-tactical-border rounded-xl hover:border-tactical-red/30 transition-all flex flex-col space-y-2 justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-tactical-redLight flex-shrink-0" />
                        <h4 className="text-[10px] font-extrabold font-mono text-white tracking-wide truncate max-w-[170px]">{alert.title}</h4>
                      </div>
                      <p className="text-[9px] text-tactical-text leading-relaxed">{alert.message}</p>
                    </div>
                    <button
                      onClick={() => dismissAlert(alert.alertId)}
                      className="w-full bg-tactical-border border border-tactical-border hover:bg-tactical-green/10 hover:border-tactical-green hover:text-tactical-greenLight text-tactical-text font-mono text-[8px] py-1 rounded transition-all cursor-pointer font-bold uppercase"
                    >
                      Acknowledge
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-16 text-center text-[10px] font-mono text-tactical-gray border border-dashed border-tactical-border rounded-xl">
                  ALL ALERT PROTOCOLS GREEN. SECURED STATE.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Worker Telemetry Health Board */}
        <div className="bg-tactical-panel border border-tactical-border rounded-xl p-5">
          <h3 className="text-xs font-bold font-mono tracking-widest text-white mb-4 uppercase pb-3 border-b border-tactical-border flex items-center space-x-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Concurrency Monitor</span>
          </h3>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {workersLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2 animate-pulse">
                  <div className="h-3 w-24 bg-tactical-border rounded"></div>
                  <div className="h-4 w-full bg-tactical-border/60 rounded"></div>
                </div>
              ))
            ) : workers.length > 0 ? (
              workers.map((w) => (
                <div key={w.workerName} className="space-y-1 font-mono text-[9.5px] border-b border-tactical-border/40 pb-2.5 last:border-0 last:pb-0 text-left leading-normal">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white uppercase text-[8.5px] truncate max-w-[150px]">{w.workerName}</span>
                    <span className={`px-1 rounded text-[6.5px] font-black uppercase border leading-none py-0.5
                      ${w.status.toLowerCase() === 'active' 
                        ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400' 
                        : 'bg-amber-950/30 border-amber-500/30 text-amber-400'}`}>
                      {w.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[8px] text-tactical-gray leading-none pt-0.5">
                    <span>SLEEP: {(w.currentDelayMs / 1000).toFixed(0)}S</span>
                    <span>MONITORED: {w.monitoredCount}</span>
                  </div>
                  <p className="text-[7.5px] text-tactical-gray/60 leading-none pt-0.5">
                    HEARTBEAT: {new Date(w.lastSeen).toLocaleTimeString()}
                  </p>
                </div>
              ))
            ) : (
              <div className="py-16 text-center text-[10px] font-mono text-tactical-gray border border-dashed border-tactical-border rounded-xl">
                Background thread worker spooling up...
              </div>
            )}
          </div>
        </div>

        {/* Dynamic active audit log feed (Admin only) */}
        {isAdmin && (
          <div className="bg-tactical-panel border border-tactical-border rounded-xl p-5">
            <h3 className="text-xs font-bold font-mono tracking-widest text-white mb-4 uppercase pb-3 border-b border-tactical-border flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-tactical-gray" />
              <span>Operations Feed</span>
            </h3>
            <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
              {logsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2 animate-pulse">
                    <div className="h-3 w-20 bg-tactical-border rounded"></div>
                    <div className="h-6 w-full bg-tactical-border/60 rounded"></div>
                  </div>
                ))
              ) : recentLogs.length > 0 ? (
                recentLogs.map((log) => (
                  <div key={log.logId} className="space-y-1 font-mono text-[10px] border-b border-tactical-border/40 pb-3 last:border-0 last:pb-0 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-tactical-greenLight font-bold truncate max-w-[120px]">{(log.user || 'System').split(' (')[0]}</span>
                      <span className="text-[8px] text-tactical-gray">{new Date(log.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-white text-[9px] leading-relaxed">{log.action}</p>
                    <div className="flex items-center justify-between text-[8px] text-tactical-gray">
                      <span className="bg-tactical-border px-1.5 py-0.5 rounded text-[7px] uppercase font-extrabold text-tactical-text">
                        {log.module}
                      </span>
                      <span>IP: {log.ipAddress}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-16 text-center text-[10px] font-mono text-tactical-gray border border-dashed border-tactical-border rounded-xl">
                  No concurrent traffic logged.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
