import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, FileText, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function StudentSubmissions() {
    const [user, setUser] = useState(null);
    const [student, setStudent] = useState(null);
    const [enrollments, setEnrollments] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [projects, setProjects] = useState([]);
    const [assignmentSubmissions, setAssignmentSubmissions] = useState([]);
    const [projectSubmissions, setProjectSubmissions] = useState([]);
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

                const [enrollmentsData, assignmentsData, projectsData, assignmentSubsData, projectSubsData] = await Promise.all([
                    base44.entities.Enrollment.filter({ student_id: studentRecord.id }),
                    base44.entities.Assignment.list(),
                    base44.entities.Project.list(),
                    base44.entities.AssignmentSubmission.filter({ student_id: studentRecord.id }),
                    base44.entities.ProjectSubmission.filter({ student_id: studentRecord.id })
                ]);

                setEnrollments(enrollmentsData);
                setAssignments(assignmentsData);
                setProjects(projectsData);
                setAssignmentSubmissions(assignmentSubsData);
                setProjectSubmissions(projectSubsData);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const configs = {
            draft: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/50', label: 'Draft' },
            submitted: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', label: 'Submitted' },
            graded: { color: 'bg-green-500/20 text-green-400 border-green-500/50', label: 'Graded' },
            needs_revision: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/50', label: 'Needs Revision' },
            resubmitted: { color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50', label: 'Resubmitted' }
        };
        const config = configs[status] || configs.draft;
        return <Badge className={config.color}>{config.label}</Badge>;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900">
                <Loader2 className="h-12 w-12 text-cyan-400 animate-spin" />
            </div>
        );
    }

    if (!student) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 p-6">
                <Card className="max-w-2xl mx-auto bg-gray-900/50 border-orange-500/30">
                    <CardContent className="py-16 text-center">
                        <AlertCircle className="h-16 w-16 text-orange-400 mx-auto mb-4" />
                        <p className="text-white text-lg">No student record found for your account.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 text-white p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-cyan-300 mb-2">My Submissions</h1>
                    <p className="text-gray-400">Submit and track your assignments and projects</p>
                </div>

                <Tabs defaultValue="assignments" className="w-full">
                    <TabsList className="bg-gray-900/50 border border-cyan-500/30">
                        <TabsTrigger value="assignments" className="data-[state=active]:bg-cyan-500/20">
                            Assignments
                        </TabsTrigger>
                        <TabsTrigger value="projects" className="data-[state=active]:bg-cyan-500/20">
                            Projects
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="assignments" className="mt-6">
                        <AssignmentsList
                            assignments={assignments}
                            submissions={assignmentSubmissions}
                            enrollments={enrollments}
                            student={student}
                            onUpdate={loadData}
                            getStatusBadge={getStatusBadge}
                        />
                    </TabsContent>

                    <TabsContent value="projects" className="mt-6">
                        <ProjectsList
                            projects={projects}
                            submissions={projectSubmissions}
                            enrollments={enrollments}
                            student={student}
                            onUpdate={loadData}
                            getStatusBadge={getStatusBadge}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

function AssignmentsList({ assignments, submissions, enrollments, student, onUpdate, getStatusBadge }) {
    const [expandedId, setExpandedId] = useState(null);

    const enrolledCourseIds = enrollments.map(e => e.course_id);
    const availableAssignments = assignments.filter(a => enrolledCourseIds.includes(a.course_id));

    return (
        <div className="space-y-4">
            {availableAssignments.map(assignment => {
                const submission = submissions.find(s => s.assignment_id === assignment.id);
                const enrollment = enrollments.find(e => e.course_id === assignment.course_id);

                return (
                    <Card key={assignment.id} className="bg-gray-900/50 border-cyan-500/30">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <CardTitle className="text-white mb-2">{assignment.title}</CardTitle>
                                    <p className="text-sm text-gray-400">{assignment.description}</p>
                                </div>
                                {getStatusBadge(submission?.status || 'draft')}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {submission?.status === 'graded' && (
                                <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded">
                                    <p className="text-green-400 font-semibold">
                                        Grade: {submission.grade}/{assignment.rubric?.total_points || 100}
                                    </p>
                                    {submission.instructor_feedback && (
                                        <p className="text-sm text-gray-300 mt-2">{submission.instructor_feedback}</p>
                                    )}
                                </div>
                            )}

                            <Button
                                onClick={() => setExpandedId(expandedId === assignment.id ? null : assignment.id)}
                                variant="outline"
                                className="border-cyan-500/50 text-cyan-400"
                            >
                                {expandedId === assignment.id ? 'Hide' : 'View'} Details & Submit
                            </Button>

                            {expandedId === assignment.id && (
                                <AssignmentSubmissionForm
                                    assignment={assignment}
                                    submission={submission}
                                    studentId={student.id}
                                    enrollmentId={enrollment.id}
                                    onUpdate={onUpdate}
                                />
                            )}
                        </CardContent>
                    </Card>
                );
            })}

            {availableAssignments.length === 0 && (
                <Card className="bg-gray-900/30 border-cyan-500/20">
                    <CardContent className="py-16 text-center">
                        <FileText className="h-16 w-16 text-cyan-400/30 mx-auto mb-4" />
                        <p className="text-gray-500">No assignments available</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function AssignmentSubmissionForm({ assignment, submission, studentId, enrollmentId, onUpdate }) {
    const [text, setText] = useState(submission?.submission_text || '');
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);

    const handleFileUpload = async (e) => {
        const selectedFiles = Array.from(e.target.files);
        setUploading(true);

        try {
            const uploadPromises = selectedFiles.map(file => 
                base44.integrations.Core.UploadFile({ file })
            );
            const results = await Promise.all(uploadPromises);
            const newUrls = results.map(r => r.file_url);
            setFiles([...(submission?.file_urls || []), ...newUrls]);
            toast.success('Files uploaded successfully');
        } catch (error) {
            toast.error('Failed to upload files');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            const data = {
                assignment_id: assignment.id,
                student_id: studentId,
                enrollment_id: enrollmentId,
                submission_text: text,
                file_urls: files,
                status: 'submitted',
                submitted_date: new Date().toISOString()
            };

            if (submission) {
                await base44.entities.AssignmentSubmission.update(submission.id, data);
            } else {
                await base44.entities.AssignmentSubmission.create(data);
            }

            toast.success('Assignment submitted successfully');
            onUpdate();
        } catch (error) {
            toast.error('Failed to submit assignment');
        }
    };

    return (
        <div className="mt-4 space-y-4">
            <div>
                <label className="text-sm text-gray-400 mb-2 block">Submission Text</label>
                <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter your submission..."
                    className="bg-gray-800/50 border-cyan-500/30 text-white min-h-[150px]"
                    disabled={submission?.status === 'graded'}
                />
            </div>

            <div>
                <label className="text-sm text-gray-400 mb-2 block">Files</label>
                <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id={`file-upload-${assignment.id}`}
                    disabled={uploading || submission?.status === 'graded'}
                />
                <label htmlFor={`file-upload-${assignment.id}`}>
                    <Button
                        type="button"
                        variant="outline"
                        className="border-cyan-500/50 text-cyan-400"
                        disabled={uploading || submission?.status === 'graded'}
                        asChild
                    >
                        <span>
                            <Upload className="h-4 w-4 mr-2" />
                            {uploading ? 'Uploading...' : 'Upload Files'}
                        </span>
                    </Button>
                </label>
                {files.length > 0 && (
                    <p className="text-xs text-gray-400 mt-2">{files.length} file(s) attached</p>
                )}
            </div>

            {submission?.status !== 'graded' && (
                <Button
                    onClick={handleSubmit}
                    className="bg-cyan-500 hover:bg-cyan-600 text-black"
                >
                    <Send className="h-4 w-4 mr-2" />
                    Submit Assignment
                </Button>
            )}
        </div>
    );
}

function ProjectsList({ projects, submissions, enrollments, student, onUpdate, getStatusBadge }) {
    const [expandedId, setExpandedId] = useState(null);

    const enrolledCourseIds = enrollments.map(e => e.course_id);
    const availableProjects = projects.filter(p => enrolledCourseIds.includes(p.course_id));

    return (
        <div className="space-y-4">
            {availableProjects.map(project => {
                const submission = submissions.find(s => s.project_id === project.id);
                const enrollment = enrollments.find(e => e.course_id === project.course_id);

                return (
                    <Card key={project.id} className="bg-gray-900/50 border-cyan-500/30">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <CardTitle className="text-white mb-2">{project.title}</CardTitle>
                                    <p className="text-sm text-gray-400">{project.overview}</p>
                                </div>
                                {getStatusBadge(submission?.status || 'not_started')}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {submission?.status === 'graded' && (
                                <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded">
                                    <p className="text-green-400 font-semibold">
                                        Grade: {submission.grade}/{project.rubric?.total_points || 100}
                                    </p>
                                    {submission.instructor_feedback && (
                                        <p className="text-sm text-gray-300 mt-2">{submission.instructor_feedback}</p>
                                    )}
                                </div>
                            )}

                            <Button
                                onClick={() => setExpandedId(expandedId === project.id ? null : project.id)}
                                variant="outline"
                                className="border-cyan-500/50 text-cyan-400"
                            >
                                {expandedId === project.id ? 'Hide' : 'View'} Details & Submit
                            </Button>

                            {expandedId === project.id && (
                                <ProjectSubmissionForm
                                    project={project}
                                    submission={submission}
                                    studentId={student.id}
                                    enrollmentId={enrollment.id}
                                    onUpdate={onUpdate}
                                />
                            )}
                        </CardContent>
                    </Card>
                );
            })}

            {availableProjects.length === 0 && (
                <Card className="bg-gray-900/30 border-cyan-500/20">
                    <CardContent className="py-16 text-center">
                        <FileText className="h-16 w-16 text-cyan-400/30 mx-auto mb-4" />
                        <p className="text-gray-500">No projects available</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function ProjectSubmissionForm({ project, submission, studentId, enrollmentId, onUpdate }) {
    const [text, setText] = useState(submission?.final_submission_text || '');
    const [files, setFiles] = useState(submission?.final_file_urls || []);
    const [uploading, setUploading] = useState(false);

    const handleFileUpload = async (e) => {
        const selectedFiles = Array.from(e.target.files);
        setUploading(true);

        try {
            const uploadPromises = selectedFiles.map(file => 
                base44.integrations.Core.UploadFile({ file })
            );
            const results = await Promise.all(uploadPromises);
            const newUrls = results.map(r => r.file_url);
            setFiles([...files, ...newUrls]);
            toast.success('Files uploaded successfully');
        } catch (error) {
            toast.error('Failed to upload files');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            const data = {
                project_id: project.id,
                student_id: studentId,
                enrollment_id: enrollmentId,
                final_submission_text: text,
                final_file_urls: files,
                status: 'submitted',
                submitted_date: new Date().toISOString()
            };

            if (submission) {
                await base44.entities.ProjectSubmission.update(submission.id, data);
            } else {
                await base44.entities.ProjectSubmission.create(data);
            }

            toast.success('Project submitted successfully');
            onUpdate();
        } catch (error) {
            toast.error('Failed to submit project');
        }
    };

    return (
        <div className="mt-4 space-y-4">
            <div>
                <label className="text-sm text-gray-400 mb-2 block">Final Submission</label>
                <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Describe your project and outcomes..."
                    className="bg-gray-800/50 border-cyan-500/30 text-white min-h-[200px]"
                    disabled={submission?.status === 'graded'}
                />
            </div>

            <div>
                <label className="text-sm text-gray-400 mb-2 block">Project Files</label>
                <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id={`project-upload-${project.id}`}
                    disabled={uploading || submission?.status === 'graded'}
                />
                <label htmlFor={`project-upload-${project.id}`}>
                    <Button
                        type="button"
                        variant="outline"
                        className="border-cyan-500/50 text-cyan-400"
                        disabled={uploading || submission?.status === 'graded'}
                        asChild
                    >
                        <span>
                            <Upload className="h-4 w-4 mr-2" />
                            {uploading ? 'Uploading...' : 'Upload Files'}
                        </span>
                    </Button>
                </label>
                {files.length > 0 && (
                    <p className="text-xs text-gray-400 mt-2">{files.length} file(s) attached</p>
                )}
            </div>

            {submission?.status !== 'graded' && (
                <Button
                    onClick={handleSubmit}
                    className="bg-cyan-500 hover:bg-cyan-600 text-black"
                >
                    <Send className="h-4 w-4 mr-2" />
                    Submit Project
                </Button>
            )}
        </div>
    );
}