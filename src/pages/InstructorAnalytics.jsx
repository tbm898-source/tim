import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Users, TrendingUp, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function InstructorAnalytics() {
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [analytics, setAnalytics] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadCourses();
    }, []);

    useEffect(() => {
        if (selectedCourse) {
            loadAnalytics();
        }
    }, [selectedCourse]);

    const loadCourses = async () => {
        try {
            const coursesData = await base44.entities.Course.list();
            setCourses(coursesData);
            if (coursesData.length > 0) {
                setSelectedCourse(coursesData[0].id);
            }
        } catch (error) {
            console.error('Error loading courses:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadAnalytics = async () => {
        setIsLoading(true);
        try {
            const [enrollments, modules, progress, quizzes, assignments, submissions] = await Promise.all([
                base44.entities.Enrollment.filter({ course_id: selectedCourse }),
                base44.entities.Module.filter({ course_id: selectedCourse }),
                base44.entities.UserProgress.filter({ course_id: selectedCourse }),
                base44.entities.Quiz.list(),
                base44.entities.Assignment.list(),
                base44.entities.AssignmentSubmission.list()
            ]);

            // Calculate comprehensive analytics
            const totalStudents = enrollments.length;
            const activeStudents = enrollments.filter(e => e.status === 'in_progress' || e.status === 'enrolled').length;
            const completedStudents = enrollments.filter(e => e.status === 'completed').length;

            // Overall completion rate
            const totalLessons = progress.length;
            const completedLessons = progress.filter(p => p.completed).length;
            const avgCompletionRate = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

            // Quiz performance
            const quizScores = progress.filter(p => p.quiz_score !== null);
            const avgQuizScore = quizScores.length > 0
                ? quizScores.reduce((sum, p) => sum + p.quiz_score, 0) / quizScores.length
                : 0;

            // Time metrics
            const totalTime = progress.reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0) / 3600;
            const avgTimePerStudent = totalStudents > 0 ? totalTime / totalStudents : 0;

            // Module breakdown
            const moduleAnalytics = modules.map(module => {
                const moduleProgress = progress.filter(p => p.module_id === module.id);
                const completed = moduleProgress.filter(p => p.completed).length;
                const total = moduleProgress.length;
                const completionRate = total > 0 ? (completed / total) * 100 : 0;

                const moduleQuizzes = moduleProgress.filter(p => p.quiz_score !== null);
                const avgScore = moduleQuizzes.length > 0
                    ? moduleQuizzes.reduce((sum, p) => sum + p.quiz_score, 0) / moduleQuizzes.length
                    : 0;

                return {
                    name: `Week ${module.module_number}`,
                    completionRate: parseFloat(completionRate.toFixed(1)),
                    avgQuizScore: parseFloat(avgScore.toFixed(1)),
                    strugglingStudents: moduleQuizzes.filter(q => q.quiz_score < 70).length
                };
            });

            // Struggling students (avg quiz score < 70)
            const studentPerformance = enrollments.map(enrollment => {
                const studentProgress = progress.filter(p => p.enrollment_id === enrollment.id);
                const studentQuizzes = studentProgress.filter(p => p.quiz_score !== null);
                const avgScore = studentQuizzes.length > 0
                    ? studentQuizzes.reduce((sum, p) => sum + p.quiz_score, 0) / studentQuizzes.length
                    : 0;

                return {
                    enrollment_id: enrollment.id,
                    avgScore,
                    isStruggling: avgScore > 0 && avgScore < 70
                };
            });

            const strugglingCount = studentPerformance.filter(s => s.isStruggling).length;

            // Engagement distribution
            const engagementData = [
                { name: 'Active', value: activeStudents, color: '#10b981' },
                { name: 'Completed', value: completedStudents, color: '#06b6d4' },
                { name: 'Inactive', value: totalStudents - activeStudents - completedStudents, color: '#ef4444' }
            ];

            setAnalytics({
                totalStudents,
                activeStudents,
                completedStudents,
                avgCompletionRate,
                avgQuizScore,
                avgTimePerStudent,
                strugglingCount,
                moduleAnalytics,
                engagementData
            });
        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setIsLoading(false);
        }
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
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-cyan-300 mb-2">Instructor Analytics</h1>
                    <p className="text-gray-400">Comprehensive course and cohort performance insights</p>
                </div>

                <div className="mb-6">
                    <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                        <SelectTrigger className="bg-gray-800/50 border-cyan-500/30 text-white w-64">
                            <SelectValue placeholder="Select course..." />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-cyan-500/30">
                            {courses.map(course => (
                                <SelectItem key={course.id} value={course.id}>
                                    {course.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {analytics && (
                    <>
                        {/* Key Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                            <Card className="bg-gray-900/50 border-cyan-500/30">
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-cyan-500/20 rounded-lg">
                                            <Users className="h-5 w-5 text-cyan-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">Total Students</p>
                                            <p className="text-2xl font-bold text-white">{analytics.totalStudents}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gray-900/50 border-green-500/30">
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-500/20 rounded-lg">
                                            <CheckCircle2 className="h-5 w-5 text-green-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">Avg Completion</p>
                                            <p className="text-2xl font-bold text-white">{analytics.avgCompletionRate.toFixed(0)}%</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gray-900/50 border-purple-500/30">
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-500/20 rounded-lg">
                                            <TrendingUp className="h-5 w-5 text-purple-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">Avg Quiz Score</p>
                                            <p className="text-2xl font-bold text-white">{analytics.avgQuizScore.toFixed(0)}%</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gray-900/50 border-orange-500/30">
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-orange-500/20 rounded-lg">
                                            <AlertCircle className="h-5 w-5 text-orange-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">Need Support</p>
                                            <p className="text-2xl font-bold text-white">{analytics.strugglingCount}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            {/* Module Performance */}
                            <Card className="bg-gray-900/50 border-cyan-500/30">
                                <CardHeader>
                                    <CardTitle className="text-white">Module Completion Rates</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={analytics.moduleAnalytics}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                            <XAxis dataKey="name" stroke="#9ca3af" />
                                            <YAxis stroke="#9ca3af" />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                                                labelStyle={{ color: '#fff' }}
                                            />
                                            <Bar dataKey="completionRate" fill="#06b6d4" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Student Engagement */}
                            <Card className="bg-gray-900/50 border-cyan-500/30">
                                <CardHeader>
                                    <CardTitle className="text-white">Student Engagement</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={analytics.engagementData}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {analytics.engagementData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Module Quiz Performance */}
                        <Card className="bg-gray-900/50 border-cyan-500/30">
                            <CardHeader>
                                <CardTitle className="text-white">Module Quiz Performance</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={analytics.moduleAnalytics}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis dataKey="name" stroke="#9ca3af" />
                                        <YAxis stroke="#9ca3af" />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                                            labelStyle={{ color: '#fff' }}
                                        />
                                        <Line type="monotone" dataKey="avgQuizScore" stroke="#10b981" strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </div>
    );
}