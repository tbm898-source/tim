import React from 'react';
import { Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export default function BridgeActivityLog({ logs, formatTimestamp }) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Bridge activity</h2>
        <Activity className="h-5 w-5 text-cyan-300" />
      </div>
      <Card className="border-white/10 bg-white/[0.04]"><CardContent className="p-0">
        {logs.length === 0 ? <div className="px-6 py-8 text-center text-sm text-slate-500">No authenticated bridge activity has been recorded.</div> : (
          <div className="divide-y divide-white/10">{logs.map((log) => (
            <div key={log.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0"><p className="truncate font-mono text-sm text-white">{log.action}</p><p className="mt-1 truncate text-xs text-slate-500">{log.node_id || 'System'} · {formatTimestamp(log.timestamp)}</p></div>
              <Badge variant="outline" className={log.success ? 'border-emerald-400/30 text-emerald-200' : 'border-red-400/30 text-red-200'}>{log.success ? 'success' : 'failed'}</Badge>
            </div>
          ))}</div>
        )}
      </CardContent></Card>
    </section>
  );
}