import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import fs from 'fs';
import path from 'path';

const adapter = new PrismaBetterSqlite3({
  url: "file:./prisma/dev.db"
});
const prisma = new PrismaClient({ adapter });
const DB_FILE = path.resolve('db.json');

async function main() {
  if (!fs.existsSync(DB_FILE)) {
    console.log('No db.json found. Skipping seed.');
    return;
  }

  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));

  console.log('Cleaning existing database entries...');
  await prisma.attachment.deleteMany();
  await prisma.reaction.deleteMany();
  await prisma.message.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.category.deleteMany();
  await prisma.role.deleteMany();
  await prisma.serverMember.deleteMany();
  await prisma.server.deleteMany();
  await prisma.user.deleteMany();
  await prisma.dmChannel.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.thread.deleteMany();

  console.log('Seeding users...');
  const users = data.users || {};
  if (data.currentUser && !users[data.currentUser.id]) {
    users[data.currentUser.id] = data.currentUser;
  }
  for (const user of Object.values(users) as any[]) {
    await prisma.user.create({
      data: {
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
      }
    });
  }

  console.log('Seeding servers...');
  const servers = data.servers || [];
  for (const server of servers) {
    await prisma.server.create({
      data: {
        id: server.id,
        name: server.name,
        description: server.description || null,
        iconUrl: server.iconUrl || null,
        bannerUrl: server.bannerUrl || null,
        ownerId: server.ownerId,
        isFavorite: !!server.isFavorite,
        order: server.order || 0,
        settings: server.settings ? JSON.stringify(server.settings) : null,
      }
    });

    const members = server.members || [];
    for (const userId of members) {
      const userExists = await prisma.user.findUnique({ where: { id: userId } });
      if (userExists) {
        await prisma.serverMember.create({
          data: {
            userId,
            serverId: server.id,
            joinedAt: new Date().toISOString(),
          }
        });
      }
    }

    const roles = server.roles || [];
    for (const role of roles) {
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
  }

  console.log('Seeding categories...');
  const categories = data.categories || [];
  for (const cat of categories) {
    const serverExists = await prisma.server.findUnique({ where: { id: cat.serverId } });
    if (serverExists) {
      await prisma.category.create({
        data: {
          id: cat.id,
          name: cat.name,
          order: cat.order || 0,
          isCollapsed: !!cat.isCollapsed,
          serverId: cat.serverId,
        }
      });
    }
  }

  console.log('Seeding channels...');
  const channels = data.channels || [];
  for (const chan of channels) {
    const serverExists = await prisma.server.findUnique({ where: { id: chan.serverId } });
    if (serverExists) {
      await prisma.channel.create({
        data: {
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
        }
      });
    }
  }

  console.log('Seeding threads...');
  const threads = data.threads || [];
  for (const thread of threads) {
    await prisma.thread.create({
      data: {
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

  console.log('Seeding messages, reactions, and attachments...');
  const messages = data.messages || [];
  for (const msg of messages) {
    const channelExists = await prisma.channel.findUnique({ where: { id: msg.channelId } });
    const userExists = await prisma.user.findUnique({ where: { id: msg.userId } });
    if (channelExists && userExists) {
      await prisma.message.create({
        data: {
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

      const reactions = msg.reactions || [];
      for (const reaction of reactions) {
        await prisma.reaction.create({
          data: {
            emoji: reaction.emoji,
            messageId: msg.id,
            userIds: JSON.stringify(reaction.userIds || []),
          }
        });
      }

      const attachments = msg.attachments || [];
      for (const att of attachments) {
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

  console.log('Seeding DM channels...');
  const dmChannels = data.dmChannels || {};
  for (const [id, dm] of Object.entries(dmChannels) as any[]) {
    await prisma.dmChannel.create({
      data: {
        id,
        participants: JSON.stringify(dm.participants || []),
        name: dm.name || null,
        ownerId: dm.ownerId,
        createdAt: dm.createdAt || new Date().toISOString(),
      }
    });
  }

  console.log('Seeding notifications...');
  const notifications = data.notifications || [];
  for (const notif of notifications) {
    await prisma.notification.create({
      data: {
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

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
