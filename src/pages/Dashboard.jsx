import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Sparkles, RefreshCw } from 'lucide-react';
import ProgressOverview from '../components/dashboard/ProgressOverview';
import ModuleProgress from '../components/dashboard/ModuleProgress';
import QuizAnalytics from '../components/dashboard/QuizAnalytics';
import AIRecommendations from '../components/dashboard/AIRecommendations';
import TimeSpentChart from '../components/dashboard/TimeSpentChart';
import SubmissionStatus from '../components/dashboard/SubmissionStatus';
import LearningPathwayWidget from '../components/dashboard/LearningPathwayWidget';

export default function Dashboard() {
    const [user, setUser] = useState(null);
    const [courses, setCourses] = useState([]);
    const [modules, setModules] = useState([]);
    const [userProgress, setUserProgress] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [assignmentSubmissions, setAssignmentSubmissions] = useState([]);
    const [projectSubmissions, setProjectSubmissions] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [projects, setProjects] = useState([]);
    const [studentId, setStudentId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async (isRefresh = false) => {
        if (isRefresh) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }
        try {
            const currentUser = await base44.auth.me();
            setUser(currentUser);

            const studentData = await base44.entities.Student.filter({ user_email: currentUser.email });
            const studentRecordId = studentData.length > 0 ? studentData[0].id : null;
            setStudentId(studentRecordId);

            const promises = [
                base44.entities.Course.list(),
                base44.entities.Module.list(),
                base44.entities.UserProgress.filter({ user_id: currentUser.email }),
                base44.entities.Recommendation.filter({ user_id: currentUser.email, status: 'pending' }),
                base44.entities.Assignment.list(),
                base44.entities.Project.list()
            ];

            if (studentRecordId) {
                promises.push(
                    base44.entities.AssignmentSubmission.filter({ student_id: studentRecordId }),
                    base44.entities.ProjectSubmission.filter({ student_id: studentRecordId })
                );
            }

            const results = await Promise.all(promises);
            
            setCourses(results[0]);
            setModules(results[1]);
            setUserProgress(results[2]);
            setRecommendations(results[3]);
            setAssignments(results[4]);
            setProjects(results[5]);
            
            if (studentRecordId) {
                setAssignmentSubmissions(results[6] || []);
                setProjectSubmissions(results[7] || []);
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            if (isRefresh) {
                setIsRefreshing(false);
            } else {
                setIsLoading(false);
            }
        }
    };

    const handlePullToRefresh = async () => {
        await loadDashboardData(true);
    };

    const generateAIInsights = async () => {
        setIsGeneratingInsights(true);
        try {
            // Analyze user progress to identify weak areas
            const completedProgress = userProgress.filter(p => p.completed);
            const quizScores = userProgress.filter(p => p.quiz_score !== undefined && p.quiz_score !== null);
            
            const avgQuizScore = quizScores.length > 0 
                ? quizScores.reduce((sum, p) => sum + p.quiz_score, 0) / quizScores.length 
                : 0;

            const weakAreas = quizScores.filter(p => p.quiz_score < 70);
            
            // Build analysis prompt
            const analysisPrompt = `Analyze this student's learning progress and provide personalized recommendations:

Total Lessons Completed: ${completedProgress.length}
Average Quiz Score: ${avgQuizScore.toFixed(1)}%
Areas with Low Performance: ${weakAreas.length} modules with scores below 70%

Recent Quiz Scores: ${quizScores.slice(-5).map(p => p.quiz_score + '%').join(', ')}

Based on this data:
1. Identify the top 3 areas where the student needs improvement
2. For each area, suggest specific remedial content or study strategies
3. Provide constructive, encouraging feedback
4. Recommend next steps for continued growth

Format your response as a structured analysis with clear sections.`;

            const aiResponse = await base44.integrations.Core.InvokeLLM({
                prompt: analysisPrompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        improvement_areas: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    area: { type: "string" },
                                    current_performance: { type: "string" },
                                    recommendation: { type: "string" },
                                    priority: { type: "string", enum: ["low", "medium", "high", "critical"] }
                                }
                            }
                        },
                        constructive_feedback: { type: "string" },
                        next_steps: {
                            type: "array",
                            items: { type: "string" }
                        },
                        strengths: {
                            type: "array",
                            items: { type: "string" }
                        }
                    }
                }
            });

            // Create recommendations from AI insights
            for (const area of aiResponse.improvement_areas) {
                // Find relevant module for this improvement area
                const relevantModule = modules.find(m => 
                    m.title.toLowerCase().includes(area.area.toLowerCase()) ||
                    m.topics?.toLowerCase().includes(area.area.toLowerCase())
                );

                if (relevantModule) {
                    await base44.entities.Recommendation.create({
                        user_id: user.email,
                        recommended_content_id: relevantModule.id,
                        recommended_content_type: 'module',
                        reason: area.recommendation,
                        priority: area.priority,
                        status: 'pending'
                    });
                }
            }

            // Reload recommendations
            const updatedRecommendations = await base44.entities.Recommendation.filter({ 
                user_id: user.email, 
                status: 'pending' 
            });
            setRecommendations(updatedRecommendations);

        } catch (error) {
            console.error('Error generating AI insights:', error);
        } finally {
            setIsGeneratingInsights(false);
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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 dark:from-slate-950 dark:via-black dark:to-slate-950 text-white p-6 pb-24 md:pb-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-cyan-300 mb-2">Learning Dashboard</h1>
                        <p className="text-gray-400 dark:text-gray-500">Welcome back, {user?.full_name || user?.email}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={handlePullToRefresh}
                            disabled={isRefreshing}
                            variant="outline"
                            size="icon"
                            className="md:hidden border-cyan-500/50 hover:bg-cyan-500/20 select-none"
                        >
                            <RefreshCw className={`h-5 w-5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                            onClick={generateAIInsights}
                            disabled={isGeneratingInsights}
                            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 select-none"
                        >
                        {isGeneratingInsights ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Generate AI Insights
                            </>
                        )}
                    </Button>
                </div>

                {/* Progress Overview */}
                <ProgressOverview 
                    courses={courses}
                    modules={modules}
                    userProgress={userProgress}
                />

                {/* Learning Pathway Widget */}
                {studentId && (
                    <div className="mt-6">
                        <LearningPathwayWidget studentId={studentId} />
                    </div>
                )}

                {/* Detailed Analytics Tabs */}
                <Tabs defaultValue="submissions" className="mt-8">
                    <TabsList className="bg-gray-900/50 dark:bg-slate-900/50 border border-cyan-500/30 select-none">
                        <TabsTrigger value="submissions" className="data-[state=active]:bg-cyan-500/20 select-none">
                            Submissions
                        </TabsTrigger>
                        <TabsTrigger value="modules" className="data-[state=active]:bg-cyan-500/20">
                            Module Progress
                        </TabsTrigger>
                        <TabsTrigger value="quizzes" className="data-[state=active]:bg-cyan-500/20">
                            Quiz Analytics
                        </TabsTrigger>
                        <TabsTrigger value="time" className="data-[state=active]:bg-cyan-500/20">
                            Time Analysis
                        </TabsTrigger>
                        <TabsTrigger value="recommendations" className="data-[state=active]:bg-cyan-500/20">
                            AI Recommendations
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="submissions" className="mt-6">
                        <SubmissionStatus
                            assignmentSubmissions={assignmentSubmissions}
                            projectSubmissions={projectSubmissions}
                            assignments={assignments}
                            projects={projects}
                        />
                    </TabsContent>

                    <TabsContent value="modules" className="mt-6">
                        <ModuleProgress 
                            modules={modules}
                            userProgress={userProgress}
                            courses={courses}
                        />
                    </TabsContent>

                    <TabsContent value="quizzes" className="mt-6">
                        <QuizAnalytics 
                            userProgress={userProgress}
                            modules={modules}
                        />
                    </TabsContent>

                    <TabsContent value="time" className="mt-6">
                        <TimeSpentChart 
                            userProgress={userProgress}
                            modules={modules}
                        />
                    </TabsContent>

                    <TabsContent value="recommendations" className="mt-6">
                        <AIRecommendations 
                            recommendations={recommendations}
                            modules={modules}
                            onRecommendationUpdate={loadDashboardData}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}