-- ============================================================
-- MuruAI: user_profiles + user_credits + 관리자 RPC 마이그레이션
-- Supabase SQL Editor에서 실행
-- ============================================================

-- ─── 1. user_profiles 테이블 ───

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 2. user_credits 테이블 ───

CREATE TABLE IF NOT EXISTS public.user_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 30,
  total_used INTEGER NOT NULL DEFAULT 0,
  refill_count INTEGER NOT NULL DEFAULT 0
);

-- ─── 3. 신규 가입 트리거 ───

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_credits (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── 4. 기존 유저 백필 ───

INSERT INTO public.user_profiles (id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT id FROM public.user_profiles)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_credits (user_id, balance, total_used)
SELECT
  u.id,
  GREATEST(0, 30 - COALESCE(usage.total, 0)),
  COALESCE(usage.total, 0)
FROM auth.users u
LEFT JOIN (
  SELECT user_id, SUM(image_count) AS total
  FROM public.ai_template_usage
  WHERE created_at >= date_trunc('month', now())
  GROUP BY user_id
) usage ON usage.user_id = u.id
WHERE u.id NOT IN (SELECT user_id FROM public.user_credits)
ON CONFLICT (user_id) DO NOTHING;

-- ─── 5. admin 부여 ───

UPDATE public.user_profiles SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@muruai.com');

-- ─── 6. RLS ───

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON public.user_profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own credits"
  ON public.user_credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own credits"
  ON public.user_credits FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all credits"
  ON public.user_credits FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- ─── 7. ai_credit_requests 컬럼 추가 ───

ALTER TABLE public.ai_credit_requests
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);

-- ─── 8. 크레딧 차감 RPC ───

CREATE OR REPLACE FUNCTION public.use_credits(count INTEGER)
RETURNS INTEGER AS $$
DECLARE
  actual INTEGER;
  bal INTEGER;
BEGIN
  SELECT balance INTO bal
  FROM public.user_credits
  WHERE user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    -- 크레딧 행이 없으면 기본값으로 생성
    INSERT INTO public.user_credits (user_id) VALUES (auth.uid())
    ON CONFLICT (user_id) DO NOTHING;
    bal := 30;
  END IF;

  actual := LEAST(count, GREATEST(0, bal));

  UPDATE public.user_credits
  SET balance = balance - actual,
      total_used = total_used + actual
  WHERE user_id = auth.uid();

  RETURN actual;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 9. 관리자 RPC: 유저 목록 ───

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  display_name TEXT,
  provider TEXT,
  last_sign_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  role TEXT,
  credit_balance INTEGER,
  credit_total_used INTEGER,
  credit_refill_count INTEGER
) AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::TEXT,
    COALESCE(
      u.raw_user_meta_data->>'full_name',
      u.raw_user_meta_data->>'name',
      ''
    )::TEXT AS display_name,
    COALESCE(u.raw_app_meta_data->>'provider', 'email')::TEXT AS provider,
    u.last_sign_in_at,
    u.created_at,
    COALESCE(p.role, 'user')::TEXT AS role,
    COALESCE(c.balance, 30) AS credit_balance,
    COALESCE(c.total_used, 0) AS credit_total_used,
    COALESCE(c.refill_count, 0) AS credit_refill_count
  FROM auth.users u
  LEFT JOIN public.user_profiles p ON p.id = u.id
  LEFT JOIN public.user_credits c ON c.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 10. 관리자 RPC: 크레딧 요청 목록 ───

CREATE OR REPLACE FUNCTION public.admin_list_credit_requests()
RETURNS TABLE (
  request_id UUID,
  user_id UUID,
  user_email TEXT,
  user_display_name TEXT,
  status TEXT,
  credit_balance INTEGER,
  created_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ
) AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    r.id AS request_id,
    r.user_id,
    u.email::TEXT AS user_email,
    COALESCE(
      u.raw_user_meta_data->>'full_name',
      u.raw_user_meta_data->>'name',
      ''
    )::TEXT AS user_display_name,
    r.status::TEXT,
    COALESCE(c.balance, 0) AS credit_balance,
    r.created_at,
    r.reviewed_at
  FROM public.ai_credit_requests r
  JOIN auth.users u ON u.id = r.user_id
  LEFT JOIN public.user_credits c ON c.user_id = r.user_id
  ORDER BY
    CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END,
    r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 11. 관리자 RPC: 크레딧 요청 승인/거절 ───

CREATE OR REPLACE FUNCTION public.admin_manage_credit_request(
  p_request_id UUID,
  p_action TEXT
)
RETURNS VOID AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- admin 체크
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  -- action 유효성 체크
  IF p_action NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid action: must be approved or rejected';
  END IF;

  -- pending 상태인 요청 찾기
  SELECT r.user_id INTO target_user_id
  FROM public.ai_credit_requests r
  WHERE r.id = p_request_id AND r.status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;

  -- 요청 상태 업데이트
  UPDATE public.ai_credit_requests
  SET status = p_action,
      reviewed_at = now(),
      reviewed_by = auth.uid()
  WHERE id = p_request_id;

  -- 승인이면 유저 크레딧 리셋
  IF p_action = 'approved' THEN
    UPDATE public.user_credits
    SET balance = 30,
        refill_count = refill_count + 1
    WHERE user_id = target_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
