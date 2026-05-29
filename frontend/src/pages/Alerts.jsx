import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, AlertTriangle, Eye, EyeOff, Trash2, Plus, Users, ShieldAlert, CheckCircle2, HelpCircle, Check, Search, Globe, User } from 'lucide-react';
import { ListSkeleton } from '../components/LoadingSkeleton';

const Alerts = ({ alerts, setAlerts, refreshData, loading, onTriggerToast }) => {
  const { user, authFetch } = useAuth();
  const isAdmin = user?.role === 'Admin Commander';
  const isCommanderOrIntel = user?.role === 'Admin Commander' || user?.role === 'Intelligence Officer';

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);

  // Officers list for checklists
  const [officersList, setOfficersList] = useState([]);
  const [selectedTargetOfficers, setSelectedTargetOfficers] = useState([]);
  const [isBroadcast, setIsBroadcast] = useState(true);
  const [checklistSearch, setChecklistSearch] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    priority: 'Normal',
    linkedEntity: 'None',
  });

  const fetchOfficers = async () => {
    try {
      const res = await authFetch('/officers?limit=100');
      const data = await res.json();
      if (data.success) {
        setOfficersList(data.officers);
      }
    } catch (error) {
      console.error('[Fetch Officers Alerts Error]', error);
    }
  };

  useEffect(() => {
    fetchOfficers();
  }, []);

  const markAsRead = async (alertId) => {
    try {
      const res = await authFetch(`/alerts/${alertId}/read`, {
        method: 'PUT',
      });
      const data = await res.json();
      if (data.success) {
        onTriggerToast(`Alert [${alertId}] cleared.`, 'success');
        refreshData();
      }
    } catch (error) {
      console.error('[Mark Read Error]', error);
    }
  };

  const markAllRead = async () => {
    try {
      const res = await authFetch('/alerts/read-all', {
        method: 'PUT',
      });
      const data = await res.json();
      if (data.success) {
        onTriggerToast('All alerts marked as read.', 'success');
        refreshData();
      }
    } catch (error) {
      console.error('[Mark All Read Error]', error);
    }
  };

  const handleDeleteAlert = async (alertId) => {
    if (!window.confirm(`EXPUNGE ALERT WARNING: Permanently delete alert [${alertId}] from active logs?`)) return;
    try {
      const res = await authFetch(`/alerts/${alertId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        onTriggerToast(`Alert ${alertId} expunged.`, 'warning');
        refreshData();
      } else {
        onTriggerToast(data.message, 'error');
      }
    } catch (error) {
      console.error('[Delete Alert Error]', error);
      onTriggerToast('Failed to expunge alert.', 'error');
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!isBroadcast && selectedTargetOfficers.length === 0) {
      onTriggerToast('Tactical Constraint: Please select at least one target officer or switch to broadcast.', 'error');
      return;
    }
    try {
      const res = await authFetch('/alerts', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          targetedOfficers: isBroadcast ? [] : selectedTargetOfficers,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onTriggerToast(`Sector Threat Alert [${data.alert.alertId}] successfully broadcasted!`, 'success');
        setShowAddModal(false);
        setFormData({ title: '', message: '', priority: 'Normal', linkedEntity: 'None' });
        setSelectedTargetOfficers([]);
        setIsBroadcast(true);
        refreshData();
      } else {
        onTriggerToast(data.message, 'error');
      }
    } catch (error) {
      console.error('[Create Alert Error]', error);
      onTriggerToast('Failed to broadcast threat alert.', 'error');
    }
  };

  const openBriefingModal = (alert) => {
    setSelectedAlert(alert);
    setShowDetailModal(true);
  };

  return (
    <div className="space-y-6">
      {/* 1. Control Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-tactical-panel border border-tactical-border rounded-xl p-4">
        <h3 className="text-xs font-bold font-mono tracking-widest text-white uppercase flex items-center space-x-2">
          <Bell className="w-4.5 h-4.5 text-tactical-red" />
          <span>Active Threat Pipeline Feed</span>
        </h3>
        
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {alerts.some(a => !a.isRead) && (
            <button
              onClick={markAllRead}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-tactical-border hover:bg-tactical-green/10 border border-tactical-border hover:border-tactical-green hover:text-tactical-greenLight text-white font-mono text-[10px] font-bold px-3.5 py-2 rounded-xl cursor-pointer transition-all uppercase"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-tactical-green hover:bg-opacity-95 text-white font-mono text-[10px] font-bold px-3.5 py-2 rounded-xl cursor-pointer shadow-glowGreen transition-all uppercase"
          >
            <Plus className="w-4 h-4" />
            <span>Compile Threat</span>
          </button>
        </div>
      </div>

      {/* 2. Live Alerts List */}
      {loading ? (
        <ListSkeleton />
      ) : alerts.length > 0 ? (
        <div className="space-y-4">
          {alerts.map((alert) => {
            const totalCount = (alert.readByDetails?.length || 0) + (alert.unreadByDetails?.length || 0);
            const readCount = alert.readByDetails?.length || 0;
            
            return (
              <div 
                key={alert.alertId}
                className={`bg-tactical-panel border rounded-2xl p-5 shadow-tactical flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition-all duration-300
                  ${alert.isRead ? 'border-tactical-border/60 opacity-70' : 'border-tactical-border'}
                  ${!alert.isRead && alert.priority === 'Critical' ? 'border-l-4 border-l-tactical-red shadow-glowRed' : ''}
                `}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${alert.priority === 'Critical' ? 'text-tactical-redLight' : 'text-amber-500'}`} />
                    <h4 className="text-xs font-extrabold font-mono text-white tracking-wide uppercase truncate">{alert.title}</h4>
                    <span className={`inline-flex px-1.5 py-0.2 rounded text-[7px] font-bold uppercase border
                      ${alert.priority === 'Critical' ? 'bg-[#201212] border-tactical-red/40 text-tactical-redLight animate-pulse-tactical' : ''}
                      ${alert.priority === 'Important' ? 'bg-[#241c0f] border-amber-500/40 text-amber-400' : ''}
                      ${alert.priority === 'Normal' ? 'bg-tactical-bg border-tactical-border text-tactical-text' : ''}
                    `}>
                      {alert.priority}
                    </span>
                  </div>
                  <p className="text-[11px] text-tactical-text leading-relaxed">{alert.message}</p>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[8px] font-mono text-tactical-gray">
                    <span>CODE: {alert.alertId}</span>
                    <span>LINK: {alert.linkedEntity}</span>
                    <span>LOGGED: {new Date(alert.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 self-end lg:self-center">
                  {/* Operatives Acknowledged Badge */}
                  {totalCount > 0 && (
                    <button
                      onClick={() => openBriefingModal(alert)}
                      className="flex items-center space-x-1.5 bg-tactical-bg border border-tactical-border hover:border-tactical-green hover:text-tactical-greenLight text-tactical-gray px-3 py-1.5 rounded-lg text-[9px] font-mono font-bold transition-all cursor-pointer"
                      title="Inspect operative acknowledgement status"
                    >
                      <Users className="w-3.5 h-3.5 text-tactical-green" />
                      <span>{readCount}/{totalCount} ACKNOWLEDGED</span>
                    </button>
                  )}

                  {!alert.isRead ? (
                    <button
                      onClick={() => markAsRead(alert.alertId)}
                      className="flex items-center space-x-1.5 bg-tactical-border border border-tactical-border hover:bg-tactical-green/10 hover:border-tactical-green hover:text-tactical-greenLight text-white font-mono text-[9px] font-bold px-3 py-1.5 rounded-lg transition-all uppercase cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Acknowledge</span>
                    </button>
                  ) : (
                    <span className="flex items-center space-x-1 text-[9px] font-mono text-tactical-gray px-3 py-1.5">
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Acknowledged</span>
                    </span>
                  )}

                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteAlert(alert.alertId)}
                      className="p-1.5 rounded bg-tactical-border border border-tactical-border hover:bg-tactical-red/10 hover:border-tactical-red hover:text-tactical-redLight text-tactical-text transition-all cursor-pointer"
                      title="Expunge alert log"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-24 text-center font-mono text-xs text-tactical-gray border border-dashed border-tactical-border rounded-xl">
          ALL THREAT PIPELINES SECURE. NO ACTIVE ALERTS LOGGED.
        </div>
      )}

      {/* 3. Modal: Compile Sector Threat Form */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-tactical-panel border border-tactical-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-tactical-green"></div>
            
            <div className="p-6 border-b border-tactical-border bg-slate-950/20">
              <h3 className="text-sm font-bold font-mono tracking-widest text-white uppercase flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-tactical-green" />
                <span>COMPILE SECTOR THREAT WARNING</span>
              </h3>
              <p className="text-[9px] text-tactical-gray font-mono uppercase mt-1">Broadcasts a live threat notification to the pipeline</p>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 font-mono text-xs">
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Threat Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="E.G. PERIMETER RADAR TELEMETRY FAILURE"
                    className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2.5 px-3.5 text-white placeholder-tactical-gray/40"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Warning Description</label>
                  <textarea
                    required
                    rows={3}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Provide full brief of threat, sector coordinates, and immediate tactical directions..."
                    className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white leading-normal placeholder-tactical-gray/40"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Threat Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                    >
                      <option value="Normal">Normal Threat</option>
                      <option value="Important">Important Escalation</option>
                      <option value="Critical">Critical Breach Alert</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Linked Entity Code</label>
                    <input
                      type="text"
                      value={formData.linkedEntity}
                      onChange={(e) => setFormData({ ...formData, linkedEntity: e.target.value })}
                      placeholder="E.G. REP-1001, MSN-501, or None"
                      className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white placeholder-tactical-gray/40"
                    />
                  </div>
                </div>

                {/* Targeting Option Selection */}
                <div className="space-y-2">
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Target Audience</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsBroadcast(true)}
                      className={`flex items-center justify-center space-x-2 py-2 rounded-xl border text-[10px] font-bold uppercase transition-all cursor-pointer
                        ${isBroadcast 
                          ? 'bg-tactical-green/10 border-tactical-green text-tactical-greenLight' 
                          : 'bg-tactical-bg border-tactical-border text-tactical-gray hover:text-white'}`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Broadcast to All</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setIsBroadcast(false)}
                      className={`flex items-center justify-center space-x-2 py-2 rounded-xl border text-[10px] font-bold uppercase transition-all cursor-pointer
                        ${!isBroadcast 
                          ? 'bg-tactical-green/10 border-tactical-green text-tactical-greenLight' 
                          : 'bg-tactical-bg border-tactical-border text-tactical-gray hover:text-white'}`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Target Officers</span>
                    </button>
                  </div>
                </div>

                {/* If Target Specific is selected, render the checklist */}
                {!isBroadcast && (
                  <div className="space-y-2 border border-tactical-border bg-tactical-bg/40 p-3 rounded-xl transition-all duration-300">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[8px] text-tactical-gray uppercase font-bold tracking-wider">SELECT RECIPIENTS ({selectedTargetOfficers.length} SELECTED)</span>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Filter..."
                          value={checklistSearch}
                          onChange={(e) => setChecklistSearch(e.target.value)}
                          className="bg-tactical-bg border border-tactical-border rounded-lg py-0.5 px-2 pl-5 text-[9px] text-white focus:outline-none placeholder-tactical-gray/50 w-24"
                        />
                        <Search className="w-2.5 h-2.5 text-tactical-gray absolute left-1.5 top-1.5" />
                      </div>
                    </div>

                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1 border-t border-tactical-border/30 pt-1.5">
                      {officersList.filter(o => 
                        o.fullName.toLowerCase().includes(checklistSearch.toLowerCase()) ||
                        o.officerId.toLowerCase().includes(checklistSearch.toLowerCase())
                      ).length > 0 ? (
                        officersList.filter(o => 
                          o.fullName.toLowerCase().includes(checklistSearch.toLowerCase()) ||
                          o.officerId.toLowerCase().includes(checklistSearch.toLowerCase())
                        ).map((o) => {
                          const isChecked = selectedTargetOfficers.includes(o.officerId);
                          const isPending = o.status === 'Pending Approval';
                          return (
                            <button
                              type="button"
                              key={o.officerId}
                              onClick={() => {
                                if (isChecked) {
                                  setSelectedTargetOfficers(prev => prev.filter(id => id !== o.officerId));
                                } else {
                                  setSelectedTargetOfficers(prev => [...prev, o.officerId]);
                                }
                              }}
                              className={`w-full flex items-center justify-between p-1.5 rounded-lg border text-left transition-all cursor-pointer mb-1
                                ${isChecked 
                                  ? 'bg-slate-900 border-tactical-green/50 text-white' 
                                  : 'bg-tactical-bg/20 border-tactical-border/40 text-tactical-gray hover:text-white'}`}
                            >
                              <div className="flex items-center space-x-2">
                                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center
                                  ${isChecked ? 'bg-tactical-green border-tactical-green' : 'border-tactical-border'}`}>
                                  {isChecked && <Check className="w-2.5 h-2.5 text-white" />}
                                </div>
                                <div className="leading-tight">
                                  <p className="font-bold text-[9px] text-white leading-none">{o.fullName}</p>
                                  <p className="text-[7px] text-tactical-gray uppercase mt-0.5 leading-none">{o.rank} • {o.officerId}</p>
                                </div>
                              </div>
                              {isPending ? (
                                <span className="text-[6px] bg-amber-500/10 border border-amber-500/30 text-amber-400 px-1 py-0.2 rounded font-bold uppercase tracking-wider">Pending</span>
                              ) : (
                                <span className="text-[6px] bg-tactical-green/10 border border-tactical-green/30 text-tactical-greenLight px-1 py-0.2 rounded font-bold uppercase tracking-wider">Active</span>
                              )}
                            </button>
                          );
                        })
                      ) : (
                        <p className="text-center text-tactical-gray/60 italic py-4 text-[9px]">No operatives found matching filter.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-tactical-border/60">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedTargetOfficers([]);
                    setIsBroadcast(true);
                  }}
                  className="px-4 py-2 border border-tactical-border text-tactical-gray hover:text-white rounded-xl font-bold transition-all cursor-pointer"
                >
                  ABORT
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-tactical-green text-white rounded-xl font-bold shadow-glowGreen cursor-pointer"
                >
                  BROADCAST ALERT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal: Sector Alert Briefing Matrix (Who has/hasn't read) */}
      {showDetailModal && selectedAlert && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-tactical-panel border border-tactical-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-tactical-green"></div>
            
            <div className="p-6 border-b border-tactical-border bg-slate-950/20 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold font-mono tracking-widest text-white uppercase">Sector Alert Briefing Matrix</h3>
                <p className="text-[9px] text-tactical-gray font-mono uppercase mt-1">CODE: {selectedAlert.alertId} | {selectedAlert.title}</p>
              </div>
              <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase border
                ${selectedAlert.priority === 'Critical' ? 'bg-[#201212] border-tactical-red/40 text-tactical-redLight' : ''}
                ${selectedAlert.priority === 'Important' ? 'bg-[#241c0f] border-amber-500/40 text-amber-400' : ''}
                ${selectedAlert.priority === 'Normal' ? 'bg-tactical-bg border-tactical-border text-tactical-text' : ''}
              `}>
                {selectedAlert.priority}
              </span>
            </div>

            <div className="p-6 space-y-4 font-mono text-xs max-h-[60vh] overflow-y-auto">
              <div className="bg-tactical-bg border border-tactical-border/60 rounded-xl p-4 text-[10px] text-tactical-text leading-relaxed">
                <p className="font-bold text-white uppercase mb-1">Threat Briefing Text:</p>
                <p className="whitespace-pre-line leading-normal">{selectedAlert.message}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Column 1: Acknowledged By */}
                <div className="bg-tactical-bg/50 border border-tactical-border/40 rounded-xl p-4 space-y-3">
                  <div className="flex items-center space-x-2 text-tactical-greenLight border-b border-tactical-border/50 pb-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span className="font-bold text-[10px] uppercase">ACKNOWLEDGED ({selectedAlert.readByDetails?.length || 0})</span>
                  </div>

                  <ul className="space-y-2">
                    {selectedAlert.readByDetails && selectedAlert.readByDetails.length > 0 ? (
                      selectedAlert.readByDetails.map(officer => (
                        <li key={officer.officerId} className="flex items-center justify-between text-[9px] bg-slate-900/40 border border-tactical-border/20 p-2 rounded-lg">
                          <div>
                            <p className="font-bold text-white leading-none">{officer.fullName}</p>
                            <p className="text-[7.5px] text-tactical-gray uppercase mt-0.5">{officer.rank} • {officer.role.split(' ')[0]}</p>
                          </div>
                          <span className="text-[7px] bg-tactical-green/10 border border-tactical-green/40 text-tactical-greenLight px-1.5 py-0.2 rounded font-bold uppercase tracking-wider">READ</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-[9px] text-tactical-gray/60 italic py-4 text-center">No active operative has acknowledged this threat yet.</li>
                    )}
                  </ul>
                </div>

                {/* Column 2: Pending Acknowledgement */}
                <div className="bg-tactical-bg/50 border border-tactical-border/40 rounded-xl p-4 space-y-3">
                  <div className="flex items-center space-x-2 text-amber-500 border-b border-tactical-border/50 pb-2">
                    <HelpCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="font-bold text-[10px] uppercase">PENDING ({selectedAlert.unreadByDetails?.length || 0})</span>
                  </div>

                  <ul className="space-y-2">
                    {selectedAlert.unreadByDetails && selectedAlert.unreadByDetails.length > 0 ? (
                      selectedAlert.unreadByDetails.map(officer => (
                        <li key={officer.officerId} className="flex items-center justify-between text-[9px] bg-slate-900/40 border border-tactical-border/20 p-2 rounded-lg">
                          <div>
                            <p className="font-bold text-white leading-none">{officer.fullName}</p>
                            <p className="text-[7.5px] text-tactical-gray uppercase mt-0.5">{officer.rank} • {officer.role.split(' ')[0]}</p>
                          </div>
                          <span className="text-[7px] bg-[#201212] border-tactical-red/30 text-tactical-redLight px-1.5 py-0.2 rounded font-bold uppercase tracking-wider">PENDING</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-[9px] text-tactical-greenLight italic py-4 text-center">All active military operatives have fully read and verified this warning.</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-tactical-border bg-slate-950/20 flex justify-end">
              <button
                onClick={() => { setShowDetailModal(false); setSelectedAlert(null); }}
                className="px-5 py-2.5 bg-tactical-border border border-tactical-border hover:bg-tactical-border/80 text-white rounded-xl font-bold cursor-pointer uppercase text-[9px]"
              >
                Close briefing matrix
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Alerts;
