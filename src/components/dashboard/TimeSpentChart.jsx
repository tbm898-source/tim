import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock, TrendingUp } from 'lucide-react';

export default function TimeSpentChart({ userProgress, modules }) {
    const timeByModule = modules.map(module => {
        const moduleProgress = userProgress.filter(p => p.module_id === module.id);
        const totalSeconds = moduleProgress.reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0);
        const hours = (totalSeconds / 3600).toFixed(1);
        
        return {
            name: `Week ${module.module_number}`,
            hours: parseFloat(hours),
            fullName: module.title
        };
    }).filter(m => m.hours > 0);

    const totalTimeSeconds = userProgress.reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0);
    const avgTimePerLesson = userProgress.length > 0 
        ? totalTimeSeconds / userProgress.length 
        : 0;

    const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Time Spent Chart */}
            <Card className="bg-gray-900/50 border-cyan-500/30 backdrop-blur-sm lg:col-span-2">
                <CardHeader>
                    <CardTitle className="text-white">Time Invested by Module</CardTitle>
                    <p className="text-sm text-gray-400">Hours spent on each learning module</p>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={timeByModule}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis 
                                dataKey="name" 
                                stroke="#9ca3af"
                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                            />
                            <YAxis 
                                stroke="#9ca3af"
                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                                label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
                            />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#111827', 
                                    border: '1px solid #22d3ee',
                                    borderRadius: '8px'
                                }}
                                labelStyle={{ color: '#22d3ee' }}
                                itemStyle={{ color: '#fff' }}
                                formatter={(value, name, props) => [
                                    `${value} hours`,
                                    props.payload.fullName
                                ]}
                            />
                            <Bar 
                                dataKey="hours" 
                                fill="#22d3ee" 
                                radius={[8, 8, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Time Statistics */}
            <div className="space-y-6">
                <Card className="bg-gray-900/50 border-cyan-500/30 backdrop-blur-sm">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-cyan-400" />
                            <CardTitle className="text-white text-lg">Total Time</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-cyan-400">
                            {formatTime(totalTimeSeconds)}
                        </p>
                        <p className="text-sm text-gray-400 mt-2">
                            Across all modules and lessons
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-cyan-500/30 backdrop-blur-sm">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-purple-400" />
                            <CardTitle className="text-white text-lg">Avg per Lesson</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-purple-400">
                            {formatTime(avgTimePerLesson)}
                        </p>
                        <p className="text-sm text-gray-400 mt-2">
                            Average time investment per lesson
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/30 backdrop-blur-sm">
                    <CardContent className="pt-6">
                        <p className="text-sm text-gray-300">
                            <strong className="text-cyan-400">Pro Tip:</strong> Consistent daily study 
                            sessions lead to better retention than cramming. Aim for focused 30-45 minute blocks.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}