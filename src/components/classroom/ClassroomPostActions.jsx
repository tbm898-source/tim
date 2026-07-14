import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Copy, Loader2, Megaphone, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { buildPostCommand } from '@/lib/aya-gate';
import { COURSE_ID_KEY, useClassroomBridge } from '@/lib/useClassroomBridge';

export default function ClassroomPostActions({
  draftText,
  gateResult,
  showCopyAnnouncement = false,
  onPostSuccess,
}) {
  const {
    bridgeOnline,
    hasToken,
    courses,
    loadingCourses,
    posting,
    checkHealth,
    loadCourses,
    postAnnouncement,
  } = useClassroomBridge();

  const [courseId, setCourseId] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(COURSE_ID_KEY);
    if (saved) setCourseId(saved);
  }, []);

  useEffect(() => {
    if (courseId.trim()) {
      localStorage.setItem(COURSE_ID_KEY, courseId.trim());
    }
  }, [courseId]);

  const trimmedDraft = draftText?.trim() || '';
  const ayaPassed = gateResult?.ok === true;
  const canPost = ayaPassed && courseId.trim() && trimmedDraft && bridgeOnline && hasToken;

  const postCommand = useMemo(() => {
    if (!courseId.trim() || !trimmedDraft) return '';
    return buildPostCommand(courseId.trim(), trimmedDraft);
  }, [courseId, trimmedDraft]);

  const copyText = async (value, label) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  const handlePost = async () => {
    if (!canPost) return;
    try {
      const result = await postAnnouncement(courseId.trim(), trimmedDraft);
      toast.success(`Posted to Classroom (${result.id || 'ok'})`);
      onPostSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Post failed');
    }
  };

  const handleRefreshBridge = async () => {
    const health = await checkHealth();
    if (health?.ok) {
      await loadCourses();
      toast.success('Bridge connected');
    } else {
      toast.error('Bridge offline — run npm run teach:start');
    }
  };

  return (
    <div className="space-y-4 pt-2 border-t border-gray-800">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-500">
          {bridgeOnline && hasToken ? (
            <span className="text-green-400/90">Bridge connected — one-click post available</span>
          ) : bridgeOnline && !hasToken ? (
            <span className="text-amber-400/90">Bridge running — run npm run teach:auth-google</span>
          ) : (
            <span>
              Bridge offline —{' '}
              <code className="text-cyan-400/80">npm run teach:wizard</code> once, or{' '}
              <code className="text-cyan-400/80">npm run teach:start</code> for this session
            </span>
          )}
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={handleRefreshBridge} className="h-7 px-2">
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      <div>
        <label className="text-sm text-gray-400 mb-1 block">Course</label>
        {bridgeOnline && courses.length > 0 ? (
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger className="bg-black/40 border-gray-700">
              <SelectValue placeholder={loadingCourses ? 'Loading…' : 'Select course'} />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <>
            <Input
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              placeholder="Course ID — npm run teach:courses"
              className="bg-black/40 border-gray-700 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              List courses: <code className="text-cyan-400/80">npm run teach:courses</code>
            </p>
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {bridgeOnline && hasToken && (
          <Button
            disabled={!canPost || posting}
            onClick={handlePost}
            className="bg-green-700 hover:bg-green-600"
          >
            {posting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Megaphone className="h-4 w-4 mr-2" />
            )}
            Post to Classroom
          </Button>
        )}
        {showCopyAnnouncement && (
          <Button
            variant="outline"
            disabled={!ayaPassed || !trimmedDraft}
            onClick={() => copyText(trimmedDraft, 'Approved announcement')}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy announcement
          </Button>
        )}
        <Button
          variant="outline"
          disabled={!postCommand || (gateResult && !gateResult.ok)}
          onClick={() => copyText(postCommand, 'Post command')}
        >
          <Copy className="h-4 w-4 mr-2" />
          Copy post command
        </Button>
      </div>
    </div>
  );
}
