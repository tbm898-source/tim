import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, Database } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const EXAMPLE_PAYLOAD = {
  integrityAlert: {
    alert_type: "financial_anomaly",
    severity: "high",
    escalation_level: 2,
    escalation_level_rationale: "Multiple corroborating signals detected",
    associated_users: ["john.doe@example.test"],
    status: "under_review",
    signal_summary: "Unusual pattern detected in expense approvals",
    signal_details: {
      transaction_ids: ["TXN-001", "TXN-002"],
      entity_type: "expense_report",
      entity_ids: ["EXP-2024-123", "EXP-2024-124"],
      date_range: {
        start: "2024-01-01T00:00:00Z",
        end: "2024-01-31T23:59:59Z"
      },
      metadata: {
        total_amount: 50000,
        approval_speed_seconds: 120
      }
    },
    detection_method: "AI pattern analysis",
    detection_timestamp: "2024-02-01T10:00:00Z",
    evidence_snapshot: {
      expense_reports_count: 2,
      average_approval_time: "2 minutes"
    }
  },
  whistleblowerTip: {
    tip_id: "TIP-2024-001",
    submission_method: "web_form",
    submission_timestamp: "2024-02-01T09:30:00Z",
    anonymous: true,
    category: "financial_misconduct",
    summary: "Unusual expense approval patterns observed",
    detailed_description: "Pattern of rapid approvals for large expense amounts",
    incident_date: "2024-01-15",
    incident_location: "Finance Department",
    status: "credibility_review",
    priority: "high"
  },
  evidencePackage: {
    package_id: "EVP-2024-001",
    created_by: "system@example.test",
    created_timestamp: "2024-02-01T10:05:00Z",
    file_hashes: [],
    source_metadata: {
      system_name: "Integrity Monitoring System",
      database_name: "pilot_db",
      entities_queried: ["IntegrityAlert", "WhistleblowerTip"],
      extraction_timestamp: "2024-02-01T10:05:00Z"
    },
    access_log: [],
    chain_of_custody: [],
    package_status: "active"
  },
  talentInsight: {
    employee_email: "jane.smith@example.test",
    employee_name: "Jane Smith",
    profile_generated_date: "2024-02-01T12:00:00Z",
    skills_evidence: [
      {
        skill_name: "Data Analysis",
        evidence_type: "certification",
        evidence_link: "https://example.test/cert/123",
        date_achieved: "2024-01-15",
        verified_by: "training@example.test"
      }
    ],
    strength_profile: [
      {
        skill: "Data Analysis",
        rank: 1,
        evidence_count: 3,
        evidence_links: ["https://example.test/cert/123"]
      }
    ],
    generated_by: "AI Talent System",
    visible_to_roles: ["admin", "leadership"]
  }
};

export default function AdminSeedPilotData() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [payload, setPayload] = useState(JSON.stringify(EXAMPLE_PAYLOAD, null, 2));
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setLoading(false);
      if (!u || u.role !== 'admin') {
        setError('Admin access required');
      }
    }).catch(() => {
      setLoading(false);
      setError('Authentication failed');
    });
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    setError(null);
    setResult(null);

    try {
      const parsedPayload = JSON.parse(payload);
      const response = await base44.functions.invoke('seedPilotIntegrityPack', parsedPayload);
      
      if (response.data.ok) {
        setResult(response.data);
      } else {
        setError(response.data.error || 'Seeding failed');
      }
    } catch (err) {
      setError(err.message || 'Invalid JSON or seeding failed');
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Admin access required to seed pilot data</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-cyan-300 flex items-center gap-2">
          <Database className="h-8 w-8" />
          Admin: Seed Pilot Data
        </h1>
        <p className="text-gray-400 mt-2">
          Create linked IntegrityAlert, WhistleblowerTip, EvidencePackage, and TalentInsight records
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>JSON Payload</CardTitle>
            <CardDescription>
              Edit the payload below or use the example template
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              className="font-mono text-sm min-h-[400px] bg-gray-900 text-white"
              placeholder="Paste JSON payload..."
            />
            <div className="mt-4 flex gap-2">
              <Button
                onClick={handleSeed}
                disabled={seeding}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                {seeding ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Seeding...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Seed Pilot Data
                  </>
                )}
              </Button>
              <Button
                onClick={() => setPayload(JSON.stringify(EXAMPLE_PAYLOAD, null, 2))}
                variant="outline"
              >
                Reset to Example
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && result.ok && (
          <Card className="border-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-400">
                <CheckCircle className="h-5 w-5" />
                Pilot Data Seeded Successfully
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-sm text-gray-400 mb-2">Created Records</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500">IntegrityAlert:</span>{' '}
                      <code className="text-cyan-400">{result.created.integrityAlert_id}</code>
                    </div>
                    <div>
                      <span className="text-gray-500">WhistleblowerTip:</span>{' '}
                      <code className="text-cyan-400">{result.created.whistleblowerTip_id}</code>
                    </div>
                    <div>
                      <span className="text-gray-500">EvidencePackage:</span>{' '}
                      <code className="text-cyan-400">{result.created.evidencePackage_id}</code>
                    </div>
                    <div>
                      <span className="text-gray-500">TalentInsight:</span>{' '}
                      <code className="text-cyan-400">{result.created.talentInsight_id}</code>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-400 mb-2">Custom References</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500">Tip ID:</span>{' '}
                      <code className="text-green-400">{result.custom_refs.tip_id}</code>
                    </div>
                    <div>
                      <span className="text-gray-500">Package ID:</span>{' '}
                      <code className="text-green-400">{result.custom_refs.package_id}</code>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-semibold text-sm text-gray-400 mb-3">View Records</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Link to={createPageUrl('IntegrityMonitoring')}>
                    <Button variant="outline" size="sm" className="w-full">
                      View Integrity Alerts
                    </Button>
                  </Link>
                  <Link to={createPageUrl('WhistleblowerReview')}>
                    <Button variant="outline" size="sm" className="w-full">
                      View Whistleblower Tips
                    </Button>
                  </Link>
                  <Link to={createPageUrl('TalentInsights')}>
                    <Button variant="outline" size="sm" className="w-full">
                      View Talent Insights
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}