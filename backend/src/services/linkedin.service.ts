import { db, schema } from "../db";
import { eq } from "drizzle-orm";
import { AppError } from "../middleware/error-handler";
import { nanoid } from "nanoid";

interface LinkedInProfile {
  public_identifier: string;
  first_name: string;
  last_name: string;
  full_name: string;
  headline: string;
  summary: string;
  city: string;
  state: string;
  country_full_name: string;
  industry: string;
  experiences: {
    company: string;
    title: string;
    starts_at: { year: number; month: number } | null;
    ends_at: { year: number; month: number } | null;
    description: string | null;
  }[];
  education: {
    school: string;
    degree_name: string;
    field_of_study: string;
  }[];
  [key: string]: unknown;
}

/**
 * Normalize a LinkedIn URL to a consistent format
 */
export function normalizeLinkedInUrl(url: string): string {
  const cleaned = url.replace(/\/+$/, "").toLowerCase();
  const match = cleaned.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/);
  if (!match) {
    throw new AppError(400, "Invalid LinkedIn profile URL format");
  }
  return `https://www.linkedin.com/in/${match[1]}`;
}

/**
 * Extract username from a LinkedIn URL
 */
export function extractUsername(url: string): string {
  const match = url.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/);
  if (!match) throw new AppError(400, "Cannot extract username from LinkedIn URL");
  return match[1];
}

/**
 * Fetch a prospect from the database cache, or generate profile data if not cached.
 *
 * NOTE: The original Proxycurl API (nubela.co) was shut down in July 2025
 * after a LinkedIn lawsuit. This now uses generated profile data based on
 * the LinkedIn username. To integrate a real enrichment provider (e.g.
 * EnrichLayer, Apify, People Data Labs), replace `generateProfileFromUsername()`.
 */
export async function getOrFetchProspect(linkedinUrl: string) {
  const normalizedUrl = normalizeLinkedInUrl(linkedinUrl);
  const username = extractUsername(normalizedUrl);

  // Check cache first
  const existing = db
    .select()
    .from(schema.prospects)
    .where(eq(schema.prospects.linkedin_url, normalizedUrl))
    .get();

  if (existing) {
    console.log(`[LinkedIn] Cache hit for ${username}`);
    return existing;
  }

  // Generate profile data from the username
  console.log(`[LinkedIn] Generating profile data for ${username}...`);
  const profile = generateProfileFromUsername(username);

  // Store in DB
  const now = new Date().toISOString();
  const prospect = {
    id: nanoid(),
    linkedin_url: normalizedUrl,
    linkedin_username: username,
    full_name: profile.full_name || `${profile.first_name} ${profile.last_name}`,
    headline: profile.headline || null,
    summary: profile.summary || null,
    current_company: profile.experiences?.[0]?.company || null,
    current_position: profile.experiences?.[0]?.title || null,
    location: [profile.city, profile.state, profile.country_full_name]
      .filter(Boolean)
      .join(", ") || null,
    industry: profile.industry || null,
    profile_data: JSON.stringify(profile),
    created_at: now,
    updated_at: now,
  };

  db.insert(schema.prospects).values(prospect).run();
  console.log(`[LinkedIn] Stored profile for ${username}`);

  return prospect;
}

// ---- Well-known LinkedIn profiles for realistic demo data ----

const KNOWN_PROFILES: Record<string, LinkedInProfile> = {
  williamhgates: {
    public_identifier: "williamhgates",
    first_name: "Bill",
    last_name: "Gates",
    full_name: "Bill Gates",
    headline: "Co-chair, Bill & Melinda Gates Foundation",
    summary:
      "Co-chair of the Bill & Melinda Gates Foundation. Founder of Breakthrough Energy. Co-founder of Microsoft. Voracious reader. Avid traveler. Active blogger.",
    city: "Seattle",
    state: "Washington",
    country_full_name: "United States",
    industry: "Philanthropy & Technology",
    experiences: [
      {
        company: "Bill & Melinda Gates Foundation",
        title: "Co-chair",
        starts_at: { year: 2000, month: 1 },
        ends_at: null,
        description:
          "Guiding the foundation's efforts to tackle global challenges in health, education, and poverty.",
      },
      {
        company: "Breakthrough Energy",
        title: "Founder",
        starts_at: { year: 2015, month: 1 },
        ends_at: null,
        description:
          "Leading private-sector efforts to develop clean energy technologies to address climate change.",
      },
      {
        company: "Microsoft",
        title: "Co-founder & Technology Advisor",
        starts_at: { year: 1975, month: 4 },
        ends_at: null,
        description:
          "Co-founded Microsoft in 1975. Served as CEO until 2000, then as Chairman and Technology Advisor.",
      },
    ],
    education: [
      {
        school: "Harvard University",
        degree_name: "Dropped out",
        field_of_study: "Computer Science & Mathematics",
      },
      {
        school: "Lakeside School",
        degree_name: "High School Diploma",
        field_of_study: "",
      },
    ],
  },
  satlonadella: {
    public_identifier: "satyanadella",
    first_name: "Satya",
    last_name: "Nadella",
    full_name: "Satya Nadella",
    headline: "Chairman and CEO at Microsoft",
    summary:
      "Chairman and CEO of Microsoft. Passionate about building technologies and platforms that empower every person and organization on the planet to achieve more.",
    city: "Redmond",
    state: "Washington",
    country_full_name: "United States",
    industry: "Technology",
    experiences: [
      {
        company: "Microsoft",
        title: "Chairman and CEO",
        starts_at: { year: 2014, month: 2 },
        ends_at: null,
        description:
          "Leading Microsoft's transformation to a cloud-first, AI-first company.",
      },
      {
        company: "Microsoft",
        title: "Executive Vice President, Cloud & Enterprise",
        starts_at: { year: 2011, month: 1 },
        ends_at: { year: 2014, month: 2 },
        description: "Led the Cloud and Enterprise group building Azure into a major cloud platform.",
      },
    ],
    education: [
      {
        school: "University of Chicago Booth School of Business",
        degree_name: "MBA",
        field_of_study: "Business Administration",
      },
      {
        school: "University of Wisconsin-Milwaukee",
        degree_name: "MS",
        field_of_study: "Computer Science",
      },
      {
        school: "Manipal Institute of Technology",
        degree_name: "BE",
        field_of_study: "Electrical Engineering",
      },
    ],
  },
};

/**
 * Generate a LinkedIn profile from a username.
 * Uses known profiles for common demo usernames, otherwise generates
 * a plausible profile from the username parts.
 *
 * To integrate a real enrichment API, replace this function body
 * with an HTTP call to your chosen provider.
 */
function generateProfileFromUsername(username: string): LinkedInProfile {
  // Check known profiles first
  const known = KNOWN_PROFILES[username.toLowerCase()];
  if (known) return known;

  // Parse the username into name parts (e.g. "john-doe" -> "John Doe")
  const nameParts = username
    .replace(/[-_]/g, " ")
    .replace(/\d+/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase());

  const firstName = nameParts[0] || "Professional";
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "User";
  const fullName = nameParts.length > 0 ? nameParts.join(" ") : "LinkedIn Professional";

  // Generate a deterministic but varied profile based on the username hash
  const hash = simpleHash(username);
  const titles = [
    "Senior Software Engineer",
    "VP of Engineering",
    "Product Manager",
    "Head of Marketing",
    "Chief Technology Officer",
    "Director of Operations",
    "Senior Data Scientist",
    "Head of Sales",
    "Engineering Manager",
    "Chief Revenue Officer",
  ];
  const companies = [
    "Stripe",
    "Shopify",
    "Salesforce",
    "HubSpot",
    "Datadog",
    "Snowflake",
    "Figma",
    "Notion",
    "Vercel",
    "Confluent",
  ];
  const industries = [
    "Technology",
    "Software Development",
    "Financial Technology",
    "SaaS",
    "Cloud Computing",
    "Data Analytics",
    "Digital Marketing",
    "E-Commerce",
    "Cybersecurity",
    "Artificial Intelligence",
  ];
  const cities = [
    "San Francisco",
    "New York",
    "Austin",
    "Seattle",
    "Boston",
    "Chicago",
    "Denver",
    "Los Angeles",
    "Miami",
    "Portland",
  ];
  const states = [
    "California",
    "New York",
    "Texas",
    "Washington",
    "Massachusetts",
    "Illinois",
    "Colorado",
    "California",
    "Florida",
    "Oregon",
  ];
  const schools = [
    "Stanford University",
    "MIT",
    "UC Berkeley",
    "Carnegie Mellon University",
    "Georgia Tech",
    "University of Michigan",
    "Cornell University",
    "University of Texas at Austin",
    "Columbia University",
    "University of Washington",
  ];

  const titleIdx = hash % titles.length;
  const companyIdx = (hash >> 4) % companies.length;
  const industryIdx = (hash >> 8) % industries.length;
  const cityIdx = (hash >> 12) % cities.length;
  const schoolIdx = (hash >> 16) % schools.length;
  const prevCompanyIdx = (companyIdx + 3) % companies.length;
  const prevTitleIdx = (titleIdx + 2) % titles.length;

  const currentTitle = titles[titleIdx];
  const currentCompany = companies[companyIdx];

  return {
    public_identifier: username,
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    headline: `${currentTitle} at ${currentCompany}`,
    summary: `Experienced ${currentTitle.toLowerCase()} with a strong background in ${industries[industryIdx].toLowerCase()}. Passionate about building scalable solutions and leading high-performing teams. Currently driving growth at ${currentCompany}.`,
    city: cities[cityIdx],
    state: states[cityIdx],
    country_full_name: "United States",
    industry: industries[industryIdx],
    experiences: [
      {
        company: currentCompany,
        title: currentTitle,
        starts_at: { year: 2021, month: 3 },
        ends_at: null,
        description: `Leading key initiatives at ${currentCompany}, driving product strategy and team growth in the ${industries[industryIdx].toLowerCase()} space.`,
      },
      {
        company: companies[prevCompanyIdx],
        title: titles[prevTitleIdx],
        starts_at: { year: 2017, month: 6 },
        ends_at: { year: 2021, month: 2 },
        description: `Played a pivotal role in scaling the engineering team and launching multiple successful product features.`,
      },
      {
        company: "Early Career Startup",
        title: "Software Engineer",
        starts_at: { year: 2014, month: 1 },
        ends_at: { year: 2017, month: 5 },
        description:
          "Full-stack development in a fast-paced startup environment. Contributed to core platform architecture.",
      },
    ],
    education: [
      {
        school: schools[schoolIdx],
        degree_name: "BS",
        field_of_study: "Computer Science",
      },
    ],
  };
}

/**
 * Simple string hash for deterministic profile generation
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
