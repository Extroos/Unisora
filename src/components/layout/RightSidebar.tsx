import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../lib/utils';
import { Phone, MoreHorizontal, Mail, MapPin, Calendar, Users, Pin, MessageSquare, Shield, UserMinus, Copy, FileText, Download, Play, Search, UserPlus, Eye, Volume2, Radio, PhoneOff, Video, StickyNote, Pencil, LogOut, Link, ChevronRight, EyeOff, UserX, VolumeX, Hash, Settings } from 'lucide-react';
import { AddMembersModal } from '../modals/AddMembersModal';
import { GroupSettingsModal } from '../modals/GroupSettingsModal';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { motion, AnimatePresence } from 'motion/react';
import { UserPopoverCard } from '../chat/UserPopoverCard';
import { ContextMenu, Dropdown } from '../ui/ContextMenu';

export function RightSidebar() {
  const { servers, activeServerId, activeDmId, users, messages, activeChannelId, togglePinMessage, setActiveDm, setActiveServer, blockUser, startCall, dmChannels, removeParticipantFromGroup, openDialog, currentUser, presences, channels, voiceConnections, changeGroupDmAvatar } = useAppStore();
  const [activeTab, setActiveTab] = useState<'members' | 'pinned' | 'files'>('members');
  const [fileSearch, setFileSearch] = useState('');
  const [isAddMembersModalOpen, setIsAddMembersModalOpen] = useState(false);
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);

  const isDmMode = !activeServerId;
  const activeDmChannel = (isDmMode && activeDmId) ? dmChannels[activeDmId] : null;
  const isGroupDm = !!activeDmChannel;
  const dmUser = (isDmMode && !isGroupDm && activeDmId) ? users[activeDmId] : null;



  // ── DM Profile View (Single User) ──
  if (isDmMode && !isGroupDm) {
    if (!dmUser) return null;
    return (
      <div className="w-[300px] shrink-0 h-full bg-surface-1 border-l border-border hidden xl:flex xl:flex-col">
        <div className="flex-1 overflow-y-auto hidden-scrollbar">
          <div className="h-32 bg-surface-2 relative overflow-hidden group">
            {dmUser.bannerUrl ? (
                <img src={dmUser.bannerUrl} alt="" className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full bg-linear-to-br from-surface-3 to-surface-1" />
            )}
            <div className="absolute -bottom-10 left-6">
              <div className="p-1 bg-surface-1 rounded-2xl inline-block">
                <Avatar src={dmUser.avatarUrl} alt={dmUser.username} size="xl" status={dmUser.status} className="rounded-2xl shadow-md border-none" />
              </div>
            </div>
          </div>
          <div className="pt-14 px-6 pb-6">
            <h2 className="text-lg font-bold text-text-primary tracking-tight">{dmUser.username}</h2>
            <p className="text-xs text-text-tertiary font-medium mt-0.5">{dmUser.customStatus || 'Active now'}</p>
            
            <div className="flex items-center gap-2 mt-6 mb-8">
              <Button variant="primary" size="sm" className="flex-1 h-9 font-bold rounded-lg" onClick={() => setActiveDm(dmUser.id)}>Message</Button>
              <button 
                onClick={() => startCall(dmUser.id, 'audio')}
                className="w-9 h-9 bg-surface-2 hover:bg-surface-3 text-text-secondary rounded-lg flex items-center justify-center transition-colors border border-border" 
              >
                <Phone size={14} />
              </button>
            </div>

            <div className="space-y-6">
              <section>
                <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3">About Me</h4>
                <p className="text-[13px] text-text-secondary leading-relaxed font-medium">
                  {dmUser.bio || 'This user has not provided a biography yet.'}
                </p>
              </section>

              <section className="space-y-3">
                <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Details</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-xs text-text-secondary font-medium">
                    <MapPin size={14} className="text-text-muted" />
                    <span>San Francisco, CA</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-secondary font-medium">
                    <Calendar size={14} className="text-text-muted" />
                    <span>Member since Oct 14, 2023</span>
                  </div>
                </div>
              </section>

              <section className="pt-6 border-t border-border">
                <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3">Mutual Spaces</h4>
                <div className="space-y-2">
                  {servers.slice(0, 3).map(s => (
                    <div 
                      key={s.id} 
                      onClick={() => setActiveServer(s.id)}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2 cursor-pointer transition-colors group"
                    >
                      <div className="w-8 h-8 bg-surface-3 rounded-lg flex items-center justify-center font-bold text-xs text-text-tertiary border border-border overflow-hidden">
                        {s.iconUrl ? <img src={s.iconUrl} className="w-full h-full object-cover" /> : s.name[0]}
                      </div>
                      <span className="text-sm font-medium text-text-secondary group-hover:text-text-primary transition-colors">{s.name}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Server Members View ──
  const activeServer = servers.find(s => s.id === activeServerId);
  const activeChannel = isDmMode ? activeDmChannel : activeServer;

  if (isDmMode && !isGroupDm) return null;
  if (!isDmMode && !activeServer) return null;

  const members = isGroupDm 
    ? activeDmChannel.participants.map(id => users[id]).filter(Boolean)
    : activeServer?.members.map(id => users[id]).filter(Boolean) || [];

  // Helper: build a human-readable presence label for a member
  const getPresenceLabel = (memberId: string): { label: string; icon: 'voice' | 'viewing' | null } => {
    const p = presences[memberId];
    if (!p || !p.isOnline) return { label: '', icon: null };

    // Check if in voice
    const voiceConn = voiceConnections[memberId];
    if (voiceConn) {
      const voiceCh = channels.find(c => c.id === voiceConn.channelId);
      return { label: voiceCh ? `#${voiceCh.name}` : 'Voice', icon: 'voice' };
    }

    return { label: '', icon: null };
  };

  // Sort members: voice → viewing (in this server) → other online → offline
  const sortedMembers = [...members].sort((a, b) => {
    const pa = presences[a.id];
    const pb = presences[b.id];
    const aInVoice = !!voiceConnections[a.id];
    const bInVoice = !!voiceConnections[b.id];
    if (aInVoice !== bInVoice) return aInVoice ? -1 : 1;
    const aActive = pa?.isOnline && !!pa?.activeChannelId;
    const bActive = pb?.isOnline && !!pb?.activeChannelId;
    if (aActive !== bActive) return aActive ? -1 : 1;
    const aOnline = pa?.isOnline || a.status !== 'offline';
    const bOnline = pb?.isOnline || b.status !== 'offline';
    if (aOnline !== bOnline) return aOnline ? -1 : 1;
    return a.username.localeCompare(b.username);
  });

  const currentActiveChannelId = isDmMode ? activeDmId : activeChannelId;
  const offlineMembers = sortedMembers.filter(m => !(presences[m.id]?.isOnline) && m.status === 'offline');

  return (
    <div className="w-[280px] shrink-0 h-full bg-surface-1 border-l border-border hidden xl:flex xl:flex-col">
      {/* Header Tabs */}
      <div className="h-14 flex items-center px-4 border-b border-border shrink-0">
        <div className="flex items-center gap-1 w-full">
          {(['members', 'pinned', 'files'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 flex items-center justify-center py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all",
                activeTab === tab ? "bg-surface-2 text-text-primary" : "text-text-muted hover:text-text-secondary hover:bg-surface-2/40"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto hidden-scrollbar py-4 px-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -5 }}
            transition={{ duration: 0.1 }}
            className="h-full"
          >
        {activeTab === 'members' ? (
          <div className="space-y-6">
            {isGroupDm && activeDmChannel && (
              <div className="px-3 mb-2 space-y-2 select-none">
                <div className="flex items-center justify-between text-[11px] font-sans text-text-muted">
                  <span>Owner: <span className="font-bold text-text-secondary">{users[activeDmChannel.ownerId]?.username || 'Unknown'}</span></span>
                  <button
                    onClick={() => setIsGroupSettingsOpen(true)}
                    className="p-1 rounded hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                    title="Change Group Settings"
                  >
                    <Settings size={13} />
                  </button>
                </div>

                <button 
                  onClick={() => setIsAddMembersModalOpen(true)}
                  className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-all border border-dashed border-border hover:border-text-muted"
                >
                  <div className="w-6 h-6 rounded-full bg-surface-3 flex items-center justify-center">
                    <UserPlus size={12} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Add Friend</span>
                </button>
              </div>
            )}
            {(() => {
              const hoistedRoles = !isGroupDm ? (activeServer?.roles?.filter(r => r.hoist).sort((a, b) => a.id.localeCompare(b.id)) || []) : [];
              const renderedUserIds = new Set<string>();

              const roleGroups = hoistedRoles.map(role => {
                const roleMembers = sortedMembers.filter(m => 
                  (presences[m.id]?.isOnline || m.status !== 'offline') && 
                  activeServer?.memberRoles?.[m.id]?.includes(role.id) &&
                  !renderedUserIds.has(m.id)
                );
                roleMembers.forEach(m => renderedUserIds.add(m.id));
                
                if (roleMembers.length === 0) return null;

                return (
                  <div key={role.id}>
                    <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest px-3 mb-2 flex items-center justify-between">
                       <span>{role.name}</span>
                       <span className="opacity-40">{roleMembers.length}</span>
                    </h4>
                    <div className="space-y-0.5">
                       {roleMembers.map(m => {
                         const pl = getPresenceLabel(m.id);
                         return <MemberItem key={m.id} member={m} roleColor={role.color} presenceLabel={pl.label} presenceIcon={pl.icon} isOnline={presences[m.id]?.isOnline} />;
                       })}
                    </div>
                  </div>
                );
              });

              const remainingOnline = sortedMembers.filter(m => 
                (presences[m.id]?.isOnline || m.status !== 'offline') && 
                !renderedUserIds.has(m.id)
              );
              
              const onlineGroup = remainingOnline.length > 0 ? (
                <div key="online">
                   <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest px-3 mb-2 flex items-center justify-between">
                       <span>Online</span>
                       <span className="opacity-40">{remainingOnline.length}</span>
                    </h4>
                  <div className="space-y-0.5">
                    {remainingOnline.map(m => {
                      const pl = getPresenceLabel(m.id);
                      return (
                        <MemberItem 
                          key={m.id} 
                          member={m}
                          presenceLabel={pl.label}
                          presenceIcon={pl.icon}
                          isOnline={presences[m.id]?.isOnline}
                          onRemove={isGroupDm && activeDmChannel.ownerId === currentUser?.id && m.id !== currentUser?.id ? () => {
                            openDialog({
                              type: 'confirm',
                              title: 'Remove Member',
                              description: `Are you sure you want to remove ${m.username} from the group?`,
                              confirmLabel: 'Remove',
                              isDanger: true,
                              onConfirm: () => removeParticipantFromGroup(activeDmId, m.id)
                            });
                          } : undefined}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : null;

              const offlineGroup = offlineMembers.length > 0 ? (
                <div key="offline">
                   <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest px-3 mb-2 flex items-center justify-between">
                       <span>Offline</span>
                       <span className="opacity-40">{offlineMembers.length}</span>
                    </h4>
                  <div className="space-y-0.5 opacity-50">
                    {offlineMembers.map(m => (
                      <MemberItem 
                        key={m.id} 
                        member={m}
                        isOnline={false}
                        onRemove={isGroupDm && activeDmChannel.ownerId === currentUser?.id && m.id !== currentUser?.id ? () => {
                          openDialog({
                            type: 'confirm',
                            title: 'Remove Member',
                            description: `Are you sure you want to remove ${m.username} from the group?`,
                            confirmLabel: 'Remove',
                            isDanger: true,
                            onConfirm: () => removeParticipantFromGroup(activeDmId, m.id)
                          });
                        } : undefined}
                      />
                    ))}
                  </div>
                </div>
              ) : null;

              return [...roleGroups, onlineGroup, offlineGroup];
            })()}
          </div>
        ) : activeTab === 'pinned' ? (
          (() => {
            const pinnedMsgs = messages.filter(m => m.pinned && m.channelId === currentActiveChannelId);
            if (pinnedMsgs.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Pin size={24} className="text-text-muted mb-2 opacity-40" />
                  <p className="text-xs font-bold text-text-muted uppercase tracking-widest">No Pinned Logs</p>
                </div>
              );
            }
            return (
              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {pinnedMsgs.map(msg => {
                    const user = users[msg.userId];
                    return (
                      <motion.div 
                        key={msg.id} 
                        layout
                        className="p-3 bg-surface-2 border border-border rounded-lg group cursor-pointer"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <Avatar src={user?.avatarUrl} alt={user?.username} size="xs" showStatus={false} />
                          <span className="text-xs font-bold text-text-primary">{user?.username}</span>
                          <button onClick={(e) => { e.stopPropagation(); togglePinMessage(msg.id); }} className="ml-auto p-1 rounded-md text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-all">
                            <Pin size={11} />
                          </button>
                        </div>
                        <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">{msg.content}</p>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            );
          })()
        ) : (
          (() => {
            const channelFiles = messages
              .filter(m => m.channelId === currentActiveChannelId && m.attachments && m.attachments.length > 0)
              .flatMap(m => m.attachments!.map(att => ({ ...att, messageId: m.id, timestamp: m.timestamp })));

            if (channelFiles.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <FileText size={24} className="text-text-muted mb-2 opacity-40" />
                  <p className="text-xs font-bold text-text-muted uppercase tracking-widest">No Shared Assets</p>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                <div className="relative group">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input 
                    type="text" 
                    placeholder="Search files..." 
                    value={fileSearch}
                    onChange={(e) => setFileSearch(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-lg py-1.5 pl-8 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 transition-all" 
                  />
                </div>
                <div className="space-y-1">
                  {channelFiles.filter(f => f.name.toLowerCase().includes(fileSearch.toLowerCase())).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((file, idx) => (
                    <div key={idx} className="p-2.5 bg-surface-2/50 border border-border rounded-lg hover:bg-surface-2 group/file transition-all cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-surface-3 flex items-center justify-center shrink-0 border border-border">
                          {file.type === 'image' ? <Play size={14} className="text-text-muted" /> : <FileText size={14} className="text-text-muted" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-text-primary truncate">{file.name}</p>
                          <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest">{file.size}</p>
                        </div>
                        <button 
                          onClick={() => window.open(file.url, '_blank')}
                          className="p-1.5 rounded hover:bg-surface-3 text-text-muted hover:text-text-primary transition-all opacity-0 group-hover/file:opacity-100"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()
        )}
          </motion.div>
        </AnimatePresence>
      </div>
      {isGroupDm && activeDmId && (
        <>
          <AddMembersModal 
            isOpen={isAddMembersModalOpen} 
            onClose={() => setIsAddMembersModalOpen(false)} 
            dmId={activeDmId} 
          />
          <GroupSettingsModal
            isOpen={isGroupSettingsOpen}
            onClose={() => setIsGroupSettingsOpen(false)}
            dmId={activeDmId}
          />
        </>
      )}
    </div>
  );
}

const MemberItem: React.FC<{ 
  member: any; 
  roleColor?: string; 
  onRemove?: () => void;
  presenceLabel?: string;
  presenceIcon?: 'voice' | 'viewing' | null;
  isOnline?: boolean;
}> = ({ member, roleColor, onRemove, presenceLabel, presenceIcon, isOnline }) => {
  const isOffline = isOnline === false || (isOnline === undefined && member.status === 'offline');
  
  const content = (
    <div className={cn(
      "flex items-center gap-2.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-150 group",
      isOffline ? "hover:bg-surface-2/40" : "hover:bg-surface-2"
    )}>
      <div className="relative shrink-0">
        <Avatar src={member.avatarUrl} alt={member.username} size="sm" status={isOffline ? undefined : member.status} showStatus={!isOffline} />
        {/* Voice pulse ring */}
        {presenceIcon === 'voice' && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-surface-1 animate-pulse" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p 
            className={cn(
              "text-[13px] font-bold truncate transition-colors", 
              isOffline ? "text-text-muted" : "text-text-secondary group-hover:text-text-primary"
            )}
            style={{ color: !isOffline && roleColor ? roleColor : undefined }}
          >
            {member.username}
          </p>
        </div>
        {/* Presence label: voice or viewing channel */}
        {presenceLabel && !isOffline ? (
          <p className="text-[10px] truncate font-semibold tracking-tight flex items-center gap-1 mt-0.5" style={{ color: presenceIcon === 'voice' ? '#3ba55d' : '#5865f2' }}>
            {presenceIcon === 'voice' 
              ? <Volume2 size={9} />
              : <Eye size={9} />}
            {presenceLabel}
          </p>
        ) : (member.activity || member.customStatus) && !isOffline ? (
          <p className="text-[10px] text-text-muted truncate font-medium tracking-tight opacity-90 group-hover:opacity-100 transition-opacity">
            {member.activity ? member.activity.name : member.customStatus}
          </p>
        ) : null}
      </div>
    </div>
  );

  if (onRemove) {
    return (
      <ContextMenu
        items={[
          { id: 'remove', label: 'Remove from Group', icon: <UserMinus size={14} />, danger: true, onClick: onRemove }
        ]}
      >
        <UserPopoverCard userId={member.id} className="block w-full">
          {content}
        </UserPopoverCard>
      </ContextMenu>
    );
  }

  return (
    <UserPopoverCard userId={member.id} className="block w-full">
      {content}
    </UserPopoverCard>
  );
};
