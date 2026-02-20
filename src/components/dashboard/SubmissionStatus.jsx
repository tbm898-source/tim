import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FileText, Briefcase, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export default function SubmissionStatus({ assignmentSubmissions, projectSubmissions, assignments, projects }) {
    const getStatusColor = (status) => {
        const colors = {
            draft: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
            submitted: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
            graded: 'bg-green-500/20 text-green-400 border-green-500/50',
            needs_revision: 'bg-orange-500/20 text-orange-400 border-orange-500/50'
        };
        return colors[status] || colors.draft;
    };

    const assignmentStats = {
        total: assignments.length,
        submitted: assignmentSubmissions.filter(s => s.status === 'submitted' || s.status === 'graded').length,
        graded: assignmentSubmissions.filter(s => s.status === 'graded').length,
        pending: assignmentSubmissions.filter(s => s.status === 'submitted').length,
        needsRevision: assignmentSubmissions.filter(s => s.status === 'needs_revision').length
    };

    const projectStats = {
        total: projects.length,
        submitted: projectSubmissions.filter(s => s.status === 'submitted' || s.status === 'graded').length,
        graded: projectSubmissions.filter(s => s.status === 'graded').length,
        pending: projectSubmissions.filter(s => s.status === 'submitted').length,
        needsRevision: projectSubmissions.filter(s => s.status === 'needs_revision').length
    };

    const completionRate = assignmentStats.total > 0 
        ? (assignmentStats.submitted / assignmentStats.total) * 100 
        : 0;

    return (
        <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gray-900/50 border-cyan-500/30">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-cyan-500/20 rounded-lg">
                                <FileText className="h-5 w-5 text-cyan-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Assignments</p>
                                <p className="text-2xl font-bold text-white">
                                    {assignmentStats.submitted}/{assignmentStats.total}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-cyan-500/30">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500/20 rounded-lg">
                                <Briefcase className="h-5 w-5 text-purple-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Projects</p>
                                <p className="text-2xl font-bold text-white">
                                    {projectStats.submitted}/{projectStats.total}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-cyan-500/30">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500/20 rounded-lg">
                                <CheckCircle2 className="h-5 w-5 text-green-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Graded</p>
                                <p className="text-2xl font-bold text-white">
                                    {assignmentStats.graded + projectStats.graded}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Completion Progress */}
            <Card className="bg-gray-900/50 border-cyan-500/30">
                <CardHeader>
                    <CardTitle className="text-white text-lg">Submission Progress</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Overall Completion</span>
                            <span className="text-cyan-400 font-mono">{completionRate.toFixed(0)}%</span>
                        </div>
                        <Progress value={completionRate} className="h-2" />
                    </div>
                </CardContent>
            </Card>

            {/* Recent Submissions */}
            <Card className="bg-gray-900/50 border-cyan-500/30">
                <CardHeader>
                    <CardTitle className="text-white text-lg">Recent Submissions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {assignmentSubmissions
                        .sort((a, b) => new Date(b.submitted_date || 0) - new Date(a.submitted_date || 0))
                        .slice(0, 5)
                        .map(sub => {
                            const assignment = assignments.find(a => a.id === sub.assignment_id);
                            return (
                                <div key={sub.id} className="flex items-center justify-between p-2 bg-gray-800/30 rounded">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-cyan-400" />
                                        <span className="text-sm text-white">{assignment?.title || 'Assignment'}</span>
                                    </div>
                                    <Badge className={getStatusColor(sub.status)}>
                                        {sub.status}
                                    </Badge>
                                </div>
                            );
                        })}

                    {assignmentSubmissions.length === 0 && (
                        <p className="text-center text-gray-500 py-4">No submissions yet</p>
                    )}
                </CardContent>
            </Card>

            {/* Pending Items */}
            {(assignmentStats.pending > 0 || assignmentStats.needsRevision > 0) && (
                <Card className="bg-orange-500/10 border-orange-500/30">
                    <CardContent className="py-4">
                        <div className="flex items-start gap-3">
                            {assignmentStats.pending > 0 ? (
                                <>
                                    <Clock className="h-5 w-5 text-orange-400 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-orange-400">
                                            {assignmentStats.pending} submission{assignmentStats.pending > 1 ? 's' : ''} awaiting grade
                                        </p>
                                        <p className="text-xs text-gray-300">Your work is being reviewed by the instructor</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <AlertTriangle className="h-5 w-5 text-orange-400 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-orange-400">
                                            {assignmentStats.needsRevision} item{assignmentStats.needsRevision > 1 ? 's' : ''} need{assignmentStats.needsRevision === 1 ? 's' : ''} revision
                                        </p>
                                        <p className="text-xs text-gray-300">Review feedback and resubmit your work</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}