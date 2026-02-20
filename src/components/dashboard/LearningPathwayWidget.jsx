import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { Target, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function LearningPathwayWidget({ studentId }) {
    const [pathway, setPathway] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (studentId) {
            loadPathway();
        }
    }, [studentId]);

    const loadPathway = async () => {
        try {
            const pathways = await base44.entities.LearningPathway.filter({ 
                student_id: studentId,
                status: 'active'
            });
            
            if (pathways.length > 0) {
                setPathway(pathways[0]);
            }
        } catch (error) {
            console.error('Error loading pathway:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading || !pathway) {
        return null;
    }

    const topRecommendations = pathway.recommended_content
        ?.sort((a, b) => a.priority - b.priority)
        .slice(0, 3) || [];

    return (
        <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-cyan-400" />
                        Your Learning Path
                    </CardTitle>
                    <Link to={createPageUrl('MyLearningPath')}>
                        <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300">
                            View Full Path
                            <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                    </Link>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-gray-300 mb-4">{pathway.pathway_title}</p>
                
                <div className="space-y-2 mb-4">
                    <p className="text-xs text-gray-400 font-semibold">Next Steps:</p>
                    {topRecommendations.map((rec, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-xs flex-shrink-0 mt-0.5">
                                {rec.priority}
                            </div>
                            <span className="text-gray-300">{rec.content_title}</span>
                        </div>
                    ))}
                </div>

                {pathway.next_milestones && pathway.next_milestones.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-cyan-500/20">
                        <p className="text-xs text-gray-400 font-semibold mb-2">Next Milestone:</p>
                        <div className="flex items-start gap-2">
                            <Target className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm text-white">{pathway.next_milestones[0].milestone}</p>
                                <p className="text-xs text-gray-500">
                                    Target: {new Date(pathway.next_milestones[0].target_date).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}