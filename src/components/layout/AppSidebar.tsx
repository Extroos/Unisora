import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ChevronDown, ChevronRight, MessageSquare, Plus, Search, Layers, Compass, Settings, ShieldAlert, ShieldCheck, Volume2, Hash, Megaphone, Bell, Pencil, Users, Link, LogOut, Trash2, FolderPlus, ArrowRightCircle, Folder, Star, Mic, MicOff, HeadphoneOff, Check, Phone, PhoneOff, Video, Pin, VolumeX, Copy, StickyNote, UserMinus, EyeOff, UserX } from 'lucide-react';
import { DndContext, closestCorners, pointerWithin, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay, DragStartEvent, defaultDropAnimationSideEffects, useDroppable } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Avatar } from '../ui/Avatar';
import { NotificationBadge } from '../ui/Badge';
import { VoiceStatusBar } from '../voice/VoiceStatusBar';
import { ServerSettings } from './ServerSettings';
import { StatusPicker } from '../ui/StatusPicker';
import { CreateChannelModal } from '../modals/CreateChannelModal';
import { CreateFolderModal } from '../modals/CreateFolderModal';
import { ContextMenu } from '../ui/ContextMenu';
import { EditFolderModal } from '../modals/EditFolderModal';
import { CreateGroupDmModal } from '../modals/CreateGroupDmModal';
import { ChannelSettingsModal } from '../modals/ChannelSettingsModal';
import { UserPopoverCard } from '../chat/UserPopoverCard';
import { UserProfileModal } from '../chat/UserProfileModal';
import { CreateInviteModal } from '../modals/CreateInviteModal';



function SortableWorkspaceItem({ 
  id, 
  server, 
  isActive, 
  onClick, 
  mentionCount, 
  folders, 
  moveServerToFolder,
  onCreateCategory,
  onCreateChannel,
  onInvite,
  activeDragId,
  overDragId,
  isUnread,
  onOpenSettings,
  key 
}: { 
  id: string, 
  server: any, 
  isActive: boolean, 
  onClick: () => void, 
  mentionCount: number, 
  folders: any[], 
  moveServerToFolder: (s: string, f: string | null) => void,
  onCreateCategory: (serverId: string) => void,
  onCreateChannel: (serverId: string) => void,
  onInvite: (serverId: string) => void,
  activeDragId?: string | null,
  overDragId?: string | null,
  isUnread?: boolean,
  onOpenSettings?: (serverId: string) => void,
  key?: any 
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.3 : 1,
  };

  const currentUser = useAppStore(state => state.currentUser);
  const getPermissions = useAppStore(state => state.getPermissions);
  const updateServerSettings = useAppStore(state => state.updateServerSettings);

  const isOwner = server.ownerId === currentUser?.id;
  const userPerms = getPermissions(server.id, currentUser?.id || '');
  const isAdmin = userPerms.includes('ADMIN');
  const isOwnerOrAdmin = isOwner || isAdmin;

  const isMuted = server.settings?.isMuted || false;
  const currentNotifPref = server.settings?.notifications || 'mentions';

  const contextMenuItems = [
    {
      id: 'mark-read',
      label: 'Mark as Read',
      onClick: () => {
        const state = useAppStore.getState();
        const serverChannels = state.channels.filter(c => c.serverId === server.id);
        const timestamps = JSON.parse(localStorage.getItem('last_read_timestamps') || '{}');
        serverChannels.forEach(c => {
          timestamps[c.id] = new Date().toISOString();
        });
        localStorage.setItem('last_read_timestamps', JSON.stringify(timestamps));
        useAppStore.setState({ messages: [...state.messages] });
      }
    },
    { divider: true, id: 'd-mark-read', label: '' },
    {
      id: 'invite',
      label: 'Invite to Server',
      onClick: () => onInvite(server.id)
    },
    { divider: true, id: 'd-invite', label: '' },
    isMuted ? {
      id: 'unmute-server',
      label: 'Unmute Server',
      onClick: () => updateServerSettings(server.id, { isMuted: false })
    } : {
      id: 'mute-server',
      label: 'Mute Server',
      rightIcon: <ChevronRight size={14} />,
      submenu: [
        { id: 'mute-15m', label: 'For 15 minutes', onClick: () => updateServerSettings(server.id, { isMuted: true }) },
        { id: 'mute-1h', label: 'For 1 hour', onClick: () => updateServerSettings(server.id, { isMuted: true }) },
        { id: 'mute-8h', label: 'For 8 hours', onClick: () => updateServerSettings(server.id, { isMuted: true }) },
        { id: 'mute-24h', label: 'For 24 hours', onClick: () => updateServerSettings(server.id, { isMuted: true }) },
        { id: 'mute-until-turn', label: 'Until I turn it back on', onClick: () => updateServerSettings(server.id, { isMuted: true }) },
      ]
    },
    {
      id: 'notification-settings',
      label: (
        <>
          <span className="font-semibold text-text-primary">Notification Settings</span>
          <span className="text-[11px] text-text-muted mt-0.5 font-normal">
            {currentNotifPref === 'all' ? 'All Messages' : currentNotifPref === 'nothing' ? 'Nothing' : 'Only @mentions'}
          </span>
        </>
      ),
      rightIcon: <ChevronRight size={14} />,
      submenu: [
        {
          id: 'notif-all',
          label: 'All Messages',
          checked: currentNotifPref === 'all',
          onClick: () => updateServerSettings(server.id, { notifications: 'all' })
        },
        {
          id: 'notif-mentions',
          label: 'Only @mentions',
          checked: currentNotifPref === 'mentions',
          onClick: () => updateServerSettings(server.id, { notifications: 'mentions' })
        },
        {
          id: 'notif-nothing',
          label: 'Nothing',
          checked: currentNotifPref === 'nothing',
          onClick: () => updateServerSettings(server.id, { notifications: 'nothing' })
        }
      ]
    },
    {
      id: 'hide-muted-channels',
      label: 'Hide Muted Channels',
      checked: server.settings?.hideMutedChannels || false,
      onClick: () => updateServerSettings(server.id, { hideMutedChannels: !server.settings?.hideMutedChannels })
    },
    {
      id: 'show-all-channels',
      label: 'Show All Channels',
      checked: server.settings?.showAllChannels !== false,
      onClick: () => updateServerSettings(server.id, { showAllChannels: server.settings?.showAllChannels === false })
    },
    { divider: true, id: 'd-channels-opt', label: '' },
    ...(isOwnerOrAdmin ? [
      {
        id: 'server-settings',
        label: 'Server Settings',
        rightIcon: <ChevronRight size={14} />,
        onClick: () => {
          if (onOpenSettings) onOpenSettings(server.id);
        }
      }
    ] : []),
    {
      id: 'privacy-settings',
      label: 'Privacy Settings',
      onClick: () => {
        useAppStore.getState().openDialog({
          type: 'confirm',
          title: 'Privacy Settings',
          description: 'Manage direct messages and activity status for this server.',
          confirmLabel: 'Done',
          onConfirm: () => {}
        });
      }
    },
    {
      id: 'edit-profile',
      label: 'Edit Per-server Profile',
      onClick: () => {
        useAppStore.getState().setSettingsOpen(true);
      }
    },
    { divider: true, id: 'd-profile-opt', label: '' },
    ...(isOwnerOrAdmin ? [
      {
        id: 'create-channel',
        label: 'Create Channel',
        onClick: () => onCreateChannel(server.id)
      },
      {
        id: 'create-category',
        label: 'Create Category',
        onClick: () => onCreateCategory(server.id)
      },
      {
        id: 'create-event',
        label: 'Create Event',
        onClick: () => {
          useAppStore.getState().openDialog({
            type: 'confirm',
            title: 'Create Event',
            description: 'Server events feature is coming soon!',
            confirmLabel: 'OK',
            onConfirm: () => {}
          });
        }
      },
      { divider: true, id: 'd-admin-footer', label: '' },
      {
        id: 'security-actions',
        label: 'Security Actions',
        danger: true,
        onClick: () => {
          useAppStore.getState().openDialog({
            type: 'confirm',
            title: 'Security Actions',
            description: 'Server security status is nominal.',
            confirmLabel: 'Dismiss',
            onConfirm: () => {}
          });
        }
      }
    ] : [
      {
        id: 'leave-server',
        label: 'Leave Server',
        danger: true,
        onClick: () => {
          useAppStore.getState().openDialog({
            type: 'confirm',
            title: 'Leave Space',
            description: `Are you sure you want to leave "${server.name}"? You will need an invite to rejoin.`,
            confirmLabel: 'Leave Space',
            isDanger: true,
            onConfirm: () => {
              useAppStore.getState().leaveServer(server.id);
            }
          });
        }
      }
    ]),
    { divider: true, id: 'd-footer', label: '' },
    {
      id: 'copy-server-id',
      label: 'Copy Server ID',
      rightIcon: (
        <div className="px-1 py-0.5 text-[10px] font-black rounded bg-surface-3 border border-border text-text-muted flex items-center justify-center shrink-0">
          ID
        </div>
      ),
      onClick: () => {
        navigator.clipboard.writeText(server.id);
      }
    }
  ];

  return (
    <ContextMenu items={contextMenuItems}>
      <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="relative">
        <motion.div
          layout
          className={cn(
            "transition-all border border-transparent relative overflow-hidden"
          )}
        >
          <WorkspaceItem
            name={server.name}
            icon={
              server.iconUrl ? (
                <img src={server.iconUrl} alt={server.name} className="w-4 h-4 rounded-sm object-cover" />
              ) : (
                <div className="w-4 h-4 bg-surface-3 rounded-sm flex items-center justify-center">
                  <span className="text-[8px] font-bold text-text-secondary">{server.name.substring(0, 1)}</span>
                </div>
              )
            }
            isActive={isActive}
            onClick={onClick}
            mentionCount={mentionCount}
            isVerified={server.settings?.verification}
            isUnread={isUnread}
          />
        </motion.div>
      </div>
    </ContextMenu>
  );
}

function FolderDropZone({ 
  folder, 
  children,
  isCollapsed,
  folderServers,
  setEditingFolderId,
  deleteFolder,
  setCollapsedFolders,
  activeDragId,
  overDragId,
  isDragActive
}: {
  folder: any;
  children: React.ReactNode;
  isCollapsed: boolean;
  folderServers: any[];
  setEditingFolderId: (id: string | null) => void;
  deleteFolder: (id: string) => void;
  setCollapsedFolders: React.Dispatch<React.SetStateAction<Set<string>>>;
  activeDragId: string | null;
  overDragId: string | null;
  isDragActive: boolean;
  key?: any;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: folder.id });

  // Highlight when a SERVER is being dragged and it's hovering over THIS folder's sortable id
  const isServerBeingDragged = isDragActive && activeDragId && folderServers.every(s => s.id !== activeDragId);
  const isOverThisFolder = overDragId === folder.id && isServerBeingDragged;
  // Also highlight when hovering over any server inside this folder
  const isOverChildServer = overDragId && folderServers.some(s => s.id === overDragId) && isDragActive;
  const isOverFolderArea = !!(isOverThisFolder || isOverChildServer);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.3 : 1,
    ...(isOverFolderArea ? {
      borderColor: `${folder.color}44`,
      backgroundColor: `${folder.color}10`,
    } : {})
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg p-1.5 transition-all duration-300 border border-transparent relative"
      )}
    >
      <ContextMenu
        items={[
          { id: 'edit', label: 'Edit Folder', icon: <Settings size={14} />, onClick: () => setEditingFolderId(folder.id) },
          { id: 'delete', label: 'Delete Folder', icon: <Trash2 size={14} />, danger: true, onClick: () => deleteFolder(folder.id) }
        ]}
      >
        <button 
          {...attributes}
          {...listeners}
          onClick={() => {
            setCollapsedFolders(prev => {
              const next = new Set(prev);
              if (next.has(folder.id)) next.delete(folder.id);
              else next.add(folder.id);
              return next;
            });
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[11px] font-bold text-text-tertiary hover:bg-surface-3 hover:text-text-secondary transition-all group relative z-10 cursor-grab active:cursor-grabbing"
        >
          <ChevronDown size={12} className={cn("transition-transform duration-300", isCollapsed && "-rotate-90")} />
          {isCollapsed && folderServers.length > 0 ? (
            <div className="flex -space-x-1.5 items-center mr-1 shrink-0">
              {folderServers.slice(0, 3).map(s => (
                <div 
                  key={s.id} 
                  className="w-4 h-4 rounded-full border border-surface-2 bg-surface-3 flex items-center justify-center overflow-hidden shrink-0 shadow-sm"
                  title={s.name}
                >
                  {s.iconUrl ? (
                    <img src={s.iconUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[7px] font-bold text-text-secondary">{s.name[0]}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Folder 
              size={12} 
              style={{ color: folder.color, fill: `${folder.color}33` }} 
              className="shrink-0"
            />
          )}
          <span className="truncate flex-1 text-left uppercase tracking-widest">{folder.name || 'Folder'}</span>
        </button>
      </ContextMenu>
      
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-0.5 overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UngroupedDropZone() {
  const { setNodeRef, isOver } = useDroppable({
    id: 'ungrouped-dropzone',
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg transition-all duration-200 border border-dashed p-3 text-center flex items-center justify-center min-h-[48px]",
        isOver
          ? "border-accent bg-accent/10 text-accent"
          : "border-text-muted/30 bg-surface-3/30 text-text-muted hover:border-accent/50 hover:bg-accent/5"
      )}
    >
      <span className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-1.5 pointer-events-none select-none">
        <ArrowRightCircle size={12} className={cn("rotate-95 transition-transform", isOver && "animate-bounce")} />
        {isOver ? "Release to ungroup" : "Drop here to ungroup"}
      </span>
    </div>
  );
}

function SortableCategory({ id, category, children, onToggle, onAddChannel, isCollapsed }: { id: string, category: any, children: React.ReactNode, onToggle: () => void, onAddChannel: (e: React.MouseEvent) => void, isCollapsed: boolean, key?: any }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="group/cat">
      <ContextMenu
        items={[
          { id: 'rename', label: 'Rename Category', icon: <Pencil size={14} />, onClick: () => {
            useAppStore.getState().openDialog({
              type: 'input',
              title: 'Rename Category',
              description: 'Enter a new name for this category.',
              defaultValue: category.name,
              onConfirm: (newName) => useAppStore.getState().updateCategory(category.id, { name: newName })
            });
          }},
          { id: 'delete', label: 'Delete Category', icon: <Trash2 size={14} />, danger: true, onClick: () => {
             useAppStore.getState().openDialog({
               type: 'confirm',
               title: 'Delete Category',
               description: `Are you sure you want to delete "${category.name}"? All channels within will be removed.`,
               onConfirm: () => useAppStore.getState().deleteCategory(category.id)
             });
          }},
          { divider: true, id: 'd1', label: '' },
          { id: 'add-channel', label: 'Create Channel', icon: <Plus size={14} />, onClick: () => onAddChannel({ stopPropagation: () => {} } as any) }
        ]}
      >
        <h3
          {...attributes}
          {...listeners}
          onClick={onToggle}
          className="text-[10px] uppercase font-bold tracking-widest text-text-muted px-2 py-1.5 flex items-center justify-between group cursor-pointer hover:text-text-secondary transition-colors"
        >
          <div className="flex items-center gap-1">
            <ChevronDown size={10} className={cn("transition-transform duration-200", isCollapsed && "-rotate-90")} />
            {category.name}
          </div>
          <button 
            onClick={onAddChannel} 
            className="p-0.5 rounded-md hover:bg-surface-3 hover:text-text-primary opacity-0 group-hover/cat:opacity-100 transition-all"
          >
            <Plus size={12} />
          </button>
        </h3>
      </ContextMenu>
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden space-y-0.5"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SortableChannel({ id, channel, children }: { id: string, channel: any, children: React.ReactNode, key?: any }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

export function AppSidebar() {
  const { 
    servers, 
    activeServerId, 
    setActiveServer, 
    activeChannelId, 
    setActiveChannel, 
    channels, 
    categories, 
    users, 
    currentUser,
    activeDmId, 
    setActiveDm, 
    setSettingsOpen, 
    isExploreOpen, 
    setExploreOpen, 
    isAdminOpen,
    setAdminOpen,
    voiceState, 
    voiceConnections,
    joinVoiceChannel, 
    setNotificationsOpen, 
    setUserStatus, 
    setCustomStatus, 
    folders, 
    addFolder, 
    deleteFolder, 
    updateFolder,
    moveServerToFolder,
    reorderServers,
    reorderCategories,
    reorderChannels,
    moveChannelToCategory,
    drafts,
    notifications,
    isDraftsOpen,
    setDraftsOpen,
    dmChannels,
    openDialog,
    leaveGroupDm,
    renameGroupDm,
    sidebarOrder,
    setSidebarOrder,
    systemConfig,
    messages,
    updateServerSettings,
    getPermissions,
    callState,
    startCall,
    hangupCall,
    leaveVoiceChannel,
    blockUser,
    removeFriend,
    friends,
    blockedUsers,
    incomingRequests,
    setFriendTab,
    pinnedDms,
    pinDm,
    unpinDm,
    ignoredUsers,
    ignoreUser,
    unignoreUser,
    mutedUsers,
    muteUser,
    unmuteUser,
    isUserMuted,
    userNotes,
    setUserNote,
    userNicknames,
    setUserNickname,
    closedDms,
    closeDm,
    openDm,
  } = useAppStore();

  const isChannelUnread = useCallback((channelId: string, serverId?: string) => {
    if (activeChannelId === channelId || activeDmId === channelId) return false;
    
    if (serverId) {
      const server = servers.find(s => s.id === serverId);
      const pref = server?.settings?.notifications || 'all';
      if (pref === 'nothing') return false;

      // If server is muted, only unread mentions trigger the unread badge
      if (server?.settings?.isMuted) {
        const myUsername = currentUser?.username || '';
        const timestamps = JSON.parse(localStorage.getItem('last_read_timestamps') || '{}');
        const lastRead = timestamps[channelId] ? new Date(timestamps[channelId]).getTime() : 0;
        const channelMessages = messages.filter(m => m.channelId === channelId);
        return channelMessages.some(m => 
          new Date(m.timestamp).getTime() > lastRead && 
          m.userId !== currentUser?.id &&
          (m.content.includes(`@${myUsername}`) || m.content.includes('@everyone'))
        );
      }
    }
    
    const timestamps = JSON.parse(localStorage.getItem('last_read_timestamps') || '{}');
    const lastRead = timestamps[channelId] ? new Date(timestamps[channelId]).getTime() : 0;
    
    const channelMessages = messages.filter(m => m.channelId === channelId);
    if (channelMessages.length === 0) return false;
    
    const lastMessage = channelMessages[channelMessages.length - 1];
    if (lastMessage.userId === currentUser?.id) return false;
    
    if (serverId) {
      const server = servers.find(s => s.id === serverId);
      const pref = server?.settings?.notifications || 'all';
      if (pref === 'mentions') {
        const myUsername = currentUser?.username || '';
        const hasMention = channelMessages.some(m => 
          new Date(m.timestamp).getTime() > lastRead && 
          m.userId !== currentUser?.id &&
          (m.content.includes(`@${myUsername}`) || m.content.includes('@everyone'))
        );
        return hasMention;
      }
    }
    
    return new Date(lastMessage.timestamp).getTime() > lastRead;
  }, [activeChannelId, activeDmId, servers, messages, currentUser]);

  const isDmUnread = useCallback((otherUserId: string) => {
    const dmNotifPref = currentUser?.notificationPrefs?.dmNotifications !== false;
    if (!dmNotifPref) return false;

    if (activeDmId === otherUserId) return false;
    
    const myId = currentUser?.id || '';
    // Canonical sorted DM channel ID (matches ChatArea normalization)
    const [sortedA, sortedB] = [myId, otherUserId].sort();
    const canonicalId = `dm-${sortedA}-${sortedB}`;
    const dmChannelIds = [
      canonicalId,
      `dm-[${myId}]-${otherUserId}`,
      `dm-[${otherUserId}]-${myId}`,
      `dm-${myId}-${otherUserId}`,
      `dm-${otherUserId}-${myId}`,
      `dm-[u1]-${otherUserId}`,
      `dm-[${otherUserId}]-u1`
    ];
    
    const timestamps = JSON.parse(localStorage.getItem('last_read_timestamps') || '{}');
    const dmMessages = messages.filter(m => dmChannelIds.includes(m.channelId));
    if (dmMessages.length === 0) return false;
    
    const lastMessage = dmMessages[dmMessages.length - 1];
    if (lastMessage.userId === myId) return false;
    
    let maxLastRead = 0;
    dmChannelIds.forEach(cid => {
      if (timestamps[cid]) {
        maxLastRead = Math.max(maxLastRead, new Date(timestamps[cid]).getTime());
      }
    });
    
    return new Date(lastMessage.timestamp).getTime() > maxLastRead;
  }, [activeDmId, currentUser, messages]);

  const isGroupDmUnread = useCallback((dmId: string) => {
    const dmNotifPref = currentUser?.notificationPrefs?.dmNotifications !== false;
    if (!dmNotifPref) return false;

    if (activeDmId === dmId) return false;
    
    const timestamps = JSON.parse(localStorage.getItem('last_read_timestamps') || '{}');
    const lastRead = timestamps[dmId] ? new Date(timestamps[dmId]).getTime() : 0;
    
    const dmMessages = messages.filter(m => m.channelId === dmId);
    if (dmMessages.length === 0) return false;
    
    const lastMessage = dmMessages[dmMessages.length - 1];
    if (lastMessage.userId === currentUser?.id) return false;
    
    return new Date(lastMessage.timestamp).getTime() > lastRead;
  }, [activeDmId, currentUser, messages]);

  const isServerUnread = useCallback((serverId: string) => {
    const serverChannels = channels.filter(c => c.serverId === serverId);
    return serverChannels.some(c => isChannelUnread(c.id, serverId));
  }, [channels, isChannelUnread]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [overDragId, setOverDragId] = useState<string | null>(null);
  const [inviteServerId, setInviteServerId] = useState<string | null>(null);
  // Track whether the actively dragged item was in a folder AT DRAG START
  const activeDragWasInFolderRef = React.useRef<string | null>(null);
  const hoverTimeoutRef = React.useRef<any>(null);

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    setActiveDragId(id);
    setOverDragId(null);
    // Snapshot the folder membership at drag start
    const folder = folders.find(f => f.serverIds.includes(id));
    activeDragWasInFolderRef.current = folder ? folder.id : null;
  };

  const handleDragOver = (event: any) => {
    const overId = event.over?.id ? String(event.over.id) : null;
    setOverDragId(overId);

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    const activeId = event.active.id as string;
    const isActiveServer = servers.some(s => s.id === activeId);

    if (isActiveServer && overId) {
      // Expand collapsed folder when hovering over it
      const hoveredFolder = folders.find(f => f.id === overId);
      if (hoveredFolder && collapsedFolders.has(hoveredFolder.id)) {
        hoverTimeoutRef.current = setTimeout(() => {
          setCollapsedFolders(prev => {
            const next = new Set(prev);
            next.delete(hoveredFolder.id);
            return next;
          });
        }, 600);
      }
      // Also expand if hovering over a server inside a collapsed folder
      const targetFolder = folders.find(f => f.serverIds.includes(overId));
      if (targetFolder && collapsedFolders.has(targetFolder.id)) {
        hoverTimeoutRef.current = setTimeout(() => {
          setCollapsedFolders(prev => {
            const next = new Set(prev);
            next.delete(targetFolder.id);
            return next;
          });
        }, 600);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const wasInFolder = activeDragWasInFolderRef.current;
    activeDragWasInFolderRef.current = null;
    setActiveDragId(null);
    setOverDragId(null);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    const { active, over } = event;
    const activeId = active.id as string;

    if (!over || active.id === over.id) return;
    const overId = over.id as string;

    // ── Folder drag ──────────────────────────────────────────────────────────
    const isActiveFolder = folders.some(f => f.id === activeId);
    if (isActiveFolder) {
      // Reorder using the computed effectiveSidebarOrder array (guaranteed to have all IDs)
      const order = effectiveSidebarOrder;
      const oldIdx = order.indexOf(activeId);
      const newIdx = order.indexOf(overId);
      if (oldIdx !== -1 && newIdx !== -1) {
        const nextOrder = arrayMove([...order], oldIdx, newIdx);
        setSidebarOrder(nextOrder);
        // Also keep folders array in sync (same relative order)
        const newFolderOrder = nextOrder
          .filter(id => folders.some(f => f.id === id))
          .map(id => folders.find(f => f.id === id)!);
        const unchanged = folders.filter(f => !newFolderOrder.some(x => x.id === f.id));
        useAppStore.setState({ folders: [...newFolderOrder, ...unchanged] });
      }
      return;
    }

    // ── Server drag ──────────────────────────────────────────────────────────
    const isActiveServer = servers.some(s => s.id === activeId);
    if (isActiveServer) {
      const activeFolder = folders.find(f => f.serverIds.includes(activeId));

      // Dropped on ungrouped dropzone → ungroup
      if (overId === 'ungrouped-dropzone') {
        if (activeFolder) moveServerToFolder(activeId, null);
        activeDragWasInFolderRef.current = null;
        return;
      }

      // Dropped ON A FOLDER (folder header sortable) → add server to that folder
      const targetFolder = folders.find(f => f.id === overId);
      if (targetFolder) {
        if (!activeFolder || activeFolder.id !== targetFolder.id) {
          moveServerToFolder(activeId, targetFolder.id);
        }
        return;
      }

      // Dropped on another server
      const isOverServer = servers.some(s => s.id === overId);
      if (isOverServer) {
        const overFolder = folders.find(f => f.serverIds.includes(overId));

        // Dropped on a server inside a folder (target is in folder)
        if (overFolder) {
          if (!activeFolder || activeFolder.id !== overFolder.id) {
            moveServerToFolder(activeId, overFolder.id);
          }
          // Reorder within the folder to place it right at the target index
          setTimeout(() => {
            const latestFolders = useAppStore.getState().folders;
            const updatedFolder = latestFolders.find(f => f.id === overFolder.id);
            if (updatedFolder) {
              const currentIds = [...updatedFolder.serverIds];
              const oldIdx = currentIds.indexOf(activeId);
              const newIdx = currentIds.indexOf(overId);
              if (oldIdx !== -1 && newIdx !== -1) {
                updateFolder(overFolder.id, { serverIds: arrayMove(currentIds, oldIdx, newIdx) });
              }
            }
          }, 0);
          return;
        }

        // Dropped on an ungrouped server (target is ungrouped)
        if (!overFolder) {
          if (activeFolder) {
            moveServerToFolder(activeId, null);
          }
          const serverIds = servers.map(s => s.id);
          const oldIdx = serverIds.indexOf(activeId);
          const newIdx = serverIds.indexOf(overId);
          if (oldIdx !== -1 && newIdx !== -1) {
            reorderServers(arrayMove(serverIds, oldIdx, newIdx));
          }
          return;
        }
      }
      return;
    }

    // ── Category drag ────────────────────────────────────────────────────────
    const activeCategory = categories.find(c => c.id === activeId);
    const overCategory = categories.find(c => c.id === overId);

    if (activeCategory && overCategory) {
      const serverCats = categories
        .filter(c => c.serverId === activeServerId)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(c => c.id);
      const oldIdx = serverCats.indexOf(activeId);
      const newIdx = serverCats.indexOf(overId);
      if (oldIdx !== -1 && newIdx !== -1) {
        reorderCategories(activeServerId!, arrayMove(serverCats, oldIdx, newIdx));
      }
      return;
    }

    // ── Channel drag ─────────────────────────────────────────────────────────
    const activeChannel = channels.find(c => c.id === activeId);
    const overChannel = channels.find(c => c.id === overId);

    if (activeChannel) {
      if (overChannel) {
        if (activeChannel.categoryId === overChannel.categoryId) {
          const catChannels = channels
            .filter(c => c.categoryId === activeChannel.categoryId)
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map(c => c.id);
          const oldIdx = catChannels.indexOf(activeId);
          const newIdx = catChannels.indexOf(overId);
          if (oldIdx !== -1 && newIdx !== -1) {
            reorderChannels(activeChannel.categoryId!, arrayMove(catChannels, oldIdx, newIdx));
          }
        } else {
          moveChannelToCategory(activeId, overChannel.categoryId!);
        }
      } else if (overCategory) {
        moveChannelToCategory(activeId, overId);
      }
    }
  };


  const [profileModalUserId, setProfileModalUserId] = useState<string | null>(null);

  useEffect(() => {
    const handleOpenProfile = (e: any) => {
      if (e.detail) {
        setProfileModalUserId(e.detail);
      }
    };
    window.addEventListener('nexus:open-user-profile' as any, handleOpenProfile);
    return () => {
      window.removeEventListener('nexus:open-user-profile' as any, handleOpenProfile);
    };
  }, []);

  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [dmSearch, setDmSearch] = useState('');
  const [isStatusPickerOpen, setIsStatusPickerOpen] = useState(false);
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [isServerSettingsOpen, setIsServerSettingsOpen] = useState(false);
  const [isCreateGroupDmOpen, setIsCreateGroupDmOpen] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [settingsChannelId, setSettingsChannelId] = useState<string | null>(null);
  const [createChannelCategory, setCreateChannelCategory] = useState<string | null>(null);

  const activeServer = servers.find(s => s.id === activeServerId);
  const activeServerPerms = useMemo(() => {
    if (!activeServerId || !currentUser?.id) return [];
    return getPermissions(activeServerId, currentUser.id);
  }, [activeServerId, currentUser?.id, getPermissions]);
  
  const isOwnerOfActive = activeServer && currentUser && activeServer.ownerId === currentUser.id;
  const isOwnerOrAdminOfActive = isOwnerOfActive || activeServerPerms.includes('ADMIN');

  const headerContextMenuItems = activeServer && isOwnerOrAdminOfActive ? [
    {
      id: 'create-category',
      label: 'Create Category',
      icon: <FolderPlus size={14} />,
      onClick: () => handleCreateCategory(activeServer.id)
    },
    {
      id: 'create-channel',
      label: 'Create Channel',
      icon: <Plus size={14} />,
      onClick: () => handleCreateChannel(activeServer.id)
    },
    {
      id: 'invite',
      label: 'Invite to Server',
      icon: <Link size={14} />,
      onClick: () => handleCreateInvite(activeServer.id)
    },
    { divider: true, id: 'd-header-opt', label: '' },
    {
      id: 'settings',
      label: 'Server Settings',
      icon: <Settings size={14} />,
      onClick: () => setIsServerSettingsOpen(true)
    }
  ] : [];

  const handleWorkspaceSelect = (id: string | null) => {
    setActiveServer(id);
    setIsWorkspaceMenuOpen(false);
  };

  const handleCreateCategory = (serverId: string) => {
    setActiveServer(serverId);
    openDialog({
      type: 'input',
      title: 'New Category',
      description: 'Group your channels into categories.',
      placeholder: 'Category Name',
      onConfirm: (name) => {
        if (name) {
          useAppStore.getState().addCategory(serverId, name);
        }
      }
    });
  };

  const handleCreateChannel = (serverId: string) => {
    setActiveServer(serverId);
    const serverCats = useAppStore.getState().categories.filter(c => c.serverId === serverId);
    if (serverCats.length > 0) {
      setCreateChannelCategory(serverCats[0].id);
    } else {
      const tempCatId = `cat_${Date.now()}`;
      useAppStore.getState().addCategory(serverId, 'General');
      setCreateChannelCategory(tempCatId);
    }
  };

  const handleCreateInvite = (serverId: string) => {
    setInviteServerId(serverId);
  };

  const openCreateWorkspace = () => {
    setIsWorkspaceMenuOpen(false);
    setIsCreateWorkspaceOpen(true);
  };

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const handleAddChannel = (categoryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCreateChannelCategory(categoryId);
  };

  const handleCreateServer = (template?: 'gaming' | 'school') => {
    const names = ['My Workspace', 'New Community', 'Team Space'];
    let name = names[Math.floor(Math.random() * names.length)];
    if (template === 'gaming') name = "Gaming Hub " + Math.floor(Math.random() * 100);
    if (template === 'school') name = "Study Group " + Math.floor(Math.random() * 100);
    useAppStore.getState().addServer(name, template);
    setIsCreateWorkspaceOpen(false);
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'voice': return Volume2;
      case 'announcement': return Megaphone;
      case 'stage': return Mic;
      default: return Hash;
    }
  };

  // ── Custom collision: prefer pointer-within for precise folder drops,
  // fall back to closestCorners for sorting between peers.
  const collisionDetection = useCallback((args: any) => {
    const pointerHits = pointerWithin(args);
    if (pointerHits.length > 0) return pointerHits;
    return closestCorners(args);
  }, []);

  // ── Dynamic SortableContext items.
  // When a SERVER is being dragged: exclude folders from the sort context so
  // they don't receive displacement transforms (folder stays put → visual drop cue).
  // Folders are still droppable (useSortable still registers them).
  const isServerDragging = useMemo(
    () => !!(activeDragId && servers.some(s => s.id === activeDragId)),
    [activeDragId, servers]
  );
  const ungroupedServerIds = useMemo(
    () => servers
      .filter(s => s.members.includes(currentUser?.id || '') && !folders.some(f => f.serverIds.includes(s.id)))
      .map(s => s.id),
    [servers, folders, currentUser]
  );

  // Build a merged display order: start from persisted sidebarOrder, fill in any
  // IDs that are new (newly joined servers, newly created folders) at the end.
  const effectiveSidebarOrder = useMemo(() => {
    const validIds = new Set([
      ...folders.map(f => f.id),
      ...ungroupedServerIds,
    ]);
    // Keep only valid IDs from stored order, in their stored positions
    const stored = sidebarOrder.filter(id => validIds.has(id));
    const storedSet = new Set(stored);
    // Append any valid IDs not yet in sidebarOrder (new items)
    const missing = [...folders.map(f => f.id), ...ungroupedServerIds].filter(id => !storedSet.has(id));
    return [...stored, ...missing];
  }, [sidebarOrder, folders, ungroupedServerIds]);

  const workspaceSortableItems = useMemo(
    () => isServerDragging
      ? ungroupedServerIds              // server drag: only sort among peers
      : effectiveSidebarOrder,           // folder/idle: full ordered list
    [isServerDragging, ungroupedServerIds, effectiveSidebarOrder]
  );

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveDragId(null);
        setOverDragId(null);
      }}
    >
        <div className="w-[272px] shrink-0 h-full flex flex-col bg-surface-1 border-r border-border">
        {/* Workspace Selector */}
        <div className="relative px-3 py-4 shrink-0 z-50">
          <ContextMenu items={headerContextMenuItems}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
              className="w-full flex items-center justify-between bg-surface-2 rounded-md px-3 py-2.5 transition-all text-left group hover:bg-surface-3 cursor-pointer relative overflow-hidden"
            >
              {!isExploreOpen && activeServer?.bannerUrl && (
                <>
                  <img 
                    src={activeServer.bannerUrl} 
                    alt="" 
                    className="absolute inset-0 w-full h-full object-cover filter blur-[1.5px] brightness-[0.6] select-none pointer-events-none transition-transform duration-300" 
                    style={{
                      objectPosition: `${activeServer.settings?.bannerPositionX ?? 50}% ${activeServer.settings?.bannerPositionY ?? 50}%`,
                      transform: `scale(${ (activeServer.settings?.bannerScale ?? 1) * 1.08 })`,
                    }}
                  />
                  <div 
                    className="absolute inset-0 bg-gradient-to-l from-black/95 via-black/60 to-black/25 pointer-events-none z-0" 
                  />
                  <div
                    className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-0"
                  />
                </>
              )}
              <div className="flex items-center gap-3 overflow-hidden relative z-10">
                {isExploreOpen ? (
                <div className="w-7 h-7 rounded-lg bg-surface-3 flex items-center justify-center shrink-0 border border-border">
                    <Compass size={14} className="text-text-secondary" />
                  </div>
                ) : activeServer ? (
                  activeServer.iconUrl ? (
                    <img src={activeServer.iconUrl} alt={activeServer.name} className="w-7 h-7 rounded-lg object-cover shrink-0 border border-border" />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-surface-3 flex items-center justify-center shrink-0 border border-border">
                      <span className="text-xs font-bold text-text-secondary">{activeServer.name.substring(0, 1)}</span>
                    </div>
                  )
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-surface-3 flex items-center justify-center shrink-0 border border-border">
                    <MessageSquare size={13} className="text-text-secondary" />
                  </div>
                )}
                <span className={cn("font-semibold text-sm truncate flex items-center gap-1", (!isExploreOpen && activeServer?.bannerUrl) ? "text-white" : "text-text-primary")}>
                  {isExploreOpen ? "Explore Spaces" : activeServer ? (
                    <>
                      {activeServer.name}
                      {activeServer.settings?.verification && (
                        <span title="Verified Space">
                          <ShieldCheck size={13} className="text-accent fill-accent/10 shrink-0" />
                        </span>
                      )}
                    </>
                  ) : "Direct Messages"}
                </span>
              </div>
              <div className="flex items-center gap-1 relative z-10">
                {activeServerId && isOwnerOrAdminOfActive && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsServerSettingsOpen(true); }} 
                    className={cn(
                      "p-1 rounded-md transition-colors opacity-0 group-hover:opacity-100",
                      (!isExploreOpen && activeServer?.bannerUrl) 
                        ? "text-white/80 hover:text-white hover:bg-white/10" 
                        : "text-text-muted hover:text-text-secondary hover:bg-surface-3/50"
                    )}
                  >
                    <Settings size={14} />
                  </button>
                )}
                <ChevronDown 
                  size={16} 
                  className={cn(
                    "shrink-0 transition-transform duration-200", 
                    (!isExploreOpen && activeServer?.bannerUrl) ? "text-white/80" : "text-text-muted",
                    isWorkspaceMenuOpen && "rotate-180"
                  )} 
                />
              </div>
            </div>
          </ContextMenu>

          {/* Dropdown — rendered as a fixed portal so context menus inside aren't clipped */}
          <AnimatePresence>
            {isWorkspaceMenuOpen && (
              <>
                <div className="fixed inset-0 bg-black/40" style={{ zIndex: 200 }} onClick={() => setIsWorkspaceMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  style={{ zIndex: 201, position: 'absolute', top: '76px', left: '12px', width: 'calc(100% - 24px)' }}
                  className="bg-surface-2 rounded shadow-2xl overflow-hidden border border-border"
                >
                  <div className="p-1.5 space-y-0.5">
                    <WorkspaceItem
                      name="Direct Messages"
                      icon={<MessageSquare size={14} />}
                      isActive={activeServerId === null && !isExploreOpen && !isDraftsOpen}
                      onClick={() => {
                        handleWorkspaceSelect(null);
                        setDraftsOpen(false);
                      }}
                      isUnread={Object.values(users).some(u => isDmUnread(u.id)) || Object.values(dmChannels).some(dm => isGroupDmUnread(dm.id))}
                    />
                    <div className="h-px bg-border my-1 mx-2" />
                    
                    <SortableContext
                      items={workspaceSortableItems}
                      strategy={verticalListSortingStrategy}
                    >
                        <div className="max-h-[300px] overflow-y-auto hidden-scrollbar space-y-0.5">
                          {/* Favorites Section */}
                          {servers.some(s => s.isFavorite && s.members.includes(currentUser?.id || '')) && (
                            <>
                              <div className="px-2.5 py-1.5 text-[9px] uppercase font-black tracking-widest text-text-muted flex items-center gap-1.5">
                                <Star size={8} className="fill-yellow-500 text-yellow-500" />
                                <span>Favorites</span>
                              </div>
                              {servers.filter(s => s.isFavorite && s.members.includes(currentUser?.id || '')).map(server => (
                                <SortableWorkspaceItem
                                  key={`fav-${server.id}`}
                                  id={server.id}
                                  server={server}
                                  isActive={activeServerId === server.id}
                                  onClick={() => handleWorkspaceSelect(server.id)}
                                  mentionCount={notifications.filter(n => n.serverId === server.id && !n.read && n.type === 'mention').length}
                                  folders={folders}
                                  moveServerToFolder={moveServerToFolder}
                                  onCreateCategory={handleCreateCategory}
                                  onCreateChannel={handleCreateChannel}
                                  onInvite={handleCreateInvite}
                                  activeDragId={activeDragId}
                                  overDragId={overDragId}
                                  isUnread={isServerUnread(server.id)}
                                  onOpenSettings={(sid) => {
                                    setActiveServer(sid);
                                    setIsServerSettingsOpen(true);
                                  }}
                                />
                              ))}
                              <div className="h-px bg-border my-1 mx-2" />
                            </>
                          )}

                          <div className="px-2.5 py-1.5 text-[9px] uppercase font-black tracking-widest text-text-muted">Spaces</div>
                          
                          {/* Unified ordered list: folders and ungrouped servers in effectiveSidebarOrder */}
                          <div className="space-y-0.5">
                            <AnimatePresence mode="popLayout">
                              {effectiveSidebarOrder.map(itemId => {
                                const folder = folders.find(f => f.id === itemId);
                                if (folder) {
                                  const folderServers = servers.filter(s => folder.serverIds.includes(s.id) && s.members.includes(currentUser?.id || ''));
                                  const isCollapsed = collapsedFolders.has(folder.id);
                                  return (
                                    <FolderDropZone
                                      key={folder.id}
                                      folder={folder}
                                      isCollapsed={isCollapsed}
                                      folderServers={folderServers}
                                      setEditingFolderId={setEditingFolderId}
                                      deleteFolder={deleteFolder}
                                      setCollapsedFolders={setCollapsedFolders}
                                      activeDragId={activeDragId}
                                      overDragId={overDragId}
                                      isDragActive={!!activeDragId}
                                    >
                                      <SortableContext
                                        items={folderServers.map(s => s.id)}
                                        strategy={verticalListSortingStrategy}
                                      >
                                        {folderServers.map(server => (
                                          <div key={server.id} className="pl-3 py-0.5">
                                            <SortableWorkspaceItem
                                              id={server.id}
                                              server={server}
                                              isActive={activeServerId === server.id}
                                              onClick={() => handleWorkspaceSelect(server.id)}
                                              mentionCount={notifications.filter(n => n.serverId === server.id && !n.read && n.type === 'mention').length}
                                              folders={folders}
                                              moveServerToFolder={moveServerToFolder}
                                              onCreateCategory={handleCreateCategory}
                                              onCreateChannel={handleCreateChannel}
                                              onInvite={handleCreateInvite}
                                              activeDragId={activeDragId}
                                              overDragId={overDragId}
                                              isUnread={isServerUnread(server.id)}
                                              onOpenSettings={(sid) => {
                                                setActiveServer(sid);
                                                setIsServerSettingsOpen(true);
                                              }}
                                            />
                                          </div>
                                        ))}
                                      </SortableContext>
                                    </FolderDropZone>
                                  );
                                }
                                const server = servers.find(s => s.id === itemId);
                                if (!server) return null;
                                return (
                                  <motion.div
                                    key={server.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95, height: 0 }}
                                    transition={{ duration: 0.15 }}
                                  >
                                    <SortableWorkspaceItem
                                      id={server.id}
                                      server={server}
                                      isActive={activeServerId === server.id}
                                      onClick={() => handleWorkspaceSelect(server.id)}
                                      mentionCount={notifications.filter(n => n.serverId === server.id && !n.read && n.type === 'mention').length}
                                      folders={folders}
                                      moveServerToFolder={moveServerToFolder}
                                      onCreateCategory={handleCreateCategory}
                                      onCreateChannel={handleCreateChannel}
                                      onInvite={handleCreateInvite}
                                      activeDragId={activeDragId}
                                      overDragId={overDragId}
                                      isUnread={isServerUnread(server.id)}
                                      onOpenSettings={(sid) => {
                                        setActiveServer(sid);
                                        setIsServerSettingsOpen(true);
                                      }}
                                    />
                                  </motion.div>
                                );
                              })}
                            </AnimatePresence>
                          </div>

                          {/* Dedicated ungroup dropzone that only appears when dragging a server currently in a folder */}
                          <AnimatePresence>
                            {activeDragId && folders.some(f => f.serverIds.includes(activeDragId)) && (
                              <motion.div
                                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                animate={{ height: 'auto', opacity: 1, marginTop: 8 }}
                                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                transition={{ duration: 0.15 }}
                                className="overflow-hidden px-1"
                              >
                                <UngroupedDropZone />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </SortableContext>
                    <div className="h-px bg-border my-1 mx-2" />
                    <button onClick={() => { setIsCreateFolderOpen(true); setIsWorkspaceMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-text-tertiary hover:text-text-primary hover:bg-surface-3/50 transition-colors text-left">
                      <FolderPlus size={14} />
                      <span>Create Folder</span>
                    </button>
                    <div className="h-px bg-border my-1 mx-2" />
                    <button onClick={openCreateWorkspace} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-text-tertiary hover:text-text-primary hover:bg-surface-3/50 transition-colors text-left">
                      <Plus size={14} />
                      <span>Create Space</span>
                    </button>
                    <button 
                      onClick={() => {
                        setIsWorkspaceMenuOpen(false);
                        
                        // Try to read clipboard text to auto-fill the invite code
                        const openJoinDialog = (defaultCode = '') => {
                          openDialog({
                            type: 'input',
                            title: 'Join Space',
                            description: 'Enter an invite code to join a community.',
                            placeholder: 'EX: a1b2c3d4',
                            defaultValue: defaultCode,
                            confirmLabel: 'Join',
                            onConfirm: (code) => {
                               const result = useAppStore.getState().joinServerWithInvite(code || '');
                               if (result.status === 'success') {
                                 if (result.serverId) {
                                   handleWorkspaceSelect(result.serverId);
                                 }
                                 openDialog({
                                   type: 'confirm',
                                   title: 'Joined Space',
                                   description: 'You have successfully joined the Space!',
                                   confirmLabel: 'Great',
                                   onConfirm: () => {}
                                 });
                               } else if (result.status === 'already_member') {
                                 if (result.serverId) {
                                   handleWorkspaceSelect(result.serverId);
                                 }
                                 openDialog({
                                   type: 'confirm',
                                   title: 'Already a Member',
                                   description: 'You are already a member of this Space! Directing you there now...',
                                   confirmLabel: 'OK',
                                   onConfirm: () => {}
                                 });
                               } else {
                                 openDialog({
                                   type: 'confirm',
                                   title: 'Unable to Join',
                                   description: 'The invite code is invalid, expired, or has reached its max usage limit.',
                                   confirmLabel: 'OK',
                                   isDanger: true,
                                   onConfirm: () => {}
                                 });
                                }
                             }
                          });
                        };

                        navigator.clipboard.readText()
                          .then(clipText => {
                            // If the clipboard has a short alphanumeric code, use it
                            const trimmed = clipText ? clipText.trim() : '';
                            const cleanCode = trimmed.length > 2 && trimmed.length < 20 && /^[a-zA-Z0-9]+$/.test(trimmed) ? trimmed : '';
                            openJoinDialog(cleanCode);
                          })
                          .catch(() => {
                            openJoinDialog('');
                          });
                      }} 
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-text-tertiary hover:text-text-primary hover:bg-surface-3/50 transition-colors text-left"
                    >
                      <Link size={14} />
                      <span>Join Space</span>
                    </button>
                    <div className="h-px bg-border my-1 mx-2" />
                    <WorkspaceItem
                      name="Explore"
                      icon={<Compass size={14} />}
                      isActive={isExploreOpen}
                      onClick={() => { setExploreOpen(true); setIsWorkspaceMenuOpen(false); }}
                    />
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto hidden-scrollbar px-3 pb-4">
          {isExploreOpen ? (
            <div className="space-y-2 mt-4 text-center py-8">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-surface-3 flex items-center justify-center mb-4">
                <Compass size={24} className="text-text-secondary" />
              </div>
              <h3 className="text-sm font-bold text-text-primary">Explore Spaces</h3>
              <p className="text-xs text-text-muted">Discover new communities to join.</p>
            </div>
          ) : !activeServerId ? (
            <div className="space-y-1">
              {systemConfig?.activeBroadcast && (
                <div className="group/cat mb-4">
                  <h3 className="text-[10px] uppercase font-bold tracking-widest text-text-muted px-2 py-1.5 flex items-center justify-between group">
                    <div className="flex items-center gap-1">
                      <Megaphone size={10} className="text-accent" />
                      App Announcements
                    </div>
                  </h3>
                  <div className="space-y-0.5">
                    <ChannelItem
                      channel={{ id: 'chan_app_announcement', name: 'app-announcements', type: 'announcement' }}
                      icon={<Megaphone size={14} className="text-accent" />}
                      isActive={activeChannelId === 'chan_app_announcement'}
                      onClick={() => {
                        useAppStore.setState({
                          activeChannelId: 'chan_app_announcement',
                          activeDmId: null,
                          isDraftsOpen: false,
                          isExploreOpen: false,
                          isAdminOpen: false
                        });
                      }}
                    />
                  </div>
                </div>
              )}
              <div className="space-y-0.5 mb-4">
                <button 
                  onClick={() => {
                    setActiveDm(null);
                    setDraftsOpen(false);
                    if (incomingRequests && incomingRequests.length > 0) {
                      setFriendTab('pending');
                    }
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold transition-all",
                    !isDraftsOpen && !activeDmId ? "bg-surface-3 text-text-primary shadow-sm" : "text-text-muted hover:bg-surface-2 hover:text-text-secondary"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Users size={16} />
                    <span>Friends</span>
                  </div>
                  {incomingRequests && incomingRequests.length > 0 && (
                    <span className="bg-danger text-white px-1.5 py-0.5 rounded-full text-[10px] min-w-[18px] text-center font-bold">
                      {incomingRequests.length}
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => setDraftsOpen(true)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold transition-all",
                    isDraftsOpen ? "bg-surface-3 text-text-primary shadow-sm" : "text-text-muted hover:bg-surface-2 hover:text-text-secondary"
                  )}
                >
                  <Pencil size={16} />
                  <span>Drafts & Pending</span>
                </button>
                {currentUser?.email === 'abderrahmanchakkouri@gmail.com' && (
                  <button 
                    onClick={() => setAdminOpen(true)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold transition-all",
                      isAdminOpen ? "bg-surface-3 text-text-primary shadow-sm" : "text-text-muted hover:bg-surface-2 hover:text-text-secondary"
                    )}
                  >
                    <ShieldAlert size={16} className={cn(isAdminOpen ? "text-accent animate-pulse" : "text-text-muted")} />
                    <span>Admin Control</span>
                  </button>
                )}
              </div>

              <div className="relative mb-3">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={dmSearch}
                  onChange={(e) => setDmSearch(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-xl py-1.5 pl-8 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/30 transition-colors"
                />
              </div>
              <div className="flex items-center justify-between px-2 mb-2 group">
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-text-secondary transition-colors cursor-pointer">Direct Messages</span>
                <button 
                  onClick={() => setIsCreateGroupDmOpen(true)}
                  className="w-4 h-4 rounded text-text-muted hover:text-text-primary hover:bg-surface-3 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                  title="Create DM"
                >
                  <Plus size={12} />
                </button>
              </div>

              <div className="space-y-0.5">
                {Object.values(dmChannels)
                  .filter(dm => {
                    if (!currentUser?.id || !dm.participants.includes(currentUser.id)) return false;
                    if (!dmSearch) return true;
                    if (dm.name && dm.name.toLowerCase().includes(dmSearch.toLowerCase())) return true;
                    // Check participant names
                    const participants = dm.participants.map(pid => users[pid]?.username).join(', ');
                    return participants.toLowerCase().includes(dmSearch.toLowerCase());
                  })
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map(dm => {
                    // Generate display name and avatar
                    const otherParticipants = dm.participants.filter(id => id !== currentUser.id);
                    let displayName = dm.name;
                    let avatarSrc = dm.avatarUrl;
                    
                    if (!displayName) {
                      displayName = otherParticipants.map(id => users[id]?.username).filter(Boolean).join(', ') || 'Unnamed Group';
                    }

                    return (
                      <ContextMenu
                        key={dm.id}
                        items={() => [
                          {
                            id: 'mark-read',
                            label: 'Mark as Read',
                            icon: <Check size={14} />,
                            onClick: () => {
                              const timestamps = JSON.parse(localStorage.getItem('last_read_timestamps') || '{}');
                              timestamps[dm.id] = new Date().toISOString();
                              localStorage.setItem('last_read_timestamps', JSON.stringify(timestamps));
                              useAppStore.setState({ messages: [...messages] });
                            }
                          },
                          { 
                            id: 'rename', 
                            label: 'Change Name', 
                            icon: <Pencil size={14} />, 
                            onClick: () => {
                              openDialog({
                                type: 'input',
                                title: 'Rename Group',
                                description: 'Give this group a new name.',
                                defaultValue: dm.name || '',
                                onConfirm: (name) => renameGroupDm(dm.id, name)
                              });
                            }
                          },
                          { divider: true, id: 'd-call', label: '' },
                          voiceState.channelId === dm.id ? {
                            id: 'disconnect-voice',
                            label: 'Disconnect Voice Call',
                            icon: <PhoneOff size={14} />,
                            danger: true,
                            onClick: () => leaveVoiceChannel()
                          } : {
                            id: 'join-voice',
                            label: 'Join Voice Call',
                            icon: <Phone size={14} />,
                            onClick: () => joinVoiceChannel(dm.id)
                          },
                          { divider: true, id: 'd1', label: '' },
                          { 
                            id: 'leave', 
                            label: 'Leave Group', 
                            icon: <LogOut size={14} />, 
                            danger: true, 
                            onClick: () => {
                              openDialog({
                                type: 'confirm',
                                title: 'Leave Group',
                                description: 'Are you sure you want to leave this group? You will need an invite to rejoin.',
                                confirmLabel: 'Leave Group',
                                isDanger: true,
                                onConfirm: () => {
                                  leaveGroupDm(dm.id);
                                  if (activeDmId === dm.id) setActiveDm(null);
                                }
                              });
                            }
                          }
                        ]}
                      >
                        <button
                          onClick={() => setActiveDm(dm.id)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all group relative",
                            activeDmId === dm.id ? "bg-surface-3/80 text-text-primary shadow-sm" : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                          )}
                        >
                          {avatarSrc ? (
                            <Avatar src={avatarSrc} alt={displayName} size="sm" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center border border-border/50 shrink-0">
                              <Users size={14} className="text-text-muted group-hover:text-text-secondary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 text-left">
                            <div className="flex items-center justify-between">
                              <p className={cn("text-[13px] font-semibold truncate leading-tight", isGroupDmUnread(dm.id) ? "text-text-primary font-bold" : "")}>{displayName}</p>
                              {isGroupDmUnread(dm.id) && (
                                <span className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0 ml-1.5" />
                              )}
                            </div>
                            {otherParticipants.length > 1 ? (
                              <p className="text-[11px] text-text-muted truncate">{otherParticipants.length + 1} Members</p>
                            ) : (
                              <p className="text-[11px] text-text-muted truncate capitalize">{users[otherParticipants[0]]?.customStatus || users[otherParticipants[0]]?.status || ''}</p>
                            )}
                          </div>
                        </button>
                      </ContextMenu>
                    );
                  })}
                  
                {Object.values(users)
                  .filter(u => {
                    if (u.id === currentUser?.id) return false;
                    if (activeDmId === u.id) return true;
                    if (closedDms?.includes(u.id)) return false;
                    if (dmSearch && u.username.toLowerCase().includes(dmSearch.toLowerCase())) return true;
                    
                    const myId = currentUser?.id || '';
                    const hasMessages = messages.some(m => 
                      m.channelId === `dm-[${myId}]-${u.id}` ||
                      m.channelId === `dm-[${u.id}]-${myId}` ||
                      m.channelId === `dm-${myId}-${u.id}` ||
                      m.channelId === `dm-${u.id}-${myId}` ||
                      m.channelId === `dm-[u1]-${u.id}` ||
                      m.channelId === `dm-[${u.id}]-u1` ||
                      m.channelId === u.id ||
                      m.channelId === myId
                    );
                    return hasMessages;
                  })
                  .sort((a, b) => {
                    const aPinned = pinnedDms?.includes(a.id) ? 1 : 0;
                    const bPinned = pinnedDms?.includes(b.id) ? 1 : 0;
                    if (aPinned !== bPinned) return bPinned - aPinned;
                    return 0;
                  })
                  .map(user => (
                    <ContextMenu
                      key={user.id}
                      items={() => [
                        // ── Section 1: Read / Pin ──
                        {
                          id: 'mark-read',
                          label: 'Mark as Read',
                          onClick: () => {
                            const myId = currentUser?.id || '';
                            const [sortedA, sortedB] = [myId, user.id].sort();
                            const dmChannelIds = [
                              `dm-${sortedA}-${sortedB}`,
                              `dm-[${myId}]-${user.id}`,
                              `dm-[${user.id}]-${myId}`,
                              `dm-${myId}-${user.id}`,
                              `dm-${user.id}-${myId}`,
                              `dm-[u1]-${user.id}`,
                              `dm-[${user.id}]-u1`
                            ];
                            const timestamps = JSON.parse(localStorage.getItem('last_read_timestamps') || '{}');
                            dmChannelIds.forEach(cid => {
                              timestamps[cid] = new Date().toISOString();
                            });
                            localStorage.setItem('last_read_timestamps', JSON.stringify(timestamps));
                            useAppStore.setState({ messages: [...messages] });
                          }
                        },
                        {
                          id: 'pin-dm',
                          label: pinnedDms?.includes(user.id) ? 'Unpin' : 'Pin',
                          icon: <Pin size={14} />,
                          onClick: () => {
                            if (pinnedDms?.includes(user.id)) {
                              unpinDm(user.id);
                            } else {
                              pinDm(user.id);
                            }
                          }
                        },

                        // ── Section 2: Profile & Call ──
                        { divider: true, id: 'd-profile', label: '' },
                        {
                          id: 'view-profile',
                          label: 'Profile',
                          onClick: () => {
                            setProfileModalUserId(user.id);
                          }
                        },
                        callState.isActive && callState.userId === user.id ? {
                          id: 'disconnect-call',
                          label: 'Disconnect Call',
                          icon: <PhoneOff size={14} />,
                          danger: true,
                          onClick: () => hangupCall()
                        } : {
                          id: 'voice-call',
                          label: 'Start a Call',
                          icon: <Phone size={14} />,
                          onClick: () => startCall(user.id, 'audio')
                        },
                        !(callState.isActive && callState.userId === user.id) ? {
                          id: 'video-call',
                          label: 'Start Video Call',
                          icon: <Video size={14} />,
                          onClick: () => startCall(user.id, 'video')
                        } : null,

                        // ── Section 3: Note & Nickname ──
                        {
                          id: 'add-note',
                          label: (
                            <div>
                              <div>{userNotes[user.id] ? 'Edit Note' : 'Add Note'}</div>
                              <div className="text-[10px] text-text-muted font-normal">Only visible to you</div>
                            </div>
                          ),
                          icon: <StickyNote size={14} />,
                          onClick: () => {
                            openDialog({
                              type: 'input',
                              title: `Note for ${user.username}`,
                              description: 'Notes are only visible to you.',
                              placeholder: 'Add a note...',
                              defaultValue: userNotes[user.id] || '',
                              onConfirm: (note) => {
                                setUserNote(user.id, note);
                              }
                            });
                          }
                        },
                        {
                          id: 'nickname',
                          label: userNicknames[user.id] ? 'Change Nickname' : 'Add Friend Nickname',
                          icon: <Pencil size={14} />,
                          onClick: () => {
                            openDialog({
                              type: 'input',
                              title: `Nickname for ${user.username}`,
                              description: 'Set a custom nickname visible only to you.',
                              placeholder: 'Enter a nickname...',
                              defaultValue: userNicknames[user.id] || '',
                              onConfirm: (nick) => {
                                setUserNickname(user.id, nick);
                              }
                            });
                          }
                        },
                        {
                          id: 'close-dm',
                          label: 'Close DM',
                          icon: <LogOut size={14} />,
                          onClick: () => {
                            closeDm(user.id);
                            if (activeDmId === user.id) setActiveDm(null);
                          }
                        },

                        // ── Section 4: Server / Social ──
                        { divider: true, id: 'd-social', label: '' },
                        {
                          id: 'invite-server',
                          label: 'Invite to Server',
                          icon: <Link size={14} />,
                          rightIcon: <ChevronRight size={12} />,
                          submenu: servers.length > 0
                            ? servers.map(s => ({
                                id: `invite-${s.id}`,
                                label: s.name,
                                icon: s.iconUrl
                                  ? <img src={s.iconUrl} className="w-3.5 h-3.5 rounded-sm" alt="" />
                                  : <div className="w-3.5 h-3.5 bg-accent/20 rounded-sm flex items-center justify-center"><span className="text-[7px] font-bold text-accent">{s.name[0]}</span></div>,
                                onClick: () => {
                                  openDialog({
                                    type: 'confirm',
                                    title: `Invite to ${s.name}`,
                                    description: `Send ${user.username} an invite link to join ${s.name}?`,
                                    confirmLabel: 'Send Invite',
                                    onConfirm: () => {
                                      const myId = currentUser?.id || '';
                                      const [sortedA, sortedB] = [myId, user.id].sort();
                                      const dmChannelId = `dm-${sortedA}-${sortedB}`;
                                      useAppStore.getState().addMessage(`Join my space! http://nexus.chat/invite/${s.id}`, dmChannelId);
                                    }
                                  });
                                }
                              }))
                            : [{ id: 'no-servers', label: 'No servers yet', disabled: true }]
                        },
                        friends?.includes(user.id) ? {
                          id: 'remove-friend',
                          label: 'Remove Friend',
                          icon: <UserMinus size={14} />,
                          danger: true,
                          onClick: () => {
                            openDialog({
                              type: 'confirm',
                              title: 'Remove Friend',
                              description: `Are you sure you want to remove ${user.username} from your friends?`,
                              confirmLabel: 'Remove',
                              isDanger: true,
                              onConfirm: () => removeFriend(user.id)
                            });
                          }
                        } : null,
                        {
                          id: 'ignore',
                          label: ignoredUsers?.includes(user.id) ? 'Unignore' : 'Ignore',
                          icon: <EyeOff size={14} />,
                          onClick: () => {
                            openDialog({
                              type: 'confirm',
                              title: ignoredUsers?.includes(user.id) ? `Unignore ${user.username}?` : `Ignore ${user.username}?`,
                              description: ignoredUsers?.includes(user.id) 
                                ? `You will start receiving notifications and messages from ${user.username} again.` 
                                : `You will no longer receive notifications or messages from ${user.username}.`,
                              confirmLabel: ignoredUsers?.includes(user.id) ? 'Unignore' : 'Ignore',
                              onConfirm: () => {
                                if (ignoredUsers?.includes(user.id)) {
                                  unignoreUser(user.id);
                                } else {
                                  ignoreUser(user.id);
                                }
                              }
                            });
                          }
                        },
                        blockedUsers?.includes(user.id) ? {
                          id: 'unblock',
                          label: 'Unblock',
                          icon: <UserX size={14} />,
                          onClick: () => useAppStore.getState().unblockUser(user.id)
                        } : {
                          id: 'block',
                          label: 'Block',
                          icon: <UserX size={14} />,
                          danger: true,
                          onClick: () => {
                            openDialog({
                              type: 'confirm',
                              title: `Block ${user.username}?`,
                              description: `${user.username} won't be able to send you messages or friend requests.`,
                              confirmLabel: 'Block',
                              isDanger: true,
                              onConfirm: () => blockUser(user.id)
                            });
                          }
                        },

                        // ── Section 5: Mute ──
                        { divider: true, id: 'd-mute', label: '' },
                        isUserMuted(user.id) ? {
                          id: 'unmute-user',
                          label: `Unmute @${user.username}`,
                          icon: <Volume2 size={14} />,
                          onClick: () => unmuteUser(user.id)
                        } : {
                          id: 'mute-user',
                          label: `Mute @${user.username}`,
                          icon: <VolumeX size={14} />,
                          rightIcon: <ChevronRight size={12} />,
                          submenu: [
                            { id: 'mute-15m', label: 'For 15 Minutes', onClick: () => muteUser(user.id, 15 * 60 * 1000) },
                            { id: 'mute-1h',  label: 'For 1 Hour',    onClick: () => muteUser(user.id, 60 * 60 * 1000) },
                            { id: 'mute-3h',  label: 'For 3 Hours',   onClick: () => muteUser(user.id, 3 * 60 * 60 * 1000) },
                            { id: 'mute-8h',  label: 'For 8 Hours',   onClick: () => muteUser(user.id, 8 * 60 * 60 * 1000) },
                            { id: 'mute-24h', label: 'For 24 Hours',  onClick: () => muteUser(user.id, 24 * 60 * 60 * 1000) },
                            { divider: true, id: 'mute-d', label: '' },
                            { id: 'mute-until', label: 'Until I turn it back on', onClick: () => muteUser(user.id, null) },
                          ]
                        },

                        // ── Section 6: Copy IDs ──
                        { divider: true, id: 'd-copy', label: '' },
                        {
                          id: 'copy-user-id',
                          label: 'Copy User ID',
                          icon: <Hash size={14} />,
                          rightIcon: <span className="text-[9px] font-black bg-surface-4 border border-border/50 px-1 py-0.5 rounded text-text-muted">ID</span>,
                          onClick: () => navigator.clipboard.writeText(user.id)
                        },
                        {
                          id: 'copy-channel-id',
                          label: 'Copy Channel ID',
                          icon: <Copy size={14} />,
                          rightIcon: <span className="text-[9px] font-black bg-surface-4 border border-border/50 px-1 py-0.5 rounded text-text-muted">ID</span>,
                          onClick: () => {
                            const myId = currentUser?.id || '';
                            const [a, b] = [myId, user.id].sort();
                            navigator.clipboard.writeText(`dm-${a}-${b}`);
                          }
                        },
                      ].filter(Boolean) as any}
                    >
                      <UserItem
                        user={user}
                        isActive={activeDmId === user.id}
                        isUnread={isDmUnread(user.id)}
                        onClick={() => {
                          setActiveDm(user.id);
                        }}
                      />
                    </ContextMenu>
                  ))}
              </div>
            </div>
          ) : (
            <ContextMenu items={headerContextMenuItems} className="min-h-full w-full">
              <div className="space-y-4 mt-2">
                {systemConfig?.activeBroadcast && (
                  <div className="group/cat mb-4">
                    <h3 className="text-[10px] uppercase font-bold tracking-widest text-text-muted px-2 py-1.5 flex items-center justify-between group">
                      <div className="flex items-center gap-1">
                        <Megaphone size={10} className="text-accent" />
                        App Announcements
                      </div>
                    </h3>
                    <div className="space-y-0.5">
                      <ChannelItem
                        channel={{ id: 'chan_app_announcement', name: 'app-announcements', type: 'announcement' }}
                        icon={<Megaphone size={14} className="text-accent" />}
                        isActive={activeChannelId === 'chan_app_announcement'}
                        onClick={() => {
                          useAppStore.setState({
                            activeChannelId: 'chan_app_announcement',
                            activeDmId: null,
                            isDraftsOpen: false,
                            isExploreOpen: false,
                            isAdminOpen: false
                          });
                        }}
                      />
                    </div>
                  </div>
                )}
                <SortableContext items={categories.filter(c => c.serverId === activeServerId).map(c => c.id)} strategy={verticalListSortingStrategy}>
                    {categories.filter(c => c.serverId === activeServerId).sort((a, b) => a.order - b.order).map(category => {
                      const categoryChannels = channels.filter(ch => ch.categoryId === category.id && ch.serverId === activeServerId).sort((a, b) => (a.order || 0) - (b.order || 0));
                      const isCollapsed = collapsedCategories.has(category.id);

                      return (
                        <SortableCategory
                          key={category.id}
                          id={category.id}
                          category={category}
                          isCollapsed={isCollapsed}
                          onToggle={() => toggleCategory(category.id)}
                          onAddChannel={(e) => handleAddChannel(category.id, e)}
                        >
                          <SortableContext items={categoryChannels.map(c => c.id)} strategy={verticalListSortingStrategy}>
                            {categoryChannels
                              .filter(channel => {
                                const activeServer = servers.find(s => s.id === activeServerId);
                                const hideMuted = activeServer?.settings?.isMuted && activeServer?.settings?.hideMutedChannels;
                                if (hideMuted) {
                                  if (channel.id === activeChannelId) return true;
                                  return isChannelUnread(channel.id, activeServerId);
                                }
                                return true;
                              })
                              .map(channel => {
                                const Icon = getChannelIcon(channel.type);
                                const isVoice = channel.type === 'voice';
                              const isVoiceConnected = voiceState.channelId === channel.id;
                              
                              const voiceConns = voiceConnections || {};
                              const channelUsers = Object.values(voiceConns).filter((vc: any) => vc.channelId === channel.id);
                              const voiceUserCount = channelUsers.length;

                              return (
                                <SortableChannel key={channel.id} id={channel.id} channel={channel}>
                                  <ContextMenu
                                    items={[
                                      { id: 'mark-read', label: 'Mark as Read', icon: <Check size={14} />, onClick: () => {
                                        const timestamps = JSON.parse(localStorage.getItem('last_read_timestamps') || '{}');
                                        timestamps[channel.id] = new Date().toISOString();
                                        localStorage.setItem('last_read_timestamps', JSON.stringify(timestamps));
                                        useAppStore.setState({ messages: [...messages] });
                                      }},
                                      { id: 'settings', label: 'Channel Settings', icon: <Settings size={14} />, onClick: () => {
                                        setSettingsChannelId(channel.id);
                                      }},
                                      { id: 'rename', label: 'Rename Channel', icon: <Pencil size={14} />, onClick: () => {
                                        useAppStore.getState().openDialog({
                                          type: 'input',
                                          title: 'Rename Channel',
                                          description: 'Enter a new name for this channel.',
                                          defaultValue: channel.name,
                                          onConfirm: (newName) => useAppStore.getState().updateChannel(channel.id, { name: newName })
                                        });
                                      }},
                                      { divider: true, id: 'd1', label: '' },
                                      { id: 'delete', label: 'Delete Channel', icon: <Trash2 size={14} />, danger: true, onClick: () => {
                                        useAppStore.getState().openDialog({
                                          type: 'confirm',
                                          title: 'Delete Channel',
                                          description: `Are you sure you want to delete #${channel.name}?`,
                                          onConfirm: () => useAppStore.getState().deleteChannel(channel.id)
                                        });
                                      }}
                                    ]}
                                  >
                                    <div key={channel.id}>
                                      <ChannelItem
                                        channel={channel}
                                        icon={<Icon size={14} />}
                                        isActive={isVoice ? isVoiceConnected : activeChannelId === channel.id}
                                        hasDraft={!!drafts[channel.id]}
                                        isUnread={isChannelUnread(channel.id, activeServerId)}
                                        onClick={() => {
                                          setActiveChannel(channel.id);
                                          if (isVoice && !isVoiceConnected) {
                                            joinVoiceChannel(channel.id);
                                          }
                                        }}
                                        mentionCount={notifications.filter(n => n.channelId === channel.id && !n.read && n.type === 'mention').length}
                                      />
                                      {isVoice && voiceUserCount > 0 && (
                                        <div className="ml-7 space-y-0.5 py-1">
                                          {channelUsers.map((vc: any) => {
                                            const u = users[vc.userId];
                                            if (!u) return null;
                                            return (
                                              <UserPopoverCard key={vc.userId} userId={vc.userId} className="w-full block">
                                                <VoiceUserItem user={u} voiceConnection={vc} />
                                              </UserPopoverCard>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  </ContextMenu>
                                </SortableChannel>
                              );
                            })}
                          </SortableContext>
                        </SortableCategory>
                      )
                    })}
                  </SortableContext>
              </div>
            </ContextMenu>
          )}
        </div>

        <div className="p-3 shrink-0 mt-auto relative">
          <motion.div layout className="bg-surface-2 border border-border/50 rounded-lg flex flex-col shadow-lg relative overflow-hidden">
            {/* Voice Status Bar */}
            <VoiceStatusBar />

            {/* User Profile Bar */}
            <motion.div layout className="p-2 flex items-center gap-2 relative bg-surface-2 z-10 rounded-b-lg">
              <div 
                onClick={(e) => { e.stopPropagation(); setIsStatusPickerOpen(!isStatusPickerOpen); }}
                className="shrink-0 relative group cursor-pointer"
              >
                <Avatar
                  src={currentUser?.avatarUrl}
                  alt={currentUser?.username}
                  size="md"
                  status={currentUser?.status || 'online'}
                />
              </div>
              <div 
                onClick={(e) => { e.stopPropagation(); setIsStatusPickerOpen(!isStatusPickerOpen); }}
                className="flex-1 min-w-0 py-0.5 px-2 -ml-1 hover:bg-surface-3/50 rounded-lg cursor-pointer transition-colors group"
              >
                <div className="text-[13px] font-bold text-text-primary truncate">{currentUser?.username}</div>
                <div className="text-[11px] text-text-muted font-medium truncate group-hover:text-text-secondary transition-colors">{currentUser?.customStatus || "Set Status"}</div>
              </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setNotificationsOpen(true)}
                className="text-text-muted hover:text-text-primary w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-3 transition-colors relative"
              >
                <Bell size={16} />
                {useAppStore.getState().notifications.filter(n => !n.read).length > 0 && (
                  <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full ring-[2.5px] ring-surface-2" />
                )}
              </button>
              <button
                onClick={() => setSettingsOpen(true)}
                className="text-text-muted hover:text-text-primary w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-3 transition-colors"
              >
                <Settings size={16} />
              </button>
            </div>
            </motion.div>
          </motion.div>

          <StatusPicker
            isOpen={isStatusPickerOpen}
            onClose={() => setIsStatusPickerOpen(false)}
            currentStatus={currentUser?.status || 'online'}
            currentCustom={currentUser?.customStatus}
            onStatusChange={setUserStatus}
            onCustomStatusChange={setCustomStatus}
          />
        </div>
      </div>

      {/* Create Workspace Modal */}
      <AnimatePresence>
        {isCreateWorkspaceOpen && (
          <div className="fixed inset-0 z-10000 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateWorkspaceOpen(false)}
              className="absolute inset-0 bg-surface-0/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-surface-1 rounded-lg shadow-2xl p-6 border border-border"
            >
              <h2 className="text-xl font-bold text-text-primary mb-2 text-center">New Workspace</h2>
              <p className="text-text-tertiary text-xs text-center mb-6 px-4">
                Configure a new technical environment for your organization.
              </p>

              <div className="space-y-3">
                <button onClick={() => handleCreateServer()} className="w-full h-14 border border-border hover:border-accent/40 bg-surface-2 rounded flex items-center px-4 gap-4 transition-all group">
                  <div className="w-8 h-8 rounded bg-surface-3 flex items-center justify-center text-text-secondary transition-all">
                    <Compass size={18} />
                  </div>
                  <span className="font-bold text-text-secondary group-hover:text-text-primary transition-colors text-[13px] uppercase tracking-wider">Start Fresh</span>
                  <ArrowRightCircle size={16} className="ml-auto text-text-muted group-hover:text-accent transition-colors" />
                </button>

                <div className="pt-2">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-text-muted mb-2.5">Templates</h3>
                  <div className="space-y-2">
                    <button onClick={() => handleCreateServer('gaming')} className="w-full h-12 border border-border hover:border-accent/40 bg-surface-2 rounded flex items-center px-4 gap-4 transition-all group">
                      <div className="w-6 h-6 rounded bg-surface-3 flex items-center justify-center text-text-secondary">
                        <Layers size={14} />
                      </div>
                      <span className="font-bold text-text-tertiary group-hover:text-text-primary transition-colors text-[12px] uppercase tracking-widest">Gaming Hub</span>
                    </button>
                    <button onClick={() => handleCreateServer('school')} className="w-full h-12 border border-border hover:border-accent/40 bg-surface-2 rounded flex items-center px-4 gap-4 transition-all group">
                      <div className="w-6 h-6 rounded bg-surface-3 flex items-center justify-center text-text-secondary">
                        <MessageSquare size={14} />
                      </div>
                      <span className="font-bold text-text-tertiary group-hover:text-text-primary transition-colors text-[12px] uppercase tracking-widest">School Hub</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Server Settings */}
      <ServerSettings isOpen={isServerSettingsOpen} onClose={() => setIsServerSettingsOpen(false)} serverId={activeServerId || ''} />

      {/* Create Channel Modal */}
      {createChannelCategory && <CreateChannelModal isOpen={true} onClose={() => setCreateChannelCategory(null)} categoryId={createChannelCategory} />}

      {/* Create Folder Modal */}
      <CreateFolderModal isOpen={isCreateFolderOpen} onClose={() => setIsCreateFolderOpen(false)} />
      
      {/* Create Group DM Modal */}
      <CreateGroupDmModal isOpen={isCreateGroupDmOpen} onClose={() => setIsCreateGroupDmOpen(false)} />

      {/* Edit Folder Modal */}
      {editingFolderId && <EditFolderModal isOpen={true} onClose={() => setEditingFolderId(null)} folderId={editingFolderId} />}

      {/* Channel Settings Modal */}
      {settingsChannelId && <ChannelSettingsModal isOpen={true} onClose={() => setSettingsChannelId(null)} channelId={settingsChannelId} />}

      {/* Create Invite Modal */}
      <CreateInviteModal isOpen={!!inviteServerId} onClose={() => setInviteServerId(null)} serverId={inviteServerId || ''} />

      {/* Global User Profile Modal */}
      <UserProfileModal userId={profileModalUserId || ''} isOpen={!!profileModalUserId} onClose={() => setProfileModalUserId(null)} />

      <DragOverlay dropAnimation={{
        sideEffects: defaultDropAnimationSideEffects({
          styles: {
            active: {
              opacity: '0.5',
            },
          },
        }),
      }}>
        {activeDragId ? (() => {
          // Server drag overlay
          const server = servers.find(s => s.id === activeDragId);
          if (server) return (
            <div className="opacity-95 rotate-1 scale-105 shadow-[0_24px_60px_rgba(0,0,0,0.6)] bg-surface-2 rounded-lg border border-white/10 w-[248px] backdrop-blur-sm">
              <WorkspaceItem
                name={server.name}
                icon={
                  server.iconUrl
                    ? <img src={server.iconUrl} className="w-4 h-4 rounded-sm" alt="" />
                    : <div className="w-4 h-4 bg-accent/20 rounded-sm flex items-center justify-center"><span className="text-[8px] font-bold text-accent">{server.name[0]}</span></div>
                }
                isActive={false}
                onClick={() => {}}
              />
            </div>
          );

          // Folder drag overlay
          const folder = folders.find(f => f.id === activeDragId);
          if (folder) {
            const folderServers = servers.filter(s => folder.serverIds.includes(s.id));
            return (
              <div className="opacity-95 rotate-1 scale-105 shadow-[0_24px_60px_rgba(0,0,0,0.6)] bg-surface-2 rounded-lg border border-white/10 w-[248px] px-2 py-1.5">
                <div className="flex items-center gap-2 px-1">
                  <div className="flex -space-x-1.5 items-center shrink-0">
                    {folderServers.slice(0, 3).map(s => (
                      <div key={s.id} className="w-4 h-4 rounded-full border border-surface-1 bg-surface-3 flex items-center justify-center overflow-hidden">
                        {s.iconUrl ? <img src={s.iconUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-[7px] font-bold">{s.name[0]}</span>}
                      </div>
                    ))}
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-widest truncate" style={{ color: folder.color }}>{folder.name}</span>
                  <span className="text-[10px] text-text-muted ml-auto">{folderServers.length} spaces</span>
                </div>
              </div>
            );
          }

          // Category drag overlay
          const category = categories.find(c => c.id === activeDragId);
          if (category) return (
            <div className="opacity-95 scale-105 shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-surface-2 px-3 py-1.5 rounded-md border border-white/10 w-[248px] text-[10px] uppercase font-bold tracking-widest text-text-primary flex items-center gap-1">
              <ChevronDown size={10} />
              {category.name}
            </div>
          );

          // Channel drag overlay
          const channel = channels.find(c => c.id === activeDragId);
          if (channel) {
            const Icon = getChannelIcon(channel.type);
            return (
              <div className="opacity-95 scale-105 shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-surface-2 rounded border border-white/10 w-[248px]">
                <ChannelItem channel={channel} icon={<Icon size={14} />} isActive={false} onClick={() => {}} />
              </div>
            );
          }

          return null;
        })() : null}
      </DragOverlay>
    </DndContext>
  );
}

const WorkspaceItem: React.FC<{ 
  name: string, 
  icon: React.ReactNode, 
  isActive: boolean, 
  onClick: () => void,
  mentionCount?: number,
  draggable?: boolean,
  onDragStart?: (e: React.DragEvent) => void,
  isVerified?: boolean,
  isUnread?: boolean
}> = ({ name, icon, isActive, onClick, mentionCount, draggable, onDragStart, isVerified, isUnread }) => {
  return (
    <button
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      className={cn(
        "relative w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-sm font-medium transition-all text-left outline-none ring-0 focus:ring-0 focus:outline-none",
        isActive ? "text-text-primary animate-fade-in" : isUnread ? "text-text-primary font-bold" : "text-text-secondary hover:bg-surface-3 hover:text-text-primary"
      )}
    >
      {isUnread && !isActive && (
        <span className="absolute left-1 w-1 h-3 rounded-r bg-white" />
      )}
      <div className={cn("flex items-center justify-center relative z-10", isActive || isUnread ? "text-text-primary" : "text-text-muted")}>
        {icon}
      </div>
      <span className="truncate relative z-10 flex-1 flex items-center gap-1">
        <span>{name}</span>
        {isVerified && (
          <span title="Verified Space">
            <ShieldCheck size={13} className="text-accent fill-accent/10 shrink-0" />
          </span>
        )}
      </span>
      {mentionCount !== undefined && mentionCount > 0 && !isActive && (
        <span className="relative z-10 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-danger text-white text-[10px] font-bold px-1 animate-pulse-subtle">
          {mentionCount}
        </span>
      )}
      {isActive && (
        <motion.div 
          layoutId="activeWorkspaceIndicator"
          className="absolute inset-0 bg-surface-3 rounded-lg border border-white/5 z-0" 
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
    </button>
  );
};

const UserItem: React.FC<{ user: any, isActive?: boolean, onClick?: () => void, isUnread?: boolean }> = ({ user, isActive, onClick, isUnread }) => {
  const nickname = useAppStore(state => state.userNicknames?.[user.id]);
  const isPinned = useAppStore(state => state.pinnedDms?.includes(user.id));
  const isMuted = useAppStore(state => {
    const mute = state.mutedUsers?.find(m => m.userId === user.id);
    if (!mute) return false;
    if (mute.expiresAt === null) return true;
    return new Date(mute.expiresAt).getTime() > Date.now();
  });

  const displayName = nickname || user.username;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-2 py-2 rounded transition-all group text-left outline-none border border-transparent ring-0 focus:ring-0 focus:outline-none relative",
        isActive ? "bg-surface-2 border-border shadow-sm" : "hover:bg-surface-2"
      )}
    >
      <Avatar
        src={user.avatarUrl}
        alt={user.username}
        size="sm"
        status={user.status}
        showStatus={true}
      />
      <div className="flex-1 min-w-0">
        <div className={cn(
          "text-sm font-medium truncate transition-colors flex items-center justify-between",
          isActive || isUnread ? "text-text-primary font-bold" : "text-text-secondary group-hover:text-text-primary"
        )}>
          <span className="truncate flex-1">{displayName}</span>
          <div className="flex items-center gap-1.5 shrink-0 ml-1">
            {isMuted && <VolumeX size={12} className="text-text-muted" />}
            {isPinned && <Pin size={12} className="text-accent fill-accent/15 rotate-45" />}
            {isUnread && (
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0" />
            )}
          </div>
        </div>
      </div>
    </button>
  );
};

const VoiceUserItem: React.FC<{ user: any, voiceConnection?: any }> = ({ user, voiceConnection }) => {
  const { voiceState, toggleMute, toggleDeafen, setSettingsOpen, servers, activeServerId, currentUser } = useAppStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const isSpeaking = voiceConnection?.isSpeaking && !voiceConnection?.isMuted;
  const isMuted = voiceConnection?.isMuted;
  const isDeafened = voiceConnection?.isDeafened;
  const isMe = user.id === currentUser?.id;
  const isConnecting = isMe && voiceState?.isConnecting;

  const activeServer = servers.find(s => s.id === activeServerId);
  const isServerOwner = activeServer?.ownerId === currentUser?.id;

  // Build Context Menu Items
  const contextMenuItems = isMe ? [
    {
      id: 'profile',
      label: 'Profile',
      onClick: () => setIsProfileOpen(true)
    },
    {
      id: 'mention',
      label: 'Mention',
      onClick: () => {}
    },
    { divider: true, id: 'd1', label: '' },
    {
      id: 'mute',
      label: 'Mute',
      checked: !!voiceState.isMuted,
      onClick: () => toggleMute()
    },
    {
      id: 'deafen',
      label: 'Deafen',
      checked: !!voiceState.isDeafened,
      onClick: () => toggleDeafen()
    },
    {
      id: 'edit-profile',
      label: 'Edit Per-server Profile',
      onClick: () => setSettingsOpen(true)
    },
    {
      id: 'apps',
      label: 'Apps',
      rightIcon: <ChevronRight size={14} />
    },
    {
      id: 'roles',
      label: 'Roles',
      rightIcon: <ChevronRight size={14} />
    },
    { divider: true, id: 'd2', label: '' },
    {
      id: 'copy-id',
      label: 'Copy User ID',
      rightIcon: <span className="text-[10px] font-bold bg-[#383a40] text-[#dbdee1] px-1 py-0.5 rounded">ID</span>,
      onClick: () => navigator.clipboard.writeText(user.id)
    }
  ] : [
    {
      id: 'profile',
      label: 'Profile',
      onClick: () => setIsProfileOpen(true)
    },
    {
      id: 'mention',
      label: 'Mention',
      onClick: () => {
        window.dispatchEvent(new CustomEvent('nexus:insert-mention', { detail: user.username }));
      }
    },
    { divider: true, id: 'd1', label: '' },
    {
      id: 'mute',
      label: 'Mute',
      checked: !!voiceConnection?.isMuted,
      onClick: async () => {
        const newMuted = !voiceConnection?.isMuted;
        useAppStore.setState((state) => {
          const newConns = { ...state.voiceConnections };
          if (newConns[user.id]) {
            newConns[user.id] = { ...newConns[user.id], isMuted: newMuted };
          }
          return { voiceConnections: newConns };
        });
        try {
          await fetch('/api/voice/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, isMuted: newMuted })
          });
        } catch (e) {
          console.error('Failed to sync mute state:', e);
        }
      }
    },
    {
      id: 'deafen',
      label: 'Deafen',
      checked: !!voiceConnection?.isDeafened,
      onClick: async () => {
        const newDeafened = !voiceConnection?.isDeafened;
        useAppStore.setState((state) => {
          const newConns = { ...state.voiceConnections };
          if (newConns[user.id]) {
            newConns[user.id] = { ...newConns[user.id], isDeafened: newDeafened };
          }
          return { voiceConnections: newConns };
        });
        try {
          await fetch('/api/voice/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, isDeafened: newDeafened })
          });
        } catch (e) {
          console.error('Failed to sync deafen state:', e);
        }
      }
    },
    {
      id: 'edit-profile',
      label: 'Edit Per-server Profile',
      onClick: () => {}
    },
    {
      id: 'apps',
      label: 'Apps',
      rightIcon: <ChevronRight size={14} />
    },
    {
      id: 'roles',
      label: 'Roles',
      rightIcon: <ChevronRight size={14} />
    },
    { divider: true, id: 'd2', label: '' },
    {
      id: 'mod-view',
      label: 'Open in Mod View'
    },
    {
      id: 'server-mute',
      label: 'Server Mute',
      checked: !!voiceConnection?.isMuted,
      disabled: !isServerOwner,
      onClick: async () => {
        const newMuted = !voiceConnection?.isMuted;
        useAppStore.setState((state) => {
          const newConns = { ...state.voiceConnections };
          if (newConns[user.id]) {
            newConns[user.id] = { ...newConns[user.id], isMuted: newMuted };
          }
          return { voiceConnections: newConns };
        });
        try {
          await fetch('/api/voice/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, isMuted: newMuted })
          });
        } catch (e) {
          console.error('Failed to sync server mute state:', e);
        }
      }
    },
    {
      id: 'server-deafen',
      label: 'Server Deafen',
      checked: !!voiceConnection?.isDeafened,
      disabled: !isServerOwner,
      onClick: async () => {
        const newDeafened = !voiceConnection?.isDeafened;
        useAppStore.setState((state) => {
          const newConns = { ...state.voiceConnections };
          if (newConns[user.id]) {
            newConns[user.id] = { ...newConns[user.id], isDeafened: newDeafened };
          }
          return { voiceConnections: newConns };
        });
        try {
          await fetch('/api/voice/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, isDeafened: newDeafened })
          });
        } catch (e) {
          console.error('Failed to sync server deafen state:', e);
        }
      }
    },
    { divider: true, id: 'd3', label: '' },
    {
      id: 'copy-id',
      label: 'Copy User ID',
      rightIcon: <span className="text-[10px] font-bold bg-[#383a40] text-[#dbdee1] px-1 py-0.5 rounded">ID</span>,
      onClick: () => navigator.clipboard.writeText(user.id)
    }
  ];

  return (
    <ContextMenu items={contextMenuItems} className="w-full">
      <div className={cn(
        "flex items-center gap-2 px-2 py-0.5 group transition-all duration-300 rounded hover:bg-surface-3/50 cursor-pointer select-none",
        isConnecting && "opacity-35 brightness-75 select-none pointer-events-none"
      )}>
        <div className={cn(
          "rounded-md transition-all duration-300 shrink-0",
          isSpeaking && !isConnecting ? "ring-2 ring-success ring-offset-1 ring-offset-surface-1 scale-105" : "ring-0"
        )}>
          <Avatar src={user.avatarUrl} alt={user.username} size="xs" showStatus={false} />
        </div>
        <span className={cn(
          "text-[11px] font-medium truncate transition-colors flex-1",
          isSpeaking && !isConnecting ? "text-success" : "text-text-secondary group-hover:text-text-primary"
        )}>
          {user.username}
          {isConnecting && (
            <span className="text-[9px] text-[#f0b232] ml-1.5 font-bold uppercase tracking-tight select-none">
              Connecting...
            </span>
          )}
        </span>
        <div className="flex items-center gap-1.5 shrink-0 ml-1">
          {isMuted && <MicOff size={13} className="text-[#f23f43] drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />}
          {isDeafened && <HeadphoneOff size={13} className="text-[#f23f43] drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />}
        </div>
      </div>
      <UserProfileModal userId={user.id} isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </ContextMenu>
  );
};

const ChannelItem: React.FC<{ channel: any, icon: React.ReactNode, isActive: boolean, onClick: () => void, mentionCount?: number, hasDraft?: boolean, isUnread?: boolean }> = ({ channel, icon, isActive, onClick, mentionCount, hasDraft, isUnread }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded text-[13px] font-bold transition-all text-left outline-none border border-transparent ring-0 focus:ring-0 focus:outline-none uppercase tracking-tight relative group",
        isActive
          ? "bg-surface-3 text-text-primary border-border"
          : isUnread
            ? "text-text-primary font-black bg-surface-2/30"
            : "text-text-muted hover:text-text-secondary hover:bg-surface-2"
      )}
    >
      {isUnread && !isActive && (
        <span className="absolute left-1 w-1 h-2 rounded-r bg-white" />
      )}
      <span className={cn("shrink-0", isActive || isUnread ? "text-text-primary" : "text-text-muted")}>{icon}</span>
      <span className="truncate flex-1 pl-1">{channel.name}</span>
      <div className="flex items-center gap-1.5">
        {hasDraft && !isActive && (
          <Pencil size={10} className="text-text-muted opacity-40 group-hover:opacity-100 transition-opacity" />
        )}
        {mentionCount !== undefined && mentionCount > 0 && !isActive && (
          <span className="min-w-[16px] h-4 flex items-center justify-center rounded-full bg-danger text-white text-[9px] font-bold px-1">
            {mentionCount}
          </span>
        )}
      </div>
    </button>
  );
};
