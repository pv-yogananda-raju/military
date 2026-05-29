import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Toast from './components/Toast';

// Page components
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Officers from './pages/Officers';
import Intelligence from './pages/Intelligence';
import Missions from './pages/Missions';
import EvidenceVault from './pages/EvidenceVault';
import Alerts from './pages/Alerts';
import AuditLogs from './pages/AuditLogs';
import Analytics from './pages/Analytics';
import SettingsPanel from './pages/Settings';
import Profile from './pages/Profile';
import Suspects from './pages/Suspects';
import Comms from './pages/Comms';

const AppContent = () => {
  const { token, user, loading, authFetch } = useAuth();
  
  // Page tabs & Layout
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Comms Active Channel & Notification Telemetry States
  const [activeCommsRecipient, setActiveCommsRecipient] = useState('GLOBAL');
  const [channelsUnread, setChannelsUnread] = useState({});
  const [lastFetchedMessages, setLastFetchedMessages] = useState([]);
  // DB polling metrics
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [workerStatus, setWorkerStatus] = useState({
    threatMonitor: null,
    simulator: null,
  });

  // Global toasts
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Play native radar sweep ping sound out-of-the-box!
  const playSatellitePing = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.15);
      
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.warn('Web Audio telemetry ping disabled:', e);
    }
  };

  const pollRecentMessages = async () => {
    if (!token || !user) return;
    try {
      const res = await authFetch('/chat/messages/recent');
      const data = await res.json();
      if (data.success && data.messages) {
        if (lastFetchedMessages.length > 0) {
          let hasNewMessage = false;
          let latestMsgPayload = null;
          const updatedUnreads = { ...channelsUnread };

          data.messages.forEach(msg => {
            const isSenderSelf = msg.sender === user.officerId;
            const alreadyLogged = lastFetchedMessages.some(m => m.messageId === msg.messageId);

            if (!isSenderSelf && !alreadyLogged) {
              const msgChannel = msg.recipient === 'GLOBAL' ? 'GLOBAL' : msg.sender;
              const isChannelFocused = activeTab === 'comms' && activeCommsRecipient === msgChannel;
              
              if (!isChannelFocused) {
                updatedUnreads[msgChannel] = (updatedUnreads[msgChannel] || 0) + 1;
                hasNewMessage = true;
                latestMsgPayload = msg;
              }
            }
          });

          if (hasNewMessage) {
            setChannelsUnread(updatedUnreads);
            playSatellitePing();

            // Trigger rich HTML5 desktop system notifications!
            if (latestMsgPayload && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              const channelTitle = latestMsgPayload.recipient === 'GLOBAL' 
                ? '🔊 GLOBAL COMMAND BROADCAST' 
                : '🔒 DIRECT SECURE FEED';
              const bodySnippet = `${latestMsgPayload.senderName}: ${latestMsgPayload.content.substring(0, 60)}${latestMsgPayload.content.length > 60 ? '...' : ''}`;
              
              new Notification(channelTitle, {
                body: bodySnippet,
                icon: latestMsgPayload.senderImage || 'https://images.unsplash.com/photo-1579567724489-2fed7c8f9de6?auto=format&fit=crop&q=80&w=200',
              });
            }
          }
        }
        setLastFetchedMessages(data.messages);
      }
    } catch (err) {
      console.error('[Poll Recent Messages Error]', err);
    }
  };

  // Automatically clear unread badge on channel focus
  useEffect(() => {
    if (activeTab === 'comms' && activeCommsRecipient) {
      setChannelsUnread(prev => {
        if (prev[activeCommsRecipient]) {
          const updated = { ...prev };
          delete updated[activeCommsRecipient];
          return updated;
        }
        return prev;
      });
    }
  }, [activeTab, activeCommsRecipient]);

  // Poll database aggregates & alerts
  const fetchDashboardMetrics = async () => {
    if (!token) return;
    try {
      // 1. Fetch Aggregation Pipelines Stats
      const sRes = await authFetch('/logs/stats');
      const sData = await sRes.json();
      if (sData.success) {
        setStats(sData);
      }

      // 2. Fetch Alerts
      const aRes = await authFetch('/alerts');
      const aData = await aRes.json();
      if (aData.success) {
        setAlerts(aData.alerts);
      }
    } catch (error) {
      console.error('[Dashboard Polling Error]', error);
    } finally {
      setMetricsLoading(false);
    }
  };

  // Poll thread worker statuses via simple diagnostic logs
  const fetchWorkerHeartbeats = async () => {
    if (!token) return;
    try {
      const res = await authFetch('/logs?module=Concurrency&limit=20');
      const data = await res.json();
      if (data.success && data.logs.length > 0) {
        // Parse logs to retrieve last updates from threads
        const threatLog = data.logs.find(l => l.user.includes('Thread-1'));
        const simLog = data.logs.find(l => l.user.includes('Thread-4'));
        
        setWorkerStatus({
          threatMonitor: threatLog ? { monitoredCount: 1 } : null,
          simulator: simLog ? { actionLogged: simLog.action } : null,
        });
      }
    } catch (error) {
      console.error('[Worker Heartbeats Error]', error);
    }
  };

  useEffect(() => {
    if (token) {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          Notification.requestPermission();
        }
      }
      fetchDashboardMetrics();
      fetchWorkerHeartbeats();
      pollRecentMessages();

      // Poll database changes every 4 seconds to reflect background thread concurrency!
      const interval = setInterval(() => {
        fetchDashboardMetrics();
        fetchWorkerHeartbeats();
        pollRecentMessages();
      }, 4000);

      return () => clearInterval(interval);
    }
  }, [token, lastFetchedMessages, channelsUnread, activeTab, activeCommsRecipient]);

  // Handle global loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-tactical-bg flex flex-col items-center justify-center font-mono text-xs">
        <div className="relative flex h-8 w-8 mb-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tactical-greenLight opacity-75"></span>
          <span className="relative inline-flex rounded-full h-8 w-8 bg-tactical-greenLight"></span>
        </div>
        <span className="text-white font-extrabold tracking-widest uppercase">LOADING OPERATIVE PROFILE...</span>
      </div>
    );
  }

  // Render sign-in if unauthenticated
  if (!token || !user) {
    return <Login />;
  }

  const unreadAlertsCount = alerts.filter(a => !a.isRead).length;
  const totalUnreadComms = Object.values(channelsUnread).reduce((acc, curr) => acc + curr, 0);

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            stats={stats} 
            alerts={alerts} 
            setAlerts={setAlerts} 
            refreshData={fetchDashboardMetrics} 
            loading={metricsLoading} 
          />
        );
      case 'officers':
        return <Officers onTriggerToast={showToast} />;
      case 'comms':
        return (
          <Comms 
            onTriggerToast={showToast} 
            activeRecipient={activeCommsRecipient}
            setActiveRecipient={setActiveCommsRecipient}
            unreadMap={channelsUnread}
            setUnreadMap={setChannelsUnread}
          />
        );
      case 'intelligence':
        return <Intelligence onTriggerToast={showToast} refreshData={fetchDashboardMetrics} />;
      case 'suspects':
        return <Suspects onTriggerToast={showToast} />;
      case 'missions':
        return <Missions onTriggerToast={showToast} refreshData={fetchDashboardMetrics} />;
      case 'evidence':
        return <EvidenceVault onTriggerToast={showToast} refreshData={fetchDashboardMetrics} />;
      case 'alerts':
        return (
          <Alerts 
            alerts={alerts} 
            setAlerts={setAlerts} 
            refreshData={fetchDashboardMetrics} 
            loading={metricsLoading} 
            onTriggerToast={showToast} 
          />
        );
      case 'logs':
        return <AuditLogs onTriggerToast={showToast} />;
      case 'analytics':
        return <Analytics stats={stats} loading={metricsLoading} />;
      case 'settings':
        return <SettingsPanel />;
      case 'profile':
        return <Profile onTriggerToast={showToast} refreshData={fetchDashboardMetrics} />;
      default:
        return <div className="text-center py-20 text-xs font-mono text-tactical-gray">PAGE OFFLINE</div>;
    }
  };

  return (
    <div className="min-h-screen bg-tactical-bg flex">
      {/* 1. Collapsible Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
        unreadAlertsCount={unreadAlertsCount}
        unreadCommsCount={totalUnreadComms}
      />

      {/* 2. Main content area wrapper */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen min-w-0">
        {/* Dynamic header */}
        <Header 
          activeTab={activeTab} 
          setSidebarOpen={setSidebarOpen} 
          workerStatus={workerStatus} 
        />

        {/* Dynamic view screen */}
        <main className="flex-1 p-6 overflow-y-auto max-w-[1600px] mx-auto w-full">
          {renderActivePage()}
        </main>
        
        {/* Animated credit footer */}
        <footer className="py-5 border-t border-tactical-border/60 text-center text-[10px] font-mono text-tactical-gray tracking-wider bg-tactical-panel/40">
          Made by <span className="text-white font-bold">P V Yogananda Raju</span> and <span className="text-white font-bold">Rohit B Soimaraddi</span>
        </footer>
      </div>

      {/* Toast Feedbacks */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
