import React from 'react';
import { SlashCommand } from '../types';
import { useAppStore } from '../store/useAppStore';

export const COMMAND_REGISTRY: Record<string, SlashCommand> = {
  shrug: {
    name: 'shrug',
    description: 'Append ¯\\_(ツ)_/¯ to your message',
    execute: (args) => {
      return args.join(' ') + ' ¯\\_(ツ)_/¯';
    }
  },
  tableflip: {
    name: 'tableflip',
    description: 'Append (╯°□°）╯︵ ┻━┻ to your message',
    execute: (args) => {
      return args.join(' ') + ' (╯°□°）╯︵ ┻━┻';
    }
  },
  unflip: {
    name: 'unflip',
    description: 'Append ┬─┬ノ( º _ ºノ) to your message',
    execute: (args) => {
      return args.join(' ') + ' ┬─┬ノ( º _ ºノ)';
    }
  },
  me: {
    name: 'me',
    description: 'Italicize your message',
    usage: '/me <message>',
    execute: (args) => {
      return `*${args.join(' ')}*`;
    }
  },
  nick: {
    name: 'nick',
    description: 'Change your nickname for this session',
    usage: '/nick <new_name>',
    execute: (args) => {
      const newNick = args.join(' ');
      if (newNick) {
        useAppStore.getState().updateCurrentUser({ username: newNick });
        return ''; // Silent success
      }
      return 'Usage: /nick <new_name>';
    }
  },
  clear: {
    name: 'clear',
    description: 'Clear the chat (client-side only)',
    execute: () => {
      // This would need a way to talk to the chat area state, 
      // but for now we'll just return a placeholder or handle it in ChatArea.
      return '__CLEAR__';
    }
  },
  poll: {
    name: 'poll',
    description: 'Create an interactive poll',
    usage: '/poll "Question" "Option 1" "Option 2"',
    execute: (args) => {
      // Logic handled in ChatArea to create the poll object
      return '__POLL__';
    }
  },
  'webhook': {
    name: 'webhook',
    description: 'Manage channel webhooks',
    usage: '/webhook list | /webhook create <name>',
    execute: (args, context) => {
      return '__WEBHOOK__';
    }
  }
};

/**
 * Simple rich text renderer for basic markdown and slash command formatting.
 */
export function renderRichText(text: string): React.ReactNode {
  if (!text) return '';

  const codeBlockRegex = /```([\s\S]+?)```/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'codeblock', content: match[1] });
    lastIndex = codeBlockRegex.lastIndex;
  }
  
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return parts.map((part, idx) => {
    if (part.type === 'codeblock') {
      return (
        <div key={idx} className="my-2 rounded bg-surface-2 border border-border overflow-hidden font-mono shadow-sm">
          <div className="bg-surface-4 px-3 py-1 border-b border-border/40">
            <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Code Block</span>
          </div>
          <pre className="p-3 text-[12px] text-accent-light overflow-x-auto custom-scrollbar">
            <code>{part.content}</code>
          </pre>
        </div>
      );
    }

    // Handle basic inline markdown for the text part
    const inlineParts = part.content.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/);
    return inlineParts.map((inline, i) => {
      if (inline.startsWith('**') && inline.endsWith('**')) {
        return <strong key={`${idx}-${i}`} className="font-black text-white">{inline.slice(2, -2)}</strong>;
      }
      if (inline.startsWith('*') && inline.endsWith('*')) {
        return <em key={`${idx}-${i}`} className="italic text-text-primary">{inline.slice(1, -1)}</em>;
      }
      if (inline.startsWith('`') && inline.endsWith('`')) {
        return <code key={`${idx}-${i}`} className="px-1 py-0.5 rounded bg-surface-3 font-mono text-[11px] text-accent-light">{inline.slice(1, -1)}</code>;
      }
      return inline;
    });
  });
}
