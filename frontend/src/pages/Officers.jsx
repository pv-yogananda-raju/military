import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { resolveMediaUrl } from '../config';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { 
  Users, 
  Search, 
  Plus, 
  Trash2, 
  Edit2, 
  Shield, 
  AlertTriangle, 
  Mail, 
  Phone, 
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  CheckCircle2,
  Contact,
  Download,
  Loader2
} from 'lucide-react';

const Officers = ({ onTriggerToast }) => {
  const { user, authFetch } = useAuth();
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search, Pagination & Filter states
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(8);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOfficer, setSelectedOfficer] = useState(null);
  const [viewIdOfficer, setViewIdOfficer] = useState(null);
  const [fullscreenIdCard, setFullscreenIdCard] = useState(false);

  // Dynamic CDN script loader for html2pdf.js
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleDownloadPDF = (targetOfficer) => {
    const element = document.getElementById('tactical-id-card-modal-container');
    if (!element) return;
    
    if (window.html2pdf) {
      const opt = {
        margin: 5,
        filename: `TACTICAL_ID_${targetOfficer.officerId}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };
      
      window.html2pdf().set(opt).from(element).save();
      onTriggerToast(`Classified Access Pass PDF for ${targetOfficer.fullName} downloaded successfully!`, 'success');
    } else {
      onTriggerToast('Tactical PDF compiler is initializing. Please retry in a few seconds.', 'warning');
    }
  };

  // Form states
  const [formData, setFormData] = useState({
    officerId: '',
    fullName: '',
    rank: '',
    role: 'Field Officer',
    department: '',
    clearanceLevel: 'Level 1',
    email: '',
    phone: '',
    password: '',
    status: 'Active',
    profileImage: '',
    dob: '',
    bloodGroup: '',
    branchUnit: '',
    enlistmentDate: '',
    cardIssueDate: '',
    cardExpirationDate: '',
    issuingAuthority: '',
    identificationMarks: '',
  });

  const isAdmin = user?.role === 'Admin Commander';
  const [uploadingOfficerPic, setUploadingOfficerPic] = useState(false);
  const handleOfficerPicUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onTriggerToast('Tactical Alert: Only image formats (JPG, PNG, WEBP) are authorized for profile photos.', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      onTriggerToast('Security Protocol Rejection: Profile photo is strictly capped at 5 MB.', 'error');
      return;
    }

    try {
      setUploadingOfficerPic(true);
      const fd = new FormData();
      fd.append('file', file);

      const res = await authFetch('/upload', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        setFormData(prev => ({ ...prev, profileImage: data.file.fileUrl }));
        onTriggerToast('Soldier photo uploaded successfully!', 'success');
      } else {
        onTriggerToast(data.message, 'error');
      }
    } catch (err) {
      console.error('[Officer Pic Upload Error]', err);
      onTriggerToast('Failed to upload profile photo.', 'error');
    } finally {
      setUploadingOfficerPic(false);
    }
  };

  const fetchOfficers = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        search,
        role: roleFilter,
        status: statusFilter,
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder
      });

      const res = await authFetch(`/officers?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setOfficers(data.officers);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.count || 0);
      }
    } catch (error) {
      console.error('[Fetch Officers Error]', error);
      onTriggerToast('Failed to load officer directory.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickApprove = async (officerId, name) => {
    try {
      const res = await authFetch(`/officers/${officerId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'Active' }),
      });
      const data = await res.json();
      if (data.success) {
        onTriggerToast(`Operative profile for ${name} activated successfully!`, 'success');
        fetchOfficers();
      } else {
        onTriggerToast(data.message, 'error');
      }
    } catch (error) {
      console.error('[Quick Approve Error]', error);
      onTriggerToast('Failed to activate officer profile.', 'error');
    }
  };

  useEffect(() => {
    fetchOfficers();
  }, [search, roleFilter, statusFilter, page, sortBy, sortOrder]);

  const handleSort = (field) => {
    setPage(1);
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Handle Add Officer submit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch('/officers', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        onTriggerToast(`Officer ${formData.fullName} enlisted successfully!`, 'success');
        setShowAddModal(false);
        resetForm();
        fetchOfficers();
      } else {
        onTriggerToast(data.message, 'error');
      }
    } catch (error) {
      console.error('[Add Officer Error]', error);
      onTriggerToast('API request failed.', 'error');
    }
  };

  // Handle Edit Officer submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOfficer) return;
    try {
      const res = await authFetch(`/officers/${selectedOfficer.officerId}`, {
        method: 'PUT',
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        onTriggerToast(`Officer Profile for ${formData.fullName} updated directly in database!`, 'success');
        setShowEditModal(false);
        setSelectedOfficer(null);
        resetForm();
        fetchOfficers();
      } else {
        onTriggerToast(data.message, 'error');
      }
    } catch (error) {
      console.error('[Edit Officer Error]', error);
      onTriggerToast('Failed to write changes to MongoDB.', 'error');
    }
  };

  // Handle delete officer
  const handleDeleteOfficer = async (officerId, name) => {
    if (!window.confirm(`CONFIRM OPERATIONS EXPUNGEMENT: Permanently remove Officer ${name} (${officerId}) from defense database?`)) return;
    try {
      const res = await authFetch(`/officers/${officerId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        onTriggerToast(`Officer ${officerId} profiles deleted.`, 'warning');
        fetchOfficers();
      } else {
        onTriggerToast(data.message, 'error');
      }
    } catch (error) {
      console.error('[Delete Officer Error]', error);
      onTriggerToast('Failed to expunge officer profile.', 'error');
    }
  };

  // Set up form for editing
  const openEditModal = (officer) => {
    setSelectedOfficer(officer);
    setFormData({
      officerId: officer.officerId,
      fullName: officer.fullName,
      rank: officer.rank,
      role: officer.role,
      department: officer.department,
      clearanceLevel: officer.clearanceLevel,
      email: officer.contactDetails.email,
      phone: officer.contactDetails.phone,
      password: '', // Leave blank unless changing
      status: officer.status,
      profileImage: officer.profileImage,
      dob: officer.dob || '',
      bloodGroup: officer.bloodGroup || '',
      branchUnit: officer.branchUnit || '',
      enlistmentDate: officer.enlistmentDate || '',
      cardIssueDate: officer.cardIssueDate || '',
      cardExpirationDate: officer.cardExpirationDate || '',
      issuingAuthority: officer.issuingAuthority || '',
      identificationMarks: officer.identificationMarks || '',
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      officerId: '',
      fullName: '',
      rank: '',
      role: 'Field Officer',
      department: '',
      clearanceLevel: 'Level 1',
      email: '',
      phone: '',
      password: '',
      status: 'Active',
      profileImage: '',
      dob: '',
      bloodGroup: '',
      branchUnit: '',
      enlistmentDate: '',
      cardIssueDate: '',
      cardExpirationDate: '',
      issuingAuthority: '',
      identificationMarks: '',
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Header controls panel */}
      <div className="flex flex-col md:flex-row justify-between items-stretch gap-4 bg-tactical-panel border border-tactical-border rounded-xl p-4">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by ID, name, rank, department..."
            className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 pl-10 pr-4 text-xs font-mono text-white placeholder-tactical-gray/50"
          />
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-tactical-gray" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap md:flex-nowrap gap-3 items-center">
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="bg-tactical-bg border border-tactical-border text-xs font-mono text-white rounded-xl py-2 px-3 focus:border-tactical-green focus:outline-none"
          >
            <option value="">All Roles</option>
            <option value="Field Officer">Field Officer</option>
            <option value="Intelligence Officer">Intelligence Officer</option>
            <option value="Surveillance Analyst">Surveillance Analyst</option>
            <option value="Admin Commander">Admin Commander</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-tactical-bg border border-tactical-border text-xs font-mono text-white rounded-xl py-2 px-3 focus:border-tactical-green focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="In Field">In Field</option>
            <option value="On Leave">On Leave</option>
            <option value="Suspended">Suspended</option>
            <option value="Pending Approval">Pending Approval</option>
          </select>

          {isAdmin && (
            <button
              onClick={() => { resetForm(); setShowAddModal(true); }}
              className="flex items-center justify-center space-x-2 bg-tactical-green hover:bg-opacity-95 text-white font-mono text-xs font-bold px-4 py-2 rounded-xl cursor-pointer shadow-glowGreen transition-all whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>ENLIST OFFICER</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Officers directory table */}
      {loading ? (
        <TableSkeleton rows={limit} />
      ) : officers.length > 0 ? (
        <div className="bg-tactical-panel border border-tactical-border rounded-xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-mono">
              <thead>
                <tr className="bg-slate-950/40 border-b border-tactical-border text-tactical-gray font-bold uppercase tracking-wider select-none">
                  <th 
                    onClick={() => handleSort('officerId')}
                    className="px-6 py-3.5 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Officer ID</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('fullName')}
                    className="px-6 py-3.5 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Full Name / Rank</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('clearanceLevel')}
                    className="px-6 py-3.5 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Clearance & Role</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('department')}
                    className="px-6 py-3.5 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Department</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tactical-border/40 text-tactical-text">
                {officers.map((officer) => (
                  <tr key={officer.officerId} className="hover:bg-tactical-border/10 transition-all">
                    <td className="px-6 py-4 font-bold text-white tracking-widest">{officer.officerId}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <img 
                          src={resolveMediaUrl(officer.profileImage)} 
                          alt={officer.fullName}
                          className="w-8 h-8 rounded-lg object-cover border border-tactical-border bg-tactical-bg cursor-pointer hover:scale-105 transition-all"
                          onClick={() => {
                            onTriggerToast(`Displaying clearance profile photo for ${officer.fullName}`, 'success');
                            window.open(officer.profileImage && (officer.profileImage.startsWith('http://') || officer.profileImage.startsWith('https://')) ? officer.profileImage : resolveMediaUrl(officer.profileImage), '_blank');
                          }}
                          title="Inspect operative photo"
                        />
                        <div>
                          <p className="font-bold text-white">{officer.fullName}</p>
                          <p className="text-[10px] text-tactical-gray uppercase font-semibold">{officer.rank}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      <div className="flex items-center space-x-1.5 text-tactical-green font-bold">
                        <Shield className="w-3.5 h-3.5 text-tactical-green" />
                        <span className="text-[10px] uppercase">{officer.clearanceLevel}</span>
                      </div>
                      <p className="text-[10px] text-tactical-gray font-semibold uppercase">{officer.role}</p>
                    </td>
                    <td className="px-6 py-4 uppercase font-semibold text-tactical-gray">{officer.department}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-bold uppercase border
                        ${officer.status === 'Active' ? 'bg-[#0f1b15] border-[#00C853]/40 text-[#00C853]' : ''}
                        ${officer.status === 'In Field' ? 'bg-[#0e1726] border-tactical-border text-blue-400' : ''}
                        ${officer.status === 'On Leave' ? 'bg-tactical-panel border-tactical-border text-tactical-gray' : ''}
                        ${officer.status === 'Suspended' ? 'bg-[#201212] border-[#FF3D3D]/40 text-[#FF3D3D] animate-pulse-tactical' : ''}
                        ${officer.status === 'Pending Approval' ? 'bg-[#241c0f] border-amber-500/40 text-amber-400 animate-pulse-tactical font-bold' : ''}
                      `}>
                        {officer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {/* Quick Approve Action */}
                        {isAdmin && officer.status === 'Pending Approval' && (
                          <button
                            onClick={() => handleQuickApprove(officer.officerId, officer.fullName)}
                            className="px-2.5 py-1.5 rounded bg-tactical-green/10 border border-tactical-green/40 hover:bg-tactical-green/20 hover:border-tactical-green text-tactical-green transition-all cursor-pointer text-[9px] font-mono font-bold flex items-center space-x-1"
                            title="Approve operative profile"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>APPROVE</span>
                          </button>
                        )}

                        {/* View ID Card Action */}
                        <button
                          onClick={() => setViewIdOfficer(officer)}
                          className="p-1.5 rounded bg-tactical-border border border-tactical-border hover:bg-tactical-green/10 hover:border-tactical-green hover:text-tactical-green text-tactical-text transition-all cursor-pointer"
                          title="View ID Card"
                        >
                          <Contact className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Action */}
                        {isAdmin && (
                          <button
                            onClick={() => openEditModal(officer)}
                            className="p-1.5 rounded bg-tactical-border border border-tactical-border hover:bg-tactical-green/10 hover:border-tactical-green hover:text-tactical-green text-tactical-text transition-all cursor-pointer"
                            title="Edit Profile"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete Action (Admin Commander only, prevents self-delete) */}
                        {isAdmin && officer.officerId !== user?.officerId && (
                          <button
                            onClick={() => handleDeleteOfficer(officer.officerId, officer.fullName)}
                            className="p-1.5 rounded bg-tactical-border border border-tactical-border hover:bg-tactical-red/10 hover:border-tactical-red hover:text-tactical-red text-tactical-text transition-all cursor-pointer"
                            title="Expunge profile"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Controls Footer */}
          <div className="p-4 border-t border-tactical-border flex items-center justify-between font-mono text-xs bg-slate-950/20">
            <span className="text-tactical-gray">
              Showing page <span className="text-white font-bold">{page}</span> of <span className="text-white font-bold">{totalPages}</span> ({totalCount} total officers)
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
          NO MATCHING OFFICERS REGISTERED IN ARCHIVES.
        </div>
      )}

      {/* 3. Add Officer Form Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-tactical-panel border border-tactical-border rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-tactical-green"></div>
            <div className="p-6 border-b border-tactical-border bg-slate-950/20">
              <h3 className="text-sm font-bold font-mono tracking-widest text-white uppercase">ENLIST OPERATIVE IN REGISTRY</h3>
              <p className="text-[9px] text-tactical-gray font-mono uppercase mt-1">Saves profile details directly to military MongoDB database</p>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto font-mono text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Officer ID (Unique)</label>
                  <input
                    type="text"
                    required
                    value={formData.officerId}
                    onChange={(e) => setFormData({ ...formData, officerId: e.target.value })}
                    placeholder="E.G. OFF-105"
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="E.G. Lt. Aarav Sharma"
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Officer Rank</label>
                  <input
                    type="text"
                    required
                    value={formData.rank}
                    onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                    placeholder="E.G. Lieutenant"
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Tactical Department</label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="E.G. Tactical Reconnaissance"
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Security Clearance</label>
                  <select
                    value={formData.clearanceLevel}
                    onChange={(e) => setFormData({ ...formData, clearanceLevel: e.target.value })}
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                  >
                    <option value="Level 1">Level 1</option>
                    <option value="Level 2">Level 2</option>
                    <option value="Level 3">Level 3</option>
                    <option value="Top Secret">Top Secret</option>
                    <option value="Cosmic Top Secret">Cosmic Top Secret</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">System Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                  >
                    <option value="Field Officer">Field Officer</option>
                    <option value="Intelligence Officer">Intelligence Officer</option>
                    <option value="Surveillance Analyst">Surveillance Analyst</option>
                    <option value="Admin Commander">Admin Commander</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Secure Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@miscs.gov.in"
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765..."
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                  />
                </div>
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Profile Photo URL</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.profileImage}
                        onChange={(e) => setFormData({ ...formData, profileImage: e.target.value })}
                        placeholder="URL link to soldier profile"
                        className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white text-[10px] pl-10"
                      />
                      <ImageIcon className="absolute left-3.5 top-2.5 w-4 h-4 text-tactical-gray" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Upload Photo</label>
                    <div className="relative">
                      <input
                        type="file"
                        onChange={handleOfficerPicUpload}
                        disabled={uploadingOfficerPic}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                        accept="image/*"
                      />
                      <div className={`w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 rounded-xl py-2 px-3 text-center text-[10px] text-tactical-text font-bold uppercase transition-all flex items-center justify-center space-x-1.5
                        ${uploadingOfficerPic ? 'animate-pulse' : ''}`}>
                        {uploadingOfficerPic ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>Select File</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Date of Birth</label>
                  <input
                    type="date"
                    disabled={!isAdmin}
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Blood Group</label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    placeholder="E.G. O+"
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Assigned Branch / Unit</label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={formData.branchUnit}
                    onChange={(e) => setFormData({ ...formData, branchUnit: e.target.value })}
                    placeholder="E.G. Cyber Warfare Division"
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Date of Enlistment</label>
                  <input
                    type="date"
                    disabled={!isAdmin}
                    value={formData.enlistmentDate}
                    onChange={(e) => setFormData({ ...formData, enlistmentDate: e.target.value })}
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Card Issue Date</label>
                  <input
                    type="date"
                    disabled={!isAdmin}
                    value={formData.cardIssueDate}
                    onChange={(e) => setFormData({ ...formData, cardIssueDate: e.target.value })}
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Card Expiration Date</label>
                  <input
                    type="date"
                    disabled={!isAdmin}
                    value={formData.cardExpirationDate}
                    onChange={(e) => setFormData({ ...formData, cardExpirationDate: e.target.value })}
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Issuing Government Authority</label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={formData.issuingAuthority}
                    onChange={(e) => setFormData({ ...formData, issuingAuthority: e.target.value })}
                    placeholder="E.G. SECURED COMMAND SYSTEM"
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Visible Identification Marks</label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={formData.identificationMarks}
                    onChange={(e) => setFormData({ ...formData, identificationMarks: e.target.value })}
                    placeholder="E.G. Scar on right hand"
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                  />
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
                  SAVE RECORD
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Edit Officer Form Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-tactical-panel border border-tactical-border rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-tactical-green"></div>
            <div className="p-6 border-b border-tactical-border bg-slate-950/20">
              <h3 className="text-sm font-bold font-mono tracking-widest text-white uppercase">UPDATE OPERATIVE PROFILE</h3>
              <p className="text-[9px] text-tactical-gray font-mono uppercase mt-1">Changes are written instantly to MongoDB</p>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto font-mono text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Officer Name (MongoDB Edit)</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Full name"
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Officer Rank (MongoDB Edit)</label>
                  <input
                    type="text"
                    required
                    value={formData.rank}
                    onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                    placeholder="Rank"
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                  />
                </div>
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Profile Photo URL (MongoDB Edit)</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.profileImage}
                        onChange={(e) => setFormData({ ...formData, profileImage: e.target.value })}
                        placeholder="URL link to soldier profile"
                        className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white text-[10px] pl-10"
                      />
                      <ImageIcon className="absolute left-3.5 top-2.5 w-4 h-4 text-tactical-gray" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Upload Photo</label>
                    <div className="relative">
                      <input
                        type="file"
                        onChange={handleOfficerPicUpload}
                        disabled={uploadingOfficerPic}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                        accept="image/*"
                      />
                      <div className={`w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 rounded-xl py-2 px-3 text-center text-[10px] text-tactical-text font-bold uppercase transition-all flex items-center justify-center space-x-1.5
                        ${uploadingOfficerPic ? 'animate-pulse' : ''}`}>
                        {uploadingOfficerPic ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>Select File</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Department</label>
                  <input
                    type="text"
                    required
                    disabled={!isAdmin}
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="Department"
                    className={`w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white ${!isAdmin && 'opacity-60 cursor-not-allowed'}`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Operational Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                  >
                    <option value="Active">Active</option>
                    <option value="In Field">In Field</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Pending Approval">Pending Approval</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Security Clearance</label>
                  <select
                    disabled={!isAdmin}
                    value={formData.clearanceLevel}
                    onChange={(e) => setFormData({ ...formData, clearanceLevel: e.target.value })}
                    className={`w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white ${!isAdmin && 'opacity-60 cursor-not-allowed'}`}
                  >
                    <option value="Level 1">Level 1</option>
                    <option value="Level 2">Level 2</option>
                    <option value="Level 3">Level 3</option>
                    <option value="Top Secret">Top Secret</option>
                    <option value="Cosmic Top Secret">Cosmic Top Secret</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">System Role</label>
                  <select
                    disabled={!isAdmin}
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className={`w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white ${!isAdmin && 'opacity-60 cursor-not-allowed'}`}
                  >
                    <option value="Field Officer">Field Officer</option>
                    <option value="Intelligence Officer">Intelligence Officer</option>
                    <option value="Surveillance Analyst">Surveillance Analyst</option>
                    <option value="Admin Commander">Admin Commander</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Secure Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Email address"
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Phone number"
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">New Password (Optional)</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Leave blank to preserve password"
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                  />
                  {isAdmin && selectedOfficer && selectedOfficer.plainPassword && (
                    <div className="mt-2 p-2 bg-[#0c1622] border border-cyan-500/30 rounded-xl">
                      <span className="text-[9px] text-cyan-400 uppercase font-black block mb-0.5">CLASSIFIED DECIPHERED PASSWORD</span>
                      <span className="text-white font-mono font-bold text-xs select-all">{selectedOfficer.plainPassword}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Date of Birth</label>
                  <input
                    type="date"
                    disabled={!isAdmin}
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Blood Group</label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    placeholder="E.G. O+"
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Assigned Branch / Unit</label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={formData.branchUnit}
                    onChange={(e) => setFormData({ ...formData, branchUnit: e.target.value })}
                    placeholder="E.G. Cyber Warfare Division"
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Date of Enlistment</label>
                  <input
                    type="date"
                    disabled={!isAdmin}
                    value={formData.enlistmentDate}
                    onChange={(e) => setFormData({ ...formData, enlistmentDate: e.target.value })}
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Card Issue Date</label>
                  <input
                    type="date"
                    disabled={!isAdmin}
                    value={formData.cardIssueDate}
                    onChange={(e) => setFormData({ ...formData, cardIssueDate: e.target.value })}
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Card Expiration Date</label>
                  <input
                    type="date"
                    disabled={!isAdmin}
                    value={formData.cardExpirationDate}
                    onChange={(e) => setFormData({ ...formData, cardExpirationDate: e.target.value })}
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Issuing Government Authority</label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={formData.issuingAuthority}
                    onChange={(e) => setFormData({ ...formData, issuingAuthority: e.target.value })}
                    placeholder="E.G. SECURED COMMAND SYSTEM"
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Visible Identification Marks</label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={formData.identificationMarks}
                    onChange={(e) => setFormData({ ...formData, identificationMarks: e.target.value })}
                    placeholder="E.G. Scar on right hand"
                    className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-tactical-border/60">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setSelectedOfficer(null); }}
                  className="px-4 py-2 border border-tactical-border text-tactical-gray hover:text-white rounded-xl transition-all cursor-pointer font-bold"
                >
                  ABORT
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-tactical-green text-white rounded-xl shadow-glowGreen font-bold cursor-pointer"
                >
                  APPLY CHANGES
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. View ID Card Modal */}
      {viewIdOfficer && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-tactical-panel border border-tactical-border rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-cyan-500 shadow-[0_0_8px_#06b6d4]"></div>
            
            <div className="p-6 border-b border-tactical-border bg-slate-950/20 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold font-mono tracking-widest text-white uppercase flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-cyan-400 filter drop-shadow(0 0 3px rgba(6,182,212,0.4))" />
                  <span>Secure Tactical ID Access Pass</span>
                </h3>
                <p className="text-[9px] text-tactical-gray font-mono uppercase mt-1">Clearance verification registry for operative {viewIdOfficer.officerId}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setFullscreenIdCard(true)}
                  className="flex items-center space-x-1.5 bg-slate-900 border border-cyan-500/40 hover:border-cyan-400 text-cyan-400 font-mono text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer shadow-[0_0_8px_rgba(6,182,212,0.15)] transition-all uppercase hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="text-[9px]">🔍</span>
                  <span>Inspect Fullscreen</span>
                </button>
                <button
                  onClick={() => handleDownloadPDF(viewIdOfficer)}
                  className="flex items-center space-x-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-black px-3.5 py-2 rounded-xl cursor-pointer shadow-[0_0_8px_rgba(6,182,212,0.3)] transition-all uppercase hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF Pass</span>
                </button>
                <button
                  onClick={() => { setViewIdOfficer(null); setFullscreenIdCard(false); }}
                  className="px-3.5 py-2 border border-tactical-border text-tactical-gray hover:text-white rounded-xl transition-all cursor-pointer font-bold text-xs"
                >
                  CLOSE
                </button>
              </div>
            </div>
             <div className="p-6 overflow-y-auto max-h-[75vh] flex justify-center items-center bg-slate-950/40">
              <div className="overflow-x-auto w-full py-4 flex justify-center">
                <div 
                  id="tactical-id-card-modal-container" 
                  className="flex flex-col md:flex-row gap-8 justify-center items-center min-w-[920px] p-6 bg-slate-950/40 rounded-2xl border border-tactical-border/40"
                  style={{ width: '960px', margin: '0 auto' }}
                >
                  {/* FRONT SIDE */}
                  <div className="w-[440px] h-[272px] bg-gradient-to-br from-[#0b0f19] via-[#05070c] to-[#010203] border-2 border-cyan-500/50 rounded-2xl p-5 flex flex-col justify-between relative shadow-[0_0_30px_rgba(6,182,212,0.2)] overflow-hidden font-mono text-white select-none transition-all">
                    {/* Sleek Top Neon Highlight Bar */}
                    <div className="absolute top-0 left-0 w-full h-[5px] bg-gradient-to-r from-[#FF9933] via-[#FFFFFF] to-[#138808] z-20 shadow-md"></div>

                    {/* Cyber Diagonal Watermark Grid */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.015)_1px,transparent_1px)] bg-[size:8px_8px] pointer-events-none z-0"></div>
                    
                    {/* circular circuit SVG watermark */}
                    <svg viewBox="0 0 100 100" className="absolute top-1/2 left-[60%] -translate-x-1/2 -translate-y-1/2 w-48 h-48 opacity-[0.09] pointer-events-none select-none z-0 text-cyan-400 filter drop-shadow(0 0 4px rgba(6,182,212,0.5))">
                      <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="1" fill="none" strokeDasharray="4 4" />
                      <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="0.75" fill="none" />
                      <circle cx="50" cy="50" r="12" stroke="currentColor" strokeWidth="1.5" fill="none" />
                      <path d="M 50 10 L 50 90 M 10 50 L 90 50" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
                      <path d="M 25 25 L 35 35 L 35 65 L 25 75 M 75 25 L 65 35 L 65 65 L 75 75" stroke="currentColor" strokeWidth="0.75" fill="none" />
                      <circle cx="50" cy="22" r="2" fill="currentColor" />
                      <circle cx="50" cy="78" r="2" fill="currentColor" />
                      <circle cx="22" cy="50" r="2" fill="currentColor" />
                      <circle cx="78" cy="50" r="2" fill="currentColor" />
                    </svg>

                    {/* Card Header */}
                    <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2.5 z-10 mt-1">
                      <div className="flex items-center space-x-2.5">
                        <Shield className="w-6 h-6 text-cyan-400 filter drop-shadow(0 0 3px rgba(6,182,212,0.6))" />
                        <div className="text-left leading-none">
                          <h4 className="text-[10px] font-black tracking-widest leading-none text-white font-mono uppercase">SECURE MATRIX TACTICAL COMMAND</h4>
                          <p className="text-[6.5px] text-cyan-400 font-extrabold uppercase tracking-widest leading-none mt-1">OPERATIONAL SECURED ACCESS PASS • CLASS-4 LEVEL ALPHA</p>
                        </div>
                      </div>
                      <span className={`text-[6.5px] border font-black px-2 py-0.5 rounded tracking-widest uppercase font-mono shadow-sm
                        ${(viewIdOfficer.status || '').toUpperCase() === 'SUSPENDED' 
                          ? 'bg-red-950/40 border-red-500/50 text-red-400 animate-pulse' 
                          : 'bg-cyan-950/40 border-cyan-500/50 text-cyan-400'
                        }`}
                      >
                        {(viewIdOfficer.status || 'Active').toUpperCase()}
                      </span>
                    </div>

                    {/* Card Middle Content */}
                    <div className="flex items-stretch gap-8 py-3 z-10 flex-1">
                      {/* Profile Pic with cyber frames */}
                      <div className="relative w-24 h-28 flex-shrink-0 border-2 border-cyan-500/40 bg-slate-950 p-0.5 rounded-xl shadow-2xl overflow-hidden flex items-center justify-center">
                        <img 
                          src={resolveMediaUrl(viewIdOfficer.profileImage)} 
                          alt={viewIdOfficer.fullName} 
                          className="w-full h-full object-cover rounded-lg cursor-pointer hover:scale-105 transition-all"
                          onClick={() => window.open(viewIdOfficer.profileImage && (viewIdOfficer.profileImage.startsWith('http://') || viewIdOfficer.profileImage.startsWith('https://')) ? viewIdOfficer.profileImage : resolveMediaUrl(viewIdOfficer.profileImage), '_blank')}
                          title="Click to view full photo in new tab"
                        />
                        {/* Photo Scanning Sweep Bar */}
                        <div className="absolute inset-x-0.5 top-0.5 h-[2px] bg-cyan-400 shadow-[0_0_10px_#06b6d4] animate-[bounce_3s_infinite] opacity-80"></div>
                        <div className="absolute bottom-0.5 inset-x-0.5 bg-slate-950/85 text-[5.5px] text-center text-cyan-400 font-black py-0.5 tracking-wider uppercase border border-cyan-500/15 rounded">
                          BIOMETRIC.OK
                        </div>
                      </div>

                      {/* Main Identity Information */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 text-left leading-none">
                        <div>
                          <p className="text-[6.5px] text-slate-400 uppercase tracking-widest font-extrabold">OPERATIVE ID NUMBER</p>
                          <p className="text-[13px] font-black tracking-widest text-cyan-400 uppercase font-mono mt-0.5 filter drop-shadow(0 0 2px rgba(6,182,212,0.4))">{viewIdOfficer.officerId}</p>
                        </div>

                        <div>
                          <p className="text-[6.5px] text-slate-400 uppercase tracking-widest font-extrabold">NAME</p>
                          <div className="text-[12px] font-black text-white uppercase font-sans mt-0.5 tracking-wide leading-tight whitespace-normal break-words max-w-[270px]">
                            {viewIdOfficer.fullName}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 border-t border-tactical-border/20 pt-1.5">
                          <div>
                            <p className="text-[6.5px] text-slate-400 uppercase tracking-widest font-bold font-mono">OFFICIAL RANK</p>
                            <p className="text-[10px] font-bold text-white uppercase truncate mt-0.5 font-mono">{viewIdOfficer.rank}</p>
                          </div>
                          <div>
                            <p className="text-[6.5px] text-slate-400 uppercase tracking-widest font-bold font-mono">SYSTEM ACCESS</p>
                            <p className="text-[10px] font-black text-cyan-400 uppercase truncate mt-0.5 font-mono">{viewIdOfficer.clearanceLevel}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="flex items-center justify-between border-t border-cyan-500/30 pt-2.5 z-10 text-[6.5px]">
                      <div className="leading-tight text-left">
                        <p className="text-[5.8px] text-slate-400 uppercase tracking-wider font-extrabold">ASSIGNED DIVISION</p>
                        <p className="text-white font-extrabold uppercase truncate max-w-[220px] mt-0.5 tracking-wider">{viewIdOfficer.branchUnit || 'CYBER WARFARE DIVISION'}</p>
                      </div>
                      {/* Clean Digital Hash Security Block */}
                      <div className="text-left min-w-[80px] border-l border-tactical-border/30 pl-2.5">
                        <p className="text-[4.8px] text-slate-400 uppercase font-extrabold tracking-widest">SECURITY HASH</p>
                        <p className="text-[6px] font-mono text-cyan-400 mt-0.5 leading-none tracking-widest uppercase">
                          {`SHA256::${viewIdOfficer.fullName.substring(0, 3).toUpperCase()}${viewIdOfficer.officerId}`}
                        </p>
                      </div>
                      {/* CSS Styled Cyber Barcode */}
                      <div className="flex items-end space-x-[2px] h-6 opacity-80 flex-shrink-0 bg-slate-950/60 p-0.5 rounded border border-cyan-500/20">
                        <div className="w-[2px] h-full bg-cyan-400"></div>
                        <div className="w-[3px] h-[90%] bg-cyan-400"></div>
                        <div className="w-[1px] h-full bg-cyan-400"></div>
                        <div className="w-[2px] h-[75%] bg-cyan-400"></div>
                        <div className="w-[1.5px] h-full bg-cyan-400"></div>
                        <div className="w-[3px] h-[80%] bg-cyan-400"></div>
                        <div className="w-[1px] h-full bg-cyan-400"></div>
                        <div className="w-[2.5px] h-full bg-cyan-400"></div>
                      </div>
                    </div>
                  </div>

                  {/* BACK SIDE */}
                  <div className="w-[440px] h-[272px] bg-gradient-to-br from-[#0b0f19] via-[#05070c] to-[#010203] border-2 border-cyan-500/50 rounded-2xl p-5 flex flex-col justify-between relative shadow-[0_0_30px_rgba(6,182,212,0.2)] overflow-hidden font-mono text-white select-none transition-all">
                    {/* Sleek Top Neon Highlight Bar */}
                    <div className="absolute top-0 left-0 w-full h-[5px] bg-gradient-to-r from-[#FF9933] via-[#FFFFFF] to-[#138808] z-20 shadow-md"></div>

                    {/* REALISTIC BLACK MAGNETIC STRIPE */}
                    <div className="absolute top-[5px] left-0 w-full h-[32px] bg-[#0c0c0c] border-y border-black shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] z-10"></div>

                    {/* Cyber Diagonal Watermark Grid */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.015)_1px,transparent_1px)] bg-[size:8px_8px] pointer-events-none z-0"></div>

                    {/* circular circuit SVG watermark */}
                    <svg viewBox="0 0 100 100" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 opacity-[0.06] pointer-events-none select-none z-0 text-cyan-400">
                      <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="1" fill="none" strokeDasharray="4 4" />
                      <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="0.75" fill="none" />
                      <circle cx="50" cy="50" r="12" stroke="currentColor" strokeWidth="1.5" fill="none" />
                      <path d="M 50 10 L 50 90 M 10 50 L 90 50" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
                      <path d="M 25 25 L 35 35 L 35 65 L 25 75 M 75 25 L 65 35 L 65 65 L 75 75" stroke="currentColor" strokeWidth="0.75" fill="none" />
                    </svg>

                    {/* Header (shifted down below magnetic stripe) */}
                    <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2.5 z-10 mt-[40px]">
                      <div className="leading-tight text-left">
                        <h4 className="text-[10px] font-black tracking-widest text-white font-mono uppercase">BIOMETRIC MATRIX RECORD</h4>
                        <p className="text-[6px] text-cyan-400 font-extrabold uppercase tracking-widest leading-none mt-1">SECURED QUANTUM SYSTEM DIRECTIVE</p>
                      </div>
                      <div className="flex flex-col items-end text-right">
                        <span className="text-[6px] text-slate-400 uppercase tracking-widest font-extrabold font-mono">BLOOD GROUP</span>
                        <span className="text-[12px] font-black text-red-400 leading-none mt-1 filter drop-shadow(0 0 2px rgba(239,68,68,0.4))">{viewIdOfficer.bloodGroup || 'O+'}</span>
                      </div>
                    </div>

                    {/* Middle grid list of read-only metrics */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 py-3 text-[10px] leading-tight text-left z-10 flex-1 border-b border-cyan-500/20">
                      <div>
                        <p className="text-[6.5px] text-slate-400 uppercase tracking-wider font-extrabold">DATE OF BIRTH</p>
                        <p className="text-white font-bold text-[9px] mt-0.5">{viewIdOfficer.dob || '1988-06-15'}</p>
                      </div>
                      <div>
                        <p className="text-[6.5px] text-slate-400 uppercase tracking-wider font-extrabold">DATE OF ENLISTMENT</p>
                        <p className="text-white font-bold text-[9px] mt-0.5">{viewIdOfficer.enlistmentDate || '2010-08-20'}</p>
                      </div>
                      <div>
                        <p className="text-[6.5px] text-slate-400 uppercase tracking-wider font-extrabold">CREDENTIAL ISSUE DATE</p>
                        <p className="text-white font-bold text-[9px] mt-0.5">{viewIdOfficer.cardIssueDate || '2025-01-01'}</p>
                      </div>
                      <div>
                        <p className="text-[6.5px] text-slate-400 uppercase tracking-wider font-extrabold">EXPIRATION TERMINUS</p>
                        <p className="text-white font-bold text-[9px] mt-0.5">{viewIdOfficer.cardExpirationDate || '2035-01-01'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[6.5px] text-slate-400 uppercase tracking-wider font-extrabold">IDENTIFICATION MARKINGS</p>
                        <div className="text-white font-bold text-[8.5px] uppercase mt-0.5 leading-normal whitespace-normal break-words">
                          {viewIdOfficer.identificationMarks || 'NONE DECLARED.'}
                        </div>
                      </div>
                    </div>

                    {/* National Tricolor Flag & Ashoka Chakra Emblem */}
                    <div className="flex items-center justify-center py-1.5 z-10 bg-slate-950/40 border-y border-tactical-border/20 my-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-6 flex flex-col border border-slate-700/50 rounded-[1px] overflow-hidden flex-shrink-0 relative shadow-md">
                          <div className="h-1/3 bg-[#FF9933]"></div>
                          <div className="h-1/3 bg-[#FFFFFF] flex items-center justify-center relative">
                            {/* Ashoka Chakra with 24 Spokes SVG */}
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#000080] animate-[spin_25s_linear_infinite]">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.2" fill="none" />
                              <circle cx="12" cy="12" r="2" fill="currentColor" />
                              {Array.from({ length: 12 }).map((_, i) => (
                                <line 
                                  key={i} 
                                  x1="12" 
                                  y1="12" 
                                  x2={12 + 10 * Math.cos((i * Math.PI) / 6)} 
                                  y2={12 + 10 * Math.sin((i * Math.PI) / 6)} 
                                  stroke="currentColor" 
                                  strokeWidth="0.6" 
                                />
                              ))}
                            </svg>
                          </div>
                          <div className="h-1/3 bg-[#138808]"></div>
                        </div>
                        <div className="leading-none text-left font-mono">
                          <span className="text-[7.5px] font-black text-white tracking-widest block uppercase">NATIONAL SURVEILLANCE DIRECTIVE</span>
                          <span className="text-[5.5px] font-bold text-tactical-gray tracking-wider block mt-0.5 uppercase">GOVERNMENT OF INDIA • MIN. OF DEFENCE</span>
                        </div>
                      </div>
                    </div>

                    {/* Warning notice & signature stamp */}
                    <div className="pt-3 z-10 text-left flex flex-col justify-between gap-1 text-[5.5px]">
                      <p className="text-slate-400 uppercase tracking-wider leading-normal text-[5px]">
                        WARNING: CLASSIFIED OPERATIONAL SECURITY ASSET. UNAUTHORIZED POSSESSION, DUPLICATION, OR LOGISTICS EXPORT IS A CRITICAL VIOLATION OF TACTICAL MATRIX INTEL DIRECTIVES.
                      </p>
                      <div className="flex justify-between items-center mt-1 text-[6.5px]">
                        <div>
                          <span className="text-slate-400 uppercase font-extrabold">ISSUING AUTHORITY: </span>
                          <span className="text-white font-extrabold uppercase tracking-wide">{viewIdOfficer.issuingAuthority || 'SECURED SYSTEM COMMAND'}</span>
                        </div>
                        {/* Clean Command Auth Stamp block */}
                        <div className="text-right pr-2">
                          <span className="font-mono text-cyan-400 text-[8.5px] leading-none block font-black uppercase tracking-wider">COMMAND.AUTH.2209</span>
                          <span className="text-[4.5px] text-slate-400 uppercase tracking-widest font-extrabold mt-0.5 block">SECURE TELEMETRY SEAL</span>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <span className="text-[6px] text-cyan-400 font-black border border-cyan-500/40 px-1.5 py-0.5 rounded uppercase bg-cyan-950/20 tracking-wider filter drop-shadow(0 0 1px rgba(6,182,212,0.3))">
                            SYSTEM AUDITED SEAL
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Fullscreen ID Card Modal (Officers) */}
      {fullscreenIdCard && viewIdOfficer && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setFullscreenIdCard(false)}
        >
          <div 
            className="w-full max-w-5xl rounded-3xl p-6 bg-[#030712]/80 border border-cyan-500/20 shadow-[0_0_50px_rgba(6,182,212,0.15)] relative space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-cyan-500/20 pb-4">
              <div className="flex items-center space-x-3">
                <Shield className="w-6 h-6 text-cyan-400 filter drop-shadow(0 0 4px rgba(6,182,212,0.5))" />
                <div>
                  <h3 className="text-sm md:text-base font-extrabold font-mono tracking-widest text-white uppercase">
                    DIAGNOSTIC ARCHIVE: OPERATIVE IDENTITY INSPECTION
                  </h3>
                  <p className="text-[9px] text-cyan-400/80 font-mono uppercase tracking-wider mt-0.5">
                    VERIFIED SECURE INTERFACE PROTOCOL • CLEARANCE LEVEL ALPHA
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFullscreenIdCard(false)}
                className="px-4 py-2 border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 hover:bg-cyan-500/10 rounded-xl transition-all font-mono text-xs font-black cursor-pointer shadow-[0_0_8px_rgba(6,182,212,0.1)]"
              >
                CLOSE INSPECTION
              </button>
            </div>

            {/* Enlarged Dual-Sided Cards View */}
            <div className="flex flex-col lg:flex-row gap-8 justify-center items-center py-6">
              {/* FRONT SIDE */}
              <div className="w-[440px] h-[272px] bg-gradient-to-br from-[#0b0f19] via-[#05070c] to-[#010203] border-2 border-cyan-500/50 rounded-2xl p-5 flex flex-col justify-between relative shadow-[0_0_30px_rgba(6,182,212,0.2)] overflow-hidden font-mono text-white select-none transition-all">
                {/* Sleek Top Neon Highlight Bar */}
                <div className="absolute top-0 left-0 w-full h-[5px] bg-gradient-to-r from-[#FF9933] via-[#FFFFFF] to-[#138808] z-20 shadow-md"></div>

                {/* Cyber Diagonal Watermark Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.015)_1px,transparent_1px)] bg-[size:8px_8px] pointer-events-none z-0"></div>
                
                {/* circular circuit SVG watermark */}
                <svg viewBox="0 0 100 100" className="absolute top-1/2 left-[60%] -translate-x-1/2 -translate-y-1/2 w-48 h-48 opacity-[0.09] pointer-events-none select-none z-0 text-cyan-400 filter drop-shadow(0 0 4px rgba(6,182,212,0.5))">
                  <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="1" fill="none" strokeDasharray="4 4" />
                  <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="0.75" fill="none" />
                  <circle cx="50" cy="50" r="12" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  <path d="M 50 10 L 50 90 M 10 50 L 90 50" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
                  <path d="M 25 25 L 35 35 L 35 65 L 25 75 M 75 25 L 65 35 L 65 65 L 75 75" stroke="currentColor" strokeWidth="0.75" fill="none" />
                  <circle cx="50" cy="22" r="2" fill="currentColor" />
                  <circle cx="50" cy="78" r="2" fill="currentColor" />
                  <circle cx="22" cy="50" r="2" fill="currentColor" />
                  <circle cx="78" cy="50" r="2" fill="currentColor" />
                </svg>

                {/* Card Header */}
                <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2.5 z-10 mt-1">
                  <div className="flex items-center space-x-2.5">
                    <Shield className="w-6 h-6 text-cyan-400 filter drop-shadow(0 0 3px rgba(6,182,212,0.6))" />
                    <div className="text-left leading-none">
                      <h4 className="text-[10px] font-black tracking-widest leading-none text-white font-mono uppercase">SECURE MATRIX TACTICAL COMMAND</h4>
                      <p className="text-[6.5px] text-cyan-400 font-extrabold uppercase tracking-widest leading-none mt-1">OPERATIONAL SECURED ACCESS PASS • CLASS-4 LEVEL ALPHA</p>
                    </div>
                  </div>
                  <span className={`text-[6.5px] border font-black px-2 py-0.5 rounded tracking-widest uppercase font-mono shadow-sm
                    ${(viewIdOfficer.status || '').toUpperCase() === 'SUSPENDED' 
                      ? 'bg-red-950/40 border-red-500/50 text-red-400 animate-pulse' 
                      : 'bg-cyan-950/40 border-cyan-500/50 text-cyan-400'
                    }`}
                  >
                    {(viewIdOfficer.status || 'Active').toUpperCase()}
                  </span>
                </div>

                {/* Card Middle Content */}
                <div className="flex items-stretch gap-8 py-3 z-10 flex-1">
                  {/* Profile Pic with cyber frames */}
                  <div className="relative w-24 h-28 flex-shrink-0 border-2 border-cyan-500/40 bg-slate-950 p-0.5 rounded-xl shadow-2xl overflow-hidden flex items-center justify-center">
                    <img 
                      src={resolveMediaUrl(viewIdOfficer.profileImage)} 
                      alt={viewIdOfficer.fullName} 
                      className="w-full h-full object-cover rounded-lg cursor-pointer hover:scale-105 transition-all"
                      onClick={() => window.open(viewIdOfficer.profileImage && (viewIdOfficer.profileImage.startsWith('http://') || viewIdOfficer.profileImage.startsWith('https://')) ? viewIdOfficer.profileImage : resolveMediaUrl(viewIdOfficer.profileImage), '_blank')}
                      title="Click to view full photo in new tab"
                    />
                    {/* Photo Scanning Sweep Bar */}
                    <div className="absolute inset-x-0.5 top-0.5 h-[2px] bg-cyan-400 shadow-[0_0_10px_#06b6d4] animate-[bounce_3s_infinite] opacity-80"></div>
                    <div className="absolute bottom-0.5 inset-x-0.5 bg-slate-950/85 text-[5.5px] text-center text-cyan-400 font-black py-0.5 tracking-wider uppercase border border-cyan-500/15 rounded">
                      BIOMETRIC.OK
                    </div>
                  </div>

                  {/* Main Identity Information */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 text-left leading-none">
                    <div>
                      <p className="text-[6.5px] text-slate-400 uppercase tracking-widest font-extrabold">OPERATIVE ID NUMBER</p>
                      <p className="text-[13px] font-black tracking-widest text-cyan-400 uppercase font-mono mt-0.5 filter drop-shadow(0 0 2px rgba(6,182,212,0.4))">{viewIdOfficer.officerId}</p>
                    </div>

                    <div>
                      <p className="text-[6.5px] text-slate-400 uppercase tracking-widest font-extrabold">NAME</p>
                      <div className="text-[12px] font-black text-white uppercase font-sans mt-0.5 tracking-wide leading-tight whitespace-normal break-words max-w-[270px]">
                        {viewIdOfficer.fullName}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-tactical-border/20 pt-1.5">
                      <div>
                        <p className="text-[6.5px] text-slate-400 uppercase tracking-widest font-bold font-mono">OFFICIAL RANK</p>
                        <p className="text-[10px] font-bold text-white uppercase truncate mt-0.5 font-mono">{viewIdOfficer.rank}</p>
                      </div>
                      <div>
                        <p className="text-[6.5px] text-slate-400 uppercase tracking-widest font-bold font-mono">SYSTEM ACCESS</p>
                        <p className="text-[10px] font-black text-cyan-400 uppercase truncate mt-0.5 font-mono">{viewIdOfficer.clearanceLevel}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="flex items-center justify-between border-t border-cyan-500/30 pt-2.5 z-10 text-[6.5px]">
                  <div className="leading-tight text-left">
                    <p className="text-[5.8px] text-slate-400 uppercase tracking-wider font-extrabold">ASSIGNED DIVISION</p>
                    <p className="text-white font-extrabold uppercase truncate max-w-[220px] mt-0.5 tracking-wider">{viewIdOfficer.branchUnit || 'CYBER WARFARE DIVISION'}</p>
                  </div>
                  {/* Clean Digital Hash Security Block */}
                  <div className="text-left min-w-[80px] border-l border-tactical-border/30 pl-2.5">
                    <p className="text-[4.8px] text-slate-400 uppercase font-extrabold tracking-widest">SECURITY HASH</p>
                    <p className="text-[6px] font-mono text-cyan-400 mt-0.5 leading-none tracking-widest uppercase">
                      {`SHA256::${viewIdOfficer.fullName.substring(0, 3).toUpperCase()}${viewIdOfficer.officerId}`}
                    </p>
                  </div>
                  {/* CSS Styled Cyber Barcode */}
                  <div className="flex items-end space-x-[2px] h-6 opacity-80 flex-shrink-0 bg-slate-950/60 p-0.5 rounded border border-cyan-500/20">
                    <div className="w-[2px] h-full bg-cyan-400"></div>
                    <div className="w-[3px] h-[90%] bg-cyan-400"></div>
                    <div className="w-[1px] h-full bg-cyan-400"></div>
                    <div className="w-[2px] h-[75%] bg-cyan-400"></div>
                    <div className="w-[1.5px] h-full bg-cyan-400"></div>
                    <div className="w-[3px] h-[80%] bg-cyan-400"></div>
                    <div className="w-[1px] h-full bg-cyan-400"></div>
                    <div className="w-[2.5px] h-full bg-cyan-400"></div>
                  </div>
                </div>
              </div>

              {/* BACK SIDE */}
              <div className="w-[440px] h-[272px] bg-gradient-to-br from-[#0b0f19] via-[#05070c] to-[#010203] border-2 border-cyan-500/50 rounded-2xl p-5 flex flex-col justify-between relative shadow-[0_0_30px_rgba(6,182,212,0.2)] overflow-hidden font-mono text-white select-none transition-all">
                {/* Sleek Top Neon Highlight Bar */}
                <div className="absolute top-0 left-0 w-full h-[5px] bg-gradient-to-r from-[#FF9933] via-[#FFFFFF] to-[#138808] z-20 shadow-md"></div>

                {/* REALISTIC BLACK MAGNETIC STRIPE */}
                <div className="absolute top-[5px] left-0 w-full h-[32px] bg-[#0c0c0c] border-y border-black shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] z-10"></div>

                {/* Cyber Diagonal Watermark Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.015)_1px,transparent_1px)] bg-[size:8px_8px] pointer-events-none z-0"></div>

                {/* circular circuit SVG watermark */}
                <svg viewBox="0 0 100 100" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 opacity-[0.06] pointer-events-none select-none z-0 text-cyan-400">
                  <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="1" fill="none" strokeDasharray="4 4" />
                  <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="0.75" fill="none" />
                  <circle cx="50" cy="50" r="12" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  <path d="M 50 10 L 50 90 M 10 50 L 90 50" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
                  <path d="M 25 25 L 35 35 L 35 65 L 25 75 M 75 25 L 65 35 L 65 65 L 75 75" stroke="currentColor" strokeWidth="0.75" fill="none" />
                </svg>

                {/* Header (shifted down below magnetic stripe) */}
                <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2.5 z-10 mt-[40px]">
                  <div className="leading-tight text-left">
                    <h4 className="text-[10px] font-black tracking-widest text-white font-mono uppercase">BIOMETRIC MATRIX RECORD</h4>
                    <p className="text-[6px] text-cyan-400 font-extrabold uppercase tracking-widest leading-none mt-1">SECURED QUANTUM SYSTEM DIRECTIVE</p>
                  </div>
                  <div className="flex flex-col items-end text-right">
                    <span className="text-[6px] text-slate-400 uppercase tracking-widest font-extrabold font-mono">BLOOD GROUP</span>
                    <span className="text-[12px] font-black text-red-400 leading-none mt-1 filter drop-shadow(0 0 2px rgba(239,68,68,0.4))">{viewIdOfficer.bloodGroup || 'O+'}</span>
                  </div>
                </div>

                {/* Middle grid list of read-only metrics */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 py-3 text-[10px] leading-tight text-left z-10 flex-1 border-b border-cyan-500/20">
                  <div>
                    <p className="text-[6.5px] text-slate-400 uppercase tracking-wider font-extrabold">DATE OF BIRTH</p>
                    <p className="text-white font-bold text-[9px] mt-0.5">{viewIdOfficer.dob || '1988-06-15'}</p>
                  </div>
                  <div>
                    <p className="text-[6.5px] text-slate-400 uppercase tracking-wider font-extrabold">DATE OF ENLISTMENT</p>
                    <p className="text-white font-bold text-[9px] mt-0.5">{viewIdOfficer.enlistmentDate || '2010-08-20'}</p>
                  </div>
                  <div>
                    <p className="text-[6.5px] text-slate-400 uppercase tracking-wider font-extrabold">CREDENTIAL ISSUE DATE</p>
                    <p className="text-white font-bold text-[9px] mt-0.5">{viewIdOfficer.cardIssueDate || '2025-01-01'}</p>
                  </div>
                  <div>
                    <p className="text-[6.5px] text-slate-400 uppercase tracking-wider font-extrabold">EXPIRATION TERMINUS</p>
                    <p className="text-white font-bold text-[9px] mt-0.5">{viewIdOfficer.cardExpirationDate || '2035-01-01'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[6.5px] text-slate-400 uppercase tracking-wider font-extrabold">IDENTIFICATION MARKINGS</p>
                    <div className="text-white font-bold text-[8.5px] uppercase mt-0.5 leading-normal whitespace-normal break-words">
                      {viewIdOfficer.identificationMarks || 'NONE DECLARED.'}
                    </div>
                  </div>
                </div>

                {/* National Tricolor Flag & Ashoka Chakra Emblem */}
                <div className="flex items-center justify-center py-1.5 z-10 bg-slate-950/40 border-y border-tactical-border/20 my-1">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-6 flex flex-col border border-slate-700/50 rounded-[1px] overflow-hidden flex-shrink-0 relative shadow-md">
                      <div className="h-1/3 bg-[#FF9933]"></div>
                      <div className="h-1/3 bg-[#FFFFFF] flex items-center justify-center relative">
                        {/* Ashoka Chakra with 24 Spokes SVG */}
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#000080] animate-[spin_25s_linear_infinite]">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.2" fill="none" />
                          <circle cx="12" cy="12" r="2" fill="currentColor" />
                          {Array.from({ length: 12 }).map((_, i) => (
                            <line 
                              key={i} 
                              x1="12" 
                              y1="12" 
                              x2={12 + 10 * Math.cos((i * Math.PI) / 6)} 
                              y2={12 + 10 * Math.sin((i * Math.PI) / 6)} 
                              stroke="currentColor" 
                              strokeWidth="0.6" 
                            />
                          ))}
                        </svg>
                      </div>
                      <div className="h-1/3 bg-[#138808]"></div>
                    </div>
                    <div className="leading-none text-left font-mono">
                      <span className="text-[7.5px] font-black text-white tracking-widest block uppercase">NATIONAL SURVEILLANCE DIRECTIVE</span>
                      <span className="text-[5.5px] font-bold text-tactical-gray tracking-wider block mt-0.5 uppercase">GOVERNMENT OF INDIA • MIN. OF DEFENCE</span>
                    </div>
                  </div>
                </div>

                {/* Warning notice & signature stamp */}
                <div className="pt-3 z-10 text-left flex flex-col justify-between gap-1 text-[5.5px]">
                  <p className="text-slate-400 uppercase tracking-wider leading-normal text-[5px]">
                    WARNING: CLASSIFIED OPERATIONAL SECURITY ASSET. UNAUTHORIZED POSSESSION, DUPLICATION, OR LOGISTICS EXPORT IS A CRITICAL VIOLATION OF TACTICAL MATRIX INTEL DIRECTIVES.
                  </p>
                  <div className="flex justify-between items-center mt-1 text-[6.5px]">
                    <div>
                      <span className="text-slate-400 uppercase font-extrabold">ISSUING AUTHORITY: </span>
                      <span className="text-white font-extrabold uppercase tracking-wide">{viewIdOfficer.issuingAuthority || 'SECURED SYSTEM COMMAND'}</span>
                    </div>
                    {/* Clean Command Auth Stamp block instead of signatures */}
                    <div className="text-right pr-2">
                      <span className="font-mono text-cyan-400 text-[8px] leading-none block font-black uppercase tracking-wider">COMMAND.AUTH.2209</span>
                      <span className="text-[4.5px] text-slate-400 uppercase tracking-widest font-extrabold mt-0.5 block">SECURE TELEMETRY SEAL</span>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="text-[6px] text-cyan-400 font-black border border-cyan-500/40 px-1.5 py-0.5 rounded uppercase bg-cyan-950/20 tracking-wider filter drop-shadow(0 0 1px rgba(6,182,212,0.3))">
                        SYSTEM AUDITED SEAL
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Alert / Notice inside Fullscreen Inspect modal */}
            <div className="text-center text-[9px] font-mono text-cyan-400/50 uppercase select-none tracking-widest">
              CLICK ANYWHERE OUTSIDE OR PRESS CLOSE TO EXIT SECURE TELEMETRY SCREEN
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Officers;
