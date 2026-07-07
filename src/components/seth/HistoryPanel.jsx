import React, { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChatSession } from "@/entities/ChatSession";
import { X, Plus, MessageSquare, Loader2 } from "lucide-react";

export default function HistoryPanel({ onNewChat, onLoadSession, onClose }) {
    const [sessions, setSessions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSessions = async () => {
            setIsLoading(true);
            const fetchedSessions = await ChatSession.list("-created_date", 50);
            setSessions(fetchedSessions);
            setIsLoading(false);
        };
        fetchSessions();
    }, []);

    return (
        <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 left-0 h-full w-full max-w-sm bg-black border-r border-cyan-500/50 shadow-2xl shadow-cyan-500/20 p-6 z-50 flex flex-col"
        >
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-cyan-300">Chat History</h2>
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="h-6 w-6" />
                </Button>
            </div>
            
            <Button
                variant="outline"
                className="w-full bg-transparent border-cyan-400/50 hover:bg-cyan-400/20 mb-6"
                onClick={onNewChat}
            >
                <Plus className="mr-2 h-4 w-4" />
                New Chat
            </Button>

            <div className="flex-1 overflow-y-auto -mr-6 pr-6 space-y-2">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="text-center text-gray-500 pt-10">
                        No saved chats.
                    </div>
                ) : (
                    sessions.map(session => (
                        <button
                            key={session.id}
                            onClick={() => onLoadSession(session.id)}
                            className="w-full text-left p-3 rounded-lg hover:bg-gray-800/80 transition-colors flex items-start gap-3"
                        >
                            <MessageSquare className="h-4 w-4 mt-1 text-cyan-400 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="font-medium text-white truncate">{session.title}</p>
                                <p className="text-xs text-gray-400">
                                    {new Date(session.created_date).toLocaleString()}
                                </p>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </motion.div>
    );
}