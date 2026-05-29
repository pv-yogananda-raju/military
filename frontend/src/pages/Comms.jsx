import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { resolveMediaUrl, getGoogleDriveEmbedUrl, detectGoogleDriveUrl } from '../config';
import { 
  MessageSquare, Send, ShieldAlert, Users, Radio, Lock, AlertTriangle, 
  Check, RefreshCw, Search, Globe, UserPlus, CheckCircle, Shield, 
  Paperclip, Download, Trash, Archive, FolderOpen, Loader2
} from 'lucide-react';

const Comms = ({ onTriggerToast, activeRecipient, setActiveRecipient, unreadMap, setUnreadMap }) => {
  const { user, authFetch } = useAuth();
  
  // Channels and selection
  const recipient = activeRecipient || 'GLOBAL';
  const setRecipient = setActiveRecipient;
  const [targetOfficer, setTargetOfficer] = useState(null); // Active private target object
  const [officers, setOfficers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [recentMessages, setRecentMessages] = useState([]);
  
  // Input and Loading states
  const [content, setContent] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [loadingOfficers, setLoadingOfficers] = useState(true);
  const [sending, setSending] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [updatingAccess, setUpdatingAccess] = useState(null);

  // Search & Attachments
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [uploadingChatFile, setUploadingChatFile] = useState(false);

  // Admin Comms Matrix Tabs & states
  const [adminTab, setAdminTab] = useState('broadcasting'); // 'broadcasting' | 'enlistment' | 'monitoring' | 'uploads'
  const [adminConversations, setAdminConversations] = useState([]);
  const [loadingAdminConvs, setLoadingAdminConvs] = useState(false);
  const [selectedAdminConv, setSelectedAdminConv] = useState(null);
  const [adminMessages, setAdminMessages] = useState([]);
  const [loadingAdminMsgs, setLoadingAdminMsgs] = useState(false);
  const [adminChatSearch, setAdminChatSearch] = useState('');
  const [credentialsList, setCredentialsList] = useState([]);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [adminUploads, setAdminUploads] = useState([]);
  const [loadingAdminUploads, setLoadingAdminUploads] = useState(false);
  const [adminUploadsSearch, setAdminUploadsSearch] = useState('');

  // Dossier enlistment states
  const [dossierData, setDossierData] = useState({
    officerId: '',
    fullName: '',
    rank: '',
    role: 'Field Officer',
    department: '',
    clearanceLevel: 'Level 1',
    email: '',
    phone: '',
    password: '',
  });
  const [enlisting, setEnlisting] = useState(false);

  const messagesEndRef = useRef(null);

  const isAdmin = user?.role === 'Admin Commander';

  // Fetch registered officers list
  const fetchOfficers = async () => {
    try {
      setLoadingOfficers(true);
      const res = await authFetch('/officers?limit=100');
      const data = await res.json();
      if (data.success) {
        // Filter out ourselves
        const activeOfficers = data.officers.filter(o => o.officerId !== user.officerId);
        setOfficers(activeOfficers);
      }
    } catch (error) {
      console.error('[Fetch Comms Officers Error]', error);
    } finally {
      setLoadingOfficers(false);
    }
  };

  // Fetch secure chat message logs
  const fetchMessages = async () => {
    try {
      const res = await authFetch(`/chat/messages?recipient=${recipient}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('[Fetch Comms Messages Error]', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Fetch all recent messages for sidebar sorting & glowing badges
  const fetchRecentMessages = async () => {
    try {
      const res = await authFetch('/chat/recent' || '/chat/messages/recent'); // Handles either route prefix standard
      const data = await res.json();
      if (data.success) {
        setRecentMessages(data.messages || []);
      }
    } catch (error) {
      // Fallback query if standard endpoint is prefixed under chat
      try {
        const fallbackRes = await authFetch('/chat/messages/recent');
        const fallbackData = await fallbackRes.json();
        if (fallbackData.success) {
          setRecentMessages(fallbackData.messages || []);
        }
      } catch (err) {
        console.error('[Fetch Recent Messages Fallback Error]', err);
      }
    }
  };

  useEffect(() => {
    fetchOfficers();
    fetchRecentMessages();
  }, []);

  // Poll messages every 3 seconds to achieve a real-time comms chat experience!
  useEffect(() => {
    fetchMessages();
    fetchRecentMessages();
    const interval = setInterval(() => {
      fetchMessages();
      fetchRecentMessages();
    }, 3000);
    return () => clearInterval(interval);
  }, [recipient]);

  // Scroll messages viewport to bottom on new updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getSortedOfficers = () => {
    if (!user || !officers) return [];
    const filtered = officers.filter(o => 
      (o.status === 'Active' || o.status === 'In Field') &&
      (o.fullName.toLowerCase().includes(sidebarSearch.toLowerCase()) || 
       o.officerId.toLowerCase().includes(sidebarSearch.toLowerCase()))
    );

    return filtered.map(officer => {
      // Find latest message between user and this officer
      const pairMsgs = recentMessages.filter(m => 
        m.recipient !== 'GLOBAL' &&
        ((m.sender === user.officerId && m.recipient === officer.officerId) ||
         (m.sender === officer.officerId && m.recipient === user.officerId))
      );
      
      const lastMsg = pairMsgs.length > 0 ? pairMsgs[pairMsgs.length - 1] : null;
      const lastMsgTime = lastMsg ? new Date(lastMsg.createdAt).getTime() : 0;
      
      // Operative has messaged us and we are not in their chat
      const hasUnread = lastMsg && lastMsg.sender === officer.officerId && recipient !== officer.officerId;

      return {
        ...officer,
        lastMsgTime,
        lastMsg,
        hasUnread
      };
    }).sort((a, b) => b.lastMsgTime - a.lastMsgTime);
  };

  const handleDeleteIndividualMessage = async (messageId) => {
    if (!window.confirm('PROTOCOL CONFIRMATION: Permanently expunge this individual chat message? This action is recorded in the database.')) return;
    try {
      const res = await authFetch(`/chat/messages/${messageId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        onTriggerToast('Message packet permanently expunged.', 'warning');
        setMessages(prev => prev.filter(m => m.messageId !== messageId));
        fetchRecentMessages();
      } else {
        onTriggerToast(data.message, 'error');
      }
    } catch (error) {
      console.error('[Delete Individual Message Error]', error);
      onTriggerToast('Failed to delete message.', 'error');
    }
  };

  const handleChatFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadingChatFile(true);
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
      console.error('[Chat File Upload Error]', err);
      onTriggerToast('Failed to attach secure file.', 'error');
    } finally {
      setUploadingChatFile(false);
    }
  };

  const fetchAdminConversations = async () => {
    try {
      setLoadingAdminConvs(true);
      const res = await authFetch('/chat/admin/conversations');
      const data = await res.json();
      if (data.success) {
        setAdminConversations(data.conversations);
      }
    } catch (error) {
      console.error('[Fetch Admin Conversations Error]', error);
    } finally {
      setLoadingAdminConvs(false);
    }
  };

  const fetchAdminMessages = async (officerA, officerB) => {
    try {
      setLoadingAdminMsgs(true);
      const res = await authFetch(`/chat/admin/messages?officerA=${officerA}&officerB=${officerB}&search=${adminChatSearch}`);
      const data = await res.json();
      if (data.success) {
        setAdminMessages(data.messages);
      }
    } catch (error) {
      console.error('[Fetch Admin Messages Error]', error);
    } finally {
      setLoadingAdminMsgs(false);
    }
  };

  const handleAdminDeleteMessage = async (messageId, officerA, officerB) => {
    if (!window.confirm(`EXPUNGE SECURE LOG WARNING: Permanently delete message packet [${messageId}] from records?`)) return;
    try {
      const res = await authFetch(`/chat/admin/messages/${messageId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        onTriggerToast('Secure chat message expunged successfully.', 'warning');
        fetchAdminMessages(officerA, officerB);
        fetchAdminConversations();
      } else {
        onTriggerToast(data.message, 'error');
      }
    } catch (error) {
      console.error('[Admin Delete Message Error]', error);
    }
  };

  const handleAdminArchiveMessage = async (messageId, currentArchived, officerA, officerB) => {
    try {
      const res = await authFetch(`/chat/admin/messages/${messageId}/archive`, {
        method: 'PUT',
        body: JSON.stringify({ isArchived: !currentArchived }),
      });
      const data = await res.json();
      if (data.success) {
        onTriggerToast(`Message packet ${!currentArchived ? 'archived' : 'restored'} successfully.`, 'success');
        fetchAdminMessages(officerA, officerB);
      } else {
        onTriggerToast(data.message, 'error');
      }
    } catch (error) {
      console.error('[Admin Archive Message Error]', error);
    }
  };

  const fetchCredentialsList = async () => {
    try {
      setLoadingCredentials(true);
      const res = await authFetch('/officers/admin/credentials');
      const data = await res.json();
      if (data.success) {
        setCredentialsList(data.credentials);
      }
    } catch (error) {
      console.error('[Fetch Credentials Error]', error);
    } finally {
      setLoadingCredentials(false);
    }
  };

  const fetchAdminUploads = async (query = '') => {
    try {
      setLoadingAdminUploads(true);
      const res = await authFetch(`/upload/admin/monitor?search=${query}`);
      const data = await res.json();
      if (data.success) {
        setAdminUploads(data.files);
      }
    } catch (error) {
      console.error('[Fetch Admin Uploads Error]', error);
    } finally {
      setLoadingAdminUploads(false);
    }
  };

  const handleAdminDeleteUpload = async (source, id, fileName) => {
    if (!window.confirm(`EXPUNGE PHYSICAL FILE WARNING: Permanently delete file packet "${fileName}" from ${source}? This action is irreversible.`)) return;
    try {
      const res = await authFetch(`/upload/admin/monitor/${encodeURIComponent(source)}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        onTriggerToast('Classified file packet expunged successfully.', 'warning');
        fetchAdminUploads(adminUploadsSearch);
      } else {
        onTriggerToast(data.message, 'error');
      }
    } catch (error) {
      console.error('[Admin Delete Upload Error]', error);
      onTriggerToast('Failed to expunge file.', 'error');
    }
  };

  const handleApproveOfficer = async (officerId, name) => {
    try {
      setUpdatingAccess(officerId);
      const res = await authFetch(`/officers/${officerId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'Active' }),
      });
      const data = await res.json();
      if (data.success) {
        onTriggerToast(`Operative profile for ${name} activated and enrolled in secure networks!`, 'success');
        fetchOfficers();
        if (adminTab === 'enlistment') {
          fetchOfficers(); // refresh list
        }
      } else {
        onTriggerToast(data.message, 'error');
      }
    } catch (error) {
      console.error('[Approve Officer Error]', error);
      onTriggerToast('Failed to approve operative clearance.', 'error');
    } finally {
      setUpdatingAccess(null);
    }
  };

  const handleDossierSubmit = async (e) => {
    e.preventDefault();
    if (!dossierData.officerId || !dossierData.fullName || !dossierData.rank || !dossierData.department || !dossierData.email || !dossierData.phone || !dossierData.password) {
      onTriggerToast('Tactical Alert: Please populate all required dossier fields.', 'error');
      return;
    }
    
    try {
      setEnlisting(true);
      const res = await authFetch('/officers', {
        method: 'POST',
        body: JSON.stringify({
          ...dossierData,
          status: 'Active',
        }),
      });
      const data = await res.json();
      if (data.success) {
        onTriggerToast(`Tactical Dossier for ${dossierData.fullName} successfully committed and activated!`, 'success');
        setDossierData({
          officerId: '',
          fullName: '',
          rank: '',
          role: 'Field Officer',
          department: '',
          clearanceLevel: 'Level 1',
          email: '',
          phone: '',
          password: '',
        });
        fetchOfficers();
      } else {
        onTriggerToast(data.message, 'error');
      }
    } catch (error) {
      console.error('[Add Dossier Error]', error);
      onTriggerToast('Failed to commit dossier.', 'error');
    } finally {
      setEnlisting(false);
    }
  };

  const handleResetChat = async () => {
    const isGlobal = recipient === 'GLOBAL';
    const confirmMessage = isGlobal 
      ? 'CRITICAL PROTOCOL ACTION: Purge the entire GLOBAL chat net link database? This will wipe history for all officers.' 
      : `CRITICAL SECURE ACTION: Purge secure chat logs between you and ${targetOfficer?.fullName}? This cannot be undone.`;

    if (!window.confirm(confirmMessage)) return;

    try {
      const res = await authFetch(`/chat/messages/reset?recipient=${recipient}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        onTriggerToast(data.message, 'warning');
        setMessages([]); // clear local state immediately
      } else {
        onTriggerToast(data.message, 'error');
      }
    } catch (error) {
      console.error('[Reset Chat Error]', error);
      onTriggerToast('Failed to purge communications feed.', 'error');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const hasAttachments = attachedFiles.length > 0;
    if ((!content || !content.trim()) && !hasAttachments) return;

    try {
      setSending(true);
      const textContent = content.trim() || `Transmitted classified file: ${attachedFiles.map(f => f.fileName).join(', ')}`;
      const res = await authFetch('/chat/messages', {
        method: 'POST',
        body: JSON.stringify({
          recipient,
          content: textContent,
          attachments: attachedFiles,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, data.message]);
        setContent('');
        setAttachedFiles([]);
      } else {
        onTriggerToast(data.message, 'error');
      }
    } catch (error) {
      console.error('[Send Comms Message Error]', error);
      onTriggerToast('Failed to transmit secure packet.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleToggleAccess = async (officerId, currentAccess) => {
    try {
      setUpdatingAccess(officerId);
      const newAccess = !currentAccess;
      const res = await authFetch(`/chat/access/${officerId}`, {
        method: 'PUT',
        body: JSON.stringify({ groupChatAccess: newAccess }),
      });
      const data = await res.json();
      if (data.success) {
        onTriggerToast(`Comms access for ${officerId} updated successfully.`, 'success');
        setOfficers(prev => prev.map(o => o.officerId === officerId ? { ...o, groupChatAccess: newAccess } : o));
        
        // If the toggled user is the currently selected private target, update target officer reference too
        if (targetOfficer && targetOfficer.officerId === officerId) {
          setTargetOfficer(prev => ({ ...prev, groupChatAccess: newAccess }));
        }
      } else {
        onTriggerToast(data.message, 'error');
      }
    } catch (error) {
      console.error('[Toggle Access Error]', error);
      onTriggerToast('Failed to update permission credentials.', 'error');
    } finally {
      setUpdatingAccess(null);
    }
  };

  const selectChannel = (channelId, officerObj = null) => {
    setLoadingMessages(true);
    setRecipient(channelId);
    setTargetOfficer(officerObj);
  };

  // Check if our own access is disabled
  const isSuspended = recipient === 'GLOBAL' && user?.groupChatAccess === false;

  return (
    <div className="h-[calc(100vh-140px)] flex bg-tactical-panel border border-tactical-border rounded-2xl overflow-hidden shadow-2xl font-mono text-xs">
      
      {/* 1. COMMS SIDEBAR */}
      <div className="w-64 border-r border-tactical-border flex flex-col justify-between bg-slate-950/20">
        <div>
          {/* Header */}
          <div className="h-14 border-b border-tactical-border flex items-center justify-between px-4 bg-slate-950/40">
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-tactical-green animate-pulse" />
              <span className="font-extrabold text-white uppercase tracking-wider">TACTICAL FEEDS</span>
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowAdminPanel(true)}
                className="p-1 rounded bg-tactical-border border border-tactical-border hover:bg-tactical-green/10 hover:border-tactical-green hover:text-tactical-greenLight text-tactical-text transition-all cursor-pointer"
                title="Comms access console"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Navigation List */}
          <div className="p-3 space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto">
            {/* Search Box */}
            <div className="relative">
              <input
                type="text"
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                placeholder="Search operatives..."
                className="w-full bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-2 pl-8 pr-3 text-[10px] text-white placeholder-tactical-gray/40 transition-all font-mono"
              />
              <Search className="w-3.5 h-3.5 text-tactical-gray absolute left-2.5 top-2.5" />
            </div>

            {/* Global Channel */}
            <div className="space-y-1">
              <span className="text-[8.5px] text-tactical-gray font-bold tracking-widest uppercase opacity-60">BROADCAST LINKS</span>
              <button
                onClick={() => selectChannel('GLOBAL')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left tracking-wide transition-all border
                  ${recipient === 'GLOBAL' 
                    ? 'bg-slate-950/40 text-tactical-green border-tactical-border border-l-4 border-l-tactical-green font-bold' 
                    : 'text-tactical-gray hover:bg-tactical-border/20 hover:text-white border-transparent'
                  }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Users className="w-4 h-4" />
                  <span className="text-[10px] uppercase">GLOBAL NET LINK</span>
                </div>
                {recipient === 'GLOBAL' ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-tactical-green animate-ping"></span>
                ) : (
                  unreadMap && unreadMap['GLOBAL'] > 0 && (
                    <span className="bg-tactical-green text-slate-950 font-bold font-mono text-[8px] px-1.5 py-0.2 rounded-full shadow-glowGreen animate-pulse-tactical">
                      {unreadMap['GLOBAL']}
                    </span>
                  )
                )}
              </button>
            </div>

            {/* Direct Links */}
            <div className="space-y-1">
              <span className="text-[8.5px] text-tactical-gray font-bold tracking-widest uppercase opacity-60">DIRECT SECURE FEEDS</span>
              {loadingOfficers ? (
                <div className="space-y-2 py-4">
                  <div className="h-6 bg-tactical-border/30 rounded animate-pulse"></div>
                  <div className="h-6 bg-tactical-border/30 rounded animate-pulse"></div>
                </div>
              ) : getSortedOfficers().length > 0 ? (
                <div className="space-y-1">
                  {getSortedOfficers().map((officer) => (
                    <button
                      key={officer.officerId}
                      onClick={() => selectChannel(officer.officerId, officer)}
                      className={`w-full flex items-center justify-between px-2.5 py-2.5 rounded-lg text-left tracking-wide transition-all border
                        ${recipient === officer.officerId 
                          ? 'bg-slate-950/40 text-tactical-green border-tactical-border border-l-4 border-l-tactical-green font-bold' 
                          : 'text-tactical-gray hover:bg-tactical-border/20 hover:text-white border-transparent'
                        }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 border border-slate-900/50
                          ${officer.status === 'Active' || officer.status === 'In Field' ? 'bg-[#00C853] shadow-glowGreen' : 'bg-tactical-gray'}
                        `}></span>
                        <div className="min-w-0 flex-1 leading-tight">
                          <div className="flex items-center justify-between">
                            <p className="font-extrabold text-white truncate text-[10px] uppercase tracking-wide">{officer.fullName}</p>
                            {(officer.hasUnread || (unreadMap && unreadMap[officer.officerId] > 0)) && (
                              <span 
                                className="w-2 h-2 rounded-full bg-tactical-red animate-pulse flex-shrink-0 ml-1.5 shadow-[0_0_8px_#FF3D3D]"
                                title="New transmission received"
                              ></span>
                            )}
                          </div>
                          <p className="text-[7.5px] text-tactical-gray truncate uppercase mt-0.5">{officer.rank} • {officer.officerId}</p>
                        </div>
                      </div>
                      
                      {officer.groupChatAccess === false ? (
                        <span className="text-[6.5px] bg-[#201212] border border-tactical-red/30 text-tactical-redLight px-1.5 py-0.2 rounded font-bold uppercase tracking-wider flex-shrink-0">Muted</span>
                      ) : (
                        unreadMap && unreadMap[officer.officerId] > 0 && (
                          <span className="bg-tactical-red text-white font-bold font-mono text-[8px] px-1.5 py-0.2 rounded-full shadow-[0_0_8px_#FF3D3D] flex-shrink-0 animate-pulse-tactical border border-tactical-red/40">
                            {unreadMap[officer.officerId]}
                          </span>
                        )
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[9px] text-tactical-gray/60 italic py-4 text-center">No active operatives.</p>
              )}
            </div>
          </div>
        </div>

        {/* Identity Footer */}
        <div className="p-3 border-t border-tactical-border bg-slate-950/30 flex items-center space-x-2.5">
          <div className="relative">
            <img src={resolveMediaUrl(user.profileImage)} alt={user.fullName} className="w-8 h-8 rounded object-cover border border-tactical-border" />
            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-tactical-green border border-tactical-panel rounded-full animate-ping"></div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-tactical-green border border-tactical-panel rounded-full"></div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-white truncate leading-none text-[10px]">{user.fullName}</p>
            <p className="text-[8px] text-tactical-gray truncate uppercase mt-1">ID: {user.officerId}</p>
          </div>
        </div>
      </div>

      {/* 2. MAIN CONVERSATION SCREEN */}
      <div className="flex-1 flex flex-col justify-between bg-tactical-bg/40">
        {/* Active Title bar */}
        <div className="h-14 border-b border-tactical-border flex items-center justify-between px-6 bg-slate-950/20">
          <div className="flex items-center space-x-3">
            <Lock className="w-4 h-4 text-tactical-greenLight" />
            <div>
              <h4 className="font-bold text-white uppercase text-[11px] tracking-widest leading-none">
                {recipient === 'GLOBAL' ? 'SECURE CHANNEL: GLOBAL TACTICAL NET' : `SECURE DIRECT FEED: ${targetOfficer?.fullName}`}
              </h4>
              <p className="text-[8.5px] text-tactical-gray uppercase mt-1 tracking-wider">
                {recipient === 'GLOBAL' 
                  ? 'BROADCAST VISIBLE TO ALL ENROLLED ACTIVE INTELLIGENCE OPERATIVES' 
                  : `ENCRYPTED CHAT MATRIX CHANNEL GATED FOR OFFICERS [${user.officerId} ↔ ${recipient}]`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleResetChat}
              className="px-2.5 py-1.5 bg-[#201212] hover:bg-tactical-red/20 border border-tactical-red/40 hover:border-tactical-red text-tactical-redLight hover:text-white rounded-lg text-[9px] font-mono tracking-wider font-extrabold uppercase transition-all flex items-center space-x-1 cursor-pointer"
              title="Reset secure communications feed"
            >
              <Trash className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Chat</span>
            </button>

            <div className="flex items-center space-x-3 text-[8.5px] text-tactical-greenLight font-bold bg-tactical-green/10 border border-tactical-green/30 px-2.5 py-1 rounded-md">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tactical-greenLight opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-tactical-greenLight"></span>
              </span>
              <span>SECURE PIPELINE</span>
            </div>
          </div>
        </div>

        {/* Message Log viewport */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 min-h-0 bg-tactical-panel/10">
          {loadingMessages ? (
            <div className="space-y-4 py-8">
              <div className="flex justify-start"><div className="w-1/2 h-10 bg-tactical-border/20 rounded-xl animate-pulse"></div></div>
              <div className="flex justify-end"><div className="w-1/3 h-8 bg-tactical-border/20 rounded-xl animate-pulse"></div></div>
            </div>
          ) : messages.length > 0 ? (
            <div className="space-y-4">
              {messages.map((msg) => {
                const isSelf = msg.sender === user.officerId;
                
                return (
                  <div key={msg.messageId} className={`flex items-start gap-2.5 ${isSelf ? 'flex-row-reverse justify-start' : 'flex-row justify-start'}`}>
                    {/* WhatsApp/Instagram style avatar (left for others, right for self) */}
                    <img 
                      src={resolveMediaUrl(isSelf ? user.profileImage : msg.senderImage)} 
                      alt={msg.senderName} 
                      className="w-7 h-7 rounded-full object-cover bg-tactical-bg border border-tactical-border/60 flex-shrink-0 cursor-pointer hover:scale-105 transition-all"
                      onClick={() => {
                        // Open profile picture click view modal!
                        onTriggerToast(`Displaying clearance profile for ${msg.senderName}`, 'success');
                        window.open(resolveMediaUrl(isSelf ? user.profileImage : msg.senderImage), '_blank');
                      }}
                      title="Inspect operative photo"
                    />

                    <div className={`space-y-1 max-w-[70%] ${isSelf ? 'items-end' : 'items-start'} flex flex-col`}>
                      {/* Name header with individual message deletion gated by author/admin */}
                      <div className="flex items-center justify-between w-full gap-2 text-[7.5px] font-mono text-tactical-gray">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-bold text-white">{msg.senderName}</span>
                          <span className="uppercase font-semibold">({msg.senderRank})</span>
                          <span>•</span>
                          <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                        </div>
                        {(isSelf || isAdmin) && (
                          <button
                            onClick={() => handleDeleteIndividualMessage(msg.messageId)}
                            className="text-tactical-gray hover:text-tactical-red transition-all cursor-pointer p-0.5 rounded hover:bg-tactical-red/10 flex-shrink-0"
                            title="Delete individual transmission"
                          >
                            <Trash className="w-3 h-3 text-tactical-redLight" />
                          </button>
                        )}
                      </div>

                      {/* Bubble */}
                      <div className={`p-3 rounded-2xl border text-[11px] leading-relaxed shadow-tactical whitespace-pre-wrap font-mono
                        ${isSelf 
                          ? 'bg-slate-900 border-tactical-border text-white rounded-tr-none' 
                          : 'bg-[#121A22] border-tactical-border/60 text-white rounded-tl-none'
                        }
                      `}>
                        {msg.content}

                        {/* Google Drive Link Detected Embed Preview */}
                        {detectGoogleDriveUrl(msg.content) && (
                          <div className="mt-3 border border-tactical-border/55 rounded-xl overflow-hidden bg-slate-950/80">
                            <div className="bg-[#121A22] border-b border-tactical-border/40 p-2 flex items-center justify-between text-[8px] font-mono text-tactical-gray">
                              <span className="font-extrabold text-white">🖥️ GOOGLE DRIVE ATTACHMENT DECRYPTION PREVIEW</span>
                              <a 
                                href={detectGoogleDriveUrl(msg.content)} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-cyan-400 font-bold hover:underline"
                              >
                                OPEN DIRECT ↗
                              </a>
                            </div>
                            <div className="relative w-full h-48 bg-slate-900">
                              <iframe
                                src={getGoogleDriveEmbedUrl(detectGoogleDriveUrl(msg.content))}
                                className="w-full h-full border-0 rounded-b-xl"
                                allow="autoplay"
                                title="Google Drive Document Preview"
                              />
                            </div>
                          </div>
                        )}

                        {/* Attachments rendering */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2.5 space-y-2 border-t border-tactical-border/30 pt-2 text-[9px]">
                            {msg.attachments.map((file, fIdx) => {
                              const fileTypeUpper = (file.fileType || '').toUpperCase();
                              const isImg = fileTypeUpper === 'IMAGE' || /\.(jpg|jpeg|png|webp|gif)\b/i.test(file.fileUrl || file.fileName || '');
                              const isAud = fileTypeUpper === 'AUDIO' || /\.(mp3|wav|ogg|aac|m4a)\b/i.test(file.fileUrl || file.fileName || '');
                              const isDrive = isGoogleDriveUrl(file.fileUrl);
                              return (
                                <div key={fIdx} className="bg-tactical-bg border border-tactical-border/50 p-2 rounded-xl flex flex-col gap-1 max-w-xs overflow-hidden">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0 flex-1 leading-tight">
                                      <p className="font-bold text-white truncate">{file.fileName}</p>
                                      <p className="text-[7.5px] text-tactical-gray uppercase mt-0.5">{file.fileType} • {file.fileSize}</p>
                                    </div>
                                    <a 
                                      href={resolveMediaUrl(file.fileUrl)} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="p-1 rounded bg-tactical-border hover:bg-tactical-green/15 hover:text-tactical-greenLight transition-all cursor-pointer flex-shrink-0"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                  
                                  {isDrive ? (
                                    <div className="relative w-full h-40 mt-1 bg-slate-900 rounded overflow-hidden">
                                      <iframe
                                        src={getGoogleDriveEmbedUrl(file.fileUrl)}
                                        className="w-full h-full border-0"
                                        title="Google Drive Attachment"
                                      />
                                    </div>
                                  ) : (
                                    <>
                                      {isImg && (
                                        <img src={resolveMediaUrl(file.fileUrl)} alt={file.fileName} className="w-full max-h-24 rounded object-cover border border-tactical-border/40 mt-1 cursor-pointer" onClick={() => window.open(resolveMediaUrl(file.fileUrl), '_blank')} />
                                      )}
                                      {isAud && (
                                        <audio src={resolveMediaUrl(file.fileUrl)} controls className="w-full max-h-8 rounded mt-1 outline-none" />
                                      )}
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="py-24 text-center font-mono text-xs text-tactical-gray border border-dashed border-tactical-border rounded-xl">
              SECURE TELEMETRY LINK ESTABLISHED. NO ENCRYPTED TRANSMISSIONS SENT IN THIS MATRIX YET.
            </div>
          )}
        </div>

        {/* Input sending board */}
        <div className="p-4 border-t border-tactical-border bg-slate-950/20 space-y-3">
          {/* Render active chat attachments list */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-1 font-mono text-[9px]">
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

          {isSuspended ? (
            <div className="bg-[#201212]/80 border border-tactical-red/30 p-3 rounded-xl flex items-center justify-center space-x-2 text-tactical-redLight font-extrabold text-[10px] uppercase animate-pulse-tactical font-mono">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>COMMUNICATIONS OUTFLOW BLOCKED BY DIRECTIVE OF COMMANDER</span>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
              {/* Paperclip file uploader button */}
              <div className="relative flex-shrink-0">
                <input
                  type="file"
                  onChange={handleChatFileUpload}
                  disabled={uploadingChatFile}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                />
                <button
                  type="button"
                  disabled={uploadingChatFile}
                  className={`p-3 bg-tactical-border border border-tactical-border hover:bg-tactical-green/10 hover:border-tactical-green hover:text-tactical-greenLight rounded-xl transition-all cursor-pointer text-tactical-gray flex items-center justify-center
                    ${uploadingChatFile ? 'animate-pulse' : ''}`}
                  title="Attach secure file packet"
                >
                  {uploadingChatFile ? (
                    <Loader2 className="w-4 h-4 animate-spin text-tactical-green" />
                  ) : (
                    <Paperclip className="w-4 h-4" />
                  )}
                </button>
              </div>

              <input
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={recipient === 'GLOBAL' ? "Broadcasting packet to all active net operatives..." : `Send encrypted direct packet to ${targetOfficer?.fullName}...`}
                className="flex-1 bg-tactical-bg border border-tactical-border hover:border-tactical-gray/60 focus:border-tactical-green focus:outline-none rounded-xl py-3 px-4 text-xs text-white font-mono placeholder-tactical-gray/40 transition-all"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || (!content.trim() && attachedFiles.length === 0)}
                className="bg-tactical-green hover:bg-opacity-95 text-white disabled:opacity-35 disabled:cursor-not-allowed font-bold px-5 py-3 rounded-xl transition-all shadow-glowGreen flex items-center justify-center space-x-1.5 cursor-pointer uppercase font-mono tracking-wider text-[10px]"
              >
                {sending ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Transmit</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* 3. MODAL: COMMS ACCESS CONTROL PANEL (Admin Commander Only) */}
      {showAdminPanel && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`bg-tactical-panel border border-tactical-border rounded-2xl w-full transition-all duration-300 overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh]
            ${adminTab === 'monitoring' || adminTab === 'uploads' ? 'max-w-4xl' : 'max-w-xl'}`}>
            <div className="absolute top-0 left-0 w-full h-[3px] bg-tactical-green"></div>
            
            {/* Modal Header & Tabs */}
            <div className="p-6 border-b border-tactical-border bg-slate-950/20 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold font-mono tracking-widest text-white uppercase flex items-center space-x-2">
                    <ShieldAlert className="w-5 h-5 text-tactical-green" />
                    <span>COMMS OPERATIONS BOARD</span>
                  </h3>
                  <p className="text-[9px] text-tactical-gray font-mono uppercase mt-1">Classified command console governing base communication systems</p>
                </div>
                <button
                  onClick={() => {
                    setShowAdminPanel(false);
                    setSelectedAdminConv(null);
                    setAdminMessages([]);
                  }}
                  className="px-2.5 py-1 text-[9px] border border-tactical-border rounded-lg text-tactical-gray hover:text-white uppercase font-bold transition-all cursor-pointer"
                >
                  Close Console
                </button>
              </div>

              {/* Console Tabs */}
              <div className="flex space-x-2 border-b border-tactical-border/40 pb-1">
                <button
                  onClick={() => setAdminTab('broadcasting')}
                  className={`px-3 py-1.5 text-[9px] font-bold uppercase transition-all border rounded-lg cursor-pointer
                    ${adminTab === 'broadcasting' 
                      ? 'bg-tactical-green/10 border-tactical-green text-tactical-greenLight' 
                      : 'border-transparent text-tactical-gray hover:text-white'}`}
                >
                  Broadcasting Auth
                </button>
                <button
                  onClick={() => setAdminTab('enlistment')}
                  className={`px-3 py-1.5 text-[9px] font-bold uppercase transition-all border rounded-lg cursor-pointer
                    ${adminTab === 'enlistment' 
                      ? 'bg-tactical-green/10 border-tactical-green text-tactical-greenLight' 
                      : 'border-transparent text-tactical-gray hover:text-white'}`}
                >
                  Enlist Operatives
                </button>
                <button
                  onClick={() => {
                    setAdminTab('monitoring');
                    fetchAdminConversations();
                  }}
                  className={`px-3 py-1.5 text-[9px] font-bold uppercase transition-all border rounded-lg cursor-pointer
                    ${adminTab === 'monitoring' 
                      ? 'bg-tactical-green/10 border-tactical-green text-tactical-greenLight' 
                      : 'border-transparent text-tactical-gray hover:text-white'}`}
                >
                  Secure Chat Monitor
                </button>
                <button
                  onClick={() => {
                    setAdminTab('uploads');
                    fetchAdminUploads(adminUploadsSearch);
                  }}
                  className={`px-3 py-1.5 text-[9px] font-bold uppercase transition-all border rounded-lg cursor-pointer
                    ${adminTab === 'uploads' 
                      ? 'bg-tactical-green/10 border-tactical-green text-tactical-greenLight' 
                      : 'border-transparent text-tactical-gray hover:text-white'}`}
                >
                  Monitor Uploads
                </button>
              </div>
            </div>

            {/* Modal Body Container */}
            <div className="p-6 overflow-y-auto space-y-4 font-mono text-xs flex-1">
              
              {/* TAB 1: Broadcasting Permissions */}
              {adminTab === 'broadcasting' && (
                <div className="space-y-4">
                  <div className="bg-tactical-bg p-3 rounded-xl border border-tactical-border/40 text-[9px] text-tactical-gray leading-normal">
                    Command directives give the active Commander absolute authority to revoke or restore group chat broadcasting permissions for any operative instantly.
                  </div>

                  <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                    {officers.length > 0 ? (
                      officers.map((officer) => {
                        const access = officer.groupChatAccess !== false;
                        const isToggling = updatingAccess === officer.officerId;

                        return (
                          <div key={officer.officerId} className="flex items-center justify-between p-3 bg-slate-950/30 border border-tactical-border/60 rounded-xl">
                            <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0
                                ${officer.status === 'Active' || officer.status === 'In Field' ? 'bg-[#00C853]' : 'bg-tactical-gray'}`}
                              />
                              <div className="min-w-0 flex-1 leading-tight">
                                <p className="font-bold text-white truncate text-[10.5px]">{officer.fullName}</p>
                                <p className="text-[7.5px] text-tactical-gray uppercase mt-0.5">{officer.rank} • {officer.officerId}</p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-3">
                              {isToggling ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-tactical-green" />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleAccess(officer.officerId, access)}
                                  className={`px-3 py-1 rounded text-[8px] font-bold uppercase transition-all border cursor-pointer
                                    ${access 
                                      ? 'bg-[#0f1b15] border-[#00C853]/40 text-[#00C853] hover:bg-[#201212] hover:border-tactical-red/40 hover:text-tactical-redLight' 
                                      : 'bg-[#201212] border-tactical-red/40 text-tactical-redLight hover:bg-[#0f1b15] hover:border-[#00C853]/40 hover:text-[#00C853]'
                                    }`}
                                >
                                  {access ? 'Authorized' : 'Suspended'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-center text-tactical-gray/60 py-4 italic">No other registered officers located.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: Enlist Operatives & Activations */}
              {adminTab === 'enlistment' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  
                  {/* Left Column: Pending Activations */}
                  <div className="space-y-3 bg-tactical-bg/40 border border-tactical-border/60 p-4 rounded-2xl">
                    <h4 className="text-[10px] font-bold text-white uppercase border-b border-tactical-border/40 pb-1.5 flex items-center space-x-1">
                      <Users className="w-3.5 h-3.5 text-amber-500" />
                      <span>Pending Activations ({officers.filter(o => o.status === 'Pending Approval').length})</span>
                    </h4>
                    
                    <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                      {officers.filter(o => o.status === 'Pending Approval').length > 0 ? (
                        officers.filter(o => o.status === 'Pending Approval').map((o) => (
                          <div key={o.officerId} className="p-2.5 bg-slate-950/30 border border-tactical-border/40 rounded-xl space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-bold text-white text-[10px] leading-tight">{o.fullName}</p>
                                <p className="text-[7.5px] text-tactical-gray uppercase mt-0.5">{o.rank} • {o.officerId}</p>
                                <p className="text-[7.5px] text-tactical-gray uppercase leading-none">{o.department}</p>
                              </div>
                              <span className="text-[6px] bg-amber-500/10 border border-amber-500/30 text-amber-400 px-1 py-0.2 rounded font-bold uppercase tracking-wider">Pending</span>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => handleApproveOfficer(o.officerId, o.fullName)}
                              className="w-full py-1 bg-tactical-green hover:bg-opacity-90 text-white rounded text-[8px] font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
                            >
                              Approve & Enroll
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-[9px] text-tactical-gray/60 italic text-center py-8">No pending enlistment directives.</p>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Create Dossier */}
                  <form onSubmit={handleDossierSubmit} className="space-y-3 bg-tactical-bg/40 border border-tactical-border/60 p-4 rounded-2xl">
                    <h4 className="text-[10px] font-bold text-white uppercase border-b border-tactical-border/40 pb-1.5 flex items-center space-x-1">
                      <UserPlus className="w-3.5 h-3.5 text-tactical-green" />
                      <span>Create Operative Dossier</span>
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-2 text-[9px]">
                      <div>
                        <label className="block text-tactical-gray uppercase font-bold mb-0.5">Officer ID</label>
                        <input
                          type="text"
                          required
                          value={dossierData.officerId}
                          onChange={(e) => setDossierData({ ...dossierData, officerId: e.target.value })}
                          placeholder="E.G. OFF-505"
                          className="w-full bg-tactical-bg border border-tactical-border rounded-lg py-1 px-2 text-white focus:outline-none placeholder-tactical-gray/40"
                        />
                      </div>
                      <div>
                        <label className="block text-tactical-gray uppercase font-bold mb-0.5">Password</label>
                        <input
                          type="password"
                          required
                          value={dossierData.password}
                          onChange={(e) => setDossierData({ ...dossierData, password: e.target.value })}
                          placeholder="password123"
                          className="w-full bg-tactical-bg border border-tactical-border rounded-lg py-1 px-2 text-white focus:outline-none placeholder-tactical-gray/40"
                        />
                      </div>
                    </div>

                    <div className="text-[9px]">
                      <label className="block text-tactical-gray uppercase font-bold mb-0.5">Full Name</label>
                      <input
                        type="text"
                        required
                        value={dossierData.fullName}
                        onChange={(e) => setDossierData({ ...dossierData, fullName: e.target.value })}
                        placeholder="Operative Full Name"
                        className="w-full bg-tactical-bg border border-tactical-border rounded-lg py-1 px-2 text-white focus:outline-none placeholder-tactical-gray/40"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[9px]">
                      <div>
                        <label className="block text-tactical-gray uppercase font-bold mb-0.5">Rank</label>
                        <input
                          type="text"
                          required
                          value={dossierData.rank}
                          onChange={(e) => setDossierData({ ...dossierData, rank: e.target.value })}
                          placeholder="E.G. Captain"
                          className="w-full bg-tactical-bg border border-tactical-border rounded-lg py-1 px-2 text-white focus:outline-none placeholder-tactical-gray/40"
                        />
                      </div>
                      <div>
                        <label className="block text-tactical-gray uppercase font-bold mb-0.5">Department</label>
                        <input
                          type="text"
                          required
                          value={dossierData.department}
                          onChange={(e) => setDossierData({ ...dossierData, department: e.target.value })}
                          placeholder="Tactical Ops"
                          className="w-full bg-tactical-bg border border-tactical-border rounded-lg py-1 px-2 text-white focus:outline-none placeholder-tactical-gray/40"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[9px]">
                      <div>
                        <label className="block text-tactical-gray uppercase font-bold mb-0.5">Sat Email</label>
                        <input
                          type="email"
                          required
                          value={dossierData.email}
                          onChange={(e) => setDossierData({ ...dossierData, email: e.target.value })}
                          placeholder="email@miscs.gov.in"
                          className="w-full bg-tactical-bg border border-tactical-border rounded-lg py-1 px-2 text-white focus:outline-none placeholder-tactical-gray/40"
                        />
                      </div>
                      <div>
                        <label className="block text-tactical-gray uppercase font-bold mb-0.5">Sat Phone</label>
                        <input
                          type="text"
                          required
                          value={dossierData.phone}
                          onChange={(e) => setDossierData({ ...dossierData, phone: e.target.value })}
                          placeholder="+91 999..."
                          className="w-full bg-tactical-bg border border-tactical-border rounded-lg py-1 px-2 text-white focus:outline-none placeholder-tactical-gray/40"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={enlisting}
                      className="w-full py-1.5 bg-tactical-green text-white rounded-xl shadow-glowGreen font-bold uppercase text-[9px] transition-all cursor-pointer flex items-center justify-center space-x-1"
                    >
                      {enlisting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>COMMITING DOSSIER...</span>
                        </>
                      ) : (
                        <span>Commit Dossier & Sync</span>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 3: Secure Chat Monitor */}
              {adminTab === 'monitoring' && (
                <div className="space-y-4">
                  {/* Password audit controls */}
                  <div className="flex items-center justify-between border-b border-tactical-border/40 pb-3">
                    <span className="text-[9.5px] text-tactical-gray uppercase font-extrabold tracking-wider">🔒 DIRECT SECURE FEED AUDIT TRAILS</span>
                    <button
                      onClick={async () => {
                        await fetchCredentialsList();
                        onTriggerToast('Retrieved cryptographic audit hashes successfully.', 'success');
                      }}
                      className="px-3.5 py-1.5 bg-tactical-bg border border-tactical-border hover:bg-tactical-green/10 hover:text-tactical-greenLight rounded-lg text-[9px] font-extrabold uppercase font-mono tracking-wider transition-all cursor-pointer"
                    >
                      Audit Hashed Passwords
                    </button>
                  </div>

                  {/* Password Hashes Modal/Popup overlay if fetched */}
                  {credentialsList.length > 0 && (
                    <div className="bg-slate-900 border border-tactical-green/30 p-4 rounded-xl space-y-2">
                      <div className="flex justify-between items-center border-b border-tactical-border/30 pb-1.5">
                        <span className="text-[9.5px] text-tactical-green font-extrabold uppercase flex items-center space-x-1.5">
                          <Lock className="w-3.5 h-3.5 text-tactical-green" />
                          <span>Bcrypt Password Encryption Registry (Zero Decrypted Plaintext)</span>
                        </span>
                        <button onClick={() => setCredentialsList([])} className="text-tactical-gray hover:text-white font-bold uppercase text-[8px] border border-tactical-border rounded px-1.5 py-0.5">Hide</button>
                      </div>
                      <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 text-[8.5px] font-mono leading-none">
                        {credentialsList.map((cred) => (
                          <div key={cred.officerId} className="flex items-center justify-between bg-tactical-bg p-2 rounded border border-tactical-border/40">
                            <div>
                              <p className="font-bold text-white">{cred.fullName}</p>
                              <p className="text-[7.5px] text-tactical-gray uppercase mt-0.5">{cred.rank} • ID: {cred.officerId}</p>
                            </div>
                            <div className="min-w-0 max-w-[50%] font-mono leading-none text-tactical-green truncate select-all" title="Bcrypt encrypted hash">
                              {cred.passwordHash}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Main Grid: conversations left, message history right */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-stretch min-h-[40vh] max-h-[50vh] overflow-hidden">
                    
                    {/* Conversations column (2/5 size) */}
                    <div className="md:col-span-2 border border-tactical-border bg-tactical-bg/40 p-3 rounded-xl flex flex-col max-h-full">
                      <span className="text-[9px] text-tactical-gray uppercase font-bold mb-2">SECURE CONVERSATION PAIRS</span>
                      <div className="overflow-y-auto flex-1 space-y-1.5 pr-1">
                        {loadingAdminConvs ? (
                          <p className="text-center text-tactical-gray py-4">Polling logs...</p>
                        ) : adminConversations.length > 0 ? (
                          adminConversations.map((conv) => {
                            const isSelected = selectedAdminConv?.key === conv.key;
                            return (
                              <button
                                key={conv.key}
                                onClick={() => {
                                  setSelectedAdminConv(conv);
                                  fetchAdminMessages(conv.officerA, conv.officerB);
                                }}
                                className={`w-full p-2 rounded-lg border text-left transition-all cursor-pointer font-mono leading-normal block
                                  ${isSelected 
                                    ? 'bg-slate-900 border-tactical-green/50 text-white font-bold' 
                                    : 'bg-tactical-bg/20 border-tactical-border/40 text-tactical-gray hover:text-white'}`}
                              >
                                <div className="leading-tight truncate">
                                  <p className="font-bold text-[10px] text-white truncate">{conv.officerAName.split(' ').pop()} ↔ {conv.officerBName.split(' ').pop()}</p>
                                  <p className="text-[7px] text-tactical-gray uppercase mt-0.5 truncate">
                                    ID: {conv.officerA} ↔ {conv.officerB} | {conv.messageCount} messages
                                  </p>
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <p className="text-center text-tactical-gray/60 italic py-4 text-[9px]">No direct conversations located.</p>
                        )}
                      </div>
                    </div>

                    {/* Messages history column (3/5 size) */}
                    <div className="md:col-span-3 border border-tactical-border bg-tactical-bg/40 p-3 rounded-xl flex flex-col max-h-full overflow-hidden justify-between">
                      {selectedAdminConv ? (
                        <>
                          <div className="flex justify-between items-center border-b border-tactical-border/40 pb-2 mb-2">
                            <span className="text-[9px] text-white font-bold uppercase truncate max-w-[180px]">
                              SECURE DUMP: {selectedAdminConv.officerAName.split(' ').pop()} ↔ {selectedAdminConv.officerBName.split(' ').pop()}
                            </span>
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="Search..."
                                value={adminChatSearch}
                                onChange={(e) => setAdminChatSearch(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    fetchAdminMessages(selectedAdminConv.officerA, selectedAdminConv.officerB);
                                  }
                                }}
                                className="bg-tactical-bg border border-tactical-border rounded-lg py-0.5 px-2 pl-5 text-[9px] text-white focus:outline-none placeholder-tactical-gray/50 w-24"
                              />
                              <Search className="w-2.5 h-2.5 text-tactical-gray absolute left-1.5 top-1.5" />
                            </div>
                          </div>

                          {/* Message List viewport */}
                          <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0 py-1 font-mono text-[9.5px]">
                            {loadingAdminMsgs ? (
                              <p className="text-center text-tactical-gray py-4">Scanning logs...</p>
                            ) : adminMessages.length > 0 ? (
                              adminMessages.map((msg) => (
                                <div key={msg.messageId} className="p-2 bg-slate-950/20 border border-tactical-border/40 rounded-xl space-y-1 text-left relative group">
                                  <div className="flex justify-between text-[7px] text-tactical-gray">
                                    <span className="font-extrabold text-white">{msg.senderName} ({msg.senderRank})</span>
                                    <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                                  </div>
                                  
                                  <p className="text-white whitespace-pre-wrap">{msg.content}</p>
                                  {msg.isArchived && (
                                    <span className="text-[6.5px] bg-amber-500/10 border border-amber-500/30 text-amber-400 px-1 py-0.2 rounded font-bold uppercase tracking-wider inline-block">Archived</span>
                                  )}
                                  
                                  {/* Delete/Archive hover menu */}
                                  <div className="flex items-center space-x-1.5 mt-1 border-t border-tactical-border/30 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => handleAdminDeleteMessage(msg.messageId, selectedAdminConv.officerA, selectedAdminConv.officerB)}
                                      className="p-0.5 rounded bg-tactical-border hover:bg-tactical-red/10 text-tactical-gray hover:text-tactical-red transition-all cursor-pointer"
                                      title="Expunge message"
                                    >
                                      <Trash className="w-3 h-3 text-tactical-redLight" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAdminArchiveMessage(msg.messageId, msg.isArchived, selectedAdminConv.officerA, selectedAdminConv.officerB)}
                                      className={`p-0.5 rounded bg-tactical-border hover:bg-amber-500/10 transition-all cursor-pointer
                                        ${msg.isArchived ? 'text-amber-500' : 'text-tactical-gray hover:text-amber-500'}`}
                                      title={msg.isArchived ? 'Restore' : 'Archive'}
                                    >
                                      <Archive className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-center text-tactical-gray/60 italic py-4">No classified telemetry logs.</p>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="py-16 text-center text-tactical-gray/60 italic">
                          Classified: Select a secure conversation pair to load communications history dump.
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}

              {/* TAB 4: Monitor Uploaded Files */}
              {adminTab === 'uploads' && (
                <div className="space-y-4 text-left">
                  {/* Search and control bar */}
                  <div className="flex items-center justify-between gap-3 border-b border-tactical-border/40 pb-3">
                    <span className="text-[9.5px] text-tactical-gray uppercase font-extrabold tracking-wider">📁 ALL REGISTERED MEDIA UPLOADS & ATTACHMENTS</span>
                    <div className="relative w-48">
                      <input
                        type="text"
                        placeholder="Search uploads..."
                        value={adminUploadsSearch}
                        onChange={(e) => {
                          setAdminUploadsSearch(e.target.value);
                          fetchAdminUploads(e.target.value);
                        }}
                        className="w-full bg-tactical-bg border border-tactical-border rounded-lg py-1 px-2.5 pl-7 text-[9px] text-white focus:outline-none placeholder-tactical-gray/50"
                      />
                      <Search className="w-3 h-3 text-tactical-gray absolute left-2.5 top-2" />
                    </div>
                  </div>

                  {/* Table/Grid view of uploaded files */}
                  <div className="border border-tactical-border bg-tactical-bg/20 rounded-xl overflow-hidden max-h-[45vh] overflow-y-auto">
                    {loadingAdminUploads ? (
                      <div className="py-12 flex flex-col items-center justify-center space-y-2 text-tactical-gray">
                        <Loader2 className="w-6 h-6 animate-spin text-tactical-green" />
                        <span className="text-[10px] uppercase font-bold tracking-widest">Scanning media storage...</span>
                      </div>
                    ) : adminUploads.length > 0 ? (
                      <table className="w-full border-collapse text-left text-[10px] font-mono">
                        <thead>
                          <tr className="bg-slate-950/40 border-b border-tactical-border text-tactical-gray font-bold uppercase tracking-wider">
                            <th className="px-4 py-2.5">File Packet Details</th>
                            <th className="px-4 py-2.5">Source Node</th>
                            <th className="px-4 py-2.5">Uploaded By</th>
                            <th className="px-4 py-2.5">Timestamp</th>
                            <th className="px-4 py-2.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-tactical-border/30 text-tactical-text">
                          {adminUploads.map((file) => (
                            <tr key={file.id} className="hover:bg-tactical-border/5 transition-all">
                              <td className="px-4 py-3 min-w-0 max-w-[200px]">
                                <div className="leading-tight">
                                  <p className="font-bold text-white truncate" title={file.fileName}>{file.fileName}</p>
                                  <p className="text-[8px] text-tactical-gray uppercase mt-0.5">{file.fileType} • {file.fileSize}</p>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex px-1.5 py-0.2 rounded text-[7.5px] font-bold uppercase border
                                  ${file.source === 'Evidence Locker' 
                                    ? 'bg-[#0f1b15] border-tactical-green/30 text-tactical-green' 
                                    : 'bg-[#0e1726] border-blue-500/20 text-blue-400'}`}>
                                  {file.source}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-white uppercase font-semibold">{file.uploadedBy}</td>
                              <td className="px-4 py-3 text-tactical-gray">{new Date(file.createdAt).toLocaleString()}</td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  <a
                                    href={file.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 rounded bg-tactical-border border border-tactical-border hover:bg-tactical-border/60 text-white transition-all cursor-pointer"
                                    title="View / Download File"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleAdminDeleteUpload(file.source, file.id, file.fileName)}
                                    className="p-1 rounded bg-tactical-border border border-tactical-border hover:bg-tactical-red/10 text-tactical-gray hover:text-tactical-red transition-all cursor-pointer"
                                    title="Expunge File Packet"
                                  >
                                    <Trash className="w-3.5 h-3.5 text-tactical-redLight" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="py-16 text-center text-tactical-gray/60 italic">
                        No uploaded file logs located matching criteria.
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

            <div className="p-6 border-t border-tactical-border bg-slate-950/20 flex justify-end">
              <button
                onClick={() => {
                  setShowAdminPanel(false);
                  setSelectedAdminConv(null);
                  setAdminMessages([]);
                }}
                className="px-5 py-2.5 bg-tactical-border border border-tactical-border hover:bg-tactical-border/80 text-white rounded-xl font-bold cursor-pointer uppercase text-[9px]"
              >
                Apply Comms Directives
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Comms;
