import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, TrendingUp, Award, Target, BookOpen, Sparkles, Shield, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

export default function TalentInsights() {
  const [user, setUser] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        if (currentUser.role !== 'admin' && currentUser.role !== 'leadership') {
          window.location.href = '/';
        }
      } catch (error) {
        console.error('Auth error:', error);
        window.location.href = '/';
      }
    };
    loadUser();
  }, []);

  const { data: insights = [], isLoading } = useQuery({
    queryKey: ['talentInsights'],
    queryFn: () => base44.entities.TalentInsight.list('-created_date'),
    enabled: !!user,
  });

  const filteredInsights = insights.filter(insight => {
    const searchMatch = searchTerm === '' || 
      insight.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      insight.employee_email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return searchMatch;
  });

  const getOpportunityIcon = (type) => {
    const icons = {
      training: <BookOpen className="w-4 h-4" />,
      stretch_project: <Target className="w-4 h-4" />,
      mentorship_pairing: <Users className="w-4 h-4" />,
      leadership_track: <TrendingUp className="w-4 h-4" />
    };
    return icons[type] || icons.training;
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-cyan-400 text-xl">Loading talent insights...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-cyan-400" />
            <h1 className="text-3xl font-bold text-white">Talent Insights</h1>
            <Badge variant="outline" className="text-slate-400 border-slate-600">Development & Retention</Badge>
          </div>
          <p className="text-slate-400">Evidence-based strengths and growth opportunities • Human-reviewed • Bias safeguards active</p>
        </div>

        {/* System Purpose Statement */}
        <Card className="bg-slate-800/50 border-cyan-500/30 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              System Purpose & Safeguards
            </CardTitle>
          </CardHeader>
          <CardContent className="text-slate-300 space-y-3">
            <p className="leading-relaxed">
              Talent Insights highlights documented strengths and growth using training and project records. 
              It is designed to support recognition and development, with human review and bias safeguards.
            </p>
            <div className="border-t border-slate-700 pt-3">
              <p className="text-sm leading-relaxed">
                <span className="font-semibold text-orange-400">Important:</span> This system is for development and retention purposes only. 
                It is <strong>not</strong> used for automated hiring decisions. All insights require human review and are based on objective, documented evidence.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Total Profiles</p>
                  <p className="text-2xl font-bold text-white">{insights.length}</p>
                </div>
                <Users className="w-8 h-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Succession Candidates</p>
                  <p className="text-2xl font-bold text-cyan-400">
                    {insights.filter(i => i.succession_bench_candidate).length}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-cyan-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Recognition Due</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {insights.filter(i => i.recognition_suggestions?.length > 0).length}
                  </p>
                </div>
                <Award className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Growth Opportunities</p>
                  <p className="text-2xl font-bold text-green-400">
                    {insights.reduce((sum, i) => sum + (i.recommended_opportunities?.length || 0), 0)}
                  </p>
                </div>
                <Target className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardContent className="pt-6">
            <Input
              placeholder="Search by employee name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 border-slate-600 text-white"
            />
          </CardContent>
        </Card>

        {/* Profiles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInsights.map(insight => (
            <Card 
              key={insight.id} 
              className="bg-slate-800/50 border-slate-700 hover:border-cyan-500/50 transition-all cursor-pointer"
              onClick={() => setSelectedProfile(insight)}
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <CardTitle className="text-white text-lg">{insight.employee_name}</CardTitle>
                    <CardDescription className="text-slate-400 text-sm">{insight.employee_email}</CardDescription>
                  </div>
                  {insight.succession_bench_candidate && (
                    <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                      Succession
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {insight.strength_profile && insight.strength_profile.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Top Strengths:</p>
                    <div className="flex flex-wrap gap-1">
                      {insight.strength_profile.slice(0, 3).map((strength, idx) => (
                        <Badge key={idx} variant="outline" className="text-slate-300 border-slate-600 text-xs">
                          {strength.skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {insight.recommended_opportunities && insight.recommended_opportunities.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Next Opportunities:</p>
                    <p className="text-sm text-slate-300">{insight.recommended_opportunities[0].title}</p>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-700">
                  <p className="text-xs text-slate-500">
                    Generated: {format(new Date(insight.profile_generated_date || insight.created_date), 'PP')}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Detailed Profile Dialog */}
        {selectedProfile && (
          <Dialog open={!!selectedProfile} onOpenChange={() => setSelectedProfile(null)}>
            <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span className="text-2xl">{selectedProfile.employee_name}</span>
                  {selectedProfile.succession_bench_candidate && (
                    <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                      Succession Candidate
                    </Badge>
                  )}
                </DialogTitle>
                <p className="text-slate-400">{selectedProfile.employee_email}</p>
              </DialogHeader>

              <Tabs defaultValue="strengths" className="mt-4">
                <TabsList className="bg-slate-900">
                  <TabsTrigger value="strengths">Strength Profile</TabsTrigger>
                  <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
                  <TabsTrigger value="recognition">Recognition</TabsTrigger>
                  <TabsTrigger value="growth">Growth Trend</TabsTrigger>
                  {selectedProfile.succession_bench_candidate && (
                    <TabsTrigger value="succession">Succession</TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="strengths" className="space-y-4">
                  {selectedProfile.strength_profile && selectedProfile.strength_profile.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Top 3 Demonstrated Skills</h3>
                      <div className="space-y-3">
                        {selectedProfile.strength_profile.map((strength, idx) => (
                          <Card key={idx} className="bg-slate-900/50 border-slate-700">
                            <CardContent className="pt-6">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="text-white font-semibold">{strength.skill}</h4>
                                <Badge className="bg-cyan-500/20 text-cyan-400">
                                  #{strength.rank}
                                </Badge>
                              </div>
                              <p className="text-slate-400 text-sm mb-2">
                                {strength.evidence_count} pieces of evidence documented
                              </p>
                              {strength.evidence_links && strength.evidence_links.length > 0 && (
                                <div className="space-y-1">
                                  {strength.evidence_links.map((link, linkIdx) => (
                                    <a 
                                      key={linkIdx} 
                                      href={link} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      Evidence {linkIdx + 1}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedProfile.delivery_metrics && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Delivery Metrics</h3>
                      <Card className="bg-slate-900/50 border-slate-700">
                        <CardContent className="pt-6">
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-slate-400 text-sm">Task Completion</p>
                              <p className="text-2xl font-bold text-green-400">
                                {selectedProfile.delivery_metrics.task_completion_rate}%
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-400 text-sm">Quality Checks Passed</p>
                              <p className="text-2xl font-bold text-cyan-400">
                                {selectedProfile.delivery_metrics.quality_checks_passed}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-400 text-sm">Rework Rate</p>
                              <p className="text-2xl font-bold text-yellow-400">
                                {selectedProfile.delivery_metrics.rework_rate}%
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="opportunities" className="space-y-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Recommended Next Opportunities</h3>
                  {selectedProfile.recommended_opportunities && selectedProfile.recommended_opportunities.length > 0 ? (
                    <div className="space-y-3">
                      {selectedProfile.recommended_opportunities.map((opp, idx) => (
                        <Card key={idx} className="bg-slate-900/50 border-slate-700">
                          <CardContent className="pt-6">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                                {getOpportunityIcon(opp.opportunity_type)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="text-white font-semibold">{opp.title}</h4>
                                  <Badge variant="outline" className="text-slate-400 border-slate-600 text-xs">
                                    {opp.opportunity_type.replace(/_/g, ' ')}
                                  </Badge>
                                </div>
                                <p className="text-slate-300 text-sm mb-2">{opp.rationale}</p>
                                <p className="text-slate-400 text-xs">
                                  <span className="font-semibold">Expected benefit:</span> {opp.expected_benefit}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-center py-8">No opportunities identified yet</p>
                  )}
                </TabsContent>

                <TabsContent value="recognition" className="space-y-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Recognition Suggestions</h3>
                  {selectedProfile.recognition_suggestions && selectedProfile.recognition_suggestions.length > 0 ? (
                    <div className="space-y-3">
                      {selectedProfile.recognition_suggestions.map((rec, idx) => (
                        <Card key={idx} className="bg-slate-900/50 border-yellow-500/30">
                          <CardContent className="pt-6">
                            <div className="flex items-start gap-3">
                              <Award className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
                              <div className="flex-1">
                                <h4 className="text-white font-semibold mb-1">
                                  {rec.recognition_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </h4>
                                <p className="text-slate-300 text-sm mb-2">{rec.reason}</p>
                                <p className="text-slate-400 text-xs">
                                  <span className="font-semibold">Evidence basis:</span> {rec.evidence_basis}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-center py-8">No recognition suggestions at this time</p>
                  )}
                </TabsContent>

                <TabsContent value="growth" className="space-y-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Growth Trajectory</h3>
                  {selectedProfile.growth_trend ? (
                    <div className="space-y-3">
                      {selectedProfile.growth_trend.curve_description && (
                        <Card className="bg-slate-900/50 border-slate-700">
                          <CardContent className="pt-6">
                            <p className="text-slate-300">{selectedProfile.growth_trend.curve_description}</p>
                          </CardContent>
                        </Card>
                      )}

                      {selectedProfile.growth_trend.improvement_areas && (
                        <div>
                          <h4 className="text-white font-semibold mb-2">Improvement Areas</h4>
                          <div className="space-y-2">
                            {selectedProfile.growth_trend.improvement_areas.map((area, idx) => (
                              <Card key={idx} className="bg-slate-900/50 border-slate-700">
                                <CardContent className="pt-6">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-white font-semibold">{area.skill}</p>
                                    <Badge className={
                                      area.improvement_trajectory === 'accelerating' ? 'bg-green-500/20 text-green-400' :
                                      area.improvement_trajectory === 'steady' ? 'bg-blue-500/20 text-blue-400' :
                                      'bg-slate-500/20 text-slate-400'
                                    }>
                                      {area.improvement_trajectory}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-slate-400">
                                    <span>Baseline: {area.baseline_level}</span>
                                    <span>→</span>
                                    <span>Current: {area.current_level}</span>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-center py-8">Growth trend data not available</p>
                  )}
                </TabsContent>

                {selectedProfile.succession_bench_candidate && (
                  <TabsContent value="succession" className="space-y-4">
                    <Card className="bg-cyan-500/10 border-cyan-500/30 mb-4">
                      <CardContent className="pt-6">
                        <p className="text-cyan-400 text-sm">
                          <strong>Note:</strong> Succession insights are evidence-based and require human review. 
                          No single-score ranking is used.
                        </p>
                      </CardContent>
                    </Card>

                    <h3 className="text-lg font-semibold text-white mb-3">Succession Readiness</h3>
                    
                    {selectedProfile.succession_roles_qualified && selectedProfile.succession_roles_qualified.length > 0 && (
                      <div>
                        <h4 className="text-white font-semibold mb-2">Qualified Roles</h4>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {selectedProfile.succession_roles_qualified.map((role, idx) => (
                            <Badge key={idx} className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedProfile.succession_readiness_evidence && (
                      <div className="space-y-3">
                        {selectedProfile.succession_readiness_evidence.map((evidence, idx) => (
                          <Card key={idx} className="bg-slate-900/50 border-slate-700">
                            <CardContent className="pt-6">
                              <h4 className="text-white font-semibold mb-3">{evidence.role}</h4>
                              
                              {evidence.evidence_points && evidence.evidence_points.length > 0 && (
                                <div className="mb-3">
                                  <p className="text-slate-400 text-sm mb-2">Evidence Points:</p>
                                  <ul className="space-y-1">
                                    {evidence.evidence_points.map((point, pointIdx) => (
                                      <li key={pointIdx} className="text-slate-300 text-sm flex items-start gap-2">
                                        <span className="text-green-400 mt-1">✓</span>
                                        {point}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {evidence.gaps_to_address && evidence.gaps_to_address.length > 0 && (
                                <div>
                                  <p className="text-slate-400 text-sm mb-2">Gaps to Address:</p>
                                  <ul className="space-y-1">
                                    {evidence.gaps_to_address.map((gap, gapIdx) => (
                                      <li key={gapIdx} className="text-slate-300 text-sm flex items-start gap-2">
                                        <span className="text-yellow-400 mt-1">→</span>
                                        {gap}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                )}
              </Tabs>

              {selectedProfile.reviewed_by && (
                <Card className="bg-slate-900/50 border-slate-700 mt-4">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Shield className="w-4 h-4 text-green-400" />
                      <span>Human-reviewed by {selectedProfile.reviewed_by}</span>
                    </div>
                    {selectedProfile.review_notes && (
                      <p className="text-slate-300 text-sm mt-2">{selectedProfile.review_notes}</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}