import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, AlertCircle, Clock, FileText, Users, ExternalLink } from 'lucide-react';
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