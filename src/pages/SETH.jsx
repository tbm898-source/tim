import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, Mic, Send, Bot, User, Loader2, History, Image as ImageIcon, MessageCircle, BookOpen, CheckSquare, ArrowRight, ShieldCheck, MonitorSmartphone } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import SettingsPanel from "../components/seth/SettingsPanel";
import HistoryPanel from "../components/seth/HistoryPanel";
import ThoughtBubble from "../components/seth/ThoughtBubble";
import StudyModePanel from "../components/seth/StudyModePanel";
import QuizComponent from "../components/seth/QuizComponent";
import TaskListPanel from "../components/seth/TaskListPanel";

const { InvokeLLM, GenerateImage } = base44.integrations.Core;
const { Learning, ChatSession } = base44.entities;

const MODE_CONFIGS = {
    chat: { placeholder: "Ask TIM a question or describe what you need...", inputClass: "border-cyan-500/50 focus-visible:ring-cyan-400", buttonClass: "bg-cyan-500 hover:bg-cyan-400 text-slate-950" },
    image: { placeholder: "Describe the image you want to create...", inputClass: "border-emerald-500/50 focus-visible:ring-emerald-400", buttonClass: "bg-emerald-500 hover:bg-emerald-400 text-slate-950" },
    study: { placeholder: "Enter a topic or paste material to study...", inputClass: "border-indigo-500/50 focus-visible:ring-indigo-400", buttonClass: "bg-indigo-500 hover:bg-indigo-400 text-white" },
    tasks: { placeholder: "Ask TIM about your maintenance tasks...", inputClass: "border-teal-500/50 focus-visible:ring-teal-400", buttonClass: "bg-teal-500 hover:bg-teal-400 text-slate-950" },
};

const MODES = [
    { id: 'chat', label: 'Ask TIM', icon: MessageCircle, activeClass: 'bg-cyan-500 text-slate-950 border-cyan-400' },
    { id: 'image', label: 'Create image', icon: ImageIcon, activeClass: 'bg-emerald-500 text-slate-950 border-emerald-400' },
    { id: 'study', label: 'Study', icon: BookOpen, activeClass: 'bg-indigo-500 text-white border-indigo-400' },
    { id: 'tasks', label: 'Work queue', icon: CheckSquare, activeClass: 'bg-teal-500 text-slate-950 border-teal-400' },
];

const STARTER_PROMPTS = [
    'Help me triage my systems and maintenance priorities',
    'Design a safe plan to map my home network',
    'Turn these notes into an approval-ready action plan',
];

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

if (recognition) {
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = true;
}

export default function SETHPage() {
    const [messages, setMessages] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [activeMode, setActiveMode] = useState('chat');
    const [currentQuiz, setCurrentQuiz] = useState(null);
    const [showStudyPanel, setShowStudyPanel] = useState(false);
    const [voices, setVoices] = useState([]);
    const [settings, setSettings] = useState({
        consciousness: 100,
        intelligence: 100,
        voice: null,
        answerLength: 50,
        voiceSpeed: 50,
        voicePitch: 50,
        autoSpeak: false,
    });
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!recognition) return;

        const handleResult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('');
            setInput(transcript);
        };

        const handleEnd = () => setIsListening(false);

        recognition.addEventListener('result', handleResult);
        recognition.addEventListener('end', handleEnd);

        return () => {
            recognition.removeEventListener('result', handleResult);
            recognition.removeEventListener('end', handleEnd);
        };
    }, []);

    const toggleListening = () => {
        if (!recognition) {
            alert("Speech recognition is not supported by your browser.");
            return;
        }
        if (isListening) {
            recognition.stop();
        } else {
            setInput('');
            recognition.start();
            setIsListening(true);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;
        
        const loadVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices();
            if (availableVoices.length > 0) {
                setVoices(availableVoices);
                const preferredVoice = availableVoices.find(v => v.name.includes('Google UK English Male'));
                setSettings(s => ({ ...s, voice: preferredVoice ? preferredVoice.name : availableVoices[0].name }));
            }
        };
        window.speechSynthesis.onvoiceschanged = loadVoices;
        loadVoices();
        return () => { 
            if (window.speechSynthesis) {
                window.speechSynthesis.onvoiceschanged = null; 
            }
        };
    }, []);

    const speak = (text) => {
        if (!settings.voice || !settings.autoSpeak || typeof window === 'undefined' || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const selectedVoice = voices.find(v => v.name === settings.voice);
        if (selectedVoice) utterance.voice = selectedVoice;
        utterance.pitch = 0.5 + (settings.voicePitch / 100) * 1.0;
        utterance.rate = 0.5 + (settings.voiceSpeed / 100) * 1.5;
        window.speechSynthesis.speak(utterance);
    };

    const handleModeBasedGeneration = async (mode) => {
        if (!input.trim() || isLoading) return;

        const userInput = input;
        setInput("");
        setIsLoading(true);

        const newUserMessage = { sender: 'user', text: `[${mode.toUpperCase()}] ${userInput}` };
        let updatedMessages = [...messages, newUserMessage];
        setMessages(updatedMessages);

        try {
            if (mode === 'image') {
                await generateSingleImage(userInput, updatedMessages);
            } else if (mode === 'storyboard') {
                await generateStoryboard(userInput, updatedMessages);
            } else if (mode === 'video') {
                await handleVideoRequest(userInput, updatedMessages);
            } else if (mode === 'study') {
                setShowStudyPanel(true);
                setIsLoading(false);
                return;
            } else {
                await handleChatMessage(userInput, updatedMessages);
            }
        } catch (error) {
            console.error(`${mode} generation error:`, error);
            const errorMessage = {
                sender: 'ai', 
                text: `I couldn't complete that ${mode} request. Check your connection and try again; your prompt is still available in this conversation.`
            };
            updatedMessages.push(errorMessage);
            setMessages(updatedMessages);
            speak(errorMessage.text);
        } finally {
            setIsLoading(false);
        }
    };

    const generateSingleImage = async (prompt, updatedMessages) => {
        const thinkingMessage = { sender: 'ai', text: `Analyzing your request and crafting the perfect visual representation...` };
        updatedMessages.push(thinkingMessage);
        setMessages([...updatedMessages]);
        speak(thinkingMessage.text);

        try {
            // Enhanced image prompt generation
            const imagePromptResponse = await InvokeLLM({
                prompt: `Create a highly detailed, professional image generation prompt for: "${prompt}". Make it cinematic, realistic, and visually stunning. Include specific details about lighting, composition, style, and atmosphere. Return only the optimized prompt.`,
                add_context_from_internet: false
            });

            const imageData = await GenerateImage({ prompt: imagePromptResponse });
            const newImageMessage = { sender: 'ai', text: "Visual generation complete. Here's your image:", imageUrl: imageData.url };
            updatedMessages = [...updatedMessages.slice(0, -1), newImageMessage];
            setMessages(updatedMessages);
            speak(newImageMessage.text);
            saveChatSession(updatedMessages, prompt);
        } catch (error) {
            console.error("Image generation failed:", error);
            const fallbackMessage = { sender: 'ai', text: `I understand you want an image of: ${prompt}. Let me describe in vivid detail what this image would look like instead, and I'll continue working on generating it for you.` };
            updatedMessages = [...updatedMessages.slice(0, -1), fallbackMessage];
            setMessages(updatedMessages);
            speak(fallbackMessage.text);
        }
    };

    const generateStoryboard = async (prompt, updatedMessages) => {
        const thinkingMessage = { sender: 'ai', text: "Activating Director Mode. Breaking down your concept into a visual narrative..." };
        updatedMessages.push(thinkingMessage);
        setMessages([...updatedMessages]);
        speak(thinkingMessage.text);

        try {
            const storyboardResponse = await InvokeLLM({
                prompt: `Create a detailed storyboard for: "${prompt}". Break it into 4-6 key scenes. Return a JSON object with this format: {"scenes": [{"description": "Scene description", "image_prompt": "Detailed cinematic prompt for image generation"}]}`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        scenes: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    description: { type: "string" },
                                    image_prompt: { type: "string" }
                                },
                                required: ["description", "image_prompt"]
                            }
                        }
                    },
                    required: ["scenes"]
                }
            });

            if (!storyboardResponse.scenes || !Array.isArray(storyboardResponse.scenes)) {
                throw new Error("Invalid storyboard format");
            }

            let sceneMessages = [];
            for (const [index, scene] of storyboardResponse.scenes.entries()) {
                if (!scene.description || !scene.image_prompt) continue;

                const sceneStatusMessage = { sender: 'ai', text: `Generating Scene ${index + 1}: ${scene.description}` };
                setMessages([...updatedMessages, ...sceneMessages, sceneStatusMessage]);

                try {
                    const imageData = await GenerateImage({ prompt: scene.image_prompt });
                    const newSceneMessage = {
                        sender: 'ai',
                        text: `Scene ${index + 1}: ${scene.description}`,
                        imageUrl: imageData.url
                    };
                    sceneMessages.push(newSceneMessage);
                } catch (sceneError) {
                    console.error(`Scene ${index + 1} failed:`, sceneError);
                    const newSceneMessage = {
                        sender: 'ai',
                        text: `Scene ${index + 1}: ${scene.description} [Visual being processed...]`
                    };
                    sceneMessages.push(newSceneMessage);
                }

                setMessages([...updatedMessages, ...sceneMessages]);
            }

            updatedMessages.push(...sceneMessages);
            saveChatSession(updatedMessages, prompt);

        } catch (error) {
            console.error("Storyboard generation failed:", error);
            const fallbackMessage = { sender: 'ai', text: "I'll create a detailed written storyboard instead and work on the visual elements." };
            updatedMessages = [...updatedMessages.slice(0, -1), fallbackMessage];
            setMessages(updatedMessages);
            speak(fallbackMessage.text);
        }
    };

    const handleVideoRequest = async (prompt, updatedMessages) => {
        const responseMessage = {
            sender: 'ai',
            text: `I understand you want to create a video for: "${prompt}". While direct video generation isn't available yet, I can create a cinematic storyboard sequence that serves as a visual script. This will give you a frame-by-frame breakdown that could be used for video production. Would you like me to proceed with this approach?`
        };
        updatedMessages.push(responseMessage);
        setMessages(updatedMessages);
        speak(responseMessage.text);
        saveChatSession(updatedMessages, prompt);
    };

    const handleChatMessage = async (messageText, updatedMessages) => {
        const memory = await Learning.list();
        const memoryContext = memory.length > 0 ? `### Core Memory:\n${memory.map(m => `- ${m.fact}`).join('\n')}\n` : "";

        const responseDepth = settings.answerLength < 30 ? 'brief' : settings.answerLength < 70 ? 'balanced' : 'detailed';

        const systemPrompt = `You are TIM, a practical AI work and learning assistant.

${memoryContext}

Give a ${responseDepth} response. Be direct, useful, and honest about uncertainty. Never claim access to a device, network, account, or connector unless that access is present in the current context. Never claim a task succeeded unless it did. Protect private information and follow normal safety boundaries.

For system-operation requests, separate the response into the smallest useful stages: observe, plan, approve, execute, and verify. Prepare a reversible plan first and require clear user approval before consequential changes. Prefer clear next actions over inflated language.

Current query: "${messageText}"
`;

        try {
            const rawResponse = await InvokeLLM({ 
                prompt: systemPrompt, 
                add_context_from_internet: true 
            });

            const newAiMessage = { sender: 'ai', text: rawResponse };
            updatedMessages.push(newAiMessage);
            setMessages(updatedMessages);
            speak(rawResponse);

            saveChatSession(updatedMessages, messageText);

        } catch (error) {
            console.error("Chat generation failed:", error);
            const fallbackResponse = "I couldn't reach the AI service. Please check your connection and try again.";
            const errorMessage = { sender: 'ai', text: fallbackResponse };
            updatedMessages.push(errorMessage);
            setMessages(updatedMessages);
            speak(fallbackResponse);
        }
    };

    const saveChatSession = async (msgs, firstMessageText) => {
        const formattedMsgs = msgs.map(({ thought, ...rest }) => rest).filter(m => m.text || m.imageUrl);
        try {
            if (currentSessionId) {
                await ChatSession.update(currentSessionId, { messages: formattedMsgs });
            } else {
                const title = firstMessageText.substring(0, 40) + (firstMessageText.length > 40 ? '...' : '');
                const newSession = await ChatSession.create({ title, messages: formattedMsgs });
                setCurrentSessionId(newSession.id);
            }
        } catch (error) {
            console.error("Session save failed:", error);
        }
    };

    const startNewChat = () => {
        setMessages([]);
        setCurrentSessionId(null);
        setShowHistory(false);
        setActiveMode('chat');
        setInput('');
    };

    const loadChatSession = async (sessionId) => {
        try {
            const session = await ChatSession.get(sessionId);
            if (session) {
                setMessages(session.messages || []);
                setCurrentSessionId(session.id);
            }
        } catch (error) {
            console.error("Failed to load session:", error);
        }
        setShowHistory(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await handleModeBasedGeneration(activeMode);
    };

    const consciousnessGlow = {
        boxShadow: `0 0 ${settings.consciousness / 5}px #fff, 0 0 ${settings.consciousness / 2.5}px #0ff, 0 0 ${settings.consciousness / 1.5}px #0ff, 0 0 ${settings.consciousness / 1}px #0ff`,
        opacity: settings.consciousness / 100,
    };

    const generateQuiz = async () => {
        setShowStudyPanel(false);
        setIsLoading(true);
        
        try {
            const memory = await Learning.list();
            const memoryContext = memory.length > 0 ? memory.map(m => m.fact).join(', ') : "general knowledge";
            
            const prompt = `Generate a quiz with 5 multiple-choice questions based on: ${input || memoryContext}. Return JSON with this structure:
{
  "title": "Quiz title",
  "questions": [
    {
      "question": "Question text",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correct_answer": 0,
      "explanation": "Why this is correct"
    }
  ]
}`;

            const quizData = await InvokeLLM({
                prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        title: { type: "string" },
                        questions: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    question: { type: "string" },
                                    options: { type: "array", items: { type: "string" } },
                                    correct_answer: { type: "integer" },
                                    explanation: { type: "string" }
                                }
                            }
                        }
                    }
                }
            });

            setCurrentQuiz(quizData);
            const aiMessage = { sender: 'ai', text: `I've prepared a quiz for you: "${quizData.title}". Let's test your knowledge!` };
            setMessages([...messages, aiMessage]);
            speak(aiMessage.text);
        } catch (error) {
            console.error("Quiz generation error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const generateStudyPlan = async () => {
        setShowStudyPanel(false);
        setIsLoading(true);
        
        try {
            const prompt = `Create a personalized study plan for: ${input || "improving overall knowledge"}. Include:
1. Learning objectives
2. Weekly milestones
3. Recommended study techniques
4. Practice activities
Return a detailed, actionable plan.`;

            const studyPlan = await InvokeLLM({ prompt, add_context_from_internet: true });
            
            const aiMessage = { sender: 'ai', text: `Here's your personalized study plan:\n\n${studyPlan}` };
            setMessages([...messages, aiMessage]);
            speak("I've created a personalized study plan for you.");
            saveChatSession([...messages, aiMessage], input || "Study Plan Request");
        } catch (error) {
            console.error("Study plan error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const explainConcept = async () => {
        setShowStudyPanel(false);
        setIsLoading(true);
        
        try {
            const prompt = `Explain this concept in simple terms with helpful analogies: ${input}
            
Use the "Teaching through Analogies" method:
1. Start with a simple, relatable analogy
2. Break down the concept into digestible parts
3. Use everyday examples
4. Build from basic to complex understanding
5. Provide practical applications

Make it engaging and easy to understand for someone learning this for the first time.`;

            const explanation = await InvokeLLM({ prompt, add_context_from_internet: true });
            
            const aiMessage = { sender: 'ai', text: `Let me explain "${input}" in a simple way:\n\n${explanation}` };
            setMessages([...messages, aiMessage]);
            speak("Let me break that down for you with a helpful analogy.");
            saveChatSession([...messages, aiMessage], input);
        } catch (error) {
            console.error("Explanation error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const summarizeMaterial = async () => {
        setShowStudyPanel(false);
        setIsLoading(true);
        
        try {
            const prompt = `Summarize the following learning material in a clear, concise format:\n\n${input}

Provide:
1. Key Points (3-5 bullet points)
2. Main Concepts
3. Important Takeaways
4. Suggested Review Areas

Make it study-friendly and easy to review.`;

            const summary = await InvokeLLM({ prompt });
            
            const aiMessage = { sender: 'ai', text: `Here's a comprehensive summary:\n\n${summary}` };
            setMessages([...messages, aiMessage]);
            speak("I've summarized the material for you.");
            saveChatSession([...messages, aiMessage], "Summary Request");
        } catch (error) {
            console.error("Summarization error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuizComplete = (score, total, answers) => {
        setCurrentQuiz(null);
        
        const performance = (score / total) * 100;
        let feedback = "";
        
        if (performance >= 90) feedback = "Outstanding! You've mastered this topic.";
        else if (performance >= 70) feedback = "Great job! You have a solid understanding.";
        else if (performance >= 50) feedback = "Good effort! Let's review some areas.";
        else feedback = "Let's work on strengthening your understanding.";
        
        const resultMessage = { 
            sender: 'ai', 
            text: `Quiz Complete!\n\nScore: ${score}/${total} (${performance.toFixed(0)}%)\n\n${feedback}\n\nWould you like me to generate a study plan to improve in areas where you struggled?`
        };
        
        setMessages([...messages, resultMessage]);
        speak(resultMessage.text);
    };

    const modeConfig = MODE_CONFIGS[activeMode] || MODE_CONFIGS.chat;

    const selectMode = (mode) => {
        setActiveMode(mode);
        setInput('');
        setShowStudyPanel(false);
        setCurrentQuiz(null);
    };

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-slate-950 text-white">
            <header className="border-b border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur md:px-6">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <Button aria-label="Open conversation history" variant="ghost" size="icon" onClick={() => setShowHistory(true)} className="text-slate-300 hover:bg-white/10 hover:text-white">
                            <History className="h-5 w-5" />
                        </Button>
                        <div className="h-9 w-9 shrink-0 rounded-full bg-cyan-400 transition-all duration-500" style={consciousnessGlow}></div>
                        <div className="min-w-0">
                            <h1 className="text-lg font-semibold tracking-wide text-white">TIM</h1>
                            <p className="hidden truncate text-xs text-slate-400 sm:block">Personal operations copilot</p>
                        </div>
                    </div>
                    <nav aria-label="Primary workspaces" className="hidden items-center gap-1 lg:flex">
                        <Link to="/Devices" className="rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white">Devices</Link>
                        <Link to="/AssetManagement" className="rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white">Systems</Link>
                        <Link to="/AssetScanner" className="rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white">Scanner</Link>
                        <Link to="/IntegrityMonitoring" className="rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white">Integrity</Link>
                        <Link to="/Dashboard" className="rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white">Learning</Link>
                    </nav>
                    <Button aria-label="Open TIM settings" variant="ghost" size="icon" onClick={() => setShowSettings(true)} className="text-slate-300 hover:bg-white/10 hover:text-white">
                        <Settings className="h-5 w-5" />
                    </Button>
                </div>
            </header>

            <div className="border-b border-white/10 bg-slate-900/70 px-3 py-3 md:px-6">
                <div className="mx-auto flex max-w-4xl gap-2 overflow-x-auto pb-1">
                    {MODES.map(({ id, label, icon: Icon, activeClass }) => (
                        <Button
                            key={id}
                            variant="outline"
                            size="sm"
                            aria-pressed={activeMode === id}
                            onClick={() => selectMode(id)}
                            className={`shrink-0 rounded-full border-white/10 px-4 ${activeMode === id ? activeClass : 'bg-slate-950/40 text-slate-300 hover:bg-white/10 hover:text-white'}`}
                        >
                            <Icon className="mr-2 h-4 w-4" />
                            {label}
                        </Button>
                    ))}
                </div>
            </div>

            <main className="flex-1 space-y-4 overflow-y-auto px-4 py-6 md:px-6">
                {activeMode === 'tasks' && (
                    <div className="p-4 rounded-xl bg-gray-900/50 border border-teal-500/30">
                        <TaskListPanel />
                    </div>
                )}

                {showStudyPanel && (
                    <StudyModePanel
                        onGenerateQuiz={generateQuiz}
                        onGenerateStudyPlan={generateStudyPlan}
                        onExplainConcept={explainConcept}
                        onSummarize={summarizeMaterial}
                    />
                )}
                
                {currentQuiz && (
                    <QuizComponent
                        quiz={currentQuiz}
                        onComplete={handleQuizComplete}
                    />
                )}
                
                {messages.length === 0 && activeMode === 'chat' && !showStudyPanel && !currentQuiz && (
                    <section className="mx-auto flex min-h-full max-w-5xl flex-col justify-center py-8">
                        <div className="mb-8 max-w-3xl">
                            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
                                <span className="h-2 w-2 rounded-full bg-cyan-400"></span>
                                Operator console ready
                            </div>
                            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">One place to understand, plan, and operate your systems.</h2>
                            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">TIM is your personal operations copilot. It can reason over connected data, organize work, and prepare actions. System-changing actions should always show you exactly what will happen before execution.</p>
                        </div>

                        <div className="grid gap-3 md:grid-cols-3">
                            <Link to="/Devices" className="group rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.07]">
                                <MonitorSmartphone className="mb-5 h-5 w-5 text-cyan-300" />
                                <h3 className="font-medium text-white">Trusted devices</h3>
                                <p className="mt-2 text-sm leading-6 text-slate-400">Connect Windows, Android, Mac, Apple tooling, and approved network controls.</p>
                                <span className="mt-4 flex items-center gap-1 text-sm text-cyan-300">Open devices <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
                            </Link>
                            <button type="button" onClick={() => selectMode('tasks')} className="group rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left transition hover:border-teal-400/40 hover:bg-teal-400/[0.07]">
                                <CheckSquare className="mb-5 h-5 w-5 text-teal-300" />
                                <h3 className="font-medium text-white">Work queue</h3>
                                <p className="mt-2 text-sm leading-6 text-slate-400">Review maintenance tasks and synchronize assigned work.</p>
                                <span className="mt-4 flex items-center gap-1 text-sm text-teal-300">Review tasks <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
                            </button>
                            <Link to="/IntegrityMonitoring" className="group rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-violet-400/40 hover:bg-violet-400/[0.07]">
                                <ShieldCheck className="mb-5 h-5 w-5 text-violet-300" />
                                <h3 className="font-medium text-white">Integrity center</h3>
                                <p className="mt-2 text-sm leading-6 text-slate-400">Inspect alerts, evidence, and issues that need a human decision.</p>
                                <span className="mt-4 flex items-center gap-1 text-sm text-violet-300">View integrity <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
                            </Link>
                        </div>

                        <div className="mt-7 flex flex-wrap gap-2">
                            {STARTER_PROMPTS.map(prompt => (
                                <button key={prompt} type="button" onClick={() => setInput(prompt)} className="rounded-full border border-white/10 bg-slate-900 px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-400/40 hover:text-white">
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {messages.length === 0 && activeMode === 'image' && (
                    <div className="mx-auto flex min-h-[55vh] max-w-2xl flex-col items-center justify-center text-center">
                        <ImageIcon className="mb-5 h-10 w-10 text-emerald-300" />
                        <h2 className="text-2xl font-semibold">Create a useful visual</h2>
                        <p className="mt-2 text-slate-400">Describe the subject, purpose, and style. TIM will turn it into an image prompt and generate the result.</p>
                    </div>
                )}
                <AnimatePresence>
                    {messages.map((msg, index) => (
                        <motion.div
                            key={`${currentSessionId || 'new'}-${index}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            {msg.sender === 'ai' && msg.thought && <ThoughtBubble text={msg.thought} />}
                            <div className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                                {msg.sender === 'ai' && <Bot className="w-8 h-8 text-cyan-400 flex-shrink-0 mt-1" />}
                                <div className={`max-w-xl rounded-lg ${msg.sender === 'user' ? 'bg-blue-800/50' : 'bg-gray-800/50'}`}>
                                    {msg.text && <p className="whitespace-pre-wrap p-3">{msg.text}</p>}
                                    {msg.imageUrl && (
                                        <div className="p-2">
                                            <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer">
                                                <img src={msg.imageUrl} alt="Generated content" className="rounded-md max-w-full h-auto" />
                                            </a>
                                        </div>
                                    )}
                                </div>
                                {msg.sender === 'user' && <User className="w-8 h-8 text-blue-400 flex-shrink-0 mt-1" />}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {isLoading && (
                    <div className="flex items-start gap-3">
                        <Bot className="w-8 h-8 text-cyan-400 flex-shrink-0 mt-1" />
                        <div className="max-w-xl p-3 rounded-lg bg-gray-800/50">
                            <Loader2 className="w-5 h-5 animate-spin" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </main>

            <footer className="border-t border-white/10 bg-slate-950/95 px-3 py-3 backdrop-blur md:px-6 md:py-4">
                <form onSubmit={handleSubmit} className="mx-auto flex max-w-4xl items-center gap-2">
                    <Button 
                        type="button" 
                        variant="outline" 
                        aria-label={isListening ? 'Stop listening' : 'Use voice input'}
                        className={`h-11 w-11 shrink-0 border-white/10 bg-slate-900 text-slate-300 hover:bg-white/10 hover:text-white ${isListening ? 'animate-pulse border-red-500 text-red-300' : ''}`}
                        onClick={toggleListening}
                    >
                        <Mic className="h-5 w-5" />
                    </Button>

                    <Input
                        aria-label="Message TIM"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={isListening ? "Listening..." : modeConfig.placeholder}
                        className={`h-11 flex-1 rounded-xl bg-slate-900 text-white placeholder:text-slate-500 ${modeConfig.inputClass}`}
                        disabled={isLoading}
                    />

                    <Button 
                        type="submit" 
                        aria-label="Send message"
                        className={`h-11 w-11 shrink-0 rounded-xl ${modeConfig.buttonClass}`}
                        disabled={isLoading || isListening || !input.trim()}
                    >
                        <Send className="h-5 w-5" />
                    </Button>
                </form>
                <p className="mx-auto mt-2 max-w-4xl text-center text-[11px] text-slate-600">TIM can prepare and coordinate actions. Review consequential changes before execution.</p>
            </footer>

            <AnimatePresence>
                {showSettings && (
                    <SettingsPanel
                        settings={settings}
                        onSettingsChange={setSettings}
                        onClose={() => setShowSettings(false)}
                        voices={voices}
                    />
                )}
                {showHistory && (
                    <HistoryPanel
                        onNewChat={startNewChat}
                        onLoadSession={loadChatSession}
                        onClose={() => setShowHistory(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
