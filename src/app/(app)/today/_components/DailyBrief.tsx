'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';

interface DailyBriefProps {
  summary: string;
  isAllGood?: boolean;
}

/**
 * DailyBrief - Hero section with natural language summary
 * Shows the most important insight of the day in plain language
 */
export function DailyBrief({ summary, isAllGood = false }: DailyBriefProps) {
  const { t } = useLanguage();

  return (
    <Card className="shadow-xl border-0 overflow-hidden relative">
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${
        isAllGood
          ? 'from-green-50/60 via-green-50/10 to-transparent dark:from-green-950/10 dark:via-green-950/5 dark:to-transparent'
          : 'from-blue-50/60 via-blue-50/10 to-transparent dark:from-blue-950/10 dark:via-blue-950/5 dark:to-transparent'
      }`} />

      <CardContent className="relative pt-8 pb-8 px-6 sm:px-8">
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${
            isAllGood
              ? 'bg-gradient-to-br from-success to-success/80'
              : 'bg-gradient-to-br from-primary to-primary/80'
          } shadow-lg`}>
            {isAllGood ? (
              <CheckCircle2 className="w-6 h-6 text-white" />
            ) : (
              <Sparkles className="w-6 h-6 text-white" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
              {t('today.brief.greeting') || 'Cocorico, Nico!'}
            </h3>
            <div className="text-base sm:text-lg text-foreground leading-relaxed space-y-3 whitespace-pre-wrap">
              {summary.split('\n\n').map((paragraph, idx) => {
                // Convert **bold** markdown to actual bold
                const parts = paragraph.split(/(\*\*[^*]+\*\*)/g);
                return (
                  <p key={idx} className="leading-relaxed">
                    {parts.map((part, partIdx) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={partIdx} className="font-semibold">{part.slice(2, -2)}</strong>;
                      }
                      return part;
                    })}
                  </p>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
