import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, CheckSquare, Clock, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

const priorityColor = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const statusIcon = {
    scheduled: <Clock className="w-4 h-4 text-cyan-400" />,
    in_progress: <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />,
    completed: <CheckCircle2 className="w-4 h-4 text-green-400" />,
    cancelled: <XCircle className="w-4 h-4 text-gray-400" />,
    overdue: <AlertCircle className="w-4 h-4 text-red-400" />,
};

export default function TaskListPanel() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState(null);
    const [error, setError] = useState(null);

    const loadTasks = async () => {
        setLoading(true);
        setError(null);
        try {
            const all = await base44.entities.MaintenanceTask.list('-updated_date', 50);
            setTasks(all);
        } catch (loadError) {
            console.error('Unable to load maintenance tasks:', loadError);
            setError('The work queue is unavailable right now.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadTasks(); }, []);

    const handleSync = async () => {
        setSyncing(true);
        setSyncResult(null);
        try {
            const res = await base44.functions.invoke('syncClickUpTasks', {});
            setSyncResult(res.data);
            await loadTasks();
        } catch (syncError) {
            console.error('Unable to sync ClickUp tasks:', syncError);
            setSyncResult({ ok: false, error: 'ClickUp sync failed. Check the connector and try again.' });
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-cyan-400" />
                    <span className="text-cyan-300 font-semibold">Task List</span>
                    <span className="text-gray-500 text-sm">({tasks.length})</span>
                </div>
                <Button
                    size="sm"
                    onClick={handleSync}
                    disabled={syncing}
                    className="bg-cyan-700 hover:bg-cyan-600 text-white"
                >
                    {syncing
                        ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Syncing...</>
                        : <><RefreshCw className="w-3 h-3 mr-1" />Sync ClickUp</>
                    }
                </Button>
            </div>

            {/* Sync result */}
            {syncResult && (
                <div className={`text-xs px-3 py-2 rounded border ${syncResult.ok ? 'bg-green-900/30 border-green-500/30 text-green-400' : 'bg-red-900/30 border-red-500/30 text-red-400'}`}>
                    {syncResult.ok
                        ? `✓ Synced from ${syncResult.synced_from} — ${syncResult.created} created, ${syncResult.updated} updated`
                        : `✗ ${syncResult.error}`
                    }
                </div>
            )}

            {/* Task list */}
            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                </div>
            ) : error ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-6 text-center">
                    <p className="text-sm text-amber-100">{error}</p>
                    <Button type="button" variant="outline" size="sm" onClick={loadTasks} className="mt-3 border-amber-400/30 text-amber-100 hover:bg-amber-400/10">Try again</Button>
                </div>
            ) : tasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                    No tasks yet. Click "Sync ClickUp" to import tasks.
                </div>
            ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {tasks.map(task => (
                        <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                            <div className="mt-0.5">{statusIcon[task.status] || statusIcon.scheduled}</div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">{task.title}</p>
                                {task.assigned_to && (
                                    <p className="text-xs text-gray-500 mt-0.5">{task.assigned_to}</p>
                                )}
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                                <Badge className={`text-xs border ${priorityColor[task.priority] || priorityColor.medium}`}>
                                    {task.priority}
                                </Badge>
                                {task.due_date && (
                                    <span className="text-xs text-gray-500">{task.due_date}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
