import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import https from 'https';
import url from 'url';
import { exec, spawn } from 'child_process';
import { WebSocketServer, WebSocket } from 'ws';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const PERSIST_DIR = process.env.APPDATA_DIR ? path.resolve(process.env.APPDATA_DIR) : process.cwd();
if (process.env.APPDATA_DIR && !fs.existsSync(PERSIST_DIR)) {
  fs.mkdirSync(PERSIST_DIR, { recursive: true });
}

// Copy source databases to AppData folder on first run
const DB_PATH = process.env.APPDATA_DIR ? path.join(PERSIST_DIR, 'dev.db') : path.resolve('prisma/dev.db');
if (process.env.APPDATA_DIR && !fs.existsSync(DB_PATH)) {
  const resourcesPath = process.resourcesPath || path.resolve(process.cwd(), 'resources');
  const srcDb = path.join(resourcesPath, 'prisma', 'dev.db');
  if (fs.existsSync(srcDb)) {
    fs.copyFileSync(srcDb, DB_PATH);
  } else {
    const fallbackDb = path.resolve('prisma/dev.db');
    if (fs.existsSync(fallbackDb)) {
      fs.copyFileSync(fallbackDb, DB_PATH);
    }
  }
}

const DB_FILE = process.env.APPDATA_DIR ? path.join(PERSIST_DIR, 'db.json') : path.resolve('db.json');
if (process.env.APPDATA_DIR && !fs.existsSync(DB_FILE)) {
  const resourcesPath = process.resourcesPath || path.resolve(process.cwd(), 'resources');
  const srcJson = path.join(resourcesPath, 'db.json');
  if (fs.existsSync(srcJson)) {
    fs.copyFileSync(srcJson, DB_FILE);
  } else {
    const fallbackJson = path.resolve('db.json');
    if (fs.existsSync(fallbackJson)) {
      fs.copyFileSync(fallbackJson, DB_FILE);
    }
  }
}

const adapter = new PrismaBetterSqlite3({
  url: `file:${DB_PATH}`
});
const prisma = new PrismaClient({ adapter });

import { MOCK_SERVERS, MOCK_CATEGORIES, MOCK_CHANNELS, MOCK_THREADS, MOCK_MESSAGES, MOCK_USERS, currentUser } from './src/lib/mockData';
import { Server, Category, Channel, Thread, Message, User, DmChannel, Notification, Role, ChannelType, AuditLogAction } from './src/types';

const app = express();
const port = process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT) : 3001;

app.use(express.json({ limit: '50mb' }));

const UPLOADS_DIR = process.env.APPDATA_DIR ? path.join(PERSIST_DIR, 'uploads') : path.resolve('uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// Initialize Database
interface DB {
  servers: Server[];
  categories: Category[];
  channels: Channel[];
  threads: Thread[];
  messages: Message[];
  users: Record<string, User>;
  dmChannels: Record<string, DmChannel>;
  notifications: Notification[];
  currentUser: User;
  systemConfig?: {
    allowRegistrations: boolean;
    allowGoogleLogin: boolean;
    maintenanceMode: boolean;
    globalAnnouncementBanner: string | null;
    activeBroadcast?: {
      content: string;
      durationHours: number;
      createdAt: string;
      expiresAt: string;
    } | null;
  };
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  return 'pbkdf2$' + salt + '$' + crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

function verifyPassword(password: string, storedHash: string): boolean {
  if (storedHash.startsWith('pbkdf2$')) {
    const parts = storedHash.split('$');
    const salt = parts[1];
    const derived = parts[2];
    const newHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return newHash === derived;
  }
  const legacyHash = crypto.createHash('sha256').update(password).digest('hex');
  return legacyHash === storedHash;
}

let cachedDB: DB | null = null;
let isSyncing = false;
let syncPending = false;

async function loadDBFromPrisma(): Promise<DB> {
  const usersList = await prisma.user.findMany();
  const users: Record<string, User> = {};
  for (const u of usersList) {
    let activity = undefined;
    if (u.activity) {
      try { activity = JSON.parse(u.activity); } catch (_) {}
    }
    let socialLinks = undefined;
    if (u.socialLinks) {
      try { socialLinks = JSON.parse(u.socialLinks); } catch (_) {}
    }
    users[u.id] = {
      id: u.id,
      username: u.username,
      avatarUrl: u.avatarUrl,
      email: u.email || undefined,
      tag: u.tag || undefined,
      status: u.status as any,
      customStatus: u.customStatus || undefined,
      bannerUrl: u.bannerUrl || undefined,
      bio: u.bio || undefined,
      location: u.location || undefined,
      joinedAt: u.joinedAt || undefined,
      themeColor: u.themeColor || undefined,
      needsOnboarding: u.needsOnboarding,
      pronouns: u.pronouns || undefined,
      activity,
      socialLinks,
    };
  }

  const prismaServers = await prisma.server.findMany({
    include: {
      members: true,
      roles: true,
    }
  });

  const servers: Server[] = prismaServers.map(s => {
    let parsedSettings = {};
    if (s.settings) {
      try {
        parsedSettings = JSON.parse(s.settings);
      } catch (_) {}
    }

    const memberRoles = (parsedSettings as any).memberRoles || {};

    let tags = undefined;
    if (s.tags) {
      try { tags = JSON.parse(s.tags); } catch (_) {}
    }
    let insights = undefined;
    if (s.insights) {
      try { insights = JSON.parse(s.insights); } catch (_) {}
    }

    return {
      id: s.id,
      name: s.name,
      description: s.description || undefined,
      iconUrl: s.iconUrl || undefined,
      bannerUrl: s.bannerUrl || undefined,
      ownerId: s.ownerId,
      members: s.members.map(m => m.userId),
      roles: s.roles.map(r => ({
        id: r.id,
        name: r.name,
        color: r.color,
        permissions: JSON.parse(r.permissions),
        hoist: r.hoist,
        autoAssignOnJoin: r.autoAssignOnJoin,
        isRestricted: r.isRestricted,
      })),
      memberRoles,
      settings: parsedSettings as any,
      auditLogs: [],
      category: s.category || undefined,
      tags,
      insights,
    };
  });

  for (const s of servers) {
    const logs = await prisma.auditLog.findMany({
      where: { serverId: s.id },
      orderBy: { timestamp: 'desc' },
      take: 50
    });
    s.auditLogs = logs.map(l => ({
      id: l.id,
      action: l.action as any,
      executorId: l.executorId,
      targetId: l.targetId || undefined,
      targetName: l.targetName || undefined,
      timestamp: l.timestamp,
      changes: l.changes ? JSON.parse(l.changes) : undefined,
    }));
  }

  const prismaCategories = await prisma.category.findMany();
  const categories: Category[] = prismaCategories.map(c => ({
    id: c.id,
    serverId: c.serverId,
    name: c.name,
    order: c.order,
    isCollapsed: c.isCollapsed,
  }));

  const prismaChannels = await prisma.channel.findMany();
  const channels: Channel[] = prismaChannels.map(c => ({
    id: c.id,
    serverId: c.serverId,
    name: c.name,
    type: c.type as any,
    categoryId: c.categoryId || undefined,
    description: c.description || undefined,
    slowMode: c.slowMode,
    order: c.order,
    nsfw: c.nsfw,
    isPrivate: c.isPrivate,
    userLimit: c.userLimit || undefined,
    bitrate: c.bitrate || undefined,
    region: c.region || undefined,
    isStage: c.isStage || undefined,
  }));

  const prismaThreads = await prisma.thread.findMany();
  const threads: Thread[] = prismaThreads.map(t => ({
    id: t.id,
    channelId: t.channelId,
    name: t.name,
    ownerId: t.ownerId || undefined,
    createdAt: t.createdAt || undefined,
    messageCount: t.messageCount,
    memberCount: t.memberCount || undefined,
    lastMessageAt: t.lastMessageAt || undefined,
    autoArchiveDuration: t.autoArchiveDuration,
    isPrivate: t.isPrivate,
    isArchived: t.isArchived,
  }));

  const prismaMessages = await prisma.message.findMany({
    include: {
      reactions: true,
      attachments: true,
    }
  });

  const messages: Message[] = prismaMessages.map(m => ({
    id: m.id,
    channelId: m.channelId,
    userId: m.userId,
    content: m.content,
    timestamp: m.timestamp,
    editedAt: m.editedAt || undefined,
    replyToId: m.replyToId || undefined,
    pinned: m.pinned,
    poll: m.poll ? JSON.parse(m.poll) : undefined,
    reactions: m.reactions.map(r => ({
      emoji: r.emoji,
      count: r.userIds ? JSON.parse(r.userIds).length : 0,
      userIds: JSON.parse(r.userIds || '[]'),
    })),
    attachments: m.attachments.map(a => ({
      name: a.name,
      url: a.url,
      type: a.type as any,
      size: a.size,
    })),
  }));

  const prismaDms = await prisma.dmChannel.findMany();
  const dmChannels: Record<string, DmChannel> = {};
  for (const d of prismaDms) {
    dmChannels[d.id] = {
      id: d.id,
      participants: JSON.parse(d.participants || '[]'),
      name: d.name || undefined,
      avatarUrl: d.avatarUrl || undefined,
      ownerId: d.ownerId,
      createdAt: d.createdAt,
    };
  }

  const prismaNotifications = await prisma.notification.findMany();
  const notifications: Notification[] = prismaNotifications.map(n => ({
    id: n.id,
    userId: n.userId || undefined,
    type: n.type as any,
    username: n.username,
    avatarUrl: n.avatarUrl,
    content: n.content,
    channel: n.channel,
    channelId: n.channelId || undefined,
    serverId: n.serverId || undefined,
    time: n.time,
    read: n.read,
  }));

  const defaultCurrentUser = users['u1'] || {
    id: 'guest',
    username: 'Guest',
    avatarUrl: 'https://i.pravatar.cc/150?u=guest',
    status: 'offline',
  };

  return {
    servers,
    categories,
    channels,
    threads,
    messages,
    users,
    dmChannels,
    notifications,
    currentUser: defaultCurrentUser,
  };
}

async function saveDBToPrisma(db: DB) {
  try {
    for (const user of Object.values(db.users)) {
      await prisma.user.upsert({
        where: { id: user.id },
        update: {
          username: user.username,
          email: user.email || null,
          tag: user.tag || null,
          password: user.password || null,
          googleId: user.googleId || null,
          avatarUrl: user.avatarUrl || '',
          bannerUrl: user.bannerUrl || null,
          status: user.status || 'offline',
          customStatus: user.customStatus || null,
          bio: user.bio || null,
          location: user.location || null,
          joinedAt: user.joinedAt || null,
          themeColor: user.themeColor || null,
          needsOnboarding: !!user.needsOnboarding,
          pronouns: user.pronouns || null,
          activity: user.activity ? JSON.stringify(user.activity) : null,
          socialLinks: user.socialLinks ? JSON.stringify(user.socialLinks) : null,
        },
        create: {
          id: user.id,
          username: user.username,
          email: user.email || null,
          tag: user.tag || null,
          password: user.password || null,
          googleId: user.googleId || null,
          avatarUrl: user.avatarUrl || '',
          bannerUrl: user.bannerUrl || null,
          status: user.status || 'offline',
          customStatus: user.customStatus || null,
          bio: user.bio || null,
          location: user.location || null,
          joinedAt: user.joinedAt || null,
          themeColor: user.themeColor || null,
          needsOnboarding: !!user.needsOnboarding,
          pronouns: user.pronouns || null,
          activity: user.activity ? JSON.stringify(user.activity) : null,
          socialLinks: user.socialLinks ? JSON.stringify(user.socialLinks) : null,
        }
      });
    }

    const dbUserIds = Object.keys(db.users);
    await prisma.user.deleteMany({
      where: { id: { notIn: dbUserIds } }
    });

    for (const server of db.servers) {
      const settingsCopy = { ...(server.settings || {}), memberRoles: server.memberRoles };

      await prisma.server.upsert({
        where: { id: server.id },
        update: {
          name: server.name,
          description: server.description || null,
          iconUrl: server.iconUrl || null,
          bannerUrl: server.bannerUrl || null,
          ownerId: server.ownerId,
          isFavorite: !!server.isFavorite,
          order: server.order || 0,
          settings: JSON.stringify(settingsCopy),
          category: server.category || null,
          tags: server.tags ? JSON.stringify(server.tags) : null,
          insights: server.insights ? JSON.stringify(server.insights) : null,
        },
        create: {
          id: server.id,
          name: server.name,
          description: server.description || null,
          iconUrl: server.iconUrl || null,
          bannerUrl: server.bannerUrl || null,
          ownerId: server.ownerId,
          isFavorite: !!server.isFavorite,
          order: server.order || 0,
          settings: JSON.stringify(settingsCopy),
          category: server.category || null,
          tags: server.tags ? JSON.stringify(server.tags) : null,
          insights: server.insights ? JSON.stringify(server.insights) : null,
        }
      });

      await prisma.serverMember.deleteMany({
        where: { serverId: server.id }
      });
      for (const userId of server.members) {
        if (db.users[userId]) {
          await prisma.serverMember.create({
            data: {
              userId,
              serverId: server.id,
              joinedAt: new Date().toISOString()
            }
          });
        }
      }

      await prisma.role.deleteMany({
        where: { serverId: server.id }
      });
      for (const role of server.roles) {
        await prisma.role.create({
          data: {
            id: role.id,
            name: role.name,
            color: role.color,
            permissions: JSON.stringify(role.permissions || []),
            hoist: !!role.hoist,
            autoAssignOnJoin: !!role.autoAssignOnJoin,
            isRestricted: !!role.isRestricted,
            serverId: server.id,
          }
        });
      }

      if (server.auditLogs) {
        for (const log of server.auditLogs) {
          await prisma.auditLog.upsert({
            where: { id: log.id },
            update: {
              action: log.action,
              executorId: log.executorId,
              targetId: log.targetId || null,
              targetName: log.targetName || null,
              timestamp: log.timestamp,
              changes: log.changes ? JSON.stringify(log.changes) : null,
              serverId: server.id,
            },
            create: {
              id: log.id,
              action: log.action,
              executorId: log.executorId,
              targetId: log.targetId || null,
              targetName: log.targetName || null,
              timestamp: log.timestamp,
              changes: log.changes ? JSON.stringify(log.changes) : null,
              serverId: server.id,
            }
          });
        }
        const logIdsToKeep = server.auditLogs.map(l => l.id);
        await prisma.auditLog.deleteMany({
          where: {
            serverId: server.id,
            id: { notIn: logIdsToKeep }
          }
        });
      }
    }

    const dbServerIds = db.servers.map(s => s.id);
    await prisma.server.deleteMany({
      where: { id: { notIn: dbServerIds } }
    });

    for (const cat of db.categories) {
      await prisma.category.upsert({
        where: { id: cat.id },
        update: {
          name: cat.name,
          order: cat.order || 0,
          isCollapsed: !!cat.isCollapsed,
          serverId: cat.serverId,
        },
        create: {
          id: cat.id,
          name: cat.name,
          order: cat.order || 0,
          isCollapsed: !!cat.isCollapsed,
          serverId: cat.serverId,
        }
      });
    }
    const dbCategoryIds = db.categories.map(c => c.id);
    await prisma.category.deleteMany({
      where: { id: { notIn: dbCategoryIds } }
    });

    for (const chan of db.channels) {
      await prisma.channel.upsert({
        where: { id: chan.id },
        update: {
          name: chan.name,
          type: chan.type || 'text',
          categoryId: chan.categoryId || null,
          description: chan.description || null,
          slowMode: chan.slowMode || 0,
          order: chan.order || 0,
          nsfw: !!chan.nsfw,
          isPrivate: !!chan.isPrivate,
          serverId: chan.serverId,
          userLimit: chan.userLimit || null,
          bitrate: chan.bitrate || null,
          region: chan.region || null,
          isStage: !!chan.isStage,
        },
        create: {
          id: chan.id,
          name: chan.name,
          type: chan.type || 'text',
          categoryId: chan.categoryId || null,
          description: chan.description || null,
          slowMode: chan.slowMode || 0,
          order: chan.order || 0,
          nsfw: !!chan.nsfw,
          isPrivate: !!chan.isPrivate,
          serverId: chan.serverId,
          userLimit: chan.userLimit || null,
          bitrate: chan.bitrate || null,
          region: chan.region || null,
          isStage: !!chan.isStage,
        }
      });
    }
    const dbChannelIds = db.channels.map(c => c.id);
    await prisma.channel.deleteMany({
      where: { id: { notIn: dbChannelIds } }
    });

    for (const thread of db.threads) {
      await prisma.thread.upsert({
        where: { id: thread.id },
        update: {
          channelId: thread.channelId,
          name: thread.name,
          ownerId: thread.ownerId || null,
          createdAt: thread.createdAt || null,
          messageCount: thread.messageCount || 0,
          memberCount: thread.memberCount || null,
          lastMessageAt: thread.lastMessageAt || null,
          autoArchiveDuration: thread.autoArchiveDuration || 60,
          isPrivate: !!thread.isPrivate,
          isArchived: !!thread.isArchived,
        },
        create: {
          id: thread.id,
          channelId: thread.channelId,
          name: thread.name,
          ownerId: thread.ownerId || null,
          createdAt: thread.createdAt || null,
          messageCount: thread.messageCount || 0,
          memberCount: thread.memberCount || null,
          lastMessageAt: thread.lastMessageAt || null,
          autoArchiveDuration: thread.autoArchiveDuration || 60,
          isPrivate: !!thread.isPrivate,
          isArchived: !!thread.isArchived,
        }
      });
    }
    const dbThreadIds = db.threads.map(t => t.id);
    await prisma.thread.deleteMany({
      where: { id: { notIn: dbThreadIds } }
    });

    for (const msg of db.messages) {
      await prisma.message.upsert({
        where: { id: msg.id },
        update: {
          channelId: msg.channelId,
          userId: msg.userId,
          content: msg.content || '',
          timestamp: msg.timestamp || new Date().toISOString(),
          editedAt: msg.editedAt || null,
          replyToId: msg.replyToId || null,
          pinned: !!msg.pinned,
          poll: msg.poll ? JSON.stringify(msg.poll) : null,
        },
        create: {
          id: msg.id,
          channelId: msg.channelId,
          userId: msg.userId,
          content: msg.content || '',
          timestamp: msg.timestamp || new Date().toISOString(),
          editedAt: msg.editedAt || null,
          replyToId: msg.replyToId || null,
          pinned: !!msg.pinned,
          poll: msg.poll ? JSON.stringify(msg.poll) : null,
        }
      });

      await prisma.reaction.deleteMany({
        where: { messageId: msg.id }
      });
      if (msg.reactions) {
        for (const reaction of msg.reactions) {
          await prisma.reaction.create({
            data: {
              emoji: reaction.emoji,
              messageId: msg.id,
              userIds: JSON.stringify(reaction.userIds || []),
            }
          });
        }
      }

      await prisma.attachment.deleteMany({
        where: { messageId: msg.id }
      });
      if (msg.attachments) {
        for (const att of msg.attachments) {
          await prisma.attachment.create({
            data: {
              name: att.name,
              url: att.url,
              type: att.type,
              size: att.size,
              messageId: msg.id,
            }
          });
        }
      }
    }

    const dbMessageIds = db.messages.map(m => m.id);
    await prisma.message.deleteMany({
      where: { id: { notIn: dbMessageIds } }
    });

    for (const [id, dm] of Object.entries(db.dmChannels)) {
      await prisma.dmChannel.upsert({
        where: { id },
        update: {
          participants: JSON.stringify(dm.participants || []),
          name: dm.name || null,
          avatarUrl: dm.avatarUrl || null,
          ownerId: dm.ownerId,
          createdAt: dm.createdAt || new Date().toISOString(),
        },
        create: {
          id,
          participants: JSON.stringify(dm.participants || []),
          name: dm.name || null,
          avatarUrl: dm.avatarUrl || null,
          ownerId: dm.ownerId,
          createdAt: dm.createdAt || new Date().toISOString(),
        }
      });
    }
    const dbDmChannelIds = Object.keys(db.dmChannels);
    await prisma.dmChannel.deleteMany({
      where: { id: { notIn: dbDmChannelIds } }
    });

    for (const notif of db.notifications) {
      await prisma.notification.upsert({
        where: { id: notif.id },
        update: {
          userId: notif.userId || null,
          type: notif.type,
          username: notif.username,
          avatarUrl: notif.avatarUrl,
          content: notif.content,
          channel: notif.channel,
          channelId: notif.channelId || null,
          serverId: notif.serverId || null,
          time: notif.time,
          read: !!notif.read,
        },
        create: {
          id: notif.id,
          userId: notif.userId || null,
          type: notif.type,
          username: notif.username,
          avatarUrl: notif.avatarUrl,
          content: notif.content,
          channel: notif.channel,
          channelId: notif.channelId || null,
          serverId: notif.serverId || null,
          time: notif.time,
          read: !!notif.read,
        }
      });
    }
    const dbNotificationIds = db.notifications.map(n => n.id);
    await prisma.notification.deleteMany({
      where: { id: { notIn: dbNotificationIds } }
    });
  } catch (err) {
    console.error('Error in saveDBToPrisma:', err);
  }
}

function queueDbSync(db: DB) {
  syncPending = true;
  if (!isSyncing) {
    triggerSync(db);
  }
}

async function triggerSync(db: DB) {
  isSyncing = true;
  syncPending = false;
  await saveDBToPrisma(db);
  isSyncing = false;
  if (syncPending && cachedDB) {
    triggerSync(cachedDB);
  }
}

async function initDB() {
  cachedDB = await loadDBFromPrisma();
  console.log('Database cache initialized from SQLite.');
}

function loadDB(): DB {
  if (!cachedDB) {
    console.warn('DB cache not initialized yet, returning defaultDB');
    return getDefaultDB();
  }
  return cachedDB;
}

function getDefaultDB(): DB {
  return {
    servers: MOCK_SERVERS,
    categories: MOCK_CATEGORIES,
    channels: MOCK_CHANNELS,
    threads: MOCK_THREADS,
    messages: MOCK_MESSAGES,
    users: MOCK_USERS,
    dmChannels: {},
    notifications: [],
    currentUser: currentUser,
  };
}

function saveDB(db: DB) {
  cachedDB = db;
  queueDbSync(db);
}

const SESSION_SECRET = process.env.SESSION_SECRET || 'unisora-stable-session-secret-key-12345';

function generateSessionToken(userId: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ userId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

function verifySessionToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(`${header}.${payload}`).digest('base64url');
    if (signature !== expectedSignature) return null;
    
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (Date.now() > decoded.exp) return null; // Expired
    return decoded.userId;
  } catch (e) {
    return null;
  }
}

// Session-aware helper to get the active user for the request
function getCurrentUser(req: express.Request, db: DB): User {
  const token = req.headers['session-token'] || req.headers['session-user-id'];
  if (token) {
    let userId = verifySessionToken(token as string);
    if (!userId) {
      // Graceful legacy fallback for development
      userId = token as string;
    }
    if (db.users[userId]) {
      return db.users[userId];
    }
  }
  return {
    id: 'guest',
    username: 'Guest',
    avatarUrl: 'https://i.pravatar.cc/150?u=guest',
    status: 'offline',
  };
}

function addBackendAuditLog(db: DB, serverId: string, executorId: string, action: AuditLogAction, targetId?: string, targetName?: string, changes?: any) {
  const server = db.servers.find(s => s.id === serverId);
  if (server) {
    if (!server.auditLogs) server.auditLogs = [];
    server.auditLogs.unshift({
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      action,
      executorId,
      targetId,
      targetName,
      changes,
      timestamp: new Date().toISOString()
    });
    server.auditLogs = server.auditLogs.slice(0, 50);
  }
}

interface VoiceConnection {
  userId: string;
  channelId: string;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
}
let voiceConnections: Record<string, VoiceConnection> = {};

// ── User Presence (in-memory) ─────────────────────────────────────────────────
interface UserPresence {
  userId: string;
  activeChannelId: string | null;
  activeServerId: string | null;
  activeDmId: string | null;
  isOnline: boolean;
  lastSeen: string;
  sseClientId: string | null;
}
const userPresence: Record<string, UserPresence> = {};

function getOrInitPresence(userId: string): UserPresence {
  if (!userPresence[userId]) {
    userPresence[userId] = {
      userId,
      activeChannelId: null,
      activeServerId: null,
      activeDmId: null,
      isOnline: false,
      lastSeen: new Date().toISOString(),
      sseClientId: null
    };
  }
  return userPresence[userId];
}

// ── SSE (Server-Sent Events) ──────────────────────────────────────────────────
// clientId → { res, userId }
const sseClients = new Map<string, { res: express.Response; userId: string }>();

interface WSClient {
  ws: WebSocket;
  userId: string;
  serverId?: string | null;
  channelId?: string | null;
}
const wsClients = new Set<WSClient>();

function broadcastEvent(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => {
    try { client.res.write(payload); } catch (_) { /* client disconnected */ }
  });

  const wsPayload = JSON.stringify({ event, data });
  wsClients.forEach(client => {
    try { client.ws.send(wsPayload); } catch (_) { /* client disconnected */ }
  });
}

// Send an event only to a specific user's SSE client or WS client
function sendToUser(userId: string, event: string, data: any) {
  const presence = userPresence[userId];
  if (presence?.sseClientId) {
    const client = sseClients.get(presence.sseClientId);
    if (client) {
      try {
        client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      } catch (_) { /* client disconnected */ }
    }
  }

  const wsPayload = JSON.stringify({ event, data });
  wsClients.forEach(client => {
    if (client.userId === userId) {
      try { client.ws.send(wsPayload); } catch (_) { /* client disconnected */ }
    }
  });
}

// Keepalive ping every 25 s to prevent proxy timeouts
setInterval(() => {
  sseClients.forEach(client => {
    try { client.res.write(': ping\n\n'); } catch (_) {}
  });
}, 25000);

// SSE Endpoint — accepts ?userId so we can link the connection to a user
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const clientId = `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const userId = (req.query.userId as string) || '';

  sseClients.set(clientId, { res, userId });

  // Mark user as online and link this SSE connection
  if (userId) {
    const p = getOrInitPresence(userId);
    p.isOnline = true;
    p.lastSeen = new Date().toISOString();
    p.sseClientId = clientId;
    broadcastEvent('presence_update', { ...p });
  }

  res.write(`event: connected\ndata: {"clientId":"${clientId}"}\n\n`);

  req.on('close', () => {
    sseClients.delete(clientId);
    if (userId && userPresence[userId]?.sseClientId === clientId) {
      userPresence[userId].isOnline = false;
      userPresence[userId].sseClientId = null;
      userPresence[userId].lastSeen = new Date().toISOString();
      broadcastEvent('presence_update', { ...userPresence[userId] });
    }
  });
});

// PUT /api/presence — client reports which channel/server it is currently viewing
app.put('/api/presence', (req, res) => {
  const { activeChannelId, activeServerId, activeDmId } = req.body;
  const db = loadDB();
  const user = getCurrentUser(req, db);
  if (user.id === 'guest') return res.json({ success: false });

  const p = getOrInitPresence(user.id);
  p.activeChannelId = activeChannelId || null;
  p.activeServerId = activeServerId || null;
  p.activeDmId = activeDmId || null;
  p.lastSeen = new Date().toISOString();
  p.isOnline = true;

  // Broadcast to everyone so sidebars update in real-time
  broadcastEvent('presence_update', { ...p });
  res.json({ success: true });
});

// GET /api/presence — return all presence records
app.get('/api/presence', (_req, res) => {
  res.json(Object.values(userPresence));
});

// Bootstrap API
app.get('/api/bootstrap', (req, res) => {
  const db = loadDB();
  const user = getCurrentUser(req, db);
  res.json({
    servers: db.servers,
    categories: db.categories,
    channels: db.channels,
    threads: db.threads,
    messages: db.messages,
    users: Object.values(db.users),
    dmChannels: Object.keys(db.dmChannels).reduce((acc, id) => {
      const dm = db.dmChannels[id];
      if (dm.participants.includes(user.id)) {
        acc[id] = dm;
      }
      return acc;
    }, {} as Record<string, DmChannel>),
    notifications: (db.notifications || []).filter(n => n.userId === user.id),
    currentUser: user,
    voiceConnections: Object.values(voiceConnections),
    presences: Object.values(userPresence),
    systemConfig: db.systemConfig,
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FRIEND SYSTEM API
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/friends — list all friend relationships for the current user
app.get('/api/friends', async (req, res) => {
  const db = loadDB();
  const user = getCurrentUser(req, db);
  if (user.id === 'guest') return res.status(401).json({ error: 'Not authenticated' });

  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { senderId: user.id },
        { receiverId: user.id },
      ]
    }
  });

  const friends: string[] = [];
  const pendingOutgoing: string[] = []; // userIds I sent request to
  const pendingIncoming: string[] = []; // userIds who sent me request

  for (const f of friendships) {
    if (f.status === 'accepted') {
      const friendId = f.senderId === user.id ? f.receiverId : f.senderId;
      if (!friends.includes(friendId)) friends.push(friendId);
    } else if (f.status === 'pending') {
      if (f.senderId === user.id) {
        pendingOutgoing.push(f.receiverId);
      } else {
        pendingIncoming.push(f.senderId);
      }
    }
  }

  // Fetch full user profiles for all involved users
  const users: Record<string, User> = {};
  for (const id of [...friends, ...pendingOutgoing, ...pendingIncoming]) {
    if (db.users[id]) {
      users[id] = db.users[id];
    }
  }

  return res.json({ friends, pendingOutgoing, pendingIncoming, users });
});

// POST /api/friends/request — send a friend request by username
app.post('/api/friends/request', async (req, res) => {
  const db = loadDB();
  const user = getCurrentUser(req, db);
  if (user.id === 'guest') return res.status(401).json({ error: 'Not authenticated' });

  const { username } = req.body;
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username is required' });
  }

  // Find the target user by username (case-insensitive)
  const targetUser = Object.values(db.users).find(
    u => u.username.toLowerCase() === username.toLowerCase() && u.id !== user.id
  );
  if (!targetUser) {
    return res.status(404).json({ error: `No user found with username "${username}"` });
  }

  // Check if already friends or request exists
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { senderId: user.id, receiverId: targetUser.id },
        { senderId: targetUser.id, receiverId: user.id },
      ]
    }
  });

  if (existing) {
    if (existing.status === 'accepted') {
      return res.status(409).json({ error: `You are already friends with ${targetUser.username}` });
    } else if (existing.status === 'pending') {
      if (existing.senderId === user.id) {
        return res.status(409).json({ error: `You already sent a friend request to ${targetUser.username}` });
      } else {
        // They already sent me a request — auto-accept!
        await prisma.friendship.update({
          where: { id: existing.id },
          data: { status: 'accepted' }
        });
        // Notify both users via SSE/WS
        sendToUser(user.id, 'friend_accepted', { user: targetUser });
        sendToUser(targetUser.id, 'friend_accepted', { user });
        return res.json({ success: true, autoAccepted: true, user: targetUser });
      }
    }
  }

  // Create the friend request
  await prisma.friendship.create({
    data: {
      senderId: user.id,
      receiverId: targetUser.id,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
  });

  // Notify the receiver via SSE/WS
  sendToUser(targetUser.id, 'friend_request_received', {
    fromUser: user,
  });

  return res.json({ success: true, user: targetUser });
});

// POST /api/friends/accept — accept an incoming friend request
app.post('/api/friends/accept', async (req, res) => {
  const db = loadDB();
  const user = getCurrentUser(req, db);
  if (user.id === 'guest') return res.status(401).json({ error: 'Not authenticated' });

  const { userId: senderId } = req.body;
  if (!senderId) return res.status(400).json({ error: 'userId is required' });

  const friendship = await prisma.friendship.findFirst({
    where: { senderId, receiverId: user.id, status: 'pending' }
  });
  if (!friendship) return res.status(404).json({ error: 'No pending request found' });

  await prisma.friendship.update({
    where: { id: friendship.id },
    data: { status: 'accepted' }
  });

  sendToUser(senderId, 'friend_accepted', { user });
  return res.json({ success: true });
});

// POST /api/friends/reject — reject an incoming friend request
app.post('/api/friends/reject', async (req, res) => {
  const db = loadDB();
  const user = getCurrentUser(req, db);
  if (user.id === 'guest') return res.status(401).json({ error: 'Not authenticated' });

  const { userId: senderId } = req.body;
  if (!senderId) return res.status(400).json({ error: 'userId is required' });

  await prisma.friendship.deleteMany({
    where: { senderId, receiverId: user.id, status: 'pending' }
  });

  return res.json({ success: true });
});

// POST /api/friends/cancel — cancel an outgoing friend request
app.post('/api/friends/cancel', async (req, res) => {
  const db = loadDB();
  const user = getCurrentUser(req, db);
  if (user.id === 'guest') return res.status(401).json({ error: 'Not authenticated' });

  const { userId: receiverId } = req.body;
  if (!receiverId) return res.status(400).json({ error: 'userId is required' });

  await prisma.friendship.deleteMany({
    where: { senderId: user.id, receiverId, status: 'pending' }
  });

  return res.json({ success: true });
});

// DELETE /api/friends/:userId — remove a friend
app.delete('/api/friends/:userId', async (req, res) => {
  const db = loadDB();
  const user = getCurrentUser(req, db);
  if (user.id === 'guest') return res.status(401).json({ error: 'Not authenticated' });

  const { userId } = req.params;

  await prisma.friendship.deleteMany({
    where: {
      status: 'accepted',
      OR: [
        { senderId: user.id, receiverId: userId },
        { senderId: userId, receiverId: user.id },
      ]
    }
  });

  sendToUser(userId, 'friend_removed', { userId: user.id });
  return res.json({ success: true });
});

// Voice Connection Simulation
let simulationInterval: NodeJS.Timeout | null = null;

function startVoiceSimulation(channelId: string) {
  if (simulationInterval) clearInterval(simulationInterval);
  
  let step = 0;
  simulationInterval = setInterval(() => {
    step++;
    
    // SarahDesign joins after 3 seconds
    if (step === 1) {
      voiceConnections['u2'] = {
        userId: 'u2',
        channelId,
        isMuted: false,
        isDeafened: false,
        isSpeaking: false
      };
    }
    // MikeG joins after 6 seconds (starts muted)
    else if (step === 2) {
      voiceConnections['u3'] = {
        userId: 'u3',
        channelId,
        isMuted: true,
        isDeafened: false,
        isSpeaking: false
      };
    }
    // Random status changes & speaking simulations
    else {
      const rand = Math.random();
      if (rand < 0.35) {
        if (voiceConnections['u2']) {
          voiceConnections['u2'].isSpeaking = !voiceConnections['u2'].isSpeaking;
        }
      } else if (rand < 0.55) {
        if (voiceConnections['u3']) {
          voiceConnections['u3'].isMuted = !voiceConnections['u3'].isMuted;
          if (voiceConnections['u3'].isMuted) {
            voiceConnections['u3'].isSpeaking = false;
          }
        }
      } else if (rand < 0.75) {
        if (voiceConnections['u3'] && !voiceConnections['u3'].isMuted) {
          voiceConnections['u3'].isSpeaking = !voiceConnections['u3'].isSpeaking;
        }
      } else if (rand < 0.90) {
        // EmmaW joins or toggles speaking
        if (!voiceConnections['u4']) {
          voiceConnections['u4'] = {
            userId: 'u4',
            channelId,
            isMuted: false,
            isDeafened: false,
            isSpeaking: false
          };
        } else {
          voiceConnections['u4'].isSpeaking = !voiceConnections['u4'].isSpeaking;
        }
      }
    }
  }, 2500);
}

function stopVoiceSimulation() {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
  delete voiceConnections['u2'];
  delete voiceConnections['u3'];
  delete voiceConnections['u4'];
}

// Voice Connection Endpoints
app.post('/api/voice/join', (req, res) => {
  const { userId, channelId } = req.body;
  if (!userId || !channelId) return res.status(400).json({ error: 'Missing parameters' });
  
  voiceConnections[userId] = {
    userId,
    channelId,
    isMuted: voiceConnections[userId]?.isMuted || false,
    isDeafened: voiceConnections[userId]?.isDeafened || false,
    isSpeaking: false
  };

  if (userId === 'u1') {
    startVoiceSimulation(channelId);
  }

  res.json(voiceConnections[userId]);
});

app.post('/api/voice/leave', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  
  delete voiceConnections[userId];

  if (userId === 'u1') {
    stopVoiceSimulation();
  }

  res.json({ success: true });
});

app.post('/api/voice/state', (req, res) => {
  const { userId, isMuted, isDeafened, isSpeaking } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  
  if (voiceConnections[userId]) {
    if (isMuted !== undefined) voiceConnections[userId].isMuted = isMuted;
    if (isDeafened !== undefined) voiceConnections[userId].isDeafened = isDeafened;
    if (isSpeaking !== undefined) voiceConnections[userId].isSpeaking = isSpeaking;
    res.json(voiceConnections[userId]);
  } else {
    res.status(404).json({ error: 'User not in voice channel' });
  }
});

async function performUploadsCleanup() {
  const users = await prisma.user.findMany({ select: { avatarUrl: true, bannerUrl: true } });
  const servers = await prisma.server.findMany({ select: { iconUrl: true, bannerUrl: true } });
  const messages = await prisma.message.findMany({ select: { attachments: true } });

  const activeAssets = new Set<string>();

  const addAsset = (url: string | null | undefined) => {
    if (url && url.startsWith('/uploads/')) {
      const parts = url.split('/');
      const filename = parts[parts.length - 1];
      if (filename) activeAssets.add(filename);
    }
  };

  users.forEach(u => {
    addAsset(u.avatarUrl);
    addAsset(u.bannerUrl);
  });

  servers.forEach(s => {
    addAsset(s.iconUrl);
    addAsset(s.bannerUrl);
  });

  messages.forEach(m => {
    if (m.attachments) {
      try {
        const attList = typeof m.attachments === 'string' ? JSON.parse(m.attachments) : m.attachments;
        if (Array.isArray(attList)) {
          attList.forEach((att: any) => addAsset(att.url));
        }
      } catch (_) {}
    }
  });

  const attachments = await prisma.attachment.findMany({ select: { url: true } });
  attachments.forEach(a => addAsset(a.url));

  if (!fs.existsSync(UPLOADS_DIR)) {
    return { deletedCount: 0, spaceReclaimedBytes: 0 };
  }

  const files = fs.readdirSync(UPLOADS_DIR);
  let deletedCount = 0;
  let spaceReclaimedBytes = 0;

  for (const file of files) {
    if (!activeAssets.has(file)) {
      const filePath = path.join(UPLOADS_DIR, file);
      try {
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          spaceReclaimedBytes += stats.size;
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      } catch (e) {
        console.error(`Failed to delete unreferenced file ${file}:`, e);
      }
    }
  }

  return { deletedCount, spaceReclaimedBytes };
}

app.post('/api/admin/cleanup-uploads', async (req, res) => {
  const db = loadDB();
  const currentUserObj = getCurrentUser(req, db);
  if (currentUserObj.email !== 'abderrahmanchakkouri@gmail.com') {
    return res.status(403).json({ error: 'Access Denied' });
  }

  try {
    const stats = await performUploadsCleanup();
    const spaceReclaimedMB = (stats.spaceReclaimedBytes / (1024 * 1024)).toFixed(2);
    res.json({
      success: true,
      message: `Garbage collection run successfully. Cleaned up ${stats.deletedCount} files, reclaiming ${spaceReclaimedMB} MB of space.`,
      deletedCount: stats.deletedCount,
      spaceReclaimedMB
    });
  } catch (err) {
    console.error('Failed to run uploads cleanup:', err);
    res.status(500).json({ error: 'Failed to execute garbage collection' });
  }
});

setInterval(() => {
  performUploadsCleanup()
    .then(stats => {
      if (stats.deletedCount > 0) {
        const spaceReclaimedMB = (stats.spaceReclaimedBytes / (1024 * 1024)).toFixed(2);
        console.log(`[Auto-Cleanup] Reclaimed ${spaceReclaimedMB} MB of storage by deleting ${stats.deletedCount} unreferenced files.`);
      }
    })
    .catch(err => console.error('[Auto-Cleanup] Error during routine scan:', err));
}, 24 * 60 * 60 * 1000);

// File Upload Endpoint (converts Base64 uploads to static files served on server)
app.post('/api/upload', (req, res) => {
  const { fileData, fileName } = req.body;
  if (!fileData) return res.status(400).json({ error: 'No file data provided' });

  try {
    const base64Data = fileData.replace(/^data:[a-zA-Z0-9-\/\+]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const ext = path.extname(fileName || 'image.png') || '.png';
    const uniqueName = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    const filePath = path.join(UPLOADS_DIR, uniqueName);

    fs.writeFileSync(filePath, buffer);

    const fileUrl = `/uploads/${uniqueName}`;
    res.json({ success: true, url: fileUrl });
  } catch (e) {
    console.error('File write error:', e);
    res.status(500).json({ error: 'Failed to write file' });
  }
});

// Update current user profile / status
app.put('/api/users/status', (req, res) => {
  const { status, customStatus, bio, location, pronouns, username, email, avatarUrl, bannerUrl, tag, notificationPrefs, themeColor } = req.body;
  const db = loadDB();
  const user = getCurrentUser(req, db);

  if (user.id === 'guest') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const isOwner = user.email?.toLowerCase() === 'abderrahmanchakkouri@gmail.com';
  let finalTag = tag !== undefined ? tag.trim() : user.tag;
  let finalUsername = username !== undefined ? username.trim() : user.username;

  if (tag !== undefined || username !== undefined) {
    if (!finalUsername) {
      return res.status(400).json({ error: 'Username cannot be empty.' });
    }
    if (!finalTag) {
      return res.status(400).json({ error: 'Tag cannot be empty.' });
    }

    // Tag validation
    if (!isOwner) {
      if (!/^\d{4}$/.test(finalTag)) {
        return res.status(400).json({ error: 'Tag must be exactly a 4-digit number (e.g. 5050).' });
      }
    }

    // Check duplicate
    const duplicate = Object.values(db.users).find(u => 
      u.id !== user.id && 
      u.username.toLowerCase() === finalUsername.toLowerCase() && 
      (u.tag || '').toLowerCase() === finalTag.toLowerCase()
    );
    if (duplicate) {
      return res.status(400).json({ error: 'This combination of username and tag is already taken.' });
    }
  }

  const updatedUser = {
    ...user,
    status: status || user.status,
    customStatus: customStatus !== undefined ? customStatus : user.customStatus,
    bio: bio !== undefined ? bio : user.bio,
    location: location !== undefined ? location : user.location,
    pronouns: pronouns !== undefined ? pronouns : user.pronouns,
    username: finalUsername,
    email: email !== undefined ? email : user.email,
    avatarUrl: avatarUrl !== undefined ? avatarUrl : user.avatarUrl,
    bannerUrl: bannerUrl !== undefined ? bannerUrl : user.bannerUrl,
    tag: finalTag,
    notificationPrefs: notificationPrefs !== undefined ? notificationPrefs : user.notificationPrefs,
    themeColor: themeColor !== undefined ? themeColor : user.themeColor,
  };

  db.users[user.id] = updatedUser;
  saveDB(db);
  broadcastEvent('user_update', updatedUser);
  res.json(updatedUser);
});

// Register Endpoint
app.post('/api/register', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, Email, and Password are required' });
  }

  const db = loadDB();
  if (db.systemConfig && !db.systemConfig.allowRegistrations) {
    return res.status(403).json({ error: 'Registrations are currently closed by the system administrator.' });
  }

  const lowerUsername = username.toLowerCase();
  const lowerEmail = email.toLowerCase();

  const existingUser = Object.values(db.users).find(u => 
    u.username.toLowerCase() === lowerUsername || (u.email && u.email.toLowerCase() === lowerEmail)
  );

  if (existingUser) {
    return res.status(400).json({ error: 'Username or Email is already taken' });
  }

  const newId = `u_${Date.now()}`;
  const isOwner = email.toLowerCase() === 'abderrahmanchakkouri@gmail.com';
  const tag = isOwner ? 'NULL' : Math.floor(1000 + Math.random() * 9000).toString();
  const newUser: User = {
    id: newId,
    username,
    email,
    password: hashPassword(password),
    status: 'online',
    avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`,
    joinedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    bio: 'Just joined Unisora!',
    location: '',
    socialLinks: [],
    needsOnboarding: true,
    tag,
  };

  db.users[newId] = newUser;
  saveDB(db);

  const token = generateSessionToken(newId);
  res.json({ success: true, user: newUser, token });
});

// Login Endpoint
app.post('/api/login', (req, res) => {
  const { emailOrUsername, password } = req.body;
  if (!emailOrUsername || !password) {
    return res.status(400).json({ error: 'Email/Username and Password are required' });
  }

  const db = loadDB();

  const matchedUser = Object.values(db.users).find(u => {
    const usernameMatch = u.username.toLowerCase() === emailOrUsername.toLowerCase();
    const emailMatch = u.email && u.email.toLowerCase() === emailOrUsername.toLowerCase();
    return usernameMatch || emailMatch;
  });

  if (!matchedUser || !matchedUser.password || !verifyPassword(password, matchedUser.password)) {
    return res.status(401).json({ error: 'Invalid username/email or password' });
  }

  // Auto-upgrade legacy hash to PBKDF2 on successful login
  if (!matchedUser.password.startsWith('pbkdf2$')) {
    matchedUser.password = hashPassword(password);
    saveDB(db);
  }

  const token = generateSessionToken(matchedUser.id);
  res.json({ success: true, user: matchedUser, token });
});

// Google Authentication Endpoint (Link & Auth)
app.post('/api/auth/google', (req, res) => {
  const { googleId, email, username, avatarUrl } = req.body;
  if (!googleId || !email) {
    return res.status(400).json({ error: 'Missing Google credentials' });
  }

  const db = loadDB();
  
  // If the request header indicates a user is currently logged in, link their Google ID
  const activeUserId = req.headers['session-user-id'];
  if (activeUserId && db.users[activeUserId as string]) {
    const currentUserObj = db.users[activeUserId as string];
    currentUserObj.googleId = googleId;
    saveDB(db);
    return res.json({ success: true, user: currentUserObj, message: 'Google account linked successfully' });
  }

  // Otherwise, find user by googleId
  let user = Object.values(db.users).find(u => u.googleId === googleId);
  
  if (!user) {
    // If not found by googleId, find by email and link it
    user = Object.values(db.users).find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      user.googleId = googleId;
      saveDB(db);
    } else {
      // If still not found, create a new user account linked to Google
      if (db.systemConfig && !db.systemConfig.allowGoogleLogin) {
        return res.status(403).json({ error: 'Google registrations are currently closed by the system administrator.' });
      }
      const newId = `u_g_${Date.now()}`;
      const isOwner = email.toLowerCase() === 'abderrahmanchakkouri@gmail.com';
      const tag = isOwner ? 'NULL' : Math.floor(1000 + Math.random() * 9000).toString();
      user = {
        id: newId,
        username: username || email.split('@')[0],
        email: email,
        googleId: googleId,
        status: 'online',
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
        joinedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        bio: 'Linked with Google.',
        location: '',
        socialLinks: [],
        needsOnboarding: true,
        tag,
      };
      db.users[newId] = user;
      saveDB(db);
    }
  }

  const token = generateSessionToken(user.id);
  res.json({ success: true, user, token });
});

// Google OAuth Authorization Code Exchange Endpoint (For Electron Loopback)
app.post('/api/auth/google/exchange', async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Missing OAuth authorization code' });
  }

  try {
    const googleClientId = '239505686018-0v0j8a9fk3n47qoohpkneteu2k3i55q8' + '.apps.googleusercontent.com';
    const googleClientSecret = 'GOCSPX-' + '9un2VCUdFcN5TpEpwoQb0M2qJDtp';
    
    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: 'http://127.0.0.1:3002',
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokenData: any = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.error('Google token exchange error:', tokenData);
      return res.status(400).json({ error: 'Failed to exchange Google OAuth code: ' + (tokenData.error_description || tokenData.error) });
    }

    const { access_token } = tokenData;
    
    // Fetch user profile using access token
    const profileResponse = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`);
    const profile: any = await profileResponse.json();
    if (!profileResponse.ok) {
      console.error('Google profile fetch error:', profile);
      return res.status(400).json({ error: 'Failed to fetch Google user profile' });
    }

    const googleId = profile.sub;
    const email = profile.email;
    const username = profile.name;
    const avatarUrl = profile.picture;

    if (!googleId || !email) {
      return res.status(400).json({ error: 'Incomplete user profile from Google' });
    }

    const db = loadDB();
    
    // Check if user is logged in to link
    const activeUserId = req.headers['session-user-id'];
    if (activeUserId && db.users[activeUserId as string]) {
      const currentUserObj = db.users[activeUserId as string];
      currentUserObj.googleId = googleId;
      saveDB(db);
      return res.json({ success: true, user: currentUserObj, message: 'Google account linked successfully' });
    }

    // Otherwise, find user by googleId
    let user = Object.values(db.users).find(u => u.googleId === googleId);
    
    if (!user) {
      // Find by email and link
      user = Object.values(db.users).find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
      if (user) {
        user.googleId = googleId;
        saveDB(db);
      } else {
        // Create new user
        if (db.systemConfig && !db.systemConfig.allowGoogleLogin) {
          return res.status(403).json({ error: 'Google registrations are currently closed by the system administrator.' });
        }
        const newId = `u_g_${Date.now()}`;
        const isOwner = email.toLowerCase() === 'abderrahmanchakkouri@gmail.com';
        const tag = isOwner ? 'NULL' : Math.floor(1000 + Math.random() * 9000).toString();
        user = {
          id: newId,
          username: username || email.split('@')[0],
          email: email,
          googleId: googleId,
          status: 'online',
          avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
          joinedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
          bio: 'Linked with Google.',
          location: '',
          socialLinks: [],
          needsOnboarding: true,
          tag,
        };
        db.users[newId] = user;
        saveDB(db);
      }
    }

    const token = generateSessionToken(user.id);
    res.json({ success: true, user, token });
  } catch (err: any) {
    console.error('OAuth exchange error:', err);
    res.status(500).json({ error: 'Internal server error during Google Sign-In' });
  }
});

// Complete Onboarding Endpoint
app.put('/api/users/onboarding', (req, res) => {
  const { username, tag, avatarUrl } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const db = loadDB();
  const user = getCurrentUser(req, db);

  if (user.id === 'guest') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const isOwner = user.email?.toLowerCase() === 'abderrahmanchakkouri@gmail.com';
  let finalTag = tag ? tag.trim() : '';

  if (!finalTag) {
    finalTag = isOwner ? 'NULL' : Math.floor(1000 + Math.random() * 9000).toString();
  }

  // Tag validation
  if (!isOwner) {
    if (!/^\d{4}$/.test(finalTag)) {
      return res.status(400).json({ error: 'Tag must be exactly a 4-digit number (e.g. 5050).' });
    }
  }

  // Check unique name+tag combination
  const duplicate = Object.values(db.users).find(u => 
    u.id !== user.id && 
    u.username.toLowerCase() === username.trim().toLowerCase() && 
    (u.tag || '').toLowerCase() === finalTag.toLowerCase()
  );
  if (duplicate) {
    return res.status(400).json({ error: 'This combination of username and tag is already taken' });
  }

  user.username = username.trim();
  user.tag = finalTag;
  if (avatarUrl) {
    user.avatarUrl = avatarUrl;
  }
  user.needsOnboarding = false;

  db.users[user.id] = user;
  saveDB(db);
  broadcastEvent('user_update', user);

  res.json({ success: true, user });
});

// Create Server
app.post('/api/servers', (req, res) => {
  const { name, template } = req.body;
  const db = loadDB();
  const user = getCurrentUser(req, db);

  const newServerId = `s${Date.now()}`;
  const defaultRoles: Role[] = [
    { id: 'r1', name: 'Admin', color: '#ed4245', permissions: ['ADMIN', 'MENTION_EVERYONE'], hoist: true },
    { id: 'r2', name: 'Moderator', color: '#3498db', permissions: ['MANAGE_MESSAGES', 'KICK_MEMBERS', 'MENTION_EVERYONE'], hoist: true },
    { id: 'r3', name: 'Member', color: '#99aab5', permissions: [], hoist: false },
  ];

  const newServer: Server = {
    id: newServerId,
    name,
    ownerId: user.id,
    members: [user.id],
    roles: defaultRoles,
    memberRoles: {},
    category: template === 'gaming' ? 'gaming' : template === 'school' ? 'education' : 'tech',
    tags: template === 'gaming' ? ['gaming', 'games', 'play'] : template === 'school' ? ['school', 'study', 'education'] : ['general', 'tech'],
    description: `Welcome to ${name}! A professional space for collaboration.`,
    iconUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
    bannerUrl: '',
    auditLogs: [{
      id: `log_${Date.now()}`,
      action: 'SERVER_UPDATE',
      executorId: user.id,
      targetName: name,
      timestamp: new Date().toISOString()
    }],
    insights: { totalMessages: 0, activeMembers: 1, growthRate: 0 }
  };

  let newCategories: Category[] = [];
  let newChannels: Channel[] = [];

  if (template === 'gaming') {
    const c1 = `c_g_cat_${Date.now()}_1`;
    const c2 = `c_g_cat_${Date.now()}_2`;
    const c3 = `c_g_cat_${Date.now()}_3`;
    newCategories = [
      { id: c1, serverId: newServerId, name: 'Information', order: 0 },
      { id: c2, serverId: newServerId, name: 'Text Channels', order: 1 },
      { id: c3, serverId: newServerId, name: 'Voice Channels', order: 2 }
    ];
    newChannels = [
      { id: `c_${Date.now()}_1`, serverId: newServerId, categoryId: c1, name: 'welcome-rules', type: 'announcement', description: 'Welcome and rules for the server', order: 0 },
      { id: `c_${Date.now()}_2`, serverId: newServerId, categoryId: c1, name: 'announcements', type: 'announcement', description: 'Important gaming news & events', order: 1 },
      { id: `c_${Date.now()}_3`, serverId: newServerId, categoryId: c1, name: 'patches-and-updates', type: 'text', description: 'Game patch notes and official releases', order: 2 },
      { id: `c_${Date.now()}_4`, serverId: newServerId, categoryId: c2, name: 'general', type: 'text', description: 'General gaming discussion', order: 0 },
      { id: `c_${Date.now()}_5`, serverId: newServerId, categoryId: c2, name: 'clips-and-highlights', type: 'text', description: 'Share your best gameplay moments!', order: 1 },
      { id: `c_${Date.now()}_6`, serverId: newServerId, categoryId: c2, name: 'looking-for-group', type: 'text', description: 'Find teammates and queue up', order: 2 },
      { id: `c_${Date.now()}_7`, serverId: newServerId, categoryId: c2, name: 'strategy-talk', type: 'text', description: 'Tips, build guides, and team tactics', order: 3 },
      { id: `c_${Date.now()}_8`, serverId: newServerId, categoryId: c3, name: 'Lobby', type: 'voice', order: 0 },
      { id: `c_${Date.now()}_9`, serverId: newServerId, categoryId: c3, name: 'Duo Queue', type: 'voice', order: 1 },
      { id: `c_${Date.now()}_10`, serverId: newServerId, categoryId: c3, name: 'Squad up 1', type: 'voice', order: 2 },
      { id: `c_${Date.now()}_11`, serverId: newServerId, categoryId: c3, name: 'Squad up 2', type: 'voice', order: 3 },
      { id: `c_${Date.now()}_12`, serverId: newServerId, categoryId: c3, name: 'AFK Room', type: 'voice', order: 4 }
    ];
  } else if (template === 'school') {
    const c1 = `c_s_cat_${Date.now()}_1`;
    const c2 = `c_s_cat_${Date.now()}_2`;
    const c3 = `c_s_cat_${Date.now()}_3`;
    newCategories = [
      { id: c1, serverId: newServerId, name: 'Information', order: 0 },
      { id: c2, serverId: newServerId, name: 'Study Rooms', order: 1 },
      { id: c3, serverId: newServerId, name: 'Voice Lounges', order: 2 }
    ];
    newChannels = [
      { id: `c_${Date.now()}_1`, serverId: newServerId, categoryId: c1, name: 'welcome-syllabus', type: 'announcement', description: 'Welcome info and rules', order: 0 },
      { id: `c_${Date.now()}_2`, serverId: newServerId, categoryId: c1, name: 'announcements', type: 'announcement', description: 'Important class/school notifications', order: 1 },
      { id: `c_${Date.now()}_3`, serverId: newServerId, categoryId: c1, name: 'class-schedule', type: 'text', description: 'Timetables, office hours, schedules', order: 2 },
      { id: `c_${Date.now()}_4`, serverId: newServerId, categoryId: c2, name: 'general-study', type: 'text', description: 'General coursework help and chats', order: 0 },
      { id: `c_${Date.now()}_5`, serverId: newServerId, categoryId: c2, name: 'homework-help', type: 'text', description: 'Stuck on a problem? Ask here!', order: 1 },
      { id: `c_${Date.now()}_6`, serverId: newServerId, categoryId: c2, name: 'exam-prep', type: 'text', description: 'Study guides, flashcards, test prep', order: 2 },
      { id: `c_${Date.now()}_7`, serverId: newServerId, categoryId: c2, name: 'resources-share', type: 'text', description: 'Link sharing, docs, notes', order: 3 },
      { id: `c_${Date.now()}_8`, serverId: newServerId, categoryId: c3, name: 'Quiet Study Space', type: 'voice', order: 0 },
      { id: `c_${Date.now()}_9`, serverId: newServerId, categoryId: c3, name: 'Group Sync 1', type: 'voice', order: 1 },
      { id: `c_${Date.now()}_10`, serverId: newServerId, categoryId: c3, name: 'Group Sync 2', type: 'voice', order: 2 },
      { id: `c_${Date.now()}_11`, serverId: newServerId, categoryId: c3, name: 'Ask a Teacher', type: 'voice', order: 3 }
    ];
  } else {
    const c1 = `c_default_cat_${Date.now()}_1`;
    const c2 = `c_default_cat_${Date.now()}_2`;
    const c3 = `c_default_cat_${Date.now()}_3`;
    newCategories = [
      { id: c1, serverId: newServerId, name: 'Information', order: 0 },
      { id: c2, serverId: newServerId, name: 'Text Channels', order: 1 },
      { id: c3, serverId: newServerId, name: 'Voice Channels', order: 2 }
    ];
    newChannels = [
      { id: `c_${Date.now()}_1`, serverId: newServerId, categoryId: c1, name: 'welcome', type: 'announcement', description: 'Welcome to our new server!', order: 0 },
      { id: `c_${Date.now()}_2`, serverId: newServerId, categoryId: c1, name: 'announcements', type: 'announcement', description: 'Important updates and bulletins', order: 1 },
      { id: `c_${Date.now()}_3`, serverId: newServerId, categoryId: c2, name: 'general', type: 'text', description: 'General chat and discussion', order: 0 },
      { id: `c_${Date.now()}_4`, serverId: newServerId, categoryId: c2, name: 'random', type: 'text', description: 'Anything goes!', order: 1 },
      { id: `c_${Date.now()}_5`, serverId: newServerId, categoryId: c3, name: 'General Voice', type: 'voice', order: 0 },
      { id: `c_${Date.now()}_6`, serverId: newServerId, categoryId: c3, name: 'Lounge', type: 'voice', order: 1 }
    ];
  }

  db.servers.push(newServer);
  db.categories.push(...newCategories);
  db.channels.push(...newChannels);

  saveDB(db);
  res.json({ server: newServer, categories: newCategories, channels: newChannels });
});

// Update Server Settings
app.put('/api/servers/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const db = loadDB();
  const executor = getCurrentUser(req, db);

  const server = db.servers.find(s => s.id === id);
  if (server) {
    const changes = [];
    if (updates.name && updates.name !== server.name) {
      changes.push({ field: 'name', old: server.name, new: updates.name });
    }
    if (updates.settings) {
      const oldSettings = server.settings || {};
      const newSettings = updates.settings;
      for (const key of Object.keys(newSettings)) {
        if (newSettings[key] !== oldSettings[key]) {
          changes.push({ field: `settings.${key}`, old: oldSettings[key], new: newSettings[key] });
        }
      }
    }
    
    const settings = server.settings || { notifications: 'all' };
    server.name = updates.name !== undefined ? updates.name : server.name;
    server.iconUrl = updates.iconUrl !== undefined ? updates.iconUrl : server.iconUrl;
    server.bannerUrl = updates.bannerUrl !== undefined ? updates.bannerUrl : server.bannerUrl;
    if (updates.settings) {
      server.settings = { ...settings, ...updates.settings };
    }
    
    addBackendAuditLog(db, id, executor.id, 'SERVER_UPDATE', undefined, server.name, changes.length > 0 ? changes : undefined);
  }

  saveDB(db);
  res.json({ success: true });
});

// Delete Server
app.delete('/api/servers/:id', (req, res) => {
  const { id } = req.params;
  const db = loadDB();

  db.servers = db.servers.filter(s => s.id !== id);
  db.channels = db.channels.filter(c => c.serverId !== id);
  db.categories = db.categories.filter(c => c.serverId !== id);

  saveDB(db);
  res.json({ success: true });
});

// Update Server Member Roles
app.put('/api/servers/:id/members/:userId/roles', (req, res) => {
  const { id, userId } = req.params;
  const { roleIds } = req.body;
  const db = loadDB();
  const executor = getCurrentUser(req, db);

  const server = db.servers.find(s => s.id === id);
  if (server) {
    const memberRoles = server.memberRoles || {};
    const oldRoles = memberRoles[userId] || [];
    memberRoles[userId] = roleIds;
    server.memberRoles = memberRoles;
    
    const targetUser = db.users[userId];
    addBackendAuditLog(db, id, executor.id, 'MEMBER_ROLE_UPDATE', userId, targetUser?.username || userId, [
      { field: 'roles', old: oldRoles, new: roleIds }
    ]);
  }

  saveDB(db);
  res.json({ success: true });
});

// Server Roles CRUD
app.post('/api/servers/:id/roles', (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const db = loadDB();
  const executor = getCurrentUser(req, db);

  const server = db.servers.find(s => s.id === id);
  if (server) {
    server.roles = [...(server.roles || []), role];
    addBackendAuditLog(db, id, executor.id, 'ROLE_CREATE', role.id, role.name);
  }

  saveDB(db);
  res.json({ success: true });
});

app.put('/api/servers/:id/roles/:roleId', (req, res) => {
  const { id, roleId } = req.params;
  const { role } = req.body;
  const db = loadDB();
  const executor = getCurrentUser(req, db);

  const server = db.servers.find(s => s.id === id);
  if (server) {
    const oldRole = (server.roles || []).find(r => r.id === roleId);
    const changes = [];
    if (oldRole) {
      for (const key of Object.keys(role)) {
        if (JSON.stringify((role as any)[key]) !== JSON.stringify((oldRole as any)[key])) {
          changes.push({ field: key, old: (oldRole as any)[key], new: (role as any)[key] });
        }
      }
    }
    server.roles = (server.roles || []).map(r => r.id === roleId ? { ...r, ...role } : r);
    addBackendAuditLog(db, id, executor.id, 'ROLE_UPDATE', roleId, role.name || oldRole?.name, changes.length > 0 ? changes : undefined);
  }

  saveDB(db);
  res.json({ success: true });
});

app.delete('/api/servers/:id/roles/:roleId', (req, res) => {
  const { id, roleId } = req.params;
  const db = loadDB();
  const executor = getCurrentUser(req, db);

  const server = db.servers.find(s => s.id === id);
  if (server) {
    const role = (server.roles || []).find(r => r.id === roleId);
    server.roles = (server.roles || []).filter(r => r.id !== roleId);
    addBackendAuditLog(db, id, executor.id, 'ROLE_DELETE', roleId, role?.name);
  }

  saveDB(db);
  res.json({ success: true });
});

// Channel endpoints
app.post('/api/channels', (req, res) => {
  const { serverId, categoryId, name, type, isStage } = req.body;
  const db = loadDB();
  const executor = getCurrentUser(req, db);

  const newId = `ch_${Date.now()}`;
  const newChannel: Channel = {
    id: newId,
    serverId,
    categoryId,
    name,
    type: (isStage ? 'voice' : type) as ChannelType,
    isStage: isStage || false
  };

  db.channels.push(newChannel);
  addBackendAuditLog(db, serverId, executor.id, 'CHANNEL_CREATE', newId, name);
  saveDB(db);
  res.json(newChannel);
});

app.put('/api/channels/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const db = loadDB();
  const executor = getCurrentUser(req, db);

  const channel = db.channels.find(c => c.id === id);
  if (channel) {
    const changes = [];
    for (const key of Object.keys(updates)) {
      if (updates[key] !== (channel as any)[key]) {
        changes.push({ field: key, old: (channel as any)[key], new: updates[key] });
      }
    }
    db.channels = db.channels.map(c => c.id === id ? { ...c, ...updates } : c);
    addBackendAuditLog(db, channel.serverId, executor.id, 'CHANNEL_UPDATE', id, updates.name || channel.name, changes.length > 0 ? changes : undefined);
  }
  saveDB(db);
  res.json({ success: true });
});

app.delete('/api/channels/:id', (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  const executor = getCurrentUser(req, db);

  const channel = db.channels.find(c => c.id === id);
  if (channel) {
    db.channels = db.channels.filter(c => c.id !== id);
    addBackendAuditLog(db, channel.serverId, executor.id, 'CHANNEL_DELETE', id, channel.name);
  }
  saveDB(db);
  res.json({ success: true });
});

// Categories CRUD
app.post('/api/categories', (req, res) => {
  const { serverId, name } = req.body;
  const db = loadDB();

  const newCat: Category = {
    id: `cat_${Date.now()}`,
    serverId,
    name,
    order: db.categories.length
  };

  db.categories.push(newCat);
  saveDB(db);
  res.json(newCat);
});

app.put('/api/categories/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const db = loadDB();

  db.categories = db.categories.map(c => c.id === id ? { ...c, ...updates } : c);
  saveDB(db);
  res.json({ success: true });
});

app.delete('/api/categories/:id', (req, res) => {
  const { id } = req.params;
  const db = loadDB();

  db.categories = db.categories.filter(c => c.id !== id);
  db.channels = db.channels.filter(c => c.categoryId !== id);
  saveDB(db);
  res.json({ success: true });
});

// Messages endpoints
// Messages endpoints
app.post('/api/messages', (req, res) => {
  const { content, channelId, attachments, replyToId, poll } = req.body;
  const db = loadDB();
  const sender = getCurrentUser(req, db);

  const newMessage: Message = {
    id: Math.random().toString(36).substr(2, 9),
    channelId,
    userId: sender.id,
    content,
    timestamp: new Date().toISOString(),
    attachments,
    replyToId,
    poll,
    reactions: []
  };

  db.messages.push(newMessage);

  // ── Presence-aware notification generation ───────────────────────────────
  // Helper: create & persist a notification, then push it directly to the
  // recipient's SSE client so they receive it instantly without polling.
  const createNotification = (notif: any) => {
    if (!db.notifications) db.notifications = [];
    db.notifications.push(notif);
    // Push directly to the recipient via SSE (instant, no polling needed)
    sendToUser(notif.userId, 'notification', notif);
  };

  if (channelId.startsWith('dm-')) {
    let recipientIds: string[] = [];
    if (db.dmChannels[channelId]) {
      recipientIds = (db.dmChannels[channelId].participants || []).filter((id: string) => id !== sender.id);
    } else {
      const ids = channelId.replace('dm-', '').replace(/[\[\]]/g, '').split('-');
      const otherId = ids.find((id: string) => id !== sender.id);
      if (otherId) recipientIds.push(otherId);
    }

    recipientIds.forEach(recipientId => {
      const recipientUser = db.users[recipientId];
      if (!recipientUser) return;
      if (recipientUser.notificationPrefs?.dmNotifications === false) return;
      // Skip if recipient is actively in this DM
      const presence = userPresence[recipientId];
      if (presence?.activeDmId === recipientId || presence?.activeChannelId === channelId) return;

      createNotification({
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        userId: recipientId,
        type: 'message',
        username: sender.username,
        avatarUrl: sender.avatarUrl,
        content: content || 'Sent an attachment',
        channel: 'Direct Message',
        channelId,
        time: new Date().toISOString(),
        read: false
      });
    });
  } else {
    // Server Channel Message
    const serverChannel = db.channels.find(c => c.id === channelId);
    if (serverChannel) {
      const server = db.servers.find(s => s.id === serverChannel.serverId);
      if (server) {
        server.members.forEach(memberId => {
          if (memberId === sender.id) return;
          const member = db.users[memberId];
          if (!member) return;

          // ── Presence check ── skip notification entirely if user is in this channel
          const presence = userPresence[memberId];
          if (presence?.activeChannelId === channelId) return;

          const pref = server.settings?.notifications || 'all';
          if (pref === 'nothing') return;

          let shouldNotify = false;
          if (pref === 'all') {
            shouldNotify = true;
          } else if (pref === 'mentions') {
            shouldNotify = (content || '').includes(`@${member.username}`) || (content || '').includes('@everyone');
          }

          if (shouldNotify) {
            createNotification({
              id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              userId: memberId,
              type: pref === 'mentions' ? 'mention' : 'message',
              username: sender.username,
              avatarUrl: sender.avatarUrl,
              content: content || 'Sent a message',
              channel: `#${serverChannel.name}`,
              channelId,
              serverId: server.id,
              time: new Date().toISOString(),
              read: false
            });
          }
        });
      }
    }
  }

  saveDB(db);
  // Broadcast real-time message to all SSE clients
  broadcastEvent('new_message', newMessage);
  res.json(newMessage);
});


app.put('/api/messages/:id', (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const db = loadDB();

  db.messages = db.messages.map(m =>
    m.id === id ? { ...m, content, editedAt: new Date().toISOString() } : m
  );
  saveDB(db);
  const edited = db.messages.find(m => m.id === id);
  if (edited) broadcastEvent('edit_message', edited);
  res.json({ success: true });
});

app.delete('/api/messages/:id', (req, res) => {
  const { id } = req.params;
  const db = loadDB();

  db.messages = db.messages.filter(m => m.id !== id);
  saveDB(db);
  broadcastEvent('delete_message', { id });
  res.json({ success: true });
});

// Message reaction toggling
app.post('/api/messages/:id/reactions', (req, res) => {
  const { id } = req.params;
  const { emoji } = req.body;
  const db = loadDB();
  const currentUser = getCurrentUser(req, db);

  db.messages = db.messages.map(m => {
    if (m.id !== id) return m;
    const reactions = m.reactions ? [...m.reactions] : [];
    const existing = reactions.find(r => r.emoji === emoji);
    if (existing) {
      if (existing.userIds.includes(currentUser.id)) {
        existing.userIds = existing.userIds.filter(uid => uid !== currentUser.id);
        existing.count--;
        if (existing.count <= 0) return { ...m, reactions: reactions.filter(r => r.emoji !== emoji) };
        return { ...m, reactions };
      } else {
        existing.userIds.push(currentUser.id);
        existing.count++;
        return { ...m, reactions };
      }
    } else {
      reactions.push({ emoji, count: 1, userIds: [currentUser.id] });
      return { ...m, reactions };
    }
  });

  saveDB(db);
  res.json({ success: true });
});

// Message pin
app.post('/api/messages/:id/pin', (req, res) => {
  const { id } = req.params;
  const db = loadDB();

  db.messages = db.messages.map(m =>
    m.id === id ? { ...m, pinned: !m.pinned } : m
  );
  saveDB(db);
  res.json({ success: true });
});

// Poll voting
app.post('/api/messages/:id/vote', (req, res) => {
  const { id } = req.params;
  const { optionId } = req.body;
  const db = loadDB();
  const currentUser = getCurrentUser(req, db);

  db.messages = db.messages.map(msg => {
    if (msg.id !== id || !msg.poll) return msg;

    const newOptions = msg.poll.options.map(opt => {
      const isSelected = opt.id === optionId;
      const wasAlreadyVoted = opt.voterIds.includes(currentUser.id);

      if (isSelected) {
        if (wasAlreadyVoted) {
          return {
            ...opt,
            voteCount: opt.voteCount - 1,
            voterIds: opt.voterIds.filter(uid => uid !== currentUser.id)
          };
        } else {
          return {
            ...opt,
            voteCount: opt.voteCount + 1,
            voterIds: [...opt.voterIds, currentUser.id]
          };
        }
      } else if (!msg.poll?.allowMultiple) {
        if (opt.voterIds.includes(currentUser.id)) {
          return {
            ...opt,
            voteCount: opt.voteCount - 1,
            voterIds: opt.voterIds.filter(uid => uid !== currentUser.id)
          };
        }
      }
      return opt;
    });

    return { ...msg, poll: { ...msg.poll, options: newOptions } };
  });

  saveDB(db);
  res.json({ success: true });
});

// Group DM endpoints
app.post('/api/dm-channels', (req, res) => {
  const { participantIds } = req.body;
  const db = loadDB();
  const currentUser = getCurrentUser(req, db);

  const allParticipants = Array.from(new Set([currentUser.id, ...participantIds]));
  if (allParticipants.length > 10) return res.status(400).json({ error: 'Too many participants' });

  const newDm: DmChannel = {
    id: `dm-${Date.now()}`,
    participants: allParticipants,
    ownerId: currentUser.id,
    createdAt: new Date().toISOString()
  };

  db.dmChannels[newDm.id] = newDm;
  saveDB(db);
  res.json(newDm);
});

// Update Group DM Name, Avatar or Participants
app.put('/api/dm-channels/:id', (req, res) => {
  const { id } = req.params;
  const { name, avatarUrl, participants } = req.body;
  const db = loadDB();
  const dm = db.dmChannels[id];
  if (!dm) return res.status(404).json({ error: 'Group DM not found' });

  if (name !== undefined) dm.name = name;
  if (avatarUrl !== undefined) dm.avatarUrl = avatarUrl;
  if (participants !== undefined) {
    if (participants.length > 10) return res.status(400).json({ error: 'Too many participants' });
    dm.participants = participants;
  }

  saveDB(db);
  broadcastEvent('dm_channel_update', dm);
  res.json(dm);
});

// Leave Group DM
app.delete('/api/dm-channels/:id', (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  const currentUser = getCurrentUser(req, db);
  const dm = db.dmChannels[id];
  if (!dm) return res.json({ success: true });

  const newParticipants = dm.participants.filter(pid => pid !== currentUser.id);
  let newOwnerId = dm.ownerId;

  if (newParticipants.length === 0) {
    delete db.dmChannels[id];
  } else {
    dm.participants = newParticipants;
    if (dm.ownerId === currentUser.id) {
      newOwnerId = newParticipants[0];
      dm.ownerId = newOwnerId;
    }
  }

  // Create system leave message
  const systemMessage: Message = {
    id: `msg-${Date.now()}`,
    channelId: id,
    userId: 'system',
    content: `[SYSTEM_LEAVE:${currentUser.username}]`,
    timestamp: new Date().toISOString()
  };
  db.messages.push(systemMessage);
  broadcastEvent('new_message', systemMessage);

  saveDB(db);
  broadcastEvent('dm_channel_leave', { dmId: id, userId: currentUser.id, newOwnerId });
  res.json({ success: true });
});

// Asynchronous Message Search Endpoint
app.get('/api/search', (req, res) => {
  const db = loadDB();
  const user = getCurrentUser(req, db);
  if (user.id === 'guest') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const query = (req.query.q as string || '').toLowerCase().trim();
  const channelId = req.query.channelId as string || '';
  const searchAll = req.query.all === 'true';

  if (query.length < 2) {
    return res.json([]);
  }

  const results = db.messages
    .filter(m => {
      const matchesQuery = m.content.toLowerCase().includes(query);
      if (!matchesQuery) return false;

      if (searchAll) return true;
      return m.channelId === channelId;
    })
    .slice(0, 50);

  res.json(results);
});

// Notifications read-all
app.post('/api/notifications/read-all', (req, res) => {
  const db = loadDB();
  const user = getCurrentUser(req, db);
  db.notifications = (db.notifications || []).map(n => 
    n.userId === user.id ? { ...n, read: true } : n
  );
  saveDB(db);
  res.json({ success: true });
});

// Notifications read-channel: marks all notifications for given channelIds/serverId as read in DB
// This is the key "cleanup" endpoint — called whenever a user enters a channel or receives
// a message while already in that channel, ensuring the DB never has stale unread notifications.
app.post('/api/notifications/read-channel', (req, res) => {
  const { channelIds } = req.body as { channelIds?: string[] };
  const db = loadDB();
  const user = getCurrentUser(req, db);
  if (user.id === 'guest') return res.json({ success: false });
  if (!channelIds || channelIds.length === 0) return res.json({ success: true });

  const idSet = new Set(channelIds);
  db.notifications = (db.notifications || []).map(n => {
    if (n.userId !== user.id) return n;
    if (idSet.has(n.channelId)) return { ...n, read: true };
    return n;
  });
  saveDB(db);
  res.json({ success: true });
});



// Threads endpoints
app.post('/api/threads', (req, res) => {
  const { channelId, name, isPrivate } = req.body;
  const db = loadDB();
  const currentUser = getCurrentUser(req, db);

  const newThread: Thread = {
    id: `t_${Date.now()}`,
    channelId,
    name,
    ownerId: currentUser.id,
    createdAt: new Date().toISOString(),
    messageCount: 0,
    isArchived: false,
    isPrivate: isPrivate || false
  };

  db.threads.push(newThread);
  saveDB(db);
  res.json(newThread);
});

app.put('/api/threads/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const db = loadDB();

  db.threads = db.threads.map(t => t.id === id ? { ...t, ...updates } : t);
  saveDB(db);
  res.json({ success: true });
});

// Kick Member Endpoint
app.post('/api/servers/:id/kick', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  const db = loadDB();
  const executor = getCurrentUser(req, db);

  const server = db.servers.find(s => s.id === id);
  if (server) {
    server.members = server.members.filter(m => m !== userId);
    const targetUser = db.users[userId];
    addBackendAuditLog(db, id, executor.id, 'MEMBER_KICK', userId, targetUser?.username || userId);
  }

  saveDB(db);
  res.json({ success: true });
});

// Ban Member Endpoint
app.post('/api/servers/:id/ban', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  const db = loadDB();
  const executor = getCurrentUser(req, db);

  const server = db.servers.find(s => s.id === id);
  if (server) {
    server.members = server.members.filter(m => m !== userId);
    const targetUser = db.users[userId];
    addBackendAuditLog(db, id, executor.id, 'MEMBER_BAN', userId, targetUser?.username || userId);
  }

  saveDB(db);
  res.json({ success: true });
});

// Join Server Endpoint
app.post('/api/servers/:id/join', (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  const user = getCurrentUser(req, db);

  let joinedServer = null;

  db.servers = db.servers.map(s => {
    if (s.id === id) {
      if (s.members.includes(user.id)) {
        joinedServer = s;
        return s;
      }
      
      const autoRoles = (s.roles || [])
        .filter((r: any) => r.autoAssignOnJoin)
        .map((r: any) => r.id);

      const memberRoles = s.memberRoles || {};
      const newMemberRoles = {
        ...memberRoles,
        [user.id]: autoRoles
      };

      joinedServer = {
        ...s,
        members: [...s.members, user.id],
        memberRoles: newMemberRoles
      };
      return joinedServer;
    }
    return s;
  });

  if (!joinedServer) {
    return res.status(404).json({ error: 'Server not found' });
  }

  saveDB(db);
  res.json({ success: true, server: joinedServer });
});

// Leave Server Endpoint
app.post('/api/servers/:id/leave', (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  const user = getCurrentUser(req, db);

  const server = db.servers.find(s => s.id === id);
  if (server) {
    server.members = server.members.filter(m => m !== user.id);
  }

  saveDB(db);
  res.json({ success: true });
});

// Admin Endpoints - Restricted to abderrahmanchakkouri@gmail.com
async function logAdminActivity(action: string, executorId: string, targetId?: string, targetName?: string, changes?: any) {
  try {
    await prisma.auditLog.create({
      data: {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        action,
        executorId,
        targetId: targetId || null,
        targetName: targetName || null,
        timestamp: new Date().toISOString(),
        changes: changes ? JSON.stringify(changes) : null,
        serverId: 'system' // designates global system log
      }
    });
  } catch (err) {
    console.error('Error logging admin activity:', err);
  }
}

app.get('/api/admin/audit-logs', async (req, res) => {
  const db = loadDB();
  const currentUserObj = getCurrentUser(req, db);
  if (currentUserObj.email !== 'abderrahmanchakkouri@gmail.com') {
    return res.status(403).json({ error: 'Access Denied: Owner permission required' });
  }

  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 200
    });

    const formattedLogs = logs.map(l => ({
      id: l.id,
      action: l.action,
      executorId: l.executorId,
      executorName: db.users[l.executorId]?.username || 'Unknown',
      targetId: l.targetId,
      targetName: l.targetName,
      timestamp: l.timestamp,
      changes: l.changes ? JSON.parse(l.changes) : undefined,
      serverId: l.serverId,
      serverName: db.servers.find(s => s.id === l.serverId)?.name || (l.serverId === 'system' ? 'System' : 'Unknown Space')
    }));

    res.json(formattedLogs);
  } catch (error) {
    console.error('Failed to fetch global audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch global audit logs' });
  }
});

app.post('/api/admin/users/create', async (req, res) => {
  const { username, email, password, tag, bio, avatarUrl } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, Email, and Password are required' });
  }

  const db = loadDB();
  const currentUserObj = getCurrentUser(req, db);
  if (currentUserObj.email !== 'abderrahmanchakkouri@gmail.com') {
    return res.status(403).json({ error: 'Access Denied: Owner permission required' });
  }

  const lowerUsername = username.toLowerCase();
  const lowerEmail = email.toLowerCase();
  const targetTag = tag ? tag.trim() : Math.floor(1000 + Math.random() * 9000).toString();

  const existingUser = Object.values(db.users).find(u => 
    (u.username.toLowerCase() === lowerUsername && (u.tag || '').toLowerCase() === targetTag.toLowerCase()) || 
    (u.email && u.email.toLowerCase() === lowerEmail)
  );

  if (existingUser) {
    return res.status(400).json({ error: 'Username+Tag combination or Email is already taken' });
  }

  const newId = `u_${Date.now()}`;
  const newUser = {
    id: newId,
    username,
    email,
    password: hashPassword(password),
    status: 'offline' as const,
    avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`,
    joinedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    bio: bio || 'Just joined Unisora!',
    location: '',
    socialLinks: [],
    needsOnboarding: false,
    tag: targetTag,
  };

  db.users[newId] = newUser;
  saveDB(db);

  await logAdminActivity('USER_CREATE', currentUserObj.id, newId, username);

  res.json({ success: true, user: newUser });
});

app.get('/api/admin/users', (req, res) => {
  const db = loadDB();
  const currentUserObj = getCurrentUser(req, db);
  if (currentUserObj.email !== 'abderrahmanchakkouri@gmail.com') {
    return res.status(403).json({ error: 'Access Denied: Owner permission required' });
  }
  // Return all users with password hashes (excluding session tokens, if any)
  res.json(Object.values(db.users));
});

app.post('/api/admin/users/:userId/reset-password', async (req, res) => {
  const { userId } = req.params;
  const { newPassword } = req.body;
  if (!newPassword || newPassword.trim().length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters long' });
  }
  const db = loadDB();
  const currentUserObj = getCurrentUser(req, db);
  if (currentUserObj.email !== 'abderrahmanchakkouri@gmail.com') {
    return res.status(403).json({ error: 'Access Denied' });
  }
  if (!db.users[userId]) {
    return res.status(404).json({ error: 'User not found' });
  }
  const targetUser = db.users[userId];
  if (targetUser.googleId && !targetUser.password) {
    return res.status(400).json({ error: 'Cannot reset password for accounts authenticated exclusively via Google OAuth.' });
  }
  db.users[userId].password = hashPassword(newPassword);
  saveDB(db);
  await logAdminActivity('PASSWORD_RESET', currentUserObj.id, userId, db.users[userId].username);
  res.json({ success: true, message: `Password for ${db.users[userId].username} has been reset.` });
});

app.post('/api/admin/users/:userId/send-reset-email', (req, res) => {
  const { userId } = req.params;
  const db = loadDB();
  const currentUserObj = getCurrentUser(req, db);
  if (currentUserObj.email !== 'abderrahmanchakkouri@gmail.com') {
    return res.status(403).json({ error: 'Access Denied' });
  }
  if (!db.users[userId]) {
    return res.status(404).json({ error: 'User not found' });
  }
  const user = db.users[userId];
  const resetToken = crypto.randomBytes(20).toString('hex');
  const resetLink = `http://localhost:3000/reset-password?token=${resetToken}&userId=${user.id}`;
  
  res.json({ 
    success: true, 
    message: `Reset email simulated successfully to ${user.email}.`, 
    simulatedEmail: {
      to: user.email,
      subject: 'Unisora Password Reset Request',
      body: `Hello ${user.username},\n\nA request to reset your Unisora password has been made. You can reset your password using the following link:\n\n${resetLink}\n\nIf you did not request this, please ignore this email.`
    }
  });
});

app.post('/api/admin/users/:userId/update', async (req, res) => {
  const { userId } = req.params;
  const updates = req.body;
  const db = loadDB();
  const currentUserObj = getCurrentUser(req, db);
  if (currentUserObj.email !== 'abderrahmanchakkouri@gmail.com') {
    return res.status(403).json({ error: 'Access Denied' });
  }
  if (!db.users[userId]) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Make sure username + tag combination is not taken by another user
  const targetUsername = updates.username !== undefined ? updates.username.trim() : db.users[userId].username;
  const targetTag = updates.tag !== undefined ? updates.tag.trim() : (db.users[userId].tag || '');

  if (!targetUsername) {
    return res.status(400).json({ error: 'Username cannot be empty.' });
  }
  if (!targetTag) {
    return res.status(400).json({ error: 'Tag cannot be empty.' });
  }

  const duplicate = Object.values(db.users).find(u => 
    u.id !== userId && 
    u.username.toLowerCase() === targetUsername.toLowerCase() && 
    (u.tag || '').toLowerCase() === targetTag.toLowerCase()
  );
  if (duplicate) {
    return res.status(400).json({ error: 'This combination of username and tag is already taken.' });
  }

  const oldUser = { ...db.users[userId] };
  db.users[userId] = {
    ...db.users[userId],
    ...updates,
    username: targetUsername,
    tag: targetTag
  };
  saveDB(db);

  const changes = [];
  if (oldUser.username !== targetUsername) changes.push({ field: 'username', old: oldUser.username, new: targetUsername });
  if (oldUser.tag !== targetTag) changes.push({ field: 'tag', old: oldUser.tag, new: targetTag });
  if (oldUser.email !== updates.email && updates.email !== undefined) changes.push({ field: 'email', old: oldUser.email, new: updates.email });
  if (oldUser.needsOnboarding !== updates.needsOnboarding && updates.needsOnboarding !== undefined) changes.push({ field: 'needsOnboarding', old: oldUser.needsOnboarding, new: updates.needsOnboarding });

  await logAdminActivity('USER_UPDATE', currentUserObj.id, userId, targetUsername, changes);
  res.json({ success: true, user: db.users[userId] });
});

app.delete('/api/admin/users/:userId', async (req, res) => {
  const { userId } = req.params;
  const db = loadDB();
  const currentUserObj = getCurrentUser(req, db);
  if (currentUserObj.email !== 'abderrahmanchakkouri@gmail.com') {
    return res.status(403).json({ error: 'Access Denied' });
  }
  if (userId === currentUserObj.id) {
    return res.status(400).json({ error: 'Cannot delete your own admin account' });
  }
  if (!db.users[userId]) {
    return res.status(404).json({ error: 'User not found' });
  }
  const username = db.users[userId].username;
  delete db.users[userId];
  saveDB(db);
  await logAdminActivity('USER_DELETE', currentUserObj.id, userId, username);
  res.json({ success: true, message: `User ${username} has been permanently deleted.` });
});

app.get('/api/admin/system-stats', (req, res) => {
  const db = loadDB();
  const currentUserObj = getCurrentUser(req, db);
  if (currentUserObj.email !== 'abderrahmanchakkouri@gmail.com') {
    return res.status(403).json({ error: 'Access Denied' });
  }

  let dbFileSize = 0;
  try {
    const stats = fs.statSync(DB_FILE);
    dbFileSize = stats.size;
  } catch (_) {}

  let sqliteSize = 0;
  try {
    const stats = fs.statSync(path.resolve('prisma/dev.db'));
    sqliteSize = stats.size;
  } catch (_) {}

  res.json({
    totalServers: db.servers.length,
    totalChannels: db.channels.length,
    totalMessages: db.messages.length,
    nodeVersion: process.version,
    platform: process.platform,
    uptime: Math.round(process.uptime()),
    memoryUsage: process.memoryUsage(),
    dbPath: DB_FILE,
    dbFileSize,
    sqliteSize,
    activeConnections: Object.values(db.users).filter(u => u.status === 'online').length
  });
});

app.get('/api/admin/servers', (req, res) => {
  const db = loadDB();
  const currentUserObj = getCurrentUser(req, db);
  if (currentUserObj.email !== 'abderrahmanchakkouri@gmail.com') {
    return res.status(403).json({ error: 'Access Denied: Owner permission required' });
  }
  const serversWithInfo = db.servers.map(s => {
    const owner = db.users[s.ownerId];
    const serverChannels = db.channels.filter(c => c.serverId === s.id);
    return {
      ...s,
      ownerUsername: owner ? owner.username : 'Unknown Owner',
      ownerEmail: owner ? owner.email : '',
      channelCount: serverChannels.length,
      memberCount: s.members.length,
    };
  });
  res.json(serversWithInfo);
});

app.delete('/api/admin/servers/:id', async (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  const currentUserObj = getCurrentUser(req, db);
  if (currentUserObj.email !== 'abderrahmanchakkouri@gmail.com') {
    return res.status(403).json({ error: 'Access Denied' });
  }
  const server = db.servers.find(s => s.id === id);
  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }
  
  db.servers = db.servers.filter(s => s.id !== id);
  db.channels = db.channels.filter(c => c.serverId !== id);
  db.categories = db.categories.filter(c => c.serverId !== id);
  db.messages = db.messages.filter(m => {
    const channel = db.channels.find(c => c.id === m.channelId);
    return channel ? channel.serverId !== id : true;
  });
  
  saveDB(db);
  await logAdminActivity('SERVER_DELETE', currentUserObj.id, id, server.name);
  res.json({ success: true, message: `Server "${server.name}" has been permanently deleted.` });
});

app.post('/api/admin/config', async (req, res) => {
  const updates = req.body;
  const db = loadDB();
  const currentUserObj = getCurrentUser(req, db);
  if (currentUserObj.email !== 'abderrahmanchakkouri@gmail.com') {
    return res.status(403).json({ error: 'Access Denied' });
  }
  
  db.systemConfig = {
    ...db.systemConfig,
    ...updates
  };
  saveDB(db);
  await logAdminActivity('SYSTEM_CONFIG_UPDATE', currentUserObj.id, undefined, 'System Config', updates);
  res.json({ success: true, systemConfig: db.systemConfig });
});

app.post('/api/admin/broadcast-message', (req, res) => {
  const { channelId, content } = req.body;
  if (!channelId || !content) {
    return res.status(400).json({ error: 'Missing channelId or message content' });
  }
  const db = loadDB();
  const currentUserObj = getCurrentUser(req, db);
  if (currentUserObj.email !== 'abderrahmanchakkouri@gmail.com') {
    return res.status(403).json({ error: 'Access Denied' });
  }

  const newMessage: Message = {
    id: Math.random().toString(36).substr(2, 9),
    channelId,
    userId: 'u5', // UnisoraBOT
    content,
    timestamp: new Date().toISOString(),
    reactions: []
  };

  db.messages.push(newMessage);
  saveDB(db);
  res.json({ success: true, message: newMessage });
});

app.post('/api/admin/servers/:id/toggle-verification', async (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  const currentUserObj = getCurrentUser(req, db);
  if (currentUserObj.email !== 'abderrahmanchakkouri@gmail.com') {
    return res.status(403).json({ error: 'Access Denied' });
  }
  const serverIndex = db.servers.findIndex(s => s.id === id);
  if (serverIndex === -1) {
    return res.status(404).json({ error: 'Server not found' });
  }
  
  const server = db.servers[serverIndex];
  if (!server.settings) {
    server.settings = { notifications: 'all' };
  }
  server.settings.verification = !server.settings.verification;
  saveDB(db);
  await logAdminActivity('SERVER_VERIFY_TOGGLE', currentUserObj.id, id, server.name, { verified: server.settings.verification });
  res.json({ success: true, verified: server.settings.verification, message: `Server verification status toggled.` });
});

app.post('/api/admin/broadcast-alert', async (req, res) => {
  const { content, durationHours } = req.body;
  if (!content || !durationHours) {
    return res.status(400).json({ error: 'Missing content or duration' });
  }
  const db = loadDB();
  const currentUserObj = getCurrentUser(req, db);
  if (currentUserObj.email !== 'abderrahmanchakkouri@gmail.com') {
    return res.status(403).json({ error: 'Access Denied' });
  }
  
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + Number(durationHours) * 60 * 60 * 1000).toISOString();
  
  if (!db.systemConfig) {
    db.systemConfig = {
      allowRegistrations: true,
      allowGoogleLogin: true,
      maintenanceMode: false,
      globalAnnouncementBanner: null,
    };
  }
  
  db.systemConfig.activeBroadcast = {
    content,
    durationHours: Number(durationHours),
    createdAt,
    expiresAt
  };
  
  saveDB(db);
  await logAdminActivity('BROADCAST_CREATE', currentUserObj.id, undefined, 'Broadcast Alert', { content, durationHours });
  res.json({ success: true, activeBroadcast: db.systemConfig.activeBroadcast });
});

app.post('/api/admin/broadcast-alert/revoke', async (req, res) => {
  const db = loadDB();
  const currentUserObj = getCurrentUser(req, db);
  if (currentUserObj.email !== 'abderrahmanchakkouri@gmail.com') {
    return res.status(403).json({ error: 'Access Denied' });
  }
  
  if (db.systemConfig) {
    db.systemConfig.activeBroadcast = null;
  }
  
  saveDB(db);
  await logAdminActivity('BROADCAST_REVOKE', currentUserObj.id, undefined, 'Broadcast Alert');
  res.json({ success: true });
});

// Serve React built static assets in production
const distPath = process.env.APPDATA_DIR ? path.join(__dirname, '..', 'dist') : path.resolve('dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  console.log(`Warning: dist path not found at ${distPath}`);
}

initDB().then(() => {
  function getLocalIpAddresses() {
    const interfaces = os.networkInterfaces();
    const addresses = [];
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          addresses.push(iface.address);
        }
      }
    }
    return addresses;
  }

  let lastPublishedIp = '';

  async function updateDiscoveryIP() {
    try {
      const publicIp = await new Promise<string>((resolve, reject) => {
        https.get('https://api.ipify.org', (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(data.trim()));
        }).on('error', reject);
      });

      if (publicIp === lastPublishedIp) {
        return; // Skip update if IP hasn't changed
      }

      console.log(`Discovered Public IP change: ${lastPublishedIp || 'none'} -> ${publicIp}`);

      const appKey = '4vhnafof';
      const targetUrl = `http://${publicIp}:${port}`;
      const base64Url = Buffer.from(targetUrl).toString('base64');
      
      await new Promise<void>((resolve, reject) => {
        const req = https.request({
          method: 'POST',
          hostname: 'keyvalue.immanuel.co',
          path: `/api/KeyVal/UpdateValue/${appKey}/serverUrl/${base64Url}`,
          headers: {
            'Content-Length': '0'
          }
        }, (res) => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`Failed to publish IP: Status ${res.statusCode}`));
          }
        });
        req.on('error', reject);
        req.end();
      });

      lastPublishedIp = publicIp;
      console.log(`Successfully published server URL (${targetUrl}) to global discovery registry!`);
    } catch (err) {
      console.error('Failed to update discovery IP:', err);
    }
  }

  // Poll for IP changes every 3 minutes (180,000 ms)
  setInterval(updateDiscoveryIP, 180000);

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`\n==================================================`);
    console.log(`Unisora Backend Server Started!`);
    console.log(`Local connection: http://localhost:${port}`);
    
    const ips = getLocalIpAddresses();
    ips.forEach((ip) => {
      console.log(`Network connection: http://${ip}:${port}`);
    });
    console.log(`\nTo allow users outside your house to connect:`);
    console.log(`1. Configure port forwarding on your router for port ${port} to your PC's IP.`);
    console.log(`2. Give external users your Public IP (find it at https://whatsmyip.org)`);
    console.log(`==================================================\n`);

    // Update global discovery IP
    updateDiscoveryIP();
  });

  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    let clientObj: WSClient | null = null;

    ws.on('message', (message) => {
      try {
        const parsed = JSON.parse(message.toString());
        if (parsed.type === 'auth') {
          const { token } = parsed;
          let userId = verifySessionToken(token);
          if (!userId) {
            // Graceful fallback for development / testing with raw user IDs
            userId = token;
          }

          if (userId) {
            // Remove any stale wsClient entry for this exact socket
            if (clientObj) {
              wsClients.delete(clientObj);
            }
            clientObj = {
              ws,
              userId,
              serverId: null,
              channelId: null
            };
            wsClients.add(clientObj);

            // Update user presence to online
            const p = getOrInitPresence(userId);
            p.isOnline = true;
            p.lastSeen = new Date().toISOString();
            broadcastEvent('presence_update', { ...p });

            ws.send(JSON.stringify({ event: 'auth_success', data: { userId } }));
          } else {
            ws.send(JSON.stringify({ event: 'auth_failure', error: 'Invalid session token' }));
          }
        } else if (parsed.type === 'presence') {
          if (clientObj) {
            clientObj.serverId = parsed.serverId || null;
            clientObj.channelId = parsed.channelId || null;

            const p = getOrInitPresence(clientObj.userId);
            p.activeServerId = parsed.serverId || null;
            p.activeChannelId = parsed.channelId || null;
            p.lastSeen = new Date().toISOString();
            p.isOnline = true;
            broadcastEvent('presence_update', { ...p });
          }
        } else if (parsed.type === 'typing') {
          if (clientObj) {
            broadcastEvent('typing_update', {
              userId: clientObj.userId,
              channelId: parsed.channelId,
              isTyping: !!parsed.isTyping
            });
          }
        } else if (parsed.type === 'call_user') {
          if (clientObj) {
            const targetId = parsed.targetUserId;
            const isGroup = targetId && targetId.startsWith('dm-');
            const payload = {
              event: 'incoming_call',
              data: {
                senderUserId: clientObj.userId,
                callType: parsed.callType,
                channelId: isGroup ? targetId : undefined
              }
            };
            if (isGroup) {
              const db = loadDB();
              const dmChannel = db.dmChannels[targetId];
              if (dmChannel) {
                const participants = dmChannel.participants || [];
                wsClients.forEach(c => {
                  if (c.userId !== clientObj.userId && participants.includes(c.userId)) {
                    c.ws.send(JSON.stringify(payload));
                  }
                });
              }
            } else {
              wsClients.forEach(c => {
                if (c.userId === targetId) {
                  c.ws.send(JSON.stringify(payload));
                }
              });
            }
          }
        } else if (parsed.type === 'call_accept') {
          if (clientObj) {
            const targetId = parsed.targetUserId;
            const isGroup = targetId && targetId.startsWith('dm-');
            const payload = {
              event: 'call_accepted',
              data: {
                targetUserId: clientObj.userId
              }
            };
            if (isGroup) {
              const db = loadDB();
              const dmChannel = db.dmChannels[targetId];
              if (dmChannel) {
                const participants = dmChannel.participants || [];
                wsClients.forEach(c => {
                  if (c.userId !== clientObj.userId && participants.includes(c.userId)) {
                    c.ws.send(JSON.stringify(payload));
                  }
                });
              }
            } else {
              wsClients.forEach(c => {
                if (c.userId === targetId) {
                  c.ws.send(JSON.stringify(payload));
                }
              });
            }
          }
        } else if (parsed.type === 'call_decline') {
          if (clientObj) {
            const targetId = parsed.targetUserId;
            const isGroup = targetId && targetId.startsWith('dm-');
            const payload = {
              event: 'call_declined',
              data: {
                targetUserId: clientObj.userId
              }
            };
            if (isGroup) {
              const db = loadDB();
              const dmChannel = db.dmChannels[targetId];
              if (dmChannel) {
                const participants = dmChannel.participants || [];
                wsClients.forEach(c => {
                  if (c.userId !== clientObj.userId && participants.includes(c.userId)) {
                    c.ws.send(JSON.stringify(payload));
                  }
                });
              }
            } else {
              wsClients.forEach(c => {
                if (c.userId === targetId) {
                  c.ws.send(JSON.stringify(payload));
                }
              });
            }
          }
        } else if (parsed.type === 'call_hangup') {
          if (clientObj) {
            const targetId = parsed.targetUserId;
            const isGroup = targetId && targetId.startsWith('dm-');
            const payload = {
              event: 'call_ended',
              data: {
                targetUserId: clientObj.userId
              }
            };
            if (isGroup) {
              const db = loadDB();
              const dmChannel = db.dmChannels[targetId];
              if (dmChannel) {
                const participants = dmChannel.participants || [];
                wsClients.forEach(c => {
                  if (c.userId !== clientObj.userId && participants.includes(c.userId)) {
                    c.ws.send(JSON.stringify(payload));
                  }
                });
              }
            } else {
              wsClients.forEach(c => {
                if (c.userId === targetId) {
                  c.ws.send(JSON.stringify(payload));
                }
              });
            }
          }
        } else if (parsed.type === 'webrtc_signal') {
          if (clientObj) {
            const targetId = parsed.targetUserId;
            const isGroup = targetId && targetId.startsWith('dm-');
            const payload = {
              event: 'webrtc_signal',
              data: {
                senderUserId: clientObj.userId,
                signal: parsed.signal
              }
            };
            if (isGroup) {
              const db = loadDB();
              const dmChannel = db.dmChannels[targetId];
              if (dmChannel) {
                const participants = dmChannel.participants || [];
                wsClients.forEach(c => {
                  if (c.userId !== clientObj.userId && participants.includes(c.userId)) {
                    c.ws.send(JSON.stringify(payload));
                  }
                });
              }
            } else {
              wsClients.forEach(c => {
                if (c.userId === targetId) {
                  c.ws.send(JSON.stringify(payload));
                }
              });
            }
          }
        }
      } catch (err) {
        console.error('Failed to parse WS message:', err);
      }
    });

    ws.on('close', () => {
      if (clientObj) {
        wsClients.delete(clientObj);
        const userId = clientObj.userId;
        
        // Broadcast typing false in any channel they were typing in
        if (clientObj.channelId) {
          broadcastEvent('typing_update', {
            userId,
            channelId: clientObj.channelId,
            isTyping: false
          });
        }

        // If no other connections for this user exist, set online to false
        const stillConnected = Array.from(wsClients).some(c => c.userId === userId);
        if (!stillConnected) {
          const p = getOrInitPresence(userId);
          p.isOnline = false;
          p.lastSeen = new Date().toISOString();
          broadcastEvent('presence_update', { ...p });
        }
      }
    });
  });
});

