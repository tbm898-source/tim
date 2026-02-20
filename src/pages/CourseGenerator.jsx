import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, CheckCircle2, BookOpen, Calendar } from 'lucide-react';
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
            const prompt = `You are an expert curriculum designer. Create a comprehensive course structure based on the following:

Course Title: ${courseTitle}
Total Clock Hours: ${clockHours || 'Not specified'}
Learning Objectives: ${learningObjectives}
${curriculumOutline ? `Curriculum Outline: ${curriculumOutline}` : ''}

Generate a detailed course structure with:
1. Course description and metadata
2. Modules (weeks) - each with a title, topics, and module number
3. Lessons for each module - each with a title, day number, key content/activities, and student deliverables

Structure the course logically, ensuring each module builds upon previous ones. Include practical activities and assessments.`;

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

                                        <div className="flex gap-4 text-sm">
                                            <div className="flex items-center gap-2 text-gray-400">
                                                <Calendar className="h-4 w-4" />
                                                {generatedCourse.course.total_clock_hours} hours
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-400">
                                                <BookOpen className="h-4 w-4" />
                                                {generatedCourse.modules.length} modules
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
                                                        <p className="text-sm font-medium text-cyan-400">
                                                            {moduleLessons.length} Lessons
                                                        </p>
                                                        {moduleLessons.map((lesson, lessonIdx) => (
                                                            <div
                                                                key={lessonIdx}
                                                                className="pl-4 border-l-2 border-cyan-500/30 py-2"
                                                            >
                                                                <p className="text-sm text-white font-medium">
                                                                    Day {lesson.lesson_day}: {lesson.title}
                                                                </p>
                                                                <p className="text-xs text-gray-400 mt-1">
                                                                    {lesson.key_content_activities.join(', ')}
                                                                </p>
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