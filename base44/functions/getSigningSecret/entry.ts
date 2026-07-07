/**
 * getSigningSecret — returns the current TIM_COMMAND_SIGNING_SECRET to admins.
 * Optionally regenerates it when { rotate: true } is passed in the body.
 * NOTE: Rotation only updates the in-memory response; to truly rotate the secret
 * the admin must paste the new value into Base44 Settings → Secrets.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const secret = Deno.env.get('TIM_COMMAND_SIGNING_SECRET') || '';

    // If rotate requested, generate a new random secret and return it
    // (admin must then copy it into Base44 Secrets settings manually)
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    if (body.rotate) {
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      const newSecret = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
      return Response.json({ secret: newSecret, rotated: true });
    }

    return Response.json({ secret });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});