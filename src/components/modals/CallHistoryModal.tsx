import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { X, Phone, Video, Clock, ArrowUpRight, ArrowDownLeft, PhoneOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatTime, formatDate } from '../../lib/utils';
import { Avatar } from '../ui/Avatar';
import { cn } from '../../lib/utils';

interface CallHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export function CallHistoryModal({ isOpen, onClose, userId }: CallHistoryModalProps) {
  const { callLogs, users } = useAppStore();
  const user = users[userId];
  
  const userLogs = callLogs.filter(log => log.userId === userId);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-10000 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-surface-1 rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-border bg-surface-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Clock size={16} className="text-accent" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-text-primary tracking-tight">Call History</h2>
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">with {user?.username}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-surface-3 rounded-xl text-text-muted hover:text-text-primary transition-all">
                <X size={20} />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
              {userLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                  <Phone size={48} className="mb-4 stroke-[1px]" />
                  <p className="text-sm font-bold">No call history</p>
                </div>
              ) : (
                userLogs.map(log => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-surface-2/50 border border-border rounded-xl hover:bg-surface-2 transition-all">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center",
                        log.missed ? "bg-danger/10 text-danger" : "bg-success/10 text-success"
                      )}>
                        {log.missed ? <PhoneOff size={16} /> : (log.type === 'video' ? <Video size={16} /> : <Phone size={16} />)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-text-primary">
                          {log.missed ? 'Missed Call' : (log.type === 'video' ? 'Video Call' : 'Audio Call')}
                        </div>
                        <div className="text-[10px] text-text-muted flex items-center gap-1.5 font-medium">
                          <span>{formatDate(log.timestamp)}</span>
                          <span>•</span>
                          <span>{formatTime(log.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                       {!log.missed && log.duration && (
                         <div className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest">
                           {Math.floor(log.duration / 60)}m {log.duration % 60}s
                         </div>
                       )}
                       {log.missed && <span className="text-[9px] font-bold text-danger uppercase tracking-widest">Missed</span>}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-surface-2/50 border-t border-border flex justify-center">
               <button 
                 onClick={() => useAppStore.getState().clearCallHistory(userId)}
                 className="text-[10px] font-bold text-accent hover:underline uppercase tracking-widest"
               >
                 Clear History
               </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
