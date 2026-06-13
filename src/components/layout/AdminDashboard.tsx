import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { 
  Users, ShieldAlert, Mail, Key, Edit, RefreshCw, Eye, EyeOff, Check, AlertTriangle, 
  Trash2, X, Search, Activity, Sparkles, Copy, Server, MessageSquare, Cpu, Clock, Layers,
  ToggleLeft, Settings, Megaphone, HelpCircle, Radio, Volume2, Hash, UserPlus, FileText
} from 'lucide-react';
import { User, UserPresence } from '../../types';

interface SystemStats {
  totalServers: number;
  totalChannels: number;
  totalMessages: number;
  nodeVersion: string;
  platform: string;
  uptime: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  dbPath?: string;
  dbFileSize?: number;
  sqliteSize?: number;
  activeConnections?: number;
}

interface AdminServerInfo {
  id: string;
  name: string;
  ownerId: string;
  ownerUsername: string;
  ownerEmail: string;
  channelCount: number;
  memberCount: number;
  description?: string;
  roles?: any[];
  settings?: {
    verification?: boolean;
  };
}

type TabType = 'overview' | 'directory' | 'servers' | 'controls' | 'diagnostics' | 'presence' | 'logs';

export function AdminDashboard() {
  const { currentUser, channels, servers, systemConfig, presences, users: storeUsers } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [adminServers, setAdminServers] = useState<AdminServerInfo[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  
  // Local Config states
  const [allowRegistrations, setAllowRegistrations] = useState(true);
  const [allowGoogleLogin, setAllowGoogleLogin] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [globalBanner, setGlobalBanner] = useState('');

  // UnisoraBOT Broadcast states
  const [broadcastDurationHours, setBroadcastDurationHours] = useState(5);
  const [broadcastContent, setBroadcastContent] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [serverSearchQuery, setServerSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Password Reveal States: Record of userId -> boolean
  const [revealPasswords, setRevealPasswords] = useState<Record<string, boolean>>({});

  // Dialog States
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editNeedsOnboarding, setEditNeedsOnboarding] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editTag, setEditTag] = useState('');
  
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deletingServerId, setDeletingServerId] = useState<string | null>(null);

  const [simulatedEmail, setSimulatedEmail] = useState<{
    to: string;
    subject: string;
    body: string;
  } | null>(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsSearchQuery, setLogsSearchQuery] = useState('');

  // Create User Modal States
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPasswordState, setNewPasswordState] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newBio, setNewBio] = useState('');
  const [newAvatarUrl, setNewAvatarUrl] = useState('');

  // Fetch all users
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users', {
        headers: {
          'Content-Type': 'application/json',
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        }
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data);
      } else {
        setError(data.error || 'Failed to fetch user database');
      }
    } catch (err) {
      console.error(err);
      setError('Network error occurred while fetching users');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all servers
  const fetchAdminServers = async () => {
    try {
      const res = await fetch('/api/admin/servers', {
        headers: {
          'Content-Type': 'application/json',
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        }
      });
      const data = await res.json();
      if (res.ok) {
        setAdminServers(data);
      }
    } catch (err) {
      console.error('Error fetching admin servers:', err);
    }
  };

  // Fetch system statistics & configuration
  const fetchSystemStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/admin/system-stats', {
        headers: {
          'Content-Type': 'application/json',
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        }
      });
      const data = await res.json();
      if (res.ok) {
        setSystemStats(data);
      }
      
      // Also fetch bootstrap config
      const bootRes = await fetch('/api/bootstrap', {
        headers: {
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        }
      });
      const bootData = await bootRes.json();
      if (bootRes.ok && bootData.systemConfig) {
        setAllowRegistrations(bootData.systemConfig.allowRegistrations);
        setAllowGoogleLogin(bootData.systemConfig.allowGoogleLogin);
        setMaintenanceMode(bootData.systemConfig.maintenanceMode);
        setGlobalBanner(bootData.systemConfig.globalAnnouncementBanner || '');
      }
    } catch (err) {
      console.error('Error fetching system stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch('/api/admin/audit-logs', {
        headers: {
          'Content-Type': 'application/json',
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        }
      });
      const data = await res.json();
      if (res.ok) {
        setAuditLogs(data);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchAdminServers();
    fetchSystemStats();
    fetchAuditLogs();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        },
        body: JSON.stringify({
          username: newUsername,
          email: newEmail,
          password: newPasswordState,
          tag: newTag || undefined,
          bio: newBio || undefined,
          avatarUrl: newAvatarUrl || undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Successfully created user ${newUsername}`);
        setIsCreatingUser(false);
        setNewUsername('');
        setNewEmail('');
        setNewPasswordState('');
        setNewTag('');
        setNewBio('');
        setNewAvatarUrl('');
        fetchUsers();
        fetchAuditLogs();
      } else {
        setError(data.error || 'Failed to create user');
      }
    } catch (err) {
      console.error(err);
      setError('Network error creating user');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard`);
  };

  const showToast = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Save config setting
  const handleSaveConfig = async (updates: any) => {
    setError(null);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (res.ok) {
        showToast('System configuration successfully updated');
        if (updates.allowRegistrations !== undefined) setAllowRegistrations(updates.allowRegistrations);
        if (updates.allowGoogleLogin !== undefined) setAllowGoogleLogin(updates.allowGoogleLogin);
        if (updates.maintenanceMode !== undefined) setMaintenanceMode(updates.maintenanceMode);
        if (updates.globalAnnouncementBanner !== undefined) setGlobalBanner(updates.globalAnnouncementBanner || '');
        // Instant sync
        useAppStore.getState().bootstrap();
      } else {
        setError(data.error || 'Failed to update configuration');
      }
    } catch (err) {
      console.error(err);
      setError('Network error saving configuration');
    }
  };

  const handleToggleVerification = async (serverId: string) => {
    try {
      const res = await fetch(`/api/admin/servers/${serverId}/toggle-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.verified ? 'Space verified successfully' : 'Space verification removed');
        fetchAdminServers();
        // Instant sync
        useAppStore.getState().bootstrap();
      } else {
        setError(data.error || 'Failed to toggle verification');
      }
    } catch (err) {
      console.error(err);
      setError('Network error toggling space verification');
    }
  };

  // Perform Update User Details
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        },
        body: JSON.stringify({
          username: editUsername,
          email: editEmail,
          needsOnboarding: editNeedsOnboarding,
          bio: editBio,
          tag: editTag
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Successfully updated details for ${editUsername}`);
        setEditingUser(null);
        fetchUsers();
      } else {
        setError(data.error || 'Failed to update user');
      }
    } catch (err) {
      console.error(err);
      setError('Network error updating user details');
    } finally {
      setLoading(false);
    }
  };

  // Perform Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    if (newPassword.trim().length < 4) {
      setError('Password must be at least 4 characters long');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${resettingUser.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        },
        body: JSON.stringify({ newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Successfully changed password for ${resettingUser.username}`);
        setResettingUser(null);
        setNewPassword('');
        fetchUsers();
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (err) {
      console.error(err);
      setError('Network error resetting user password');
    } finally {
      setLoading(false);
    }
  };

  // Delete user account
  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${deletingUser.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Successfully deleted account of ${deletingUser.username}`);
        setDeletingUser(null);
        fetchUsers();
        fetchSystemStats();
      } else {
        setError(data.error || 'Failed to delete user');
      }
    } catch (err) {
      console.error(err);
      setError('Network error deleting user');
    } finally {
      setLoading(false);
    }
  };

  // Delete server community
  const handleDeleteServer = async () => {
    if (!deletingServerId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/servers/${deletingServerId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Server permanently deleted');
        setDeletingServerId(null);
        fetchAdminServers();
        fetchSystemStats();
      } else {
        setError(data.error || 'Failed to delete server');
      }
    } catch (err) {
      console.error(err);
      setError('Network error deleting server');
    } finally {
      setLoading(false);
    }
  };

  // Broadcast as UnisoraBOT
  const handleNexusBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastContent.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/broadcast-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        },
        body: JSON.stringify({
          content: broadcastContent,
          durationHours: Number(broadcastDurationHours)
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('System announcement broadcasted successfully');
        setBroadcastContent('');
        useAppStore.getState().bootstrap();
      } else {
        setError(data.error || 'Failed to start broadcast');
      }
    } catch (err) {
      console.error(err);
      setError('Network error starting broadcast');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeBroadcast = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/broadcast-alert/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        }
      });
      const data = await res.json();
      if (res.ok) {
        showToast('System announcement revoked successfully');
        useAppStore.getState().bootstrap();
      } else {
        setError(data.error || 'Failed to revoke broadcast');
      }
    } catch (err) {
      console.error(err);
      setError('Network error revoking broadcast');
    } finally {
      setLoading(false);
    }
  };

  // Send Reset Link Simulation
  const handleSendResetEmail = async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/send-reset-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        }
      });
      const data = await res.json();
      if (res.ok) {
        setSimulatedEmail(data.simulatedEmail);
        showToast(`Simulated reset email dispatched to user`);
      } else {
        setError(data.error || 'Failed to send simulation email');
      }
    } catch (err) {
      console.error(err);
      setError('Network error simulating email');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordReveal = (userId: string) => {
    setRevealPasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  // Format memory
  const formatMB = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  // Format uptime
  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  };

  // Filter lists
  const filteredUsers = users.filter(u => {
    const term = searchQuery.toLowerCase();
    return (
      u.username.toLowerCase().includes(term) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      u.id.toLowerCase().includes(term)
    );
  });

  const filteredServers = adminServers.filter(s => {
    const term = serverSearchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      s.id.toLowerCase().includes(term) ||
      s.ownerUsername.toLowerCase().includes(term)
    );
  });

  // Access check
  if (currentUser?.email !== 'abderrahmanchakkouri@gmail.com') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-surface-0 p-8 text-center h-full">
        <div className="w-16 h-16 bg-danger/10 text-danger rounded-2xl flex items-center justify-center mb-4 border border-danger/20">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-2">Access Denied</h2>
        <p className="text-text-muted max-w-md text-sm">
          You do not have administrative authorization to access the Unisora Dashboard.
        </p>
      </div>
    );
  }

  // Pre-compiled list of channels for NexusBot Broadcaster
  const textChannels = channels.filter(c => c.type === 'text' || c.type === 'announcement');

  const totalEmails = users.filter(u => u.email).length;
  const activeCount = Object.values(presences).filter(p => p.isOnline).length;
  const onboardingCount = users.filter(u => u.needsOnboarding).length;

  return (
    <div className="flex-1 flex h-full bg-surface-0 overflow-hidden text-text-primary">
      
      {/* ── Left Sidebar Navigation (Classic settings layout) ── */}
      <div className="w-60 bg-surface-1 border-r border-border flex flex-col p-4 shrink-0 select-none">
        <div className="px-2.5 py-3 mb-4">
          <div className="flex items-center gap-1.5 text-text-muted text-[10px] font-extrabold uppercase tracking-wider">
            <Sparkles size={11} className="text-accent animate-pulse" /> Owner Administration
          </div>
          <h2 className="text-md font-bold text-text-primary mt-1">Unisora Settings</h2>
        </div>

        <nav className="flex-1 space-y-1">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${activeTab === 'overview' ? 'bg-surface-3 text-text-primary' : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'}`}
          >
            <Activity size={14} />
            <span>Overview & Health</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('directory')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${activeTab === 'directory' ? 'bg-surface-3 text-text-primary' : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'}`}
          >
            <Users size={14} />
            <span>User Directory</span>
          </button>

          <button 
            onClick={() => setActiveTab('servers')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${activeTab === 'servers' ? 'bg-surface-3 text-text-primary' : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'}`}
          >
            <Server size={14} />
            <span>Space Management</span>
          </button>

          <button 
            onClick={() => setActiveTab('controls')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${activeTab === 'controls' ? 'bg-surface-3 text-text-primary' : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'}`}
          >
            <Settings size={14} />
            <span>System Controls</span>
          </button>

          <button 
            onClick={() => setActiveTab('diagnostics')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${activeTab === 'diagnostics' ? 'bg-surface-3 text-text-primary' : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'}`}
          >
            <Cpu size={14} />
            <span>System Diagnostics</span>
          </button>

          <button 
            onClick={() => setActiveTab('presence')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${activeTab === 'presence' ? 'bg-surface-3 text-text-primary' : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'}`}
          >
            <Radio size={14} className={activeTab === 'presence' ? 'text-success animate-pulse' : ''} />
            <span>Live Presence</span>
            {Object.values(presences).filter(p => p.isOnline).length > 0 && (
              <span className="ml-auto text-[9px] font-black bg-success/15 text-success px-1.5 py-0.5 rounded-full">
                {Object.values(presences).filter(p => p.isOnline).length}
              </span>
            )}
          </button>

          <button 
            onClick={() => {
              setActiveTab('logs');
              fetchAuditLogs();
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${activeTab === 'logs' ? 'bg-surface-3 text-text-primary' : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'}`}
          >
            <FileText size={14} />
            <span>Audit Logs</span>
          </button>
        </nav>

        <div className="border-t border-border pt-3 mt-auto flex flex-col gap-2">
          <Button 
            variant="secondary" 
            size="sm" 
            className="w-full text-[10px] h-8 tracking-wider uppercase bg-surface-3"
            onClick={() => {
              fetchUsers();
              fetchAdminServers();
              fetchSystemStats();
              fetchAuditLogs();
            }}
            loading={loading || statsLoading || logsLoading}
            icon={<RefreshCw size={10} />}
          >
            Sync State
          </Button>
        </div>
      </div>

      {/* ── Right Content Panel (Standard settings main body) ── */}
      <div className="flex-1 flex flex-col h-full bg-surface-2 overflow-y-auto hidden-scrollbar p-8">
        
        {/* Dynamic header per tab */}
        <div className="mb-6 pb-4 border-b border-border flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-text-primary">
              {activeTab === 'overview' && 'System Overview'}
              {activeTab === 'directory' && 'User Account Directory'}
              {activeTab === 'servers' && 'Space & Community Manager'}
              {activeTab === 'controls' && 'Global System Configuration'}
              {activeTab === 'diagnostics' && 'Engine Diagnostics'}
              {activeTab === 'presence' && 'Live User Presence'}
              {activeTab === 'logs' && 'System Audit Logs'}
            </h1>
            <p className="text-[11px] text-text-muted mt-0.5">
              {activeTab === 'overview' && 'Service counters and global workspace volume metrics.'}
              {activeTab === 'directory' && 'Search, update, reset, or delete client profiles.'}
              {activeTab === 'servers' && 'Inspect and moderate all server spaces created on the network.'}
              {activeTab === 'controls' && 'Configure registrations, broadcast announcements, and toggle maintenance mode.'}
              {activeTab === 'diagnostics' && 'Real-time Node process resource metrics and environment.'}
              {activeTab === 'presence' && 'Real-time view of which users are online and what channel they are viewing.'}
              {activeTab === 'logs' && 'Inspect historical system events, security logs, and user modifications.'}
            </p>
          </div>
        </div>

        {/* Success toast */}
        {successMessage && (
          <div className="mb-6 bg-green-500/10 text-green-500 border border-green-500/20 text-xs px-4 py-3 rounded-lg flex items-center gap-2 animate-fadeIn shadow-lg shrink-0">
            <Check size={14} className="shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="mb-6 bg-danger/10 text-danger border border-danger/20 text-xs px-4 py-3 rounded-lg flex items-start gap-2.5 shrink-0">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">System Alert</p>
              <p>{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-text-muted hover:text-text-primary">
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── TAB CONTENT: OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-surface-1 border border-border rounded-xl p-4">
                <div className="text-[9px] uppercase font-bold tracking-widest text-text-muted">Total Accounts</div>
                <div className="text-xl font-bold text-text-primary mt-1">{users.length}</div>
              </div>
              <div className="bg-surface-1 border border-border rounded-xl p-4">
                <div className="text-[9px] uppercase font-bold tracking-widest text-text-muted">Verified Emails</div>
                <div className="text-xl font-bold text-text-primary mt-1">{totalEmails}</div>
              </div>
              <div className="bg-surface-1 border border-border rounded-xl p-4">
                <div className="text-[9px] uppercase font-bold tracking-widest text-text-muted">Active Sessions</div>
                <div className="text-xl font-bold text-text-primary mt-1 text-green-500">{activeCount}</div>
              </div>
              <div className="bg-surface-1 border border-border rounded-xl p-4">
                <div className="text-[9px] uppercase font-bold tracking-widest text-text-muted">Onboard Pending</div>
                <div className="text-xl font-bold text-text-primary mt-1 text-yellow-500">{onboardingCount}</div>
              </div>
            </div>

            {systemStats && (
              <div className="bg-surface-1 border border-border rounded-xl p-6 space-y-4">
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Server size={14} className="text-accent" /> Workspace Database Stats
                </h3>
                <div className="grid grid-cols-3 gap-6 pt-2">
                  <div className="border-l-2 border-accent/40 pl-4 space-y-0.5">
                    <div className="text-[10px] text-text-muted uppercase font-bold">Servers Created</div>
                    <div className="text-lg font-bold text-text-primary">{systemStats.totalServers}</div>
                  </div>
                  <div className="border-l-2 border-accent/40 pl-4 space-y-0.5">
                    <div className="text-[10px] text-text-muted uppercase font-bold">Total Channels</div>
                    <div className="text-lg font-bold text-text-primary">{systemStats.totalChannels}</div>
                  </div>
                  <div className="border-l-2 border-accent/40 pl-4 space-y-0.5">
                    <div className="text-[10px] text-text-muted uppercase font-bold">Message Volume</div>
                    <div className="text-lg font-bold text-text-primary">{systemStats.totalMessages}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Live Presence Snapshot in Overview */}
            {Object.keys(presences).length > 0 && (
              <div className="bg-surface-1 border border-border rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Radio size={14} className="text-success animate-pulse" /> Live Presence Snapshot
                  </h3>
                  <button 
                    onClick={() => setActiveTab('presence')}
                    className="text-[10px] text-accent font-bold hover:underline"
                  >
                    View All →
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.values(presences)
                    .filter(p => p.isOnline)
                    .slice(0, 8)
                    .map(p => {
                      const u = storeUsers[p.userId];
                      if (!u) return null;
                      const viewCh = p.activeChannelId ? channels.find(c => c.id === p.activeChannelId) : null;
                      return (
                        <div key={p.userId} className="flex items-center gap-3 bg-surface-2 border border-border/60 rounded-lg p-2.5 hover:border-border-hover transition-colors">
                          <div className="relative shrink-0">
                            <img src={u.avatarUrl} alt={u.username} className="w-8 h-8 rounded-md border border-border object-cover" />
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-surface-2 bg-success animate-pulse" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-text-primary truncate">{u.username}</p>
                            <p className="text-[10px] text-text-muted truncate mt-0.5">
                              {u.activity ? (
                                <span className="text-text-secondary font-medium">🎮 {u.activity.name}</span>
                              ) : viewCh ? (
                                <span className="text-accent">#{viewCh.name}</span>
                              ) : (
                                <span>Online</span>
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB CONTENT: LIVE PRESENCE ── */}
        {activeTab === 'presence' && (
          <div className="space-y-4 flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-text-muted font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse inline-block" />
                  {Object.values(presences).filter(p => p.isOnline).length} online now
                </span>
                <span>·</span>
                <span>{Object.keys(presences).length} total tracked</span>
              </div>
            </div>

            <div className="bg-surface-1 border border-border rounded-xl overflow-hidden min-h-0 flex-1 flex flex-col">
              <div className="overflow-auto hidden-scrollbar flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-surface-3/30 text-[9px] font-extrabold uppercase tracking-widest text-text-muted select-none">
                      <th className="px-4 py-3.5">User</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5">Current Activity</th>
                      <th className="px-4 py-3.5">Location</th>
                      <th className="px-4 py-3.5">Last Seen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {Object.values(presences).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-10 text-xs text-text-muted">
                          No presence data yet. Users will appear here after they connect.
                        </td>
                      </tr>
                    ) : (
                      Object.values(presences)
                        .sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0))
                        .map(p => {
                          const u = storeUsers[p.userId];
                          if (!u) return null;
                          const viewCh = p.activeChannelId ? channels.find(c => c.id === p.activeChannelId) : null;
                          const viewServer = p.activeServerId ? servers.find(s => s.id === p.activeServerId) : null;
                          const diff = p.lastSeen ? Math.floor((Date.now() - new Date(p.lastSeen).getTime()) / 60000) : null;
                          const lastSeenLabel = diff === null ? '—' : diff < 1 ? 'Just now' : diff < 60 ? `${diff}m ago` : `${Math.floor(diff/60)}h ago`;
                          
                          return (
                            <tr key={p.userId} className="hover:bg-surface-3/20 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="relative shrink-0">
                                    <img src={u.avatarUrl} alt={u.username} className="w-7 h-7 rounded-md border border-border object-cover animate-none" />
                                    <span className={cn(
                                      "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface-1",
                                      p.isOnline ? 'bg-success' : 'bg-text-muted'
                                    )} />
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-text-primary flex items-center gap-1">
                                      {u.username}
                                      <span className="text-[10px] text-text-muted font-bold ml-0.5 opacity-60">#{u.tag || u.id.slice(-4)}</span>
                                    </p>
                                    <p className="text-[9px] text-text-muted font-mono">{u.id}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={cn(
                                  "text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border",
                                  p.isOnline 
                                    ? 'bg-success/10 text-success border-success/20'
                                    : 'bg-surface-3 text-text-muted border-border'
                                )}>
                                  {p.isOnline ? 'Online' : 'Offline'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {u.activity ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs">
                                      {u.activity.type === 'coding' ? '💻' : u.activity.type === 'playing' ? '🎮' : u.activity.type === 'listening' ? '🎵' : '📺'}
                                    </span>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-text-primary leading-tight truncate">{u.activity.name}</p>
                                      <p className="text-[10px] text-text-muted truncate capitalize">{u.activity.type}</p>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-text-muted italic">No active game/application</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="space-y-0.5">
                                  {viewServer && (
                                    <div className="text-xs text-text-secondary font-bold truncate">
                                      🏛️ {viewServer.name}
                                    </div>
                                  )}
                                  {viewCh ? (
                                    <div className="flex items-center gap-1 text-accent font-semibold text-[11px]">
                                      <Hash size={10} />
                                      <span>{viewCh.name}</span>
                                    </div>
                                  ) : p.activeDmId ? (
                                    <div className="text-[11px] text-text-secondary italic">
                                      💬 Direct Message
                                    </div>
                                  ) : (
                                    !viewServer && <span className="text-[11px] text-text-muted">—</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-xs text-text-muted font-mono">{lastSeenLabel}</span>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB CONTENT: AUDIT LOGS ── */}
        {activeTab === 'logs' && (
          <div className="space-y-4 flex flex-col flex-1 min-h-0">
            <div className="flex gap-3 items-center">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input 
                  type="text" 
                  placeholder="Search audit logs by action, executor, target, or space name..." 
                  value={logsSearchQuery}
                  onChange={(e) => setLogsSearchQuery(e.target.value)}
                  className="w-full bg-surface-1 border border-border rounded-xl py-2 pl-9 pr-10 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-all"
                />
                {logsSearchQuery && (
                  <button onClick={() => setLogsSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                    <X size={14} />
                  </button>
                )}
              </div>
              <Button 
                variant="secondary"
                size="sm"
                onClick={fetchAuditLogs}
                loading={logsLoading}
                icon={<RefreshCw size={12} />}
                className="shrink-0 text-xs py-2 px-4 h-9 font-bold border border-border hover:border-border-hover rounded-xl"
              >
                Refresh Logs
              </Button>
            </div>

            <div className="bg-surface-1 border border-border rounded-xl overflow-hidden min-h-0 flex-1 flex flex-col">
              <div className="overflow-auto hidden-scrollbar flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-surface-3/30 text-[9px] font-extrabold uppercase tracking-widest text-text-muted select-none">
                      <th className="px-4 py-3.5">Action</th>
                      <th className="px-4 py-3.5">Executor</th>
                      <th className="px-4 py-3.5">Target</th>
                      <th className="px-4 py-3.5">Space</th>
                      <th className="px-4 py-3.5">Timestamp</th>
                      <th className="px-4 py-3.5">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {auditLogs.filter(log => {
                      const query = logsSearchQuery.toLowerCase();
                      return (
                        (log.executorName || '').toLowerCase().includes(query) ||
                        (log.targetName || '').toLowerCase().includes(query) ||
                        (log.action || '').toLowerCase().includes(query) ||
                        (log.serverName || '').toLowerCase().includes(query)
                      );
                    }).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-xs text-text-muted">
                          {logsLoading ? 'Loading audit logs...' : 'No matching audit logs found.'}
                        </td>
                      </tr>
                    ) : (
                      auditLogs.filter(log => {
                        const query = logsSearchQuery.toLowerCase();
                        return (
                          (log.executorName || '').toLowerCase().includes(query) ||
                          (log.targetName || '').toLowerCase().includes(query) ||
                          (log.action || '').toLowerCase().includes(query) ||
                          (log.serverName || '').toLowerCase().includes(query)
                        );
                      }).map(log => {
                        const dateLabel = new Date(log.timestamp).toLocaleString();
                        return (
                          <tr key={log.id} className="hover:bg-surface-3/20 transition-colors text-xs">
                            <td className="px-4 py-3 font-semibold">
                              <span className={cn(
                                "text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border",
                                log.action.includes('CREATE') ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                log.action.includes('DELETE') ? 'bg-danger/10 text-danger border-danger/20' :
                                log.action.includes('UPDATE') ? 'bg-accent/10 text-accent border-accent/20' :
                                'bg-surface-3 text-text-muted border-border'
                              )}>
                                {log.action}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-text-primary">
                              <span className="font-bold">{log.executorName}</span>
                              <span className="text-[10px] text-text-muted font-mono block">{log.executorId}</span>
                            </td>
                            <td className="px-4 py-3 text-text-secondary font-medium">
                              {log.targetName ? (
                                <>
                                  <span>{log.targetName}</span>
                                  {log.targetId && <span className="text-[10px] text-text-muted font-mono block">{log.targetId}</span>}
                                </>
                              ) : (
                                <span className="text-text-muted italic">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-medium text-text-secondary">
                              {log.serverName}
                            </td>
                            <td className="px-4 py-3 text-text-muted font-mono">
                              {dateLabel}
                            </td>
                            <td className="px-4 py-3 select-all text-[11px] font-mono text-text-muted max-w-xs truncate" title={log.changes ? JSON.stringify(log.changes, null, 2) : ''}>
                              {log.changes ? JSON.stringify(log.changes) : '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB CONTENT: DIRECTORY ── */}
        {activeTab === 'directory' && (
          <div className="space-y-4 flex flex-col flex-1 min-h-0">
            <div className="flex gap-3 items-center">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input 
                  type="text" 
                  placeholder="Search user accounts by username, email address, or user ID..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface-1 border border-border rounded-xl py-2 pl-9 pr-10 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-all"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                    <X size={14} />
                  </button>
                )}
              </div>
              <Button 
                variant="primary"
                size="sm"
                onClick={() => setIsCreatingUser(true)}
                icon={<UserPlus size={14} />}
                className="shrink-0 text-xs py-2 px-4 h-9 font-bold bg-accent hover:bg-accent-hover text-white rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                Create Account
              </Button>
            </div>

            <div className="bg-surface-1 border border-border rounded-xl overflow-hidden min-h-0 flex-1 flex flex-col">
              <div className="overflow-auto hidden-scrollbar flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-surface-3/30 text-[9px] font-extrabold uppercase tracking-widest text-text-muted select-none">
                      <th className="px-4 py-3.5">Username</th>
                      <th className="px-4 py-3.5">Email</th>
                      <th className="px-4 py-3.5">Credentials / Auth</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-10 text-xs text-text-muted">
                          No users found matching query.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(user => {
                        const hasPassword = !!user.password;
                        const isGoogleLinked = !!user.googleId;
                        const isRevealed = revealPasswords[user.id] || false;
                        
                        return (
                          <tr key={user.id} className="hover:bg-surface-3/20 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <img 
                                  src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`} 
                                  alt={user.username} 
                                  className="w-8 h-8 rounded-md bg-surface-2 border border-border shrink-0 object-cover"
                                />
                                <div>
                                  <div className="text-xs font-bold text-text-primary flex items-center gap-1">
                                    {user.username}
                                    <span className="text-[10px] text-text-muted font-bold ml-0.5 opacity-60">#{user.tag || user.id.slice(-4)}</span>
                                    {user.email === 'abderrahmanchakkouri@gmail.com' && (
                                      <span className="bg-accent/15 text-accent text-[8px] font-black px-1 rounded uppercase">
                                        Owner
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[9px] text-text-muted font-mono leading-none">{user.id}</div>
                                  {user.location && <span className="text-[9px] text-text-muted block">📍 {user.location}</span>}
                                  {user.bio && <span className="text-[9px] text-text-muted italic block truncate max-w-[180px]" title={user.bio}>"{user.bio}"</span>}
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              {user.email ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-text-secondary font-mono">{user.email}</span>
                                  <button onClick={() => handleCopy(user.email || '', 'Email')} className="p-0.5 text-text-muted hover:text-text-primary rounded" title="Copy Email">
                                    <Copy size={11} />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[9px] text-text-muted italic">No Email Linked</span>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                {hasPassword ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] font-mono bg-surface-2 px-1.5 py-0.5 rounded border border-border text-text-muted select-all max-w-[120px] truncate">
                                      {isRevealed ? user.password : '••••••••••••••••'}
                                    </span>
                                    <button 
                                      onClick={() => togglePasswordReveal(user.id)} 
                                      className="p-0.5 text-text-muted hover:text-text-primary rounded"
                                    >
                                      {isRevealed ? <EyeOff size={11} /> : <Eye size={11} />}
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[9px] text-text-muted block font-mono">
                                    (No Local Password)
                                  </span>
                                )}
                                
                                <div className="flex gap-1">
                                  {isGoogleLinked && (
                                    <span className="text-[7px] font-black text-green-500 bg-green-500/10 px-1 py-0.2 rounded border border-green-500/15 uppercase">
                                      Google Auth
                                    </span>
                                  )}
                                  {hasPassword && isGoogleLinked && (
                                    <span className="text-[7px] font-black text-accent bg-accent/15 px-1 py-0.2 rounded border border-accent/20 uppercase font-sans">
                                      Dual-Mode
                                    </span>
                                  )}
                                  {hasPassword && !isGoogleLinked && (
                                    <span className="text-[7px] font-black text-text-secondary bg-surface-2 px-1 py-0.2 rounded border border-border uppercase font-sans">
                                      Local Account
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className={cn(
                                    "w-1.5 h-1.5 rounded-full inline-block",
                                    user.status === 'online' ? 'bg-success' :
                                    user.status === 'idle' ? 'bg-yellow-500' :
                                    user.status === 'dnd' ? 'bg-danger' : 'bg-text-muted animate-pulse'
                                  )} />
                                  <span className="text-[10px] font-bold text-text-secondary uppercase">{user.status}</span>
                                </div>
                                {user.customStatus && (
                                  <p className="text-[9px] text-text-muted italic max-w-[130px] truncate" title={user.customStatus}>
                                    💬 {user.customStatus}
                                  </p>
                                )}
                                <div>
                                  {user.needsOnboarding ? (
                                    <span className="text-[7px] font-black text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.2 rounded uppercase block w-fit">
                                      Onboard Pending
                                    </span>
                                  ) : (
                                    <span className="text-[7px] font-black text-green-500 bg-green-500/10 border border-green-500/20 px-1.5 py-0.2 rounded uppercase block w-fit">
                                      Completed
                                    </span>
                                  )}
                                </div>
                                <div className="text-[9px] text-text-muted font-mono leading-none">
                                  Joined: {user.joinedAt || 'Unknown'}
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button 
                                  onClick={() => {
                                    setEditingUser(user);
                                    setEditUsername(user.username);
                                    setEditEmail(user.email || '');
                                    setEditNeedsOnboarding(user.needsOnboarding || false);
                                    setEditBio(user.bio || '');
                                    setEditTag(user.tag || '');
                                  }}
                                  className="px-2 py-1 rounded bg-surface-3 hover:bg-surface-4 text-text-secondary hover:text-text-primary text-[10px] font-bold border border-border hover:border-border-hover transition-all"
                                >
                                  Edit
                                </button>
                                <button 
                                  disabled={!!user.googleId && !user.password}
                                  onClick={() => {
                                    setResettingUser(user);
                                    setNewPassword('');
                                  }}
                                  className={cn(
                                    "px-2 py-1 rounded text-[10px] font-bold border transition-all",
                                    (user.googleId && !user.password)
                                      ? "bg-surface-1 text-text-muted border-border cursor-not-allowed opacity-55"
                                      : "bg-surface-3 hover:bg-surface-4 text-text-secondary hover:text-text-primary border-border hover:border-border-hover"
                                  )}
                                  title={user.googleId && !user.password ? "Cannot reset password for Google OAuth accounts" : "Configure Credentials"}
                                >
                                  Credentials
                                </button>
                                {user.email && (
                                  <button 
                                    disabled={!!user.googleId && !user.password}
                                    onClick={() => handleSendResetEmail(user.id)}
                                    className={cn(
                                      "px-2 py-1 rounded text-[10px] font-bold border transition-all",
                                      (user.googleId && !user.password)
                                        ? "bg-surface-1 text-text-muted border-border cursor-not-allowed opacity-55"
                                        : "bg-surface-3 hover:bg-surface-4 text-text-secondary hover:text-text-primary border-border hover:border-border-hover"
                                    )}
                                    title={user.googleId && !user.password ? "Cannot reset password for Google OAuth accounts" : "Simulate password reset email"}
                                  >
                                    Reset Link
                                  </button>
                                )}
                                {user.email !== 'abderrahmanchakkouri@gmail.com' && (
                                  <button 
                                    onClick={() => setDeletingUser(user)}
                                    className="p-1 rounded bg-danger/10 hover:bg-danger/20 text-danger border border-danger/10 hover:border-danger/25 transition-all shrink-0"
                                    title="Delete Account"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB CONTENT: SPACE MANAGEMENT ── */}
        {activeTab === 'servers' && (
          <div className="space-y-4 flex flex-col flex-1 min-h-0">
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input 
                type="text" 
                placeholder="Search server spaces by name, owner, or space ID..." 
                value={serverSearchQuery}
                onChange={(e) => setServerSearchQuery(e.target.value)}
                className="w-full bg-surface-1 border border-border rounded-xl py-2 pl-9 pr-10 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-all"
              />
              {serverSearchQuery && (
                <button onClick={() => setServerSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="bg-surface-1 border border-border rounded-xl overflow-hidden min-h-0 flex-1 flex flex-col">
              <div className="overflow-auto hidden-scrollbar flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-surface-3/30 text-[9px] font-extrabold uppercase tracking-widest text-text-muted select-none">
                      <th className="px-4 py-3.5">Space / Server</th>
                      <th className="px-4 py-3.5">Owner Credentials</th>
                      <th className="px-4 py-3.5">Structure Details</th>
                      <th className="px-4 py-3.5">Audience & Security</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredServers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-10 text-xs text-text-muted">
                          No servers or spaces found.
                        </td>
                      </tr>
                    ) : (
                      filteredServers.map(serverInfo => {
                        const serverCategories = useAppStore.getState().categories.filter(cat => cat.serverId === serverInfo.id);
                        return (
                          <tr key={serverInfo.id} className="hover:bg-surface-3/20 transition-colors">
                            <td className="px-4 py-3 text-xs font-bold text-text-primary">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded bg-surface-3 flex items-center justify-center border border-border">
                                  <span className="text-[10px] uppercase font-black">{serverInfo.name.substring(0, 2)}</span>
                                </div>
                                <div>
                                  <div>{serverInfo.name}</div>
                                  <div className="text-[9px] text-text-muted font-mono leading-none">{serverInfo.id}</div>
                                  {serverInfo.description && (
                                    <div className="text-[9px] text-text-muted font-normal italic mt-0.5 max-w-[200px] truncate" title={serverInfo.description}>
                                      "{serverInfo.description}"
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-xs text-text-secondary font-semibold">{serverInfo.ownerUsername}</div>
                              <div className="text-[9px] text-text-muted font-mono leading-none">{serverInfo.ownerEmail}</div>
                            </td>
                            <td className="px-4 py-3 text-xs text-text-secondary">
                              <div className="font-semibold text-text-primary">{serverInfo.channelCount} Channels</div>
                              <div className="text-[9px] text-text-muted font-mono leading-none mt-0.5">{serverCategories.length} Categories</div>
                            </td>
                            <td className="px-4 py-3 text-xs text-text-secondary">
                              <div className="font-semibold text-text-primary">{serverInfo.memberCount} Members</div>
                              <div className="text-[9px] text-text-muted font-mono leading-none mt-0.5">{(serverInfo as any).roles?.length || 0} Roles defined</div>
                            </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button 
                                onClick={() => handleToggleVerification(serverInfo.id)}
                                className={cn(
                                  "px-2 py-1 rounded text-[10px] font-bold border transition-all",
                                  serverInfo.settings?.verification 
                                    ? "bg-green-500/10 hover:bg-green-500/20 text-green-500 border-green-500/25"
                                    : "bg-surface-3 hover:bg-surface-4 text-text-secondary border-border"
                                )}
                              >
                                {serverInfo.settings?.verification ? 'Verified' : 'Verify Space'}
                              </button>
                              <button 
                                onClick={() => setDeletingServerId(serverInfo.id)}
                                className="px-2 py-1 rounded bg-danger/10 hover:bg-danger/20 text-danger border border-danger/10 hover:border-danger/25 text-[10px] font-bold transition-all"
                              >
                                Destroy Space
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB CONTENT: SYSTEM CONTROLS ── */}
        {activeTab === 'controls' && (
          <div className="space-y-8">
            
            {/* Toggles section */}
            <div className="bg-surface-1 border border-border rounded-xl p-6 space-y-5">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Settings size={14} className="text-accent" /> System Gates
              </h3>
              
              <div className="divide-y divide-border/40">
                <div className="flex items-center justify-between py-3.5">
                  <div>
                    <div className="text-xs font-bold text-text-primary">Maintenance / Lockdown Mode</div>
                    <div className="text-[10px] text-text-muted mt-0.5">Disconnects users (except you) and replaces views with a maintenance board</div>
                  </div>
                  <input 
                    type="checkbox"
                    checked={maintenanceMode}
                    onChange={(e) => handleSaveConfig({ maintenanceMode: e.target.checked })}
                    className="w-4 h-4 rounded text-accent bg-surface-2 border-border focus:ring-accent"
                  />
                </div>

                <div className="flex items-center justify-between py-3.5">
                  <div>
                    <div className="text-xs font-bold text-text-primary">Allow Local Account Registrations</div>
                    <div className="text-[10px] text-text-muted mt-0.5">Allow/Disallow guest visitors to sign up using email and password</div>
                  </div>
                  <input 
                    type="checkbox"
                    checked={allowRegistrations}
                    onChange={(e) => handleSaveConfig({ allowRegistrations: e.target.checked })}
                    className="w-4 h-4 rounded text-accent bg-surface-2 border-border focus:ring-accent"
                  />
                </div>

                <div className="flex items-center justify-between py-3.5">
                  <div>
                    <div className="text-xs font-bold text-text-primary">Allow Google OAuth Registrations</div>
                    <div className="text-[10px] text-text-muted mt-0.5">Allow/Disallow creating new accounts through Google Authentication</div>
                  </div>
                  <input 
                    type="checkbox"
                    checked={allowGoogleLogin}
                    onChange={(e) => handleSaveConfig({ allowGoogleLogin: e.target.checked })}
                    className="w-4 h-4 rounded text-accent bg-surface-2 border-border focus:ring-accent"
                  />
                </div>
              </div>
            </div>

            {/* Global announcement alert config */}
            <div className="bg-surface-1 border border-border rounded-xl p-6 space-y-4">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Megaphone size={14} className="text-accent" /> Global Broadcast Banner
              </h3>
              
              <div className="text-[10px] text-text-muted leading-relaxed">
                Publish a global announcement bar that appears at the top of the viewport for every user logged into the application.
              </div>

              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={globalBanner}
                  onChange={(e) => setGlobalBanner(e.target.value)}
                  placeholder="e.g. Unisora scheduled update happening tonight at 11 PM UTC!"
                  className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                />
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={() => handleSaveConfig({ globalAnnouncementBanner: globalBanner || null })}
                >
                  Publish Alert
                </Button>
                {globalBanner && (
                  <Button 
                    variant="danger" 
                    size="sm" 
                    onClick={() => {
                      setGlobalBanner('');
                      handleSaveConfig({ globalAnnouncementBanner: null });
                    }}
                  >
                    Clear Alert
                  </Button>
                )}
              </div>
            </div>

            {/* UnisoraBOT Announcement Sender */}
            <div className="bg-surface-1 border border-border rounded-xl p-6 space-y-4">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-accent" /> UnisoraBOT Broadcaster
              </h3>
              
              <div className="text-[10px] text-text-muted leading-relaxed">
                Deploy a temporary, non-deletable <strong>App Announcements</strong> category and channel at the top of everyone's sidebar.
              </div>

              {systemConfig?.activeBroadcast ? (
                <div className="bg-surface-2 border border-border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-accent flex items-center gap-1">
                      <Clock size={12} /> Active Announcement
                    </span>
                    <span className="text-[9px] text-text-muted font-bold font-mono">
                      Expires: {new Date(systemConfig.activeBroadcast.expiresAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-text-primary bg-surface-1 p-2.5 rounded border border-border/50 max-h-32 overflow-y-auto select-text font-sans whitespace-pre-wrap">
                    {systemConfig.activeBroadcast.content}
                  </div>
                  <div className="flex justify-end pt-1">
                    <Button 
                      type="button" 
                      variant="danger" 
                      size="sm" 
                      loading={loading} 
                      onClick={handleRevokeBroadcast}
                    >
                      Stop & Revoke Announcement
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleNexusBroadcast} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-extrabold uppercase tracking-wider text-text-muted mb-1">Duration (Hours)</label>
                      <select 
                        value={broadcastDurationHours} 
                        onChange={(e) => setBroadcastDurationHours(Number(e.target.value))}
                        required
                        className="w-full bg-surface-2 border border-border rounded-lg py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-accent font-sans"
                      >
                        {Array.from({ length: 20 }, (_, i) => i + 5).map(h => (
                          <option key={h} value={h}>{h} Hours</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-extrabold uppercase tracking-wider text-text-muted mb-1">Message Content</label>
                    <textarea 
                      value={broadcastContent}
                      onChange={(e) => setBroadcastContent(e.target.value)}
                      placeholder="Type official app news announcement content here..."
                      rows={4}
                      required
                      className="w-full bg-surface-2 border border-border rounded-lg py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-accent resize-none font-sans"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" variant="primary" size="sm" loading={loading} disabled={!broadcastContent.trim()}>
                      Deploy Announcement
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ── TAB CONTENT: DIAGNOSTICS ── */}
        {activeTab === 'diagnostics' && systemStats && (
          <div className="space-y-6">
            <div className="bg-surface-1 border border-border rounded-xl p-6 space-y-4">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Cpu size={14} className="text-accent" /> Runtime Environment
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-2">
                <div className="space-y-0.5">
                  <div className="text-[9px] text-text-muted uppercase font-bold">Node.js Engine</div>
                  <div className="text-sm font-bold text-text-primary font-mono">{systemStats.nodeVersion}</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-[9px] text-text-muted uppercase font-bold">OS Platform</div>
                  <div className="text-sm font-bold text-text-primary font-mono uppercase">{systemStats.platform}</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-[9px] text-text-muted uppercase font-bold">Process Uptime</div>
                  <div className="text-sm font-bold text-text-primary font-mono">{formatUptime(systemStats.uptime)}</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-[9px] text-text-muted uppercase font-bold">Engine Uptime</div>
                  <div className="text-sm font-bold text-text-primary font-mono">Stable</div>
                </div>
              </div>
            </div>

            <div className="bg-surface-1 border border-border rounded-xl p-6 space-y-4">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={14} className="text-accent" /> Node Engine Memory Monitor
              </h3>
              
              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-text-secondary">RSS (Resident Set Size)</span>
                    <span className="font-mono text-text-primary font-bold">{formatMB(systemStats.memoryUsage.rss)}</span>
                  </div>
                  <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                    <div className="h-full bg-accent/80 rounded-full" style={{ width: '45%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-text-secondary">Heap Memory Used</span>
                    <span className="font-mono text-text-primary font-bold">
                      {formatMB(systemStats.memoryUsage.heapUsed)} <span className="text-[10px] text-text-muted">/ {formatMB(systemStats.memoryUsage.heapTotal)}</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500/80 rounded-full transition-all duration-500" 
                      style={{ width: `${(systemStats.memoryUsage.heapUsed / systemStats.memoryUsage.heapTotal) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-text-secondary">External Memory bindings</span>
                    <span className="font-mono text-text-primary font-bold">{formatMB(systemStats.memoryUsage.external)}</span>
                  </div>
                  <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500/80 rounded-full" style={{ width: '12%' }}></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-surface-1 border border-border rounded-xl p-6 space-y-4">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Server size={14} className="text-accent" /> System Storage & Active Links
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="bg-surface-2 border border-border/60 rounded-xl p-4 space-y-2">
                  <div className="text-[10px] text-text-muted uppercase font-bold">Local JSON Cache Database</div>
                  <div className="text-xs font-mono text-text-secondary select-all truncate" title={systemStats.dbPath}>{systemStats.dbPath || 'Unknown path'}</div>
                  <div className="text-xs text-text-primary font-bold">
                    Size: {systemStats.dbFileSize ? (systemStats.dbFileSize / 1024).toFixed(2) + ' KB' : '0.00 KB'}
                  </div>
                </div>

                <div className="bg-surface-2 border border-border/60 rounded-xl p-4 space-y-2">
                  <div className="text-[10px] text-text-muted uppercase font-bold">Prisma Better-SQLite3 Database</div>
                  <div className="text-xs font-mono text-text-secondary">./prisma/dev.db</div>
                  <div className="text-xs text-text-primary font-bold">
                    Size: {systemStats.sqliteSize ? (systemStats.sqliteSize / 1024).toFixed(2) + ' KB' : '0.00 KB'}
                  </div>
                </div>
              </div>

              <div className="border-t border-border/40 pt-4 flex items-center justify-between text-xs text-text-secondary">
                <span>Active Connection Sessions:</span>
                <span className="font-bold text-success font-mono">{systemStats.activeConnections || 0} online users</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── DIALOG MODALS ── */}

      {/* Destroy Server Confirmation Modal */}
      {deletingServerId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[999] backdrop-blur-xs animate-fadeIn">
          <div className="bg-surface-1 border border-border w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-slideUp">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-danger flex items-center gap-1.5">
                <Trash2 size={14} /> Permanently Delete Space
              </h3>
              <button onClick={() => setDeletingServerId(null)} className="text-text-muted hover:text-text-primary">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3.5 bg-danger/5 border border-danger/15 rounded-lg text-xs leading-normal text-danger flex gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <div>
                  Warning: Deleting this space will permanently delete all channels, category arrangements, audit logs, and message buffers within it. This action is irreversible.
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="ghost" size="sm" onClick={() => setDeletingServerId(null)}>
                  Cancel
                </Button>
                <Button type="button" variant="danger" size="sm" onClick={handleDeleteServer} loading={loading}>
                  Confirm Destruction
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit details modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[999] backdrop-blur-xs">
          <div className="bg-surface-1 border border-border w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                <Edit size={14} className="text-text-muted" /> Edit User Profile
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-text-muted hover:text-text-primary">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="p-5 space-y-4">
              <div>
                <label className="block text-[9px] font-extrabold uppercase tracking-wider text-text-muted mb-1">Username</label>
                <input 
                  type="text" 
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  required
                  className="w-full bg-surface-2 border border-border rounded-lg py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-accent font-sans"
                />
              </div>

              <div>
                <label className="block text-[9px] font-extrabold uppercase tracking-wider text-text-muted mb-1">Tag</label>
                <input 
                  type="text" 
                  value={editTag}
                  onChange={(e) => setEditTag(e.target.value)}
                  required
                  className="w-full bg-surface-2 border border-border rounded-lg py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-accent font-sans font-mono"
                />
              </div>

              <div>
                <label className="block text-[9px] font-extrabold uppercase tracking-wider text-text-muted mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-lg py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-accent font-sans"
                />
              </div>

              <div>
                <label className="block text-[9px] font-extrabold uppercase tracking-wider text-text-muted mb-1">Bio / Profile Description</label>
                <textarea 
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={2}
                  className="w-full bg-surface-2 border border-border rounded-lg py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-accent resize-none font-sans"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-surface-2 border border-border rounded-lg">
                <div>
                  <div className="text-xs font-bold text-text-primary">Requires Onboarding Update</div>
                  <div className="text-[9px] text-text-muted mt-0.5">Force username/avatar selector popup on next login</div>
                </div>
                <input 
                  type="checkbox"
                  checked={editNeedsOnboarding}
                  onChange={(e) => setEditNeedsOnboarding(e.target.checked)}
                  className="w-4 h-4 rounded bg-surface-3 border-border text-accent focus:ring-accent"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={loading}>
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set Password modal */}
      {resettingUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[999] backdrop-blur-xs">
          <div className="bg-surface-1 border border-border w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                <Key size={14} className="text-text-muted" /> Configure Password Credentials
              </h3>
              <button onClick={() => setResettingUser(null)} className="text-text-muted hover:text-text-primary">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="p-5 space-y-4">
              {resettingUser.googleId && (
                <div className="p-3.5 bg-accent/5 border border-accent/20 rounded-lg text-xs leading-normal text-text-secondary flex gap-2">
                  <Sparkles size={16} className="text-accent shrink-0 mt-0.5" />
                  <div>
                    This user connects with Google OAuth. Assigning a password here enables <strong>Dual-Mode Login</strong>. They can log in via Google OR using their email and this password.
                  </div>
                </div>
              )}

              <div className="p-3.5 bg-yellow-500/5 border border-yellow-500/15 rounded-lg text-xs leading-normal text-yellow-500 flex gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <div>
                  This directly alters the password hash for <strong>{resettingUser.username}</strong> immediately.
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-extrabold uppercase tracking-wider text-text-muted mb-1">Set Password</label>
                <input 
                  type="text" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 4 characters"
                  required
                  className="w-full bg-surface-2 border border-border rounded-lg py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-accent font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="ghost" size="sm" onClick={() => setResettingUser(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={loading}>
                  Save Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[999] backdrop-blur-xs">
          <div className="bg-surface-1 border border-border w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-danger flex items-center gap-1.5">
                <Trash2 size={14} /> Delete Account
              </h3>
              <button onClick={() => setDeletingUser(null)} className="text-text-muted hover:text-text-primary">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3.5 bg-danger/5 border border-danger/15 rounded-lg text-xs leading-normal text-danger flex gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <div>
                  Warning: Deleting <strong>{deletingUser.username}</strong> permanently removes their profile and all workspace settings. This cannot be undone.
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="ghost" size="sm" onClick={() => setDeletingUser(null)}>
                  Cancel
                </Button>
                <Button type="button" variant="danger" size="sm" onClick={handleDeleteUser} loading={loading}>
                  Confirm Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Simulated Email Modal */}
      {simulatedEmail && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[999] backdrop-blur-xs">
          <div className="bg-surface-1 border border-border w-full max-w-lg rounded-xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                <Mail size={14} /> Simulated Reset Email
              </h3>
              <button onClick={() => setSimulatedEmail(null)} className="text-text-muted hover:text-text-primary">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3.5 bg-surface-2 border border-border rounded-lg text-xs space-y-2 text-text-secondary">
                <div className="flex gap-2">
                  <span className="font-bold w-12 text-text-muted">To:</span>
                  <span className="text-text-primary font-mono">{simulatedEmail.to}</span>
                </div>
                <div className="flex gap-2 border-t border-border/40 pt-2">
                  <span className="font-bold w-12 text-text-muted">Subject:</span>
                  <span className="text-text-primary font-semibold">{simulatedEmail.subject}</span>
                </div>
              </div>

              <div className="bg-surface-2 border border-border p-4 rounded-lg text-xs font-mono text-text-secondary leading-relaxed whitespace-pre-wrap select-text">
                {simulatedEmail.body}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="primary" size="sm" onClick={() => setSimulatedEmail(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {isCreatingUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[999] backdrop-blur-xs animate-fadeIn">
          <div className="bg-surface-1 border border-border w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-slideUp">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                <UserPlus size={14} className="text-accent" /> Create New Local Account
              </h3>
              <button 
                onClick={() => setIsCreatingUser(false)} 
                className="text-text-muted hover:text-text-primary"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-5 space-y-4">
              <div>
                <label className="block text-[9px] font-extrabold uppercase tracking-wider text-text-muted mb-1">Username *</label>
                <input 
                  type="text" 
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. johndoe"
                  required
                  className="w-full bg-surface-2 border border-border rounded-lg py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-accent font-sans"
                />
              </div>

              <div>
                <label className="block text-[9px] font-extrabold uppercase tracking-wider text-text-muted mb-1">Tag (Optional)</label>
                <input 
                  type="text" 
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="4-digit number e.g. 1337"
                  maxLength={4}
                  className="w-full bg-surface-2 border border-border rounded-lg py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-accent font-sans font-mono"
                />
              </div>

              <div>
                <label className="block text-[9px] font-extrabold uppercase tracking-wider text-text-muted mb-1">Email Address *</label>
                <input 
                  type="email" 
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. john@example.com"
                  required
                  className="w-full bg-surface-2 border border-border rounded-lg py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-accent font-sans"
                />
              </div>

              <div>
                <label className="block text-[9px] font-extrabold uppercase tracking-wider text-text-muted mb-1">Password *</label>
                <input 
                  type="password" 
                  value={newPasswordState}
                  onChange={(e) => setNewPasswordState(e.target.value)}
                  placeholder="Minimum 4 characters"
                  required
                  minLength={4}
                  className="w-full bg-surface-2 border border-border rounded-lg py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-accent font-sans"
                />
              </div>

              <div>
                <label className="block text-[9px] font-extrabold uppercase tracking-wider text-text-muted mb-1">Custom Avatar URL (Optional)</label>
                <input 
                  type="url" 
                  value={newAvatarUrl}
                  onChange={(e) => setNewAvatarUrl(e.target.value)}
                  placeholder="Leave blank for auto-generated bot avatar"
                  className="w-full bg-surface-2 border border-border rounded-lg py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-accent font-sans"
                />
              </div>

              <div>
                <label className="block text-[9px] font-extrabold uppercase tracking-wider text-text-muted mb-1">Bio (Optional)</label>
                <textarea 
                  value={newBio}
                  onChange={(e) => setNewBio(e.target.value)}
                  placeholder="Just joined Unisora!"
                  rows={2}
                  className="w-full bg-surface-2 border border-border rounded-lg py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-accent resize-none font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsCreatingUser(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="primary" 
                  size="sm" 
                  loading={loading}
                >
                  Create User
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
