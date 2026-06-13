import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../lib/utils';
import { Avatar } from '../ui/Avatar';
import { Calendar } from 'lucide-react';

interface UserProfileCardProps {
  userId: string;
  className?: string;
}

export function UserProfileCard({ userId, className }: UserProfileCardProps) {
  const { users } = useAppStore();
  const user = users[userId];
  if (!user) return null;

  const isCurrentUser = userId === 'u1';

  return (
    <div className={cn("w-[300px] bg-surface-1 rounded-lg border border-border shadow-2xl overflow-hidden", className)}>
      {/* Banner */}
      <div className="h-16 bg-accent" />

      {/* Avatar */}
      <div className="px-4 -mt-8 flex items-end justify-between">
        <div className="w-[80px] h-[80px] rounded-full border-[6px] border-surface-1 overflow-hidden bg-surface-3 shadow-sm">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-text-secondary">{user.username[0]}</div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="px-4 pt-4 pb-4">
        <div className="bg-surface-2 rounded-md p-3 mb-3 border border-border/50">
          <h3 className="text-lg font-bold text-white">{user.username}</h3>
          {user.customStatus && (
            <div className="text-xs text-text-secondary mt-1 flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-success shrink-0" title={user.status} />
               <span className="truncate">{user.customStatus}</span>
            </div>
          )}
        </div>

        <div className="space-y-3.5">
          <div>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5">About Me</p>
            <div className="text-[13px] text-text-secondary leading-normal">
              {isCurrentUser
                ? "Full-stack developer focused on systems architecture and real-time communication."
                : "Product designer specializing in technical interfaces and data density."
              }
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5">Member Since</p>
            <div className="flex items-center gap-1.5 text-[12px] text-text-secondary">
              <Calendar size={13} className="text-text-muted" />
              <span>Jan 20, 2024</span>
            </div>
          </div>

          {user.activity && (
            <div className="pt-3 border-t border-border">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Activities</p>
              <div className="flex items-center gap-3 p-2 bg-surface-2 rounded border border-border/40">
                <div className="w-10 h-10 rounded bg-surface-3 flex items-center justify-center shrink-0 border border-border/40">
                  <span className="text-sm font-bold text-accent">{user.activity.name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-white truncate">{user.activity.name}</p>
                  <p className="text-[11px] text-text-tertiary truncate capitalize">{user.activity.type}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
