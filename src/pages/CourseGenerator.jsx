import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, CheckCircle2, BookOpen, Calendar, ClipboardList, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';

export default function CourseGenerator() {
    const [courseTitle, setCourseTitle] = useState('');
    const [learningObjectives, setLearningObjectives] = useState('');
    const [curriculumOutline, setCurriculumOutline] = useState('');
    const [clockHours, setClockHours] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedCourse, setGeneratedCourse] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleGenerate = async () => {
        if (!courseTitle || !learningObjectives) {
            toast.error('Please provide at least a course title and learning objectives');
            return;
        }

        setIsGenerating(true);
        setGeneratedCourse(null);

        try {
            const prompt = `You are an expert curriculum designer and instructional developer. Create a comprehensive course structure based on the following:

Course Title: ${courseTitle}
Total Clock Hours: ${clockHours || 'Not specified'}
Learning Objectives: ${learningObjectives}
${curriculumOutline ? `Curriculum Outline: ${curriculumOutline}` : ''}

Generate a detailed course structure with:
1. Course description and metadata
2. Modules (weeks) - each with a title, topics, and module number
3. Lessons for each module - each with:
   - Title, day number
   - Key content/activities and student deliverables
   - Detailed instructor lesson plan with timing, materials needed, teaching strategies, and assessment methods
4. Quizzes for each module - include 5-10 questions per module that assess understanding of key concepts
   - Mix of multiple choice and short answer questions
   - Include correct answers for grading

Structure the course logically, ensuring each module builds upon previous ones. Make lesson plans practical and actionable for instructors.`;

            const response = await base44.integrations.Core.InvokeLLM({
                prompt: prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        course: {
                            type: "object",
                            properties: {
                                title: { type: "string" },
                                description: { type: "string" },
                                total_clock_hours: { type: "integer" },
                                estimated_completion_time_months: { type: "integer" },
                                terms_included: {
                                    type: "array",
                                    items: { type: "string" }
                                }
                            }
                        },
                        modules: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    module_number: { type: "integer" },
                                    title: { type: "string" },
                                    topics: { type: "string" }
                                }
                            }
                        },
                        lessons: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    module_number: { type: "integer" },
                                    lesson_day: { type: "integer" },
                                    title: { type: "string" },
                                    key_content_activities: {
                                        type: "array",
                                        items: { type: "string" }
                                    },
                                    student_deliverables: {
                                        type: "array",
                                        items: { type: "string" }
                                    },
                                    instructor_plan: {
                                        type: "object",
                                        properties: {
                                            duration_minutes: { type: "integer" },
                                            materials_needed: {
                                                type: "array",
                                                items: { type: "string" }
                                            },
                                            teaching_strategies: { type: "string" },
                                            lesson_structure: {
                                                type: "array",
                                                items: {
                                                    type: "object",
                                                    properties: {
                                                        phase: { type: "string" },
                                                        time_minutes: { type: "integer" },
                                                        description: { type: "string" }
                                                    }
                                                }
                                            },
                                            assessment_methods: { type: "string" }
                                        }
                                    }
                                }
                            }
                        },
                        quizzes: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    module_number: { type: "integer" },
                                    title: { type: "string" },
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
                                                correct_answer: { type: "string" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            setGeneratedCourse(response);
            toast.success('Course structure generated successfully!');
        } catch (error) {
            console.error('Error generating course:', error);
            toast.error('Failed to generate course. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveCourse = async () => {
        if (!generatedCourse) return;

        setIsSaving(true);
        try {
            // Create the course
            const createdCourse = await base44.entities.Course.create(generatedCourse.course);

            // Create modules
            const moduleMap = {};
            for (const module of generatedCourse.modules) {
                const createdModule = await base44.entities.Module.create({
                    course_id: createdCourse.id,
                    module_number: module.module_number,
                    title: module.title,
                    topics: module.topics
                });
                moduleMap[module.module_number] = createdModule.id;
            }

            // Create lessons
            for (const lesson of generatedCourse.lessons) {
                await base44.entities.Lesson.create({
                    module_id: moduleMap[lesson.module_number],
                    lesson_day: lesson.lesson_day,
                    title: lesson.title,
                    key_content_activities: lesson.key_content_activities,
                    student_deliverables: lesson.student_deliverables
                });
            }

            // Create quizzes
            for (const quiz of generatedCourse.quizzes) {
                await base44.entities.Quiz.create({
                    module_id: moduleMap[quiz.module_number],
                    week_number: quiz.module_number,
                    title: quiz.title,
                    questions: quiz.questions
                });
            }

            toast.success('Course saved successfully!');
            // Reset form
            setCourseTitle('');
            setLearningObjectives('');
            setCurriculumOutline('');
            setClockHours('');
            setGeneratedCourse(null);
        } catch (error) {
            console.error('Error saving course:', error);
            toast.error('Failed to save course. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 text-white p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-cyan-300 mb-2">AI Course Generator</h1>
                    <p className="text-gray-400">Define your learning objectives and let AI create a complete course structure</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Input Form */}
                    <Card className="bg-gray-900/50 border-cyan-500/30 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-cyan-400" />
                                Course Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Course Title *
                                </label>
                                <Input
                                    value={courseTitle}
                                    onChange={(e) => setCourseTitle(e.target.value)}
                                    placeholder="e.g., Advanced Solar Panel Installation"
                                    className="bg-gray-800/50 border-cyan-500/30 text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Total Clock Hours
                                </label>
                                <Input
                                    type="number"
                                    value={clockHours}
                                    onChange={(e) => setClockHours(e.target.value)}
                                    placeholder="e.g., 120"
                                    className="bg-gray-800/50 border-cyan-500/30 text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Learning Objectives *
                                </label>
                                <Textarea
                                    value={learningObjectives}
                                    onChange={(e) => setLearningObjectives(e.target.value)}
                                    placeholder="Describe what students should be able to do after completing this course..."
                                    className="bg-gray-800/50 border-cyan-500/30 text-white min-h-[120px]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Curriculum Outline (Optional)
                                </label>
                                <Textarea
                                    value={curriculumOutline}
                                    onChange={(e) => setCurriculumOutline(e.target.value)}
                                    placeholder="Provide any specific topics, skills, or structure you want included..."
                                    className="bg-gray-800/50 border-cyan-500/30 text-white min-h-[120px]"
                                />
                            </div>

                            <Button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generating Course...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        Generate Course with AI
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Generated Course Preview */}
                    <div className="space-y-6">
                        {generatedCourse ? (
                            <>
                                <Card className="bg-gray-900/50 border-cyan-500/30 backdrop-blur-sm">
                                    <CardHeader>
                                        <CardTitle className="text-white flex items-center gap-2">
                                            <CheckCircle2 className="h-5 w-5 text-green-400" />
                                            Generated Course
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-cyan-300 mb-2">
                                                {generatedCourse.course.title}
                                            </h3>
                                            <p className="text-gray-300 text-sm leading-relaxed">
                                                {generatedCourse.course.description}
                                            </p>
                                        </div>

                                        <div className="flex gap-4 text-sm flex-wrap">
                                            <div className="flex items-center gap-2 text-gray-400">
                                                <Calendar className="h-4 w-4" />
                                                {generatedCourse.course.total_clock_hours} hours
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-400">
                                                <BookOpen className="h-4 w-4" />
                                                {generatedCourse.modules.length} modules
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-400">
                                                <GraduationCap className="h-4 w-4" />
                                                {generatedCourse.lessons.length} lessons
                                            </div>
                                            <div className="flex items-center gap-2 text-purple-400">
                                                <ClipboardList className="h-4 w-4" />
                                                {generatedCourse.quizzes?.length || 0} quizzes
                                            </div>
                                        </div>

                                        <Button
                                            onClick={handleSaveCourse}
                                            disabled={isSaving}
                                            className="w-full bg-green-600 hover:bg-green-700"
                                        >
                                            {isSaving ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                                    Save Course to Database
                                                </>
                                            )}
                                        </Button>
                                    </CardContent>
                                </Card>

                                <div className="max-h-[600px] overflow-y-auto space-y-4 pr-2">
                                    {generatedCourse.modules.map((module, idx) => {
                                        const moduleLessons = generatedCourse.lessons.filter(
                                            l => l.module_number === module.module_number
                                        );

                                        return (
                                            <Card key={idx} className="bg-gray-900/30 border-cyan-500/20">
                                                <CardHeader>
                                                    <CardTitle className="text-white text-lg">
                                                        Week {module.module_number}: {module.title}
                                                    </CardTitle>
                                                    <p className="text-sm text-gray-400">{module.topics}</p>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <p className="text-sm font-medium text-cyan-400">
                                                                {moduleLessons.length} Lessons
                                                            </p>
                                                            {generatedCourse.quizzes?.find(q => q.module_number === module.module_number) && (
                                                                <div className="flex items-center gap-1 text-purple-400 text-xs">
                                                                    <ClipboardList className="h-3 w-3" />
                                                                    Quiz included
                                                                </div>
                                                            )}
                                                        </div>
                                                        {moduleLessons.map((lesson, lessonIdx) => (
                                                            <div
                                                                key={lessonIdx}
                                                                className="pl-4 border-l-2 border-cyan-500/30 py-2 space-y-2"
                                                            >
                                                                <div>
                                                                    <p className="text-sm text-white font-medium">
                                                                        Day {lesson.lesson_day}: {lesson.title}
                                                                    </p>
                                                                    <p className="text-xs text-gray-400 mt-1">
                                                                        {lesson.key_content_activities.join(', ')}
                                                                    </p>
                                                                </div>

                                                                {lesson.instructor_plan && (
                                                                    <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2 mt-2">
                                                                        <div className="flex items-center gap-1 text-blue-400 text-xs mb-1">
                                                                            <GraduationCap className="h-3 w-3" />
                                                                            Instructor Plan ({lesson.instructor_plan.duration_minutes} min)
                                                                        </div>
                                                                        <p className="text-xs text-gray-300">
                                                                            {lesson.instructor_plan.teaching_strategies}
                                                                        </p>
                                                                        {lesson.instructor_plan.lesson_structure && (
                                                                            <div className="mt-2 space-y-1">
                                                                                {lesson.instructor_plan.lesson_structure.map((phase, phaseIdx) => (
                                                                                    <div key={phaseIdx} className="text-xs text-gray-400">
                                                                                        • {phase.phase} ({phase.time_minutes}m): {phase.description}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}

                                                        {generatedCourse.quizzes?.filter(q => q.module_number === module.module_number).map((quiz, qIdx) => (
                                                            <div key={qIdx} className="mt-3 pt-3 border-t border-cyan-500/20">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <ClipboardList className="h-4 w-4 text-purple-400" />
                                                                    <p className="text-sm font-medium text-purple-400">{quiz.title}</p>
                                                                    <span className="text-xs text-gray-500">({quiz.questions.length} questions)</span>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    {quiz.questions.slice(0, 2).map((q, qnIdx) => (
                                                                        <div key={qnIdx} className="text-xs bg-gray-800/30 p-2 rounded">
                                                                            <p className="text-gray-300">{qnIdx + 1}. {q.question_text}</p>
                                                                            {q.answer_type === 'multiple_choice' && q.options && (
                                                                                <div className="ml-3 mt-1 space-y-0.5">
                                                                                    {q.options.map((opt, optIdx) => (
                                                                                        <p key={optIdx} className="text-gray-500">
                                                                                            {String.fromCharCode(65 + optIdx)}. {opt}
                                                                                        </p>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                    {quiz.questions.length > 2 && (
                                                                        <p className="text-xs text-gray-500 text-center">
                                                                            + {quiz.questions.length - 2} more questions
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            <Card className="bg-gray-900/30 border-cyan-500/20 backdrop-blur-sm">
                                <CardContent className="py-16 text-center">
                                    <Sparkles className="h-16 w-16 text-cyan-400/30 mx-auto mb-4" />
                                    <p className="text-gray-500">
                                        Fill in the course details and click "Generate Course with AI" to see the results
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}