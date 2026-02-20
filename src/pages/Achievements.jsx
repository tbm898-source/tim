import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trophy, Flame, Star, Award, Target, Zap } from 'lucide-react';

export default function Achievements() {
    const [badges, setBadges] = useState([]);
    const [streak, setStreak] = useState(null);
    const [student, setStudent] = useState(null);
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const user = await base44.auth.me();
            const studentData = await base44.entities.Student.filter({ user_email: user.email });

            if (studentData.length > 0) {
                const studentRecord = studentData[0];
                setStudent(studentRecord);

                const [badgesData, streakData, progress, assignments, projects] = await Promise.all([
                    base44.entities.Badge.filter({ student_id: studentRecord.id }),
                    base44.entities.Streak.filter({ student_id: studentRecord.id }),
                    base44.entities.UserProgress.filter({ student_id: studentRecord.id }),
                    base44.entities.AssignmentSubmission.filter({ student_id: studentRecord.id }),
                    base44.entities.ProjectSubmission.filter({ student_id: studentRecord.id })
                ]);

                setBadges(badgesData);
                setStreak(streakData[0] || { current_streak: 0, longest_streak: 0 });

                // Calculate stats
                const completedLessons = progress.filter(p => p.completed).length;
                const perfectScores = progress.filter(p => p.quiz_score === 100).length;
                const gradedAssignments = assignments.filter(a => a.status === 'graded');
                const avgGrade = gradedAssignments.length > 0
                    ? gradedAssignments.reduce((sum, a) => sum + (a.grade || 0), 0) / gradedAssignments.length
                    : 0;

                setStats({
                    completedLessons,
                    perfectScores,
                    avgGrade: avgGrade.toFixed(0),
                    totalAssignments: gradedAssignments.length,
                    totalProjects: projects.filter(p => p.status === 'graded').length
                });
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getBadgeIcon = (type) => {
        const icons = {
            first_lesson: Star,
            quiz_master: Trophy,
            perfect_score: Award,
            week_streak: Flame,
            assignment_ace: Target,
            project_champion: Award,
            fast_learner: Zap,
            dedicated_student: Trophy,
            improvement_star: Star
        };
        return icons[type] || Award;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900">
                <Loader2 className="h-12 w-12 text-cyan-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 text-white p-6">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-cyan-300 mb-2">Achievements</h1>
                    <p className="text-gray-400">Track your progress and celebrate your success</p>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <Card className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/30">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-purple-500/20 rounded-lg">
                                    <Flame className="h-6 w-6 text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Current Streak</p>
                                    <p className="text-2xl font-bold text-white">{streak?.current_streak || 0} days</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border-cyan-500/30">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-cyan-500/20 rounded-lg">
                                    <Trophy className="h-6 w-6 text-cyan-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Badges Earned</p>
                                    <p className="text-2xl font-bold text-white">{badges.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-500/20 to-green-500/5 border-green-500/30">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-green-500/20 rounded-lg">
                                    <Target className="h-6 w-6 text-green-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Lessons Completed</p>
                                    <p className="text-2xl font-bold text-white">{stats?.completedLessons || 0}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 border-yellow-500/30">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-yellow-500/20 rounded-lg">
                                    <Star className="h-6 w-6 text-yellow-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Perfect Scores</p>
                                    <p className="text-2xl font-bold text-white">{stats?.perfectScores || 0}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Streak Card */}
                <Card className="bg-gray-900/50 border-orange-500/30 mb-8">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Flame className="h-5 w-5 text-orange-400" />
                            Learning Streak
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-4xl font-bold text-orange-400 mb-2">
                                    {streak?.current_streak || 0} Days
                                </p>
                                <p className="text-sm text-gray-400">
                                    Personal Best: {streak?.longest_streak || 0} days
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-400">Keep it going!</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Complete a lesson today to maintain your streak
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Badges */}
                <Card className="bg-gray-900/50 border-cyan-500/30">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-cyan-400" />
                            Your Badges
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {badges.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {badges.map(badge => {
                                    const Icon = getBadgeIcon(badge.badge_type);
                                    return (
                                        <div
                                            key={badge.id}
                                            className="bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border border-cyan-500/30 rounded-lg p-4"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`p-3 rounded-lg bg-${badge.icon_color || 'cyan'}-500/20`}>
                                                    <Icon className={`h-6 w-6 text-${badge.icon_color || 'cyan'}-400`} />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-white mb-1">{badge.title}</h4>
                                                    <p className="text-xs text-gray-400 mb-2">{badge.description}</p>
                                                    <p className="text-xs text-gray-500">
                                                        Earned: {new Date(badge.earned_date).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <Trophy className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                                <p className="text-gray-400">No badges earned yet</p>
                                <p className="text-sm text-gray-500 mt-2">
                                    Complete lessons and quizzes to earn your first badge!
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}