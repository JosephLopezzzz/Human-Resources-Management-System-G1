-- Migration: Performance Participants and Scores
-- Date: 2026-03-26

-- 1. Create performance_participants table
CREATE TABLE IF NOT EXISTS public.performance_participants (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    cycle_id uuid REFERENCES public.review_cycles(id) ON DELETE CASCADE NOT NULL,
    employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
    score numeric DEFAULT 0,
    rating text, -- 'Excellent', 'Good', 'Average', 'Poor'
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'approved')),
    evaluated_by uuid REFERENCES auth.users(id),
    evaluated_at timestamptz,
    created_at timestamptz DEFAULT now(),
    UNIQUE(cycle_id, employee_id)
);

-- 2. Create performance_scores table (score per KPI)
CREATE TABLE IF NOT EXISTS public.performance_scores (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    participant_id uuid REFERENCES public.performance_participants(id) ON DELETE CASCADE NOT NULL,
    kpi_id uuid REFERENCES public.kpi_definitions(id) ON DELETE CASCADE NOT NULL,
    score numeric DEFAULT 0 CHECK (score >= 0 AND score <= 100),
    notes text,
    created_at timestamptz DEFAULT now(),
    UNIQUE(participant_id, kpi_id)
);

-- 3. RLS Policies
ALTER TABLE public.performance_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_scores ENABLE ROW LEVEL SECURITY;

-- Select: Everyone (authenticated) can see scores/participants for transparency or specific modules
DROP POLICY IF EXISTS "performance_participants_select" ON public.performance_participants;
CREATE POLICY "performance_participants_select" ON public.performance_participants FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "performance_scores_select" ON public.performance_scores;
CREATE POLICY "performance_scores_select" ON public.performance_scores FOR SELECT TO authenticated USING (true);

-- Insert/Update: HR Managers and System Admins
DROP POLICY IF EXISTS "performance_participants_manage" ON public.performance_participants;
CREATE POLICY "performance_participants_manage" ON public.performance_participants 
FOR ALL TO authenticated 
USING (auth.jwt() -> 'user_metadata' ->> 'role' IN ('system_admin', 'hr_manager', 'admin'))
WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' IN ('system_admin', 'hr_manager', 'admin'));

-- Evaluation: Department Managers can edit scores for people they evaluate
DROP POLICY IF EXISTS "performance_participants_evaluate" ON public.performance_participants;
CREATE POLICY "performance_participants_evaluate" ON public.performance_participants 
FOR UPDATE TO authenticated 
USING (auth.jwt() -> 'user_metadata' ->> 'role' IN ('department_manager'))
WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' IN ('department_manager'));

DROP POLICY IF EXISTS "performance_scores_manage" ON public.performance_scores;
CREATE POLICY "performance_scores_manage" ON public.performance_scores 
FOR ALL TO authenticated 
USING (auth.jwt() -> 'user_metadata' ->> 'role' IN ('system_admin', 'hr_manager', 'department_manager', 'admin'))
WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' IN ('system_admin', 'hr_manager', 'department_manager', 'admin'));
