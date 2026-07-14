import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { gateContent } from '@/lib/aya-gate';
import {
  DEFAULT_POST_TYPE_ID,
  buildPrompt,
  getPostType,
  getOrderedPostTypes,
  getPostTypeSelectLabel,
  SESSION_STORAGE_KEY,
} from '@/lib/classroom-prompt-templates';
import AyaGateResult from '@/components/classroom/AyaGateResult';
import ClassroomPostActions from '@/components/classroom/ClassroomPostActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, FileEdit, Copy, ShieldCheck, ExternalLink, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const INSTRUCTOR_ROLES = ['admin', 'instructor'];

function loadSessionState() {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSessionState(state) {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

export default function ClassroomDraftHelper() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [postTypeId, setPostTypeId] = useState(DEFAULT_POST_TYPE_ID);
  const [fieldValues, setFieldValues] = useState({});
  const [finalDraft, setFinalDraft] = useState('');
  const [gateResult, setGateResult] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  const orderedPostTypes = useMemo(() => getOrderedPostTypes(), []);

  useEffect(() => {
    const saved = loadSessionState();
    if (saved?.postTypeId) setPostTypeId(saved.postTypeId);
    if (saved?.fieldValues) setFieldValues(saved.fieldValues);

    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        if (!INSTRUCTOR_ROLES.includes(currentUser.role)) {
          window.location.href = '/';
          return;
        }
      } catch (error) {
        console.error('Auth error:', error);
        window.location.href = '/';
      } finally {
        setAuthChecked(true);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!authChecked || !user) return;
    saveSessionState({ postTypeId, fieldValues });
  }, [postTypeId, fieldValues, authChecked, user]);

  const postType = useMemo(() => getPostType(postTypeId), [postTypeId]);

  const promptResult = useMemo(
    () => buildPrompt(postTypeId, fieldValues),
    [postTypeId, fieldValues]
  );

  const stepLabel = finalDraft.trim()
    ? 'Step 2: Paste & approve (AYA check → post or copy)'
    : 'Step 1: Copy prompt → ChatGPT sidebar';

  const handlePostTypeChange = (nextId) => {
    setPostTypeId(nextId);
    setFieldValues({});
    setGateResult(null);
  };

  const handleFieldChange = (key, value) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
    setGateResult(null);
  };

  const copyText = async (value, label) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  const handleCopyPrompt = () => {
    if (!promptResult.ok) {
      toast.error(`Fill required fields: ${promptResult.missingFields.join(', ')}`);
      return;
    }
    copyText(promptResult.prompt, 'ChatGPT prompt');
  };

  const handleGateCheck = () => {
    if (!finalDraft.trim()) {
      toast.error('Paste your ChatGPT draft first');
      return;
    }
    const result = gateContent(finalDraft.trim());
    setGateResult(result);
    if (result.ok) toast.success('AYA check passed');
    else toast.error('AYA check failed — fix issues before posting');
  };

  const handleClearDraft = () => {
    setFinalDraft('');
    setGateResult(null);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 text-white p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-cyan-300 mb-2 flex items-center gap-3">
            <FileEdit className="h-9 w-9" />
            Classroom Draft
          </h1>
          <p className="text-gray-400">
            Draft in ChatGPT sidebar → paste here → AYA check → post or copy.
          </p>
          <p className="text-sm text-cyan-400/80 mt-2">{stepLabel}</p>
          <p className="text-sm text-gray-500 mt-2">
            Prefer in-app AI draft?{' '}
            <Link to="/ClassroomPublisher" className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1">
              Classroom AI
              <ExternalLink className="h-3 w-3" />
            </Link>
          </p>
        </div>

        <Card className="bg-gray-900/50 border-cyan-500/30">
          <CardHeader>
            <CardTitle className="text-cyan-200">Build ChatGPT prompt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Post type</label>
              <Select value={postTypeId} onValueChange={handlePostTypeChange}>
                <SelectTrigger className="bg-black/40 border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {orderedPostTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {getPostTypeSelectLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">{postType.description}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {postType.fields.map((field) => (
                <div
                  key={field.key}
                  className={field.type === 'textarea' ? 'sm:col-span-2' : ''}
                >
                  <label className="text-sm text-gray-400 mb-1 block">
                    {field.label}
                    {field.key === 'officeHoursTime' && postType.id === 'after_class_recap' && (
                      <span className="text-gray-600"> (optional)</span>
                    )}
                  </label>
                  {field.type === 'select' ? (
                    <Select
                      value={fieldValues[field.key] || ''}
                      onValueChange={(v) => handleFieldChange(field.key, v)}
                    >
                      <SelectTrigger className="bg-black/40 border-gray-700">
                        <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : field.type === 'textarea' ? (
                    <Textarea
                      value={fieldValues[field.key] || ''}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="min-h-[100px] bg-black/40 border-gray-700"
                    />
                  ) : (
                    <Input
                      value={fieldValues[field.key] || ''}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="bg-black/40 border-gray-700"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleCopyPrompt}
                disabled={!promptResult.ok}
                className="bg-cyan-600 hover:bg-cyan-500"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy prompt for ChatGPT
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPrompt((v) => !v)}
                className="text-gray-400"
              >
                {showPrompt ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                {showPrompt ? 'Hide prompt' : 'Show prompt'}
              </Button>
            </div>

            {showPrompt && (
              <Textarea
                readOnly
                value={promptResult.ok ? promptResult.prompt : ''}
                placeholder={
                  promptResult.missingFields.length > 0
                    ? `Fill in: ${promptResult.missingFields.join(', ')}`
                    : 'Complete the fields above to generate a prompt'
                }
                className="min-h-[140px] bg-black/40 border-gray-700 font-mono text-sm"
              />
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-cyan-500/30">
          <CardHeader>
            <CardTitle className="text-cyan-200 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Review & approve
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={finalDraft}
              onChange={(e) => {
                setFinalDraft(e.target.value);
                setGateResult(null);
              }}
              placeholder="Paste the announcement ChatGPT generated for you"
              className="min-h-[180px] bg-black/40 border-gray-700"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">{finalDraft.length.toLocaleString()} characters</p>
              <Button type="button" variant="ghost" size="sm" onClick={handleClearDraft} className="text-gray-400 h-7">
                <RotateCcw className="h-3 w-3 mr-1" />
                Clear & new post
              </Button>
            </div>

            <Button variant="secondary" onClick={handleGateCheck} disabled={!finalDraft.trim()}>
              <ShieldCheck className="h-4 w-4 mr-2" />
              Run AYA check
            </Button>

            <AyaGateResult gateResult={gateResult} />

            <ClassroomPostActions
              draftText={finalDraft}
              gateResult={gateResult}
              showCopyAnnouncement
              onPostSuccess={handleClearDraft}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
