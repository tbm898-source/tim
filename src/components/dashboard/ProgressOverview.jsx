import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BookOpen, CheckCircle2, Clock, TrendingUp } from 'lucide-react';

export default function ProgressOverview({ courses, modules, userProgress }) {
    const totalLessons = userProgress.length;
    const completedLessons = userProgress.filter(p => p.completed).length;
    const completionRate = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

    const totalTimeSpent = userProgress.reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0);
    const totalHours = Math.floor(totalTimeSpent / 3600);
    const totalMinutes = Math.floor((totalTimeSpent % 3600) / 60);

    const quizScores = userProgress.filter(p => p.quiz_score !== undefined && p.quiz_score !== null);
    const avgQuizScore = quizScores.length > 0 
        ? quizScores.reduce((sum, p) => sum + p.quiz_score, 0) / quizScores.length 
        : 0;

    const stats = [
        {
            title: 'Lessons Completed',
            value: `${completedLessons}/${totalLessons}`,
            icon: CheckCircle2,
            color: 'text-green-400',
            bgColor: 'bg-green-500/10',
            progress: completionRate
        },
        {
            title: 'Total Time Invested',
            value: `${totalHours}h ${totalMinutes}m`,
            icon: Clock,
            color: 'text-blue-400',
            bgColor: 'bg-blue-500/10'
        },
        {
            title: 'Average Quiz Score',
            value: `${avgQuizScore.toFixed(1)}%`,
            icon: TrendingUp,
            color: avgQuizScore >= 80 ? 'text-cyan-400' : avgQuizScore >= 60 ? 'text-yellow-400' : 'text-orange-400',
            bgColor: avgQuizScore >= 80 ? 'bg-cyan-500/10' : avgQuizScore >= 60 ? 'bg-yellow-500/10' : 'bg-orange-500/10'
        },
        {
            title: 'Active Modules',
            value: modules.length,
            icon: BookOpen,
            color: 'text-purple-400',
            bgColor: 'bg-purple-500/10'
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                    <Card key={index} className="bg-gray-900/50 border-cyan-500/30 backdrop-blur-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-400">
                                {stat.title}
                            </CardTitle>
                            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                                <Icon className={`h-4 w-4 ${stat.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white mb-2">{stat.value}</div>
                            {stat.progress !== undefined && (
                                <Progress 
                                    value={stat.progress} 
                                    className="h-2"
                                />
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}