import React from 'react';
import { motion } from "framer-motion";
import { BrainCircuit } from "lucide-react";

export default function ThoughtBubble({ text }) {
    if (!text) return null;

    // Sanitize and split the thought process
    const thoughts = text
        .replace(/Internal Monologue:|Thinking:|Thought Process:|###/gi, '')
        .trim()
        .split('\n')
        .map(t => t.replace(/^- |^\d\. /,'').trim())
        .filter(t => t);

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
            className="mb-2 ml-11"
        >
            <div className="border border-cyan-500/30 bg-gray-900/50 rounded-lg p-3 text-xs">
                <div className="flex items-center gap-2 mb-2 text-cyan-400">
                    <BrainCircuit className="w-4 h-4" />
                    <h4 className="font-semibold tracking-wider">Cognitive Process</h4>
                </div>
                <ul className="space-y-1 text-gray-300 pl-2">
                    {thoughts.map((thought, index) => (
                        <motion.li 
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-start"
                        >
                            <span className="mr-2 mt-1 w-1 h-1 bg-cyan-400 rounded-full flex-shrink-0"></span>
                            <span>{thought}</span>
                        </motion.li>
                    ))}
                </ul>
            </div>
        </motion.div>
    );
}