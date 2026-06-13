export type User = {
  id: string;
  username: string;
  avatarUrl: string;
  email?: string;
  tag?: string;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  customStatus?: string;
  bannerUrl?: string;
  roles?: string[];
  bio?: string;
  location?: string;
  joinedAt?: string;
  activity?: {
    name: string;
    type: 'playing' | 'listening' | 'coding' | 'watching';
    startedAt?: string;
  };
  socialLinks?: {
    platform: 'github' | 'twitter' | 'website';
    url: string;
  }[];
  pronouns?: string;
  password?: string;
  googleId?: string;
  needsOnboarding?: boolean;
  notificationPrefs?: {
    desktop?: boolean;
    messageSounds?: boolean;
    mentionAlerts?: boolean;
    dmNotifications?: boolean;
  };
  themeColor?: string;
};

export type Role = {
  id: string;
  name: string;
  color: string;
  permissions: string[];
  hoist?: boolean;
  autoAssignOnJoin?: boolean;
  isRestricted?: boolean;
};

export type Server = {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  ownerId: string;
  members: string[];
  roles: Role[];
  memberRoles: Record<string, string[]>; // userId -> roleIds[]
  settings?: {
    notifications: 'all' | 'mentions' | 'nothing';
    accentColor?: string;
    verification?: boolean;
    automod?: boolean;
    slowMode?: number;
    isMuted?: boolean;
    hideMutedChannels?: boolean;
    showAllChannels?: boolean;
    bannerPositionX?: number;
    bannerPositionY?: number;
    bannerScale?: number;
  };
  auditLogs: AuditLog[];
  bannerUrl?: string;
  tags?: string[];
  category?: string;
  insights?: {
    totalMessages: number;
    activeMembers: number;
    growthRate: number;
  };
  order?: number;
  isFavorite?: boolean;
};

export type AuditLogAction = 
  | 'CHANNEL_CREATE' | 'CHANNEL_DELETE' | 'CHANNEL_UPDATE'
  | 'ROLE_CREATE' | 'ROLE_DELETE' | 'ROLE_UPDATE'
  | 'MEMBER_KICK' | 'MEMBER_BAN' | 'MEMBER_UNBAN' | 'MEMBER_ROLE_UPDATE'
  | 'SERVER_UPDATE';

export type AuditLog = {
  id: string;
  action: AuditLogAction;
  executorId: string;
  targetId?: string;
  targetName?: string;
  timestamp: string;
  changes?: { field: string; old: any; new: any }[];
};

export type ChannelType = 'text' | 'voice' | 'announcement' | 'stage';

export type Channel = {
  id: string;
  serverId: string;
  name: string;
  type: ChannelType;
  categoryId?: string;
  description?: string;
  slowMode?: number; // seconds
  order?: number;
  nsfw?: boolean;
  isPrivate?: boolean;
  // Voice specific
  userLimit?: number;
  bitrate?: number;
  region?: string;
  isStage?: boolean;
  permissions?: Record<string, string[]>; // roleId -> permission[]
};

export type Category = {
  id: string;
  serverId: string;
  name: string;
  order: number;
  isCollapsed?: boolean;
  permissions?: Record<string, string[]>; // roleId -> permission[]
};

export type Thread = {
  id: string;
  channelId: string;
  name: string;
  ownerId?: string;
  createdAt?: string;
  messageCount: number;
  memberCount?: number;
  lastMessageAt?: string;
  autoArchiveDuration?: number; // minutes
  isPrivate?: boolean;
  isArchived: boolean;
};

export type Reaction = {
  emoji: string;
  count: number;
  userIds: string[];
};

export type Message = {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  timestamp: string;
  attachments?: {
    name: string;
    url: string;
    type: 'image' | 'file' | 'video';
    size: string;
  }[];
  linkPreviews?: {
    url: string;
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
  }[];
  editedAt?: string;
  reactions?: Reaction[];
  pinned?: boolean;
  replyToId?: string;
  poll?: {
    question: string;
    options: {
      id: string;
      text: string;
      voteCount: number;
      voterIds: string[];
    }[];
    expiresAt?: string;
    allowMultiple?: boolean;
  };
  isSending?: boolean;
};

export type VoiceState = {
  channelId: string | null;
  isConnecting?: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  isTransmitting: boolean;
  connectedUsers: string[]; // user IDs in voice
  stageSpeakers?: string[]; // user IDs on stage
  stageRequests?: string[]; // user IDs requesting to speak
  settings?: {
    noiseSuppression: boolean;
    echoCancellation: boolean;
    inputMode: 'voice-activity' | 'push-to-talk';
    inputSensitivity: number; // 0-100
    noiseThreshold: number; // -100 to 0 dB
  };
};

export type FriendTab = 'online' | 'all' | 'pending' | 'blocked';

export type Notification = {
  id: string;
  userId?: string;
  type: 'mention' | 'reply' | 'message';
  username: string;
  avatarUrl: string;
  content: string;
  channel: string;
  channelId?: string;
  serverId?: string;
  time: string;
  read: boolean;
};

export type Folder = {
  id: string;
  name?: string;
  color?: string;
  serverIds: string[];
};

export type DmChannel = {
  id: string;
  participants: string[]; // Array of user IDs
  name?: string; // Optional custom name for the group
  avatarUrl?: string; // Optional custom avatar/pfp for the group
  ownerId: string; // The user who created the group
  createdAt: string;
};

export type ServerInvite = {
  code: string;
  serverId: string;
  inviterId: string;
  createdAt: string;
  maxUses?: number; // Optional limit, 0 means unlimited
  uses: number;
  expiresAt?: string; // Optional expiration date, undefined means never expires
};

export type CallLog = {
  id: string;
  userId: string;
  type: 'audio' | 'video';
  timestamp: string;
  duration?: number; // in seconds
  missed?: boolean;
};

export interface MessageReaction {
  emoji: string;
  count: number;
  userIds: string[];
}

export type Webhook = {
  id: string;
  name: string;
  avatarUrl?: string;
  channelId: string;
  serverId: string;
  token: string;
  createdBy: string;
};

export interface SlashCommand {
  name: string;
  description: string;
  usage?: string;
  execute: (args: string[], context: { serverId: string; channelId: string; userId: string }) => void | string;
}

export interface UserPresence {
  userId: string;
  activeChannelId: string | null;
  activeServerId: string | null;
  activeDmId: string | null;
  isOnline: boolean;
  lastSeen: string;
  sseClientId: string | null;
}
