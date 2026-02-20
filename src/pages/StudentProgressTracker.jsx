import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, BookOpen, TrendingUp, Clock, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function StudentProgressTracker() {
    const [students, setStudents] = useState([]);
    const [enrollments, setEnrollments] = useState([]);
    const [courses, setCourses] = useState([]);
    const [modules, setModules] = useState([]);
    const [allProgress, setAllProgress] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [selectedEnrollment, setSelectedEnrollment] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [studentsData, enrollmentsData, coursesData, modulesData, progressData] = await Promise.all([
                base44.entities.Student.list(),
                base44.entities.Enrollment.list(),
                base44.entities.Course.list(),
                base44.entities.Module.list(),
                base44.entities.UserProgress.list()
            ]);

            setStudents(studentsData);
            setEnrollments(enrollmentsData);
            setCourses(coursesData);
            setModules(modulesData);
            setAllProgress(progressData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getStudentEnrollments = (studentId) => {
        return enrollments.filter(e => e.student_id === studentId);
    };

    const getEnrollmentProgress = (enrollmentId) => {
        return allProgress.filter(p => p.enrollment_id === enrollmentId);
    };

    const calculateEnrollmentStats = (enrollmentId) => {
        const progress = getEnrollmentProgress(enrollmentId);
        const completed = progress.filter(p => p.completed).length;
        const total = progress.length;
        const completionRate = total > 0 ? (completed / total) * 100 : 0;

        const quizScores = progress.filter(p => p.quiz_score !== undefined && p.quiz_score !== null);
        const avgQuizScore = quizScores.length > 0 
            ? quizScores.reduce((sum, p) => sum + p.quiz_score, 0) / quizScores.length 
            : 0;

        const totalTime = progress.reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0);

        return { completed, total, completionRate, avgQuizScore, totalTime };
    };

    const getEnrollmentCourse = (enrollment) => {
        return courses.find(c => c.id === enrollment.course_id);
    };

    const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
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
                    <h1 className="text-4xl font-bold text-cyan-300 mb-2">Student Progress Tracker</h1>
                    <p className="text-gray-400">Monitor individual student performance and enrollment progress</p>
                </div>

                {/* Student Selection */}
                <Card className="bg-gray-900/50 border-cyan-500/30 backdrop-blur-sm mb-6">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Users className="h-5 w-5 text-cyan-400" />
                            Select Student
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Select value={selectedStudent?.id} onValueChange={(id) => {
                            const student = students.find(s => s.id === id);
                            setSelectedStudent(student);
                            setSelectedEnrollment(null);
                        }}>
                            <SelectTrigger className="bg-gray-800/50 border-cyan-500/30 text-white">
                                <SelectValue placeholder="Choose a student..." />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-cyan-500/30">
                                {students.map(student => (
                                    <SelectItem key={student.id} value={student.id}>
                                        {student.full_name} ({student.student_id || student.user_email})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                {selectedStudent && (
                    <>
                        {/* Student Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <Card className="bg-gray-900/50 border-cyan-500/30">
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-cyan-500/20 rounded-lg">
                                            <BookOpen className="h-5 w-5 text-cyan-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-400">Enrollments</p>
                                            <p className="text-2xl font-bold text-white">
                                                {getStudentEnrollments(selectedStudent.id).length}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gray-900/50 border-cyan-500/30">
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-500/20 rounded-lg">
                                            <TrendingUp className="h-5 w-5 text-green-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-400">Status</p>
                                            <Badge className={
                                                selectedStudent.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                                selectedStudent.status === 'graduated' ? 'bg-blue-500/20 text-blue-400' :
                                                'bg-gray-500/20 text-gray-400'
                                            }>
                                                {selectedStudent.status}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gray-900/50 border-cyan-500/30">
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-500/20 rounded-lg">
                                            <Award className="h-5 w-5 text-purple-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-400">Student ID</p>
                                            <p className="text-lg font-semibold text-white">
                                                {selectedStudent.student_id || 'N/A'}
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
                                            <p className="text-sm text-gray-400">Enrolled Since</p>
                                            <p className="text-sm font-semibold text-white">
                                                {selectedStudent.enrollment_date ? new Date(selectedStudent.enrollment_date).toLocaleDateString() : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Enrollments List */}
                        <Card className="bg-gray-900/50 border-cyan-500/30 backdrop-blur-sm mb-6">
                            <CardHeader>
                                <CardTitle className="text-white">Course Enrollments</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {getStudentEnrollments(selectedStudent.id).map(enrollment => {
                                    const course = getEnrollmentCourse(enrollment);
                                    const stats = calculateEnrollmentStats(enrollment.id);

                                    return (
                                        <Card 
                                            key={enrollment.id} 
                                            className={`bg-gray-800/30 border-cyan-500/20 cursor-pointer transition-all hover:border-cyan-500/50 ${
                                                selectedEnrollment?.id === enrollment.id ? 'border-cyan-500 bg-cyan-500/10' : ''
                                            }`}
                                            onClick={() => setSelectedEnrollment(enrollment)}
                                        >
                                            <CardContent className="pt-6">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h3 className="text-lg font-semibold text-white mb-1">
                                                            {course?.title || 'Unknown Course'}
                                                        </h3>
                                                        <p className="text-sm text-gray-400">
                                                            Enrolled: {new Date(enrollment.enrollment_date).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <Badge className={
                                                        enrollment.status === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                                                        enrollment.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' :
                                                        enrollment.status === 'enrolled' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' :
                                                        'bg-gray-500/20 text-gray-400 border-gray-500/50'
                                                    }>
                                                        {enrollment.status}
                                                    </Badge>
                                                </div>

                                                <div className="grid grid-cols-3 gap-4 mb-3">
                                                    <div>
                                                        <p className="text-xs text-gray-400">Completion</p>
                                                        <p className="text-lg font-bold text-cyan-400">{stats.completionRate.toFixed(0)}%</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-400">Avg Quiz Score</p>
                                                        <p className="text-lg font-bold text-purple-400">{stats.avgQuizScore.toFixed(0)}%</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-400">Time Spent</p>
                                                        <p className="text-lg font-bold text-orange-400">{formatTime(stats.totalTime)}</p>
                                                    </div>
                                                </div>

                                                <Progress value={stats.completionRate} className="h-2" />
                                                <p className="text-xs text-gray-500 mt-2">
                                                    {stats.completed} of {stats.total} lessons completed
                                                </p>
                                            </CardContent>
                                        </Card>
                                    );
                                })}

                                {getStudentEnrollments(selectedStudent.id).length === 0 && (
                                    <p className="text-center text-gray-500 py-8">No enrollments found for this student</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Detailed Enrollment Progress */}
                        {selectedEnrollment && (
                            <EnrollmentDetailedProgress 
                                enrollment={selectedEnrollment}
                                progress={getEnrollmentProgress(selectedEnrollment.id)}
                                modules={modules}
                                course={getEnrollmentCourse(selectedEnrollment)}
                            />
                        )}
                    </>
                )}

                {!selectedStudent && (
                    <Card className="bg-gray-900/30 border-cyan-500/20 backdrop-blur-sm">
                        <CardContent className="py-16 text-center">
                            <Users className="h-16 w-16 text-cyan-400/30 mx-auto mb-4" />
                            <p className="text-gray-500">Select a student to view their progress</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

function EnrollmentDetailedProgress({ enrollment, progress, modules, course }) {
    const moduleProgress = modules.map(module => {
        const moduleData = progress.filter(p => p.module_id === module.id);
        const completed = moduleData.filter(p => p.completed).length;
        const total = moduleData.length;
        const percentage = total > 0 ? (completed / total) * 100 : 0;

        const quizScores = moduleData.filter(p => p.quiz_score !== undefined);
        const avgScore = quizScores.length > 0 
            ? quizScores.reduce((sum, p) => sum + p.quiz_score, 0) / quizScores.length 
            : null;

        return {
            name: `Week ${module.module_number}`,
            completion: percentage,
            avgScore: avgScore,
            title: module.title
        };
    }).filter(m => m.completion > 0 || m.avgScore !== null);

    const quizTrend = progress
        .filter(p => p.quiz_score !== undefined && p.quiz_score !== null)
        .sort((a, b) => new Date(a.completion_date) - new Date(b.completion_date))
        .slice(-10)
        .map((p, idx) => ({
            attempt: idx + 1,
            score: p.quiz_score
        }));

    return (
        <Card className="bg-gray-900/50 border-cyan-500/30 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-white">
                    Detailed Progress: {course?.title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="modules" className="w-full">
                    <TabsList className="bg-gray-900/50 border border-cyan-500/30">
                        <TabsTrigger value="modules" className="data-[state=active]:bg-cyan-500/20">
                            Module Breakdown
                        </TabsTrigger>
                        <TabsTrigger value="quizzes" className="data-[state=active]:bg-cyan-500/20">
                            Quiz Performance
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="modules" className="mt-6">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={moduleProgress}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="name" stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                                <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#111827', 
                                        border: '1px solid #22d3ee',
                                        borderRadius: '8px'
                                    }}
                                    labelStyle={{ color: '#22d3ee' }}
                                />
                                <Bar dataKey="completion" fill="#22d3ee" name="Completion %" />
                                <Bar dataKey="avgScore" fill="#a855f7" name="Avg Quiz Score %" />
                            </BarChart>
                        </ResponsiveContainer>
                    </TabsContent>

                    <TabsContent value="quizzes" className="mt-6">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={quizTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="attempt" stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                                <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} domain={[0, 100]} />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#111827', 
                                        border: '1px solid #22d3ee',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Line type="monotone" dataKey="score" stroke="#a855f7" strokeWidth={3} />
                            </LineChart>
                        </ResponsiveContainer>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}