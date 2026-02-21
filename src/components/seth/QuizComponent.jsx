import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Trophy, RotateCcw } from 'lucide-react';

export default function QuizComponent({ quiz, onAnswer, onComplete }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return null;
  }

  const question = quiz.questions[currentQuestion];
  const isLastQuestion = currentQuestion === quiz.questions.length - 1;

  const handleAnswerSelect = (answerIndex) => {
    if (isAnswered) return;
    
    setSelectedAnswer(answerIndex);
    setIsAnswered(true);
    
    const isCorrect = answerIndex === question.correct_answer;
    if (isCorrect) {
      setScore(score + 1);
    }
    
    setAnswers([...answers, {
      question: question.question,
      selected: answerIndex,
      correct: question.correct_answer,
      isCorrect
    }]);
    
    onAnswer && onAnswer(isCorrect);
  };

  const handleNext = () => {
    if (isLastQuestion) {
      onComplete && onComplete(score + (selectedAnswer === question.correct_answer ? 1 : 0), quiz.questions.length, answers);
    } else {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700 max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">
            Question {currentQuestion + 1} of {quiz.questions.length}
          </CardTitle>
          <Badge className="bg-cyan-600">
            Score: {score}/{quiz.questions.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-gray-900 rounded-lg">
          <p className="text-white text-lg">{question.question}</p>
        </div>

        <div className="space-y-2">
          {question.options.map((option, index) => {
            const isCorrect = index === question.correct_answer;
            const isSelected = index === selectedAnswer;
            
            let bgColor = 'bg-gray-900 hover:bg-gray-700';
            let borderColor = 'border-gray-700';
            
            if (isAnswered) {
              if (isCorrect) {
                bgColor = 'bg-green-900/50';
                borderColor = 'border-green-500';
              } else if (isSelected && !isCorrect) {
                bgColor = 'bg-red-900/50';
                borderColor = 'border-red-500';
              }
            }

            return (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                disabled={isAnswered}
                className={`w-full p-4 rounded-lg border-2 ${bgColor} ${borderColor} transition-all text-left flex items-center justify-between ${!isAnswered ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <span className="text-white">{option}</span>
                {isAnswered && (
                  <>
                    {isCorrect && <CheckCircle className="w-5 h-5 text-green-500" />}
                    {isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-500" />}
                  </>
                )}
              </button>
            );
          })}
        </div>

        {isAnswered && question.explanation && (
          <div className="p-4 bg-blue-900/30 border border-blue-500 rounded-lg">
            <p className="text-sm text-blue-300 font-semibold mb-1">Explanation:</p>
            <p className="text-gray-300 text-sm">{question.explanation}</p>
          </div>
        )}

        {isAnswered && (
          <Button
            onClick={handleNext}
            className="w-full bg-cyan-600 hover:bg-cyan-700"
          >
            {isLastQuestion ? 'Finish Quiz' : 'Next Question'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}