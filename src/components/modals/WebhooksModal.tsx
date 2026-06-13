import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { X, Webhook as WebhookIcon, Plus, Trash2, Copy, Check, Terminal } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function WebhooksModal({ isOpen, onClose, serverId, channelId }: { isOpen: boolean; onClose: () => void; serverId: string; channelId: string }) {
  const { webhooks, createWebhook, deleteWebhook, channels } = useAppStore();
  const [newWebhookName, setNewWebhookName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const channelWebhooks = webhooks.filter(w => w.channelId === channelId);
  const channelName = channels.find(c => c.id === channelId)?.name || 'this channel';

  const handleCreate = () => {
    if (newWebhookName.trim()) {
      createWebhook(serverId, channelId, newWebhookName.trim());
      setNewWebhookName('');
    }
  };

  const copyUrl = (token: string) => {
    const url = `https://api.nexus.io/webhooks/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-surface-1 border border-border rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-2/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <WebhookIcon size={20} className="text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Channel Webhooks</h2>
              <p className="text-xs text-text-muted mt-0.5">Manage integrations for <span className="text-text-secondary font-semibold">#{channelName}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-3 rounded-lg text-text-muted hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {/* Create Section */}
          <div className="p-4 bg-surface-2 border border-border rounded-xl">
            <h3 className="text-xs font-black text-text-muted uppercase tracking-widest mb-3">Create New Webhook</h3>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Terminal size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input 
                  type="text" 
                  value={newWebhookName}
                  onChange={(e) => setNewWebhookName(e.target.value)}
                  placeholder="Webhook Name (e.g. GitHub Deployment)"
                  className="w-full bg-surface-1 border border-border focus:border-accent rounded-lg py-2 pl-9 pr-4 text-sm text-white placeholder:text-text-tertiary focus:outline-none transition-all"
                />
              </div>
              <Button variant="primary" icon={<Plus size={16} />} onClick={handleCreate} disabled={!newWebhookName.trim()}>
                Create
              </Button>
            </div>
          </div>

          {/* List Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-text-muted uppercase tracking-widest mb-1">Active Webhooks ({channelWebhooks.length})</h3>
            <AnimatePresence mode="popLayout">
              {channelWebhooks.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-12 flex flex-col items-center text-center opacity-40"
                >
                  <WebhookIcon size={48} className="mb-4" />
                  <p className="text-sm">No webhooks configured for this channel.</p>
                </motion.div>
              ) : (
                channelWebhooks.map(webhook => (
                  <motion.div 
                    key={webhook.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group bg-surface-2/30 border border-border hover:border-border-hover rounded-xl p-4 transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-surface-3 flex items-center justify-center text-text-secondary">
                          <WebhookIcon size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{webhook.name}</h4>
                          <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold mt-0.5">ID: {webhook.id}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => deleteWebhook(webhook.id)}
                        className="p-2 opacity-0 group-hover:opacity-100 hover:bg-danger/10 text-text-muted hover:text-danger rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="flex gap-2">
                      <div className="flex-1 bg-black/40 rounded-lg px-3 py-2 border border-white/5 font-mono text-[11px] text-text-tertiary truncate">
                        https://api.nexus.io/webhooks/{webhook.token}
                      </div>
                      <button 
                        onClick={() => copyUrl(webhook.token)}
                        className={cn(
                          "px-3 py-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-all",
                          copiedId === webhook.token ? "bg-success text-white" : "bg-surface-3 text-text-secondary hover:text-white"
                        )}
                      >
                        {copiedId === webhook.token ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copiedId === webhook.token ? 'Copied' : 'Copy URL'}</span>
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-surface-2 border-t border-border flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Done</Button>
        </div>
      </motion.div>
    </div>
  );
}
