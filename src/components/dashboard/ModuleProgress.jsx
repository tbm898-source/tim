import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';

export default function ModuleProgress({ modules, userProgress, courses }) {
    const getModuleProgress = (moduleId) => {
        const moduleProgress = userProgress.filter(p => p.module_id === moduleId);
        const completed = moduleProgress.filter(p => p.completed).length;
        const total = moduleProgress.length;
        const percentage = total > 0 ? (completed / total) * 100 : 0;

        const quizScores = moduleProgress.filter(p => p.quiz_score !== undefined);
        const avgScore = quizScores.length > 0 
            ? quizScores.reduce((sum, p) => sum + p.quiz_score, 0) / quizScores.length 
            : null;

        return { completed, total, percentage, avgScore };
    };

    const getStatusIcon = (percentage) => {
        if (percentage === 100) return <CheckCircle2 className="h-5 w-5 text-green-400" />;
        if (percentage > 0) return <Circle className="h-5 w-5 text-yellow-400 fill-yellow-400/20" />;
        return <Circle className="h-5 w-5 text-gray-500" />;
    };

    const getPerformanceBadge = (avgScore) => {
        if (avgScore === null) return null;
        if (avgScore >= 90) return <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Excellent</Badge>;
        if (avgScore >= 80) return <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">Good</Badge>;
        if (avgScore >= 70) return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">Fair</Badge>;
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50">Needs Review</Badge>;
    };

    return (
        <div className="space-y-4">
            {modules.map(module => {
                const progress = getModuleProgress(module.id);
                const course = courses.find(c => c.id === module.course_id);

                return (
                    <Card key={module.id} className="bg-gray-900/50 border-cyan-500/30 backdrop-blur-sm">
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3 flex-1">
                                    {getStatusIcon(progress.percentage)}
                                    <div className="flex-1">
                                        <CardTitle className="text-lg text-white mb-1">
                                            Week {module.module_number}: {module.title}
                                        </CardTitle>
                                        {course && (
                                            <p className="text-sm text-gray-400">{course.title}</p>
                                        )}
                                        {module.topics && (
                                            <p className="text-sm text-gray-500 mt-1">{module.topics}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    {getPerformanceBadge(progress.avgScore)}
                                    {progress.avgScore !== null && (
                                        <span className="text-sm text-gray-400">
                                            Avg: {progress.avgScore.toFixed(0)}%
                                        </span>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">
                                        Progress: {progress.completed}/{progress.total} lessons
                                    </span>
                                    <span className="text-cyan-400 font-mono">
                                        {progress.percentage.toFixed(0)}%
                                    </span>
                                </div>
                                <Progress value={progress.percentage} className="h-2" />
                                
                                {progress.avgScore !== null && progress.avgScore < 70 && (
                                    <div className="flex items-start gap-2 mt-3 p-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                                        <AlertCircle className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
                                        <p className="text-xs text-orange-300">
                                            This module may need additional review. Consider revisiting the material or requesting help.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}