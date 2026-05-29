import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { resolveMediaUrl } from '../config';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { 
  Users, 
  Search, 
  Plus, 
  Trash2, 
  MapPin, 
  Calendar,
  Eye,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  User,
  ShieldAlert,
  FileText,
  Crosshair,
  UserX,
  Edit2,
  X,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';

const Suspects = ({ onTriggerToast }) => {
  const { user, authFetch } = useAuth();
  
  // Data State
  const [suspects, setSuspects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search, Pagination & Sort parameters
  const [search, setSearch] = useState('');
  const [threatLevel, setThreatLevel] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(8);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [fullscreenPhoto, setFullscreenPhoto] = useState(null);
  const [selectedSuspect, setSelectedSuspect] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    alias: '',
    associatedThreatLevel: 'Low',
    status: 'Wanted',
    location: '',
    description: '',
    photoUrl: '',
  });

  const isCommander = user?.role === 'Admin Commander';
  const isIntelOrCommander = !!user; // All logged-in officers can compile suspects

  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onTriggerToast('Tactical Alert: Only image formats (JPG, PNG, WEBP) are authorized for suspect photos.', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      onTriggerToast('Security Protocol Rejection: Suspect photo is strictly capped at 5 MB.', 'error');
      return;
    }

    try {
      setUploadingPhoto(true);
      const fd = new FormData();
      fd.append('file', file);

      const res = await authFetch('/upload', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        setFormData(prev => ({ ...prev, photoUrl: data.file.fileUrl }));
        onTriggerToast('Suspect photo uploaded successfully!', 'success');
      } else {
        onTriggerToast(data.message, 'error');
      }
    } catch (err) {
      console.error('[Suspect Photo Upload Error]', err);
      onTriggerToast('Failed to upload suspect photo.', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const fetchSuspects = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        search,
        threatLevel,
        status,
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder
      });

      const res = await authFetch(`/suspects?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setSuspects(data.suspects);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.count || 0);
      }
    } catch (error) {
      console.error('[Fetch Suspects Error]', error);
      onTriggerToast('Failed to retrieve classified suspect registry.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuspects();
  }, [search, threatLevel, status, page, sortBy, sortOrder]);

  const handleSort = (field) => {
    setPage(1);
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch('/suspects', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        onTriggerToast(`Suspect dossier [${data.suspect.suspectId}] compiled in database!`, 'success');
        setShowAddModal(false);
        resetForm();
        fetchSuspects();
      } else {
        onTriggerToast(data.message, 'error');
      }
    } catch (error) {
      console.error('[Create Suspect Error]', error);
      onTriggerToast('Failed to register suspect profile.', 'error');
    }
  };

  const handleDeleteSuspect = async (suspectId, name) => {
    if (!window.confirm(`EXPUNGE DOSSIER: Permanently delete suspect profile [${suspectId}] "${name}" from database?`)) return;
    try {
      const res = await authFetch(`/suspects/${suspectId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        onTriggerToast(`Dossier ${suspectId} permanently removed.`, 'warning');
        fetchSuspects();
      } else {
        onTriggerToast(data.message, 'error');
      }
    } catch (error) {
      console.error('[Delete Suspect Error]', error);
      onTriggerToast('Failed to purge suspect profile.', 'error');
    }
  };

  const openDetailModal = (suspect) => {
    setSelectedSuspect(suspect);
    setShowDetailModal(true);
  };

  const openEditModal = (suspect) => {
    setSelectedSuspect(suspect);
    setFormData({
      fullName: suspect.fullName,
      alias: suspect.alias || '',
      associatedThreatLevel: suspect.associatedThreatLevel || 'Low',
      status: suspect.status || 'Wanted',
      location: suspect.location,
      description: suspect.description,
      photoUrl: suspect.photoUrl || '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSuspect) return;
    try {
      const res = await authFetch(`/suspects/${selectedSuspect.suspectId}`, {
        method: 'PUT',
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        onTriggerToast(`Suspect dossier ${selectedSuspect.suspectId} updated successfully in database!`, 'success');
        setShowEditModal(false);
        setSelectedSuspect(null);
        resetForm();
        fetchSuspects();
      } else {
        onTriggerToast(data.message, 'error');
      }
    } catch (error) {
      console.error('[Edit Suspect Error]', error);
      onTriggerToast('Failed to modify suspect record.', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      alias: '',
      associatedThreatLevel: 'Low',
      status: 'Wanted',
      location: '',
      description: '',
      photoUrl: '',
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Filtering & Action Bar */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-tactical-panel border border-tactical-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search suspect name, alias, location..."
              className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 pl-10 pr-4 text-xs font-mono text-white placeholder-tactical-gray/50"
            />
            <Search className="absolute left-3.5 top-2.5 w-4.5 h-4.5 text-tactical-gray" />
          </div>

          {/* Threat level filter */}
          <select
            value={threatLevel}
            onChange={(e) => { setThreatLevel(e.target.value); setPage(1); }}
            className="bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-xs font-mono text-white"
          >
            <option value="">All Threat Levels</option>
            <option value="Low">Low Threat</option>
            <option value="Moderate">Moderate Threat</option>
            <option value="High">High Threat</option>
            <option value="Critical">Critical Threat</option>
          </select>

          {/* Status filter */}
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-xs font-mono text-white"
          >
            <option value="">All Statuses</option>
            <option value="Wanted">Wanted</option>
            <option value="Under Surveillance">Under Surveillance</option>
            <option value="Apprehended">Apprehended</option>
            <option value="Active">Active / At Large</option>
          </select>
        </div>

        {isIntelOrCommander && (
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="w-full xl:w-auto flex items-center justify-center space-x-2 bg-tactical-green hover:bg-opacity-95 text-white font-mono text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer shadow-glowGreen transition-all uppercase"
          >
            <Plus className="w-4 h-4" />
            <span>ADD SUSPECT DOSSIER</span>
          </button>
        )}
      </div>

      {/* 2. Classified Suspect grid */}
      {loading ? (
        <TableSkeleton rows={limit} />
      ) : suspects.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {suspects.map((suspect) => (
              <div 
                key={suspect.suspectId}
                className={`bg-tactical-panel border border-tactical-border hover:border-tactical-gray/50 rounded-2xl p-5 shadow-tactical flex flex-col justify-between transition-all duration-300 relative overflow-hidden group
                  ${suspect.associatedThreatLevel === 'Critical' ? 'border-l-4 border-l-tactical-red' : ''}
                `}
              >
                {/* Visual scan overlay for Critical suspects */}
                {suspect.associatedThreatLevel === 'Critical' && (
                  <div className="absolute inset-0 bg-[#201212]/5 pointer-events-none animate-pulse-tactical"></div>
                )}

                <div className="space-y-4">
                  {/* Photo & Identity Header */}
                  <div className="flex items-start space-x-3">
                    <div className="relative">
                      <img 
                        src={resolveMediaUrl(suspect.photoUrl)} 
                        alt={suspect.fullName} 
                        onClick={() => window.open(suspect.photoUrl && (suspect.photoUrl.startsWith('http://') || suspect.photoUrl.startsWith('https://')) ? suspect.photoUrl : resolveMediaUrl(suspect.photoUrl), '_blank')}
                        className={`w-12 h-12 rounded-xl object-cover bg-tactical-bg border cursor-pointer hover:scale-105 transition-all
                          ${suspect.associatedThreatLevel === 'Low' ? 'border-tactical-green/40' : ''}
                          ${suspect.associatedThreatLevel === 'Moderate' ? 'border-[#58a6ff]/40' : ''}
                          ${suspect.associatedThreatLevel === 'High' ? 'border-amber-500/40' : ''}
                          ${suspect.associatedThreatLevel === 'Critical' ? 'border-tactical-red/60 animate-pulse' : ''}
                        `}
                        title="Click to view full screen"
                      />
                      <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center border border-tactical-panel text-[7px] font-black text-white
                        ${suspect.associatedThreatLevel === 'Low' ? 'bg-[#00C853]' : ''}
                        ${suspect.associatedThreatLevel === 'Moderate' ? 'bg-[#1f6feb]' : ''}
                        ${suspect.associatedThreatLevel === 'High' ? 'bg-amber-500' : ''}
                        ${suspect.associatedThreatLevel === 'Critical' ? 'bg-[#FF3D3D]' : ''}
                      `}>
                        {suspect.associatedThreatLevel[0]}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1 font-mono">
                      <h4 className="text-xs font-bold text-white truncate leading-tight uppercase" title={suspect.fullName}>
                        {suspect.fullName}
                      </h4>
                      <p className="text-[9px] text-tactical-gray mt-0.5 truncate uppercase">
                        ALIAS: <span className="text-white font-bold">{suspect.alias}</span>
                      </p>
                      <p className="text-[7.5px] text-tactical-gray mt-0.5 tracking-wider">
                        CODE: {suspect.suspectId}
                      </p>
                    </div>
                  </div>

                  {/* Status, Location briefs */}
                  <div className="space-y-2 font-mono text-[9px] border-t border-tactical-border/40 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-tactical-gray uppercase">Status:</span>
                      <span className={`px-1.5 py-0.2 rounded text-[7px] font-bold uppercase border
                        ${suspect.status === 'Wanted' ? 'bg-[#201212] border-tactical-red/40 text-tactical-redLight' : ''}
                        ${suspect.status === 'Under Surveillance' ? 'bg-[#241c0f] border-amber-500/40 text-amber-400' : ''}
                        ${suspect.status === 'Apprehended' ? 'bg-[#0f1b15] border-tactical-green/40 text-tactical-greenLight' : ''}
                        ${suspect.status === 'Active' ? 'bg-slate-900 border border-tactical-border text-white' : ''}
                      `}>
                        {suspect.status}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 text-tactical-gray">
                      <MapPin className="w-3.5 h-3.5 text-tactical-green flex-shrink-0" />
                      <span className="text-white truncate max-w-[150px]" title={suspect.location}>{suspect.location}</span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between border-t border-tactical-border/40 pt-3 mt-4 gap-2">
                  <button
                    onClick={() => openDetailModal(suspect)}
                    className="flex-1 flex items-center justify-center space-x-1 bg-tactical-border border border-tactical-border hover:bg-tactical-green/10 hover:border-tactical-green hover:text-tactical-greenLight text-white font-mono text-[9px] font-bold py-1.5 px-2.5 rounded-lg transition-all uppercase cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Brief Dossier</span>
                  </button>

                  {isCommander && (
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => openEditModal(suspect)}
                        className="p-1.5 rounded bg-tactical-border border border-tactical-border hover:bg-tactical-blue/15 hover:border-tactical-blue hover:text-tactical-blue text-tactical-text transition-all cursor-pointer"
                        title="Modify dossier parameters"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSuspect(suspect.suspectId, suspect.fullName)}
                        className="p-1.5 rounded bg-tactical-border border border-tactical-border hover:bg-tactical-red/10 hover:border-tactical-red hover:text-tactical-redLight text-tactical-text transition-all cursor-pointer"
                        title="Purge classified dossier"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Table Pagination Controls Footer */}
          <div className="p-4 bg-tactical-panel border border-tactical-border rounded-xl flex items-center justify-between font-mono text-xs shadow-2xl bg-slate-950/20">
            <span className="text-tactical-gray">
              Showing page <span className="text-white font-bold">{page}</span> of <span className="text-white font-bold">{totalPages}</span> ({totalCount} total suspects)
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
          NO CLASSIFIED SUSPECT DOSSIERS REGISTERED MATCHING FILTER MATRICES.
        </div>
      )}

      {/* 3. Modal: Add Suspect Form */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-tactical-panel border border-tactical-border rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-tactical-green"></div>
            
            <div className="p-6 border-b border-tactical-border bg-slate-950/20">
              <h3 className="text-sm font-bold font-mono tracking-widest text-white uppercase flex items-center space-x-2">
                <UserX className="w-5 h-5 text-tactical-green" />
                <span>COMPILE ROGUE SUSPECT DOSSIER</span>
              </h3>
              <p className="text-[9px] text-tactical-gray font-mono uppercase mt-1">Registers rogue profile records directly inside MongoDB</p>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto font-mono text-xs">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Full Legal Name</label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="E.G. Devendra Malik"
                      className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Operational Alias</label>
                    <input
                      type="text"
                      value={formData.alias}
                      onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
                      placeholder="E.G. Viper"
                      className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Threat Classification</label>
                    <select
                      value={formData.associatedThreatLevel}
                      onChange={(e) => setFormData({ ...formData, associatedThreatLevel: e.target.value })}
                      className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                    >
                      <option value="Low">Low Threat</option>
                      <option value="Moderate">Moderate Threat</option>
                      <option value="High">High Threat</option>
                      <option value="Critical">Critical Threat</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Operational Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                    >
                      <option value="Wanted">Wanted / Active hunt</option>
                      <option value="Under Surveillance">Under Surveillance</option>
                      <option value="Apprehended">Apprehended / Locked</option>
                      <option value="Active">Active / At Large</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Last Known Sector Location</label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="E.G. Jammu Sector Hub (32.72, 74.85)"
                    className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Intel Description / Background</label>
                  <textarea
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Provide detailed description of suspected cyber-espionage activities, training parameter logs, and direct operational threat markers..."
                    className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white leading-normal"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Profile Photo Image URL</label>
                    <input
                      type="text"
                      value={formData.photoUrl}
                      onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                      placeholder="E.G. https://images.unsplash.com/... (optional)"
                      className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3.5 text-white text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Upload Photo</label>
                    <div className="relative">
                      <input
                        type="file"
                        onChange={handlePhotoUpload}
                        disabled={uploadingPhoto}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                        accept="image/*"
                      />
                      <div className={`w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 rounded-xl py-2 px-3 text-center text-[10px] text-tactical-text font-bold uppercase transition-all flex items-center justify-center space-x-1.5
                        ${uploadingPhoto ? 'animate-pulse' : ''}`}>
                        {uploadingPhoto ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-tactical-green animate-pulse" />
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="w-3.5 h-3.5 text-tactical-green" />
                            <span>Select File</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-tactical-border/60">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-tactical-border text-tactical-gray hover:text-white rounded-xl font-bold transition-all cursor-pointer"
                >
                  ABORT
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-tactical-green text-white rounded-xl font-bold shadow-glowGreen cursor-pointer"
                >
                  REGISTER DOSSIER
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal: View Suspect Dossier Details Briefing */}
      {showDetailModal && selectedSuspect && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-tactical-panel border border-tactical-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-tactical-green"></div>
            
            <div className="p-6 border-b border-tactical-border bg-slate-950/20 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold font-mono tracking-widest text-white uppercase flex items-center space-x-2">
                  <ShieldAlert className="w-5 h-5 text-tactical-red animate-pulse" />
                  <span>CLASSIFIED DOSSIER BREIFING</span>
                </h3>
                <p className="text-[9px] text-tactical-gray font-mono uppercase mt-1">SUSPECT CODE: {selectedSuspect.suspectId}</p>
              </div>
              <span className={`inline-flex px-2.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border
                ${selectedSuspect.associatedThreatLevel === 'Low' ? 'bg-[#0f1b15] border-[#00C853]/40 text-[#00C853]' : ''}
                ${selectedSuspect.associatedThreatLevel === 'Moderate' ? 'bg-[#152331] border-[#1f6feb]/40 text-[#58a6ff]' : ''}
                ${selectedSuspect.associatedThreatLevel === 'High' ? 'bg-[#241c0f] border-amber-500/40 text-amber-400' : ''}
                ${selectedSuspect.associatedThreatLevel === 'Critical' ? 'bg-[#201212] border-[#FF3D3D]/40 text-[#FF3D3D] animate-pulse-tactical' : ''}
              `}>
                {selectedSuspect.associatedThreatLevel} Threat
              </span>
            </div>

            <div className="p-6 space-y-5 font-mono text-xs max-h-[70vh] overflow-y-auto">
              {/* Image & Main stats grid */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <img 
                  src={resolveMediaUrl(selectedSuspect.photoUrl)} 
                  alt={selectedSuspect.fullName} 
                  onClick={() => window.open(selectedSuspect.photoUrl && (selectedSuspect.photoUrl.startsWith('http://') || selectedSuspect.photoUrl.startsWith('https://')) ? selectedSuspect.photoUrl : resolveMediaUrl(selectedSuspect.photoUrl), '_blank')}
                  className={`w-32 h-32 rounded-2xl object-cover bg-tactical-bg border-2 cursor-pointer hover:scale-105 transition-all
                    ${selectedSuspect.associatedThreatLevel === 'Low' ? 'border-[#00C853]/40' : ''}
                    ${selectedSuspect.associatedThreatLevel === 'Moderate' ? 'border-[#1f6feb]/40' : ''}
                    ${selectedSuspect.associatedThreatLevel === 'High' ? 'border-amber-500/40' : ''}
                    ${selectedSuspect.associatedThreatLevel === 'Critical' ? 'border-[#FF3D3D]/60 animate-pulse' : ''}
                  `}
                  title="Click to view full screen"
                />

                <div className="flex-1 space-y-3 w-full">
                  <div className="space-y-1">
                    <span className="text-[8px] text-tactical-gray uppercase tracking-widest font-bold">FULL IDENTITY</span>
                    <h4 className="text-sm font-extrabold text-white uppercase leading-none">{selectedSuspect.fullName}</h4>
                    <p className="text-[10px] text-tactical-gray mt-0.5">ALIAS CODED: <span className="text-white font-bold">{selectedSuspect.alias}</span></p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="bg-tactical-bg/50 p-2.5 rounded-xl border border-tactical-border/40 space-y-1">
                      <span className="text-[8.5px] text-tactical-gray uppercase font-bold">Operational Status</span>
                      <div className="flex items-center space-x-1.5">
                        <span className={`w-2 h-2 rounded-full
                          ${selectedSuspect.status === 'Wanted' ? 'bg-[#FF3D3D]' : ''}
                          ${selectedSuspect.status === 'Under Surveillance' ? 'bg-amber-500' : ''}
                          ${selectedSuspect.status === 'Apprehended' ? 'bg-[#00C853]' : ''}
                          ${selectedSuspect.status === 'Active' ? 'bg-white' : ''}
                        `}></span>
                        <span className="text-white font-bold text-[10px] uppercase">{selectedSuspect.status}</span>
                      </div>
                    </div>

                    <div className="bg-tactical-bg/50 p-2.5 rounded-xl border border-tactical-border/40 space-y-1">
                      <span className="text-[8.5px] text-tactical-gray uppercase font-bold">Last Coded Sector</span>
                      <div className="flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-tactical-green flex-shrink-0" />
                        <span className="text-white font-bold text-[9px] truncate">{selectedSuspect.location}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description background */}
              <div className="space-y-1.5">
                <h4 className="text-[9.5px] text-tactical-gray uppercase font-bold">Classified Intelligence Briefing</h4>
                <div className="bg-tactical-bg border border-tactical-border/60 rounded-xl p-4 text-[11px] text-tactical-text leading-relaxed whitespace-pre-line">
                  {selectedSuspect.description}
                </div>
              </div>

              {/* Associated references */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-tactical-border/40 pt-4">
                <div className="space-y-1.5">
                  <h4 className="text-[9px] text-tactical-gray uppercase font-bold flex items-center space-x-1">
                    <FileText className="w-3.5 h-3.5 text-tactical-green" />
                    <span>Linked Intelligence Reports</span>
                  </h4>
                  {selectedSuspect.linkedReports && selectedSuspect.linkedReports.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedSuspect.linkedReports.map(rep => (
                        <span key={rep} className="text-[8px] font-bold bg-slate-900 border border-tactical-border text-white px-2 py-0.5 rounded uppercase tracking-widest">{rep}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[8.5px] text-tactical-gray/60 italic">No reports linked currently.</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-[9px] text-tactical-gray uppercase font-bold flex items-center space-x-1">
                    <Crosshair className="w-3.5 h-3.5 text-tactical-red" />
                    <span>Active Tactical Operations</span>
                  </h4>
                  {selectedSuspect.linkedMissions && selectedSuspect.linkedMissions.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedSuspect.linkedMissions.map(mis => (
                        <span key={mis} className="text-[8px] font-bold bg-slate-900 border border-tactical-border text-white px-2 py-0.5 rounded uppercase tracking-widest">{mis}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[8.5px] text-tactical-gray/60 italic">No missions actively targeting suspect.</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-[8px] text-tactical-gray pt-2 border-t border-tactical-border/40">
                <span>SECURED DATABASE GATE-A5</span>
                <span>DOSSIER LOGGED: {new Date(selectedSuspect.createdAt || new Date()).toLocaleString()}</span>
              </div>
            </div>

            <div className="p-6 border-t border-tactical-border bg-slate-950/20 flex justify-end">
              <button
                onClick={() => { setShowDetailModal(false); setSelectedSuspect(null); }}
                className="px-5 py-2.5 bg-tactical-border border border-tactical-border hover:bg-tactical-border/80 text-white rounded-xl font-bold cursor-pointer uppercase text-[9px]"
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal: Edit Suspect Form */}
      {showEditModal && selectedSuspect && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-tactical-panel border border-tactical-border rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-tactical-green"></div>
            
            <div className="p-6 border-b border-tactical-border bg-slate-950/20">
              <h3 className="text-sm font-bold font-mono tracking-widest text-white uppercase flex items-center space-x-2">
                <UserX className="w-5 h-5 text-tactical-green" />
                <span>MODIFY SUSPECT DOSSIER PARAMETERS</span>
              </h3>
              <p className="text-[9px] text-tactical-gray font-mono uppercase mt-1">Updates suspect profile records inside MongoDB</p>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto font-mono text-xs">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Full Legal Name</label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="Full Suspect Name"
                      className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Operational Alias</label>
                    <input
                      type="text"
                      value={formData.alias}
                      onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
                      placeholder="Alias"
                      className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Threat Classification</label>
                    <select
                      value={formData.associatedThreatLevel}
                      onChange={(e) => setFormData({ ...formData, associatedThreatLevel: e.target.value })}
                      className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                    >
                      <option value="Low">Low Threat</option>
                      <option value="Moderate">Moderate Threat</option>
                      <option value="High">High Threat</option>
                      <option value="Critical">Critical Threat</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Operational Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                    >
                      <option value="Wanted">Wanted / Active hunt</option>
                      <option value="Under Surveillance">Under Surveillance</option>
                      <option value="Apprehended">Apprehended / Locked</option>
                      <option value="Active">Active / At Large</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Last Known Sector Location</label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Sector Location"
                    className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Intel Description / Background</label>
                  <textarea
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Intel description..."
                    className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white leading-normal"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Profile Photo Image URL</label>
                    <input
                      type="text"
                      value={formData.photoUrl}
                      onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                      placeholder="Image URL"
                      className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3.5 text-white text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Upload Photo</label>
                    <div className="relative">
                      <input
                        type="file"
                        onChange={handlePhotoUpload}
                        disabled={uploadingPhoto}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                        accept="image/*"
                      />
                      <div className={`w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 rounded-xl py-2 px-3 text-center text-[10px] text-tactical-text font-bold uppercase transition-all flex items-center justify-center space-x-1.5
                        ${uploadingPhoto ? 'animate-pulse' : ''}`}>
                        {uploadingPhoto ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-tactical-green animate-pulse" />
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="w-3.5 h-3.5 text-tactical-green" />
                            <span>Select File</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-tactical-border/60">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedSuspect(null);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-tactical-border text-tactical-gray hover:text-white rounded-xl font-bold transition-all cursor-pointer"
                >
                  ABORT
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-tactical-green text-white rounded-xl font-bold shadow-glowGreen cursor-pointer"
                >
                  APPLY CHANGES
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Suspect Photo Fullscreen Viewport */}
      {fullscreenPhoto && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setFullscreenPhoto(null)}
        >
          <div className="absolute top-4 right-4 flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
            <span className="text-[10px] font-mono text-tactical-gray uppercase tracking-widest bg-slate-900 border border-tactical-border px-3 py-1 rounded">
              Tactical Suspect Image Inspection
            </span>
            <button 
              onClick={() => setFullscreenPhoto(null)}
              className="p-2 bg-slate-900 border border-tactical-border hover:bg-tactical-red/10 text-white rounded-lg transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <img 
            src={resolveMediaUrl(fullscreenPhoto)} 
            alt="Suspect Fullscreen" 
            className="max-w-full max-h-[85vh] object-contain rounded-xl border border-tactical-border shadow-2xl transition-all duration-300 transform scale-100"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default Suspects;
