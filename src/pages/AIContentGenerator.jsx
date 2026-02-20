import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, FileText, ClipboardList, Briefcase, BookOpen, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AIContentGenerator() {
    const [courses, setCourses] = useState([]);
    const [modules, setModules] = useState([]);
    const [lessons, setLessons] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [coursesData, modulesData, lessonsData] = await Promise.all([
                base44.entities.Course.list(),
                base44.entities.Module.list(),
                base44.entities.Lesson.list()
            ]);
            setCourses(coursesData);
            setModules(modulesData);
            setLessons(lessonsData);
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
                    <h1 className="text-4xl font-bold text-cyan-300 mb-2">AI Content Generator</h1>
                    <p className="text-gray-400">Create detailed course content with AI assistance</p>
                </div>

                <Tabs defaultValue="lessons" className="w-full">
                    <TabsList className="bg-gray-900/50 border border-cyan-500/30">
                        <TabsTrigger value="lessons" className="data-[state=active]:bg-cyan-500/20">
                            <BookOpen className="h-4 w-4 mr-2" />
                            Lesson Plans
                        </TabsTrigger>
                        <TabsTrigger value="quizzes" className="data-[state=active]:bg-cyan-500/20">
                            <ClipboardList className="h-4 w-4 mr-2" />
                            Quizzes
                        </TabsTrigger>
                        <TabsTrigger value="assignments" className="data-[state=active]:bg-cyan-500/20">
                            <FileText className="h-4 w-4 mr-2" />
                            Assignments
                        </TabsTrigger>
                        <TabsTrigger value="projects" className="data-[state=active]:bg-cyan-500/20">
                            <Briefcase className="h-4 w-4 mr-2" />
                            Projects
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="lessons" className="mt-6">
                        <LessonPlanGenerator modules={modules} lessons={lessons} courses={courses} onUpdate={loadData} />
                    </TabsContent>

                    <TabsContent value="quizzes" className="mt-6">
                        <QuizGenerator modules={modules} courses={courses} onUpdate={loadData} />
                    </TabsContent>

                    <TabsContent value="assignments" className="mt-6">
                        <AssignmentGenerator modules={modules} courses={courses} onUpdate={loadData} />
                    </TabsContent>

                    <TabsContent value="projects" className="mt-6">
                        <ProjectGenerator courses={courses} modules={modules} onUpdate={loadData} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

function LessonPlanGenerator({ modules, lessons, courses, onUpdate }) {
    const [selectedModule, setSelectedModule] = useState('');
    const [lessonTitle, setLessonTitle] = useState('');
    const [learningObjectives, setLearningObjectives] = useState('');
    const [duration, setDuration] = useState('');
    const [generating, setGenerating] = useState(false);
    const [generatedPlan, setGeneratedPlan] = useState(null);

    const handleGenerate = async () => {
        if (!selectedModule || !lessonTitle || !learningObjectives) {
            toast.error('Please fill in all required fields');
            return;
        }

        setGenerating(true);
        try {
            const module = modules.find(m => m.id === selectedModule);
            const course = courses.find(c => c.id === module.course_id);

            const prompt = `Create a detailed lesson plan for a Solar Construction Technology course.

Lesson Title: ${lessonTitle}
Module: ${module.title}
Course Context: ${course?.title || 'Solar Construction Technology'}
Duration: ${duration || '60'} minutes
Learning Objectives: ${learningObjectives}
Module Topics: ${module.topics || ''}

Generate a comprehensive lesson plan including:
1. Detailed timing breakdown (warm-up, introduction, main activities, assessment, closure)
2. Materials and resources needed
3. Step-by-step instructional activities with timing
4. Teaching strategies and methods
5. Assessment methods and techniques
6. Student deliverables
7. Differentiation strategies for different learning levels
8. Safety considerations (if applicable)`;

            const result = await base44.integrations.Core.InvokeLLM({
                prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        lesson_day: { type: "integer" },
                        timing_breakdown: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    activity: { type: "string" },
                                    duration_minutes: { type: "integer" },
                                    description: { type: "string" }
                                }
                            }
                        },
                        materials_needed: {
                            type: "array",
                            items: { type: "string" }
                        },
                        instructional_activities: {
                            type: "array",
                            items: { type: "string" }
                        },
                        teaching_strategies: {
                            type: "array",
                            items: { type: "string" }
                        },
                        assessment_methods: {
                            type: "array",
                            items: { type: "string" }
                        },
                        student_deliverables: {
                            type: "array",
                            items: { type: "string" }
                        },
                        differentiation: {
                            type: "array",
                            items: { type: "string" }
                        },
                        safety_notes: {
                            type: "array",
                            items: { type: "string" }
                        }
                    }
                }
            });

            setGeneratedPlan(result);
            toast.success('Lesson plan generated successfully');
        } catch (error) {
            toast.error('Failed to generate lesson plan');
        } finally {
            setGenerating(false);
        }
    };

    const handleSave = async () => {
        try {
            const module = modules.find(m => m.id === selectedModule);
            
            await base44.entities.Lesson.create({
                module_id: selectedModule,
                lesson_day: generatedPlan.lesson_day || 1,
                title: lessonTitle,
                key_content_activities: generatedPlan.instructional_activities,
                student_deliverables: generatedPlan.student_deliverables
            });

            toast.success('Lesson plan saved successfully');
            setGeneratedPlan(null);
            setLessonTitle('');
            setLearningObjectives('');
            onUpdate();
        } catch (error) {
            toast.error('Failed to save lesson plan');
        }
    };

    return (
        <div className="space-y-6">
            <Card className="bg-gray-900/50 border-cyan-500/30">
                <CardHeader>
                    <CardTitle className="text-white">Generate Lesson Plan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="text-sm text-gray-400 mb-2 block">Select Module</label>
                        <Select value={selectedModule} onValueChange={setSelectedModule}>
                            <SelectTrigger className="bg-gray-800/50 border-cyan-500/30 text-white">
                                <SelectValue placeholder="Choose module..." />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-cyan-500/30">
                                {modules.map(module => (
                                    <SelectItem key={module.id} value={module.id}>
                                        Week {module.module_number}: {module.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <label className="text-sm text-gray-400 mb-2 block">Lesson Title</label>
                        <Input
                            value={lessonTitle}
                            onChange={(e) => setLessonTitle(e.target.value)}
                            placeholder="e.g., Introduction to Photovoltaic Systems"
                            className="bg-gray-800/50 border-cyan-500/30 text-white"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-gray-400 mb-2 block">Duration (minutes)</label>
                        <Input
                            type="number"
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            placeholder="60"
                            className="bg-gray-800/50 border-cyan-500/30 text-white"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-gray-400 mb-2 block">Learning Objectives</label>
                        <Textarea
                            value={learningObjectives}
                            onChange={(e) => setLearningObjectives(e.target.value)}
                            placeholder="List the learning objectives for this lesson..."
                            className="bg-gray-800/50 border-cyan-500/30 text-white min-h-[100px]"
                        />
                    </div>

                    <Button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                    >
                        {generating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Generate Lesson Plan
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {generatedPlan && (
                <Card className="bg-gray-900/50 border-green-500/30">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-white">Generated Lesson Plan</CardTitle>
                            <Button onClick={handleSave} className="bg-green-500 hover:bg-green-600">
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Save to Database
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-cyan-400 mb-3">Timing Breakdown</h3>
                            <div className="space-y-2">
                                {generatedPlan.timing_breakdown?.map((item, idx) => (
                                    <div key={idx} className="bg-gray-800/30 p-3 rounded">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-white font-medium">{item.activity}</span>
                                            <span className="text-cyan-400 text-sm">{item.duration_minutes} min</span>
                                        </div>
                                        <p className="text-sm text-gray-400">{item.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-cyan-400 mb-3">Materials Needed</h3>
                            <ul className="list-disc list-inside space-y-1">
                                {generatedPlan.materials_needed?.map((item, idx) => (
                                    <li key={idx} className="text-gray-300 text-sm">{item}</li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-cyan-400 mb-3">Teaching Strategies</h3>
                            <ul className="list-disc list-inside space-y-1">
                                {generatedPlan.teaching_strategies?.map((item, idx) => (
                                    <li key={idx} className="text-gray-300 text-sm">{item}</li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-cyan-400 mb-3">Assessment Methods</h3>
                            <ul className="list-disc list-inside space-y-1">
                                {generatedPlan.assessment_methods?.map((item, idx) => (
                                    <li key={idx} className="text-gray-300 text-sm">{item}</li>
                                ))}
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function QuizGenerator({ modules, courses, onUpdate }) {
    const [selectedModule, setSelectedModule] = useState('');
    const [quizTitle, setQuizTitle] = useState('');
    const [topics, setTopics] = useState('');
    const [numQuestions, setNumQuestions] = useState('10');
    const [generating, setGenerating] = useState(false);
    const [generatedQuiz, setGeneratedQuiz] = useState(null);

    const handleGenerate = async () => {
        if (!selectedModule || !quizTitle || !topics) {
            toast.error('Please fill in all required fields');
            return;
        }

        setGenerating(true);
        try {
            const module = modules.find(m => m.id === selectedModule);
            const course = courses.find(c => c.id === module.course_id);

            const prompt = `Create a comprehensive quiz for a Solar Construction Technology course.

Quiz Title: ${quizTitle}
Module: ${module.title}
Topics to Cover: ${topics}
Number of Questions: ${numQuestions}
Module Context: ${module.topics || ''}

Generate ${numQuestions} questions that:
1. Mix multiple choice and short answer questions
2. Test understanding at various cognitive levels (recall, comprehension, application, analysis)
3. Include practical scenarios when appropriate
4. Provide clear correct answers
5. Cover all specified topics evenly

For multiple choice questions, provide 4 options with one correct answer.`;

            const result = await base44.integrations.Core.InvokeLLM({
                prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        questions: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    question_text: { type: "string" },
                                    answer_type: {
                                        type: "string",
                                        enum: ["multiple_choice", "short_answer"]
                                    },
                                    options: {
                                        type: "array",
                                        items: { type: "string" }
                                    },
                                    correct_answer: { type: "string" },
                                    difficulty: {
                                        type: "string",
                                        enum: ["easy", "medium", "hard"]
                                    },
                                    cognitive_level: { type: "string" }
                                }
                            }
                        }
                    }
                }
            });

            setGeneratedQuiz(result);
            toast.success('Quiz generated successfully');
        } catch (error) {
            toast.error('Failed to generate quiz');
        } finally {
            setGenerating(false);
        }
    };

    const handleSave = async () => {
        try {
            const module = modules.find(m => m.id === selectedModule);
            
            await base44.entities.Quiz.create({
                module_id: selectedModule,
                week_number: module.module_number,
                title: quizTitle,
                questions: generatedQuiz.questions
            });

            toast.success('Quiz saved successfully');
            setGeneratedQuiz(null);
            setQuizTitle('');
            setTopics('');
            onUpdate();
        } catch (error) {
            toast.error('Failed to save quiz');
        }
    };

    return (
        <div className="space-y-6">
            <Card className="bg-gray-900/50 border-cyan-500/30">
                <CardHeader>
                    <CardTitle className="text-white">Generate Quiz</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="text-sm text-gray-400 mb-2 block">Select Module</label>
                        <Select value={selectedModule} onValueChange={setSelectedModule}>
                            <SelectTrigger className="bg-gray-800/50 border-cyan-500/30 text-white">
                                <SelectValue placeholder="Choose module..." />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-cyan-500/30">
                                {modules.map(module => (
                                    <SelectItem key={module.id} value={module.id}>
                                        Week {module.module_number}: {module.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <label className="text-sm text-gray-400 mb-2 block">Quiz Title</label>
                        <Input
                            value={quizTitle}
                            onChange={(e) => setQuizTitle(e.target.value)}
                            placeholder="e.g., Module 1 Assessment"
                            className="bg-gray-800/50 border-cyan-500/30 text-white"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-gray-400 mb-2 block">Topics to Cover</label>
                        <Textarea
                            value={topics}
                            onChange={(e) => setTopics(e.target.value)}
                            placeholder="List the specific topics this quiz should assess..."
                            className="bg-gray-800/50 border-cyan-500/30 text-white min-h-[100px]"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-gray-400 mb-2 block">Number of Questions</label>
                        <Input
                            type="number"
                            value={numQuestions}
                            onChange={(e) => setNumQuestions(e.target.value)}
                            className="bg-gray-800/50 border-cyan-500/30 text-white"
                        />
                    </div>

                    <Button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                    >
                        {generating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Generate Quiz
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {generatedQuiz && (
                <Card className="bg-gray-900/50 border-green-500/30">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-white">Generated Quiz ({generatedQuiz.questions.length} questions)</CardTitle>
                            <Button onClick={handleSave} className="bg-green-500 hover:bg-green-600">
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Save to Database
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {generatedQuiz.questions.map((q, idx) => (
                            <div key={idx} className="bg-gray-800/30 p-4 rounded">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-white font-medium">{idx + 1}. {q.question_text}</p>
                                    <span className="text-xs text-cyan-400">{q.difficulty}</span>
                                </div>
                                {q.answer_type === 'multiple_choice' && q.options && (
                                    <div className="ml-4 space-y-1 mb-2">
                                        {q.options.map((opt, optIdx) => (
                                            <p key={optIdx} className={`text-sm ${opt === q.correct_answer ? 'text-green-400 font-semibold' : 'text-gray-400'}`}>
                                                {String.fromCharCode(65 + optIdx)}. {opt}
                                            </p>
                                        ))}
                                    </div>
                                )}
                                <p className="text-xs text-green-400 mt-2">✓ {q.correct_answer}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function AssignmentGenerator({ modules, courses, onUpdate }) {
    const [selectedModule, setSelectedModule] = useState('');
    const [assignmentTitle, setAssignmentTitle] = useState('');
    const [learningObjectives, setLearningObjectives] = useState('');
    const [skillsFocus, setSkillsFocus] = useState('');
    const [generating, setGenerating] = useState(false);
    const [generatedAssignment, setGeneratedAssignment] = useState(null);

    const handleGenerate = async () => {
        if (!selectedModule || !assignmentTitle || !learningObjectives) {
            toast.error('Please fill in all required fields');
            return;
        }

        setGenerating(true);
        try {
            const module = modules.find(m => m.id === selectedModule);
            const course = courses.find(c => c.id === module.course_id);

            const prompt = `Create a practical assignment for a Solar Construction Technology course.

Assignment Title: ${assignmentTitle}
Module: ${module.title}
Learning Objectives: ${learningObjectives}
Skills to Practice: ${skillsFocus}
Module Topics: ${module.topics || ''}

Generate a detailed assignment that:
1. Requires practical application of learned concepts
2. Has clear, step-by-step instructions
3. Specifies expected deliverables
4. Includes a detailed rubric with specific criteria and point values
5. Maps directly to the learning objectives
6. Provides an estimated completion time

The rubric should have 4-6 criteria, each with clear descriptions and point values.`;

            const result = await base44.integrations.Core.InvokeLLM({
                prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        description: { type: "string" },
                        instructions: {
                            type: "array",
                            items: { type: "string" }
                        },
                        deliverables: {
                            type: "array",
                            items: { type: "string" }
                        },
                        learning_objectives_mapped: {
                            type: "array",
                            items: { type: "string" }
                        },
                        rubric: {
                            type: "object",
                            properties: {
                                criteria: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            name: { type: "string" },
                                            points: { type: "integer" },
                                            description: { type: "string" }
                                        }
                                    }
                                },
                                total_points: { type: "integer" }
                            }
                        },
                        estimated_hours: { type: "integer" }
                    }
                }
            });

            setGeneratedAssignment(result);
            toast.success('Assignment generated successfully');
        } catch (error) {
            toast.error('Failed to generate assignment');
        } finally {
            setGenerating(false);
        }
    };

    const handleSave = async () => {
        try {
            const module = modules.find(m => m.id === selectedModule);
            const course = courses.find(c => c.id === module.course_id);
            
            await base44.entities.Assignment.create({
                module_id: selectedModule,
                course_id: course.id,
                title: assignmentTitle,
                description: generatedAssignment.description,
                learning_objectives: generatedAssignment.learning_objectives_mapped,
                instructions: generatedAssignment.instructions,
                deliverables: generatedAssignment.deliverables,
                rubric: generatedAssignment.rubric,
                estimated_hours: generatedAssignment.estimated_hours
            });

            toast.success('Assignment saved successfully');
            setGeneratedAssignment(null);
            setAssignmentTitle('');
            setLearningObjectives('');
            setSkillsFocus('');
            onUpdate();
        } catch (error) {
            toast.error('Failed to save assignment');
        }
    };

    return (
        <div className="space-y-6">
            <Card className="bg-gray-900/50 border-cyan-500/30">
                <CardHeader>
                    <CardTitle className="text-white">Generate Assignment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="text-sm text-gray-400 mb-2 block">Select Module</label>
                        <Select value={selectedModule} onValueChange={setSelectedModule}>
                            <SelectTrigger className="bg-gray-800/50 border-cyan-500/30 text-white">
                                <SelectValue placeholder="Choose module..." />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-cyan-500/30">
                                {modules.map(module => (
                                    <SelectItem key={module.id} value={module.id}>
                                        Week {module.module_number}: {module.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <label className="text-sm text-gray-400 mb-2 block">Assignment Title</label>
                        <Input
                            value={assignmentTitle}
                            onChange={(e) => setAssignmentTitle(e.target.value)}
                            placeholder="e.g., Solar Panel Installation Plan"
                            className="bg-gray-800/50 border-cyan-500/30 text-white"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-gray-400 mb-2 block">Learning Objectives</label>
                        <Textarea
                            value={learningObjectives}
                            onChange={(e) => setLearningObjectives(e.target.value)}
                            placeholder="What should students learn from this assignment?"
                            className="bg-gray-800/50 border-cyan-500/30 text-white min-h-[100px]"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-gray-400 mb-2 block">Skills Focus</label>
                        <Textarea
                            value={skillsFocus}
                            onChange={(e) => setSkillsFocus(e.target.value)}
                            placeholder="What practical skills should students demonstrate?"
                            className="bg-gray-800/50 border-cyan-500/30 text-white"
                        />
                    </div>

                    <Button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                    >
                        {generating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Generate Assignment
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {generatedAssignment && (
                <Card className="bg-gray-900/50 border-green-500/30">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-white">Generated Assignment</CardTitle>
                            <Button onClick={handleSave} className="bg-green-500 hover:bg-green-600">
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Save to Database
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-cyan-400 mb-2">Description</h3>
                            <p className="text-gray-300">{generatedAssignment.description}</p>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-cyan-400 mb-2">Instructions</h3>
                            <ol className="list-decimal list-inside space-y-1">
                                {generatedAssignment.instructions?.map((item, idx) => (
                                    <li key={idx} className="text-gray-300 text-sm">{item}</li>
                                ))}
                            </ol>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-cyan-400 mb-2">Grading Rubric ({generatedAssignment.rubric?.total_points} points)</h3>
                            <div className="space-y-2">
                                {generatedAssignment.rubric?.criteria?.map((criterion, idx) => (
                                    <div key={idx} className="bg-gray-800/30 p-3 rounded">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-white font-medium">{criterion.name}</span>
                                            <span className="text-cyan-400">{criterion.points} pts</span>
                                        </div>
                                        <p className="text-sm text-gray-400">{criterion.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function ProjectGenerator({ courses, modules, onUpdate }) {
    const [selectedCourse, setSelectedCourse] = useState('');
    const [projectTitle, setProjectTitle] = useState('');
    const [learningObjectives, setLearningObjectives] = useState('');
    const [scope, setScope] = useState('');
    const [generating, setGenerating] = useState(false);
    const [generatedProject, setGeneratedProject] = useState(null);

    const handleGenerate = async () => {
        if (!selectedCourse || !projectTitle || !learningObjectives) {
            toast.error('Please fill in all required fields');
            return;
        }

        setGenerating(true);
        try {
            const course = courses.find(c => c.id === selectedCourse);

            const prompt = `Create a comprehensive project for a Solar Construction Technology course.

Project Title: ${projectTitle}
Course: ${course.title}
Learning Objectives: ${learningObjectives}
Project Scope: ${scope}

Generate a detailed project plan that includes:
1. Project overview and purpose
2. 3-5 distinct phases with specific deliverables for each
3. Final project deliverables
4. Comprehensive rubric with weighted categories
5. Required resources and tools
6. Realistic time estimates for each phase

The rubric should have weighted categories that sum to 100% and specific criteria for evaluation.`;

            const result = await base44.integrations.Core.InvokeLLM({
                prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        overview: { type: "string" },
                        learning_objectives_addressed: {
                            type: "array",
                            items: { type: "string" }
                        },
                        phases: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    phase_name: { type: "string" },
                                    description: { type: "string" },
                                    deliverables: {
                                        type: "array",
                                        items: { type: "string" }
                                    },
                                    estimated_hours: { type: "integer" }
                                }
                            }
                        },
                        final_deliverables: {
                            type: "array",
                            items: { type: "string" }
                        },
                        rubric: {
                            type: "object",
                            properties: {
                                categories: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            category: { type: "string" },
                                            weight_percentage: { type: "integer" },
                                            criteria: {
                                                type: "array",
                                                items: { type: "string" }
                                            }
                                        }
                                    }
                                },
                                total_points: { type: "integer" }
                            }
                        },
                        resources: {
                            type: "array",
                            items: { type: "string" }
                        }
                    }
                }
            });

            setGeneratedProject(result);
            toast.success('Project generated successfully');
        } catch (error) {
            toast.error('Failed to generate project');
        } finally {
            setGenerating(false);
        }
    };

    const handleSave = async () => {
        try {
            await base44.entities.Project.create({
                course_id: selectedCourse,
                title: projectTitle,
                overview: generatedProject.overview,
                learning_objectives: generatedProject.learning_objectives_addressed,
                scope: scope,
                phases: generatedProject.phases,
                final_deliverables: generatedProject.final_deliverables,
                rubric: generatedProject.rubric,
                resources: generatedProject.resources
            });

            toast.success('Project saved successfully');
            setGeneratedProject(null);
            setProjectTitle('');
            setLearningObjectives('');
            setScope('');
            onUpdate();
        } catch (error) {
            toast.error('Failed to save project');
        }
    };

    return (
        <div className="space-y-6">
            <Card className="bg-gray-900/50 border-cyan-500/30">
                <CardHeader>
                    <CardTitle className="text-white">Generate Project</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="text-sm text-gray-400 mb-2 block">Select Course</label>
                        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                            <SelectTrigger className="bg-gray-800/50 border-cyan-500/30 text-white">
                                <SelectValue placeholder="Choose course..." />
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

                    <div>
                        <label className="text-sm text-gray-400 mb-2 block">Project Title</label>
                        <Input
                            value={projectTitle}
                            onChange={(e) => setProjectTitle(e.target.value)}
                            placeholder="e.g., Complete Solar Installation Design & Implementation"
                            className="bg-gray-800/50 border-cyan-500/30 text-white"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-gray-400 mb-2 block">Learning Objectives</label>
                        <Textarea
                            value={learningObjectives}
                            onChange={(e) => setLearningObjectives(e.target.value)}
                            placeholder="What comprehensive skills and knowledge should this project develop?"
                            className="bg-gray-800/50 border-cyan-500/30 text-white min-h-[100px]"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-gray-400 mb-2 block">Project Scope</label>
                        <Textarea
                            value={scope}
                            onChange={(e) => setScope(e.target.value)}
                            placeholder="Define the boundaries and requirements of the project..."
                            className="bg-gray-800/50 border-cyan-500/30 text-white"
                        />
                    </div>

                    <Button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                    >
                        {generating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Generate Project
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {generatedProject && (
                <Card className="bg-gray-900/50 border-green-500/30">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-white">Generated Project</CardTitle>
                            <Button onClick={handleSave} className="bg-green-500 hover:bg-green-600">
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Save to Database
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-cyan-400 mb-2">Overview</h3>
                            <p className="text-gray-300">{generatedProject.overview}</p>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-cyan-400 mb-3">Project Phases</h3>
                            <div className="space-y-3">
                                {generatedProject.phases?.map((phase, idx) => (
                                    <div key={idx} className="bg-gray-800/30 p-4 rounded">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="text-white font-medium">{phase.phase_name}</h4>
                                            <span className="text-cyan-400 text-sm">{phase.estimated_hours}h</span>
                                        </div>
                                        <p className="text-sm text-gray-400 mb-2">{phase.description}</p>
                                        <div className="text-sm">
                                            <p className="text-gray-500 mb-1">Deliverables:</p>
                                            <ul className="list-disc list-inside text-gray-300">
                                                {phase.deliverables?.map((d, dIdx) => (
                                                    <li key={dIdx}>{d}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-cyan-400 mb-2">Grading Rubric ({generatedProject.rubric?.total_points} points)</h3>
                            <div className="space-y-2">
                                {generatedProject.rubric?.categories?.map((cat, idx) => (
                                    <div key={idx} className="bg-gray-800/30 p-3 rounded">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-white font-medium">{cat.category}</span>
                                            <span className="text-cyan-400">{cat.weight_percentage}%</span>
                                        </div>
                                        <ul className="list-disc list-inside text-sm text-gray-400">
                                            {cat.criteria?.map((c, cIdx) => (
                                                <li key={cIdx}>{c}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}