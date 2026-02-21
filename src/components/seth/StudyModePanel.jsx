import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Brain, CheckCircle, XCircle, Lightbulb, FileText } from 'lucide-react';

export default function StudyModePanel({ onGenerateQuiz, onGenerateStudyPlan, onExplainConcept, onSummarize }) {
  const [selectedAction, setSelectedAction] = useState(null);

  const studyActions = [
    {
      id: 'quiz',
      title: 'Quiz Me',
      description: 'Test your knowledge with AI-generated questions',
      icon: Brain,
      color: 'bg-purple-600',
      action: onGenerateQuiz
    },
    {
      id: 'plan',
      title: 'Study Plan',
      description: 'Get a personalized learning roadmap',
      icon: BookOpen,
      color: 'bg-blue-600',
      action: onGenerateStudyPlan
    },
    {
      id: 'explain',
      title: 'Simplify Topic',
      description: 'Understand complex concepts with analogies',
      icon: Lightbulb,
      color: 'bg-yellow-600',
      action: onExplainConcept
    },
    {
      id: 'summarize',
      title: 'Summarize',
      description: 'Get concise summaries of learning materials',
      icon: FileText,
      color: 'bg-green-600',
      action: onSummarize
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      {studyActions.map(action => {
        const Icon = action.icon;
        return (
          <Card 
            key={action.id}
            className="bg-gray-800 border-gray-700 hover:border-cyan-500 transition-all cursor-pointer"
            onClick={() => {
              setSelectedAction(action.id);
              action.action();
            }}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${action.color}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-white text-lg">{action.title}</CardTitle>
                  <p className="text-sm text-gray-400">{action.description}</p>
                </div>
              </div>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}