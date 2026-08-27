import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

// Temporary build-time probe for the real signup -> approval -> login flow.
function must(value, name) {
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const url = must(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL, 'SUPABASE_URL');
const anonKey = must(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY, 'SUPABASE_ANON_KEY');
const serviceKey = must(process.env.SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY');

function anonClient() {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

const service = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const nonce = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
const email = `inc-e2e-${nonce}@mailinator.com`;
const password = `E2e-${crypto.randomBytes(12).toString('base64url')}!9a`;
let userId = null;
const steps = [];

function pass(step, detail = null) {
  steps.push({ step, ok: true, detail });
  console.log(`[E2E PASS] ${step}`, detail ?? '');
}

function assert(condition, step, detail = null) {
  if (!condition) {
    steps.push({ step, ok: false, detail });
    console.error(`[E2E FAIL] ${step}`, detail ?? '');
    throw new Error(`${step} failed${detail ? `: ${JSON.stringify(detail)}` : ''}`);
  }
  pass(step, detail);
}

try {
  const signupClient = anonClient();
  const { data: signup, error: signupError } = await signupClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: 'E2E 테스트 회원',
        phone: '010-0000-0000',
        affiliation: 'INC E2E Test',
      },
    },
  });

  assert(!signupError && signup?.user, 'signup', signupError?.message ?? { sessionCreated: Boolean(signup?.session) });
  userId = signup.user.id;

  const { data: pendingProfile, error: profileError } = await service
    .from('profiles')
    .select('id,email,name,phone,affiliation,role,approved,review_status,hidden_from_member_management')
    .eq('id', userId)
    .maybeSingle();

  assert(
    !profileError &&
      pendingProfile?.role === 'member' &&
      pendingProfile?.approved === false &&
      pendingProfile?.review_status === 'pending' &&
      pendingProfile?.name === 'E2E 테스트 회원' &&
      pendingProfile?.phone === '010-0000-0000' &&
      pendingProfile?.affiliation === 'INC E2E Test' &&
      pendingProfile?.hidden_from_member_management === false,
    'profile-trigger',
    profileError?.message ?? pendingProfile,
  );

  const { error: confirmError } = await service.auth.admin.updateUserById(userId, { email_confirm: true });
  assert(!confirmError, 'email-confirm-for-test', confirmError?.message ?? null);

  const pendingLogin = anonClient();
  const { data: pendingSession, error: pendingLoginError } = await pendingLogin.auth.signInWithPassword({ email, password });
  assert(!pendingLoginError && pendingSession?.session, 'login-before-approval', pendingLoginError?.message ?? null);

  const { data: pendingSelfProfile, error: pendingSelfError } = await pendingLogin
    .from('profiles')
    .select('approved,review_status')
    .eq('id', userId)
    .maybeSingle();
  assert(
    !pendingSelfError && pendingSelfProfile?.approved === false && pendingSelfProfile?.review_status === 'pending',
    'app-sees-pending-state',
    pendingSelfError?.message ?? pendingSelfProfile,
  );

  const reviewedAt = new Date().toISOString();
  const { data: approvedRow, error: approveError } = await service
    .from('profiles')
    .update({
      approved: true,
      review_status: 'approved',
      rejection_reason: null,
      reviewed_at: reviewedAt,
      updated_at: reviewedAt,
    })
    .eq('id', userId)
    .eq('role', 'member')
    .eq('hidden_from_member_management', false)
    .select('approved,review_status,reviewed_at')
    .maybeSingle();

  assert(
    !approveError && approvedRow?.approved === true && approvedRow?.review_status === 'approved' && Boolean(approvedRow?.reviewed_at),
    'approve-member',
    approveError?.message ?? approvedRow,
  );

  const approvedLogin = anonClient();
  const { data: approvedSession, error: approvedLoginError } = await approvedLogin.auth.signInWithPassword({ email, password });
  assert(!approvedLoginError && approvedSession?.session, 'login-after-approval', approvedLoginError?.message ?? null);

  const { data: approvedSelfProfile, error: approvedSelfError } = await approvedLogin
    .from('profiles')
    .select('role,approved,review_status')
    .eq('id', userId)
    .maybeSingle();
  assert(
    !approvedSelfError &&
      approvedSelfProfile?.role === 'member' &&
      approvedSelfProfile?.approved === true &&
      approvedSelfProfile?.review_status === 'approved',
    'app-sees-approved-state',
    approvedSelfError?.message ?? approvedSelfProfile,
  );

  console.log('[E2E RESULT]', JSON.stringify({ ok: true, steps }, null, 2));
} catch (error) {
  console.error('[E2E RESULT]', JSON.stringify({ ok: false, steps, error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exitCode = 1;
} finally {
  if (userId) {
    try {
      await service.auth.admin.deleteUser(userId);
    } catch (error) {
      console.error('[E2E CLEANUP] auth user cleanup failed', error instanceof Error ? error.message : String(error));
    }
    try {
      await service.from('profiles').delete().eq('id', userId);
    } catch (error) {
      console.error('[E2E CLEANUP] profile cleanup failed', error instanceof Error ? error.message : String(error));
    }
  }
}
