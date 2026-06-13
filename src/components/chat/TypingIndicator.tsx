import React from 'react';

interface TypingIndicatorProps {
  usernames: string[];
}

export function TypingIndicator({ usernames }: TypingIndicatorProps) {
  if (usernames.length === 0) return null;

  const text = usernames.length === 1
    ? `${usernames[0]} is typing`
    : usernames.length === 2
    ? `${usernames[0]} and ${usernames[1]} are typing`
    : `${usernames[0]} and ${usernames.length - 1} others are typing`;

  return (
    <div className="flex items-center gap-2 px-6 py-1.5 text-xs text-text-tertiary font-medium">
      <div className="flex items-center gap-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1s' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1s' }} />
      </div>
      <span>{text}</span>
    </div>
  );
}
