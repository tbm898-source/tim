import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Target, TrendingUp, AlertTriangle, CheckCircle2, BookOpen, Clock } from 'lucide-react';

export default function MyLearningPath() {
    const [user, setUser] = useState(null);
    const [student, setStudent] = useState(null);
    const [pathways, setPathways] = useState([]);
    const [modules, setModules] = useState([]);
    const [lessons, setLessons] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const currentUser = await base44.auth.me();
            setUser(currentUser);

            const studentData = await base44.entities.Student.filter({ user_email: currentUser.email });
            if (studentData.length > 0) {
                const studentRecord = studentData[0];
                setStudent(studentRecord);

                const [pathwaysData, modulesData, lessonsData] = await Promise.all([
                    base44.entities.LearningPathway.filter({ 
                        student_id: studentRecord.id,
                        status: 'active'
                    }),
                    base44.entities.Module.list(),
                    base44.entities.Lesson.list()
                ]);

                setPathways(pathwaysData);
                setModules(modulesData);
                setLessons(lessonsData);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getSeverityColor = (severity) => {
        const colors = {
            low: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
            medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
            high: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
            critical: 'bg-red-500/20 text-red-400 border-red-500/50'
        };
        return colors[severity] || colors.medium;
    };

    const getSeverityIcon = (severity) => {
        if (severity === 'critical' || severity === 'high') {
            return <AlertTriangle className="h-4 w-4" />;
        }
        return <Target className="h-4 w-4" />;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900">
                <Loader2 className="h-12 w-12 text-cyan-400 animate-spin" />
            </div>
        );
    }

    if (!student || pathways.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 p-6">
                <div className="max-w-5xl mx-auto">
                    <h1 className="text-4xl font-bold text-cyan-300 mb-6">My Learning Path</h1>
                    <Card className="bg-gray-900/50 border-cyan-500/30">
                        <CardContent className="py-16 text-center">
                            <Target className="h-16 w-16 text-cyan-400/30 mx-auto mb-4" />
                            <p className="text-gray-400">No personalized learning pathway has been generated yet.</p>
                            <p className="text-gray-500 text-sm mt-2">Your instructor will create one based on your progress.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    const activePathway = pathways[0];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 text-white p-6">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-cyan-300 mb-2">My Learning Path</h1>
                    <p className="text-gray-400">Your personalized pathway to success</p>
                </div>

                {/* Performance Snapshot */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card className="bg-gray-900/50 border-cyan-500/30">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-500/20 rounded-lg">
                                    <CheckCircle2 className="h-5 w-5 text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Completion</p>
                                    <p className="text-xl font-bold text-white">
                                        {activePathway.performance_metrics?.completion_rate?.toFixed(0) || 0}%
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gray-900/50 border-cyan-500/30">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-cyan-500/20 rounded-lg">
                                    <TrendingUp className="h-5 w-5 text-cyan-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Avg Quiz Score</p>
                                    <p className="text-xl font-bold text-white">
                                        {activePathway.performance_metrics?.avg_quiz_score?.toFixed(0) || 0}%
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gray-900/50 border-cyan-500/30">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-500/20 rounded-lg">
                                    <Target className="h-5 w-5 text-green-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Assignment Avg</p>
                                    <p className="text-xl font-bold text-white">
                                        {activePathway.performance_metrics?.avg_assignment_grade?.toFixed(0) || 0}%
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gray-900/50 border-cyan-500/30">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-500/20 rounded-lg">
                                    <Clock className="h-5 w-5 text-orange-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Time Invested</p>
                                    <p className="text-xl font-bold text-white">
                                        {activePathway.performance_metrics?.time_on_task_hours?.toFixed(0) || 0}h
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Pathway Title & Summary */}
                <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30 mb-6">
                    <CardHeader>
                        <CardTitle className="text-white text-2xl">{activePathway.pathway_title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-300 leading-relaxed">{activePathway.analysis_summary}</p>
                        <p className="text-xs text-gray-500 mt-3">
                            Last updated: {new Date(activePathway.last_updated).toLocaleDateString()}
                        </p>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Strengths */}
                    <Card className="bg-gray-900/50 border-green-500/30">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-400" />
                                Your Strengths
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2">
                                {activePathway.strengths?.map((strength, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                        <span className="text-green-400 mt-1">✓</span>
                                        <span className="text-gray-300 text-sm">{strength}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>

                    {/* Learning Gaps */}
                    <Card className="bg-gray-900/50 border-orange-500/30">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Target className="h-5 w-5 text-orange-400" />
                                Areas for Growth
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {activePathway.identified_gaps?.map((gap, idx) => (
                                    <div key={idx} className="bg-gray-800/30 p-3 rounded">
                                        <div className="flex items-start justify-between mb-1">
                                            <span className="text-white font-medium text-sm">{gap.topic}</span>
                                            <Badge className={getSeverityColor(gap.severity)}>
                                                {gap.severity}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-gray-400">{gap.evidence}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Recommended Learning Path */}
                <Card className="bg-gray-900/50 border-cyan-500/30 mt-6">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-cyan-400" />
                            Your Recommended Learning Path
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {activePathway.recommended_content
                                ?.sort((a, b) => a.priority - b.priority)
                                .map((content, idx) => (
                                    <div key={idx} className="bg-gray-800/30 p-4 rounded border-l-4 border-cyan-500">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-sm">
                                                    {content.priority}
                                                </div>
                                                <div>
                                                    <h4 className="text-white font-medium">{content.content_title}</h4>
                                                    <Badge variant="outline" className="text-xs mt-1">
                                                        {content.content_type}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <span className="text-xs text-gray-400">
                                                ~{content.estimated_time_hours}h
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-300 ml-11">{content.reason}</p>
                                    </div>
                                ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Milestones */}
                <Card className="bg-gray-900/50 border-purple-500/30 mt-6">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Target className="h-5 w-5 text-purple-400" />
                            Learning Milestones
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {activePathway.next_milestones?.map((milestone, idx) => (
                                <div key={idx} className="bg-gray-800/30 p-4 rounded">
                                    <div className="flex items-start justify-between mb-2">
                                        <h4 className="text-white font-medium">{milestone.milestone}</h4>
                                        <span className="text-xs text-purple-400">
                                            {new Date(milestone.target_date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-400">
                                        <span className="font-semibold text-gray-300">Success Criteria:</span> {milestone.success_criteria}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}