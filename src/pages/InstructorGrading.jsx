import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function InstructorGrading() {
    const [assignmentSubmissions, setAssignmentSubmissions] = useState([]);
    const [projectSubmissions, setProjectSubmissions] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [projects, setProjects] = useState([]);
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const currentUser = await base44.auth.me();
            setUser(currentUser);

            const [assignmentSubsData, projectSubsData, assignmentsData, projectsData, studentsData] = await Promise.all([
                base44.entities.AssignmentSubmission.filter({ status: 'submitted' }),
                base44.entities.ProjectSubmission.filter({ status: 'submitted' }),
                base44.entities.Assignment.list(),
                base44.entities.Project.list(),
                base44.entities.Student.list()
            ]);

            setAssignmentSubmissions(assignmentSubsData);
            setProjectSubmissions(projectSubsData);
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
                    <h1 className="text-4xl font-bold text-cyan-300 mb-2">Grade Submissions</h1>
                    <p className="text-gray-400">Review and grade student work using rubrics</p>
                </div>

                <Tabs defaultValue="assignments" className="w-full">
                    <TabsList className="bg-gray-900/50 border border-cyan-500/30">
                        <TabsTrigger value="assignments" className="data-[state=active]:bg-cyan-500/20">
                            Assignments ({assignmentSubmissions.length})
                        </TabsTrigger>
                        <TabsTrigger value="projects" className="data-[state=active]:bg-cyan-500/20">
                            Projects ({projectSubmissions.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="assignments" className="mt-6">
                        <AssignmentGradingList
                            submissions={assignmentSubmissions}
                            assignments={assignments}
                            students={students}
                            user={user}
                            onUpdate={loadData}
                        />
                    </TabsContent>

                    <TabsContent value="projects" className="mt-6">
                        <ProjectGradingList
                            submissions={projectSubmissions}
                            projects={projects}
                            students={students}
                            user={user}
                            onUpdate={loadData}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

function AssignmentGradingList({ submissions, assignments, students, user, onUpdate }) {
    const [expandedId, setExpandedId] = useState(null);

    return (
        <div className="space-y-4">
            {submissions.map(submission => {
                const assignment = assignments.find(a => a.id === submission.assignment_id);
                const student = students.find(s => s.id === submission.student_id);

                if (!assignment || !student) return null;

                return (
                    <Card key={submission.id} className="bg-gray-900/50 border-cyan-500/30">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-white mb-1">{assignment.title}</CardTitle>
                                    <p className="text-sm text-gray-400">Student: {student.full_name}</p>
                                    <p className="text-xs text-gray-500">
                                        Submitted: {new Date(submission.submitted_date).toLocaleString()}
                                    </p>
                                </div>
                                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                                    Awaiting Grade
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4 p-3 bg-gray-800/50 rounded">
                                <p className="text-sm text-white">{submission.submission_text}</p>
                                {submission.file_urls && submission.file_urls.length > 0 && (
                                    <div className="mt-2">
                                        <p className="text-xs text-gray-400 mb-1">Attachments:</p>
                                        {submission.file_urls.map((url, idx) => (
                                            <a
                                                key={idx}
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-cyan-400 hover:underline block"
                                            >
                                                <Download className="h-3 w-3 inline mr-1" />
                                                File {idx + 1}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <Button
                                onClick={() => setExpandedId(expandedId === submission.id ? null : submission.id)}
                                className="bg-cyan-500 hover:bg-cyan-600 text-black"
                            >
                                {expandedId === submission.id ? 'Hide' : 'Show'} Grading Form
                            </Button>

                            {expandedId === submission.id && (
                                <AssignmentGradingForm
                                    submission={submission}
                                    assignment={assignment}
                                    user={user}
                                    onUpdate={onUpdate}
                                />
                            )}
                        </CardContent>
                    </Card>
                );
            })}

            {submissions.length === 0 && (
                <Card className="bg-gray-900/30 border-cyan-500/20">
                    <CardContent className="py-16 text-center">
                        <CheckCircle2 className="h-16 w-16 text-green-400/30 mx-auto mb-4" />
                        <p className="text-gray-500">No pending assignment submissions</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function AssignmentGradingForm({ submission, assignment, user, onUpdate }) {
    const [rubricScores, setRubricScores] = useState(
        assignment.rubric?.criteria?.map(c => ({
            criterion_name: c.name,
            points_earned: 0,
            points_possible: c.points,
            feedback: ''
        })) || []
    );
    const [feedback, setFeedback] = useState('');
    const [grading, setGrading] = useState(false);

    const totalGrade = rubricScores.reduce((sum, s) => sum + (s.points_earned || 0), 0);

    const handleGrade = async () => {
        setGrading(true);
        try {
            await base44.entities.AssignmentSubmission.update(submission.id, {
                status: 'graded',
                grade: totalGrade,
                rubric_scores: rubricScores,
                instructor_feedback: feedback,
                graded_by: user.email,
                graded_date: new Date().toISOString()
            });

            toast.success('Assignment graded successfully');
            onUpdate();
        } catch (error) {
            toast.error('Failed to save grade');
        } finally {
            setGrading(false);
        }
    };

    return (
        <div className="mt-4 space-y-4 border-t border-cyan-500/20 pt-4">
            <div>
                <h4 className="text-white font-semibold mb-3">Rubric Scoring</h4>
                {rubricScores.map((score, idx) => (
                    <div key={idx} className="mb-4 p-3 bg-gray-800/30 rounded">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-sm text-white font-medium">{score.criterion_name}</p>
                            <p className="text-xs text-gray-400">Max: {score.points_possible} pts</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Points Earned</label>
                                <Input
                                    type="number"
                                    min="0"
                                    max={score.points_possible}
                                    value={score.points_earned}
                                    onChange={(e) => {
                                        const newScores = [...rubricScores];
                                        newScores[idx].points_earned = parseFloat(e.target.value) || 0;
                                        setRubricScores(newScores);
                                    }}
                                    className="bg-gray-900/50 border-cyan-500/30 text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Feedback</label>
                                <Input
                                    value={score.feedback}
                                    onChange={(e) => {
                                        const newScores = [...rubricScores];
                                        newScores[idx].feedback = e.target.value;
                                        setRubricScores(newScores);
                                    }}
                                    placeholder="Optional feedback"
                                    className="bg-gray-900/50 border-cyan-500/30 text-white"
                                />
                            </div>
                        </div>
                    </div>
                ))}

                <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded">
                    <p className="text-lg font-bold text-cyan-400">
                        Total Grade: {totalGrade} / {assignment.rubric?.total_points || 100}
                    </p>
                </div>
            </div>

            <div>
                <label className="text-sm text-gray-400 mb-2 block">Overall Feedback</label>
                <Textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Provide overall feedback for the student..."
                    className="bg-gray-800/50 border-cyan-500/30 text-white min-h-[100px]"
                />
            </div>

            <Button
                onClick={handleGrade}
                disabled={grading}
                className="bg-green-500 hover:bg-green-600 text-white"
            >
                {grading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Submit Grade
            </Button>
        </div>
    );
}

function ProjectGradingList({ submissions, projects, students, user, onUpdate }) {
    const [expandedId, setExpandedId] = useState(null);

    return (
        <div className="space-y-4">
            {submissions.map(submission => {
                const project = projects.find(p => p.id === submission.project_id);
                const student = students.find(s => s.id === submission.student_id);

                if (!project || !student) return null;

                return (
                    <Card key={submission.id} className="bg-gray-900/50 border-cyan-500/30">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-white mb-1">{project.title}</CardTitle>
                                    <p className="text-sm text-gray-400">Student: {student.full_name}</p>
                                    <p className="text-xs text-gray-500">
                                        Submitted: {new Date(submission.submitted_date).toLocaleString()}
                                    </p>
                                </div>
                                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                                    Awaiting Grade
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4 p-3 bg-gray-800/50 rounded">
                                <p className="text-sm text-white">{submission.final_submission_text}</p>
                                {submission.final_file_urls && submission.final_file_urls.length > 0 && (
                                    <div className="mt-2">
                                        <p className="text-xs text-gray-400 mb-1">Attachments:</p>
                                        {submission.final_file_urls.map((url, idx) => (
                                            <a
                                                key={idx}
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-cyan-400 hover:underline block"
                                            >
                                                <Download className="h-3 w-3 inline mr-1" />
                                                File {idx + 1}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <Button
                                onClick={() => setExpandedId(expandedId === submission.id ? null : submission.id)}
                                className="bg-cyan-500 hover:bg-cyan-600 text-black"
                            >
                                {expandedId === submission.id ? 'Hide' : 'Show'} Grading Form
                            </Button>

                            {expandedId === submission.id && (
                                <ProjectGradingForm
                                    submission={submission}
                                    project={project}
                                    user={user}
                                    onUpdate={onUpdate}
                                />
                            )}
                        </CardContent>
                    </Card>
                );
            })}

            {submissions.length === 0 && (
                <Card className="bg-gray-900/30 border-cyan-500/20">
                    <CardContent className="py-16 text-center">
                        <CheckCircle2 className="h-16 w-16 text-green-400/30 mx-auto mb-4" />
                        <p className="text-gray-500">No pending project submissions</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function ProjectGradingForm({ submission, project, user, onUpdate }) {
    const [rubricScores, setRubricScores] = useState(
        project.rubric?.categories?.map(c => ({
            category: c.category,
            points_earned: 0,
            points_possible: (project.rubric.total_points * c.weight_percentage) / 100,
            feedback: ''
        })) || []
    );
    const [feedback, setFeedback] = useState('');
    const [grading, setGrading] = useState(false);

    const totalGrade = rubricScores.reduce((sum, s) => sum + (s.points_earned || 0), 0);

    const handleGrade = async () => {
        setGrading(true);
        try {
            await base44.entities.ProjectSubmission.update(submission.id, {
                status: 'graded',
                grade: totalGrade,
                rubric_scores: rubricScores,
                instructor_feedback: feedback,
                graded_by: user.email,
                graded_date: new Date().toISOString()
            });

            toast.success('Project graded successfully');
            onUpdate();
        } catch (error) {
            toast.error('Failed to save grade');
        } finally {
            setGrading(false);
        }
    };

    return (
        <div className="mt-4 space-y-4 border-t border-cyan-500/20 pt-4">
            <div>
                <h4 className="text-white font-semibold mb-3">Rubric Scoring</h4>
                {rubricScores.map((score, idx) => (
                    <div key={idx} className="mb-4 p-3 bg-gray-800/30 rounded">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-sm text-white font-medium">{score.category}</p>
                            <p className="text-xs text-gray-400">Max: {score.points_possible.toFixed(0)} pts</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Points Earned</label>
                                <Input
                                    type="number"
                                    min="0"
                                    max={score.points_possible}
                                    value={score.points_earned}
                                    onChange={(e) => {
                                        const newScores = [...rubricScores];
                                        newScores[idx].points_earned = parseFloat(e.target.value) || 0;
                                        setRubricScores(newScores);
                                    }}
                                    className="bg-gray-900/50 border-cyan-500/30 text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Feedback</label>
                                <Input
                                    value={score.feedback}
                                    onChange={(e) => {
                                        const newScores = [...rubricScores];
                                        newScores[idx].feedback = e.target.value;
                                        setRubricScores(newScores);
                                    }}
                                    placeholder="Optional feedback"
                                    className="bg-gray-900/50 border-cyan-500/30 text-white"
                                />
                            </div>
                        </div>
                    </div>
                ))}

                <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded">
                    <p className="text-lg font-bold text-cyan-400">
                        Total Grade: {totalGrade.toFixed(0)} / {project.rubric?.total_points || 100}
                    </p>
                </div>
            </div>

            <div>
                <label className="text-sm text-gray-400 mb-2 block">Overall Feedback</label>
                <Textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Provide overall feedback for the student..."
                    className="bg-gray-800/50 border-cyan-500/30 text-white min-h-[100px]"
                />
            </div>

            <Button
                onClick={handleGrade}
                disabled={grading}
                className="bg-green-500 hover:bg-green-600 text-white"
            >
                {grading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Submit Grade
            </Button>
        </div>
    );
}