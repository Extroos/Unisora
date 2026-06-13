import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Button } from './ui/Button';
import { User, ArrowRight, Camera } from 'lucide-react';

export function OnboardingScreen() {
  const { currentUser, completeOnboarding } = useAppStore();
  const [username, setUsername] = useState(currentUser?.username || '');
  const [tag, setTag] = useState(currentUser?.tag || '');
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser?.avatarUrl || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setSelectedAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Username is required.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await completeOnboarding(username.trim(), tag.trim(), selectedAvatar);
      if (!res.success) {
        setError(res.error || 'Failed to finish profile setup.');
        setLoading(false);
      }
    } catch (err) {
      setError('An error occurred during profile setup.');
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-surface-0 font-sans select-none relative overflow-hidden">
      <div className="w-full max-w-[340px] px-4 z-10">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-2xl font-black text-text-primary tracking-wide uppercase">
            Create Profile
          </h1>
          <p className="text-xs text-text-tertiary mt-2 text-center">
            Set your username and avatar for Unisora
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-md text-xs font-semibold text-danger text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Selector */}
          <div className="flex flex-col items-center space-y-3">
            <div className="relative">
              <img 
                src={selectedAvatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=default'} 
                alt="Selected avatar" 
                className="w-20 h-20 rounded-2xl border border-border bg-surface-2 object-cover shadow-lg"
              />
              <input
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/gif"
                id="onboarding-avatar-file"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
              <label
                htmlFor="onboarding-avatar-file"
                className="absolute -bottom-1 -right-1 p-2 bg-accent hover:bg-accent/80 rounded-xl border border-surface-0 text-white cursor-pointer shadow-md transition-all flex items-center justify-center"
              >
                <Camera size={14} />
              </label>
            </div>
            
            <div className="text-center">
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">
                Upload PNG, JPG, or GIF
              </span>
            </div>
          </div>

          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider pl-0.5">Username</label>
            <div className="relative">
              <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="w-full bg-surface-1 border border-border rounded-md py-2 pl-9 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors font-sans"
                required
              />
            </div>
          </div>

          {/* Tag Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider pl-0.5">Tag</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-text-muted">#</span>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder={currentUser?.email?.toLowerCase() === 'abderrahmanchakkouri@gmail.com' ? 'NULL' : '5050'}
                maxLength={currentUser?.email?.toLowerCase() === 'abderrahmanchakkouri@gmail.com' ? 12 : 4}
                className="w-full bg-surface-1 border border-border rounded-md py-2 pl-7 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors font-mono"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full h-9 rounded-md bg-accent hover:bg-accent-hover text-white font-semibold text-xs border-none"
            loading={loading}
            icon={<ArrowRight size={13} />}
          >
            Start Using Unisora
          </Button>
        </form>
      </div>
    </div>
  );
}
