import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { InvokeLLM } from '@/api/integrations';
import { gateContent } from '@/lib/aya-gate';
import AyaGateResult from '@/components/classroom/AyaGateResult';
import ClassroomPostActions from '@/components/classroom/ClassroomPostActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, ShieldCheck, ExternalLink, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export default function ClassroomPublisher() {
  const [prompt, setPrompt] = useState('');
  const [draft, setDraft] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);
  const [gateResult, setGateResult] = useState(null);

  const stepLabel = draft.trim()
    ? 'Step 2: Review, AYA check → post or copy command'
    : 'Step 1: Draft with TIM AI';

  const handleDraft = async () => {
    if (!prompt.trim()) {
      toast.error('Enter a prompt first');
      return;
    }
    setIsDrafting(true);
    setGateResult(null);
    try {
      const text = await InvokeLLM({
        prompt: `Draft a Google Classroom announcement for a teacher. Plain language, appropriate for secondary/college students. No markdown fences. Output only the announcement body.

Teacher request: ${prompt.trim()}`,
      });
      setDraft(typeof text === 'string' ? text.trim() : String(text ?? '').trim());
      toast.success('Draft ready — review and run AYA check');
    } catch (error) {
      console.error(error);
      toast.error('Draft failed — check Base44 connection');
    } finally {
      setIsDrafting(false);
    }
  };

  const handleGateCheck = () => {
    if (!draft.trim()) {
      toast.error('Nothing to check');
      return;
    }
    const result = gateContent(draft.trim());
    setGateResult(result);
    if (result.ok) toast.success('AYA check passed');
    else toast.error('AYA check failed — fix issues before posting');
  };

  const handleClearDraft = () => {
    setDraft('');
    setGateResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 text-white p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-cyan-300 mb-2">Classroom AI</h1>
          <p className="text-gray-400">
            Draft in TIM, check AYA policy, then post via the local bridge on your Mac.
          </p>
          <p className="text-sm text-cyan-400/80 mt-2">{stepLabel}</p>
          <p className="text-sm text-gray-500 mt-2">
            Prefer ChatGPT sidebar?{' '}
            <Link to="/ClassroomDraftHelper" className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1">
              Classroom Draft
              <ExternalLink className="h-3 w-3" />
            </Link>
          </p>
        </div>

        <Card className="bg-gray-900/50 border-cyan-500/30">
          <CardHeader>
            <CardTitle className="text-cyan-200 flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Draft with AI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Remind students about safety gear for Thursday lab and where to submit photos"
              className="min-h-[100px] bg-black/40 border-gray-700"
            />
            <Button onClick={handleDraft} disabled={isDrafting} className="bg-cyan-600 hover:bg-cyan-500">
              {isDrafting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Draft with AI
            </Button>
            <Textarea
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setGateResult(null);
              }}
              placeholder="Announcement text (edit before posting)"
              className="min-h-[180px] bg-black/40 border-gray-700"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">{draft.length.toLocaleString()} characters</p>
              <Button type="button" variant="ghost" size="sm" onClick={handleClearDraft} className="text-gray-400 h-7">
                <RotateCcw className="h-3 w-3 mr-1" />
                Clear & new post
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-cyan-500/30">
          <CardHeader>
            <CardTitle className="text-cyan-200 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Review & publish
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="secondary" onClick={handleGateCheck} disabled={!draft.trim()}>
              <ShieldCheck className="h-4 w-4 mr-2" />
              Run AYA check
            </Button>

            <AyaGateResult gateResult={gateResult} />

            <ClassroomPostActions
              draftText={draft}
              gateResult={gateResult}
              onPostSuccess={handleClearDraft}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
