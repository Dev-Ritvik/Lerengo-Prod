create extension if not exists pgcrypto;

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  summary text not null,
  description text not null,
  provider_name text not null,
  provider_code text not null,
  category text not null,
  focus_area text not null,
  program_type text not null check (program_type in ('Course', 'Specialization', 'Professional Certificate', 'Learning Path')),
  skill_level text not null default 'Beginner',
  duration_label text not null,
  pace_label text not null default '4 hours / week',
  rating numeric(2,1) not null default 0,
  enrollment_count integer not null default 0,
  price_inr integer not null default 0,
  list_price_inr integer,
  spotlight_bucket text check (spotlight_bucket in ('popular', 'weekly', 'ai', 'new')),
  hero_slot integer,
  sort_order integer not null default 100,
  tags text[] not null default '{}'::text[],
  skills text[] not null default '{}'::text[],
  outcomes text[] not null default '{}'::text[],
  syllabus text[] not null default '{}'::text[],
  is_published boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'completed', 'paused', 'cancelled')),
  source text not null default 'courses_home',
  progress_percent integer not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  started_at timestamp with time zone not null default now(),
  last_accessed_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint course_enrollments_course_user_key unique (course_id, user_id)
);

create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  summary text,
  sort_order integer not null default 100,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules (id) on delete cascade,
  title text not null,
  summary text,
  lesson_type text not null default 'video' check (lesson_type in ('video', 'reading', 'lab')),
  duration_minutes integer,
  video_url text,
  is_preview boolean not null default false,
  sort_order integer not null default 100,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.course_assessments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  summary text,
  kind text not null default 'final' check (kind in ('checkpoint', 'final')),
  duration_minutes integer not null default 20,
  pass_percent integer not null default 70 check (pass_percent >= 0 and pass_percent <= 100),
  max_attempts integer not null default 3 check (max_attempts > 0),
  questions_json jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.course_assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.course_assessments (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  answers_json jsonb not null default '{}'::jsonb,
  score_percent integer not null default 0 check (score_percent >= 0 and score_percent <= 100),
  passed boolean not null default false,
  submitted_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.course_certificates (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  certificate_number text not null unique,
  title text not null,
  recipient_name text not null,
  issued_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint course_certificates_course_user_key unique (course_id, user_id)
);

create table if not exists public.course_payments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  amount_paise integer not null check (amount_paise >= 0),
  currency text not null default 'INR',
  payment_provider text not null default 'razorpay',
  razorpay_order_id text not null unique,
  razorpay_payment_id text,
  status text not null default 'created' check (status in ('created', 'success', 'failed')),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists courses_published_sort_idx
  on public.courses (is_published, sort_order asc);

create index if not exists courses_spotlight_idx
  on public.courses (spotlight_bucket, sort_order asc);

create index if not exists courses_focus_idx
  on public.courses (focus_area, category);

create index if not exists course_enrollments_user_idx
  on public.course_enrollments (user_id, started_at desc);

create index if not exists course_enrollments_course_idx
  on public.course_enrollments (course_id);

create index if not exists course_modules_course_idx
  on public.course_modules (course_id, sort_order asc);

create index if not exists course_lessons_module_idx
  on public.course_lessons (module_id, sort_order asc);

create index if not exists course_assessments_course_idx
  on public.course_assessments (course_id, kind);

create index if not exists course_assessment_attempts_user_course_idx
  on public.course_assessment_attempts (user_id, course_id, submitted_at desc);

create index if not exists course_certificates_user_idx
  on public.course_certificates (user_id, issued_at desc);

create index if not exists course_payments_user_idx
  on public.course_payments (user_id, created_at desc);

alter table public.courses enable row level security;
alter table public.course_enrollments enable row level security;
alter table public.course_modules enable row level security;
alter table public.course_lessons enable row level security;
alter table public.course_assessments enable row level security;
alter table public.course_assessment_attempts enable row level security;
alter table public.course_certificates enable row level security;
alter table public.course_payments enable row level security;

drop policy if exists "Published courses are readable" on public.courses;
create policy "Published courses are readable"
  on public.courses
  for select
  using (is_published = true);

drop policy if exists "Users can read own enrollments" on public.course_enrollments;
create policy "Users can read own enrollments"
  on public.course_enrollments
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own enrollments" on public.course_enrollments;
drop policy if exists "Users can update own enrollments" on public.course_enrollments;

drop policy if exists "Published course modules are readable" on public.course_modules;
create policy "Published course modules are readable"
  on public.course_modules
  for select
  using (
    exists (
      select 1
      from public.courses
      where public.courses.id = course_modules.course_id
        and public.courses.is_published = true
    )
  );

drop policy if exists "Preview lessons are readable" on public.course_lessons;
create policy "Preview lessons are readable"
  on public.course_lessons
  for select
  using (
    is_preview = true
    and exists (
      select 1
      from public.course_modules
      join public.courses on public.courses.id = public.course_modules.course_id
      where public.course_modules.id = course_lessons.module_id
        and public.courses.is_published = true
    )
  );

drop policy if exists "Users can read own assessment attempts" on public.course_assessment_attempts;
create policy "Users can read own assessment attempts"
  on public.course_assessment_attempts
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read own certificates" on public.course_certificates;
create policy "Users can read own certificates"
  on public.course_certificates
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read own course payments" on public.course_payments;
create policy "Users can read own course payments"
  on public.course_payments
  for select
  using (auth.uid() = user_id);

insert into public.courses (
  id,
  slug,
  title,
  subtitle,
  summary,
  description,
  provider_name,
  provider_code,
  category,
  focus_area,
  program_type,
  skill_level,
  duration_label,
  pace_label,
  rating,
  enrollment_count,
  price_inr,
  list_price_inr,
  spotlight_bucket,
  hero_slot,
  sort_order,
  tags,
  skills,
  outcomes,
  syllabus,
  is_published
)
values
  (
    '00000000-0000-0000-0000-000000000001', 'google-data-analytics', 'Google Data Analytics',
    'Job-ready analytics foundation with portfolio outputs.',
    'Build a clean analytics base across spreadsheets, SQL, dashboards, and storytelling.',
    'A structured entry point for learners who want analytical fluency, portfolio evidence, and a sharper path into data roles.',
    'Google', 'GO', 'Data Science', 'Data Analytics', 'Professional Certificate', 'Beginner',
    '8 weeks', '4 to 6 hours / week', 4.8, 18240, 7999, 13999, 'popular', 1, 10,
    array['Analytics', 'SQL', 'Spreadsheets', 'Dashboards']::text[],
    array['Data cleaning', 'Spreadsheet analysis', 'SQL queries', 'Data storytelling']::text[],
    array['Build an analyst-ready portfolio', 'Work with spreadsheets and SQL', 'Present insights clearly']::text[],
    array['Analytics foundations', 'Spreadsheet workflows', 'SQL basics', 'Dashboard storytelling']::text[],
    true
  ),
  (
    '00000000-0000-0000-0000-000000000002', 'foundations-data-data-everywhere', 'Foundations: Data, Data, Everywhere',
    'A lighter on-ramp into the language of data work.',
    'Understand how data moves across business, product, and decision systems.',
    'A short foundational course for learners who need clarity before committing to deeper analytics tracks.',
    'IBM', 'IB', 'Data Science', 'Data Analytics', 'Course', 'Beginner',
    '4 weeks', '3 to 4 hours / week', 4.8, 9430, 2499, 3999, 'popular', null, 20,
    array['Data', 'Foundations', 'Decision making']::text[],
    array['Data thinking', 'Metric framing', 'Problem decomposition']::text[],
    array['Speak the language of data teams', 'Understand analytics roles', 'Frame business questions']::text[],
    array['Why data matters', 'Analytics workflows', 'Metrics and questions', 'Decision systems']::text[],
    true
  ),
  (
    '00000000-0000-0000-0000-000000000003', 'python-for-everybody', 'Python for Everybody',
    'Programming confidence for learners moving into tech.',
    'Learn Python through practical scripts, problem solving, and repeatable coding habits.',
    'A broad specialization that helps beginners move from zero confidence to practical programming momentum.',
    'University of Michigan', 'UM', 'Computer Science', 'Career Launch', 'Specialization', 'Beginner',
    '10 weeks', '5 hours / week', 4.8, 21430, 5999, 9999, 'popular', null, 30,
    array['Python', 'Programming', 'Career Launch']::text[],
    array['Python basics', 'Functions', 'File handling', 'Problem solving']::text[],
    array['Write useful Python scripts', 'Build coding confidence', 'Prepare for deeper software tracks']::text[],
    array['Syntax and variables', 'Control flow', 'Functions', 'Data handling']::text[],
    true
  ),
  (
    '00000000-0000-0000-0000-000000000004', 'excel-skills-for-business', 'Excel Skills for Business',
    'A focused spreadsheet track for analysts and operators.',
    'Move past basic sheets into modelling, reporting, and practical business analysis.',
    'A weekly spotlight track built for fast ROI: spreadsheets, clean reporting, and sharper operating workflows.',
    'LerenGO Studio', 'LG', 'Business', 'Portfolio Projects', 'Specialization', 'Beginner to Intermediate',
    '6 weeks', '4 hours / week', 4.9, 6210, 4499, 6999, 'weekly', null, 40,
    array['Excel', 'Business', 'Reporting']::text[],
    array['Formulas', 'Business dashboards', 'Scenario analysis', 'Spreadsheet hygiene']::text[],
    array['Ship cleaner reports', 'Model decisions in spreadsheets', 'Build shareable business assets']::text[],
    array['Core formulas', 'Reporting layouts', 'Dashboards', 'Scenario models']::text[],
    true
  ),
  (
    '00000000-0000-0000-0000-000000000005', 'ibm-data-analyst', 'IBM Data Analyst',
    'A broader analyst program with tools, projects, and evidence.',
    'Practice the full analyst workflow with business datasets and applied deliverables.',
    'A portfolio-heavy certificate for learners who want to move from theory into visible analyst proof.',
    'IBM', 'IB', 'Data Science', 'Data Analytics', 'Professional Certificate', 'Beginner to Intermediate',
    '9 weeks', '5 to 6 hours / week', 4.6, 8420, 6999, 11999, 'weekly', null, 50,
    array['Analytics', 'IBM', 'Portfolio']::text[],
    array['SQL', 'Visualization', 'Data analysis', 'Reporting']::text[],
    array['Complete portfolio projects', 'Practice analyst tools', 'Build interviewer-ready talking points']::text[],
    array['Analyst workflow', 'SQL practice', 'Visualization', 'Project delivery']::text[],
    true
  ),
  (
    '00000000-0000-0000-0000-000000000006', 'google-data-analysis-with-python', 'Google Data Analysis with Python',
    'Python-centered analytics with practical exploration work.',
    'Use Python to clean, inspect, and present datasets that matter in real analyst workflows.',
    'A good bridge for learners who already understand analytics basics and want more technical leverage.',
    'Google', 'GO', 'Data Science', 'Data Analytics', 'Specialization', 'Intermediate',
    '7 weeks', '5 hours / week', 4.8, 5070, 5499, 8499, 'weekly', null, 60,
    array['Python', 'Analytics', 'Data Science']::text[],
    array['Pandas', 'Data cleaning', 'Exploration', 'Visualization']::text[],
    array['Use Python in analysis work', 'Handle messy datasets', 'Add technical depth to analyst workflows']::text[],
    array['Python analysis setup', 'Data cleaning', 'EDA', 'Insights and presentation']::text[],
    true
  ),
  (
    '00000000-0000-0000-0000-000000000007', 'chatgpt-and-excel-for-decision-making', 'ChatGPT and Excel for sharper decision making',
    'Use AI to speed up analysis, synthesis, and reporting.',
    'Blend spreadsheet reasoning with prompt-driven workflows that save time without losing clarity.',
    'Designed for operators, analysts, and students who want practical AI usage instead of generic theory.',
    'Vanderbilt University', 'VU', 'Artificial Intelligence', 'Artificial Intelligence', 'Specialization', 'Beginner to Intermediate',
    '5 weeks', '4 hours / week', 4.8, 9320, 4999, 7999, 'ai', 2, 70,
    array['AI', 'Excel', 'Prompting']::text[],
    array['Prompt design', 'AI-assisted analysis', 'Excel workflows', 'Decision support']::text[],
    array['Use AI with spreadsheet work', 'Build faster analysis loops', 'Improve reporting speed']::text[],
    array['AI foundations', 'Prompting in workflows', 'Excel + AI', 'Decision support']::text[],
    true
  ),
  (
    '00000000-0000-0000-0000-000000000008', 'ai-agent-developer', 'AI Agent Developer',
    'Build practical agent workflows instead of only consuming tools.',
    'Learn how to structure prompts, tools, memory, and product thinking for useful AI agents.',
    'A modern build track for learners who want to ship agent-style products and internal automations.',
    'LerenGO Studio', 'LG', 'Artificial Intelligence', 'Artificial Intelligence', 'Specialization', 'Intermediate',
    '8 weeks', '6 hours / week', 4.8, 6810, 8999, 12999, 'ai', null, 80,
    array['AI Agents', 'Automation', 'Product']::text[],
    array['Tool calling', 'Prompt systems', 'Evaluation loops', 'Agent design']::text[],
    array['Ship basic AI agents', 'Understand tool-integrated LLM flows', 'Build stronger AI portfolio pieces']::text[],
    array['Agent foundations', 'Tools and memory', 'Evaluations', 'Shipping workflows']::text[],
    true
  ),
  (
    '00000000-0000-0000-0000-000000000009', 'claude-code-for-practical-workflows', 'Claude Code for practical software workflows',
    'Use AI coding tools in a disciplined, production-aware way.',
    'Turn AI coding assistance into repeatable engineering workflows instead of random generation.',
    'Built for developers who want stronger velocity while keeping code quality, reasoning, and review habits intact.',
    'Vanderbilt University', 'VU', 'Computer Science', 'Artificial Intelligence', 'Course', 'Intermediate',
    '3 weeks', '4 hours / week', 4.9, 4180, 3499, 5499, 'ai', null, 90,
    array['AI coding', 'Engineering', 'Workflows']::text[],
    array['Code review with AI', 'Prompt discipline', 'Refactoring', 'Engineering workflows']::text[],
    array['Use AI coding tools more rigorously', 'Reduce blind trust in generated code', 'Improve review quality']::text[],
    array['Workflow design', 'Prompting for code', 'Review loops', 'Safe production habits']::text[],
    true
  ),
  (
    '00000000-0000-0000-0000-000000000010', 'google-ai-professional-certificate', 'Google AI Professional Certificate',
    'A structured starting point for applied AI fluency.',
    'Move through model basics, prompting, productivity, and responsible use in one compact track.',
    'A new-launch certificate positioned for learners who want broad AI understanding before specializing deeper.',
    'Google', 'GO', 'Artificial Intelligence', 'Artificial Intelligence', 'Professional Certificate', 'Beginner',
    '6 weeks', '4 hours / week', 4.8, 11220, 6499, 9999, 'new', null, 100,
    array['AI', 'Google', 'Certificate']::text[],
    array['AI fluency', 'Prompting', 'Responsible use', 'Workflow design']::text[],
    array['Build practical AI literacy', 'Use modern tools confidently', 'Choose deeper specializations better']::text[],
    array['AI basics', 'Prompting', 'Applied use cases', 'Responsible practice']::text[],
    true
  ),
  (
    '00000000-0000-0000-0000-000000000011', 'microsoft-generative-ai-engineering', 'Microsoft Generative AI Engineering',
    'A build-oriented track for modern AI product workflows.',
    'Work through prompting, app integration, evaluation, and deployment thinking.',
    'A fresh professional track for learners who want to build with generative AI, not just use it casually.',
    'Microsoft', 'MS', 'Artificial Intelligence', 'Artificial Intelligence', 'Professional Certificate', 'Intermediate',
    '7 weeks', '5 to 6 hours / week', 4.7, 5340, 8499, 12499, 'new', null, 110,
    array['Generative AI', 'Engineering', 'Microsoft']::text[],
    array['LLM integration', 'Prompt workflows', 'Evaluation', 'App delivery']::text[],
    array['Understand build patterns for GenAI', 'Ship applied mini-projects', 'Strengthen engineering portfolio']::text[],
    array['GenAI systems', 'Integration patterns', 'Evaluation', 'Delivery']::text[],
    true
  ),
  (
    '00000000-0000-0000-0000-000000000012', 'ai-seo-and-geo-for-growth', 'AI SEO and GEO for growth teams',
    'A modern traffic and discovery playbook for AI-shaped search.',
    'Learn how search, answer engines, and generative interfaces change content strategy.',
    'A tactical course for founders, operators, and marketers trying to stay ahead of AI-driven distribution shifts.',
    'LerenGO', 'LG', 'Business', 'Portfolio Projects', 'Professional Certificate', 'Intermediate',
    '4 weeks', '3 to 4 hours / week', 4.8, 2970, 3999, 6299, 'new', null, 120,
    array['SEO', 'Growth', 'AI']::text[],
    array['Search strategy', 'AI visibility', 'Content systems', 'Growth execution']::text[],
    array['Rethink SEO for AI search', 'Build sharper growth loops', 'Create stronger operator portfolio work']::text[],
    array['AI search landscape', 'Content systems', 'Measurement', 'Growth execution']::text[],
    true
  ),
  (
    '00000000-0000-0000-0000-000000000013', 'people-management-essentials', 'People Management Essentials',
    'Leadership basics for new managers and team leads.',
    'Build better one-on-ones, feedback habits, delegation patterns, and team rhythm.',
    'A clean leadership track for learners stepping into management or campus leadership roles.',
    'Google', 'GO', 'Personal Development', 'Career Launch', 'Specialization', 'Beginner to Intermediate',
    '5 weeks', '3 hours / week', 4.8, 4680, 4499, 6999, 'new', null, 130,
    array['Leadership', 'Management', 'Career']::text[],
    array['Feedback', 'Delegation', 'Team communication', 'Manager basics']::text[],
    array['Lead teams more clearly', 'Run better 1:1s', 'Handle early management responsibilities']::text[],
    array['Manager mindset', 'Communication', 'Delegation', 'Growth feedback']::text[],
    true
  )
on conflict (slug) do update
set
  title = excluded.title,
  subtitle = excluded.subtitle,
  summary = excluded.summary,
  description = excluded.description,
  provider_name = excluded.provider_name,
  provider_code = excluded.provider_code,
  category = excluded.category,
  focus_area = excluded.focus_area,
  program_type = excluded.program_type,
  skill_level = excluded.skill_level,
  duration_label = excluded.duration_label,
  pace_label = excluded.pace_label,
  rating = excluded.rating,
  enrollment_count = excluded.enrollment_count,
  price_inr = excluded.price_inr,
  list_price_inr = excluded.list_price_inr,
  spotlight_bucket = excluded.spotlight_bucket,
  hero_slot = excluded.hero_slot,
  sort_order = excluded.sort_order,
  tags = excluded.tags,
  skills = excluded.skills,
  outcomes = excluded.outcomes,
  syllabus = excluded.syllabus,
  is_published = excluded.is_published,
  updated_at = now();
