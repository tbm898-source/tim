import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function LearningPathwayGenerator() {
    const [students, setStudents] = useState([]);
    const [enrollments, setEnrollments] = useState([]);
    const [courses, setCourses] = useState([]);
    const [modules, setModules] = useState([]);
    const [lessons, setLessons] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState('');
    const [selectedEnrollment, setSelectedEnrollment] = useState('');
    const [generating, setGenerating] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [studentsData, enrollmentsData, coursesData, modulesData, lessonsData] = await Promise.all([
                base44.entities.Student.list(),
                base44.entities.Enrollment.list(),
                base44.entities.Course.list(),
                base44.entities.Module.list(),
                base44.entities.Lesson.list()
            ]);

            setStudents(studentsData);
            setEnrollments(enrollmentsData);
            setCourses(coursesData);
            setModules(modulesData);
            setLessons(lessonsData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const generatePathway = async () => {
        if (!selectedStudent || !selectedEnrollment) {
            toast.error('Please select a student and enrollment');
            return;
        }

        setGenerating(true);
        try {
            const student = students.find(s => s.id === selectedStudent);
            const enrollment = enrollments.find(e => e.id === selectedEnrollment);
            const course = courses.find(c => c.id === enrollment.course_id);

            // Gather comprehensive student data
            const [userProgress, assignmentSubs, projectSubs, quizzes] = await Promise.all([
                base44.entities.UserProgress.filter({ student_id: selectedStudent, enrollment_id: selectedEnrollment }),
                base44.entities.AssignmentSubmission.filter({ student_id: selectedStudent, enrollment_id: selectedEnrollment }),
                base44.entities.ProjectSubmission.filter({ student_id: selectedStudent, enrollment_id: selectedEnrollment }),
                base44.entities.Quiz.list()
            ]);

            // Calculate comprehensive metrics
            const completedLessons = userProgress.filter(p => p.completed).length;
            const totalLessons = userProgress.length;
            const completionRate = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

            const quizScores = userProgress.filter(p => p.quiz_score !== null && p.quiz_score !== undefined);
            const avgQuizScore = quizScores.length > 0 
                ? quizScores.reduce((sum, p) => sum + p.quiz_score, 0) / quizScores.length 
                : 0;

            const gradedAssignments = assignmentSubs.filter(a => a.status === 'graded');
            const avgAssignmentGrade = gradedAssignments.length > 0
                ? gradedAssignments.reduce((sum, a) => sum + (a.grade || 0), 0) / gradedAssignments.length
                : 0;

            const totalTime = userProgress.reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0) / 3600;

            // Identify weak modules
            const modulePerformance = modules.map(module => {
                const moduleProgress = userProgress.filter(p => p.module_id === module.id);
                const moduleQuizzes = moduleProgress.filter(p => p.quiz_score !== null);
                const avgScore = moduleQuizzes.length > 0
                    ? moduleQuizzes.reduce((sum, p) => sum + p.quiz_score, 0) / moduleQuizzes.length
                    : null;
                
                return {
                    module,
                    avgScore,
                    completed: moduleProgress.filter(p => p.completed).length,
                    total: moduleProgress.length
                };
            }).filter(m => m.avgScore !== null);

            // Build AI analysis prompt
            const prompt = `Analyze this student's learning data and create a personalized learning pathway.

Student: ${student.full_name}
Course: ${course.title}

Performance Metrics:
- Completion Rate: ${completionRate.toFixed(1)}%
- Average Quiz Score: ${avgQuizScore.toFixed(1)}%
- Average Assignment Grade: ${avgAssignmentGrade.toFixed(1)}%
- Total Time Invested: ${totalTime.toFixed(1)} hours

Module Performance:
${modulePerformance.map(m => `- ${m.module.title}: ${m.avgScore.toFixed(0)}% avg, ${m.completed}/${m.total} lessons`).join('\n')}

Low-Performing Areas (below 70%):
${modulePerformance.filter(m => m.avgScore < 70).map(m => `- ${m.module.title}: ${m.avgScore.toFixed(0)}%`).join('\n') || 'None'}

Assignment Feedback Summary:
${gradedAssignments.slice(-3).map(a => `- ${a.instructor_feedback || 'No feedback'}`).join('\n')}

Based on this comprehensive analysis:
1. Identify 3-5 specific learning gaps with severity levels
2. Recommend a sequenced learning path with specific modules, lessons, or resources
3. Identify student's strengths and areas of excellence
4. Set 3-4 achievable milestones with target dates and success criteria
5. Provide an encouraging, personalized summary

Prioritize recommendations that address gaps while building on strengths.`;

            const aiAnalysis = await base44.integrations.Core.InvokeLLM({
                prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        pathway_title: { type: "string" },
                        analysis_summary: { type: "string" },
                        identified_gaps: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    topic: { type: "string" },
                                    severity: { 
                                        type: "string",
                                        enum: ["low", "medium", "high", "critical"]
                                    },
                                    evidence: { type: "string" }
                                }
                            }
                        },
                        recommended_content: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    content_type: { 
                                        type: "string",
                                        enum: ["module", "lesson", "quiz", "assignment", "external_resource"]
                                    },
                                    content_title: { type: "string" },
                                    reason: { type: "string" },
                                    priority: { type: "integer" },
                                    estimated_time_hours: { type: "number" }
                                }
                            }
                        },
                        strengths: {
                            type: "array",
                            items: { type: "string" }
                        },
                        next_milestones: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    milestone: { type: "string" },
                                    target_date: { type: "string" },
                                    success_criteria: { type: "string" }
                                }
                            }
                        }
                    }
                }
            });

            // Map recommended content to actual IDs where possible
            const mappedRecommendations = aiAnalysis.recommended_content.map(rec => {
                let contentId = null;
                
                if (rec.content_type === 'module') {
                    const module = modules.find(m => 
                        m.title.toLowerCase().includes(rec.content_title.toLowerCase())
                    );
                    contentId = module?.id;
                } else if (rec.content_type === 'lesson') {
                    const lesson = lessons.find(l => 
                        l.title.toLowerCase().includes(rec.content_title.toLowerCase())
                    );
                    contentId = lesson?.id;
                }

                return {
                    ...rec,
                    content_id: contentId || 'external'
                };
            });

            // Create learning pathway
            await base44.entities.LearningPathway.create({
                student_id: selectedStudent,
                enrollment_id: selectedEnrollment,
                pathway_title: aiAnalysis.pathway_title,
                analysis_summary: aiAnalysis.analysis_summary,
                identified_gaps: aiAnalysis.identified_gaps,
                recommended_content: mappedRecommendations,
                strengths: aiAnalysis.strengths,
                next_milestones: aiAnalysis.next_milestones,
                status: 'active',
                last_updated: new Date().toISOString(),
                performance_metrics: {
                    avg_quiz_score: avgQuizScore,
                    completion_rate: completionRate,
                    avg_assignment_grade: avgAssignmentGrade,
                    time_on_task_hours: totalTime
                }
            });

            toast.success('Personalized learning pathway generated successfully');
        } catch (error) {
            console.error('Error generating pathway:', error);
            toast.error('Failed to generate learning pathway');
        } finally {
            setGenerating(false);
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
            <div className="max-w-5xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-cyan-300 mb-2">Learning Pathway Generator</h1>
                    <p className="text-gray-400">Create AI-driven personalized learning paths for students</p>
                </div>

                <Card className="bg-gray-900/50 border-cyan-500/30">
                    <CardHeader>
                        <CardTitle className="text-white">Generate Personalized Pathway</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm text-gray-400 mb-2 block">Select Student</label>
                            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                                <SelectTrigger className="bg-gray-800/50 border-cyan-500/30 text-white">
                                    <SelectValue placeholder="Choose student..." />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-900 border-cyan-500/30">
                                    {students.map(student => (
                                        <SelectItem key={student.id} value={student.id}>
                                            {student.full_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedStudent && (
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Select Enrollment</label>
                                <Select value={selectedEnrollment} onValueChange={setSelectedEnrollment}>
                                    <SelectTrigger className="bg-gray-800/50 border-cyan-500/30 text-white">
                                        <SelectValue placeholder="Choose enrollment..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-900 border-cyan-500/30">
                                        {enrollments
                                            .filter(e => e.student_id === selectedStudent)
                                            .map(enrollment => {
                                                const course = courses.find(c => c.id === enrollment.course_id);
                                                return (
                                                    <SelectItem key={enrollment.id} value={enrollment.id}>
                                                        {course?.title || 'Unknown Course'}
                                                    </SelectItem>
                                                );
                                            })}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <Button
                            onClick={generatePathway}
                            disabled={!selectedStudent || !selectedEnrollment || generating}
                            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 w-full"
                        >
                            {generating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Analyzing Performance & Generating Pathway...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Generate Personalized Learning Pathway
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30 mt-6">
                    <CardContent className="py-6">
                        <div className="flex items-start gap-3">
                            <Sparkles className="h-5 w-5 text-cyan-400 mt-1 flex-shrink-0" />
                            <div>
                                <h4 className="font-semibold text-white mb-2">How AI Learning Pathways Work</h4>
                                <ul className="text-sm text-gray-300 space-y-1">
                                    <li>• Analyzes quiz scores, assignment grades, and completion patterns</li>
                                    <li>• Identifies specific learning gaps and knowledge areas needing reinforcement</li>
                                    <li>• Creates a sequenced, prioritized learning plan with recommended content</li>
                                    <li>• Sets achievable milestones and tracks progress toward goals</li>
                                    <li>• Adapts dynamically as student performance evolves</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}