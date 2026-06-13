import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Modal } from '../ui/Modal';
import { Hash, Volume2, Shield, Trash2, Save, X, Megaphone, Lock, Globe, Info, Settings, UserPlus, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Channel, Role } from '../../types';
import { motion, AnimatePresence } from 'motion/react';

interface ChannelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelId: string;
}

type TabType = 'overview' | 'permissions' | 'invites' | 'integrations';

export function ChannelSettingsModal({ isOpen, onClose, channelId }: ChannelSettingsModalProps) {
  const { channels, updateChannel, deleteChannel, servers, openDialog } = useAppStore();
  const channel = channels.find(c => c.id === channelId);
  const server = servers.find(s => s.id === channel?.serverId);
  
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [hasChanges, setHasChanges] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    topic: '',
    slowMode: 0,
    nsfw: false,
    bitrate: 64000,
    userLimit: 0,
    isPrivate: false,
    region: 'auto',
    permissions: {} as Record<string, string[]>,
  });

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  useEffect(() => {
    if (channel) {
      setFormData({
        name: channel.name || '',
        topic: channel.description || '',
        slowMode: channel.slowMode || 0,
        nsfw: channel.nsfw || false,
        bitrate: channel.bitrate || 64000,
        userLimit: channel.userLimit || 0,
        isPrivate: channel.isPrivate || false,
        region: channel.region || 'auto',
        permissions: channel.permissions || {},
      });
      if (server && server.roles.length > 0) {
        setSelectedRoleId(server.roles[0].id);
      }
    }
  }, [channel, server]);

  useEffect(() => {
    if (!channel) return;
    const changed = 
      formData.name !== (channel.name || '') ||
      formData.topic !== (channel.description || '') ||
      formData.slowMode !== (channel.slowMode || 0) ||
      formData.nsfw !== (channel.nsfw || false) ||
      formData.bitrate !== (channel.bitrate || 64000) ||
      formData.userLimit !== (channel.userLimit || 0) ||
      formData.isPrivate !== (channel.isPrivate || false) ||
      formData.region !== (channel.region || 'auto') ||
      JSON.stringify(formData.permissions) !== JSON.stringify(channel.permissions || {});
    setHasChanges(changed);
  }, [formData, channel]);

  if (!channel || !server) return null;

  const handleSave = () => {
    updateChannel(channelId, {
      name: formData.name,
      description: formData.topic,
      slowMode: formData.slowMode,
      nsfw: formData.nsfw,
      bitrate: formData.bitrate,
      userLimit: formData.userLimit,
      isPrivate: formData.isPrivate,
      region: formData.region,
      permissions: formData.permissions,
    });
    setHasChanges(false);
  };

  const handleReset = () => {
    setFormData({
      name: channel.name || '',
      topic: channel.description || '',
      slowMode: channel.slowMode || 0,
      nsfw: channel.nsfw || false,
      bitrate: channel.bitrate || 64000,
      userLimit: channel.userLimit || 0,
      isPrivate: channel.isPrivate || false,
      region: channel.region || 'auto',
      permissions: channel.permissions || {},
    });
  };

  const togglePermission = (roleId: string, permission: string) => {
    setFormData(prev => {
      const rolePerms = prev.permissions[roleId] || [];
      const newRolePerms = rolePerms.includes(permission)
        ? rolePerms.filter(p => p !== permission)
        : [...rolePerms, permission];
      
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [roleId]: newRolePerms
        }
      };
    });
  };

  const handleDelete = () => {
    openDialog({
      type: 'confirm',
      title: 'Delete Channel',
      description: `Are you sure you want to delete #${channel.name}? This action cannot be undone.`,
      confirmLabel: 'Delete Channel',
      isDanger: true,
      onConfirm: () => {
        deleteChannel(channelId);
        onClose();
      }
    });
  };

  const isVoice = channel.type === 'voice';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose} 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
          />
          
          {/* Main Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-6xl h-[85vh] min-h-[600px] bg-surface-1 border border-border/50 rounded-xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden flex"
          >
            {/* Sidebar */}
            <div className="w-[260px] bg-surface-2 border-r border-border/50 flex flex-col py-8">
              <div className="px-6 mb-8">
                <h2 className="text-[11px] font-black text-text-muted uppercase tracking-[0.25em] pl-1 mb-1">
                  Channel Settings
                </h2>
                <div className="flex items-center gap-2 px-1">
                  <div className="text-accent">
                    {isVoice ? <Volume2 size={16} /> : <Hash size={16} />}
                  </div>
                  <span className="text-sm font-bold text-text-primary truncate">{channel.name}</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-3 space-y-0.5">
                <SidebarItem 
                  label="Overview" 
                  isActive={activeTab === 'overview'} 
                  onClick={() => setActiveTab('overview')} 
                  icon={<Info size={16} />}
                />
                <SidebarItem 
                  label="Permissions" 
                  isActive={activeTab === 'permissions'} 
                  onClick={() => setActiveTab('permissions')} 
                  icon={<Shield size={16} />}
                />
                <SidebarItem 
                  label="Invites" 
                  isActive={activeTab === 'invites'} 
                  onClick={() => setActiveTab('invites')} 
                  icon={<UserPlus size={16} />}
                />
                <SidebarItem 
                  label="Integrations" 
                  isActive={activeTab === 'integrations'} 
                  onClick={() => setActiveTab('integrations')} 
                  icon={<Zap size={16} />}
                />

                <div className="h-px bg-white/5 mx-3 my-4" />
                
                <button 
                  onClick={handleDelete}
                  className="w-full flex items-center justify-between px-3.5 py-2 rounded text-[12px] font-bold text-danger hover:bg-danger/10 transition-all uppercase tracking-wider group"
                >
                  <div className="flex items-center gap-3">
                    <Trash2 size={14} />
                    Delete Channel
                  </div>
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col bg-surface-1 relative">
              {/* Close UI */}
              <div className="absolute top-6 right-8 z-10 flex flex-col items-center gap-1.5">
                <button 
                  onClick={onClose} 
                  className="w-10 h-10 flex items-center justify-center rounded-full border border-border/50 bg-surface-3/50 hover:bg-surface-3 text-text-tertiary hover:text-white transition-all group"
                >
                  <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                </button>
                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">ESC</span>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="max-w-3xl mx-auto px-12 py-16">
                  {activeTab === 'overview' && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <section>
                        <h3 className="text-xl font-black text-white mb-2 uppercase italic tracking-tighter">Identity & Visibility</h3>
                        <p className="text-xs text-text-secondary font-medium uppercase tracking-wide mb-8">Primary metadata and visibility controls for this channel.</p>
                        
                        <div className="space-y-8 bg-surface-2/30 border border-border/50 rounded-2xl p-8">
                          <div>
                            <label className="block text-[11px] font-black text-text-muted uppercase tracking-[0.2em] mb-3 pl-1">Channel Name</label>
                            <div className="relative group">
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent transition-colors">
                                {isVoice ? <Volume2 size={18} /> : <Hash size={18} />}
                              </div>
                              <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                                className="w-full bg-surface-1 border border-border/50 rounded-xl px-12 py-3 text-[15px] text-text-primary focus:outline-none focus:border-accent/50 focus:ring-4 focus:ring-accent/10 transition-all font-bold"
                              />
                            </div>
                          </div>

                          {!isVoice && (
                            <div>
                              <label className="block text-[11px] font-black text-text-muted uppercase tracking-[0.2em] mb-3 pl-1">Channel Topic</label>
                              <textarea
                                value={formData.topic}
                                onChange={(e) => setFormData(p => ({ ...p, topic: e.target.value }))}
                                placeholder="What's this channel about?"
                                className="w-full bg-surface-1 border border-border/50 rounded-xl px-5 py-4 text-[14px] text-text-primary focus:outline-none focus:border-accent/50 focus:ring-4 focus:ring-accent/10 transition-all h-32 resize-none font-medium leading-relaxed"
                              />
                            </div>
                          )}
                        </div>
                      </section>

                      <div className="h-px bg-border/30" />

                      {isVoice ? (
                        <section className="space-y-12">
                          <div>
                            <h3 className="text-xl font-black text-white mb-2 uppercase italic tracking-tighter">Audio Configuration</h3>
                            <p className="text-xs text-text-secondary font-medium uppercase tracking-wide mb-8">Optimize voice quality and capacity.</p>
                          </div>
                          
                          <div className="space-y-12 bg-surface-2/30 border border-border/50 rounded-2xl p-8">
                            <SliderControl
                              label="Bitrate"
                              value={formData.bitrate}
                              min={8000}
                              max={96000}
                              step={8000}
                              onChange={(v) => setFormData(p => ({ ...p, bitrate: v }))}
                              formatValue={(v) => `${v / 1000}kbps`}
                              description="Higher bitrates improve audio quality but use more bandwidth."
                            />
                            <SliderControl
                              label="User Limit"
                              value={formData.userLimit}
                              min={0}
                              max={99}
                              step={1}
                              onChange={(v) => setFormData(p => ({ ...p, userLimit: v }))}
                              formatValue={(v) => v === 0 ? 'No Limit' : `${v} Users`}
                              description="Limit the number of users who can join this channel."
                            />
                            
                            <div>
                              <div className="space-y-1 mb-4">
                                <label className="text-[11px] font-black text-text-muted uppercase tracking-[0.2em]">Region Override</label>
                                <p className="text-[11px] text-text-secondary font-medium uppercase tracking-tight opacity-60">Override the server's default voice region.</p>
                              </div>
                              <select 
                                value={formData.region}
                                onChange={(e) => setFormData(p => ({ ...p, region: e.target.value }))}
                                className="w-full bg-surface-1 border border-border/50 rounded-xl px-4 py-3 text-[14px] text-text-primary focus:outline-none focus:border-accent/50 focus:ring-4 focus:ring-accent/10 transition-all font-bold appearance-none cursor-pointer"
                              >
                                <option value="auto">Automatic</option>
                                <option value="us-east">US East</option>
                                <option value="us-west">US West</option>
                                <option value="us-central">US Central</option>
                                <option value="us-south">US South</option>
                                <option value="eu-west">Europe West</option>
                                <option value="eu-central">Europe Central</option>
                                <option value="sydney">Sydney</option>
                                <option value="singapore">Singapore</option>
                                <option value="japan">Japan</option>
                              </select>
                            </div>
                          </div>
                        </section>
                      ) : (
                        <section className="space-y-12">
                          <div>
                            <h3 className="text-xl font-black text-white mb-2 uppercase italic tracking-tighter">Text Restrictions</h3>
                            <p className="text-xs text-text-secondary font-medium uppercase tracking-wide mb-8">Control message flow and accessibility.</p>
                          </div>

                          <div className="bg-surface-2/30 border border-border/50 rounded-2xl p-8 space-y-12">
                            <SliderControl
                              label="Slowmode"
                              value={formData.slowMode}
                              min={0}
                              max={21600}
                              step={formData.slowMode < 60 ? 5 : formData.slowMode < 3600 ? 60 : 3600}
                              onChange={(v) => setFormData(p => ({ ...p, slowMode: v }))}
                              formatValue={(v) => {
                                if (v === 0) return 'Off';
                                if (v < 60) return `${v}s`;
                                if (v < 3600) return `${Math.floor(v / 60)}m`;
                                return `${Math.floor(v / 3600)}h`;
                              }}
                              description="Members restricted to sending one message per interval."
                            />

                            <div className="space-y-4">
                              <ToggleControl
                                title="Age-Restricted Channel"
                                description="Users will need to confirm they are 18+ years old to view content."
                                value={formData.nsfw}
                                onChange={(v) => setFormData(p => ({ ...p, nsfw: v }))}
                              />
                              <ToggleControl
                                title="Private Channel"
                                description="Only selected roles and members will be able to view this channel."
                                value={formData.isPrivate}
                                onChange={(v) => setFormData(p => ({ ...p, isPrivate: v }))}
                              />
                            </div>
                          </div>
                        </section>
                      )}
                    </div>
                  )}

                  {activeTab === 'permissions' && (
                    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="mb-10">
                        <h3 className="text-xl font-black text-white mb-2 uppercase italic tracking-tighter">Access Management</h3>
                        <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Manage role-based overrides and specific permissions.</p>
                      </div>

                      <div className="flex bg-surface-2/30 border border-border/50 rounded-2xl overflow-hidden h-[500px]">
                        {/* Role List */}
                        <div className="w-[220px] border-r border-border/50 flex flex-col">
                          <div className="p-4 bg-surface-3/20 border-b border-border/50">
                            <h4 className="text-[10px] font-black text-text-muted uppercase tracking-widest px-2">Roles / Members</h4>
                          </div>
                          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {server.roles.map(role => (
                              <button
                                key={role.id}
                                onClick={() => setSelectedRoleId(role.id)}
                                className={cn(
                                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-bold transition-all",
                                  selectedRoleId === role.id ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-text-tertiary hover:bg-surface-3/50 hover:text-text-secondary"
                                )}
                              >
                                <div className={cn("w-2 h-2 rounded-full", selectedRoleId === role.id ? "bg-white" : "")} style={{ backgroundColor: selectedRoleId === role.id ? undefined : role.color }} />
                                <span className="truncate">{role.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Role Permissions */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-surface-1/30">
                          {selectedRoleId ? (
                            <div className="space-y-8">
                              <div className="flex items-center gap-3 pb-6 border-b border-border/50">
                                <div className="w-10 h-10 rounded-xl bg-surface-3 flex items-center justify-center">
                                  <Shield size={20} className="text-accent" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-black text-white uppercase tracking-wider">
                                    @{server.roles.find(r => r.id === selectedRoleId)?.name}
                                  </h4>
                                  <p className="text-[11px] text-text-muted font-bold uppercase tracking-tight">Channel Override</p>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <PermissionToggle
                                  title="View Channel"
                                  description="Allows members to view this channel."
                                  value={(formData.permissions[selectedRoleId] || []).includes('VIEW_CHANNEL')}
                                  onChange={() => togglePermission(selectedRoleId, 'VIEW_CHANNEL')}
                                />
                                <PermissionToggle
                                  title="Manage Channel"
                                  description="Allows members to edit this channel's settings."
                                  value={(formData.permissions[selectedRoleId] || []).includes('MANAGE_CHANNEL')}
                                  onChange={() => togglePermission(selectedRoleId, 'MANAGE_CHANNEL')}
                                />
                                
                                <div className="h-px bg-border/50 my-6" />
                                
                                {!isVoice ? (
                                  <>
                                    <h5 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4">Text Capabilities</h5>
                                    <div className="space-y-4">
                                      {['SEND_MESSAGES', 'EMBED_LINKS', 'ATTACH_FILES', 'ADD_REACTIONS', 'MANAGE_MESSAGES', 'MENTION_EVERYONE'].map(perm => (
                                        <PermissionToggle
                                          key={perm}
                                          title={perm.replace('_', ' ')}
                                          description={`Grants the ${perm.toLowerCase().replace('_', ' ')} capability.`}
                                          value={(formData.permissions[selectedRoleId] || []).includes(perm)}
                                          onChange={() => togglePermission(selectedRoleId, perm)}
                                        />
                                      ))}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <h5 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4">Voice Capabilities</h5>
                                    <div className="space-y-4">
                                      {['CONNECT', 'SPEAK', 'VIDEO', 'PRIORITY_SPEAKER', 'MOVE_MEMBERS'].map(perm => (
                                        <PermissionToggle
                                          key={perm}
                                          title={perm.replace('_', ' ')}
                                          description={`Grants the ${perm.toLowerCase().replace('_', ' ')} capability.`}
                                          value={(formData.permissions[selectedRoleId] || []).includes(perm)}
                                          onChange={() => togglePermission(selectedRoleId, perm)}
                                        />
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                              <Shield size={64} className="mb-4 text-text-muted" />
                              <p className="text-base font-black text-text-primary uppercase tracking-widest italic">Selection Required</p>
                              <p className="text-xs text-text-muted mt-1 font-bold">Choose a role from the list to manage overrides.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'invites' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <h3 className="text-xl font-black text-white mb-2 uppercase italic tracking-tighter">Direct Invitations</h3>
                      <p className="text-xs text-text-secondary font-medium uppercase tracking-wide mb-8">Review active invite codes leading to this channel.</p>
                      
                      <div className="bg-surface-2/30 border border-border/50 rounded-2xl p-16 text-center">
                        <UserPlus size={48} className="mx-auto text-text-muted/20 mb-4" />
                        <p className="text-text-muted font-bold uppercase tracking-widest text-[11px]">No active invitations</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Unsaved Changes Bar */}
              <AnimatePresence>
                {hasChanges && (
                  <motion.div
                    initial={{ y: 100 }}
                    animate={{ y: 0 }}
                    exit={{ y: 100 }}
                    className="absolute bottom-0 left-0 right-0 bg-surface-overlay backdrop-blur-xl border-t border-white/10 p-4 flex items-center justify-center shadow-[0_-20px_50px_rgba(0,0,0,0.4)] z-50"
                  >
                    <div className="w-full max-w-4xl flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
                        <p className="text-[13px] font-black text-white uppercase tracking-wider italic">Administrative changes pending preservation</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={handleReset}
                          className="px-5 py-2 text-[11px] font-black text-text-secondary hover:text-white transition-all uppercase tracking-widest"
                        >
                          Discard
                        </button>
                        <button 
                          onClick={handleSave}
                          className="px-8 py-2.5 bg-success text-white rounded-lg text-[11px] font-black shadow-xl shadow-success/20 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest"
                        >
                          Preserve Changes
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function SidebarItem({ label, isActive, onClick, icon }: { label: string, isActive: boolean, onClick: () => void, icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3.5 py-2 rounded text-[12px] font-bold transition-all uppercase tracking-wider group",
        isActive 
          ? "bg-accent text-white shadow-lg shadow-accent/20" 
          : "text-text-muted hover:bg-surface-3 hover:text-text-primary"
      )}
    >
      <span className={cn("transition-colors", isActive ? "text-white" : "text-text-muted group-hover:text-text-primary")}>
        {icon}
      </span>
      {label}
    </button>
  );
}

function PermissionToggle({ title, description, value, onChange }: { title: string, description: string, value: boolean, onChange: (v: boolean) => void, key?: any }) {
  return (
    <div className="flex items-start justify-between p-5 bg-surface-2 border border-border/50 rounded-xl hover:border-border transition-all group">
      <div className="pr-4">
        <h4 className="text-[14px] font-black text-text-primary uppercase tracking-tight group-hover:text-white transition-colors">
          {title.replace('_', ' ')}
        </h4>
        <p className="text-[11px] text-text-muted font-medium leading-relaxed mt-1 uppercase tracking-tighter opacity-70 group-hover:opacity-100 transition-opacity">
          {description}
        </p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          "shrink-0 w-12 h-6 rounded-full transition-all relative p-1.5 flex items-center shadow-inner",
          value ? "bg-success shadow-[0_0_15px_rgba(var(--success-rgb),0.3)]" : "bg-surface-3"
        )}
      >
        <div className={cn(
          "w-3.5 h-3.5 bg-white rounded-full transition-all duration-300 shadow-xl",
          value ? "translate-x-5" : "translate-x-0"
        )} />
      </button>
    </div>
  );
}

function ToggleControl({ title, description, value, onChange }: { title: string, description: string, value: boolean, onChange: (v: boolean) => void }) {
  return <PermissionToggle title={title} description={description} value={value} onChange={onChange} />;
}

function SliderControl({ label, value, min, max, step, onChange, formatValue, description }: { 
  label: string, 
  value: number, 
  min: number, 
  max: number, 
  step: number, 
  onChange: (v: number) => void,
  formatValue: (v: number) => string,
  description?: string
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="space-y-1">
          <label className="text-[11px] font-black text-text-muted uppercase tracking-[0.2em]">{label}</label>
          {description && <p className="text-[11px] text-text-secondary font-medium uppercase tracking-tight opacity-60">{description}</p>}
        </div>
        <div className="px-4 py-1.5 bg-accent/10 border border-accent/20 rounded-lg">
          <span className="text-[13px] font-black text-accent tabular-nums">{formatValue(value)}</span>
        </div>
      </div>
      <div className="relative h-6 flex items-center px-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 bg-surface-3 rounded-full appearance-none cursor-pointer accent-accent hover:accent-accent-hover transition-all shadow-inner"
        />
      </div>
      <div className="flex justify-between mt-3 px-1">
        <span className="text-[9px] font-black text-text-muted uppercase tracking-tighter opacity-40">{formatValue(min)}</span>
        <span className="text-[9px] font-black text-text-muted uppercase tracking-tighter opacity-40">{formatValue(max)}</span>
      </div>
    </div>
  );
}

