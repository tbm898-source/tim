import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { generateCorrelationId, trackWhistleblowerTipReceived } from '../components/utils/analytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, Lock, FileText, CheckCircle2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function WhistleblowerSubmit() {
  const [step, setStep] = useState(1);
  const [submittedTipId, setSubmittedTipId] = useState(null);
  const [formData, setFormData] = useState({
    anonymous: true,
    submitter_email: '',
    submitter_phone: '',
    category: '',
    summary: '',
    detailed_description: '',
    incident_date: '',
    incident_location: '',
    individuals_involved: '',
    witness_information: '',
    anti_retaliation_acknowledged: false
  });
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFileUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    setUploading(true);
    
    try {
      const uploadPromises = selectedFiles.map(file => 
        base44.integrations.Core.UploadPrivateFile({ file })
      );
      const results = await Promise.all(uploadPromises);
      setFiles([...files, ...results.map(r => r.file_uri)]);
    } catch (error) {
      alert('Error uploading files: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.category || !formData.summary || !formData.anti_retaliation_acknowledged) {
      alert('Please fill in required fields and acknowledge anti-retaliation protections');
      return;
    }

    setSubmitting(true);
    try {
      const tip_id = `TIP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const tipData = {
        tip_id,
        submission_method: 'web_form',
        submission_timestamp: new Date().toISOString(),
        anonymous: formData.anonymous,
        submitter_email: formData.anonymous ? null : formData.submitter_email,
        submitter_phone: formData.anonymous ? null : formData.submitter_phone,
        category: formData.category,
        summary: formData.summary,
        detailed_description: formData.detailed_description,
        incident_date: formData.incident_date || null,
        incident_location: formData.incident_location || null,
        witness_information: formData.witness_information || null,
        attachments: files,
        anti_retaliation_notice_acknowledged: formData.anti_retaliation_acknowledged,
        individuals_involved: formData.individuals_involved ? 
          formData.individuals_involved.split('\n').map(line => {
            const [name, role, department] = line.split(',').map(s => s.trim());
            return { name, role, department };
          }).filter(p => p.name) : []
      };

      const result = await base44.entities.WhistleblowerTip.create(tipData);
      
      // Track tip submission
      const correlationId = generateCorrelationId();
      await trackWhistleblowerTipReceived(result, correlationId);
      
      setSubmittedTipId(tip_id);
      setStep(3);
    } catch (error) {
      alert('Error submitting tip: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Shield className="w-12 h-12 text-cyan-400" />
              <h1 className="text-4xl font-bold text-white">Whistleblower Hotline</h1>
            </div>
            <p className="text-slate-400 text-lg">Report concerns safely and confidentially</p>
          </div>

          <Card className="bg-slate-800/50 border-cyan-500/30 mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-cyan-400" />
                Anti-Retaliation Protection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-slate-300">
              <p className="leading-relaxed">
                <strong>You are protected by law and organizational policy.</strong> Retaliation against anyone who reports 
                concerns in good faith is strictly prohibited and will result in disciplinary action.
              </p>
              
              <div className="bg-slate-900/50 p-4 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-cyan-400">Protected Activities Include:</p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>Filing a complaint or report</li>
                  <li>Participating in an investigation</li>
                  <li>Refusing to participate in suspected wrongdoing</li>
                  <li>Providing information to investigators</li>
                </ul>
              </div>

              <div className="bg-slate-900/50 p-4 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-orange-400">Prohibited Retaliation Includes:</p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>Termination, demotion, or suspension</li>
                  <li>Threats, harassment, or intimidation</li>
                  <li>Negative performance reviews or schedule changes</li>
                  <li>Any adverse employment action</li>
                </ul>
              </div>

              <p className="text-sm italic border-t border-slate-700 pt-4">
                If you experience retaliation, report it immediately to HR, the compliance officer, or through this hotline.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 mb-6">
            <CardHeader>
              <CardTitle className="text-white">Confidentiality & Process</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-slate-300 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <p><strong>Anonymous submissions are supported</strong> — You don't need to provide your name or contact information.</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <p><strong>Limited access</strong> — Tips are reviewed only by authorized compliance personnel or external reviewers.</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <p><strong>Conflict-of-interest routing</strong> — Tips involving senior leadership are automatically routed to external audit committee.</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <p><strong>You will receive a Tip ID</strong> — Save it to check status or provide additional information later.</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button onClick={() => setStep(2)} size="lg" className="bg-cyan-600 hover:bg-cyan-700">
              Continue to Submit Report
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">Submit Your Report</h1>
            <p className="text-slate-400">Provide as much detail as you're comfortable sharing</p>
          </div>

          <Card className="bg-slate-800/50 border-slate-700 mb-6">
            <CardHeader>
              <CardTitle className="text-white">Contact Information (Optional)</CardTitle>
              <CardDescription className="text-slate-400">
                Leave blank to remain anonymous. Providing contact info helps us follow up if needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox 
                  checked={formData.anonymous}
                  onCheckedChange={(checked) => setFormData({...formData, anonymous: checked})}
                />
                <label className="text-slate-300 text-sm">Submit anonymously (recommended)</label>
              </div>

              {!formData.anonymous && (
                <div className="space-y-3">
                  <Input
                    placeholder="Your email (optional)"
                    value={formData.submitter_email}
                    onChange={(e) => setFormData({...formData, submitter_email: e.target.value})}
                    className="bg-slate-900 border-slate-600 text-white"
                  />
                  <Input
                    placeholder="Your phone (optional)"
                    value={formData.submitter_phone}
                    onChange={(e) => setFormData({...formData, submitter_phone: e.target.value})}
                    className="bg-slate-900 border-slate-600 text-white"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 mb-6">
            <CardHeader>
              <CardTitle className="text-white">Report Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-slate-300 text-sm mb-2 block">Category *</label>
                <Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val})}>
                  <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="financial_misconduct">Financial Misconduct</SelectItem>
                    <SelectItem value="fraud">Fraud</SelectItem>
                    <SelectItem value="theft">Theft</SelectItem>
                    <SelectItem value="safety_violation">Safety Violation</SelectItem>
                    <SelectItem value="harassment">Harassment</SelectItem>
                    <SelectItem value="discrimination">Discrimination</SelectItem>
                    <SelectItem value="retaliation">Retaliation</SelectItem>
                    <SelectItem value="conflict_of_interest">Conflict of Interest</SelectItem>
                    <SelectItem value="policy_violation">Policy Violation</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-slate-300 text-sm mb-2 block">Brief Summary *</label>
                <Input
                  placeholder="One-sentence summary of the concern"
                  value={formData.summary}
                  onChange={(e) => setFormData({...formData, summary: e.target.value})}
                  className="bg-slate-900 border-slate-600 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 text-sm mb-2 block">Detailed Description *</label>
                <Textarea
                  placeholder="Describe what happened, when, where, and who was involved..."
                  value={formData.detailed_description}
                  onChange={(e) => setFormData({...formData, detailed_description: e.target.value})}
                  className="bg-slate-900 border-slate-600 text-white"
                  rows={6}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 text-sm mb-2 block">Incident Date</label>
                  <Input
                    type="date"
                    value={formData.incident_date}
                    onChange={(e) => setFormData({...formData, incident_date: e.target.value})}
                    className="bg-slate-900 border-slate-600 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-300 text-sm mb-2 block">Location/Department</label>
                  <Input
                    placeholder="Where did this occur?"
                    value={formData.incident_location}
                    onChange={(e) => setFormData({...formData, incident_location: e.target.value})}
                    className="bg-slate-900 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 text-sm mb-2 block">Individuals Involved (Optional)</label>
                <Textarea
                  placeholder="One per line: Name, Role, Department&#10;Example: John Doe, Manager, Finance"
                  value={formData.individuals_involved}
                  onChange={(e) => setFormData({...formData, individuals_involved: e.target.value})}
                  className="bg-slate-900 border-slate-600 text-white"
                  rows={3}
                />
              </div>

              <div>
                <label className="text-slate-300 text-sm mb-2 block">Witness Information (Optional)</label>
                <Textarea
                  placeholder="Anyone who witnessed this or has relevant information?"
                  value={formData.witness_information}
                  onChange={(e) => setFormData({...formData, witness_information: e.target.value})}
                  className="bg-slate-900 border-slate-600 text-white"
                  rows={2}
                />
              </div>

              <div>
                <label className="text-slate-300 text-sm mb-2 block flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Attachments (Optional)
                </label>
                <Input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="bg-slate-900 border-slate-600 text-white"
                  disabled={uploading}
                />
                {files.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {files.map((uri, idx) => (
                      <div key={idx} className="text-xs text-slate-400 flex items-center gap-2">
                        <FileText className="w-3 h-3" />
                        File {idx + 1} uploaded
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-red-500/30 mb-6">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Checkbox 
                  checked={formData.anti_retaliation_acknowledged}
                  onCheckedChange={(checked) => setFormData({...formData, anti_retaliation_acknowledged: checked})}
                />
                <label className="text-slate-300 text-sm leading-relaxed">
                  I acknowledge that I have read and understand the anti-retaliation protections. 
                  I am reporting this concern in good faith and understand that intentionally false reports may result in disciplinary action.
                </label>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={() => setStep(1)} variant="outline" className="border-slate-600">
              Back
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={submitting || !formData.anti_retaliation_acknowledged}
              className="bg-cyan-600 hover:bg-cyan-700 flex-1"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 3 && submittedTipId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <CheckCircle2 className="w-20 h-20 text-green-400 mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-white mb-2">Report Submitted Successfully</h1>
            <p className="text-slate-400">Your concern has been received and will be reviewed confidentially</p>
          </div>

          <Card className="bg-slate-800/50 border-cyan-500/30 mb-6">
            <CardHeader>
              <CardTitle className="text-white">Your Tip ID</CardTitle>
              <CardDescription className="text-slate-400">Save this ID to check status or provide additional information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-900 p-4 rounded-lg">
                <Badge variant="outline" className="text-cyan-400 text-lg px-4 py-2 border-cyan-500/50">
                  {submittedTipId}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">What Happens Next?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-left text-slate-300 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-cyan-400 font-bold text-xs">1</span>
                </div>
                <p>Your report will be reviewed by authorized compliance personnel within 48 hours</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-cyan-400 font-bold text-xs">2</span>
                </div>
                <p>If the report involves senior leadership, it will be automatically routed to external reviewers</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-cyan-400 font-bold text-xs">3</span>
                </div>
                <p>An investigation will be conducted if warranted, and you may be contacted for additional information</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-cyan-400 font-bold text-xs">4</span>
                </div>
                <p>All information will be kept confidential to the extent possible under applicable law</p>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6">
            <Button onClick={() => window.location.reload()} variant="outline" className="border-slate-600">
              Submit Another Report
            </Button>
          </div>
        </div>
      </div>
    );
  }
}