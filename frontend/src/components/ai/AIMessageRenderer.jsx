import React from 'react';
import {
  MapPin,
  Car,
  Bed,
  Calendar,
  Wallet,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info,
  ChevronRight,
  ArrowRight
} from 'lucide-react';

/**
 * Helper to render inline markdown: **bold**, *italic*, `code`, and links
 */
const renderInlineMarkdown = (text) => {
  if (!text || typeof text !== 'string') return text;

  // Split by inline markdown tokens: **bold**, `code`, *italic*
  const tokens = [];
  let remaining = text;
  let keyIdx = 0;

  // Regex to match **bold**, `code`, or *italic*
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let match;
  let lastIndex = 0;

  while ((match = pattern.exec(remaining)) !== null) {
    // Add preceding text
    if (match.index > lastIndex) {
      tokens.push(remaining.substring(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      const content = token.slice(2, -2);
      tokens.push(
        <strong key={`b-${keyIdx++}`} className="font-extrabold text-[#17324D] dark:text-white">
          {content}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      const content = token.slice(1, -1);
      tokens.push(
        <code key={`c-${keyIdx++}`} className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 text-[#087F8C] dark:text-teal-300 font-mono text-[11px] border border-slate-200/60 dark:border-white/5">
          {content}
        </code>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      const content = token.slice(1, -1);
      tokens.push(
        <em key={`i-${keyIdx++}`} className="italic text-slate-700 dark:text-slate-300">
          {content}
        </em>
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < remaining.length) {
    tokens.push(remaining.substring(lastIndex));
  }

  return tokens.length > 0 ? tokens : text;
};

/**
 * AIMessageRenderer parses and formats multi-line AI responses with rich cards,
 * badges, icons, headings, and clean spacing.
 */
export const AIMessageRenderer = ({ text = '', onQuickSelect = null }) => {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      // Empty line -> spacing
      elements.push(<div key={`sp-${i}`} className="h-2" />);
      continue;
    }

    // 1. Alert / No-Availability Banner (e.g. "**No available Voyara stays in ...**" or "**Stay Found – Rooms Currently Unavailable**")
    if (
      trimmed.includes('No available Voyara stays') ||
      trimmed.includes('No available stays') ||
      trimmed.includes('Rooms Currently Unavailable') ||
      trimmed.includes('No Voyara stays found')
    ) {
      const cleanTitle = trimmed.replace(/\*\*/g, '').replace(/^[#\s]+/, '');
      elements.push(
        <div
          key={`alert-${i}`}
          className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 dark:border-amber-400/20 text-amber-900 dark:text-amber-200 flex items-start space-x-3 my-2"
        >
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-extrabold text-xs sm:text-sm text-amber-900 dark:text-amber-100">
              {cleanTitle}
            </h4>
          </div>
        </div>
      );
      continue;
    }

    // 2. Recommended For You Header Pill (e.g. "⭐ **RECOMMENDED FOR YOU**")
    if (trimmed.includes('RECOMMENDED FOR YOU') || trimmed.includes('⭐ RECOMMENDED')) {
      elements.push(
        <div key={`rec-${i}`} className="pt-2 pb-1">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-extrabold text-[10px] uppercase tracking-wider shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Recommended For You</span>
          </span>
        </div>
      );
      continue;
    }

    // 3. Other Nearby Options Header (e.g. "🏨 **OTHER NEARBY OPTIONS**" or "**We found these available stays nearby:**")
    if (
      trimmed.includes('OTHER NEARBY OPTIONS') ||
      trimmed.includes('We found these available stays nearby') ||
      trimmed.includes('Nearby Available Stays')
    ) {
      const cleanTitle = trimmed.replace(/\*\*/g, '').replace(/^[#\s]+/, '');
      elements.push(
        <div key={`nearby-hdr-${i}`} className="pt-3 pb-1 border-t border-slate-100 dark:border-white/5">
          <div className="flex items-center space-x-2 text-[#087F8C] dark:text-teal-400 font-extrabold text-xs uppercase tracking-wider">
            <MapPin className="w-3.5 h-3.5" />
            <span>{cleanTitle}</span>
          </div>
        </div>
      );
      continue;
    }

    // 4. Stay Option Bullet Item (e.g. "• **Option 2: Peermade Valley Resort** (Peermade · 16.1 km...)")
    if (trimmed.startsWith('• **Option') || trimmed.startsWith('- **Option') || trimmed.startsWith('**Option')) {
      const optMatch = trimmed.match(/(?:•|-|\*|)\s*\*\*Option\s*(\d+):\s*([^*]+)\*\*\s*(?:\(([^)]+)\))?/i);
      if (optMatch) {
        const optNum = optMatch[1];
        const propName = optMatch[2];
        const metaInfo = optMatch[3] || '';

        elements.push(
          <div
            key={`opt-${i}`}
            className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 shadow-2xs space-y-1.5 my-2 hover:border-[#087F8C] dark:hover:border-teal-400 transition"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-[#087F8C] dark:text-teal-300 font-bold font-mono text-[10px] border border-teal-200/60 dark:border-teal-800/40">
                  Option #{optNum}
                </span>
                <span className="font-extrabold text-xs sm:text-sm text-[#17324D] dark:text-white">
                  {propName}
                </span>
              </div>
            </div>
            {metaInfo && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                <MapPin className="w-3 h-3 text-[#087F8C] shrink-0" />
                <span>{metaInfo}</span>
              </div>
            )}
          </div>
        );
        continue;
      }
    }

    // 5. Structured metadata lines with Emojis (📍 Location, 🚗 Travel time, 🛏️ Room, 📅 Dates, 💰 Price, 🛡️ Verification)
    if (
      trimmed.startsWith('📍') ||
      trimmed.startsWith('🚗') ||
      trimmed.startsWith('🛏️') ||
      trimmed.startsWith('📅') ||
      trimmed.startsWith('💰') ||
      trimmed.startsWith('🛡️')
    ) {
      // Split by bullet/dot separator if multiple chips in single line
      const parts = trimmed.split(/\s*·\s*/);

      elements.push(
        <div key={`meta-${i}`} className="flex flex-wrap items-center gap-1.5 my-1 text-xs">
          {parts.map((part, pIdx) => {
            const pTrim = part.trim();
            let icon = null;
            let badgeStyle = 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border-slate-200/60 dark:border-white/5';

            if (pTrim.startsWith('📍')) {
              icon = <MapPin className="w-3.5 h-3.5 text-[#087F8C]" />;
              badgeStyle = 'bg-teal-50 dark:bg-teal-950/50 text-[#087F8C] dark:text-teal-300 border-teal-200/50 dark:border-teal-800/40';
            } else if (pTrim.startsWith('🚗')) {
              icon = <Car className="w-3.5 h-3.5 text-slate-500" />;
            } else if (pTrim.startsWith('🛏️')) {
              icon = <Bed className="w-3.5 h-3.5 text-[#087F8C]" />;
            } else if (pTrim.startsWith('📅')) {
              icon = <Calendar className="w-3.5 h-3.5 text-slate-500" />;
            } else if (pTrim.startsWith('💰')) {
              icon = <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
              badgeStyle = 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-800/40';
            } else if (pTrim.startsWith('🛡️')) {
              icon = <ShieldCheck className="w-3.5 h-3.5 text-[#087F8C]" />;
              badgeStyle = 'bg-teal-50 dark:bg-teal-950/50 text-[#087F8C] dark:text-teal-300 border-teal-200/50 dark:border-teal-800/40';
            }

            // Remove starting emoji symbol for cleaner rendering
            const cleanContent = pTrim.replace(/^[📍🚗🛏️📅💰🛡️⭐🏨]+\s*/, '');

            return (
              <span
                key={`chip-${pIdx}`}
                className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold border ${badgeStyle}`}
              >
                {icon}
                <span>{renderInlineMarkdown(cleanContent)}</span>
              </span>
            );
          })}
        </div>
      );
      continue;
    }

    // 6. Action Guidance Box (e.g. "**Would you like to book one of these stays?**" or prompt options)
    if (
      trimmed.includes('Would you like to book') ||
      trimmed.includes('Would you like to confirm payment') ||
      trimmed.includes('Say **"Book the recommended stay"') ||
      trimmed.includes('Say "Book the recommended stay"') ||
      trimmed.includes('click one of the stay cards')
    ) {
      elements.push(
        <div
          key={`action-guide-${i}`}
          className="p-3 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-800/30 text-xs text-slate-800 dark:text-slate-200 my-2 space-y-1"
        >
          <div className="flex items-center space-x-1.5 font-bold text-[#087F8C] dark:text-teal-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next Steps</span>
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
            {renderInlineMarkdown(trimmed.replace(/^[•\-\*]\s*/, ''))}
          </div>
        </div>
      );
      continue;
    }

    // 7. General Bullet points (starting with •, -, or *)
    if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const bulletContent = trimmed.substring(2);
      elements.push(
        <div key={`bl-${i}`} className="flex items-start space-x-2 py-0.5 text-xs sm:text-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[#087F8C] dark:bg-teal-400 mt-2 shrink-0" />
          <div className="flex-1 leading-relaxed text-slate-700 dark:text-slate-200">
            {renderInlineMarkdown(bulletContent)}
          </div>
        </div>
      );
      continue;
    }

    // 8. General Headings (starting with ### or ## or bold heading at start)
    if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      const headingText = trimmed.replace(/^[#\s]+/, '');
      elements.push(
        <h3 key={`h-${i}`} className="font-extrabold text-sm sm:text-base text-[#17324D] dark:text-white pt-2 pb-1">
          {renderInlineMarkdown(headingText)}
        </h3>
      );
      continue;
    }

    // 9. Standard Paragraph with Markdown formatting
    elements.push(
      <p key={`p-${i}`} className="text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-100 font-medium my-0.5">
        {renderInlineMarkdown(trimmed)}
      </p>
    );
  }

  return <div className="space-y-1">{elements}</div>;
};

export default AIMessageRenderer;
