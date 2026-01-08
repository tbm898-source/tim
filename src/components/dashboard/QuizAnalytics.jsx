import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, LineChart } from 'recharts';

export default function QuizAnalytics({ userProgress, modules }) {
    const quizData = userProgress
        .filter(p => p.quiz_score !== undefined && p.quiz_score !== null)
        .map(p => {
            const module = modules.find(m => m.id === p.module_id);
            return {
                moduleName: module ? `Week ${module.module_number}` : 'Unknown',
                score: p.quiz_score,
                date: new Date(p.completion_date).toLocaleDateString()
            };
        })
        .slice(-10); // Last 10 quizzes

    const scoreDistribution = {
        excellent: quizData.filter(d => d.score >= 90).length,
        good: quizData.filter(d => d.score >= 80 && d.score < 90).length,
        fair: quizData.filter(d => d.score >= 70 && d.score < 80).length,
        needsWork: quizData.filter(d => d.score < 70).length
    };

    const distributionData = [
        { range: 'Excellent (90-100%)', count: scoreDistribution.excellent, fill: '#22d3ee' },
        { range: 'Good (80-89%)', count: scoreDistribution.good, fill: '#06b6d4' },
        { range: 'Fair (70-79%)', count: scoreDistribution.fair, fill: '#facc15' },
        { range: 'Needs Work (<70%)', count: scoreDistribution.needsWork, fill: '#fb923c' }
    ];

    const avgScore = quizData.length > 0 
        ? (quizData.reduce((sum, d) => sum + d.score, 0) / quizData.length).toFixed(1)
        : 0;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score Trend */}
            <Card className="bg-gray-900/50 border-cyan-500/30 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-white">Quiz Score Trend</CardTitle>
                    <p className="text-sm text-gray-400">Your performance over recent quizzes</p>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={quizData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis 
                                dataKey="moduleName" 
                                stroke="#9ca3af"
                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                            />
                            <YAxis 
                                stroke="#9ca3af"
                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                                domain={[0, 100]}
                            />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#111827', 
                                    border: '1px solid #22d3ee',
                                    borderRadius: '8px'
                                }}
                                labelStyle={{ color: '#22d3ee' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="score" 
                                stroke="#22d3ee" 
                                strokeWidth={3}
                                dot={{ fill: '#22d3ee', r: 4 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                    <div className="mt-4 text-center">
                        <p className="text-sm text-gray-400">Average Score</p>
                        <p className="text-3xl font-bold text-cyan-400">{avgScore}%</p>
                    </div>
                </CardContent>
            </Card>

            {/* Score Distribution */}
            <Card className="bg-gray-900/50 border-cyan-500/30 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-white">Score Distribution</CardTitle>
                    <p className="text-sm text-gray-400">Breakdown of your quiz performance</p>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={distributionData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis 
                                dataKey="range" 
                                stroke="#9ca3af"
                                tick={{ fill: '#9ca3af', fontSize: 11 }}
                                angle={-15}
                                textAnchor="end"
                                height={80}
                            />
                            <YAxis 
                                stroke="#9ca3af"
                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                            />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#111827', 
                                    border: '1px solid #22d3ee',
                                    borderRadius: '8px'
                                }}
                                labelStyle={{ color: '#22d3ee' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Bar dataKey="count" fill="#22d3ee" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        {distributionData.map((item, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: item.fill }}
                                />
                                <span className="text-gray-300">{item.range.split(' ')[0]}: {item.count}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}