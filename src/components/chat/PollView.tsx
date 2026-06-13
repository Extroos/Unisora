import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../lib/utils';
import { Check, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PollViewProps {
  messageId: string;
  poll: {
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
}

export function PollView({ messageId, poll }: PollViewProps) {
  const { voteInPoll } = useAppStore();
  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.voteCount, 0);

  return (
    <div className="mt-3 p-4 bg-surface-2 border border-border rounded-xl max-w-md shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
          <Check size={18} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-white tracking-tight">{poll.question}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-text-muted font-black uppercase tracking-widest">Interactive Poll</span>
            <span className="text-[10px] text-text-muted">•</span>
            <div className="flex items-center gap-1 text-[10px] text-text-muted font-bold">
              <Users size={10} />
              {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {poll.options.map((option) => {
          const isVoted = option.voterIds.includes('u1');
          const percentage = totalVotes === 0 ? 0 : Math.round((option.voteCount / totalVotes) * 100);

          return (
            <button
              key={option.id}
              onClick={() => voteInPoll(messageId, option.id)}
              className={cn(
                "w-full relative group overflow-hidden rounded-lg border transition-all h-10",
                isVoted 
                  ? "bg-accent/10 border-accent/40" 
                  : "bg-surface-1 border-border hover:border-border-hover"
              )}
            >
              {/* Progress Bar Background */}
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                className={cn(
                  "absolute inset-y-0 left-0 transition-colors duration-500",
                  isVoted ? "bg-accent/20" : "bg-surface-3"
                )}
              />

              {/* Content */}
              <div className="relative z-10 flex items-center justify-between px-3 h-full">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn(
                    "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                    isVoted ? "bg-accent border-accent" : "border-border group-hover:border-text-muted"
                  )}>
                    {isVoted && <Check size={10} className="text-white" />}
                  </div>
                  <span className={cn("text-xs font-bold truncate", isVoted ? "text-white" : "text-text-secondary")}>
                    {option.text}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className={cn("text-[11px] font-black tabular-nums", isVoted ? "text-accent" : "text-text-muted")}>
                    {percentage}%
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
        <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">
          {poll.allowMultiple ? 'Multiple choices allowed' : 'Select one option'}
        </span>
        {poll.expiresAt && (
          <span className="text-[9px] font-bold text-danger uppercase tracking-widest">
            Ends in 12h
          </span>
        )}
      </div>
    </div>
  );
}
