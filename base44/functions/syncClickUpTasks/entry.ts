import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { accessToken } = await base44.asServiceRole.connectors.getConnection("clickup");

        // Get workspaces (teams)
        const teamsRes = await fetch('https://api.clickup.com/api/v2/team', {
            headers: { Authorization: accessToken }
        });
        const teamsData = await teamsRes.json();

        if (!teamsData.teams?.length) {
            return Response.json({ error: 'No ClickUp workspaces found' }, { status: 404 });
        }

        const teamId = teamsData.teams[0].id;

        // Get all tasks for the team
        const tasksRes = await fetch(
            `https://api.clickup.com/api/v2/team/${teamId}/task?subtasks=true&include_closed=false`,
            { headers: { Authorization: accessToken } }
        );
        const tasksData = await tasksRes.json();
        const clickupTasks = tasksData.tasks || [];

        // Get existing MaintenanceTasks with clickup_task_id
        const existing = await base44.asServiceRole.entities.MaintenanceTask.filter({});
        const existingByClickUpId = {};
        for (const t of existing) {
            if (t.clickup_task_id) existingByClickUpId[t.clickup_task_id] = t;
        }

        // Map ClickUp priority to MaintenanceTask priority
        const mapPriority = (p) => {
            if (!p) return 'medium';
            const name = (p.priority || p).toLowerCase();
            if (name === 'urgent') return 'critical';
            if (name === 'high') return 'high';
            if (name === 'normal' || name === 'medium') return 'medium';
            return 'low';
        };

        // Map ClickUp status to MaintenanceTask status
        const mapStatus = (s) => {
            if (!s) return 'scheduled';
            const name = (s.status || s).toLowerCase();
            if (name.includes('progress') || name.includes('doing')) return 'in_progress';
            if (name.includes('complete') || name.includes('done') || name.includes('closed')) return 'completed';
            if (name.includes('cancel')) return 'cancelled';
            return 'scheduled';
        };

        let created = 0;
        let updated = 0;

        for (const task of clickupTasks) {
            const taskData = {
                title: task.name,
                description: task.description || '',
                clickup_task_id: task.id,
                priority: mapPriority(task.priority),
                status: mapStatus(task.status),
                assigned_to: task.assignees?.[0]?.email || '',
                due_date: task.due_date ? new Date(parseInt(task.due_date)).toISOString().split('T')[0] : null,
                task_type: 'corrective',
            };

            if (existingByClickUpId[task.id]) {
                await base44.asServiceRole.entities.MaintenanceTask.update(
                    existingByClickUpId[task.id].id,
                    taskData
                );
                updated++;
            } else {
                await base44.asServiceRole.entities.MaintenanceTask.create({
                    ...taskData,
                    asset_id: 'clickup-sync',
                });
                created++;
            }
        }

        return Response.json({
            ok: true,
            synced_from: `ClickUp workspace: ${teamsData.teams[0].name}`,
            created,
            updated,
            total: clickupTasks.length
        });

    } catch (error) {
        console.error('ClickUp sync error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});