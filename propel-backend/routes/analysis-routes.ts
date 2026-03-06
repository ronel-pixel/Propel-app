import express, { Response } from 'express';
import { db, admin } from '../config/firebase-config';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { validateToken, AuthRequest } from '../middleware/auth-middleware';

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const FREE_ARCHIVE_VISIBLE_ITEMS = 3;

/**
 * Builds a professional, McKinsey-standard prompt for Gemini.
 * Supports English and Hebrew output.
 */
const buildProfessionalPrompt = (data: any) => {
  const { title, description, budget, aspirations, language } = data;

  const lang = language === 'he' ? 'Hebrew' : 'English';

  return `
    You are a cold, precise strategic advisor. No warmth. No encouragement. Only facts and probability.
    Analyze the following startup idea as if you were presenting to a boardroom of investors who have seen 10,000 pitches.

    TONE: Professional, cold, and strategic. Strip all filler language. Every sentence must carry information.

    CRITICAL RULES:
    1. If a business model is fundamentally flawed, economically impossible, or logically absurd — state it plainly. Do NOT try to salvage it.
    2. Use 'strategic_advice' to give a final verdict. If the project is doomed, state: "CRITICAL FAILURE: DO NOT PURSUE."
    3. "the_pivot" is MANDATORY. Even for strong ideas, identify the ONE element worth preserving and propose a higher-margin alternative direction grounded in market evidence.
    4. If the project is high-risk or low-value, the pivot must propose a viable, high-margin alternative using the same tech or market positioning.

    PROJECT DETAILS:
    - Title: ${title}
    - Description: ${description}
    - Initial Budget: $${budget || 'Not specified'}
    - Long-term Aspirations: ${aspirations || 'Not specified'}

    OUTPUT LANGUAGE: All text values must be in ${lang}.

    Return ONLY valid JSON. No markdown, no commentary.
    Follow this EXACT structure:

    {
      "market_analysis": {
        "summary": "Market overview — state the market size, saturation level, and whether this idea has a realistic entry point (3-5 sentences)",
        "competitors": ["Competitor 1", "Competitor 2", "Competitor 3"],
        "target_audience": "Precisely defined segment with demographics, spending power, and acquisition channel"
      },
      "tech_stack": {
        "frontend": "Recommended technology",
        "backend": "Recommended technology",
        "database": "Recommended technology",
        "reasoning": "Why this stack fits the scale, budget, and team size"
      },
      "mvp_features": ["Feature 1", "Feature 2", "Feature 3", "Feature 4", "Feature 5"],
      "premium_roadmap": ["Phase 1 milestone", "Phase 2 milestone", "Phase 3 milestone", "Phase 4 milestone"],
      "strategic_advice": "Final verdict — be brutally honest. Include probability of success as a percentage.",
      "the_pivot": {
        "viable_element": "The ONE element from this idea worth preserving",
        "alternative": "A smarter, higher-margin alternative direction",
        "reasoning": "Why this pivot succeeds where the original fails (cite market evidence or comparable exits)"
      },
      "charts": {
        "tco_comparison": [
          { "category": "Infrastructure (Year 1)", "saas": 12000, "on_premise": 45000 },
          { "category": "Scaling (Year 2)", "saas": 18000, "on_premise": 52000 },
          { "category": "Maintenance (Year 3)", "saas": 15000, "on_premise": 38000 },
          { "category": "Development Team", "saas": 85000, "on_premise": 120000 },
          { "category": "Security & Compliance", "saas": 5000, "on_premise": 25000 }
        ],
        "execution_timeline": [
          { "month": "M1", "milestone": "Market Research & Validation", "progress": 8 },
          { "month": "M2", "milestone": "MVP Architecture", "progress": 15 },
          { "month": "M3", "milestone": "Core Development", "progress": 28 },
          { "month": "M4", "milestone": "Alpha Testing", "progress": 38 },
          { "month": "M5", "milestone": "Beta Launch", "progress": 48 },
          { "month": "M6", "milestone": "User Feedback Loop", "progress": 55 },
          { "month": "M7", "milestone": "Iteration & Polish", "progress": 62 },
          { "month": "M8", "milestone": "Marketing Prep", "progress": 70 },
          { "month": "M9", "milestone": "Public Launch", "progress": 80 },
          { "month": "M10", "milestone": "Growth & Retention", "progress": 85 },
          { "month": "M11", "milestone": "Revenue Optimization", "progress": 92 },
          { "month": "M12", "milestone": "Series A Readiness", "progress": 100 }
        ],
        "unit_economics": [
          { "month": "M1", "revenue": 0, "cost": 8000, "profit": -8000 },
          { "month": "M2", "revenue": 0, "cost": 8500, "profit": -8500 },
          { "month": "M3", "revenue": 500, "cost": 9000, "profit": -8500 },
          { "month": "M4", "revenue": 1200, "cost": 9000, "profit": -7800 },
          { "month": "M5", "revenue": 3000, "cost": 9500, "profit": -6500 },
          { "month": "M6", "revenue": 5500, "cost": 10000, "profit": -4500 },
          { "month": "M7", "revenue": 8000, "cost": 10000, "profit": -2000 },
          { "month": "M8", "revenue": 10500, "cost": 10500, "profit": 0 },
          { "month": "M9", "revenue": 14000, "cost": 11000, "profit": 3000 },
          { "month": "M10", "revenue": 18000, "cost": 11500, "profit": 6500 },
          { "month": "M11", "revenue": 23000, "cost": 12000, "profit": 11000 },
          { "month": "M12", "revenue": 28000, "cost": 12500, "profit": 15500 }
        ]
      }
    }

    DATA QUALITY RULES for "charts":
    - tco_comparison: Realistic industry-benchmark costs in USD for the recommended stack. SaaS cheaper initially, On-Premise cheaper at scale.
    - execution_timeline: 12 months, progress monotonically increases 8→100. Milestones specific to THIS project.
    - unit_economics: 12 months showing realistic revenue ramp, fixed + variable costs, and profit (revenue - cost). The break-even point should be realistic for this market — typically month 7-10 for SaaS, later for hardware. Costs should include team, infrastructure, and marketing. Revenue should follow a realistic growth curve.
    - ALL numbers must be grounded in industry data for this specific sector.
  `;
};

router.post('/analyze', validateToken, async (req: AuthRequest, res: Response) => {
  const { title, description, budget, aspirations, language } = req.body;
  const userId = req.user?.uid;

  try {
    // ── Credit guard ──
    const userRef = db.collection('users').doc(userId as string);
    const userSnap = await userRef.get();
    const currentCredits = userSnap.exists ? (userSnap.data()?.credits ?? 0) : 0;

    if (currentCredits <= 0) {
      return res.status(403).json({ error: "No credits remaining. Please upgrade your plan." });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    const prompt = buildProfessionalPrompt({ title, description, budget, aspirations, language });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rawText = response.text();

    // Data Cleaning
    const cleanedText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

    let analysisData;
    try {
      analysisData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("JSON Parse Error. Raw text:", rawText);
      return res.status(500).json({ error: "AI returned invalid data format" });
    }

    // Save to Firestore
    const projectRef = await db.collection('projects').add({
      userId,
      title,
      description,
      language: language || 'en',
      analysis: analysisData,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // ── Deduct 1 credit atomically ──
    await userRef.update({
      credits: admin.firestore.FieldValue.increment(-1),
    });

    res.status(200).json({ id: projectRef.id, analysis: analysisData });
  } catch (error) {
    console.error("Gemini Service Error:", error);
    res.status(500).json({ error: "Strategic analysis failed" });
  }
});

// Read (All)
router.get('/projects', validateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.uid;

  try {
    const userSnap = await db.collection('users').doc(userId as string).get();
    const isSubscribed = userSnap.exists ? (userSnap.data()?.isSubscribed === true) : false;

    const snapshot = await db.collection('projects')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const projects = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    if (isSubscribed) {
      return res.status(200).json(projects);
    }

    // Secure-by-default: non-subscribers can only access recent archive entries.
    const limitedProjects = projects.slice(0, FREE_ARCHIVE_VISIBLE_ITEMS);
    console.warn(
      `[Security][Paywall] Limited archive access for non-subscriber ${userId}: `
      + `${limitedProjects.length}/${projects.length} items returned`,
    );

    return res.status(200).json(limitedProjects);
  } catch (error) {
    console.error("Fetch All Projects Error:", error);
    res.status(500).json({ error: "Failed to fetch your projects history" });
  }
});

// Read (Single)
router.get('/projects/:id', validateToken, async (req: AuthRequest, res: Response) => {
  const projectId = String(req.params.id);
  const userId = req.user?.uid;

  try {
    const doc = await db.collection('projects').doc(projectId as string).get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Project not found" });
    }

    const projectData = doc.data();

    if (projectData?.userId !== userId) {
      return res.status(403).json({ error: "Unauthorized access to this project" });
    }

    const userSnap = await db.collection('users').doc(userId as string).get();
    const isSubscribed = userSnap.exists ? (userSnap.data()?.isSubscribed === true) : false;

    if (!isSubscribed) {
      const latestSnapshot = await db.collection('projects')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(FREE_ARCHIVE_VISIBLE_ITEMS)
        .get();

      const allowedIds = new Set(latestSnapshot.docs.map((projectDoc) => projectDoc.id));
      if (!allowedIds.has(projectId)) {
        console.warn(
          `[Security][Paywall] Blocked project access for non-subscriber ${userId}: ${projectId}`,
        );
        return res.status(403).json({
          error: "Archive access requires an active subscription for older analyses.",
        });
      }
    }

    res.status(200).json({
      id: doc.id,
      ...projectData
    });
  } catch (error) {
    console.error("Fetch Single Project Error:", error);
    res.status(500).json({ error: "Failed to fetch project details" });
  }
});

// Delete
router.delete('/projects/:id', validateToken, async (req: AuthRequest, res: Response) => {
  const projectId = req.params.id;
  const userId = req.user?.uid;

  try {
    const projectRef = db.collection('projects').doc(projectId as string);
    const doc = await projectRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (doc.data()?.userId !== userId) {
      return res.status(403).json({ error: "Unauthorized: You cannot delete this project" });
    }

    await projectRef.delete();

    res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Delete Project Error:", error);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

export default router;
