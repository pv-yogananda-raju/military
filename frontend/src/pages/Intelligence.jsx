import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { resolveMediaUrl } from '../config';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { 
  FileText, 
  Search, 
  Plus, 
  Trash2, 
  Edit2, 
  AlertTriangle, 
  MapPin, 
  UserX, 
  Calendar, 
  FileCheck,
  Eye,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Paperclip,
  Trash,
  Download,
  Loader2
} from 'lucide-react';

const Intelligence = ({ onTriggerToast, refreshData }) => {
  const { user, authFetch } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search, Pagination & Sort parameters
  const [search, setSearch] = useState('');
  const [threatLevel, setThreatLevel] = useState('');
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
  const [selectedReport, setSelectedReport] = useState(null);

  // Attachment states
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    threatLevel: 'Low',
    location: '',
    suspectDetails: '',
    notes: '',
    status: 'Submitted',
  });

  const isAdmin = user?.role === 'Admin Commander';
  const isIntel = user?.role === 'Admin Commander' || user?.role === 'Intelligence Officer' || user?.role === 'Surveillance Analyst';

  const fetchReports = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        search,
        threatLevel,
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder
      });

      const res = await authFetch(`/reports?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setReports(data.reports);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.count || 0);
      }
    } catch (error) {
      console.error('[Fetch Intel Error]', error);
      onTriggerToast('Failed to retrieve intelligence archives.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [search, threatLevel, page, sortBy, sortOrder]);

  const handleSort = (field) => {
    setPage(1);
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadingFile(true);
      const fd = new FormData();
      fd.append('file', file);

      const res = await authFetch('/upload', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        setAttachedFiles(prev => [...prev, {
          fileName: data.file.fileName,
          fileType: data.file.fileType,
          fileSize: data.file.fileSize,
          fileUrl: data.file.fileUrl,
        }]);
        onTriggerToast(`Classified packet "${file.name}" attached successfully!`, 'success');
      } else {
        onTriggerToast(data.message, 'error');
      }
    } catch (err) {
      console.error('[Intel File Upload Error]', err);
      onTriggerToast('Failed to attach secure file.', 'error');
    } finally {
      setUploadingFile(false);
    }
  };

  // Submit new report
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch('/reports', {
        method: 'POST',
        body: JSON.stringify({ ...formData, attachments: attachedFiles }),
      });
      const data = await res.json();
      if (data.success) {
        onTriggerToast(`Intel Report [${data.report.reportId}] successfully published to MongoDB!`, 'success');
        setShowAddModal(false);
        resetForm();
        fetchReports();
        if (refreshData) refreshData(); // updates dashboard metrics
      } else {
        onTriggerToast(data.message, 'error');
      }
    } catch (error) {
      console.error('[Create Report Error]', error);
      onTriggerToast('Failed to compile report.', 'error');
    }
  };

  // Submit edit report
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReport) return;
    try {
      const res = await authFetch(`/reports/${selectedReport.reportId}`, {
        method: 'PUT',
        body: JSON.stringify({ ...formData, attachments: attachedFiles }),
      });
      const data = await res.json();
      if (data.success) {
        onTriggerToast(`Intel Report ${selectedReport.reportId} updated directly in database!`, 'success');
        setShowEditModal(false);
        setSelectedReport(null);
        resetForm();
        fetchReports();
        if (refreshData) refreshData();
      } else {
        onTriggerToast(data.message, 'error');
      }
    } catch (error) {
      console.error('[Edit Report Error]', error);
      onTriggerToast('Failed to update report changes.', 'error');
    }
  };

  // Expunge report
  const handleDeleteReport = async (reportId) => {
    if (!window.confirm(`CONFIRM EXPUNGEMENT: Permanently delete Intelligence Report [${reportId}] from active database?`)) return;
    try {
      const res = await authFetch(`/reports/${reportId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        onTriggerToast(`Report ${reportId} permanently removed.`, 'warning');
        fetchReports();
        if (refreshData) refreshData();
      } else {
        onTriggerToast(data.message, 'error');
      }
    } catch (error) {
      console.error('[Delete Report Error]', error);
      onTriggerToast('Failed to delete report.', 'error');
    }
  };

  const openDetailModal = (report) => {
    setSelectedReport(report);
    setShowDetailModal(true);
  };

  const openEditModal = (report) => {
    setSelectedReport(report);
    setFormData({
      title: report.title,
      description: report.description,
      threatLevel: report.threatLevel,
      location: report.location,
      suspectDetails: report.suspectDetails,
      notes: report.notes,
      status: report.status,
    });
    setAttachedFiles(report.attachments || []);
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      threatLevel: 'Low',
      location: '',
      suspectDetails: '',
      notes: '',
      status: 'Submitted',
    });
    setAttachedFiles([]);
  };

  return (
    <div className="space-y-6">
      {/* 1. Filtering & Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-tactical-panel border border-tactical-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search title, region, suspects..."
              className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 pl-10 pr-4 text-xs font-mono text-white placeholder-tactical-gray/50"
            />
            <Search className="absolute left-3.5 top-2.5 w-4.5 h-4.5 text-tactical-gray" />
          </div>

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
        </div>

        {user && (
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-tactical-green hover:bg-opacity-95 text-white font-mono text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer shadow-glowGreen transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>COMPILE NEW REPORT</span>
          </button>
        )}
      </div>

      {/* 2. Intelligence reports list table */}
      {loading ? (
        <TableSkeleton rows={limit} />
      ) : reports.length > 0 ? (
        <div className="bg-tactical-panel border border-tactical-border rounded-xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-mono">
              <thead>
                <tr className="bg-slate-950/40 border-b border-tactical-border text-tactical-gray font-bold uppercase tracking-wider select-none">
                  <th 
                    onClick={() => handleSort('reportId')}
                    className="px-6 py-3.5 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Report ID</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('title')}
                    className="px-6 py-3.5 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Subject / Objective</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('threatLevel')}
                    className="px-6 py-3.5 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Threat Classification</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('location')}
                    className="px-6 py-3.5 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Sector Location</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('suspectDetails')}
                    className="px-6 py-3.5 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Suspect Details</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('createdAt')}
                    className="px-6 py-3.5 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Date Compiled</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tactical-border/40 text-tactical-text">
                {reports.map((report) => (
                  <tr key={report.reportId} className="hover:bg-tactical-border/10 transition-all">
                    <td className="px-6 py-4 font-bold text-white tracking-widest uppercase">{report.reportId}</td>
                    <td className="px-6 py-4 max-w-xs overflow-hidden">
                      <div className="space-y-0.5 max-w-xs truncate">
                        <div className="flex items-center space-x-1.5 min-w-0">
                          <p className="font-bold text-white leading-normal truncate" title={report.title}>{report.title}</p>
                          {report.attachments && report.attachments.length > 0 && (
                            <span className="flex items-center text-tactical-green text-[9px] font-bold bg-tactical-green/10 border border-tactical-green/30 px-1.5 py-0.2 rounded flex-shrink-0" title={`${report.attachments.length} classified attachment(s)`}>
                              <Paperclip className="w-3 h-3 text-tactical-green mr-0.5" />
                              <span>{report.attachments.length}</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-tactical-gray truncate" title={report.description}>{report.description}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-bold uppercase border
                        ${report.threatLevel === 'Low' ? 'bg-[#0f1b15] border-[#00C853]/40 text-[#00C853]' : ''}
                        ${report.threatLevel === 'Moderate' ? 'bg-[#152331] border-[#1f6feb]/40 text-[#58a6ff]' : ''}
                        ${report.threatLevel === 'High' ? 'bg-[#241c0f] border-amber-500/40 text-amber-400' : ''}
                        ${report.threatLevel === 'Critical' ? 'bg-[#201212] border-[#FF3D3D]/40 text-[#FF3D3D] animate-pulse-tactical' : ''}
                      `}>
                        {report.threatLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1.5 text-tactical-gray text-[10px]">
                        <MapPin className="w-3.5 h-3.5 text-tactical-green flex-shrink-0" />
                        <span className="text-white truncate max-w-[120px]" title={report.location}>{report.location}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1.5 text-tactical-gray text-[10px]">
                        <UserX className="w-3.5 h-3.5 text-tactical-red flex-shrink-0" />
                        <span className="text-white truncate max-w-[120px] font-bold" title={report.suspectDetails}>{report.suspectDetails}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-tactical-gray text-[10px]">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[8px] bg-slate-900 border border-tactical-border text-tactical-gray px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {/* View Action */}
                        <button
                          onClick={() => openDetailModal(report)}
                          className="p-1.5 rounded bg-tactical-border border border-tactical-border hover:bg-tactical-green/10 hover:border-tactical-green hover:text-tactical-green text-tactical-text transition-all cursor-pointer"
                          title="View Archive"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Action */}
                        {isAdmin && (
                          <button
                            onClick={() => openEditModal(report)}
                            className="p-1.5 rounded bg-tactical-border border border-tactical-border hover:bg-tactical-blue/10 hover:border-tactical-blue hover:text-tactical-blue text-tactical-text transition-all cursor-pointer"
                            title="Modify Archive"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete Action (Admin Commander only) */}
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteReport(report.reportId)}
                            className="p-1.5 rounded bg-tactical-border border border-tactical-border hover:bg-tactical-red/10 hover:border-tactical-red hover:text-tactical-red text-tactical-text transition-all cursor-pointer"
                            title="Expunge Archive"
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
              Showing page <span className="text-white font-bold">{page}</span> of <span className="text-white font-bold">{totalPages}</span> ({totalCount} total archives)
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
          NO CLASSIFIED REPORT ARCHIVES SEEDED AT THIS THREAT LEVEL.
        </div>
      )}

      {/* 3. Composing Intel Form Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-tactical-panel border border-tactical-border rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-tactical-green"></div>
            <div className="p-6 border-b border-tactical-border bg-slate-950/20">
              <h3 className="text-sm font-bold font-mono tracking-widest text-white uppercase">COMPILE INTEL REPORT</h3>
              <p className="text-[9px] text-tactical-gray font-mono uppercase mt-1">Authenticates and inserts report record to MongoDB</p>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto font-mono text-xs">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Report Subject Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="E.G. Border Surveillance Signal Intercept"
                    className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Recon Details Description</label>
                  <textarea
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Provide full description of rogue activities, encrypted communications, and suspicious telemetry observed..."
                    className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white leading-normal"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Threat Level</label>
                    <select
                      value={formData.threatLevel}
                      onChange={(e) => setFormData({ ...formData, threatLevel: e.target.value })}
                      className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                    >
                      <option value="Low">Low</option>
                      <option value="Moderate">Moderate</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Operational Location</label>
                    <input
                      type="text"
                      required
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="E.G. Jammu Sector Hub"
                      className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Suspect Parameters Details</label>
                    <input
                      type="text"
                      value={formData.suspectDetails}
                      onChange={(e) => setFormData({ ...formData, suspectDetails: e.target.value })}
                      placeholder="E.G. Unknown Rogue Operatives (Infiltrators)"
                      className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Commander Action Notes</label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Optional tactical deployment notes..."
                    className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white leading-normal"
                  />
                </div>

                {/* File Upload Section */}
                <div className="space-y-2 border-t border-tactical-border/40 pt-4">
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold">Attached Intel Files</label>
                  
                  {attachedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 pb-2 font-mono text-[9px]">
                      {attachedFiles.map((file, idx) => (
                        <div key={idx} className="bg-slate-900 border border-tactical-green/30 p-2 rounded-xl flex items-center space-x-2">
                          <div className="leading-tight">
                            <p className="font-bold text-white truncate max-w-[120px]">{file.fileName}</p>
                            <p className="text-[7px] text-tactical-gray uppercase mt-0.5">{file.fileType} • {file.fileSize}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAttachedFiles(prev => prev.filter((_, fIdx) => fIdx !== idx))}
                            className="p-1 rounded bg-tactical-border hover:bg-tactical-red/10 hover:text-tactical-red transition-all cursor-pointer"
                          >
                            <Trash className="w-3 h-3 text-tactical-redLight" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="relative flex-shrink-0 w-full">
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                    />
                    <button
                      type="button"
                      disabled={uploadingFile}
                      className={`w-full py-2.5 bg-tactical-bg border border-dashed border-tactical-border hover:border-tactical-green hover:text-tactical-greenLight rounded-xl transition-all cursor-pointer text-tactical-gray flex items-center justify-center space-x-2 text-[10px] uppercase font-bold
                        ${uploadingFile ? 'animate-pulse' : ''}`}
                    >
                      {uploadingFile ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-tactical-green" />
                          <span>ATTACHING CLASSIFIED PACKET...</span>
                        </>
                      ) : (
                        <>
                          <Paperclip className="w-4 h-4 text-tactical-green" />
                          <span>ATTACH CLASSIFIED FILE PACKET</span>
                        </>
                      )}
                    </button>
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
                  PUBLISH REPORT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Edit Intel Form Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-tactical-panel border border-tactical-border rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-tactical-green"></div>
            <div className="p-6 border-b border-tactical-border bg-slate-950/20">
              <h3 className="text-sm font-bold font-mono tracking-widest text-white uppercase">MODIFY REPORT DETAILS</h3>
              <p className="text-[9px] text-tactical-gray font-mono uppercase mt-1">Write edits directly into MongoDB</p>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto font-mono text-xs">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Report Subject Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Recon Details Description</label>
                  <textarea
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white leading-normal"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Threat Level</label>
                    <select
                      value={formData.threatLevel}
                      onChange={(e) => setFormData({ ...formData, threatLevel: e.target.value })}
                      className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                    >
                      <option value="Low">Low</option>
                      <option value="Moderate">Moderate</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Operational Location</label>
                    <input
                      type="text"
                      required
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Operational Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Submitted">Submitted</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Archived">Archived</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Suspect Parameters Details</label>
                    <input
                      type="text"
                      value={formData.suspectDetails}
                      onChange={(e) => setFormData({ ...formData, suspectDetails: e.target.value })}
                      className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Commander Action Notes</label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white leading-normal"
                  />
                </div>

                {/* File Upload Section */}
                <div className="space-y-2 border-t border-tactical-border/40 pt-4">
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold">Attached Intel Files</label>
                  
                  {attachedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 pb-2 font-mono text-[9px]">
                      {attachedFiles.map((file, idx) => (
                        <div key={idx} className="bg-slate-900 border border-tactical-green/30 p-2 rounded-xl flex items-center space-x-2">
                          <div className="leading-tight">
                            <p className="font-bold text-white truncate max-w-[120px]">{file.fileName}</p>
                            <p className="text-[7px] text-tactical-gray uppercase mt-0.5">{file.fileType} • {file.fileSize}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAttachedFiles(prev => prev.filter((_, fIdx) => fIdx !== idx))}
                            className="p-1 rounded bg-tactical-border hover:bg-tactical-red/10 hover:text-tactical-red transition-all cursor-pointer"
                          >
                            <Trash className="w-3 h-3 text-tactical-redLight" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="relative flex-shrink-0 w-full">
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                    />
                    <button
                      type="button"
                      disabled={uploadingFile}
                      className={`w-full py-2.5 bg-tactical-bg border border-dashed border-tactical-border hover:border-tactical-green hover:text-tactical-greenLight rounded-xl transition-all cursor-pointer text-tactical-gray flex items-center justify-center space-x-2 text-[10px] uppercase font-bold
                        ${uploadingFile ? 'animate-pulse' : ''}`}
                    >
                      {uploadingFile ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-tactical-green" />
                          <span>ATTACHING CLASSIFIED PACKET...</span>
                        </>
                      ) : (
                        <>
                          <Paperclip className="w-4 h-4 text-tactical-green" />
                          <span>ATTACH CLASSIFIED FILE PACKET</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-tactical-border/60">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setSelectedReport(null); }}
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

      {/* 5. View Full Intel Details Modal */}
      {showDetailModal && selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-tactical-panel border border-tactical-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-tactical-green"></div>
            
            <div className="p-6 border-b border-tactical-border bg-slate-950/20 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold font-mono tracking-widest text-white uppercase">INTELLIGENCE BRIEFING MATRIX</h3>
                <p className="text-[9px] text-tactical-gray font-mono uppercase mt-1">REPORT CODE: {selectedReport.reportId}</p>
              </div>
              <span className={`inline-flex px-2.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border
                ${selectedReport.threatLevel === 'Low' ? 'bg-[#0f1b15] border-[#00C853]/40 text-[#00C853]' : ''}
                ${selectedReport.threatLevel === 'Moderate' ? 'bg-[#152331] border-[#1f6feb]/40 text-[#58a6ff]' : ''}
                ${selectedReport.threatLevel === 'High' ? 'bg-[#241c0f] border-amber-500/40 text-amber-400' : ''}
                ${selectedReport.threatLevel === 'Critical' ? 'bg-[#201212] border-[#FF3D3D]/40 text-[#FF3D3D] animate-pulse-tactical' : ''}
              `}>
                {selectedReport.threatLevel} Priority
              </span>
            </div>

            <div className="p-6 space-y-5 font-mono text-xs max-h-[70vh] overflow-y-auto">
              <div className="space-y-1">
                <h4 className="text-xs text-tactical-gray uppercase font-bold">Subject Heading</h4>
                <p className="text-sm font-bold text-white leading-normal">{selectedReport.title}</p>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs text-tactical-gray uppercase font-bold">Classification Details</h4>
                <div className="bg-tactical-bg border border-tactical-border/60 rounded-xl p-4 text-[11px] text-tactical-text leading-relaxed whitespace-pre-line">
                  {selectedReport.description}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-tactical-bg p-3 rounded-xl border border-tactical-border/40 space-y-1">
                  <span className="text-[9px] text-tactical-gray uppercase font-bold">Operational Location</span>
                  <div className="flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-tactical-greenLight" />
                    <span className="text-white font-bold">{selectedReport.location}</span>
                  </div>
                </div>
                <div className="bg-tactical-bg p-3 rounded-xl border border-tactical-border/40 space-y-1">
                  <span className="text-[9px] text-tactical-gray uppercase font-bold">Primary Suspect Parameters</span>
                  <div className="flex items-center space-x-1.5">
                    <UserX className="w-3.5 h-3.5 text-tactical-redLight" />
                    <span className="text-white font-bold">{selectedReport.suspectDetails}</span>
                  </div>
                </div>
              </div>

              {selectedReport.notes && (
                <div className="space-y-1">
                  <h4 className="text-xs text-tactical-gray uppercase font-bold">Commander Strategic Notes</h4>
                  <p className="text-[11px] text-tactical-text bg-tactical-bg/50 border border-tactical-border/40 p-3 rounded-xl leading-relaxed">
                    {selectedReport.notes}
                  </p>
                </div>
              )}

              {selectedReport.attachments && selectedReport.attachments.length > 0 && (
                <div className="space-y-2 text-left">
                  <h4 className="text-xs text-tactical-gray uppercase font-bold">Attached Intel Files</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedReport.attachments.map((file, fIdx) => {
                      const fileTypeUpper = (file.fileType || '').toUpperCase();
                      const isImg = fileTypeUpper === 'IMAGE' || /\.(jpg|jpeg|png|webp|gif)\b/i.test(file.fileUrl || file.fileName || '');
                      const isAud = fileTypeUpper === 'AUDIO' || /\.(mp3|wav|ogg|aac|m4a)\b/i.test(file.fileUrl || file.fileName || '');
                      return (
                        <div key={fIdx} className="bg-tactical-bg border border-tactical-border p-3 rounded-xl flex flex-col gap-2 overflow-hidden">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1 leading-tight text-[10px]">
                              <p className="font-bold text-white truncate">{file.fileName}</p>
                              <p className="text-[8px] text-tactical-gray uppercase mt-0.5">{file.fileType} • {file.fileSize}</p>
                            </div>
                            <a 
                              href={resolveMediaUrl(file.fileUrl)} 
                              target="_blank" 
                              rel="noreferrer"
                              className="p-1.5 rounded bg-tactical-border hover:bg-tactical-green/15 hover:text-tactical-greenLight transition-all cursor-pointer flex-shrink-0"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                          
                          {isImg && (
                            <img src={resolveMediaUrl(file.fileUrl)} alt={file.fileName} className="w-full max-h-24 rounded object-cover border border-tactical-border/40 mt-1 cursor-pointer" onClick={() => window.open(resolveMediaUrl(file.fileUrl), '_blank')} />
                          )}
                          {isAud && (
                            <audio src={resolveMediaUrl(file.fileUrl)} controls className="w-full max-h-8 rounded mt-1 outline-none" />
                          )}

                          <div className="mt-1.5 bg-slate-950/40 p-1.5 rounded border border-tactical-border/40 flex items-center space-x-1.5">
                            <input 
                              type="text" 
                              readOnly 
                              value={file.fileUrl} 
                              className="flex-1 bg-slate-900 border-0 text-white font-mono text-[8px] px-2 py-1 rounded select-all focus:outline-none"
                            />
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(file.fileUrl);
                                onTriggerToast('Attachment URL copied to secure clipboard', 'success');
                              }}
                              className="px-2 py-1 bg-tactical-border/60 hover:bg-tactical-green/10 hover:text-tactical-greenLight text-white font-mono text-[8px] rounded transition-all cursor-pointer font-bold"
                            >
                              COPY
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-[9px] text-tactical-gray pt-2 border-t border-tactical-border/40">
                <span>COMPILED BY OFFICER ID: {selectedReport.assignedOfficer}</span>
                <span>SECURE DATE: {new Date(selectedReport.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div className="p-6 border-t border-tactical-border bg-slate-950/20 flex justify-end">
              <button
                onClick={() => { setShowDetailModal(false); setSelectedReport(null); }}
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

export default Intelligence;

