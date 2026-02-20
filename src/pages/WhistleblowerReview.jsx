import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generateCorrelationId, trackWhistleblowerTipRouted } from '../components/utils/analytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, AlertCircle, Clock, FileText, Users, ExternalLink, Sparkles, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function WhistleblowerReview() {
  const [user, setUser] = useState(null);
  const [selectedTip, setSelectedTip] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        if (currentUser.role !== 'admin' && currentUser.role !== 'compliance_officer') {
          window.location.href = '/';
        }
      } catch (error) {
        console.error('Auth error:', error);
        window.location.href = '/';
      }
    };
    loadUser();
  }, []);

  const { data: tips = [], isLoading } = useQuery({
    queryKey: ['whistleblowerTips'],
    queryFn: () => base44.entities.WhistleblowerTip.list('-created_date'),
    enabled: !!user,
  });

  const assessCredibilityMutation = useMutation({
    mutationFn: (tipId) => base44.functions.invoke('assessTipCredibility', { tip_id: tipId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whistleblowerTips'] });
    },
  });

  const updateTipMutation = useMutation({
    mutationFn: ({ id, updates }) => base44.entities.WhistleblowerTip.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whistleblowerTips'] });
      setSelectedTip(null);
      setFollowUpNote('');
    },
  });

  const handleStatusChange = (tip, newStatus) => {
    updateTipMutation.mutate({
      id: tip.id,
      updates: { status: newStatus, assigned_to: user.email }
    });
  };

  const handleAddFollowUpNote = (tip) => {
    if (!followUpNote.trim()) return;

    const notes = tip.follow_up_notes || [];
    notes.push({
      timestamp: new Date().toISOString(),
      note: followUpNote,
      added_by: user.email
    });

    updateTipMutation.mutate({
      id: tip.id,
      updates: { follow_up_notes: notes }
    });
  };

  const handleRouteExternal = (tip) => {
    updateTipMutation.mutate({
      id: tip.id,
      updates: {
        routed_to_external: true,
        conflict_of_interest_flag: true,
        status: 'escalated'
      }
    });
  };

  const filteredTips = tips.filter(tip => {
    const statusMatch = filterStatus === 'all' || tip.status === filterStatus;
    const categoryMatch = filterCategory === 'all' || tip.category === filterCategory;
    const searchMatch = searchTerm === '' || 
      tip.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tip.tip_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return statusMatch && categoryMatch && searchMatch;
  });

  const getCategoryColor = (category) => {
    const colors = {
      financial_misconduct: 'bg-red-100 text-red-800',
      fraud: 'bg-red-100 text-red-800',
      theft: 'bg-orange-100 text-orange-800',
      safety_violation: 'bg-yellow-100 text-yellow-800',
      harassment: 'bg-purple-100 text-purple-800',
      discrimination: 'bg-purple-100 text-purple-800',
      retaliation: 'bg-pink-100 text-pink-800',
      conflict_of_interest: 'bg-blue-100 text-blue-800',
      policy_violation: 'bg-slate-100 text-slate-800',
      other: 'bg-slate-100 text-slate-800'
    };
    return colors[category] || colors.other;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority] || colors.medium;
  };

  const stats = {
    total: tips.length,
    new: tips.filter(t => t.status === 'new').length,
    underReview: tips.filter(t => t.status === 'under_review').length,
    investigating: tips.filter(t => t.status === 'investigating').length,
    external: tips.filter(t => t.routed_to_external).length
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-cyan-400 text-xl">Loading whistleblower review system...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-cyan-400" />
            <h1 className="text-3xl font-bold text-white">Whistleblower Tip Review</h1>
          </div>
          <p className="text-slate-400">Confidential review of reported concerns • Anti-retaliation protected</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Total Tips</p>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                </div>
                <FileText className="w-8 h-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">New</p>
                  <p className="text-2xl font-bold text-cyan-400">{stats.new}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-cyan-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Under Review</p>
                  <p className="text-2xl font-bold text-yellow-400">{stats.underReview}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Investigating</p>
                  <p className="text-2xl font-bold text-orange-400">{stats.investigating}</p>
                </div>
                <Users className="w-8 h-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">External</p>
                  <p className="text-2xl font-bold text-red-400">{stats.external}</p>
                </div>
                <ExternalLink className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Filter Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                placeholder="Search by tip ID or summary..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-900 border-slate-600 text-white"
              />
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="financial_misconduct">Financial Misconduct</SelectItem>
                  <SelectItem value="fraud">Fraud</SelectItem>
                  <SelectItem value="harassment">Harassment</SelectItem>
                  <SelectItem value="discrimination">Discrimination</SelectItem>
                  <SelectItem value="retaliation">Retaliation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {filteredTips.map(tip => (
            <Card key={tip.id} className="bg-slate-800/50 border-slate-700 hover:border-cyan-500/50 transition-all cursor-pointer" onClick={() => setSelectedTip(tip)}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getCategoryColor(tip.category)}>
                        {tip.category?.replace(/_/g, ' ')}
                      </Badge>
                      <Badge className={getPriorityColor(tip.priority)}>
                        {tip.priority}
                      </Badge>
                      {tip.anonymous && (
                        <Badge variant="outline" className="text-slate-400 border-slate-600">
                          Anonymous
                        </Badge>
                      )}
                      {tip.routed_to_external && (
                        <Badge variant="outline" className="text-red-400 border-red-500/50">
                          External Review
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-white mb-2">{tip.summary}</CardTitle>
                    <CardDescription className="text-slate-400">
                      Tip ID: {tip.tip_id} • Submitted: {format(new Date(tip.submission_timestamp || tip.created_date), 'PPpp')}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        {selectedTip && (
          <Dialog open={!!selectedTip} onOpenChange={() => setSelectedTip(null)}>
            <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Badge className={getCategoryColor(selectedTip.category)}>
                    {selectedTip.category?.replace(/_/g, ' ')}
                  </Badge>
                  {selectedTip.summary}
                </DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="details" className="mt-4">
                <TabsList className="bg-slate-900">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="credibility">Credibility</TabsTrigger>
                  <TabsTrigger value="conflicts">Conflict Check</TabsTrigger>
                  <TabsTrigger value="followup">Follow-Up</TabsTrigger>
                  <TabsTrigger value="actions">Actions</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-400 mb-2">Detailed Description</h3>
                    <p className="text-white whitespace-pre-wrap">{selectedTip.detailed_description}</p>
                  </div>

                  {selectedTip.incident_date && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-400 mb-2">Incident Date</h3>
                      <p className="text-white">{format(new Date(selectedTip.incident_date), 'PPP')}</p>
                    </div>
                  )}

                  {selectedTip.incident_location && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-400 mb-2">Location</h3>
                      <p className="text-white">{selectedTip.incident_location}</p>
                    </div>
                  )}

                  {selectedTip.individuals_involved && selectedTip.individuals_involved.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-400 mb-2">Individuals Involved</h3>
                      <div className="space-y-2">
                        {selectedTip.individuals_involved.map((person, idx) => (
                          <div key={idx} className="bg-slate-900 p-3 rounded-lg text-sm">
                            <p className="text-white font-semibold">{person.name}</p>
                            {person.role && <p className="text-slate-400">Role: {person.role}</p>}
                            {person.department && <p className="text-slate-400">Department: {person.department}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedTip.witness_information && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-400 mb-2">Witness Information</h3>
                      <p className="text-white">{selectedTip.witness_information}</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="credibility" className="space-y-4">
                  <Card className="bg-slate-900/50 border-cyan-500/30">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-cyan-400" />
                        Credibility Assessment
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        AI-powered triage for routing and prioritization (not used for discrimination)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {!selectedTip.credibility_assessment ? (
                        <div className="text-center py-6">
                          <p className="text-slate-400 mb-4">No credibility assessment performed yet</p>
                          <Button
                            onClick={() => assessCredibilityMutation.mutate(selectedTip.tip_id)}
                            disabled={assessCredibilityMutation.isPending}
                            className="bg-cyan-600 hover:bg-cyan-700"
                          >
                            {assessCredibilityMutation.isPending ? 'Assessing...' : 'Run Credibility Assessment'}
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-slate-400 text-sm">Overall Score</p>
                              <p className="text-2xl font-bold text-cyan-400">
                                {selectedTip.credibility_assessment.overall_score}/100
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-400 text-sm">Specificity</p>
                              <p className="text-2xl font-bold text-white">
                                {selectedTip.credibility_assessment.specificity_score}/100
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-400 text-sm">Verifiability</p>
                              <p className="text-2xl font-bold text-white">
                                {selectedTip.credibility_assessment.corroboration_potential}/100
                              </p>
                            </div>
                          </div>

                          <div>
                            <p className="text-slate-400 text-sm mb-2">Consistency Check</p>
                            <Badge className={
                              selectedTip.credibility_assessment.consistency_check === 'consistent' 
                                ? 'bg-green-500/20 text-green-400'
                                : selectedTip.credibility_assessment.consistency_check === 'minor_inconsistencies'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-red-500/20 text-red-400'
                            }>
                              {selectedTip.credibility_assessment.consistency_check}
                            </Badge>
                          </div>

                          {selectedTip.credibility_assessment.green_flags && selectedTip.credibility_assessment.green_flags.length > 0 && (
                            <div>
                              <p className="text-slate-400 text-sm mb-2">Green Flags (Positive Indicators)</p>
                              <div className="space-y-1">
                                {selectedTip.credibility_assessment.green_flags.map((flag, idx) => (
                                  <div key={idx} className="flex items-start gap-2 text-sm text-green-400">
                                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <span>{flag}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {selectedTip.credibility_assessment.red_flags && selectedTip.credibility_assessment.red_flags.length > 0 && (
                            <div>
                              <p className="text-slate-400 text-sm mb-2">Red Flags (Needs Attention)</p>
                              <div className="space-y-1">
                                {selectedTip.credibility_assessment.red_flags.map((flag, idx) => (
                                  <div key={idx} className="flex items-start gap-2 text-sm text-yellow-400">
                                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <span>{flag}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="border-t border-slate-700 pt-4">
                            <p className="text-slate-400 text-sm mb-2">Assessment Notes</p>
                            <p className="text-slate-300 text-sm">{selectedTip.credibility_assessment.assessment_notes}</p>
                            <p className="text-slate-500 text-xs mt-2">
                              Assessed by {selectedTip.credibility_assessment.assessed_by} on{' '}
                              {format(new Date(selectedTip.credibility_assessment.assessed_date), 'PPpp')}
                            </p>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="conflicts" className="space-y-4">
                  <Card className="bg-slate-900/50 border-orange-500/30">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Shield className="w-5 h-5 text-orange-400" />
                        Conflict of Interest Check
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        Cross-reference with existing investigations to detect potential retaliation claims
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedTip.conflict_check ? (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-slate-400 text-sm mb-1">Submitter Under Investigation?</p>
                              <Badge className={
                                selectedTip.conflict_check.submitter_under_investigation
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-green-500/20 text-green-400'
                              }>
                                {selectedTip.conflict_check.submitter_under_investigation ? 'YES' : 'NO'}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-slate-400 text-sm mb-1">Potential Retaliation?</p>
                              <Badge className={
                                selectedTip.conflict_check.potential_retaliation_claim
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-green-500/20 text-green-400'
                              }>
                                {selectedTip.conflict_check.potential_retaliation_claim ? 'YES' : 'NO'}
                              </Badge>
                            </div>
                          </div>

                          {selectedTip.conflict_check.related_alerts && selectedTip.conflict_check.related_alerts.length > 0 && (
                            <div>
                              <p className="text-slate-400 text-sm mb-2">Related Integrity Alerts</p>
                              <div className="space-y-2">
                                {selectedTip.conflict_check.related_alerts.map((alertId, idx) => (
                                  <Badge key={idx} variant="outline" className="text-slate-300 border-slate-600">
                                    Alert: {alertId}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {selectedTip.conflict_check.conflict_notes && (
                            <div className="border-t border-slate-700 pt-4">
                              <p className="text-slate-400 text-sm mb-2">Conflict Notes</p>
                              <p className="text-slate-300 text-sm">{selectedTip.conflict_check.conflict_notes}</p>
                            </div>
                          )}

                          {selectedTip.conflict_check.potential_retaliation_claim && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                              <p className="text-red-400 text-sm font-semibold flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Automatic External Review Required
                              </p>
                              <p className="text-slate-300 text-xs mt-2">
                                This tip must be reviewed by an independent external team to ensure unbiased assessment.
                              </p>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-slate-400 text-center py-6">No conflict check performed yet</p>
                      )}
                    </CardContent>
                  </Card>

                  {selectedTip.external_review_status !== 'not_required' && (
                    <Card className="bg-slate-900/50 border-purple-500/30">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <Users className="w-5 h-5 text-purple-400" />
                          External Review Status
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-slate-400 text-sm mb-1">Review Status</p>
                          <Badge className="bg-purple-500/20 text-purple-400">
                            {selectedTip.external_review_status}
                          </Badge>
                        </div>

                        {selectedTip.external_reviewer_id && (
                          <div>
                            <p className="text-slate-400 text-sm mb-1">Assigned Reviewer</p>
                            <p className="text-slate-300 text-sm">{selectedTip.external_reviewer_id}</p>
                          </div>
                        )}

                        {selectedTip.external_review_outcome && (
                          <div className="border-t border-slate-700 pt-3">
                            <p className="text-slate-400 text-sm mb-2">Review Outcome</p>
                            <Badge className="mb-2">
                              {selectedTip.external_review_outcome.recommendation}
                            </Badge>
                            <p className="text-slate-300 text-sm">{selectedTip.external_review_outcome.rationale}</p>
                            <p className="text-slate-500 text-xs mt-2">
                              Reviewed on {format(new Date(selectedTip.external_review_outcome.reviewed_date), 'PPpp')}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="followup" className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-400 mb-2">Add Follow-Up Note</h3>
                    <Textarea
                      value={followUpNote}
                      onChange={(e) => setFollowUpNote(e.target.value)}
                      placeholder="Enter follow-up notes..."
                      className="bg-slate-900 border-slate-600 text-white mb-2"
                      rows={4}
                    />
                    <Button onClick={() => handleAddFollowUpNote(selectedTip)} className="bg-cyan-600 hover:bg-cyan-700">
                      Add Note
                    </Button>
                  </div>

                  {selectedTip.follow_up_notes && selectedTip.follow_up_notes.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-400 mb-2">Follow-Up History</h3>
                      <div className="space-y-3">
                        {selectedTip.follow_up_notes.map((note, idx) => (
                          <div key={idx} className="bg-slate-900 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-cyan-400 text-sm">{note.added_by}</span>
                              <span className="text-slate-500 text-xs">{format(new Date(note.timestamp), 'PPpp')}</span>
                            </div>
                            <p className="text-slate-300 text-sm">{note.note}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="actions" className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => handleStatusChange(selectedTip, 'under_review')} className="bg-yellow-600 hover:bg-yellow-700">
                      Mark Under Review
                    </Button>
                    <Button onClick={() => handleStatusChange(selectedTip, 'investigating')} className="bg-orange-600 hover:bg-orange-700">
                      Start Investigation
                    </Button>
                    <Button onClick={() => handleStatusChange(selectedTip, 'resolved')} className="bg-green-600 hover:bg-green-700">
                      Mark Resolved
                    </Button>
                    <Button onClick={() => handleRouteExternal(selectedTip)} className="bg-red-600 hover:bg-red-700">
                      Route to External Review
                    </Button>
                  </div>

                  {selectedTip.routed_to_external && (
                    <Card className="bg-slate-900/50 border-red-500/30">
                      <CardContent className="pt-6">
                        <p className="text-red-400 text-sm">
                          This tip has been flagged for external review due to conflict of interest or senior leadership involvement.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}