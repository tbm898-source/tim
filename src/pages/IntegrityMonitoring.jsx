import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertTriangle, Shield, Eye, CheckCircle2, XCircle, Clock, AlertCircle, FileText, Users, TrendingUp, Search } from 'lucide-react';
import { format } from 'date-fns';

export default function IntegrityMonitoring() {
  const [user, setUser] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Check if user has access (admin or designated reviewer roles)
        if (currentUser.role !== 'admin' && currentUser.role !== 'counselor' && currentUser.role !== 'hr_specialist') {
          window.location.href = '/';
        }
      } catch (error) {
        console.error('Auth error:', error);
        window.location.href = '/';
      }
    };
    loadUser();
  }, []);

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['integrityAlerts'],
    queryFn: () => base44.entities.IntegrityAlert.list('-created_date'),
    enabled: !!user,
  });

  const updateAlertMutation = useMutation({
    mutationFn: ({ id, updates }) => base44.entities.IntegrityAlert.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrityAlerts'] });
      setSelectedAlert(null);
      setReviewNote('');
    },
  });

  const handleStatusChange = (alert, newStatus, reason = '') => {
    const statusHistory = alert.status_history || [];
    statusHistory.push({
      timestamp: new Date().toISOString(),
      from_status: alert.status,
      to_status: newStatus,
      changed_by: user.email,
      reason
    });

    updateAlertMutation.mutate({
      id: alert.id,
      updates: {
        status: newStatus,
        status_history: statusHistory,
        reviewed_by: user.email
      }
    });
  };

  const handleAddReviewNote = (alert) => {
    if (!reviewNote.trim()) return;

    const reviewNotes = alert.review_notes || [];
    reviewNotes.push({
      timestamp: new Date().toISOString(),
      reviewer: user.email,
      note: reviewNote
    });

    updateAlertMutation.mutate({
      id: alert.id,
      updates: {
        review_notes: reviewNotes,
        reviewed_by: user.email
      }
    });
  };

  const handleEscalate = (alert, level, notifiedParties) => {
    const escalationPath = alert.escalation_path || [];
    escalationPath.push({
      level,
      timestamp: new Date().toISOString(),
      notified_parties: notifiedParties
    });

    handleStatusChange(alert, 'escalated', `Escalated to ${level}`);
    
    updateAlertMutation.mutate({
      id: alert.id,
      updates: {
        escalation_path: escalationPath
      }
    });
  };

  const filteredAlerts = alerts.filter(alert => {
    const statusMatch = filterStatus === 'all' || alert.status === filterStatus;
    const severityMatch = filterSeverity === 'all' || alert.severity === filterSeverity;
    const typeMatch = filterType === 'all' || alert.alert_type === filterType;
    const searchMatch = searchTerm === '' || 
      alert.signal_summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.associated_users?.some(email => email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return statusMatch && severityMatch && typeMatch && searchMatch;
  });

  const getSeverityColor = (severity) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800 border-blue-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      critical: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[severity] || colors.medium;
  };

  const getEscalationLevelInfo = (level) => {
    const levels = {
      0: { name: 'Informational', desc: 'Logged anomaly, no notification', color: 'text-slate-400', icon: FileText },
      1: { name: 'Review Queue', desc: 'Single signal; low confidence', color: 'text-blue-400', icon: Eye },
      2: { name: 'Internal Investigation', desc: 'Multiple corroborating signals', color: 'text-yellow-400', icon: Search },
      3: { name: 'External Review', desc: 'High materiality or systemic risk', color: 'text-orange-400', icon: AlertTriangle },
      4: { name: 'Governance/Legal/Mandatory', desc: 'Board notification or mandatory reporting', color: 'text-red-400', icon: AlertCircle }
    };
    return levels[level] || levels[0];
  };

  const getStatusIcon = (status) => {
    const icons = {
      new: <AlertCircle className="w-4 h-4" />,
      under_review: <Eye className="w-4 h-4" />,
      escalated: <AlertTriangle className="w-4 h-4" />,
      resolved: <CheckCircle2 className="w-4 h-4" />,
      false_positive: <XCircle className="w-4 h-4" />
    };
    return icons[status] || icons.new;
  };

  const stats = {
    total: alerts.length,
    new: alerts.filter(a => a.status === 'new').length,
    underReview: alerts.filter(a => a.status === 'under_review').length,
    escalated: alerts.filter(a => a.status === 'escalated').length,
    critical: alerts.filter(a => a.severity === 'critical').length
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-cyan-400 text-xl">Loading integrity monitoring system...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-cyan-400" />
            <h1 className="text-3xl font-bold text-white">Integrity Monitor</h1>
            <Badge variant="outline" className="text-slate-400 border-slate-600">Background Analytics</Badge>
          </div>
          <p className="text-slate-400">Pattern-based signals for human review • Privacy-by-design • No automated accusations</p>
        </div>

        {/* Scope Statement */}
        <Card className="bg-slate-800/50 border-cyan-500/30 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              System Scope & Purpose
            </CardTitle>
          </CardHeader>
          <CardContent className="text-slate-300 space-y-3">
            <p className="leading-relaxed">
              Integrity Monitor reviews system activity, approvals, and operational records to identify anomalies and policy mismatches. 
              Alerts are non-accusatory and are reviewed by humans. The system does not take disciplinary action automatically.
            </p>
            <div className="border-t border-slate-700 pt-3">
              <p className="text-sm leading-relaxed">
                <span className="font-semibold text-cyan-400">Evidence Packages:</span> Evidence Packages contain original records and audit metadata. 
                The system does not add conclusions; it provides traceable source data for authorized reviewers.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Total Signals</p>
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
                <Eye className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Escalated</p>
                  <p className="text-2xl font-bold text-orange-400">{stats.escalated}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Critical</p>
                  <p className="text-2xl font-bold text-red-400">{stats.critical}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Filter Signals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                placeholder="Search by summary or user..."
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
                  <SelectItem value="escalated">Escalated</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="false_positive">False Positive</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                  <SelectValue placeholder="All Severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="financial_anomaly">Financial Anomaly</SelectItem>
                  <SelectItem value="approval_mismatch">Approval Mismatch</SelectItem>
                  <SelectItem value="vendor_change">Vendor Change</SelectItem>
                  <SelectItem value="complaint_cluster">Complaint Cluster</SelectItem>
                  <SelectItem value="time_pattern">Time Pattern</SelectItem>
                  <SelectItem value="access_pattern">Access Pattern</SelectItem>
                  <SelectItem value="policy_deviation">Policy Deviation</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Alerts List */}
        <div className="space-y-4">
          {filteredAlerts.length === 0 ? (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-6 text-center">
                <Shield className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No signals match your current filters</p>
              </CardContent>
            </Card>
          ) : (
            filteredAlerts.map(alert => (
              <Card key={alert.id} className="bg-slate-800/50 border-slate-700 hover:border-cyan-500/50 transition-all cursor-pointer" onClick={() => setSelectedAlert(alert)}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        {alert.escalation_level !== undefined && (() => {
                          const levelInfo = getEscalationLevelInfo(alert.escalation_level);
                          const LevelIcon = levelInfo.icon;
                          return (
                            <Badge variant="outline" className={`${levelInfo.color} border-slate-600`}>
                              <LevelIcon className="w-3 h-3 mr-1" />
                              Level {alert.escalation_level}
                            </Badge>
                          );
                        })()}
                        <Badge variant="outline" className="text-slate-300 border-slate-600">
                          {alert.alert_type.replace(/_/g, ' ')}
                        </Badge>
                        <div className="flex items-center gap-1 text-slate-400">
                          {getStatusIcon(alert.status)}
                          <span className="text-sm">{alert.status.replace(/_/g, ' ')}</span>
                        </div>
                      </div>
                      <CardTitle className="text-white mb-2">{alert.signal_summary}</CardTitle>
                      <CardDescription className="text-slate-400">
                        Detected: {format(new Date(alert.detection_timestamp || alert.created_date), 'PPpp')}
                        {alert.detection_method && ` • Method: ${alert.detection_method}`}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {alert.associated_users && alert.associated_users.length > 0 && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">Associated: {alert.associated_users.join(', ')}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Alert Detail Dialog */}
        {selectedAlert && (
          <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
            <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Badge className={getSeverityColor(selectedAlert.severity)}>
                    {selectedAlert.severity}
                  </Badge>
                  {selectedAlert.signal_summary}
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  Signal ID: {selectedAlert.id} • Detected: {format(new Date(selectedAlert.detection_timestamp || selectedAlert.created_date), 'PPpp')}
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="details" className="mt-4">
                <TabsList className="bg-slate-900">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="review">Review Notes</TabsTrigger>
                  <TabsTrigger value="history">Status History</TabsTrigger>
                  <TabsTrigger value="evidence">Evidence</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4">
                  {selectedAlert.escalation_level !== undefined && (() => {
                    const levelInfo = getEscalationLevelInfo(selectedAlert.escalation_level);
                    const LevelIcon = levelInfo.icon;
                    return (
                      <Card className="bg-slate-900/50 border-slate-700">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-3">
                            <LevelIcon className={`w-6 h-6 ${levelInfo.color} mt-1`} />
                            <div>
                              <h3 className={`text-lg font-semibold ${levelInfo.color}`}>
                                Level {selectedAlert.escalation_level}: {levelInfo.name}
                              </h3>
                              <p className="text-slate-400 text-sm mt-1">{levelInfo.desc}</p>
                              {selectedAlert.escalation_level_rationale && (
                                <p className="text-slate-300 text-sm mt-2 italic">
                                  Rationale: {selectedAlert.escalation_level_rationale}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}

                  <div>
                    <h3 className="text-sm font-semibold text-slate-400 mb-2">Alert Type</h3>
                    <p className="text-white">{selectedAlert.alert_type.replace(/_/g, ' ')}</p>
                  </div>

                  {selectedAlert.associated_users && selectedAlert.associated_users.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-400 mb-2">Associated Users</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedAlert.associated_users.map(email => (
                          <Badge key={email} variant="outline" className="text-slate-300 border-slate-600">
                            {email}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedAlert.signal_details && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-400 mb-2">Signal Details</h3>
                      <pre className="bg-slate-900 p-4 rounded-lg text-sm text-slate-300 overflow-x-auto">
                        {JSON.stringify(selectedAlert.signal_details, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button onClick={() => handleStatusChange(selectedAlert, 'under_review')} className="bg-yellow-600 hover:bg-yellow-700">
                      Mark Under Review
                    </Button>
                    <Button onClick={() => handleStatusChange(selectedAlert, 'resolved')} className="bg-green-600 hover:bg-green-700">
                      Mark Resolved
                    </Button>
                    <Button onClick={() => handleStatusChange(selectedAlert, 'false_positive')} variant="outline" className="border-slate-600">
                      Mark False Positive
                    </Button>
                    <Button onClick={() => handleEscalate(selectedAlert, 'external_forensic', [])} className="bg-red-600 hover:bg-red-700">
                      Escalate to External Team
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="review" className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-400 mb-2">Add Review Note</h3>
                    <Textarea
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      placeholder="Enter your review notes..."
                      className="bg-slate-900 border-slate-600 text-white mb-2"
                      rows={4}
                    />
                    <Button onClick={() => handleAddReviewNote(selectedAlert)} className="bg-cyan-600 hover:bg-cyan-700">
                      Add Note
                    </Button>
                  </div>

                  {selectedAlert.review_notes && selectedAlert.review_notes.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-400 mb-2">Review History</h3>
                      <div className="space-y-3">
                        {selectedAlert.review_notes.map((note, idx) => (
                          <div key={idx} className="bg-slate-900 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-cyan-400 text-sm">{note.reviewer}</span>
                              <span className="text-slate-500 text-xs">{format(new Date(note.timestamp), 'PPpp')}</span>
                            </div>
                            <p className="text-slate-300 text-sm">{note.note}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                  {selectedAlert.status_history && selectedAlert.status_history.length > 0 ? (
                    <div className="space-y-3">
                      {selectedAlert.status_history.map((entry, idx) => (
                        <div key={idx} className="bg-slate-900 p-4 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="border-slate-600 text-slate-400">
                                {entry.from_status} → {entry.to_status}
                              </Badge>
                            </div>
                            <span className="text-slate-500 text-xs">{format(new Date(entry.timestamp), 'PPpp')}</span>
                          </div>
                          <p className="text-slate-400 text-sm">Changed by: {entry.changed_by}</p>
                          {entry.reason && <p className="text-slate-300 text-sm mt-1">Reason: {entry.reason}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-center py-8">No status changes recorded yet</p>
                  )}
                </TabsContent>

                <TabsContent value="evidence" className="space-y-4">
                  {selectedAlert.evidence_hash && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-400 mb-2">Evidence Hash (Forensic Integrity)</h3>
                      <p className="bg-slate-900 p-3 rounded text-cyan-400 font-mono text-xs break-all">
                        {selectedAlert.evidence_hash}
                      </p>
                    </div>
                  )}

                  {selectedAlert.evidence_snapshot && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-400 mb-2">Evidence Snapshot</h3>
                      <pre className="bg-slate-900 p-4 rounded-lg text-sm text-slate-300 overflow-x-auto max-h-96">
                        {JSON.stringify(selectedAlert.evidence_snapshot, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedAlert.escalation_path && selectedAlert.escalation_path.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-400 mb-2">Escalation Trail</h3>
                      <div className="space-y-3">
                        {selectedAlert.escalation_path.map((escalation, idx) => (
                          <div key={idx} className="bg-slate-900 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <Badge className="bg-orange-600">{escalation.level}</Badge>
                              <span className="text-slate-500 text-xs">{format(new Date(escalation.timestamp), 'PPpp')}</span>
                            </div>
                            {escalation.notified_parties && escalation.notified_parties.length > 0 && (
                              <p className="text-slate-300 text-sm">
                                Notified: {escalation.notified_parties.join(', ')}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedAlert.external_case_id && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-400 mb-2">External Case Reference</h3>
                      <p className="bg-slate-900 p-3 rounded text-cyan-400 font-mono">
                        {selectedAlert.external_case_id}
                      </p>
                    </div>
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