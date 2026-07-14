import { useCallback, useEffect, useState } from 'react';

export const BRIDGE_BASE = 'http://127.0.0.1:53683';
export const COURSE_ID_KEY = 'tim.classroom.lastCourseId';

async function bridgeFetch(path, options) {
  const res = await fetch(`${BRIDGE_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error || data.reasons?.join('; ') || res.statusText;
    throw new Error(msg);
  }
  return data;
}

export function useClassroomBridge() {
  const [bridgeOnline, setBridgeOnline] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [posting, setPosting] = useState(false);

  const checkHealth = useCallback(async () => {
    try {
      const data = await bridgeFetch('/health');
      setBridgeOnline(true);
      setHasToken(!!data.hasToken);
      return data;
    } catch {
      setBridgeOnline(false);
      setHasToken(false);
      return null;
    }
  }, []);

  const loadCourses = useCallback(async () => {
    setLoadingCourses(true);
    try {
      const data = await bridgeFetch('/courses');
      setCourses(data.courses || []);
      return data.courses || [];
    } catch {
      setCourses([]);
      return [];
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const health = await checkHealth();
      if (cancelled || !health?.ok) return;
      await loadCourses();
    })();
    return () => {
      cancelled = true;
    };
  }, [checkHealth, loadCourses]);

  const postAnnouncement = useCallback(async (courseId, text) => {
    setPosting(true);
    try {
      return await bridgeFetch('/announcements', {
        method: 'POST',
        body: JSON.stringify({ courseId, text }),
      });
    } finally {
      setPosting(false);
    }
  }, []);

  return {
    bridgeOnline,
    hasToken,
    courses,
    loadingCourses,
    posting,
    checkHealth,
    loadCourses,
    postAnnouncement,
  };
}
