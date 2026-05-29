import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { 
  Layers, 
  Search, 
  Plus, 
  Trash2, 
  Sliders, 
  Calendar, 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  PlusCircle,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Eye
} from 'lucide-react';

const Missions = ({ onTriggerToast, refreshData }) => {
  const { user, authFetch } = useAuth();
  const [missions, setMissions] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search, Pagination & Sorting states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(8);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showControlModal, setShowControlModal] = useState(false);
  const [selectedMission, setSelectedMission] = useState(null);
  
  // Operation logs text
  const [newLogText, setNewLogText] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    missionName: '',
    priority: 'Medium',
    objective: '',
    deadline: '',
    missionZone: '',
    assignedOfficers: [],
  });

  const isCommander = user?.role === 'Admin Commander' || user?.role === 'Intelligence Officer';
  const isAdmin = user?.role === 'Admin Commander';

  const fetchMissions = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        search,
        status: statusFilter,
        priority: priorityFilter,
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder
      });
      
      const res = await authFetch(`/missions?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setMissions(data.missions);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.count || 0);
        
        // Keep selected mission updated in real-time
        if (selectedMission) {
          const updated = data.missions.find(m => m.missionCode === selectedMission.missionCode);
          if (updated) setSelectedMission(updated);
        }
      }
    } catch (error) {
      console.error('[Fetch Missions Error]', error);
      onTriggerToast('Failed to retrieve active mission directory.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchOfficers = async () => {
    try {
      const res = await authFetch('/officers');
      const data = await res.json();
      if (data.success) {
        setOfficers(data.officers);
      }
    } catch (error) {
      console.error('[Fetch Officers Intel Error]', error);
    }
  };

  useEffect(() => {
    fetchMissions();
  }, [search, statusFilter, priorityFilter, page, sortBy, sortOrder]);

  useEffect(() => {
    fetchOfficers();
  }, []);

  const handleSort = (field) => {
    setPage(1);
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Create new mission
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch('/missions', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        onTriggerToast(`Mission ${formData.missionName} initialized successfully!`, 'success');
        setShowAddModal(false);
        resetForm();
        fetchMissions();
        if (refreshData) refreshData();
      } else {
        onTriggerToast(data.message, 'error');
      }
    } catch (error) {
      console.error('[Add Mission Error]', error);
      onTriggerToast('Failed to spawn new mission files.', 'error');
    }
  };

  // Modify progress & status directly in MongoDB
  const handleUpdateProgress = async (missionCode, currentPercentage, currentStatus) => {
    try {
      const res = await authFetch(`/missions/${missionCode}`, {
        method: 'PUT',
        body: JSON.stringify({
          progressPercentage: parseInt(currentPercentage, 10),
          currentStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onTriggerToast(`Mission [${missionCode}] status parameters written to database.`, 'success');
        
        // Update local list
        setMissions(prev => prev.map(m => m.missionCode === missionCode ? data.mission : m));
        
        // Update modal focus
        setSelectedMission(data.mission);
        if (refreshData) refreshData();
      }
    } catch (error) {
      console.error('[Update Mission Progress Error]', error);
      onTriggerToast('Failed to write changes to MongoDB.', 'error');
    }
  };

  // Append manual operation log note to nested array
  const handleAddLogText = async (missionCode) => {
    if (!newLogText || !newLogText.trim()) return;

    try {
      const res = await authFetch(`/missions/${missionCode}/logs`, {
        method: 'POST',
        body: JSON.stringify({ log: newLogText.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        onTriggerToast(`Operative log appended to Mission [${missionCode}] records.`, 'success');
        
        // Update logs in local state list
        setMissions(prev => prev.map(m => m.missionCode === missionCode ? { ...m, missionLogs: data.missionLogs } : m));
        
        // Update modal focus logs
        if (selectedMission) {
          setSelectedMission(prev => ({ ...prev, missionLogs: data.missionLogs }));
        }
        
        // Clear input text
        setNewLogText('');
      } else {
        onTriggerToast(data.message, 'error');
      }
    } catch (error) {
      console.error('[Add Log Error]', error);
      onTriggerToast('Failed to append log text.', 'error');
    }
  };

  // Expunge mission
  const handleDeleteMission = async (missionCode) => {
    if (!window.confirm(`EXPUNGE MISSION RECORDS: Permanently delete operation [${missionCode}] from base mainframes?`)) return;
    try {
      const res = await authFetch(`/missions/${missionCode}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        onTriggerToast(`Mission [${missionCode}] permanently closed.`, 'warning');
        fetchMissions();
        if (refreshData) refreshData();
      } else {
        onTriggerToast(data.message, 'error');
      }
    } catch (error) {
      console.error('[Delete Mission Error]', error);
      onTriggerToast('Failed to expunge mission file.', 'error');
    }
  };

  const handleOfficerSelection = (officerId) => {
    const selected = formData.assignedOfficers.includes(officerId);
    if (selected) {
      setFormData({
        ...formData,
        assignedOfficers: formData.assignedOfficers.filter(id => id !== officerId),
      });
    } else {
      setFormData({
        ...formData,
        assignedOfficers: [...formData.assignedOfficers, officerId],
      });
    }
  };

  const resetForm = () => {
    setFormData({
      missionName: '',
      priority: 'Medium',
      objective: '',
      deadline: '',
      missionZone: '',
      assignedOfficers: [],
    });
  };

  const openControlModal = (mission) => {
    setSelectedMission(mission);
    setShowControlModal(true);
  };

  return (
    <div className="space-y-6">
      {/* 1. Dashboard Filters and add button */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-tactical-panel border border-tactical-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search mission name, zone, objectives..."
              className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 pl-10 pr-4 text-xs font-mono text-white placeholder-tactical-gray/50"
            />
            <Search className="absolute left-3.5 top-2.5 w-4.5 h-4.5 text-tactical-gray" />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-xs font-mono text-white"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Active">Active</option>
            <option value="Under Surveillance">Under Surveillance</option>
            <option value="Completed">Completed</option>
            <option value="Aborted">Aborted</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            className="bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-xs font-mono text-white"
          >
            <option value="">All Priorities</option>
            <option value="Low">Low Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="High">High Priority</option>
            <option value="Critical">Critical Priority</option>
          </select>
        </div>

        {isCommander && (
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="w-full xl:w-auto flex items-center justify-center space-x-2 bg-tactical-green hover:bg-opacity-95 text-white font-mono text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer shadow-glowGreen transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>INITIALIZE NEW OPERATION</span>
          </button>
        )}
      </div>

      {/* 2. Mission Table Directory */}
      {loading ? (
        <TableSkeleton rows={limit} />
      ) : missions.length > 0 ? (
        <div className="bg-tactical-panel border border-tactical-border rounded-xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-mono">
              <thead>
                <tr className="bg-slate-950/40 border-b border-tactical-border text-tactical-gray font-bold uppercase tracking-wider select-none">
                  <th 
                    onClick={() => handleSort('missionCode')}
                    className="px-6 py-3.5 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Code ID</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('missionName')}
                    className="px-6 py-3.5 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Operation Title</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('missionZone')}
                    className="px-6 py-3.5 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Tactical Zone</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('priority')}
                    className="px-6 py-3.5 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Priority</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('deadline')}
                    className="px-6 py-3.5 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Timeline Target</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('progressPercentage')}
                    className="px-6 py-3.5 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Progress</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tactical-border/40 text-tactical-text">
                {missions.map((mission) => {
                  const isOverdue = new Date(mission.deadline) < new Date() && mission.currentStatus !== 'Completed' && mission.currentStatus !== 'Aborted';
                  
                  return (
                    <tr 
                      key={mission.missionCode} 
                      className={`hover:bg-tactical-border/10 transition-all ${isOverdue ? 'bg-red-950/10' : ''}`}
                    >
                      <td className="px-6 py-4 font-bold text-white tracking-widest uppercase">{mission.missionCode}</td>
                      <td className="px-6 py-4 max-w-xs overflow-hidden">
                        <div className="space-y-0.5 max-w-xs truncate">
                          <p className="font-bold text-white leading-normal truncate" title={mission.missionName}>{mission.missionName}</p>
                          <p className="text-[10px] text-tactical-gray truncate" title={mission.objective}>{mission.objective}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-white uppercase">{mission.missionZone}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-bold uppercase border
                          ${mission.priority === 'Low' ? 'bg-[#0f1b15] border-[#00C853]/40 text-[#00C853]' : ''}
                          ${mission.priority === 'Medium' ? 'bg-[#152331] border-[#1f6feb]/40 text-[#58a6ff]' : ''}
                          ${mission.priority === 'High' ? 'bg-[#241c0f] border-amber-500/40 text-amber-400' : ''}
                          ${mission.priority === 'Critical' ? 'bg-[#201212] border-[#FF3D3D]/40 text-[#FF3D3D] animate-pulse-tactical' : ''}
                        `}>
                          {mission.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1.5 text-tactical-gray text-[10px]">
                          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className={`font-bold ${isOverdue ? 'text-tactical-red' : 'text-white'}`}>
                            {new Date(mission.deadline).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-24 space-y-1">
                          <div className="flex items-center justify-between text-[9px] font-mono text-tactical-gray">
                            <span>Progress</span>
                            <span className="text-white font-bold">{mission.progressPercentage}%</span>
                          </div>
                          <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                            <div 
                              className="bg-tactical-green h-full" 
                              style={{ width: `${mission.progressPercentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-bold uppercase border
                          ${mission.currentStatus === 'Pending' ? 'bg-[#1e1e1e] border-tactical-border text-tactical-gray' : ''}
                          ${mission.currentStatus === 'Active' ? 'bg-[#0f1b15] border-[#00C853]/40 text-[#00C853]' : ''}
                          ${mission.currentStatus === 'Under Surveillance' ? 'bg-[#152331] border-[#1f6feb]/40 text-[#58a6ff]' : ''}
                          ${mission.currentStatus === 'Completed' ? 'bg-[#0f1b15] border-tactical-green/60 text-white' : ''}
                          ${mission.currentStatus === 'Aborted' ? 'bg-[#201212] border-[#FF3D3D]/40 text-[#FF3D3D]' : ''}
                        `}>
                          {mission.currentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* View Detail Action */}
                          <button
                            onClick={() => openControlModal(mission)}
                            className="p-1.5 rounded bg-tactical-border border border-tactical-border hover:bg-tactical-green/10 hover:border-tactical-green hover:text-tactical-green text-tactical-text transition-all cursor-pointer font-bold uppercase flex items-center space-x-1"
                            title="Operation Control Briefing"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Action (Admin Commander only) */}
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteMission(mission.missionCode)}
                              className="p-1.5 rounded bg-tactical-border border border-tactical-border hover:bg-tactical-red/10 hover:border-tactical-red hover:text-tactical-red text-tactical-text transition-all cursor-pointer"
                              title="Expunge Registry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Controls Footer */}
          <div className="p-4 border-t border-tactical-border flex items-center justify-between font-mono text-xs bg-slate-950/20">
            <span className="text-tactical-gray">
              Showing page <span className="text-white font-bold">{page}</span> of <span className="text-white font-bold">{totalPages}</span> ({totalCount} total operations)
            </span>
            <div className="flex items-center space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                className="p-1.5 rounded border border-tactical-border hover:bg-tactical-border/40 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                className="p-1.5 rounded border border-tactical-border hover:bg-tactical-border/40 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-24 text-center font-mono text-xs text-tactical-gray border border-dashed border-tactical-border rounded-xl">
          NO CLASSIFIED MISSION ENTRIES SEEDED IN DATABASE.
        </div>
      )}

      {/* 3. Initialize Mission Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-tactical-panel border border-tactical-border rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-tactical-green"></div>
            <div className="p-6 border-b border-tactical-border bg-slate-950/20">
              <h3 className="text-sm font-bold font-mono tracking-widest text-white uppercase">INITIALIZE TACTICAL OPERATION</h3>
              <p className="text-[9px] text-tactical-gray font-mono uppercase mt-1">Spawns a new operation registry document inside MongoDB</p>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto font-mono text-xs">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Operation Title Name</label>
                  <input
                    type="text"
                    required
                    value={formData.missionName}
                    onChange={(e) => setFormData({ ...formData, missionName: e.target.value })}
                    placeholder="E.G. Operation Trishul Outpost"
                    className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Strategic Objective Parameters</label>
                  <textarea
                    required
                    rows={3}
                    value={formData.objective}
                    onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                    placeholder="Detail specific recon targets, border telemetry scans, and secure data nodes to catalog..."
                    className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white leading-normal"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Operational Zone Sector</label>
                    <input
                      type="text"
                      required
                      value={formData.missionZone}
                      onChange={(e) => setFormData({ ...formData, missionZone: e.target.value })}
                      placeholder="E.G. Jammu Sector Hub"
                      className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Target Deadline</label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Priority Hierarchy</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>

                {/* Assign officers checkbox selection */}
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1.5">Assign Operatives</label>
                  <div className="bg-tactical-bg border border-tactical-border rounded-xl p-3 max-h-36 overflow-y-auto space-y-2">
                    {officers.map(off => (
                      <label key={off.officerId} className="flex items-center space-x-2.5 cursor-pointer hover:text-white">
                        <input
                          type="checkbox"
                          checked={formData.assignedOfficers.includes(off.officerId)}
                          onChange={() => handleOfficerSelection(off.officerId)}
                          className="rounded bg-tactical-bg border-tactical-border text-tactical-green focus:ring-0"
                        />
                        <span className="text-[10px] font-mono">
                          {off.fullName} ({off.rank} • {off.officerId})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-tactical-border/60">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-tactical-border text-tactical-gray hover:text-white rounded-xl transition-all cursor-pointer font-bold"
                >
                  ABORT
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-tactical-green text-white rounded-xl shadow-glowGreen font-bold cursor-pointer"
                >
                  INITIALIZE OPERATION
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Tactical Control & Logs Board Modal */}
      {showControlModal && selectedMission && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-tactical-panel border border-tactical-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-tactical-green"></div>
            
            <div className="p-6 border-b border-tactical-border bg-slate-950/20 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold font-mono tracking-widest text-white uppercase">TACTICAL OPERATION MATRIX</h3>
                <p className="text-[9px] text-tactical-gray font-mono uppercase mt-1">MISSION CODE: {selectedMission.missionCode}</p>
              </div>
              <span className={`inline-flex px-2.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border
                ${selectedMission.priority === 'Low' ? 'bg-[#0f1b15] border-[#00C853]/40 text-[#00C853]' : ''}
                ${selectedMission.priority === 'Medium' ? 'bg-[#152331] border-[#1f6feb]/40 text-[#58a6ff]' : ''}
                ${selectedMission.priority === 'High' ? 'bg-[#241c0f] border-amber-500/40 text-amber-400' : ''}
                ${selectedMission.priority === 'Critical' ? 'bg-[#201212] border-[#FF3D3D]/40 text-[#FF3D3D] animate-pulse-tactical' : ''}
              `}>
                {selectedMission.priority} Priority
              </span>
            </div>

            <div className="p-6 space-y-5 font-mono text-xs max-h-[70vh] overflow-y-auto">
              <div className="space-y-1">
                <h4 className="text-xs text-tactical-gray uppercase font-bold font-semibold">Operation Title</h4>
                <p className="text-sm font-bold text-white leading-normal">{selectedMission.missionName}</p>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs text-tactical-gray uppercase font-bold font-semibold">Operational Objectives</h4>
                <div className="bg-tactical-bg border border-tactical-border/60 rounded-xl p-4 text-[11px] text-tactical-text leading-relaxed whitespace-pre-line">
                  {selectedMission.objective}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-tactical-bg p-3 rounded-xl border border-tactical-border/40 space-y-1">
                  <span className="text-[9px] text-tactical-gray uppercase font-bold">Operational Zone</span>
                  <div className="flex items-center space-x-1.5">
                    <Shield className="w-3.5 h-3.5 text-tactical-greenLight" />
                    <span className="text-white font-bold">{selectedMission.missionZone}</span>
                  </div>
                </div>
                <div className="bg-tactical-bg p-3 rounded-xl border border-tactical-border/40 space-y-1">
                  <span className="text-[9px] text-tactical-gray uppercase font-bold">Target Timeline Deadline</span>
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-tactical-blue" />
                    <span className="text-white font-bold">{new Date(selectedMission.deadline).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Progress Slider and Status selectors inside matrix */}
              <div className="bg-tactical-bg p-4 rounded-xl border border-tactical-border/60 space-y-3">
                <h4 className="text-xs text-tactical-gray uppercase font-bold font-semibold border-b border-tactical-border pb-1">
                  Operational Control Registers
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-tactical-gray uppercase">Objective Progress:</span>
                    <span className="text-white font-bold">{selectedMission.progressPercentage}%</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={selectedMission.progressPercentage}
                      onChange={(e) => handleUpdateProgress(selectedMission.missionCode, e.target.value, selectedMission.currentStatus)}
                      className="flex-1 accent-tactical-green h-1.5 bg-slate-900 rounded-lg cursor-pointer my-2"
                    />
                    
                    <select
                      value={selectedMission.currentStatus}
                      onChange={(e) => handleUpdateProgress(selectedMission.missionCode, selectedMission.progressPercentage, e.target.value)}
                      className="bg-tactical-panel border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-lg py-1 px-3 text-[11px] text-white"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Active">Active</option>
                      <option value="Under Surveillance">Under Surveillance</option>
                      <option value="Completed">Completed</option>
                      <option value="Aborted">Aborted</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Assigned Operatives */}
              <div className="space-y-2">
                <h4 className="text-xs text-tactical-gray uppercase font-bold font-semibold">Assigned Tactical Operatives</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedMission.assignedOfficers.length > 0 ? (
                    selectedMission.assignedOfficers.map(id => (
                      <span key={id} className="bg-tactical-bg border border-tactical-border text-white text-[9px] px-2.5 py-1 rounded font-mono font-bold">
                        Operative ID: {id}
                      </span>
                    ))
                  ) : (
                    <span className="text-tactical-gray text-[10px]">No operatives assigned to this directive.</span>
                  )}
                </div>
              </div>

              {/* Manual logs nested feed */}
              <div className="space-y-3 pt-3 border-t border-tactical-border/60">
                <h4 className="text-xs text-tactical-gray uppercase font-bold font-semibold">Operation Intelligence Log Feed ({selectedMission.missionLogs.length})</h4>
                
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {selectedMission.missionLogs.map((log, lIdx) => (
                    <div key={lIdx} className="bg-tactical-bg border border-tactical-border/40 p-2.5 rounded-lg text-[10px] font-mono space-y-1">
                      <div className="flex justify-between items-center text-[8px] text-tactical-gray">
                        <span className="font-bold text-tactical-green">ID: {log.enteredBy}</span>
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-white leading-normal">{log.log}</p>
                    </div>
                  ))}
                </div>

                {/* Input to write nested log */}
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newLogText}
                    onChange={(e) => setNewLogText(e.target.value)}
                    placeholder="Append secure operational intelligence entry to MongoDB..."
                    className="flex-1 bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-lg py-2 px-3 text-[10px] font-mono text-white placeholder-tactical-gray/40"
                  />
                  <button
                    onClick={() => handleAddLogText(selectedMission.missionCode)}
                    className="bg-tactical-green border border-tactical-green hover:bg-opacity-95 text-white font-mono text-[9px] px-3.5 py-2.5 rounded-lg transition-all cursor-pointer font-bold uppercase flex items-center space-x-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>LOG</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-tactical-border bg-slate-950/20 flex justify-end">
              <button
                onClick={() => { setShowControlModal(false); setSelectedMission(null); }}
                className="px-5 py-2.5 bg-tactical-border border border-tactical-border hover:bg-tactical-border/80 text-white rounded-xl font-bold cursor-pointer uppercase text-[10px]"
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Missions;
