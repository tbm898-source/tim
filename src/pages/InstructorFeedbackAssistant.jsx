import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Copy, FileText, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

export default function InstructorFeedbackAssistant() {
    const [assignmentSubs, setAssignmentSubs] = useState([]);
    const [projectSubs, setProjectSubs] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [projects, setProjects] = useState([]);
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [assignmentSubsData, projectSubsData, assignmentsData, projectsData, studentsData] = await Promise.all([
                base44.entities.AssignmentSubmission.filter({ status: 'submitted' }),
                base44.entities.ProjectSubmission.filter({ status: 'submitted' }),
                base44.entities.Assignment.list(),
                base44.entities.Project.list(),
                base44.entities.Student.list()
            ]);

            setAssignmentSubs(assignmentSubsData);
            setProjectSubs(projectSubsData);
            setAssignments(assignmentsData);
            setProjects(projectsData);
            setStudents(studentsData);
        } catch (error) {
            console.error('Error loading data:', error);
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
                    <h1 className="text-4xl font-bold text-cyan-300 mb-2">AI Feedback Assistant</h1>
                    <p className="text-gray-400">Get AI-generated feedback suggestions for student submissions</p>
                </div>

                <Tabs defaultValue="assignments" className="w-full">
                    <TabsList className="bg-gray-900/50 border border-cyan-500/30">
                        <TabsTrigger value="assignments" className="data-[state=active]:bg-cyan-500/20">
                            <FileText className="h-4 w-4 mr-2" />
                            Assignments ({assignmentSubs.length})
                        </TabsTrigger>
                        <TabsTrigger value="projects" className="data-[state=active]:bg-cyan-500/20">
                            <Briefcase className="h-4 w-4 mr-2" />
                            Projects ({projectSubs.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="assignments" className="mt-6">
                        <AssignmentFeedbackList 
                            submissions={assignmentSubs}
                            assignments={assignments}
                            students={students}
                            onUpdate={loadData}
                        />
                    </TabsContent>

                    <TabsContent value="projects" className="mt-6">
                        <ProjectFeedbackList 
                            submissions={projectSubs}
                            projects={projects}
                            students={students}
                            onUpdate={loadData}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

function AssignmentFeedbackList({ submissions, assignments, students, onUpdate }) {
    const [expandedId, setExpandedId] = useState(null);

    return (
        <div className="space-y-4">
            {submissions.map(submission => {
                const assignment = assignments.find(a => a.id === submission.assignment_id);
                const student = students.find(s => s.id === submission.student_id);

                return (
                    <Card key={submission.id} className="bg-gray-900/50 border-cyan-500/30">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-white text-lg">{assignment?.title}</CardTitle>
                                    <p className="text-sm text-gray-400 mt-1">{student?.full_name}</p>
                                </div>
                                <Button
                                    onClick={() => setExpandedId(expandedId === submission.id ? null : submission.id)}
                                    variant="outline"
                                    size="sm"
                                >
                                    {expandedId === submission.id ? 'Hide' : 'Generate Feedback'}
                                </Button>
                            </div>
                        </CardHeader>
                        {expandedId === submission.id && (
                            <CardContent>
                                <AssignmentFeedbackGenerator 
                                    submission={submission}
                                    assignment={assignment}
                                    student={student}
                                    onUpdate={onUpdate}
                                />
                            </CardContent>
                        )}
                    </Card>
                );
            })}
            {submissions.length === 0 && (
                <p className="text-center text-gray-400 py-8">No pending assignment submissions</p>
            )}
        </div>
    );
}

function AssignmentFeedbackGenerator({ submission, assignment, student, onUpdate }) {
    const [generating, setGenerating] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const generateFeedback = async () => {
        setGenerating(true);
        try {
            const prompt = `As an experienced instructor, provide constructive feedback for this student assignment submission.

Assignment: ${assignment.title}
Learning Objectives: ${assignment.learning_objectives?.join(', ')}
Student: ${student.full_name}

Submission Content:
${submission.submission_text || 'No text submission'}

Rubric Criteria:
${assignment.rubric?.criteria?.map(c => `- ${c.name} (${c.points} points): ${c.description}`).join('\n')}

Please provide:
1. Overall feedback on strengths
2. Specific areas for improvement
3. Constructive suggestions for each rubric criterion
4. Recommended rubric scores for each criterion
5. An encouraging closing statement

Be specific, constructive, and supportive.`;

            const result = await base44.integrations.Core.InvokeLLM({
                prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        overall_feedback: { type: "string" },
                        strengths: {
                            type: "array",
                            items: { type: "string" }
                        },
                        improvements: {
                            type: "array",
                            items: { type: "string" }
                        },
                        rubric_feedback: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    criterion_name: { type: "string" },
                                    suggested_score: { type: "number" },
                                    feedback: { type: "string" }
                                }
                            }
                        },
                        closing_statement: { type: "string" }
                    }
                }
            });

            setFeedback(result);
            toast.success('Feedback generated successfully');
        } catch (error) {
            toast.error('Failed to generate feedback');
        } finally {
            setGenerating(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    return (
        <div className="space-y-4">
            <div className="bg-gray-800/30 p-4 rounded">
                <h4 className="text-sm font-semibold text-gray-400 mb-2">Student Submission:</h4>
                <p className="text-sm text-gray-300">{submission.submission_text || 'No text content'}</p>
            </div>

            {!feedback && (
                <Button
                    onClick={generateFeedback}
                    disabled={generating}
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                >
                    {generating ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating AI Feedback...
                        </>
                    ) : (
                        <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Generate AI Feedback Suggestions
                        </>
                    )}
                </Button>
            )}

            {feedback && (
                <div className="space-y-4">
                    <Card className="bg-gradient-to-r from-green-500/10 to-cyan-500/10 border-green-500/30">
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start mb-3">
                                <h4 className="text-lg font-semibold text-white">AI-Generated Feedback</h4>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => copyToClipboard(feedback.overall_feedback)}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                            <p className="text-gray-300 mb-4">{feedback.overall_feedback}</p>

                            <div className="mb-4">
                                <h5 className="text-sm font-semibold text-green-400 mb-2">Strengths:</h5>
                                <ul className="list-disc list-inside space-y-1">
                                    {feedback.strengths?.map((s, idx) => (
                                        <li key={idx} className="text-sm text-gray-300">{s}</li>
                                    ))}
                                </ul>
                            </div>

                            <div className="mb-4">
                                <h5 className="text-sm font-semibold text-orange-400 mb-2">Areas for Improvement:</h5>
                                <ul className="list-disc list-inside space-y-1">
                                    {feedback.improvements?.map((i, idx) => (
                                        <li key={idx} className="text-sm text-gray-300">{i}</li>
                                    ))}
                                </ul>
                            </div>

                            <div className="mb-4">
                                <h5 className="text-sm font-semibold text-cyan-400 mb-2">Suggested Rubric Scores:</h5>
                                <div className="space-y-2">
                                    {feedback.rubric_feedback?.map((rf, idx) => (
                                        <div key={idx} className="bg-gray-800/50 p-3 rounded">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-white font-medium">{rf.criterion_name}</span>
                                                <Badge className="bg-cyan-500/20 text-cyan-400">
                                                    {rf.suggested_score} pts
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-gray-400">{rf.feedback}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <p className="text-sm text-gray-300 italic border-l-2 border-green-500 pl-3">
                                {feedback.closing_statement}
                            </p>
                        </CardContent>
                    </Card>

                    <Button
                        onClick={() => setFeedback(null)}
                        variant="outline"
                        size="sm"
                    >
                        Generate New Feedback
                    </Button>
                </div>
            )}
        </div>
    );
}

function ProjectFeedbackList({ submissions, projects, students, onUpdate }) {
    const [expandedId, setExpandedId] = useState(null);

    return (
        <div className="space-y-4">
            {submissions.map(submission => {
                const project = projects.find(p => p.id === submission.project_id);
                const student = students.find(s => s.id === submission.student_id);

                return (
                    <Card key={submission.id} className="bg-gray-900/50 border-cyan-500/30">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-white text-lg">{project?.title}</CardTitle>
                                    <p className="text-sm text-gray-400 mt-1">{student?.full_name}</p>
                                </div>
                                <Button
                                    onClick={() => setExpandedId(expandedId === submission.id ? null : submission.id)}
                                    variant="outline"
                                    size="sm"
                                >
                                    {expandedId === submission.id ? 'Hide' : 'Generate Feedback'}
                                </Button>
                            </div>
                        </CardHeader>
                        {expandedId === submission.id && (
                            <CardContent>
                                <ProjectFeedbackGenerator 
                                    submission={submission}
                                    project={project}
                                    student={student}
                                    onUpdate={onUpdate}
                                />
                            </CardContent>
                        )}
                    </Card>
                );
            })}
            {submissions.length === 0 && (
                <p className="text-center text-gray-400 py-8">No pending project submissions</p>
            )}
        </div>
    );
}

function ProjectFeedbackGenerator({ submission, project, student }) {
    const [generating, setGenerating] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const generateFeedback = async () => {
        setGenerating(true);
        try {
            const prompt = `As an experienced instructor, provide comprehensive feedback for this student project submission.

Project: ${project.title}
Learning Objectives: ${project.learning_objectives?.join(', ')}
Student: ${student.full_name}

Final Submission:
${submission.final_submission_text || 'No description provided'}

Rubric Categories:
${project.rubric?.categories?.map(c => `- ${c.category} (${c.weight_percentage}%): ${c.criteria?.join(', ')}`).join('\n')}

Provide detailed feedback including:
1. Overall project assessment
2. Strengths demonstrated
3. Areas needing improvement
4. Specific feedback for each rubric category
5. Suggestions for next steps
6. Encouraging closing remarks`;

            const result = await base44.integrations.Core.InvokeLLM({
                prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        overall_assessment: { type: "string" },
                        strengths: {
                            type: "array",
                            items: { type: "string" }
                        },
                        improvements: {
                            type: "array",
                            items: { type: "string" }
                        },
                        category_feedback: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    category: { type: "string" },
                                    score_percentage: { type: "number" },
                                    feedback: { type: "string" }
                                }
                            }
                        },
                        next_steps: {
                            type: "array",
                            items: { type: "string" }
                        },
                        closing_remarks: { type: "string" }
                    }
                }
            });

            setFeedback(result);
            toast.success('Feedback generated successfully');
        } catch (error) {
            toast.error('Failed to generate feedback');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="bg-gray-800/30 p-4 rounded">
                <h4 className="text-sm font-semibold text-gray-400 mb-2">Project Submission:</h4>
                <p className="text-sm text-gray-300">{submission.final_submission_text || 'No description'}</p>
            </div>

            {!feedback && (
                <Button
                    onClick={generateFeedback}
                    disabled={generating}
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                >
                    {generating ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating AI Feedback...
                        </>
                    ) : (
                        <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Generate AI Feedback Suggestions
                        </>
                    )}
                </Button>
            )}

            {feedback && (
                <Card className="bg-gradient-to-r from-green-500/10 to-cyan-500/10 border-green-500/30">
                    <CardContent className="pt-6 space-y-4">
                        <div>
                            <h4 className="text-lg font-semibold text-white mb-2">Overall Assessment</h4>
                            <p className="text-gray-300">{feedback.overall_assessment}</p>
                        </div>

                        <div>
                            <h5 className="text-sm font-semibold text-green-400 mb-2">Strengths:</h5>
                            <ul className="list-disc list-inside space-y-1">
                                {feedback.strengths?.map((s, idx) => (
                                    <li key={idx} className="text-sm text-gray-300">{s}</li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h5 className="text-sm font-semibold text-cyan-400 mb-2">Category Feedback:</h5>
                            <div className="space-y-2">
                                {feedback.category_feedback?.map((cf, idx) => (
                                    <div key={idx} className="bg-gray-800/50 p-3 rounded">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-white font-medium">{cf.category}</span>
                                            <Badge className="bg-cyan-500/20 text-cyan-400">
                                                {cf.score_percentage}%
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-gray-400">{cf.feedback}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <p className="text-sm text-gray-300 italic border-l-2 border-green-500 pl-3">
                            {feedback.closing_remarks}
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}