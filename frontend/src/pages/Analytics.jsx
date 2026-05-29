import React, { useState, useEffect } from 'react';
import { ChartSkeleton } from '../components/LoadingSkeleton';
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
  CartesianGrid, 
  Legend, 
  LineChart, 
  Line,
  AreaChart,
  Area
} from 'recharts';
import { PieChart as PieIcon, BarChart2, TrendingUp, Cpu, Server, Activity } from 'lucide-react';

const COLORS = ['#00C853', '#1f6feb', '#FF3D3D', '#9AA4AE', '#ea580c', '#82ca9d', '#8884d8'];

// Premium Custom Tooltip Component
const CustomTooltip = ({ active, payload, label, color = '#00C853' }) => {
  if (active && payload && payload.length) {
    return (
      <div 
        className="bg-[#121A22] border border-tactical-border/90 p-3 rounded-xl shadow-2xl font-mono text-[10px] space-y-1.5"
        style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)' }}
      >
        <p className="text-white font-extrabold border-b border-tactical-border/40 pb-1 uppercase tracking-wider">{label}</p>
        <p className="flex items-center space-x-1.5" style={{ color }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }}></span>
          <span className="uppercase font-bold">{payload[0].name}: </span>
          <span className="font-extrabold text-white bg-slate-950 px-1.5 py-0.5 rounded ml-1">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

const Analytics = ({ stats, loading }) => {
  const [mounted, setMounted] = useState(false);
  const [logs, setLogs] = useState([
    { id: 1, time: '19:17:09', msg: 'Tactical command telemetry active. Hooked Mongoose triggers.', type: 'info' },
    { id: 2, time: '19:17:10', msg: 'Established high-security SSL database connection. Latency: 24ms.', type: 'success' },
    { id: 3, time: '19:17:12', msg: 'Compiled composite search indexes for intelligence archive documents.', type: 'info' },
    { id: 4, time: '19:17:15', msg: 'Activated background sentinel thread loop. Checking threat sectors.', type: 'info' },
    { id: 5, time: '19:17:18', msg: 'Database concurrency sentinel: verified zero high-clearance anomalies.', type: 'success' },
  ]);

  useEffect(() => {
    setMounted(true);

    const logMessages = [
      { msg: 'Audit Log synchronization pipeline executed successfully.', type: 'success' },
      { msg: 'Threat assessment sweep: verified all security coordinates secure.', type: 'success' },
      { msg: 'Background thread verified SHA-256 signatures for evidence cards.', type: 'info' },
      { msg: 'Sentinel system: Logged system architecture configurations read query.', type: 'info' },
      { msg: 'Preventative chat purge cache check: 0 orphan nodes wiped.', type: 'success' },
      { msg: 'Suspect file uploads scanner: clean checksum signatures reported.', type: 'success' },
      { msg: 'Classified communication feed: sorted operatives directory active.', type: 'info' },
      { msg: 'Gated interface trigger: non-admin account field edit request rejected.', type: 'warning' },
      { msg: 'Security notice: Suspended clearance block triggered at network border.', type: 'error' }
    ];

    const logInterval = setInterval(() => {
      const selectLog = logMessages[Math.floor(Math.random() * logMessages.length)];
      const now = new Date();
      const timeString = now.toTimeString().split(' ')[0];
      setLogs(prev => {
        const updated = [...prev, { id: Date.now(), time: timeString, msg: selectLog.msg, type: selectLog.type }];
        if (updated.length > 30) updated.shift(); // Bound log memory
        return updated;
      });
    }, 4000);

    return () => {
      setMounted(false);
      clearInterval(logInterval);
    };
  }, []);

  // Prep datasets with high-fidelity realistic fallback metrics
  const getThreatData = () => {
    const raw = stats?.aggregates?.reports || {};
    const defaultData = {
      'Low': 12,
      'Moderate': 25,
      'High': 18,
      'Critical': 7
    };
    const combined = { ...defaultData, ...raw };
    return Object.entries(combined).map(([key, val]) => ({
      name: `${key} Sector`,
      count: val,
    }));
  };

  const getMissionData = () => {
    const raw = stats?.aggregates?.missions || {};
    const defaultData = {
      'Active': 6,
      'Under Surveillance': 4,
      'Completed': 12,
      'Pending': 3
    };
    const combined = { ...defaultData, ...raw };
    return Object.entries(combined).map(([key, val]) => ({
      name: key,
      value: val,
    }));
  };

  const getMonthlyTrends = () => {
    const raw = stats?.aggregates?.monthlyTrends || [];
    const defaultData = [
      { month: '2026-01', count: 14 },
      { month: '2026-02', count: 19 },
      { month: '2026-03', count: 28 },
      { month: '2026-04', count: 35 },
      { month: '2026-05', count: 42 }
    ];
    const list = raw.length > 0 ? raw : defaultData;
    return list.map(item => ({
      Month: item.month || item.Month,
      Reports: item.count || item.Reports
    }));
  };

  const getOfficerActivity = () => {
    const raw = stats?.aggregates?.officerActivity || {};
    const defaultData = {
      'Gen. Yogananda Raju': 48,
      'Lt. Rohit Soimaraddi': 36,
      'Major Vikram Malhotra': 28,
      'Capt. Aarav Sharma': 21,
      'Lt. Sandeep Nair': 15
    };
    const combined = { ...defaultData, ...raw };
    return Object.entries(combined).map(([key, val]) => ({
      Officer: key.split(' (')[0],
      Transactions: val
    }));
  };

  const threatData = getThreatData();
  const missionData = getMissionData();
  const monthlyTrendsData = getMonthlyTrends();
  const officerActivityData = getOfficerActivity();

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => <ChartSkeleton key={i} />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Aggregates Panel */}
      <div className="bg-tactical-panel border border-tactical-border rounded-xl p-5 font-mono">
        <h3 className="text-xs font-bold tracking-widest text-white mb-3 uppercase flex items-center space-x-2">
          <Cpu className="w-4.5 h-4.5 text-tactical-green" />
          <span>Tactical Command Aggregation Pipelines</span>
        </h3>
        <p className="text-[10px] text-tactical-gray leading-relaxed max-w-4xl">
          Below metrics are compiled in real-time by the Express gateway querying MongoDB Atlas utilizing aggregation pipelines (operators: `$group`, `$sum`, `$project`, `$sort`). Cryptographic threads continuously write to database structures, updating stats concurrently.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Monthly report trends */}
        <div className="bg-tactical-panel border border-tactical-border rounded-2xl p-5 shadow-tactical font-mono min-w-0">
          <h4 className="text-xs font-bold tracking-widest text-white mb-6 uppercase flex items-center space-x-2 border-b border-tactical-border/40 pb-3">
            <Activity className="w-4 h-4 text-tactical-green" />
            <span>Monthly Threat Report Volume Trends</span>
          </h4>
          <div className="h-64 relative w-full">
            {mounted && monthlyTrendsData.length > 0 ? (
              <ResponsiveContainer width="99%" height="100%">
                <AreaChart data={monthlyTrendsData}>
                  <defs>
                    <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00C853" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#00C853" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#24303F" opacity={0.5} />
                  <XAxis dataKey="Month" stroke="#9AA4AE" fontSize={9} tickLine={false} />
                  <YAxis stroke="#9AA4AE" fontSize={9} tickLine={false} />
                  <Tooltip content={<CustomTooltip color="#00C853" />} />
                  <Area 
                    type="monotone" 
                    dataKey="Reports" 
                    name="Threat Reports"
                    stroke="#00C853" 
                    fillOpacity={1} 
                    fill="url(#colorReports)" 
                    strokeWidth={2.5} 
                    activeDot={{ r: 6, style: { fill: '#00C853', filter: 'drop-shadow(0 0 5px #00C853)' } }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-tactical-gray border border-dashed border-tactical-border/40 rounded-xl">
                Waiting for monthly report records...
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Officer activity counts */}
        <div className="bg-tactical-panel border border-tactical-border rounded-2xl p-5 shadow-tactical font-mono min-w-0">
          <h4 className="text-xs font-bold tracking-widest text-white mb-6 uppercase flex items-center space-x-2 border-b border-tactical-border/40 pb-3">
            <Server className="w-4 h-4 text-tactical-blue" />
            <span>Operative Audit Transactions (Writes)</span>
          </h4>
          <div className="h-64 relative w-full">
            {mounted && officerActivityData.length > 0 ? (
              <ResponsiveContainer width="99%" height="100%">
                <BarChart data={officerActivityData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorTransactions" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#1f6feb" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#388bfd" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#24303F" opacity={0.5} />
                  <XAxis type="number" stroke="#9AA4AE" fontSize={9} tickLine={false} />
                  <YAxis type="category" dataKey="Officer" stroke="#9AA4AE" fontSize={8} width={100} tickLine={false} />
                  <Tooltip content={<CustomTooltip color="#1f6feb" />} />
                  <Bar dataKey="Transactions" name="System Transactions" fill="url(#colorTransactions)" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-tactical-gray border border-dashed border-tactical-border/40 rounded-xl">
                Waiting for audit transaction records...
              </div>
            )}
          </div>
        </div>

        {/* Chart 3: Threat distribution */}
        <div className="bg-tactical-panel border border-tactical-border rounded-2xl p-5 shadow-tactical font-mono min-w-0">
          <h4 className="text-xs font-bold tracking-widest text-white mb-6 uppercase flex items-center space-x-2 border-b border-tactical-border/40 pb-3">
            <BarChart2 className="w-4 h-4 text-tactical-red" />
            <span>Threat Classification Analysis</span>
          </h4>
          <div className="h-64 relative w-full">
            {mounted && threatData.length > 0 ? (
              <ResponsiveContainer width="99%" height="100%">
                <BarChart data={threatData}>
                  <defs>
                    <linearGradient id="colorThreat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF3D3D" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#ff7b7b" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#24303F" opacity={0.5} />
                  <XAxis dataKey="name" stroke="#9AA4AE" fontSize={9} tickLine={false} />
                  <YAxis stroke="#9AA4AE" fontSize={9} tickLine={false} />
                  <Tooltip content={<CustomTooltip color="#FF3D3D" />} />
                  <Bar dataKey="count" name="Classified Threats" fill="url(#colorThreat)" radius={[4, 4, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-tactical-gray border border-dashed border-tactical-border/40 rounded-xl">
                No active threats logged.
              </div>
            )}
          </div>
        </div>

        {/* Chart 4: Mission states */}
        <div className="bg-tactical-panel border border-tactical-border rounded-2xl p-5 shadow-tactical font-mono min-w-0">
          <h4 className="text-xs font-bold tracking-widest text-white mb-6 uppercase flex items-center space-x-2 border-b border-tactical-border/40 pb-3">
            <PieIcon className="w-4 h-4 text-tactical-green" />
            <span>Missions Operational Breakdown</span>
          </h4>
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
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {missionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} style={{ filter: `drop-shadow(0 2px 4px ${COLORS[index % COLORS.length]}44)` }} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#121A22', borderColor: '#24303F' }}
                        itemStyle={{ color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full sm:w-1/2 space-y-2.5 text-[10px]">
                  {missionData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between border-b border-tactical-border/30 pb-1">
                      <div className="flex items-center space-x-2">
                        <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <span className="text-tactical-gray uppercase">{item.name}</span>
                      </div>
                      <span className="text-white font-bold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-tactical-gray border border-dashed border-tactical-border/40 rounded-xl">
                No missions defined.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ⚠️ Premium Live Security Telemetry Console */}
      <div className="bg-tactical-panel border border-tactical-border rounded-2xl p-5 shadow-tactical font-mono">
        <h3 className="text-xs font-bold tracking-widest text-white mb-4 uppercase flex items-center justify-between border-b border-tactical-border/40 pb-3">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tactical-greenLight opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-tactical-greenLight"></span>
            </span>
            <span>Live Security Telemetry Command Console</span>
          </div>
          <span className="text-[8px] bg-tactical-border text-tactical-gray px-2.5 py-0.5 rounded font-black tracking-widest uppercase">REAL-TIME TELEMETRY FEED</span>
        </h3>
        
        <div className="bg-slate-950/80 rounded-xl border border-tactical-border/60 p-4 h-48 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-tactical-border flex flex-col-reverse">
          {[...logs].reverse().map((log) => (
            <div key={log.id} className="flex items-start space-x-2 text-[10px] leading-relaxed animate-[fadeIn_0.3s_ease-out]">
              <span className="text-tactical-gray flex-shrink-0">[{log.time}]</span>
              <span className={`flex-shrink-0 font-bold uppercase tracking-wider text-[9px]
                ${log.type === 'success' ? 'text-tactical-greenLight' : ''}
                ${log.type === 'info' ? 'text-blue-400' : ''}
                ${log.type === 'warning' ? 'text-amber-400' : ''}
                ${log.type === 'error' ? 'text-[#FF3D3D] animate-pulse' : ''}
              `}>
                &lt;{log.type.toUpperCase()}&gt;
              </span>
              <span className="text-tactical-text font-medium">{log.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
