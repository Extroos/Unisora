import React from 'react';
import { Hash, Lock } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ChannelWelcomeProps {
  channelName: string;
  channelDescription?: string;
  isPrivate?: boolean;
  memberCount?: number;
}

export function ChannelWelcome({ channelName, channelDescription, isPrivate }: ChannelWelcomeProps) {
  return (
    <div className="px-2 pt-12 pb-6 select-none">
      <div className="w-16 h-16 rounded bg-surface-3 flex items-center justify-center mb-4 border border-border">
        {isPrivate ? <Lock size={28} className="text-text-muted" /> : <Hash size={28} className="text-text-muted" />}
      </div>
      <h1 className="text-2xl font-bold text-text-primary mb-1.5">
        Welcome to #{channelName}
      </h1>
      <p className="text-sm text-text-tertiary leading-relaxed max-w-lg">
        {channelDescription || `This is the start of the #${channelName} channel.`}
      </p>
      <div className="mt-6 h-px bg-border" />
    </div>
  );
}

interface DmWelcomeProps {
  username: string;
  avatarUrl?: string;
  status?: string;
  customStatus?: string;
}

export function DmWelcome({ username, avatarUrl }: DmWelcomeProps) {
  return (
    <div className="px-2 pt-12 pb-6 select-none">
      <div className="w-16 h-16 rounded overflow-hidden mb-4 border border-border">
        {avatarUrl ? (
          <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-surface-3 flex items-center justify-center text-xl font-bold text-text-secondary">
            {username[0]}
          </div>
        )}
      </div>
      <h1 className="text-2xl font-bold text-text-primary mb-1.5">{username}</h1>
      <p className="text-sm text-text-tertiary leading-relaxed">
        This is the beginning of your direct message history with <strong className="text-text-secondary">{username}</strong>.
      </p>
      <div className="mt-6 h-px bg-border" />
    </div>
  );
}
