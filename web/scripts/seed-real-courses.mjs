import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const projectRoot = path.resolve(currentDir, "..");

function loadEnvFile(filePath, { overrideExisting = false } = {}) {
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!overrideExisting && process.env[key] !== undefined) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadEnvFile(path.join(projectRoot, ".env"));
loadEnvFile(path.join(projectRoot, ".env.local"), { overrideExisting: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing supabase credentials in env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const SEED_TIMESTAMP = "2026-03-30T00:00:00.000Z";

const coursesToUpsert = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    slug: "google-data-analytics",
    title: "Google Data Analytics",
    subtitle: "Job-ready analytics foundation with portfolio outputs.",
    summary: "Build a clean analytics base across spreadsheets, SQL, dashboards, and storytelling.",
    description: "A structured entry point for learners who want analytical fluency, portfolio evidence, and a sharper path into data roles.",
    provider_name: "Google",
    provider_code: "GO",
    category: "Data Science",
    focus_area: "Data Analytics",
    program_type: "Professional Certificate",
    skill_level: "Beginner",
    duration_label: "8 weeks",
    pace_label: "4 to 6 hours / week",
    rating: 4.8,
    enrollment_count: 18240,
    price_inr: 7999,
    list_price_inr: 13999,
    spotlight_bucket: "popular",
    hero_slot: 1,
    sort_order: 10,
    tags: ["Analytics", "SQL", "Spreadsheets", "Dashboards"],
    skills: ["Data cleaning", "Spreadsheet analysis", "SQL queries", "Data storytelling"],
    outcomes: ["Build an analyst-ready portfolio", "Work with spreadsheets and SQL", "Present insights clearly"],
    syllabus: ["Analytics foundations", "Spreadsheet workflows", "SQL basics", "Dashboard storytelling"],
    is_published: true,
    created_at: SEED_TIMESTAMP,
    updated_at: SEED_TIMESTAMP,
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    slug: "foundations-data-data-everywhere",
    title: "Foundations: Data, Data, Everywhere",
    subtitle: "A lighter on-ramp into the language of data work.",
    summary: "Understand how data moves across business, product, and decision systems.",
    description: "A short foundational course for learners who need clarity before committing to deeper analytics tracks.",
    provider_name: "Google",
    provider_code: "GO",
    category: "Data Science",
    focus_area: "Data Analytics",
    program_type: "Course",
    skill_level: "Beginner",
    duration_label: "4 weeks",
    pace_label: "3 to 4 hours / week",
    rating: 4.8,
    enrollment_count: 9430,
    price_inr: 2499,
    list_price_inr: 3999,
    spotlight_bucket: "popular",
    hero_slot: null,
    sort_order: 20,
    tags: ["Data", "Foundations", "Decision making"],
    skills: ["Data thinking", "Metric framing", "Problem decomposition"],
    outcomes: ["Speak the language of data teams", "Understand analytics roles", "Frame business questions"],
    syllabus: ["Why data matters", "Analytics workflows", "Metrics and questions", "Decision systems"],
    is_published: true,
    created_at: SEED_TIMESTAMP,
    updated_at: SEED_TIMESTAMP,
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    slug: "python-for-everybody",
    title: "Python for Everybody",
    subtitle: "Programming confidence for learners moving into tech.",
    summary: "Learn Python through practical scripts, problem solving, and repeatable coding habits.",
    description: "A broad specialization that helps beginners move from zero confidence to practical programming momentum.",
    provider_name: "University of Michigan",
    provider_code: "UM",
    category: "Computer Science",
    focus_area: "Career Launch",
    program_type: "Specialization",
    skill_level: "Beginner",
    duration_label: "10 weeks",
    pace_label: "5 hours / week",
    rating: 4.8,
    enrollment_count: 21430,
    price_inr: 5999,
    list_price_inr: 9999,
    spotlight_bucket: "popular",
    hero_slot: null,
    sort_order: 30,
    tags: ["Python", "Programming", "Career Launch"],
    skills: ["Python basics", "Functions", "File handling", "Problem solving"],
    outcomes: ["Write useful Python scripts", "Build coding confidence", "Prepare for deeper software tracks"],
    syllabus: ["Syntax and variables", "Control flow", "Functions", "Data handling"],
    is_published: true,
    created_at: SEED_TIMESTAMP,
    updated_at: SEED_TIMESTAMP,
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    slug: "excel-skills-for-business",
    title: "Excel Skills for Business",
    subtitle: "A focused spreadsheet track for analysts and operators.",
    summary: "Move past basic sheets into modelling, reporting, and practical business analysis.",
    description: "A weekly spotlight track built for fast ROI: spreadsheets, clean reporting, and sharper operating workflows.",
    provider_name: "Macquarie University",
    provider_code: "MQ",
    category: "Business",
    focus_area: "Portfolio Projects",
    program_type: "Specialization",
    skill_level: "Beginner to Intermediate",
    duration_label: "6 weeks",
    pace_label: "4 hours / week",
    rating: 4.9,
    enrollment_count: 6210,
    price_inr: 4499,
    list_price_inr: 6999,
    spotlight_bucket: "weekly",
    hero_slot: null,
    sort_order: 40,
    tags: ["Excel", "Business", "Reporting"],
    skills: ["Formulas", "Business dashboards", "Scenario analysis", "Spreadsheet hygiene"],
    outcomes: ["Ship cleaner reports", "Model decisions in spreadsheets", "Build shareable business assets"],
    syllabus: ["Core formulas", "Reporting layouts", "Dashboards", "Scenario models"],
    is_published: true,
    created_at: SEED_TIMESTAMP,
    updated_at: SEED_TIMESTAMP,
  },
  {
    id: "00000000-0000-0000-0000-000000000005",
    slug: "ibm-data-analyst",
    title: "IBM Data Analyst",
    subtitle: "A broader analyst program with tools, projects, and evidence.",
    summary: "Practice the full analyst workflow with business datasets and applied deliverables.",
    description: "A portfolio-heavy certificate for learners who want to move from theory into visible analyst proof.",
    provider_name: "IBM",
    provider_code: "IB",
    category: "Data Science",
    focus_area: "Data Analytics",
    program_type: "Professional Certificate",
    skill_level: "Beginner to Intermediate",
    duration_label: "9 weeks",
    pace_label: "5 to 6 hours / week",
    rating: 4.6,
    enrollment_count: 8420,
    price_inr: 6999,
    list_price_inr: 11999,
    spotlight_bucket: "weekly",
    hero_slot: null,
    sort_order: 50,
    tags: ["Analytics", "IBM", "Portfolio"],
    skills: ["SQL", "Visualization", "Data analysis", "Reporting"],
    outcomes: ["Complete portfolio projects", "Practice analyst tools", "Build interviewer-ready talking points"],
    syllabus: ["Analyst workflow", "SQL practice", "Visualization", "Project delivery"],
    is_published: true,
    created_at: SEED_TIMESTAMP,
    updated_at: SEED_TIMESTAMP,
  },
  {
    id: "00000000-0000-0000-0000-000000000006",
    slug: "google-advanced-data-analytics",
    title: "Google Advanced Data Analytics",
    subtitle: "Python-centered analytics with practical exploration work.",
    summary: "Use Python to clean, inspect, and present datasets that matter in real analyst workflows.",
    description: "A good bridge for learners who already understand analytics basics and want more technical leverage.",
    provider_name: "Google",
    provider_code: "GO",
    category: "Data Science",
    focus_area: "Data Analytics",
    program_type: "Professional Certificate",
    skill_level: "Intermediate",
    duration_label: "7 weeks",
    pace_label: "5 hours / week",
    rating: 4.8,
    enrollment_count: 5070,
    price_inr: 5499,
    list_price_inr: 8499,
    spotlight_bucket: "weekly",
    hero_slot: null,
    sort_order: 60,
    tags: ["Python", "Analytics", "Data Science"],
    skills: ["Pandas", "Data cleaning", "Exploration", "Visualization"],
    outcomes: ["Use Python in analysis work", "Handle messy datasets", "Add technical depth to analyst workflows"],
    syllabus: ["Python analysis setup", "Data cleaning", "EDA", "Insights and presentation"],
    is_published: true,
    created_at: SEED_TIMESTAMP,
    updated_at: SEED_TIMESTAMP,
  },
  {
    id: "00000000-0000-0000-0000-000000000007",
    slug: "generative-ai-for-everyone",
    title: "Generative AI for Everyone",
    subtitle: "Learn how generative AI works and how to apply it in your work.",
    summary: "Understand LLMs, prompting, AI safety, and building generative AI-powered tools.",
    description: "A complete conceptual introduction to generative AI, designed to help individuals and teams build practical AI capability.",
    provider_name: "DeepLearning.AI",
    provider_code: "DL",
    category: "Artificial Intelligence",
    focus_area: "Artificial Intelligence",
    program_type: "Course",
    skill_level: "Beginner",
    duration_label: "3 weeks",
    pace_label: "2 to 3 hours / week",
    rating: 4.8,
    enrollment_count: 9320,
    price_inr: 2999,
    list_price_inr: 4999,
    spotlight_bucket: "ai",
    hero_slot: 2,
    sort_order: 70,
    tags: ["AI", "Generative AI", "LLMs"],
    skills: ["Generative AI concepts", "Prompt design", "AI productivity tools", "Responsible AI"],
    outcomes: ["Understand LLM capabilities", "Write robust prompts", "Identify generative AI opportunities"],
    syllabus: ["What is generative AI?", "Prompt engineering basics", "AI in business workflows", "AI safety & ethics"],
    is_published: true,
    created_at: SEED_TIMESTAMP,
    updated_at: SEED_TIMESTAMP,
  },
  {
    id: "00000000-0000-0000-0000-000000000008",
    slug: "ibm-applied-ai-professional-certificate",
    title: "IBM Applied AI Professional Certificate",
    subtitle: "Build practical AI applications and chatbots without coding.",
    summary: "Learn how to use APIs, build custom models, and integrate cognitive tools.",
    description: "A build-heavy applied AI track for developers and builders looking to quickly embed artificial intelligence capabilities.",
    provider_name: "IBM",
    provider_code: "IB",
    category: "Artificial Intelligence",
    focus_area: "Artificial Intelligence",
    program_type: "Professional Certificate",
    skill_level: "Beginner to Intermediate",
    duration_label: "8 weeks",
    pace_label: "4 to 5 hours / week",
    rating: 4.7,
    enrollment_count: 6810,
    price_inr: 6999,
    list_price_inr: 10999,
    spotlight_bucket: "ai",
    hero_slot: null,
    sort_order: 80,
    tags: ["AI APIs", "Chatbots", "Computer Vision", "NLP"],
    skills: ["Cognitive tools", "Watson APIs", "Chatbot building", "Model deployment"],
    outcomes: ["Deploy custom chatbots", "Consume cloud AI service endpoints", "Construct cognitive web pages"],
    syllabus: ["Introduction to AI", "Chatbot architectures", "Applied Watson assistants", "Computer vision pipelines"],
    is_published: true,
    created_at: SEED_TIMESTAMP,
    updated_at: SEED_TIMESTAMP,
  },
  {
    id: "00000000-0000-0000-0000-000000000009",
    slug: "google-it-automation-with-python",
    title: "Google IT Automation with Python",
    subtitle: "Build scripting capability and manage infrastructure at scale.",
    summary: "Master Python scripting, Git, and automated deployments to optimize IT workflows.",
    description: "A rigorous, multi-course track for software engineers and IT operations seeking programmatic systems efficiency.",
    provider_name: "Google",
    provider_code: "GO",
    category: "Computer Science",
    focus_area: "Software Engineering",
    program_type: "Professional Certificate",
    skill_level: "Intermediate",
    duration_label: "8 weeks",
    pace_label: "5 hours / week",
    rating: 4.8,
    enrollment_count: 14180,
    price_inr: 7999,
    list_price_inr: 12999,
    spotlight_bucket: "ai",
    hero_slot: null,
    sort_order: 90,
    tags: ["Python", "Git", "Automation", "Configuration Management"],
    skills: ["Scripting", "Version control", "Debugging tools", "System automation"],
    outcomes: ["Automate operating system tasks", "Manage configurations programmatically", "Deploy version-controlled scripts"],
    syllabus: ["Crash course in Python", "Git and GitHub workflows", "Interfacing with the OS", "Configuration management at scale"],
    is_published: true,
    created_at: SEED_TIMESTAMP,
    updated_at: SEED_TIMESTAMP,
  },
  {
    id: "00000000-0000-0000-0000-000000000010",
    slug: "google-ai-professional-certificate",
    title: "Google AI Professional Certificate",
    subtitle: "A structured starting point for applied AI fluency.",
    summary: "Move through model basics, prompting, productivity, and responsible use in one compact track.",
    description: "A new-launch certificate positioned for learners who want broad AI understanding before specializing deeper.",
    provider_name: "Google",
    provider_code: "GO",
    category: "Artificial Intelligence",
    focus_area: "Artificial Intelligence",
    program_type: "Professional Certificate",
    skill_level: "Beginner",
    duration_label: "6 weeks",
    pace_label: "4 hours / week",
    rating: 4.8,
    enrollment_count: 11220,
    price_inr: 6499,
    list_price_inr: 9999,
    spotlight_bucket: "new",
    hero_slot: null,
    sort_order: 100,
    tags: ["AI", "Google", "Certificate"],
    skills: ["AI fluency", "Prompting", "Responsible use", "Workflow design"],
    outcomes: ["Build practical AI literacy", "Use modern tools confidently", "Choose deeper specializations better"],
    syllabus: ["AI basics", "Prompting", "Applied use cases", "Responsible practice"],
    is_published: true,
    created_at: SEED_TIMESTAMP,
    updated_at: SEED_TIMESTAMP,
  },
  {
    id: "00000000-0000-0000-0000-000000000011",
    slug: "microsoft-generative-ai-engineering",
    title: "Microsoft Generative AI Engineering",
    subtitle: "A build-oriented track for modern AI product workflows.",
    summary: "Work through prompting, app integration, evaluation, and deployment thinking.",
    description: "A fresh professional track for learners who want to build with generative AI, not just use it casually.",
    provider_name: "Microsoft",
    provider_code: "MS",
    category: "Artificial Intelligence",
    focus_area: "Artificial Intelligence",
    program_type: "Professional Certificate",
    skill_level: "Intermediate",
    duration_label: "7 weeks",
    pace_label: "5 to 6 hours / week",
    rating: 4.7,
    enrollment_count: 5340,
    price_inr: 8499,
    list_price_inr: 12499,
    spotlight_bucket: "new",
    hero_slot: null,
    sort_order: 110,
    tags: ["Generative AI", "Engineering", "Microsoft"],
    skills: ["LLM integration", "Prompt workflows", "Evaluation", "App delivery"],
    outcomes: ["Understand build patterns for GenAI", "Ship applied mini-projects", "Strengthen engineering portfolio"],
    syllabus: ["GenAI systems", "Integration patterns", "Evaluation", "Delivery"],
    is_published: true,
    created_at: SEED_TIMESTAMP,
    updated_at: SEED_TIMESTAMP,
  },
  {
    id: "00000000-0000-0000-0000-000000000012",
    slug: "google-digital-marketing-ecommerce",
    title: "Google Digital Marketing & E-commerce",
    subtitle: "Drive growth, build stores, and measure digital channels.",
    summary: "Acquire marketing channels strategy, search optimization, email automation, and shop operations.",
    description: "An intensive career pathway designed to teach modern search engine marketing, growth channels, and analytics platforms.",
    provider_name: "Google",
    provider_code: "GO",
    category: "Business",
    focus_area: "Marketing & Growth",
    program_type: "Professional Certificate",
    skill_level: "Beginner to Intermediate",
    duration_label: "6 weeks",
    pace_label: "4 hours / week",
    rating: 4.8,
    enrollment_count: 8970,
    price_inr: 5999,
    list_price_inr: 9999,
    spotlight_bucket: "new",
    hero_slot: null,
    sort_order: 120,
    tags: ["Digital Marketing", "E-commerce", "Growth", "Analytics"],
    skills: ["SEO strategy", "Marketing channels", "Email marketing", "Shopify operations"],
    outcomes: ["Build and launch an e-commerce store", "Structure growth campaign budgets", "Monitor digital channel analytics"],
    syllabus: ["Marketing fundamentals", "Attracting search audiences", "Building customer trust", "Marketing metrics & reporting"],
    is_published: true,
    created_at: SEED_TIMESTAMP,
    updated_at: SEED_TIMESTAMP,
  },
  {
    id: "00000000-0000-0000-0000-000000000013",
    slug: "learning-how-to-learn",
    title: "Learning How to Learn",
    subtitle: "Master tough subjects with neuroscience-backed learning tools.",
    summary: "Discover illusions of competence, memory management, chunking, and handling procrastination.",
    description: "A world-renowned course teaching essential cognitive techniques to master complex analytical, technical, or creative disciplines.",
    provider_name: "UC San Diego",
    provider_code: "SD",
    category: "Personal Development",
    focus_area: "Cognitive Science",
    program_type: "Course",
    skill_level: "Beginner",
    duration_label: "4 weeks",
    pace_label: "2 hours / week",
    rating: 4.9,
    enrollment_count: 24680,
    price_inr: 1999,
    list_price_inr: 3499,
    spotlight_bucket: "new",
    hero_slot: null,
    sort_order: 130,
    tags: ["Learning Habits", "Memory Techniques", "Procrastination", "Cognition"],
    skills: ["Focused & diffuse thinking", "Procrastination prevention", "Recall techniques", "Active recall"],
    outcomes: ["Master complex topics faster", "Mitigate study procrastination", "Develop structured retention habits"],
    syllabus: ["Diffuse thinking modes", "Chunking concepts", "Defeating procrastination", "Recall and testing habits"],
    is_published: true,
    created_at: SEED_TIMESTAMP,
    updated_at: SEED_TIMESTAMP,
  },
];

async function seed() {
  // First clean up old slugs if they exist
  const oldSlugs = [
    "chatgpt-and-excel-for-decision-making",
    "ai-agent-developer",
    "claude-code-for-practical-workflows",
    "ai-seo-and-geo-for-growth",
    "people-management-essentials"
  ];
  
  console.log("Cleaning up old courses...");
  const { error: deleteError } = await supabase
    .from("courses")
    .delete()
    .in("slug", oldSlugs);
    
  if (deleteError) {
    console.error("Failed to delete old courses:", deleteError);
  }

  console.log("Upserting new real courses...");
  const { error: upsertError } = await supabase
    .from("courses")
    .upsert(coursesToUpsert, { onConflict: "id" });

  if (upsertError) {
    console.error("Upsert failed:", upsertError);
    process.exit(1);
  }

  console.log("Database courses seeding successful!");
}

seed().catch(console.error);
