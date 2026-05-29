import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE } from '../context/AuthContext';
import { resolveMediaUrl, isGoogleDriveUrl, getGoogleDriveEmbedUrl } from '../config';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { 
  Lock, 
  Search, 
  Plus, 
  Trash2, 
  FileText, 
  Image as ImageIcon, 
  Volume2, 
  Loader2, 
  Download,
  Link,
  ShieldCheck,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  X,
  Play,
  FileCheck,
  Send
} from 'lucide-react';

const EvidenceVault = ({ onTriggerToast, refreshData }) => {
  const { user, authFetch, token } = useAuth();
  const [evidence, setEvidence] = useState([]);
  const [missions, setMissions] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Pagination states
  const [search, setSearch] = useState('');
  const [fileType, setFileType] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(6);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareItem, setShareItem] = useState(null);
  const [activeOfficers, setActiveOfficers] = useState([]);

  // Custom Drag & Drop & Upload progress states
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  // Native XMLHttpRequest Promise wrapper to track actual uploading percentages
  const uploadFileNative = (file, userToken, onProgress) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/upload`);
      
      if (userToken) {
        xhr.setRequestHeader('Authorization', `Bearer ${userToken}`);
      }

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const resData = JSON.parse(xhr.responseText);
            resolve(resData);
          } catch (e) {
            reject(new Error('Invalid response payload from API Gateway.'));
          }
        } else {
          try {
            const resData = JSON.parse(xhr.responseText);
            reject(new Error(resData.message || 'File transmission upload rejected.'));
          } catch (e) {
            reject(new Error(`Server returned error status: ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Secure network transmission connection interrupted.'));
      });

      const fd = new FormData();
      fd.append('file', file);
      xhr.send(fd);
    });
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };
  
  // Real Upload vs URL tabs
  const [uploadSource, setUploadSource] = useState('real'); // 'real' or 'link'
  const [selectedFile, setSelectedFile] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    fileName: '',
    fileType: 'PDF',
    fileSize: '2.5 MB',
    fileUrl: '',
    linkedMission: 'None',
    linkedReport: 'None',
  });

  const isIntel = !!user; // All logged-in officers have access to upload evidence

  const fetchEvidence = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        search,
        fileType,
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder
      });

      const res = await authFetch(`/evidence?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setEvidence(data.evidence);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.count || 0);
      }
    } catch (error) {
      console.error('[Fetch Evidence Error]', error);
      onTriggerToast('Failed to retrieve evidence logs.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchLinkages = async () => {
    try {
      const mRes = await authFetch('/missions');
      const mData = await mRes.json();
      if (mData.success) setMissions(mData.missions);

      const rRes = await authFetch('/reports');
      const rData = await rRes.json();
      if (rData.success) setReports(rData.reports);
    } catch (error) {
      console.error('[Fetch Linkages Error]', error);
    }
  };

  const fetchActiveOfficersForSharing = async () => {
    try {
      const res = await authFetch('/officers?limit=100');
      const data = await res.json();
      if (data.success) {
        const filtered = data.officers.filter(
          o => o.officerId !== user?.officerId && (o.status === 'Active' || o.status === 'In Field')
        );
        setActiveOfficers(filtered);
      }
    } catch (err) {
      console.error('[Fetch sharing targets error]', err);
    }
  };

  const handleShareEvidence = async (targetId, channelName) => {
    if (!shareItem) return;
    try {
      const shareMsg = `[CLASSIFIED EVIDENCE RECORD SHARED]\n\nFile Name: ${shareItem.fileName}\nFormat: ${shareItem.fileType}\nSize: ${shareItem.fileSize}\nHash: ${shareItem.hash || 'SHA-256 Checksum Pending'}`;
      
      const attachment = {
        fileName: shareItem.fileName,
        fileType: shareItem.fileType.toUpperCase() === 'AUDIO' ? 'AUDIO' : (shareItem.fileType.toUpperCase() === 'IMAGE' ? 'IMAGE' : 'DOCUMENT'),
        fileSize: shareItem.fileSize,
        fileUrl: shareItem.fileUrl,
      };

      const res = await authFetch('/chat/messages', {
        method: 'POST',
        body: JSON.stringify({
          recipient: targetId,
          content: shareMsg,
          attachments: [attachment]
        })
      });
      const data = await res.json();
      if (data.success) {
        onTriggerToast(`Evidence shared successfully in ${channelName}!`, 'success');
        setShowShareModal(false);
        setShareItem(null);
      } else {
        onTriggerToast(data.message, 'error');
      }
    } catch (err) {
      console.error('[Share Evidence Error]', err);
      onTriggerToast('Failed to dispatch shared evidence.', 'error');
    }
  };

  useEffect(() => {
    setPage(1);
  }, [search, fileType, sortBy, sortOrder]);

  useEffect(() => {
    fetchEvidence();
  }, [search, fileType, page, sortBy, sortOrder]);

  useEffect(() => {
    fetchLinkages();
    fetchActiveOfficersForSharing();
  }, []);

  // Poll in background for items still processing
  useEffect(() => {
    const processingExists = evidence.some(e => e.status === 'Processing');
    if (processingExists) {
      const interval = setInterval(async () => {
        const queryParams = new URLSearchParams({
          search,
          fileType,
          page: page.toString(),
          limit: limit.toString(),
          sortBy,
          sortOrder
        });
        const res = await authFetch(`/evidence?${queryParams.toString()}`);
        const data = await res.json();
        if (data.success) {
          setEvidence(data.evidence);
          const stillProcessing = data.evidence.some(e => e.status === 'Processing');
          if (!stillProcessing) {
            refreshData();
            onTriggerToast('Background cryptographic thread successfully computed SHA-256 signatures!', 'success');
          }
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [evidence, search, fileType, page, limit, sortBy, sortOrder]);

  const handleFileSelection = (file) => {
    if (!file) return;

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.docx', '.doc', '.mp3', '.wav', '.mp4'];
    
    if (!allowedExts.includes(ext)) {
      onTriggerToast(`Security Alert: File format ${ext.toUpperCase()} is not authorized.`, 'error');
      return;
    }

    const isImage = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
    const sizeMB = file.size / (1024 * 1024);

    if (isImage && sizeMB > 5) {
      onTriggerToast(`Security Alert: Photo files are strictly capped at 5 MB. Selected: ${sizeMB.toFixed(2)} MB.`, 'error');
      return;
    }
    
    if (sizeMB > 25) {
      onTriggerToast(`Security Alert: Evidence archives are capped at 25 MB. Selected: ${sizeMB.toFixed(2)} MB.`, 'error');
      return;
    }

    setSelectedFile(file);
    let detectedType = 'PDF';
    if (isImage) {
      detectedType = 'Image';
    } else if (['.mp3', '.wav'].includes(ext)) {
      detectedType = 'Audio';
    } else if (['.mp4'].includes(ext)) {
      detectedType = 'Video';
    }

    setFormData(prev => ({
      ...prev,
      fileName: file.name,
      fileType: detectedType,
      fileSize: `${sizeMB.toFixed(2)} MB`
    }));
    onTriggerToast(`Classified packet "${file.name}" loaded and verified.`, 'success');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    handleFileSelection(file);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    setUploadProgress(0);
    
    let finalUrl = '';
    let finalName = formData.fileName.trim();
    let finalSize = formData.fileSize;
    let finalType = formData.fileType;

    try {
      if (uploadSource === 'real') {
        if (!selectedFile) {
          onTriggerToast('Tactical Alert: Please select a file to upload.', 'error');
          setUploading(false);
          return;
        }

        // Native XHR progress uploader
        const uploadData = await uploadFileNative(selectedFile, token, (percent) => {
          setUploadProgress(percent);
        });

        if (!uploadData.success) {
          onTriggerToast(uploadData.message || 'File upload failed.', 'error');
          setUploading(false);
          return;
        }

        finalUrl = uploadData.file.fileUrl;
        finalName = uploadData.file.fileName;
        finalSize = uploadData.file.fileSize;
        finalType = uploadData.file.fileType;
      } else {
        finalUrl = formData.fileUrl.trim();
        if (!finalUrl) {
          onTriggerToast('Tactical Alert: Please provide a valid external Drive/URL link.', 'error');
          setUploading(false);
          return;
        }
        if (!finalName) {
          onTriggerToast('Tactical Alert: Please populate the file name.', 'error');
          setUploading(false);
          return;
        }
      }

      const res = await authFetch('/evidence', {
        method: 'POST',
        body: JSON.stringify({
          fileName: finalName,
          fileType: finalType,
          fileSize: finalSize,
          fileUrl: finalUrl,
          linkedMission: formData.linkedMission,
          linkedReport: formData.linkedReport,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onTriggerToast(`Evidence uploaded successfully. Cryptographic background pipeline active.`, 'success');
        setShowAddModal(false);
        resetForm();
        fetchEvidence();
        refreshData();
      } else {
        onTriggerToast(data.message, 'error');
      }
    } catch (error) {
      console.error('[Evidence Upload Error]', error);
      onTriggerToast(error.message || 'Evidence upload failed: connection issue.', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteEvidence = async (evidenceId, name) => {
    if (!window.confirm(`EXPUNGE PHYSICAL EVIDENCE: Permanently delete file record [${evidenceId}] "${name}"?`)) return;
    try {
      const res = await authFetch(`/evidence/${evidenceId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        onTriggerToast(`Evidence record ${evidenceId} permanently expunged.`, 'warning');
        fetchEvidence();
        refreshData();
      } else {
        onTriggerToast(data.message, 'error');
      }
    } catch (error) {
      console.error('[Delete Evidence Error]', error);
      onTriggerToast('Failed to delete evidence file.', 'error');
    }
  };

  const getFileIcon = (type) => {
    const t = (type || '').toUpperCase();
    switch (t) {
      case 'IMAGE': return ImageIcon;
      case 'AUDIO': return Volume2;
      default: return FileText;
    }
  };

  const resetForm = () => {
    setFormData({
      fileName: '',
      fileType: 'PDF',
      fileSize: '2.5 MB',
      fileUrl: '',
      linkedMission: 'None',
      linkedReport: 'None',
    });
    setSelectedFile(null);
    setUploadSource('real');
  };

  return (
    <div className="space-y-6">
      {/* 1. Header controls and filters */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch gap-4 bg-tactical-panel border border-tactical-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search file name, mission, report..."
              className="w-full bg-tactical-bg border border-tactical-border focus:border-tactical-green focus:outline-none rounded-xl py-2 pl-10 pr-4 text-xs font-mono text-white placeholder-tactical-gray/50"
            />
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-tactical-gray" />
          </div>

          <select
            value={fileType}
            onChange={(e) => setFileType(e.target.value)}
            className="bg-tactical-bg border border-tactical-border text-xs font-mono text-white rounded-xl py-2 px-3 focus:border-tactical-green focus:outline-none"
          >
            <option value="">All Formats</option>
            <option value="PDF">PDF Dossier</option>
            <option value="Image">Image Map</option>
            <option value="Audio">Audio Tape</option>
          </select>

          <button 
            onClick={fetchEvidence}
            className="bg-tactical-bg border border-tactical-border hover:bg-tactical-border/40 text-tactical-gray hover:text-white p-2 rounded-xl flex items-center justify-center cursor-pointer transition-all"
            title="Refresh logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {isIntel && (
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="flex items-center justify-center space-x-2 bg-tactical-green hover:bg-opacity-95 text-white font-mono text-xs font-bold px-4 py-2 rounded-xl cursor-pointer shadow-glowGreen transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>SECURE NEW EVIDENCE</span>
          </button>
        )}
      </div>

      {/* 2. Grid cards of Evidence */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="h-64 bg-tactical-panel border border-tactical-border rounded-xl animate-pulse p-5 space-y-4">
              <div className="h-3 w-20 bg-tactical-border rounded"></div>
              <div className="h-10 w-full bg-tactical-border/60 rounded"></div>
              <div className="h-16 w-full bg-tactical-border/30 rounded"></div>
            </div>
          ))}
        </div>
      ) : evidence.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {evidence.map((item) => {
              const Icon = getFileIcon(item.fileType);
              const isProcessing = item.status === 'Processing';
              
              return (
                <div 
                  key={item.evidenceId}
                  className={`bg-tactical-panel border rounded-2xl p-5 shadow-tactical flex flex-col justify-between hover:border-tactical-green/30 transition-all duration-300 relative overflow-hidden group
                    ${isProcessing ? 'border-tactical-blue border-l-4' : 'border-tactical-border'}`}
                >
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-tactical-border/40 mb-3">
                      <span className="text-[9px] font-mono tracking-widest text-tactical-green font-bold uppercase">
                        ID: {item.evidenceId}
                      </span>
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border
                        ${item.fileType?.toUpperCase() === 'PDF' || item.fileType?.toUpperCase() === 'DOCUMENT' ? 'bg-red-500/10 border-red-500/30 text-red-400' : ''}
                        ${item.fileType?.toUpperCase() === 'IMAGE' ? 'bg-[#0f1b15] border-tactical-green/30 text-tactical-green' : ''}
                        ${item.fileType?.toUpperCase() === 'AUDIO' ? 'bg-[#0e1726] border-tactical-border text-blue-400' : ''}
                      `}>
                        {item.fileType}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2.5 bg-slate-950/40 border border-tactical-border rounded-xl text-tactical-gray flex-shrink-0">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-black text-white font-mono truncate">{item.fileName}</h4>
                        <p className="text-[9px] text-tactical-gray font-mono">{item.fileSize}</p>
                      </div>
                    </div>

                     {/* Inline Previews */}
                     {isGoogleDriveUrl(item.fileUrl) ? (
                       <div className="mb-4 overflow-hidden rounded-xl border border-tactical-border/60 bg-slate-950/30 relative w-full h-28">
                         <iframe 
                           src={getGoogleDriveEmbedUrl(item.fileUrl)} 
                           className="w-full h-full border-0" 
                           title={item.fileName} 
                         />
                       </div>
                     ) : (
                       <>
                         {(item.fileType?.toUpperCase() === 'IMAGE' || /\.(jpg|jpeg|png|webp|gif)\b/i.test(item.fileUrl || item.fileName || '')) && (
                           <div className="mb-4 overflow-hidden rounded-xl border border-tactical-border/60 bg-slate-950/30">
                             <img 
                               src={resolveMediaUrl(item.fileUrl)} 
                               alt={item.fileName} 
                               className="h-28 w-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer" 
                               onClick={() => { setPreviewItem(item); setShowPreviewModal(true); }}
                             />
                           </div>
                         )}
                         {(item.fileType?.toUpperCase() === 'AUDIO' || /\.(mp3|wav|ogg|aac|m4a)\b/i.test(item.fileUrl || item.fileName || '')) && (
                           <div className="mb-4 p-1.5 rounded-xl border border-tactical-border/60 bg-slate-950/30">
                             <audio 
                               src={resolveMediaUrl(item.fileUrl)} 
                               controls 
                               className="w-full h-8 outline-none" 
                             />
                           </div>
                         )}
                       </>
                     )}

                    <div className="space-y-2 mb-6 font-mono text-[9px] text-tactical-gray">
                      <div className="flex items-center space-x-2">
                        <Link className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>MISSION: <strong className="text-white uppercase">{item.linkedMission}</strong></span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Link className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>REPORT ID: <strong className="text-white uppercase">{item.linkedReport}</strong></span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>OPERATIVE: <strong className="text-white uppercase">{item.uploadedBy}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-3 border-t border-tactical-border/40 text-[9px] font-mono">
                    <div className="bg-tactical-bg border border-tactical-border p-2.5 rounded-xl text-center space-y-1 relative overflow-hidden">
                      <span className="text-[7px] text-tactical-gray uppercase font-bold block">Cryptographic Checksum Hash</span>
                      {isProcessing ? (
                        <div className="flex items-center justify-center space-x-2 py-0.5 text-blue-400">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span className="font-extrabold tracking-wider animate-pulse-tactical">THREAD CALCULATING...</span>
                        </div>
                      ) : (
                        <span className="text-white font-extrabold tracking-wider break-all text-[8px]">
                          {item.hash || 'NO CHECKSUM DECLARED'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-bold border uppercase
                        ${item.status === 'Processed' ? 'bg-[#0f1b15] border-tactical-green/40 text-tactical-green' : ''}
                        ${item.status === 'Processing' ? 'bg-[#0e1726] border-tactical-border text-blue-400 animate-pulse-tactical' : ''}
                        ${item.status === 'Quarantined' ? 'bg-[#201212] border-tactical-red/40 text-tactical-red' : ''}
                      `}>
                        {item.status}
                      </span>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => { setPreviewItem(item); setShowPreviewModal(true); }}
                          className="p-1.5 rounded bg-tactical-border border border-tactical-border hover:bg-tactical-green/10 hover:border-tactical-green hover:text-tactical-green text-tactical-text transition-all cursor-pointer font-bold flex items-center space-x-1"
                          title="View Preview Portal"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={item.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded bg-tactical-border border border-tactical-border hover:bg-tactical-border/60 text-white transition-all cursor-pointer font-bold flex items-center space-x-1"
                          title="Download asset"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => { setShareItem(item); setShowShareModal(true); }}
                          className="p-1.5 rounded bg-tactical-border border border-tactical-border hover:bg-tactical-green/10 hover:border-tactical-green hover:text-tactical-green text-tactical-text transition-all cursor-pointer font-bold flex items-center space-x-1"
                          title="Share in Comms Chat"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>

                        {user?.role === 'Admin Commander' && (
                          <button
                            onClick={() => handleDeleteEvidence(item.evidenceId, item.fileName)}
                            className="p-1.5 rounded bg-tactical-border border border-tactical-border hover:bg-tactical-red/10 hover:border-tactical-red hover:text-tactical-red text-tactical-text transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          <div className="p-4 bg-tactical-panel border border-tactical-border rounded-xl flex items-center justify-between font-mono text-xs shadow-xl">
            <span className="text-tactical-gray">
              Showing page <span className="text-white font-bold">{page}</span> of <span className="text-white font-bold">{totalPages}</span> ({totalCount} total assets)
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
          NO CLASSIFIED EVIDENCE RECORDED IN LOCAL MAINFRAMES.
        </div>
      )}

      {/* 3. Secure upload simulation Form Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-tactical-panel border border-tactical-border rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-tactical-green"></div>
            
            <div className="p-6 border-b border-tactical-border bg-slate-950/20">
              <h3 className="text-sm font-bold font-mono tracking-widest text-white uppercase">ADD CRYPTO EVIDENCE DOSSIER</h3>
              <p className="text-[9px] text-tactical-gray font-mono uppercase mt-1">Real-time media upload to secure databases & Cloudinary vault</p>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto font-mono text-xs">
              <div className="space-y-4">
                {/* Upload Source Toggle */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-tactical-gray uppercase font-bold">Secure Upload Protocol</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setUploadSource('real');
                        setSelectedFile(null);
                        setFormData(prev => ({ ...prev, fileName: '', fileSize: '0 MB' }));
                      }}
                      className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-xl border text-[10px] font-bold uppercase transition-all cursor-pointer
                        ${uploadSource === 'real'
                          ? 'bg-tactical-green/10 border-tactical-green text-tactical-greenLight' 
                          : 'bg-tactical-bg border-tactical-border text-tactical-gray hover:text-white'}`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Real File Upload</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setUploadSource('link');
                        setSelectedFile(null);
                      }}
                      className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-xl border text-[10px] font-bold uppercase transition-all cursor-pointer
                        ${uploadSource === 'link'
                          ? 'bg-tactical-green/10 border-tactical-green text-tactical-greenLight' 
                          : 'bg-tactical-bg border-tactical-border text-tactical-gray hover:text-white'}`}
                    >
                      <Link className="w-3.5 h-3.5" />
                      <span>Drive / URL Link</span>
                    </button>
                  </div>
                </div>

                {/* 1. Real File Upload Option */}
                {uploadSource === 'real' ? (
                  <div className="space-y-3">
                    <div 
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed p-6 rounded-xl text-center transition-all relative cursor-pointer
                        ${dragActive 
                          ? 'border-cyan-500 bg-cyan-950/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                          : 'border-tactical-border/80 hover:border-tactical-green/50 bg-tactical-bg/40'
                        }`}
                    >
                      <input
                        type="file"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        accept=".jpg,.jpeg,.png,.webp,.pdf,.docx,.doc,.mp3,.wav,.mp4"
                      />
                      <div className="space-y-2">
                        <Lock className={`w-8 h-8 mx-auto animate-pulse ${dragActive ? 'text-cyan-400' : 'text-tactical-green'}`} />
                        <p className="text-[10px] font-bold text-white uppercase">
                          {dragActive ? 'DROP SECURE FILE PACKET HERE' : 'Drag or select secure asset'}
                        </p>
                        <p className="text-[8px] text-tactical-gray leading-normal uppercase">
                          Allowed: JPG, PNG, WEBP, PDF, DOCX, MP3, WAV, MP4<br />
                          Max secure packet payload: 25 MB
                        </p>
                      </div>
                    </div>

                    {selectedFile && (
                      <div className="bg-slate-900 border border-tactical-green/30 p-3 rounded-xl space-y-1">
                        <p className="font-bold text-white uppercase text-[10px]">🔒 Selected classified packet:</p>
                        <p className="text-tactical-greenLight truncate text-[9.5px]">{selectedFile.name}</p>
                        <p className="text-[8px] text-tactical-gray uppercase mt-0.5">SIZE: {formData.fileSize} | FORMAT: {formData.fileType}</p>
                        
                        {/* Interactive Upload Progress Loader */}
                        {uploading && uploadProgress > 0 && (
                          <div className="space-y-1.5 pt-2 border-t border-tactical-border/30 mt-2">
                            <div className="flex justify-between items-center text-[8px] font-mono text-cyan-400 font-bold uppercase">
                              <span>TRANSMITTING ENCRYPTED BUFFER...</span>
                              <span>{uploadProgress}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-cyan-500/20">
                              <div 
                                className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 shadow-[0_0_10px_#06b6d4] transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* 2. External URL / Drive Option */
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Evidence File Name</label>
                      <input
                        type="text"
                        required
                        value={formData.fileName}
                        onChange={(e) => setFormData({ ...formData, fileName: e.target.value })}
                        placeholder="E.G. google_drive_signals_relays.pdf"
                        className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white font-mono"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">File Format Type</label>
                        <select
                          value={formData.fileType}
                          onChange={(e) => setFormData({ ...formData, fileType: e.target.value })}
                          className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                        >
                          <option value="PDF">PDF Dossier</option>
                          <option value="Image">Image Map</option>
                          <option value="Audio">Audio Tape</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">File Size</label>
                        <input
                          type="text"
                          required
                          value={formData.fileSize}
                          onChange={(e) => setFormData({ ...formData, fileSize: e.target.value })}
                          placeholder="E.G. 14.5 MB"
                          className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Secure Drive Link / URL</label>
                      <input
                        type="text"
                        required
                        value={formData.fileUrl}
                        onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                        placeholder="E.G. https://drive.google.com/drive/folders/..."
                        className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white text-[10px]"
                      />
                    </div>
                  </div>
                )}

                {/* Common Linkages */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Linked Mission Code</label>
                    <select
                      value={formData.linkedMission}
                      onChange={(e) => setFormData({ ...formData, linkedMission: e.target.value })}
                      className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white text-[10px]"
                    >
                      <option value="None">No linked mission</option>
                      {missions.map(m => (
                        <option key={m.missionCode} value={m.missionCode}>{m.missionCode} - {m.missionName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-tactical-gray uppercase font-bold mb-1">Linked Intel Report</label>
                    <select
                      value={formData.linkedReport}
                      onChange={(e) => setFormData({ ...formData, linkedReport: e.target.value })}
                      className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 px-3 text-white text-[10px]"
                    >
                      <option value="None">No linked report</option>
                      {reports.map(r => (
                        <option key={r.reportId} value={r.reportId}>{r.reportId} - {r.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-tactical-border/60">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-tactical-border text-tactical-gray hover:text-white rounded-xl transition-all cursor-pointer font-bold"
                >
                  ABORT
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 bg-tactical-green text-white rounded-xl shadow-glowGreen font-bold cursor-pointer flex items-center space-x-1.5 font-mono text-[10px]"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>ENCRYPTING & UPLOADING...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>TRANSMIT & DEPLOY SECURELY</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. DRDO PREVIEW PORTAL MODAL */}
      {showPreviewModal && previewItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-tactical-panel border border-tactical-border rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
            <div className="absolute top-0 left-0 w-full h-[4px] bg-tactical-green"></div>
            
            {/* Modal Header */}
            <div className="p-5 border-b border-tactical-border bg-slate-950/40 flex items-center justify-between font-mono">
              <div>
                <span className="text-[9px] bg-tactical-green/10 border border-tactical-green/30 text-tactical-green font-bold uppercase px-2 py-0.5 rounded">
                  SECURE PREVIEW LOCK • ID: {previewItem.evidenceId}
                </span>
                <h3 className="text-sm font-bold text-white uppercase mt-1.5 tracking-wider">{previewItem.fileName}</h3>
              </div>
              <button 
                onClick={() => { setShowPreviewModal(false); setPreviewItem(null); }}
                className="p-1.5 bg-tactical-bg border border-tactical-border hover:bg-tactical-red/10 hover:border-tactical-red hover:text-tactical-red rounded-lg transition-all cursor-pointer text-tactical-gray"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Grid */}
            <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 font-mono text-xs text-tactical-text">
              {/* Left Column: Visual Preview Panel */}
              <div className="lg:col-span-7 bg-slate-950/50 border border-tactical-border rounded-2xl flex flex-col justify-center items-center min-h-[320px] relative overflow-hidden p-4">
                {isGoogleDriveUrl(previewItem.fileUrl) ? (
                  <div className="w-full h-full relative flex items-center justify-center p-0.5 min-h-[300px]">
                    <iframe 
                      src={getGoogleDriveEmbedUrl(previewItem.fileUrl)}
                      className="w-full h-[310px] rounded-lg border border-tactical-border bg-slate-900 shadow-inner"
                      title="Secure Google Drive Preview Frame"
                    ></iframe>
                  </div>
                ) : (previewItem.fileType?.toUpperCase() === 'IMAGE' || /\.(jpg|jpeg|png|webp|gif)\b/i.test(previewItem.fileUrl || previewItem.fileName || '')) ? (
                  <div className="w-full h-full relative tactical-scan-overlay flex items-center justify-center">
                    <img 
                      src={resolveMediaUrl(previewItem.fileUrl)} 
                      alt="Reconnaissance preview" 
                      className="max-h-[300px] object-contain rounded-lg border border-tactical-border bg-tactical-bg shadow-2xl animate-fade-in"
                    />
                  </div>
                ) : (previewItem.fileType?.toUpperCase() === 'AUDIO' || /\.(mp3|wav|ogg|aac|m4a)\b/i.test(previewItem.fileUrl || previewItem.fileName || '')) ? (
                  <div className="w-full flex flex-col items-center space-y-6 p-6">
                    <div className="relative flex items-center justify-center h-20 w-20 bg-tactical-green/10 text-tactical-green border border-tactical-green/30 rounded-full animate-pulse">
                      <Volume2 className="w-8 h-8" />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-[10px] text-tactical-gray tracking-wider uppercase font-bold">Signal Audio Intercept Decrypted</p>
                      <h4 className="text-white text-xs font-black">{previewItem.fileName}</h4>
                    </div>
                    <div className="w-full max-w-sm pt-2 bg-slate-950/40 p-4 rounded-xl border border-tactical-border">
                      <audio controls className="w-full" src={resolveMediaUrl(previewItem.fileUrl)}>
                        Your browser does not support audio elements.
                      </audio>
                    </div>
                  </div>
                ) : (previewItem.fileType?.toUpperCase() === 'VIDEO' || /\.(mp4|webm)\b/i.test(previewItem.fileUrl || previewItem.fileName || '')) ? (
                  <div className="w-full h-full relative flex items-center justify-center">
                    <video 
                      src={resolveMediaUrl(previewItem.fileUrl)} 
                      controls 
                      className="max-h-[300px] object-contain rounded-lg border border-tactical-border bg-tactical-bg shadow-2xl"
                    >
                      Your browser does not support HTML5 video elements.
                    </video>
                  </div>
                ) : (previewItem.fileUrl && (previewItem.fileUrl.toLowerCase().includes('.pdf') || previewItem.fileType?.toUpperCase() === 'PDF')) ? (
                  <div className="w-full h-full relative flex items-center justify-center p-0.5">
                    <iframe 
                      src={`${resolveMediaUrl(previewItem.fileUrl)}#toolbar=0`}
                      className="w-full h-[310px] rounded-lg border border-tactical-border bg-slate-900 shadow-inner"
                      title="Secure PDF Dossier Frame"
                    ></iframe>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center space-y-4 p-8 text-center">
                    <div className="p-4 bg-red-500/10 text-red-400 border border-red-500/20 rounded-2xl">
                      <FileCheck className="w-10 h-10" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-white font-extrabold">PDF Intelligence Dossier Vault</h4>
                      <p className="text-[10px] text-tactical-gray">DRDO classified document metadata is securely mapped below.</p>
                    </div>
                    <div className="w-full max-w-sm border border-dashed border-tactical-border/60 p-4 rounded-xl text-[10px] text-left leading-relaxed space-y-1 bg-slate-950/20">
                      <p>• Document ID: <strong className="text-white">{previewItem.evidenceId}</strong></p>
                      <p>• File Size: <strong className="text-white">{previewItem.fileSize}</strong></p>
                      <p>• Signed Checksum: <strong className="text-white break-all">{previewItem.hash || 'Background thread calculating...'}</strong></p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Complete Metadata Summary */}
              <div className="lg:col-span-5 space-y-5">
                <div className="bg-slate-950/30 border border-tactical-border rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-bold text-white uppercase tracking-widest border-b border-tactical-border/60 pb-2">Cryptographic Metadata</h4>
                  
                  <div className="space-y-3.5 text-[10px]">
                    <div>
                      <span className="text-[9px] text-tactical-gray block uppercase font-semibold">Integrity Checksum (SHA-256)</span>
                      <span className="text-white font-bold tracking-wider font-mono block mt-0.5 break-all text-[9.5px]">
                        {previewItem.hash || 'Calculating signature (Multi-Threaded Queue)...'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] text-tactical-gray block uppercase font-semibold">Upload Timestamp</span>
                      <span className="text-white font-bold flex items-center space-x-1.5 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-tactical-green" />
                        <span>{new Date(previewItem.createdAt).toLocaleString()}</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] text-tactical-gray block uppercase font-semibold">Uploading Operative ID</span>
                      <span className="text-white font-bold flex items-center space-x-1.5 mt-0.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-tactical-green" />
                        <span className="uppercase">{previewItem.uploadedBy}</span>
                      </span>
                    </div>

                    <div className="pt-2.5 border-t border-tactical-border/40">
                      <span className="text-[9px] text-tactical-gray block uppercase font-semibold">Raw File URL</span>
                      <div className="flex items-center space-x-1.5 mt-1.5">
                        <input 
                          type="text" 
                          readOnly 
                          value={previewItem.fileUrl} 
                          className="flex-1 bg-slate-900 border border-tactical-border/60 text-white font-mono text-[9px] px-2.5 py-1.5 rounded-lg select-all focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(previewItem.fileUrl);
                            onTriggerToast('File URL copied to secure clipboard', 'success');
                          }}
                          className="px-2.5 py-1.5 bg-tactical-border border border-tactical-border hover:bg-tactical-green/10 hover:border-tactical-green hover:text-tactical-greenLight text-white font-mono text-[9px] rounded-lg transition-all cursor-pointer font-bold uppercase"
                        >
                          COPY
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-tactical-border/40">
                      <div>
                        <span className="text-[9px] text-tactical-gray block uppercase font-semibold">Linked Mission</span>
                        <span className="text-white font-black block mt-0.5 uppercase">{previewItem.linkedMission}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-tactical-gray block uppercase font-semibold">Linked Intel Report</span>
                        <span className="text-white font-black block mt-0.5 uppercase">{previewItem.linkedReport}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-tactical-green/5 border border-tactical-green/20 rounded-2xl flex items-start space-x-3 text-[10px] leading-relaxed text-tactical-gray">
                  <ShieldCheck className="w-5 h-5 text-tactical-green flex-shrink-0 mt-0.5" />
                  <p>
                    This evidence asset is protected by localized hardware encryption nodes. Tampering attempts will flag automatic sector containment protocols.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 5. SECURE EVIDENCE DISPATCH MODAL */}
      {showShareModal && shareItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-tactical-panel border border-tactical-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-tactical-green"></div>
            
            <div className="p-5 border-b border-tactical-border bg-slate-950/40 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold font-mono tracking-widest text-white uppercase flex items-center space-x-2">
                  <Send className="w-4.5 h-4.5 text-tactical-green" />
                  <span>DISPATCH EVIDENCE PACKET</span>
                </h3>
                <p className="text-[8px] text-tactical-gray font-mono uppercase mt-1">Select secure receiver node to transmit asset telemetry</p>
              </div>
              <button 
                onClick={() => { setShowShareModal(false); setShareItem(null); }}
                className="p-1 border border-tactical-border hover:bg-tactical-red/10 text-tactical-gray hover:text-white rounded transition-all cursor-pointer font-bold"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5 space-y-4 font-mono text-xs max-h-[60vh] overflow-y-auto">
              <div className="bg-slate-900 border border-tactical-border/40 p-3 rounded-xl space-y-1 text-[9px] text-tactical-gray text-left">
                <p className="font-extrabold text-white uppercase">🔒 Classified Payload to Share:</p>
                <p className="text-tactical-greenLight truncate mt-0.5">{shareItem.fileName}</p>
                <p className="uppercase">{shareItem.fileType} • {shareItem.fileSize}</p>
              </div>

              <div className="space-y-2 text-left">
                <span className="text-[8px] text-tactical-gray font-bold tracking-widest uppercase opacity-65">CHANNELS & ACTIVE NET LINKS</span>
                
                {/* Global Net Link Button */}
                <button
                  type="button"
                  onClick={() => handleShareEvidence('GLOBAL', 'GLOBAL NET LINK')}
                  className="w-full flex items-center justify-between p-3 bg-slate-950/20 hover:bg-tactical-green/10 border border-tactical-border/50 hover:border-tactical-green rounded-xl text-left transition-all cursor-pointer"
                >
                  <div className="flex items-center space-x-2.5">
                    <Send className="w-3.5 h-3.5 text-tactical-green" />
                    <div>
                      <p className="font-bold text-white text-[10px]">GLOBAL TACTICAL BROADCAST LINK</p>
                      <p className="text-[8px] text-tactical-gray uppercase mt-0.5">Broadcast to all active base operatives</p>
                    </div>
                  </div>
                  <span className="text-[8px] bg-tactical-green/20 text-tactical-greenLight px-1.5 py-0.5 border border-tactical-green/40 rounded uppercase font-bold tracking-wider">Group</span>
                </button>

                {/* Individual Officers */}
                {activeOfficers.length > 0 ? (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[8px] text-tactical-gray font-bold tracking-widest uppercase opacity-65">DIRECT FEEDS Matrix</span>
                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                      {activeOfficers.map((o) => (
                        <button
                          key={o.officerId}
                          type="button"
                          onClick={() => handleShareEvidence(o.officerId, o.fullName)}
                          className="w-full flex items-center justify-between p-2.5 bg-slate-950/10 hover:bg-tactical-border/20 border border-tactical-border/40 hover:border-tactical-border rounded-xl text-left transition-all cursor-pointer animate-fade-in"
                        >
                          <div>
                            <p className="font-bold text-white text-[9.5px]">{o.fullName}</p>
                            <p className="text-[7.5px] text-tactical-gray uppercase mt-0.5">{o.rank} • ID: {o.officerId}</p>
                          </div>
                          <span className="text-[7px] text-tactical-green font-bold uppercase tracking-wider">Direct</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[8.5px] text-tactical-gray italic py-4 text-center">No other online operatives located.</p>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-tactical-border bg-slate-950/20 flex justify-end">
              <button
                type="button"
                onClick={() => { setShowShareModal(false); setShareItem(null); }}
                className="px-4 py-2 border border-tactical-border text-tactical-gray hover:text-white rounded-xl transition-all cursor-pointer font-bold uppercase text-[9px]"
              >
                Abort Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Close Container */}
      </div>
  );
};

export default EvidenceVault;
