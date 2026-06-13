import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { X, User, Bell, Shield, Paintbrush, Monitor, LogOut, Volume2, Globe, Keyboard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Avatar } from './ui/Avatar';
import { Button } from './ui/Button';

export function SettingsModal() {
  const { isSettingsOpen, setSettingsOpen, currentUser, updateCurrentUser, setComingSoonFeature, openDialog, compactMode, setCompactMode, notificationPrefs, setNotificationPref, locale, setLocale } = useAppStore();
  const [activeTab, setActiveTab] = React.useState('account');
  const [theme, setTheme] = React.useState('dark');
  // Profile tab controlled state
  const [profileName, setProfileName] = React.useState(currentUser?.username || '');
  const [profileBio, setProfileBio] = React.useState(currentUser?.bio || '');
  const [profileAvatarUrl, setProfileAvatarUrl] = React.useState(currentUser?.avatarUrl || '');
  const [profileBannerUrl, setProfileBannerUrl] = React.useState(currentUser?.bannerUrl || '');
  const [profileThemeColor, setProfileThemeColor] = React.useState(currentUser?.themeColor || '');

  const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
  const [launchOnStartup, setLaunchOnStartupState] = React.useState(false);
  const [minimizeToTraySettings, setMinimizeToTrayState] = React.useState(true);

  React.useEffect(() => {
    if (isSettingsOpen && isElectron) {
      (window as any).electronAPI.getLaunchOnStartup().then((val: boolean) => setLaunchOnStartupState(val));
      (window as any).electronAPI.getMinimizeToTray().then((val: boolean) => setMinimizeToTrayState(val));
    }
  }, [isSettingsOpen, isElectron]);

  React.useEffect(() => {
    if (isSettingsOpen && currentUser) {
      setProfileName(currentUser.username || '');
      setProfileBio(currentUser.bio || '');
      setProfileAvatarUrl(currentUser.avatarUrl || '');
      setProfileBannerUrl(currentUser.bannerUrl || '');
      setProfileThemeColor(currentUser.themeColor || '');
    }
  }, [isSettingsOpen, currentUser]);
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setProfileAvatarUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setProfileBannerUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const tabs = [
    { id: 'account', label: 'My Account', icon: User },
    { id: 'profile', label: 'Profiles', icon: Paintbrush },
    { id: 'privacy', label: 'Privacy & Safety', icon: Shield },
    { id: 'divider1', divider: true },
    ...(isElectron ? [{ id: 'desktopSettings', label: 'Windows Settings', icon: Monitor }] : []),
    { id: 'appearance', label: 'Appearance', icon: Monitor },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'voice', label: 'Voice & Audio', icon: Volume2 },
    { id: 'keybinds', label: 'Keybinds', icon: Keyboard },
    { id: 'language', label: 'Language', icon: Globe },
    { id: 'divider2', divider: true },
    { id: 'logout', label: 'Log Out', icon: LogOut, danger: true },
  ];

  if (!isSettingsOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-100 flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSettingsOpen(false)} className="absolute inset-0 bg-black/60" />
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-5xl h-[85vh] min-h-[600px] bg-surface-1 border border-border rounded shadow-2xl overflow-hidden flex"
        >
          {/* Sidebar - Professional & Grounded */}
          <div className="w-[240px] bg-surface-2 border-r border-border flex flex-col py-8">
            <div className="px-6 mb-6">
              <h2 className="text-[10px] font-black text-text-muted uppercase tracking-[0.25em] pl-1">Configuration</h2>
            </div>
            <div className="flex-1 overflow-y-auto px-3 space-y-0.5">
              {tabs.map((tab, i) => {
                if (tab.divider) return <div key={`d-${i}`} className="h-px bg-white/5 mx-3 my-4" />;
                const Icon = tab.icon!;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (tab.id === 'logout') { setSettingsOpen(false); useAppStore.getState().setLoggedIn(false); }
                      else setActiveTab(tab.id);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3.5 py-2 rounded text-[12px] font-bold transition-all uppercase tracking-wider group",
                      isActive 
                        ? "bg-accent text-white" 
                        : tab.danger 
                          ? "text-danger hover:bg-danger/10" 
                          : "text-text-muted hover:bg-surface-3 hover:text-text-primary"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={14} className={cn("transition-colors", isActive ? "text-white" : "group-hover:text-text-primary")} />
                      {tab.label}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="px-6 pt-4 mt-auto border-t border-white/5 text-[9px] font-black text-text-muted tracking-widest uppercase select-none">
              Unisora v{(window as any).electronAPI?.appVersion || '1.0.1'}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col bg-surface-1 relative">
            <div className="absolute top-5 right-5 z-10 flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-surface-3/30 border border-white/5 text-[10px] font-bold text-text-muted select-none">
                <span className="opacity-70">ESC</span>
              </div>
              <button onClick={() => setSettingsOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-3/50 hover:bg-surface-3 text-text-tertiary hover:text-text-primary transition-all">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-12 pb-24 custom-scrollbar">
              <div className="max-w-3xl mx-auto">
                {/* ── Account Tab ── */}
                {activeTab === 'account' && (
                  <div className="space-y-10 animate-fade-in-up">
                    <div>
                      <h3 className="text-lg font-bold text-text-primary mb-1">My Account</h3>
                      <p className="text-xs text-text-muted">Primary credential and security configuration.</p>
                    </div>

                    <div className="bg-surface-1 border border-border rounded overflow-hidden">
                      <div className="h-24 bg-surface-2 relative">
                        <div className="absolute inset-0 bg-linear-to-b from-transparent to-black/10" />
                        <div className="absolute -bottom-10 left-8">
                          <div className="p-1 bg-surface-1 rounded-[22px] shadow-xl">
                            <Avatar 
                              src={currentUser.avatarUrl} 
                              alt={currentUser.username} 
                              size="xl" 
                              showStatus={false}
                              className="rounded-[18px]" 
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-14 p-8 flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xl font-bold text-white">{currentUser.username}</h4>
                            <div className="px-1.5 py-0.5 rounded bg-accent/20 text-accent text-[9px] font-bold uppercase tracking-widest">Active</div>
                          </div>
                          <p className="text-sm text-text-tertiary mt-1 font-medium">{currentUser.email || 'user@example.com'}</p>
                        </div>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="bg-surface-2 hover:bg-surface-3 border-white/5 font-bold text-[11px] uppercase tracking-widest rounded-lg"
                          onClick={() => setActiveTab('profile')}
                        >
                          Edit Profile
                        </Button>
                      </div>

                      <div className="px-8 pb-8 space-y-1">
                        {[
                          { 
                            label: 'Display Name', 
                            value: currentUser.username, 
                            onEdit: async (val: string) => {
                              const res = await updateCurrentUser({ username: val });
                              if (res && !res.success) {
                                openDialog({
                                  type: 'confirm',
                                  title: 'Update Failed',
                                  description: res.error || 'Failed to update Display Name.',
                                  confirmLabel: 'OK',
                                  onConfirm: () => {}
                                });
                              }
                            }
                          },
                          { 
                            label: 'Tag', 
                            value: currentUser.tag || '', 
                            onEdit: async (val: string) => {
                              const res = await updateCurrentUser({ tag: val });
                              if (res && !res.success) {
                                openDialog({
                                  type: 'confirm',
                                  title: 'Update Failed',
                                  description: res.error || 'Failed to update Tag.',
                                  confirmLabel: 'OK',
                                  onConfirm: () => {}
                                });
                              }
                            }
                          },
                          { 
                            label: 'Email Address', 
                            value: currentUser.email || 'N/A', 
                            onEdit: async (val: string) => {
                              const res = await updateCurrentUser({ email: val });
                              if (res && !res.success) {
                                openDialog({
                                  type: 'confirm',
                                  title: 'Update Failed',
                                  description: res.error || 'Failed to update Email Address.',
                                  confirmLabel: 'OK',
                                  onConfirm: () => {}
                                });
                              }
                            }
                          },
                        ].map((field, i) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-surface-2 border border-border rounded">
                            <div>
                              <p className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] mb-1">{field.label}</p>
                              <p className="text-sm text-text-primary font-bold tracking-tight">{field.value}</p>
                            </div>
                            <button 
                              onClick={() => {
                                openDialog({
                                  type: 'input',
                                  title: `Update ${field.label}`,
                                  description: `Modify ${field.label.toLowerCase()} for this account.`,
                                  defaultValue: field.value,
                                  onConfirm: field.onEdit
                                });
                              }}
                              className="text-[10px] font-black text-white bg-surface-3 hover:bg-accent border border-border px-3 py-1.5 rounded transition-all uppercase tracking-widest"
                            >
                              Edit
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-8 border-t border-white/5">
                      <h3 className="text-[11px] font-bold text-danger uppercase tracking-widest mb-4">Privacy & Security</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-surface-2/30 border border-white/5 rounded-xl">
                          <h5 className="text-sm font-bold text-text-primary mb-1">Two-Factor Auth</h5>
                          <p className="text-[11px] text-text-muted mb-4 leading-relaxed">Add an extra layer of security to your account.</p>
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="w-full text-[10px] font-bold uppercase tracking-widest"
                            onClick={() => setComingSoonFeature('Two-Factor Authentication')}
                          >
                            Enable 2FA
                          </Button>
                        </div>
                        <div className="p-4 bg-surface-2/30 border border-white/5 rounded-xl">
                          <h5 className="text-sm font-bold text-text-primary mb-1">Session Manager</h5>
                          <p className="text-[11px] text-text-muted mb-4 leading-relaxed">Review and manage your active devices.</p>
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="w-full text-[10px] font-bold uppercase tracking-widest"
                            onClick={() => setComingSoonFeature('Session Management')}
                          >
                            View Sessions
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Appearance Tab ── */}
                {activeTab === 'appearance' && (
                  <div className="space-y-6 animate-fade-in-up">
                    <h3 className="text-lg font-bold text-text-primary mb-4">Appearance</h3>
                    <div>
                      <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-widest mb-3">Theme</h4>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { id: 'dark', name: 'Dark', colors: 'bg-surface-0' },
                          { id: 'light', name: 'Light', colors: 'bg-white' },
                          { id: 'system', name: 'System', colors: 'bg-surface-3' },
                        ].map(t => (
                          <button key={t.id} onClick={() => setTheme(t.id)} className="text-left group relative">
                            <div className={cn("h-20 rounded-xl border-2 overflow-hidden mb-2", theme === t.id ? "border-text-muted" : "border-border group-hover:border-border-hover")}>
                              <div className={cn("w-full h-full", t.colors)} />
                            </div>
                            <span className={cn("text-xs font-medium", theme === t.id ? "text-text-primary" : "text-text-tertiary")}>{t.name}</span>
                            {theme === t.id && <div className="absolute top-2 right-2 w-4 h-4 bg-text-secondary rounded-full flex items-center justify-center"><div className="w-1.5 h-1.5 bg-white rounded-full" /></div>}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="h-px bg-border" />
                    <div>
                      <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-widest mb-3">Display</h4>
                      <div className="bg-surface-2 border border-border rounded-xl p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="text-text-secondary font-medium text-sm">Compact Mode</h5>
                            <p className="text-[11px] text-text-muted mt-0.5">Fit more messages on screen with reduced spacing.</p>
                          </div>
                          <button onClick={() => setCompactMode(!compactMode)} className={cn("w-10 h-6 rounded-full relative transition-colors", compactMode ? "bg-accent" : "bg-surface-4")}>
                            <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm", compactMode ? "left-5" : "left-1")} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Windows Settings Tab ── */}
                {activeTab === 'desktopSettings' && (
                  <div className="space-y-6 animate-fade-in-up font-sans select-none">
                    <div>
                      <h3 className="text-lg font-bold text-text-primary mb-1">Windows Settings</h3>
                      <p className="text-xs text-text-muted">Configure desktop application integrations and window control styles.</p>
                    </div>
                    <div className="bg-surface-2 border border-border rounded-xl p-4 space-y-4 shadow-sm">
                      {/* Launch on Startup Toggle */}
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="text-sm font-medium text-text-secondary">Launch on Startup</h5>
                          <p className="text-[11px] text-text-muted mt-0.5">Automatically open Unisora when you sign into your computer.</p>
                        </div>
                        <button
                          onClick={() => {
                            const val = !launchOnStartup;
                            setLaunchOnStartupState(val);
                            (window as any).electronAPI.setLaunchOnStartup(val);
                          }}
                          className={cn("w-10 h-6 rounded-full relative cursor-pointer transition-colors duration-150", launchOnStartup ? "bg-accent" : "bg-surface-4")}
                        >
                          <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-150 shadow-sm", launchOnStartup ? "left-5" : "left-1")} />
                        </button>
                      </div>

                      <div className="h-px bg-border/40" />

                      {/* Close to Tray Toggle */}
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="text-sm font-medium text-text-secondary">Minimize to System Tray on Close</h5>
                          <p className="text-[11px] text-text-muted mt-0.5">Keep Unisora running in the background when the main window is closed.</p>
                        </div>
                        <button
                          onClick={() => {
                            const val = !minimizeToTraySettings;
                            setMinimizeToTrayState(val);
                            (window as any).electronAPI.setMinimizeToTray(val);
                          }}
                          className={cn("w-10 h-6 rounded-full relative cursor-pointer transition-colors duration-150", minimizeToTraySettings ? "bg-accent" : "bg-surface-4")}
                        >
                          <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-150 shadow-sm", minimizeToTraySettings ? "left-5" : "left-1")} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Privacy Tab ── */}
                {activeTab === 'privacy' && (
                  <div className="space-y-6 animate-fade-in-up">
                    <h3 className="text-lg font-bold text-text-primary mb-4">Privacy & Safety</h3>
                    <div className="bg-surface-2 border border-border rounded-xl p-5">
                      <h4 className="text-sm font-bold text-text-secondary mb-2">Safe Direct Messaging</h4>
                      <p className="text-xs text-text-muted mb-4">Automatically scan direct messages for explicit content.</p>
                      <div className="space-y-2">
                        <label className="flex items-start gap-3 p-3 bg-surface-1 border border-accent/20 rounded-xl cursor-pointer">
                          <input type="radio" name="safe-dm" className="mt-0.5 accent-accent" defaultChecked />
                          <div>
                            <h5 className="text-sm font-medium text-text-secondary">Keep me safe</h5>
                            <p className="text-[11px] text-text-muted">Scan messages from everyone.</p>
                          </div>
                        </label>
                        <label className="flex items-start gap-3 p-3 bg-surface-1 border border-border hover:border-border-hover rounded-xl cursor-pointer transition-colors">
                          <input type="radio" name="safe-dm" className="mt-0.5 accent-accent" />
                          <div>
                            <h5 className="text-sm font-medium text-text-secondary">Do not scan</h5>
                            <p className="text-[11px] text-text-muted">Disable scanning.</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Notifications Tab ── */}
                {activeTab === 'notifications' && (
                  <div className="space-y-6 animate-fade-in-up">
                    <div>
                      <h3 className="text-lg font-bold text-text-primary mb-1">Notifications</h3>
                      <p className="text-xs text-text-muted">Control how and when you are notified.</p>
                    </div>
                    <div className="bg-surface-2 border border-border rounded-xl p-4 space-y-4">
                      {([
                        { key: 'desktop',        label: 'Desktop Notifications', desc: 'Show notifications on your desktop' },
                        { key: 'messageSounds',  label: 'Message Sounds',        desc: 'Play sounds for incoming messages' },
                        { key: 'mentionAlerts',  label: 'Mention Alerts',        desc: 'Get alerted when someone mentions you' },
                        { key: 'dmNotifications',label: 'DM Notifications',      desc: 'Notifications for direct messages' },
                      ] as const).map(n => {
                        const defaultPrefs = {
                          desktop: true,
                          messageSounds: true,
                          mentionAlerts: true,
                          dmNotifications: false,
                        };
                        const activePrefs = {
                          ...defaultPrefs,
                          ...currentUser?.notificationPrefs
                        };
                        const isChecked = activePrefs[n.key];

                        return (
                          <div key={n.key} className="flex items-center justify-between">
                            <div>
                              <h5 className="text-sm font-medium text-text-secondary">{n.label}</h5>
                              <p className="text-[11px] text-text-muted mt-0.5">{n.desc}</p>
                            </div>
                            <button
                              onClick={() => setNotificationPref(n.key, !isChecked)}
                              className={cn("w-10 h-6 rounded-full relative cursor-pointer transition-colors", isChecked ? "bg-accent" : "bg-surface-4")}
                            >
                              <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm", isChecked ? "left-5" : "left-1")} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* ── Profile Tab ── */}
                {activeTab === 'profile' && (
                  <div className="space-y-6 animate-fade-in-up">
                    <div>
                      <h3 className="text-lg font-bold text-text-primary mb-1">User Profile</h3>
                      <p className="text-xs text-text-muted">Your identity as seen by other members.</p>
                    </div>
                    <div className="flex flex-col lg:flex-row gap-8">
                      <div className="flex-1 space-y-6">
                        <div>
                          <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 block">Display Name</label>
                          <input
                            type="text"
                            value={profileName}
                            onChange={e => setProfileName(e.target.value)}
                            className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 block">About Me</label>
                          <textarea
                            rows={3}
                            value={profileBio}
                            onChange={e => setProfileBio(e.target.value)}
                            placeholder="Tell everyone a little about yourself"
                            className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors resize-none"
                          />
                        </div>

                        {/* Avatar Customization */}
                        <div className="p-4 bg-surface-2/30 border border-border rounded-xl space-y-3">
                          <label className="text-[10px] font-bold text-text-primary uppercase tracking-widest block font-sans">Profile Picture (Avatar or GIF)</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="file"
                              accept="image/png, image/jpeg, image/jpg, image/gif"
                              id="avatar-upload-file"
                              className="hidden"
                              onChange={handleAvatarFileChange}
                            />
                            <label
                              htmlFor="avatar-upload-file"
                              className="px-4 py-2 bg-surface-3 hover:bg-accent border border-border rounded-xl text-xs font-bold text-white cursor-pointer transition-all uppercase tracking-wider"
                            >
                              Upload Avatar
                            </label>
                            {profileAvatarUrl && (
                              <button
                                type="button"
                                onClick={() => setProfileAvatarUrl('')}
                                className="text-xs font-bold text-danger hover:underline uppercase tracking-wider"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Banner Customization */}
                        <div className="p-4 bg-surface-2/30 border border-border rounded-xl space-y-3">
                          <label className="text-[10px] font-bold text-text-primary uppercase tracking-widest block font-sans">Profile Banner Image or GIF</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="file"
                              accept="image/png, image/jpeg, image/jpg, image/gif"
                              id="banner-upload-file"
                              className="hidden"
                              onChange={handleBannerFileChange}
                            />
                            <label
                              htmlFor="banner-upload-file"
                              className="px-4 py-2 bg-surface-3 hover:bg-accent border border-border rounded-xl text-xs font-bold text-white cursor-pointer transition-all uppercase tracking-wider"
                            >
                              Upload Banner
                            </label>
                            {profileBannerUrl && (
                              <button
                                type="button"
                                onClick={() => setProfileBannerUrl('')}
                                className="text-xs font-bold text-danger hover:underline uppercase tracking-wider"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Profile Theme Color Customization */}
                        <div className="p-4 bg-surface-2/30 border border-border rounded-xl space-y-4">
                          <div>
                            <label className="text-[10px] font-bold text-text-primary uppercase tracking-widest block font-sans mb-1">Profile Theme Color</label>
                            <span className="text-[11px] text-text-muted font-medium">Select a theme accent color for your profile card.</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { label: 'Default', value: '' },
                              { label: 'Indigo', value: '#5865f2' },
                              { label: 'Emerald', value: '#248046' },
                              { label: 'Crimson', value: '#f23f43' },
                              { label: 'Amber', value: '#f0b232' },
                              { label: 'Violet', value: '#9b5de5' },
                              { label: 'Slate', value: '#4f545c' }
                            ].map((preset, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setProfileThemeColor(preset.value)}
                                className={cn(
                                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                                  profileThemeColor === preset.value
                                    ? "bg-accent border-accent text-white"
                                    : "bg-surface-3 border-border text-text-secondary hover:text-white"
                                )}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">Custom Hex:</label>
                            <input
                              type="text"
                              value={profileThemeColor}
                              onChange={e => setProfileThemeColor(e.target.value)}
                              placeholder="#5865f2"
                              className="bg-surface-2 border border-border rounded-lg px-2.5 py-1 text-xs text-text-primary focus:outline-none focus:border-accent/50 w-28 font-mono"
                            />
                            {profileThemeColor && (
                              <div className="w-5 h-5 rounded border border-border" style={{ backgroundColor: profileThemeColor }} />
                            )}
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <Button
                            variant="primary"
                            onClick={async () => {
                              let finalAvatarUrl = profileAvatarUrl;
                              let finalBannerUrl = profileBannerUrl;

                              // Upload Avatar if it is base64
                              if (profileAvatarUrl && profileAvatarUrl.startsWith('data:')) {
                                try {
                                  const uploadRes = await fetch('/api/upload', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ fileData: profileAvatarUrl, fileName: 'avatar.png' })
                                  });
                                  if (uploadRes.ok) {
                                    const uploadData = await uploadRes.json();
                                    finalAvatarUrl = uploadData.url;
                                  }
                                } catch (e) {
                                  console.error('Avatar upload failed:', e);
                                }
                              }

                              // Upload Banner if it is base64
                              if (profileBannerUrl && profileBannerUrl.startsWith('data:')) {
                                try {
                                  const uploadRes = await fetch('/api/upload', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ fileData: profileBannerUrl, fileName: 'banner.png' })
                                  });
                                  if (uploadRes.ok) {
                                    const uploadData = await uploadRes.json();
                                    finalBannerUrl = uploadData.url;
                                  }
                                } catch (e) {
                                  console.error('Banner upload failed:', e);
                                }
                              }

                              const res = await updateCurrentUser({ 
                                username: profileName, 
                                bio: profileBio, 
                                avatarUrl: finalAvatarUrl,
                                bannerUrl: finalBannerUrl,
                                themeColor: profileThemeColor
                              });
                              if (res && !res.success) {
                                openDialog({
                                  type: 'confirm',
                                  title: 'Update Failed',
                                  description: res.error || 'Failed to save changes.',
                                  confirmLabel: 'OK',
                                  onConfirm: () => {}
                                });
                              } else {
                                setSettingsOpen(false);
                              }
                            }}
                          >
                            Save Changes
                          </Button>
                        </div>
                      </div>

                      {/* Live Preview Pane */}
                      <div className="w-64 shrink-0">
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2 block">Card Preview</label>
                        <div 
                          className="bg-surface-2 border border-border rounded-xl overflow-hidden shadow-lg transition-all"
                          style={{
                            background: profileThemeColor
                              ? `linear-gradient(to bottom, ${profileThemeColor}18 0%, var(--color-surface-2) 120px, var(--color-surface-2) 100%)`
                              : undefined
                          }}
                        >
                          <div 
                            className="h-20 bg-surface-3 relative"
                            style={{ backgroundColor: profileThemeColor || undefined }}
                          >
                            <label htmlFor="banner-upload-file" className="cursor-pointer group block w-full h-full relative overflow-hidden">
                              {profileBannerUrl ? (
                                <img src={profileBannerUrl} alt="" className="w-full h-full object-cover animate-none" />
                              ) : (
                                !profileThemeColor && <div className="w-full h-full bg-linear-to-r from-accent/5 to-surface-3" />
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-bold uppercase tracking-wider">
                                Change Banner
                              </div>
                            </label>
                            <div className="absolute -bottom-8 left-4 z-10">
                              <div className="p-1 bg-surface-2 rounded-xl inline-block">
                                <label htmlFor="avatar-upload-file" className="cursor-pointer group block relative rounded-xl overflow-hidden">
                                  <Avatar src={profileAvatarUrl || currentUser.avatarUrl} alt={currentUser.username} size="lg" showStatus={false} className="border-none" />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[8px] font-bold uppercase tracking-wider text-center leading-tight">
                                    Change<br/>PFP
                                  </div>
                                </label>
                              </div>
                            </div>
                          </div>
                          <div className="p-4 pt-10">
                            <h4 className="font-bold text-text-primary text-sm">
                              {profileName || currentUser.username}
                              <span className="text-[11px] font-bold text-text-muted opacity-50 ml-1">#{currentUser?.tag || currentUser?.id.slice(-4)}</span>
                            </h4>
                            <p className="text-xs text-text-muted mt-3 border-t border-border/60 pt-2 leading-relaxed whitespace-pre-wrap">
                              {profileBio || 'No bio added yet.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Voice & Audio Tab ── */}
                {activeTab === 'voice' && (
                  <div className="space-y-8 animate-fade-in-up">
                    <div>
                      <h3 className="text-lg font-bold text-text-primary mb-1">Voice & Video</h3>
                      <p className="text-xs text-text-muted">Configure input/output parameters and signal processing.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block">Input Device</label>
                        <div className="relative group">
                          <select className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text-primary appearance-none focus:outline-none focus:border-accent/50 transition-all cursor-pointer">
                            <option>Default - Integrated Microphone</option>
                            <option>USB Audio Device (Professional)</option>
                            <option>Virtual Audio Cable</option>
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted group-hover:text-text-secondary transition-colors">
                            <Monitor size={14} />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block">Output Device</label>
                        <div className="relative group">
                          <select className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text-primary appearance-none focus:outline-none focus:border-accent/50 transition-all cursor-pointer">
                            <option>Default - System Output</option>
                            <option>Headphones (High Fidelity)</option>
                            <option>External Speakers</option>
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted group-hover:text-text-secondary transition-colors">
                            <Volume2 size={14} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-border/60" />

                    <div className="space-y-6">
                      <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-widest">Input Mode</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { id: 'voice-activity', name: 'Voice Activity', desc: 'Automatically detect when you speak.' },
                          { id: 'push-to-talk', name: 'Push to Talk', desc: 'Require a keybind to transmit audio.' }
                        ].map(mode => (
                          <button 
                            key={mode.id}
                            onClick={() => useAppStore.getState().updateVoiceSettings({ inputMode: mode.id as any })}
                            className={cn(
                              "text-left p-4 rounded-xl border transition-all relative group",
                              useAppStore.getState().voiceState.settings?.inputMode === mode.id 
                                ? "bg-accent/5 border-accent shadow-[0_0_15px_rgba(var(--accent-rgb),0.1)]" 
                                : "bg-surface-2 border-border hover:border-border-hover"
                            )}
                          >
                            <h5 className={cn("text-sm font-bold mb-1", useAppStore.getState().voiceState.settings?.inputMode === mode.id ? "text-accent" : "text-text-primary")}>{mode.name}</h5>
                            <p className="text-[11px] text-text-muted leading-relaxed">{mode.desc}</p>
                            {useAppStore.getState().voiceState.settings?.inputMode === mode.id && (
                              <div className="absolute top-3 right-3 w-4 h-4 bg-accent rounded-full flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-surface-2 border border-border rounded-xl p-6 space-y-8 shadow-sm">
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="text-sm font-bold text-text-primary">Voice Processing</h5>
                            <p className="text-[11px] text-text-muted mt-1">Advanced signal enhancement technologies.</p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {[
                            { id: 'noiseSuppression', label: 'Noise Suppression', desc: 'Eliminate background static and ambient noise.' },
                            { id: 'echoCancellation', label: 'Echo Cancellation', desc: 'Prevent your speakers from being picked up by your mic.' },
                          ].map(opt => (
                            <div key={opt.id} className="flex items-center justify-between group">
                              <div className="flex flex-col">
                                <span className="text-[13px] font-bold text-text-secondary group-hover:text-text-primary transition-colors">{opt.label}</span>
                                <span className="text-[11px] text-text-muted">{opt.desc}</span>
                              </div>
                              <button 
                                onClick={() => useAppStore.getState().updateVoiceSettings({ [opt.id]: !((useAppStore.getState().voiceState.settings as any)?.[opt.id]) })}
                                className={cn(
                                  "w-11 h-6 rounded-full relative transition-all duration-300",
                                  (useAppStore.getState().voiceState.settings as any)?.[opt.id] ? "bg-success" : "bg-surface-4"
                                )}
                              >
                                <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md", (useAppStore.getState().voiceState.settings as any)?.[opt.id] ? "left-6" : "left-1")} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="h-px bg-border/40" />

                      <div className="space-y-6">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest">Input Sensitivity</label>
                          <span className="text-[11px] font-black text-accent">{useAppStore.getState().voiceState.settings?.inputSensitivity}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" max="100" 
                          value={useAppStore.getState().voiceState.settings?.inputSensitivity}
                          onChange={(e) => useAppStore.getState().updateVoiceSettings({ inputSensitivity: parseInt(e.target.value) })}
                          className="w-full accent-accent h-1.5 bg-surface-4 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between px-1">
                          <span className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">Quiet</span>
                          <span className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">Loud</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Keybinds Tab ── */}
                {activeTab === 'keybinds' && (
                  <div className="space-y-6 animate-fade-in-up">
                    <h3 className="text-lg font-bold text-text-primary mb-4">Keybinds</h3>
                    <div className="bg-surface-2 border border-border rounded-xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-surface-3/50 border-b border-border">
                          <tr>
                            <th className="px-4 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest w-1/2">Action</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Shortcut</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {[
                            { action: 'Search / Spotlight', keys: ['Ctrl', 'K'] },
                            { action: 'Quick Settings', keys: ['Ctrl', ','] },
                            { action: 'Close Modal', keys: ['Esc'] },
                            { action: 'Toggle Mute', keys: ['Ctrl', 'Shift', 'M'] },
                            { action: 'Toggle Deafen', keys: ['Ctrl', 'Shift', 'D'] },
                          ].map((kb, i) => (
                            <tr key={i} className="hover:bg-surface-3/30 transition-colors">
                              <td className="px-4 py-3 text-sm font-medium text-text-secondary">{kb.action}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  {kb.keys.map(k => (
                                    <kbd key={k} className="px-2 py-1 bg-surface-3 border border-border rounded-md text-[11px] font-mono font-bold text-text-primary shadow-sm">{k}</kbd>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === 'language' && (
                  <div className="space-y-6 animate-fade-in-up">
                    <div>
                      <h3 className="text-lg font-bold text-text-primary mb-1">Language</h3>
                      <p className="text-xs text-text-muted">Choose the interface language for this client.</p>
                    </div>
                    <div className="space-y-2">
                      {([
                        { code: 'en', label: 'English', native: 'English' },
                        { code: 'es', label: 'Spanish', native: 'Español' },
                        { code: 'fr', label: 'French', native: 'Français' },
                        { code: 'de', label: 'German', native: 'Deutsch' },
                        { code: 'ja', label: 'Japanese', native: '日本語' },
                        { code: 'pt', label: 'Portuguese', native: 'Português' },
                      ] as const).map(lang => (
                        <button
                          key={lang.code}
                          onClick={() => setLocale(lang.code)}
                          className={cn(
                            "w-full flex items-center justify-between px-5 py-3.5 rounded-xl border transition-all text-left",
                            locale === lang.code
                              ? "bg-accent/5 border-accent text-white"
                              : "bg-surface-2 border-border hover:border-border-hover text-text-primary"
                          )}
                        >
                          <div>
                            <span className="text-sm font-bold">{lang.label}</span>
                            <span className="ml-3 text-xs text-text-muted">{lang.native}</span>
                          </div>
                          {locale === lang.code && (
                            <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-text-muted font-medium uppercase tracking-tight opacity-60">
                      Full localization will apply after page refresh. Currently a UI preview.
                    </p>
                  </div>
                )}

                {/* ── Fallback for unimplemented tabs ── */}
                {!['account', 'profile', 'appearance', 'privacy', 'notifications', 'keybinds', 'voice', 'language'].includes(activeTab) && (
                  <div className="h-full flex flex-col items-center justify-center text-text-muted animate-fade-in-up py-20">
                    <Monitor size={40} className="mb-4 opacity-20" />
                    <p className="text-base font-medium text-text-tertiary">Coming soon</p>
                    <p className="text-sm mt-1.5 max-w-sm text-center text-text-muted">This section is under development.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
