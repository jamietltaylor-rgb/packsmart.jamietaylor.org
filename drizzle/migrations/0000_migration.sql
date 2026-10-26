CREATE TABLE public.packing_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.packing_lists TO authenticated;
GRANT ALL ON public.packing_lists TO service_role;
ALTER TABLE public.packing_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own lists select" ON public.packing_lists FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own lists insert" ON public.packing_lists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own lists update" ON public.packing_lists FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own lists delete" ON public.packing_lists FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX packing_lists_user_idx ON public.packing_lists(user_id);