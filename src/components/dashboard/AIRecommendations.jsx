import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { Sparkles, AlertTriangle, Target, BookOpen, X, Check } from 'lucide-react';

export default function AIRecommendations({ recommendations, modules, onRecommendationUpdate }) {
    const getPriorityIcon = (priority) => {
        switch (priority) {
            case 'critical': return <AlertTriangle className="h-5 w-5 text-red-400" />;
            case 'high': return <Target className="h-5 w-5 text-orange-400" />;
            case 'medium': return <BookOpen className="h-5 w-5 text-yellow-400" />;
            default: return <Sparkles className="h-5 w-5 text-cyan-400" />;
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'critical': return 'border-red-500/50 bg-red-500/10';
            case 'high': return 'border-orange-500/50 bg-orange-500/10';
            case 'medium': return 'border-yellow-500/50 bg-yellow-500/10';
            default: return 'border-cyan-500/50 bg-cyan-500/10';
        }
    };

    const handleUpdateStatus = async (recommendationId, newStatus) => {
        try {
            await base44.entities.Recommendation.update(recommendationId, { status: newStatus });
            onRecommendationUpdate();
        } catch (error) {
            console.error('Error updating recommendation:', error);
        }
    };

    if (recommendations.length === 0) {
        return (
            <Card className="bg-gray-900/50 border-cyan-500/30 backdrop-blur-sm">
                <CardContent className="py-12 text-center">
                    <Sparkles className="h-12 w-12 text-cyan-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Active Recommendations</h3>
                    <p className="text-gray-400 mb-6">
                        Click "Generate AI Insights" to get personalized learning recommendations based on your progress.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {recommendations.map(rec => {
                const module = modules.find(m => m.id === rec.recommended_content_id);
                
                return (
                    <Card 
                        key={rec.id} 
                        className={`backdrop-blur-sm transition-all hover:shadow-lg ${getPriorityColor(rec.priority)}`}
                    >
                        <CardHeader>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 flex-1">
                                    {getPriorityIcon(rec.priority)}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <CardTitle className="text-lg text-white">
                                                {rec.recommended_content_type === 'module' && module 
                                                    ? `Week ${module.module_number}: ${module.title}`
                                                    : 'Recommended Content'
                                                }
                                            </CardTitle>
                                            <Badge 
                                                variant="outline" 
                                                className={
                                                    rec.priority === 'critical' ? 'border-red-400 text-red-400' :
                                                    rec.priority === 'high' ? 'border-orange-400 text-orange-400' :
                                                    rec.priority === 'medium' ? 'border-yellow-400 text-yellow-400' :
                                                    'border-cyan-400 text-cyan-400'
                                                }
                                            >
                                                {rec.priority} priority
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-gray-300 leading-relaxed">
                                            {rec.reason}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    onClick={() => handleUpdateStatus(rec.id, 'completed')}
                                    className="bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30"
                                >
                                    <Check className="h-4 w-4 mr-1" />
                                    Mark Complete
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleUpdateStatus(rec.id, 'viewed')}
                                    className="text-cyan-400 hover:bg-cyan-500/20"
                                >
                                    Mark as Viewed
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleUpdateStatus(rec.id, 'dismissed')}
                                    className="text-gray-400 hover:bg-gray-500/20 ml-auto"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}

            <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30 backdrop-blur-sm">
                <CardContent className="py-6">
                    <div className="flex items-start gap-3">
                        <Sparkles className="h-5 w-5 text-cyan-400 mt-1 flex-shrink-0" />
                        <div>
                            <h4 className="font-semibold text-white mb-1">How AI Recommendations Work</h4>
                            <p className="text-sm text-gray-300 leading-relaxed">
                                Our AI analyzes your quiz scores, time spent, and completion patterns to identify 
                                areas where you might benefit from additional focus. Recommendations are personalized 
                                to help you strengthen weak areas and build on your strengths.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}