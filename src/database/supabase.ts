import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { env } from '../config/env.js';

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  realtime: {
    // Node < 22 has no global WebSocket; supabase-js still constructs RealtimeClient.
    transport: WebSocket as never,
  },
});
