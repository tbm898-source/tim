import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, BookOpen, Lightbulb, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function StudyAssistant() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [studentContext, setStudentContext] = useState(null);

    useEffect(() => {
        loadStudentContext();
        setMessages([
            {
                role: 'assistant',
                content: "Hi! I'm your AI Study Assistant for Solar Construction Technology. I can help you understand course concepts, clarify lesson content, and provide study tips. What would you like to learn about today?"
            }
        ]);
    }, []);

    const loadStudentContext = async () => {
        try {
            const user = await base44.auth.me();
            const studentData = await base44.entities.Student.filter({ user_email: user.email });
            
            if (studentData.length > 0) {
                const student = studentData[0];
                const [progress, enrollments] = await Promise.all([
                    base44.entities.UserProgress.filter({ student_id: student.id }),
                    base44.entities.Enrollment.filter({ student_id: student.id })
                ]);

                setStudentContext({
                    student,
                    progress,
                    enrollments
                });
            }
        } catch (error) {
            console.error('Error loading context:', error);
        }
    };

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const recentLessons = studentContext?.progress
                ?.filter(p => p.completed)
                .slice(-5)
                .map(p => p.lesson_id) || [];

            const contextPrompt = `You are a helpful AI study assistant for a Solar Construction Technology course. 
            
Student context:
- Recent lessons completed: ${recentLessons.length}
- Current enrollment status: ${studentContext?.enrollments?.[0]?.status || 'enrolled'}

Student question: ${input}

Provide a clear, educational response that:
1. Directly answers their question
2. Uses simple, understandable language
3. Includes relevant examples when helpful
4. Encourages further learning
5. Relates to solar construction technology when applicable

Keep responses concise (2-3 paragraphs max).`;

            const response = await base44.integrations.Core.InvokeLLM({
                prompt: contextPrompt
            });

            const assistantMessage = { role: 'assistant', content: response };
            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            toast.error('Failed to get response');
        } finally {
            setIsLoading(false);
        }
    };

    const quickPrompts = [
        "Explain photovoltaic systems in simple terms",
        "What safety precautions are important in solar installation?",
        "How do I calculate solar panel efficiency?",
        "What are the main components of a solar energy system?"
    ];

    const handleQuickPrompt = (prompt) => {
        setInput(prompt);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 text-white p-6">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-4xl font-bold text-cyan-300 mb-2">AI Study Assistant</h1>
                    <p className="text-gray-400">Your personal learning companion</p>
                </div>

                <Card className="bg-gray-900/50 border-cyan-500/30 mb-4">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-3 mb-4">
                            <Lightbulb className="h-5 w-5 text-yellow-400 mt-1 flex-shrink-0" />
                            <div>
                                <h4 className="font-semibold text-white mb-2">Quick Start Prompts:</h4>
                                <div className="flex flex-wrap gap-2">
                                    {quickPrompts.map((prompt, idx) => (
                                        <Button
                                            key={idx}
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleQuickPrompt(prompt)}
                                            className="text-xs bg-gray-800/50 border-cyan-500/30 hover:bg-cyan-500/20"
                                        >
                                            {prompt}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-cyan-500/30 h-[500px] flex flex-col">
                    <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-lg p-4 ${
                                        msg.role === 'user'
                                            ? 'bg-cyan-500 text-white'
                                            : 'bg-gray-800 text-gray-200 border border-gray-700'
                                    }`}
                                >
                                    {msg.role === 'assistant' && (
                                        <div className="flex items-center gap-2 mb-2">
                                            <BookOpen className="h-4 w-4 text-cyan-400" />
                                            <span className="text-xs font-semibold text-cyan-400">Study Assistant</span>
                                        </div>
                                    )}
                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                                    <Loader2 className="h-5 w-5 text-cyan-400 animate-spin" />
                                </div>
                            </div>
                        )}
                    </CardContent>

                    <div className="p-4 border-t border-cyan-500/30">
                        <div className="flex gap-2">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                placeholder="Ask a question about your course..."
                                className="bg-gray-800/50 border-cyan-500/30 text-white"
                                disabled={isLoading}
                            />
                            <Button
                                onClick={sendMessage}
                                disabled={isLoading || !input.trim()}
                                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}