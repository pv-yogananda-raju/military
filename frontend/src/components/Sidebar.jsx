import React from 'react';
import { useAuth } from '../context/AuthContext';
import { resolveMediaUrl } from '../config';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Crosshair, 
  Lock, 
  Bell, 
  Terminal, 
  PieChart, 
  Settings, 
  User, 
  Power, 
  ShieldAlert,
  UserX,
  MessageSquare
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, sidebarOpen, setSidebarOpen, unreadAlertsCount, unreadCommsCount }) => {
  const { user, logout } = useAuth();

  const groups = [
    {
      title: 'CORE COMMAND',
      items: [
        { id: 'dashboard', name: 'Command Grid', icon: LayoutDashboard },
        { id: 'comms', name: 'Tactical Comms', icon: MessageSquare, badge: unreadCommsCount },
        { id: 'profile', name: 'Operative Profile', icon: User },
      ]
    },
    {
      title: 'SIGNALS & RECON',
      items: [
        { id: 'officers', name: 'Officer Registry', icon: Users },
        { id: 'intelligence', name: 'Intel Archive', icon: FileText },
        { id: 'missions', name: 'Mission Control', icon: Crosshair },
        { id: 'evidence', name: 'Evidence Vault', icon: Lock },
        { id: 'suspects', name: 'Suspect Registry', icon: UserX },
      ]
    },
    {
      title: 'SECURITY SAFEGUARDS',
      items: [
        { id: 'alerts', name: 'Sector Alerts', icon: Bell, badge: unreadAlertsCount },
        { id: 'logs', name: 'Audit Registers', icon: Terminal },
        { id: 'analytics', name: 'Analytics Hub', icon: PieChart },
        { id: 'settings', name: 'System Parameters', icon: Settings },
      ]
    }
  ];

  return (
    <aside 
      className={`fixed top-0 left-0 z-40 h-screen transition-transform bg-tactical-panel border-r border-tactical-border w-64 flex flex-col justify-between 
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
    >
      <div>
        {/* DRDO System Branding Header */}
        <div className="h-16 flex items-center px-6 border-b border-tactical-border bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <ShieldAlert className="w-5.5 h-5.5 text-tactical-green" />
            <div className="font-mono">
              <h1 className="text-sm font-black tracking-widest text-white">MISCS PORTAL</h1>
              <p className="text-[8px] text-tactical-gray tracking-wider uppercase font-semibold">SECURED INTELLIGENCE HQ</p>
            </div>
          </div>
        </div>

        {/* Grouped Navigation List */}
        <nav className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-180px)]">
          {groups.map((group) => (
            <div key={group.title} className="space-y-1">
              <p className="text-[9px] text-tactical-gray font-mono px-3 py-1 uppercase tracking-widest font-extrabold opacity-60">
                {group.title}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      if (window.innerWidth < 768) setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono tracking-wide transition-all duration-150 border
                      ${isActive 
                        ? 'bg-slate-950/40 text-tactical-green border-tactical-border border-l-4 border-l-tactical-green font-bold' 
                        : 'text-tactical-gray hover:bg-tactical-border/20 hover:text-white border-transparent'
                      }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-tactical-green' : 'text-tactical-gray'}`} />
                      <span>{item.name}</span>
                    </div>
                    {item.badge > 0 && (
                      <span className={`font-mono text-[9px] px-1.5 py-0.2 rounded-full font-bold border animate-pulse-tactical
                        ${item.id === 'comms' 
                          ? 'bg-tactical-green/10 border-tactical-green/45 text-tactical-greenLight shadow-glowGreen' 
                          : 'bg-tactical-red/10 border-tactical-red/50 text-tactical-red'}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Operative profile card at bottom */}
      {user && (
        <div className="p-4 border-t border-tactical-border bg-slate-950/30">
          <div className="flex items-center space-x-3 mb-3">
            <div className="relative">
              <img 
                src={resolveMediaUrl(user.profileImage)} 
                alt="Operative" 
                className="w-9 h-9 rounded-lg object-cover border border-tactical-border bg-tactical-bg cursor-pointer hover:scale-105 transition-all"
                onClick={() => {
                  window.open(resolveMediaUrl(user.profileImage), '_blank');
                }}
                title="Inspect operative photo"
              />
              <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-tactical-green border border-tactical-panel rounded-full animate-ping"></div>
              <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-tactical-green border border-tactical-panel rounded-full"></div>
            </div>
            <div className="min-w-0 flex-1 font-mono">
              <p className="text-xs font-bold text-white truncate">{user.fullName}</p>
              <p className="text-[9px] text-tactical-gray truncate uppercase tracking-widest">
                {user.rank} • {(user.role || 'Operative').split(' ')[0]}
              </p>
            </div>
          </div>
          
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 px-3 py-1.5 rounded-lg bg-tactical-red/10 border border-tactical-red/35 hover:bg-tactical-red/25 text-tactical-red hover:text-white transition-all text-xs font-mono font-bold cursor-pointer"
          >
            <Power className="w-3.5 h-3.5" />
            <span>TERMINATE SESSION</span>
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
