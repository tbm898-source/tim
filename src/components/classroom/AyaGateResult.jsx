import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

export default function AyaGateResult({ gateResult }) {
  if (!gateResult) return null;

  return (
    <div className="rounded-lg border border-gray-700 p-4 space-y-2">
      <div className="flex items-center gap-2">
        {gateResult.ok ? (
          <>
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            <Badge className="bg-green-500/20 text-green-300">Passed</Badge>
          </>
        ) : (
          <>
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            <Badge className="bg-amber-500/20 text-amber-300">Failed</Badge>
          </>
        )}
      </div>
      {!gateResult.ok &&
        gateResult.reasons.map((reason) => (
          <p key={reason} className="text-sm text-gray-300">
            — {reason}
          </p>
        ))}
    </div>
  );
}
