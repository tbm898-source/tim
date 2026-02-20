import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Eye, Lock, FileText, CheckCircle2 } from 'lucide-react';

export default function PrivacyNotice() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-cyan-400" />
            <h1 className="text-3xl font-bold text-white">Privacy Notice</h1>
            <Badge variant="outline" className="text-slate-400 border-slate-600">Oregon OCPA Compliant</Badge>
          </div>
          <p className="text-slate-400">Transparency in data collection and use</p>
        </div>

        {/* Core Privacy Statement */}
        <Card className="bg-slate-800/50 border-cyan-500/30 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Our Privacy Commitment</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-300 space-y-3">
            <p className="leading-relaxed text-lg">
              We collect only the information needed to operate programs safely and effectively. 
              Access is role-based. High-risk alerts are reviewed by humans. 
              You can request access/correction of your data where applicable.
            </p>
          </CardContent>
        </Card>

        {/* Oregon-Specific Notice */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Oregon Consumer Privacy Act (OCPA) Notice</CardTitle>
            <CardDescription className="text-slate-400">
              Effective January 1, 2026
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-300">
            <div>
              <h3 className="font-semibold text-white mb-2">Who OCPA Protects</h3>
              <p className="text-sm leading-relaxed">
                The Oregon Consumer Privacy Act applies to <strong>consumer data</strong>, which includes students, 
                community members, and program participants. Under Oregon law, OCPA does <strong>not</strong> apply to 
                employment records or data collected about employees or job applicants in their capacity as employees.
              </p>
            </div>

            <div className="border-t border-slate-700 pt-4">
              <h3 className="font-semibold text-white mb-2">Special Protections for Minors</h3>
              <p className="text-sm leading-relaxed mb-2">
                For consumers under the age of 16, we do not:
              </p>
              <ul className="text-sm space-y-1 list-disc list-inside ml-2">
                <li>Use personal data for profiling in furtherance of decisions with legal or significant effects</li>
                <li>Engage in targeted advertising without explicit consent</li>
                <li>Sell personal data without verifiable parental consent</li>
              </ul>
            </div>

            <div className="border-t border-slate-700 pt-4">
              <h3 className="font-semibold text-white mb-2">Universal Opt-Out Mechanism</h3>
              <p className="text-sm leading-relaxed">
                Starting January 1, 2026, Oregon residents can use a universal opt-out mechanism to signal their 
                privacy preferences. We honor Global Privacy Control (GPC) signals and similar browser-based opt-out signals.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Data Collection Principles */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              What Data We Collect
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-slate-900/50 p-4 rounded-lg">
              <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                Student & Community Member Data (OCPA-Protected)
              </h4>
              <ul className="text-sm text-slate-300 space-y-1 list-disc list-inside">
                <li>Learning progress and course enrollment</li>
                <li>Assessment scores and assignment submissions</li>
                <li>System usage and activity logs</li>
                <li>Contact information (email, phone if provided)</li>
              </ul>
            </div>

            <div className="bg-slate-900/50 p-4 rounded-lg">
              <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-orange-400" />
                Employee Data (Not Subject to OCPA)
              </h4>
              <ul className="text-sm text-slate-300 space-y-1 list-disc list-inside">
                <li>Work performance and training completion</li>
                <li>Asset assignments and maintenance tasks</li>
                <li>Integrity monitoring signals (reviewed by humans)</li>
                <li>Talent development insights (evidence-based)</li>
              </ul>
            </div>

            <div className="bg-slate-900/50 p-4 rounded-lg">
              <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                <Lock className="w-4 h-4 text-yellow-400" />
                Confidential Data (All Users)
              </h4>
              <ul className="text-sm text-slate-300 space-y-1 list-disc list-inside">
                <li>Whistleblower submissions (anonymous by default)</li>
                <li>Incident reports and investigations</li>
                <li>Camera footage (privacy-level classified)</li>
                <li>Evidence packages (forensic integrity maintained)</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Access Controls */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-cyan-400" />
              Who Can Access Your Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-slate-300">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-white">Role-Based Access Control</p>
                <p className="text-sm">Access to data is restricted by role. Admins, instructors, and compliance officers 
                have different levels of access based on job function.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-white">Human Review Required</p>
                <p className="text-sm">All high-risk alerts from integrity monitoring and AI systems require 
                human review before any action is taken. No automated decisions.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-white">Limited Retention</p>
                <p className="text-sm">Data is retained only as long as necessary for program operation, 
                legal compliance, and safety requirements.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-white">External Escalation Protocols</p>
                <p className="text-sm">Certain high-severity issues may be escalated to external reviewers, 
                board members, or legal counsel as required by policy or law.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Your Rights */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Your Data Rights</CardTitle>
            <CardDescription className="text-slate-400">
              For students, community members, and other consumers under OCPA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-slate-300 text-sm">
            <div className="bg-slate-900/50 p-3 rounded-lg">
              <p className="font-semibold text-white mb-1">Access</p>
              <p>Request confirmation of what personal data we process about you and obtain a copy.</p>
            </div>

            <div className="bg-slate-900/50 p-3 rounded-lg">
              <p className="font-semibold text-white mb-1">Correction</p>
              <p>Request correction of inaccurate personal data.</p>
            </div>

            <div className="bg-slate-900/50 p-3 rounded-lg">
              <p className="font-semibold text-white mb-1">Deletion</p>
              <p>Request deletion of your personal data, subject to legal retention requirements.</p>
            </div>

            <div className="bg-slate-900/50 p-3 rounded-lg">
              <p className="font-semibold text-white mb-1">Opt-Out of Sale/Targeted Advertising</p>
              <p>We do not sell personal data or engage in targeted advertising for consumers under 16. 
              Other consumers can opt out via browser signals or by contacting us.</p>
            </div>

            <div className="bg-slate-900/50 p-3 rounded-lg">
              <p className="font-semibold text-white mb-1">Non-Discrimination</p>
              <p>You will not be discriminated against for exercising your privacy rights.</p>
            </div>

            <div className="border-t border-slate-700 pt-3 mt-3">
              <p className="text-xs italic text-slate-400">
                <strong>Note for Employees:</strong> As an employee or job applicant, OCPA does not apply to 
                your employment records. However, you may have rights under other employment laws and organizational policies.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Exercise Your Rights or Contact Us</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-300 space-y-3">
            <p className="text-sm leading-relaxed">
              To exercise your privacy rights, correct your data, or ask questions about our privacy practices, 
              please contact your administrator or our privacy officer.
            </p>
            <p className="text-xs text-slate-400 italic">
              This privacy notice was last updated on February 20, 2026 to reflect Oregon Consumer Privacy Act requirements.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}