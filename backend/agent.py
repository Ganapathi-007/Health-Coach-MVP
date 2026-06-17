import json
import os
from anthropic import Anthropic
from dotenv import load_dotenv
from models import PatientProfile

load_dotenv()

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
MODEL = "claude-sonnet-4-6"

PROGRAM_ROUTES = {
    "anxiety": [
        {
            "name": "Week 1 (Awareness & Physiology)",
            "focus": "stress response education, baseline mood tracking, and establishing diaphragmatic breathing as a daily anchor",
            "techniques": [
                "Diaphragmatic breathing: 4-count inhale (belly rises), 4-count exhale — activates parasympathetic nervous system",
                "Brief body scan (5-10 min): non-judgmental awareness of physical sensations head to toe",
                "Daily mood rating 1-10 with one word describing emotional state",
                "Psychoeducation: fight-or-flight response, cortisol, and how chronic activation affects daily life"
            ],
            "framework": "MBSR (Kabat-Zinn, UMass) + CBT foundation (Beck Institute)"
        },
        {
            "name": "Week 2 (Pattern Recognition)",
            "focus": "worry journaling, scheduled worry time, thought awareness, and values reflection",
            "techniques": [
                "Scheduled worry time: 15 min daily at the same time — redirect all intrusive worries to this window only (Borkovec CBT technique)",
                "Expressive writing 3x this week: 15 min of continuous writing about deepest thoughts around a stressor (Pennebaker protocol)",
                "Box breathing (4-4-4-4): inhale 4, hold 4, exhale 4, hold 4 — for acute stress moments",
                "Values reflection: what matters most to you right now? How is stress getting in the way of that?"
            ],
            "framework": "CBT worry management (Borkovec) + Pennebaker expressive writing + ACT values (Hayes)"
        },
        {
            "name": "Week 3 (Skill Building)",
            "focus": "thought records, ACT defusion techniques, gratitude journaling, and deepening mindfulness practice",
            "techniques": [
                "Thought records: Situation → Automatic thought → Emotion (0-10) → Evidence for/against → Balanced thought (Beck CBT)",
                "ACT defusion: prefix anxious thoughts with 'I'm having the thought that...' to create distance without suppression",
                "3 gratitude items each evening (Emmons & McCullough research: reduces anxiety and improves wellbeing)",
                "Progressive Muscle Relaxation (PMR) or full 30-min body scan — whichever resonates more"
            ],
            "framework": "CBT cognitive restructuring + ACT defusion (Hayes) + Positive Psychology (Seligman/Emmons)"
        },
        {
            "name": "Week 4 (Committed Action)",
            "focus": "behavioral activation, values-aligned commitments, and building a long-term personal stress toolkit",
            "techniques": [
                "Behavioral activation: schedule 2-3 high-value activities per week regardless of mood (counters anxiety-driven avoidance)",
                "Build personal stress toolkit: identify top 3 techniques from this program that worked specifically for you",
                "Identify personal early warning signs: thoughts, physical sensations, and behaviors that signal anxiety is rising",
                "Relapse prevention plan: specific steps to take if anxiety spikes — not vague intentions, written action steps"
            ],
            "framework": "ACT committed action + CBT relapse prevention + MBSR integration (Kabat-Zinn)"
        }
    ],
    "weight_loss": [
        {
            "name": "Week 1 (Baseline & Motivation)",
            "focus": "building self-awareness through monitoring only — no behavior changes yet — and exploring intrinsic motivation",
            "techniques": [
                "Food diary for awareness only: no calorie counting, no judgment, just observing current patterns for 7 days",
                "Motivational interviewing style: 'Why does this matter to you? What would genuinely change if your health improved?'",
                "Identify current barriers and who in your life supports vs. undermines your health goals",
                "One small keystone habit chosen by the user — something tiny and completely sustainable"
            ],
            "framework": "DPP curriculum (NIH/CDC) + Motivational Interviewing (Miller & Rollnick) + Transtheoretical Model (Prochaska)"
        },
        {
            "name": "Week 2 (Habit Architecture)",
            "focus": "environmental design, trigger identification, implementation intentions, and the sleep-hunger connection",
            "techniques": [
                "Environmental audit: fridge, pantry, workspace — make healthy choices the easy default, unhealthy choices effortful (Wansink research)",
                "Implementation intentions: 'When [situation X], I will [behavior Y] in [location Z]' — doubles follow-through rates (Gollwitzer 1999)",
                "Schedule movement: block time in calendar, don't rely on motivation or feeling ready",
                "Sleep-metabolism education: poor sleep increases ghrelin (hunger) 24% and decreases leptin (satiety) 18% — fixing sleep is a weight loss strategy"
            ],
            "framework": "DPP behavioral curriculum + Gollwitzer implementation intentions + environmental design (Wansink)"
        },
        {
            "name": "Week 3 (Stress, Emotions & Non-Scale Wins)",
            "focus": "understanding emotional eating patterns, mindful eating, and expanding progress metrics beyond the scale",
            "techniques": [
                "ABC emotional eating model: Antecedent (trigger) → Behavior (eating) → Consequence (feeling) — identify the pattern without judgment",
                "Mindful eating practice: one meal per day without screens, noticing hunger and fullness signals (MB-EAT — Kristeller, Indiana State)",
                "Non-scale victory tracking: energy levels, sleep quality, mood stability, clothes fit, strength",
                "Flexible restraint framing: one off-plan meal is one data point, not failure — rigid all-or-nothing thinking predicts bingeing (Herman & Polivy research)"
            ],
            "framework": "MB-EAT mindful eating (Kristeller) + CBT emotional eating + Herman & Polivy flexible restraint research"
        },
        {
            "name": "Week 4 (Identity & Maintenance)",
            "focus": "building an identity as a healthy person and preparing for sustainable life beyond the 30-day program",
            "techniques": [
                "Identity-based framing: shift from 'I'm trying to lose weight' to 'I am someone who takes care of my body' (Clear — Atomic Habits)",
                "High-risk situation planning: social events, travel, stressful weeks — write specific response scripts in advance",
                "Lapse vs relapse distinction (Marlatt & Gordon): one off-plan meal is a lapse — plan the recovery response before it's needed",
                "90-day transition plan: what does sustainable health look like beyond this program without a coach?"
            ],
            "framework": "Identity-based habits (Clear) + Marlatt & Gordon relapse prevention + SDT autonomy (Deci & Ryan)"
        }
    ],
    "skin": [
        {
            "name": "Week 1 (Reset & Eliminate)",
            "focus": "removing the most common inflammatory dietary inputs and establishing a baseline tracking system",
            "techniques": [
                "Eliminate this week: refined sugar, conventional dairy (especially skim milk and whey protein), alcohol, and ultra-processed foods",
                "Start a skin + food + mood diary: rate skin clarity 1-10 daily, log meals, note stress level and sleep hours",
                "Hydration target: 8-10 cups of water daily — dehydration directly impairs the skin barrier function",
                "5-min daily mindfulness or box breathing to begin cortisol reduction (cortisol drives sebum production and worsens all inflammatory skin conditions)"
            ],
            "framework": "Dr. Whitney Bowe Reset phase (Bowe & Logan, Gut Pathogens 2011) + IFM Remove step"
        },
        {
            "name": "Week 2 (Gut Rebuilding)",
            "focus": "rebuilding the gut microbiome and introducing anti-inflammatory foods that directly support skin health",
            "techniques": [
                "Introduce fermented foods daily: one serving of plain yogurt, kefir, kimchi, sauerkraut, or kombucha (Lactobacillus strains support skin — Jung et al. 2013)",
                "Add prebiotic-rich vegetables: garlic, leeks, onions, asparagus — these feed the beneficial bacteria",
                "Increase omega-3 sources: fatty fish 2-3x/week or 1-2g EPA/DHA daily (reduces inflammatory cytokines IL-1 and TNF-alpha that drive skin inflammation)",
                "Sleep hygiene: consistent wake time, cool room — skin repair and collagen synthesis peak during deep sleep with growth hormone release"
            ],
            "framework": "Gut-skin axis (Bowe & Logan 2011) + Smith et al. low-GI acne research 2007 + omega-3 evidence (Khayef 2012)"
        },
        {
            "name": "Week 3 (Stress & Cortisol)",
            "focus": "cortisol management as the central skin lever — chronic stress directly drives sebum, inflammation, and collagen breakdown",
            "techniques": [
                "HPA axis education: cortisol increases sebum production, degrades collagen, and worsens ALL inflammatory skin conditions — acne, eczema, rosacea, psoriasis",
                "Formalize 10-15 min daily mindfulness — Kabat-Zinn's 1998 Psychosomatic Medicine study showed MBSR accelerated psoriasis clearing 4x faster than UV alone",
                "Circadian sleep anchoring: consistent wake time + screens off 90 min before bed (blue light suppresses melatonin, which is a skin antioxidant)",
                "Gratitude journaling: 3 items nightly — reduces cortisol and inflammatory markers over time"
            ],
            "framework": "Psychodermatology (ESDaP) + Kabat-Zinn psoriasis/MBSR study 1998 + HPA-skin axis research"
        },
        {
            "name": "Week 4 (Personalization & Reintroduction)",
            "focus": "building a personal trigger map through systematic food reintroduction and consolidating long-term habits",
            "techniques": [
                "Systematic food reintroduction: add back one eliminated food at a time, wait 3 days, observe skin response in diary before adding the next",
                "Compare current skin diary ratings to Week 1 baseline — identify what actually changed and what didn't",
                "Identify personal top 3 high-leverage changes (likely sleep, stress, and one specific dietary trigger unique to you)",
                "Long-term plan: which 3 habits will you maintain permanently? What was a reset vs. what becomes your new baseline?"
            ],
            "framework": "IFM elimination-reintroduction protocol + Bowe Restore phase + personalization principle"
        }
    ],
    "energy": [
        {
            "name": "Week 1 (Remove & Measure)",
            "focus": "establishing a fixed wake time, beginning sleep tracking, and removing the biggest energy drains",
            "techniques": [
                "Fixed wake time: choose one time and keep it 7 days/week — the single most impactful sleep habit; anchors the entire circadian system (Borbely 2-process model)",
                "Sleep diary: track time in bed, estimated sleep time, quality 1-10, next-day energy 1-10",
                "Caffeine cutoff at 2pm — caffeine half-life is 5-6 hours; late caffeine fragments deep sleep architecture and reduces restorative sleep (Drake et al. 2013)",
                "Morning light: 10-20 min outdoors within 60 min of waking — activates the SCN circadian clock and anchors the cortisol awakening response (Huberman/Stanford)"
            ],
            "framework": "CBT-I (Morin/Spielman/Espie) + Borbely 2-Process Model + Huberman morning light protocol"
        },
        {
            "name": "Week 2 (Circadian Anchoring)",
            "focus": "reinforcing the circadian rhythm through light management, eating window, stimulus control, and evening wind-down",
            "techniques": [
                "Dim lights and screens after 8pm — Chang et al. (2015, PNAS) showed light-emitting screens delay melatonin onset by 1.5 hours and reduce next-morning alertness",
                "Establish 12-hour eating window (e.g., 7am-7pm) — aligns metabolism with circadian rhythm and improves sleep quality (Panda/Salk Institute TRE research)",
                "Stimulus control: use bed only for sleep — get out of bed if awake for 20+ minutes, re-associate bed with sleep onset (CBT-I Bootzin 1972)",
                "Evening wind-down: dim lights, drop room temperature to 65-68°F, 5-min relaxation practice — core body temperature must drop 1-1.5°C for sleep to begin"
            ],
            "framework": "Satchin Panda TRE (Cell Metabolism 2020) + CBT-I stimulus control (Bootzin) + Chang et al. blue light research (PNAS 2015)"
        },
        {
            "name": "Week 3 (Nutrition Timing & Movement)",
            "focus": "protein-rich breakfast, morning movement, and meal timing to sustain energy and prevent crashes throughout the day",
            "techniques": [
                "Protein breakfast within 1hr of waking: 25-30g protein stabilizes blood glucose and prevents the mid-morning energy and mood crash (Jakubowicz 2013)",
                "20-30 min morning walk: low-intensity to build without overwhelming fatigued users; morning exercise phase-advances the circadian clock for better energy all day",
                "Avoid large meals (800+ kcal) within 3 hours of bed — postprandial core temperature rise delays sleep onset and reduces sleep quality",
                "Physiological sigh for acute stress: double inhale through nose + long exhale through mouth — fastest single-breath stress reduction (Balban et al. 2023, Cell Reports Medicine)"
            ],
            "framework": "Jakubowicz protein breakfast research + Satchin Panda circadian eating + Balban 2023 breathing study"
        },
        {
            "name": "Week 4 (Integration & Optimization)",
            "focus": "reviewing energy gains, building contingency plans for disruptions, and establishing a sustainable maintenance architecture",
            "techniques": [
                "Review sleep diary: compare Week 1 vs Week 4 quality and energy ratings — identify the 2-3 changes that moved the needle most",
                "Identify personal top 3 energy levers (likely morning light, consistent wake time, and one nutrition or movement change)",
                "Contingency planning: what happens to your sleep and energy routine during travel, illness, or social schedule disruption?",
                "Set 90-day maintenance anchors: minimum viable routine you will protect even in disrupted weeks"
            ],
            "framework": "CBT-I maintenance planning + lifestyle medicine sustainability + chronobiology anchoring"
        }
    ],
    "behavioral": [
        {
            "name": "Week 1 (Trigger Awareness)",
            "focus": "building detailed awareness of the habit loop through behavioral logging and psychoeducation on dopamine and habit formation",
            "techniques": [
                "Urge/behavior log — track every instance across 5 dimensions: (1) location, (2) time of day, (3) emotional state, (4) who was present or absent, (5) immediately preceding action",
                "Values clarification: 'What does this behavior cost you in the areas of life that matter most to you?' (ACT — Hayes)",
                "Psychoeducation: explain the cue-routine-reward habit loop and how dopamine 'wanting' circuits work — normalizes the struggle, reduces shame",
                "Environmental audit: identify and reduce obvious access points, remove devices or apps that serve as primary cues"
            ],
            "framework": "Duhigg habit loop + ACT values (Hayes) + Motivational Interviewing (Miller & Rollnick) + dopamine neuroscience (Berridge, Michigan)"
        },
        {
            "name": "Week 2 (Habit Replacement)",
            "focus": "building concrete replacement behaviors for each major trigger and introducing urge surfing as the core coping skill",
            "techniques": [
                "Analyze top 3 triggers from Week 1 log — identify the actual reward being sought (relief? stimulation? connection? escape from discomfort?)",
                "Build replacement menu: 3-5 behaviors per major trigger that approximate the same reward through a different route (keep the reward, change the routine — Duhigg)",
                "Implementation intentions: 'When [cue fires], I will [replacement behavior] in [specific location]' — doubles follow-through (Gollwitzer 1999, NYU)",
                "RAIN urge surfing: Recognize the urge, Allow it without acting, Investigate what it feels like physically, Non-identify ('I have this urge, I am not this urge') — Judson Brewer, Brown University"
            ],
            "framework": "Habit replacement (Duhigg golden rule) + ACT urge surfing (Brewer, Brown) + Gollwitzer implementation intentions"
        },
        {
            "name": "Week 3 (Stress Testing)",
            "focus": "HALT vulnerability awareness, high-risk situation pre-planning, and emotion regulation under real pressure",
            "techniques": [
                "HALT morning check-in: rate Hungry, Angry, Lonely, Tired each morning — high scores = high vulnerability day, plan your support structures accordingly",
                "High-risk situation pre-planning: identify 2-3 upcoming situations most likely to trigger the behavior and write specific response plans before they happen",
                "TIPP for acute emotion regulation (DBT — Marsha Linehan, UW): Temperature (cold water on face/wrists), Intense exercise, Paced breathing, Progressive relaxation",
                "Challenge permission-giving thoughts in advance: 'just this once', 'I've earned this', 'I'll start again Monday' — write the counter-response before the urge fires"
            ],
            "framework": "Marlatt high-risk situations + DBT emotion regulation (Linehan, University of Washington) + CBT cognitive restructuring"
        },
        {
            "name": "Week 4 (Accountability & Forward Momentum)",
            "focus": "building the full relapse prevention plan, identity narrative work, and long-term maintenance architecture",
            "techniques": [
                "Marlatt relapse prevention plan: name early warning signs, top 3 high-risk situations, and write a specific lapse response script — prepared in advance",
                "Lapse vs relapse distinction: a single slip is a lapse — it becomes a relapse only if the Abstinence Violation Effect takes over ('I ruined it, might as well continue'). Coach against AVE explicitly.",
                "Identity narrative: 'Who am I becoming? What does that person do when the urge fires?' — identity-based change outlasts willpower (ACT + Clear)",
                "Self-compassion for setbacks (Kristin Neff, UT Austin): mindfulness + common humanity + self-kindness — higher self-compassion predicts MORE motivation to change, not less"
            ],
            "framework": "Marlatt & Gordon relapse prevention + Neff self-compassion research + ACT identity work + SMART Recovery"
        }
    ],
    "general": [
        {
            "name": "Week 1 (Sleep Foundation)",
            "focus": "establishing consistent sleep timing as the keystone habit with the most downstream effects on all other health behaviors",
            "techniques": [
                "Consistent wake time: same time 7 days/week — the single most impactful sleep habit; anchors the entire circadian system (Walker/Grandner research)",
                "Phone charger outside the bedroom tonight — removes the #1 sleep disruptor and strengthens the bed-sleep association",
                "10-min daily walk anchored to an existing routine using Fogg's Tiny Habits: 'After I [existing habit], I will take a 10-min walk'",
                "Baseline check-in: rate sleep quality, stress level, and energy 1-10 — establishes the comparison point for Week 4"
            ],
            "framework": "ACLM 6 Pillars + Matthew Walker sleep research (UC Berkeley) + Fogg Tiny Habits (Stanford) + Lally 66-day habit formation (UCL 2010)"
        },
        {
            "name": "Week 2 (Nervous System)",
            "focus": "building a daily stress regulation practice and an evening wind-down to protect sleep and restore the nervous system",
            "techniques": [
                "5-min morning breath practice stacked onto the consistent wake time from Week 1: 'After my alarm, I will do 5 min of box breathing' (Fogg habit stack)",
                "Evening wind-down: no screens 30 min before bed — screens prime the brain for alertness, the opposite of sleep readiness",
                "Blue Zones 'downshift' principle: every long-lived population has a daily stress-shedding ritual — find yours (walk, music, meditation, prayer)",
                "Perceived stress check: rate stress 1-10 — early data showing the practice is working"
            ],
            "framework": "Benson relaxation response (Harvard) + Blue Zones Power 9 (Buettner) + McGonigal stress-willpower research (Stanford)"
        },
        {
            "name": "Week 3 (Nutrition Foundation)",
            "focus": "adding nourishing foods using an add-don't-subtract approach — build before removing anything",
            "techniques": [
                "'Add, don't subtract': add one vegetable to lunch and dinner this week — no foods removed yet (DPP Week 1 behavioral approach)",
                "Protein at breakfast: stabilizes blood glucose and prevents the mid-morning energy and mood crash",
                "Environmental design: visible fruit bowl on counter, prepped vegetables at fridge eye level — make the healthy choice the default (Fogg/Wansink)",
                "Circadian eating awareness: note your current eating window (first bite to last bite) — introduce the concept without mandating a change yet"
            ],
            "framework": "DPP nutrition curriculum + Satchin Panda circadian eating (Salk Institute) + Fogg environmental design + Wansink behavioral food science"
        },
        {
            "name": "Week 4 (Movement & Connection)",
            "focus": "introducing sustainable movement and social accountability as the long-term infrastructure for lasting change",
            "techniques": [
                "3x 20-min movement sessions this week — 3x/week adherence at 12 months is significantly better than 7x/week; avoid all-or-nothing trap",
                "Identify one accountability person: tell one person what you're working on — social commitment dramatically improves follow-through (Ornish research)",
                "Identity framing: 'I am a person who takes care of themselves in the ways that matter' — identity-based habits outlast motivation-based habits (Clear — Atomic Habits)",
                "Set a 90-day intention: what does health look like 3 months from now? Not a goal — an identity statement"
            ],
            "framework": "ACLM exercise guidelines + Blue Zones 'right tribe' (Buettner) + Clear identity-based habits + Holt-Lunstad social connection research (BYU 2015)"
        }
    ]
}


TRACK_GUARDRAILS = {
    "anxiety": """
SAFETY GUARDRAILS — You must follow these without exception:
- Never diagnose any mental health condition (GAD, panic disorder, PTSD, OCD, depression, or any other)
- Never suggest the user change, reduce, or stop any medication
- Never provide clinical psychotherapy — only wellness coaching techniques
- If the user mentions suicidal thoughts, self-harm, or crisis: stop coaching immediately, express warm care, and say exactly: "Please reach out to the 988 Suicide and Crisis Lifeline — call or text 988"
- If symptoms appear to be worsening after 3+ weeks: recommend they speak with a licensed therapist or doctor
- Never minimize or dismiss anxiety — validate the experience before offering any technique
- Never use diagnostic language: do not say "you have anxiety disorder", "this sounds like GAD", or "you may have panic disorder"
""",
    "weight_loss": """
SAFETY GUARDRAILS — You must follow these without exception:
- Never set specific calorie targets or recommend a calorie deficit amount
- Never prescribe specific meal plans, macronutrient ratios, or therapeutic diets
- Never recommend specific diet protocols (keto, carnivore, prolonged fasting, etc.) as prescriptions
- Never make weight the sole metric of progress — always include energy, mood, sleep, and non-scale victories
- If the user mentions severely restricting food, bingeing, purging, or intense fear of eating: stop weight coaching immediately and say "This pattern sounds worth discussing with a doctor or eating disorder specialist"
- Never use shame language around food choices or body weight
- Frame everything as behavioral choices, not moral judgments about willpower or character
""",
    "skin": """
SAFETY GUARDRAILS — You must follow these without exception:
- Never diagnose any skin condition (acne, eczema, rosacea, psoriasis, seborrheic dermatitis, or any other)
- Never recommend stopping or changing any prescription medication (isotretinoin/Accutane, topical retinoids, antibiotics, biologics like dupilumab)
- Never contradict advice the user's dermatologist has given them — always defer to their doctor
- Never claim this program treats, cures, or prevents any skin condition — use "support skin health" or "complement your skincare routine" language only
- If the user reports skin symptoms alongside joint pain, fever, significant swelling, or signs of infection: say "Please see a doctor soon — some skin and systemic symptom combinations need medical evaluation"
- If the user mentions significant psychological distress about their skin, skin picking, or body dysmorphia: recommend both a dermatologist and mental health professional
""",
    "energy": """
SAFETY GUARDRAILS — You must follow these without exception:
- Never diagnose insomnia disorder, sleep apnea, ME/CFS, chronic fatigue syndrome, depression, thyroid dysfunction, anemia, or any other condition
- Never recommend supplements in therapeutic doses (melatonin above 1mg, B12, iron, DHEA — require confirmed deficiency and medical supervision)
- CRITICAL: If the user says physical or mental activity makes their fatigue significantly worse, lasting hours or days afterward (post-exertional malaise): stop ALL exercise recommendations immediately and say "Please see a doctor before doing any structured exercise — this specific pattern needs medical evaluation first"
- If fatigue has been unexplained for 4+ weeks without a clear lifestyle cause: recommend medical evaluation before continuing coaching
- Never interpret lab results — if the user shares thyroid, ferritin, or cortisol results, say "Your doctor is the right person to interpret these"
""",
    "behavioral": """
SAFETY GUARDRAILS — You must follow these without exception:
- Never diagnose addiction, behavioral addiction, impulse control disorder, or any DSM condition
- NEVER use shame language around lapses, relapses, or the behavior itself — shame is the #1 documented driver of relapse
- Never say "back to square one", "you ruined everything", "you failed", or any equivalent — always frame lapses as data, not verdicts
- Never impose abstinence-only framing for behaviors where harm reduction is more appropriate
- If the user mentions trauma, abuse, or PTSD as underlying factors: say "A licensed therapist could really help alongside this program — this goes deeper than coaching"
- If the user mentions co-occurring substance use (alcohol, drugs): recommend professional addiction support
- If any suicidal ideation or self-harm is mentioned: stop immediately, express care, provide the 988 Suicide and Crisis Lifeline (call or text 988)
- Never moralize or introduce religious framing unless the user explicitly introduces it first
""",
    "general": """
SAFETY GUARDRAILS — You must follow these without exception:
- Never diagnose any medical condition
- Never set specific calorie or macronutrient targets
- If the user mentions chest pain, palpitations, dizziness, or recent cardiac or surgical history: do not recommend exercise — say "Please get clearance from your doctor before starting an exercise program"
- If the user shows signs of persistent depression (low mood, loss of interest, hopelessness for 2+ weeks): recommend they speak with a doctor before continuing
- Never recommend therapeutic supplement doses
- Frame all recommendations as general wellness education, not medical treatment
- If any suicidal ideation is mentioned: stop immediately, express care, provide the 988 Suicide and Crisis Lifeline (call or text 988)
"""
}


TRACK_PROTOCOLS = {
    "anxiety": """
ANXIETY & STRESS WELLNESS PROTOCOL
Based on: MBSR (Kabat-Zinn, UMass), CBT (Beck Institute), ACT (Steven Hayes), MBCT (Segal/Williams/Teasdale)

WEEK 1 — AWARENESS & PHYSIOLOGY
Core daily practice: Diaphragmatic breathing 2x/day (4-count inhale, 4-count exhale)
Daily: 5-10 min body scan, mood rating 1-10
Education: Fight-or-flight response, cortisol, the autonomic nervous system

WEEK 2 — PATTERN RECOGNITION
Scheduled worry time: 15 min daily, same time — redirect all intrusive worries here (Borkovec CBT)
Expressive writing 3x: 15 min on deepest thoughts about a stressor (Pennebaker protocol)
Box breathing (4-4-4-4) for acute stress moments
Values reflection: what matters most, and how is stress getting in the way?

WEEK 3 — SKILL BUILDING
Thought records: Situation → Automatic thought → Emotion → Evidence → Balanced thought (Beck CBT)
ACT defusion: prefix thoughts with "I'm having the thought that..."
Gratitude journal: 3 items nightly
PMR or full body scan

WEEK 4 — COMMITTED ACTION
Behavioral activation: schedule 2-3 meaningful activities per week
Build personal stress toolkit: top 3 techniques that worked for this person
Identify early warning signs
Relapse prevention plan with written action steps

EVIDENCE BASE:
- Diaphragmatic breathing activates the vagal nerve and parasympathetic response
- Scheduled worry time reduces intrusive thoughts by containing rumination (Borkovec RCTs)
- Thought records challenge cognitive distortions — the cognitive triad (Beck)
- ACT defusion creates distance from thoughts without suppression or avoidance
- MBSR: 700+ peer-reviewed studies; recognized by NIH/NCCIH as evidence-based

SCOPE: Wellness coaching only. Not therapy. Never diagnose. Refer for clinical mental health conditions.
""",
    "weight_loss": """
WEIGHT LOSS & METABOLIC HEALTH PROTOCOL
Based on: DPP (NIH/CDC), Look AHEAD, NWCR (Wing & Hill), Motivational Interviewing (Miller/Rollnick)

WEEK 1 — BASELINE & MOTIVATION
Food diary: awareness only, no calorie counting, no prescriptions
MI-style exploration: intrinsic motivation, values, barriers to change
One small keystone habit chosen by the user
No weight or diet focus yet — foundation first

WEEK 2 — HABIT ARCHITECTURE
Environmental design: make healthy choices the easy default
Implementation intentions: "When X, I will Y" (Gollwitzer — doubles follow-through)
Schedule movement, don't rely on motivation
Sleep education: poor sleep drives hunger hormones ghrelin (+24%) and leptin (-18%)

WEEK 3 — STRESS, EMOTIONS & NON-SCALE WINS
ABC model for emotional eating: Antecedent → Behavior → Consequence
Mindful eating: one meal/day without screens (MB-EAT — Kristeller)
Non-scale victories: energy, sleep, mood, clothes fit, strength
Flexible restraint: one off-plan meal is data, not failure (Herman & Polivy)

WEEK 4 — IDENTITY & MAINTENANCE
Identity shift: "I am someone who..." (Clear — Atomic Habits)
High-risk situation planning in advance
Lapse vs relapse: prepare the recovery response before it's needed (Marlatt)
90-day transition plan beyond the coaching program

EVIDENCE BASE:
- DPP (NEJM 2002): lifestyle intervention reduced T2D by 58%, outperformed metformin
- NWCR findings: self-monitoring is the single strongest predictor of sustained weight loss
- Look AHEAD: high contact frequency in first 3-6 months drives sustained results
- Herman & Polivy: flexible restraint → better long-term outcomes; rigid restraint → bingeing

SCOPE: Behavioral wellness coaching. No calorie prescriptions, meal plans, or macronutrient targets. No eating disorder territory.
""",
    "skin": """
SKIN HEALTH PROTOCOL
Based on: Dr. Whitney Bowe (Gut Pathogens 2011), IFM 5R Protocol, Psychodermatology (ESDaP)

WEEK 1 — RESET & ELIMINATE
Remove: refined sugar, conventional dairy (skim milk, whey), alcohol, ultra-processed foods
Start: skin + food + mood diary, rate skin clarity 1-10 daily
Hydration: 8-10 cups water/day
Begin: 5-min daily mindfulness for cortisol reduction

WEEK 2 — GUT REBUILDING
Add fermented foods daily: yogurt, kefir, kimchi, sauerkraut, kombucha
Add prebiotic vegetables: garlic, leeks, asparagus, onions
Omega-3 sources: fatty fish 2-3x/week (reduces IL-1, TNF-alpha inflammatory cytokines)
Sleep hygiene: consistent wake time, cool room

WEEK 3 — STRESS & CORTISOL
Education: cortisol increases sebum, degrades collagen, worsens all inflammatory skin conditions
10-15 min daily mindfulness (Kabat-Zinn psoriasis study 1998: 4x faster clearing with MBSR)
Circadian sleep anchoring
Gratitude journaling

WEEK 4 — PERSONALIZATION
Systematic reintroduction: one food at a time, 3 days between each
Compare to Week 1 baseline (diary + photos)
Identify personal top 3 levers
Build sustainable long-term plan

EVIDENCE BASE:
- Bowe & Logan 2011: gut-skin axis established — microbiome directly affects skin inflammation
- Smith et al. 2007 (AJCN): low-GI diet reduced acne lesions ~50% in 12-week RCT
- Kabat-Zinn 1998 (Psychosomatic Medicine): MBSR accelerated psoriasis clearing 4x faster
- Adebamowo 2006: dairy (especially skim milk) correlates with acne in epidemiological studies

SCOPE: Lifestyle wellness coaching. Never diagnose skin conditions. Never advise stopping prescriptions. Complements, never replaces, dermatologist care.
""",
    "energy": """
ENERGY RESTORATION PROTOCOL
Based on: CBT-I (Morin/Espie/Spielman), Borbely 2-Process Model, Satchin Panda TRE, Huberman morning light protocol

WEEK 1 — REMOVE & MEASURE
Fixed wake time (same 7 days): most impactful single habit — anchors circadian rhythm
Sleep diary: time in bed, quality 1-10, next-day energy 1-10
Caffeine cutoff: 2pm (6-hour half-life; late caffeine fragments deep sleep)
Morning light: 10-20 min outdoors within 60 min of waking

WEEK 2 — CIRCADIAN ANCHORING
Screens and bright lights off by 8pm (Chang et al.: screens delay melatonin 1.5 hours)
12-hour eating window (e.g., 7am-7pm): aligns metabolism with circadian rhythm
Stimulus control: bed only for sleep; get up if awake 20+ min
Evening wind-down: dim lights, cool room (65-68°F), brief relaxation practice

WEEK 3 — NUTRITION TIMING & MOVEMENT
Protein breakfast within 1hr of waking (25-30g): prevents mid-morning energy crash
20-30 min morning walk: low-intensity, builds without overwhelming fatigued users
No large meals 3hrs before bed (postprandial temp rise delays sleep)
Physiological sigh practice: double inhale + long exhale (Balban 2023)

WEEK 4 — INTEGRATION
Review sleep diary Week 1 vs Week 4
Identify personal top 3 energy levers
Contingency plans for travel and disruption
Set 90-day maintenance anchors

EVIDENCE BASE:
- CBT-I: AASM first-line treatment for insomnia — outperforms sleep medication long-term
- Borbely: Process S (adenosine sleep pressure) + Process C (circadian clock) = 2-process sleep model
- Panda TRE (Cell Metabolism 2020): 10-12hr eating window improves energy, sleep, metabolic markers

CRITICAL: Post-exertional malaise (fatigue worsening after activity) = possible ME/CFS. Never prescribe exercise. Refer to doctor immediately.
""",
    "behavioral": """
BEHAVIORAL CHANGE PROTOCOL (Compulsive Habits & Impulse Control)
Based on: ACT (Hayes), MI (Miller/Rollnick), Duhigg habit loop, Marlatt Relapse Prevention, SMART Recovery

WEEK 1 — TRIGGER AWARENESS
Urge/behavior log across 5 dimensions: location, time, emotional state, people, preceding action
Values clarification: what does this behavior cost in the areas of life that matter? (ACT)
Psychoeducation: habit loop (cue-routine-reward) + dopamine wanting vs liking (Berridge)
Environmental audit: reduce access points and situational cues

WEEK 2 — HABIT REPLACEMENT
Analyze top 3 triggers from Week 1 log
Replacement menu: 3-5 behaviors per trigger approximating the same reward
Implementation intentions: "When [cue], I will [replacement] in [location]"
RAIN urge surfing: Recognize, Allow, Investigate, Non-identify (Brewer)

WEEK 3 — STRESS TESTING
HALT morning check-in: Hungry, Angry, Lonely, Tired
High-risk situation planning before they happen
TIPP emotion regulation (DBT — Linehan): Temperature, Intense exercise, Paced breathing, PMR
Challenge permission-giving thoughts in advance

WEEK 4 — MAINTENANCE ARCHITECTURE
Marlatt relapse prevention plan: early warning signs + high-risk situations + lapse response script
Lapse vs relapse distinction: prevent Abstinence Violation Effect (AVE)
Identity narrative: who am I becoming?
Self-compassion for setbacks (Neff: common humanity + mindfulness + self-kindness)

EVIDENCE BASE:
- Marlatt & Gordon: AVE (shame + all-or-nothing thinking) is what converts lapses to relapses
- Brewer (Brown): mindfulness-based urge surfing more effective than willpower suppression
- Neff: higher self-compassion predicts more motivation to change after failure, not less
- Berridge (Michigan): behavioral addiction = disorder of "wanting" not "liking"

SCOPE: Wellness coaching only. Never diagnose. Never shame. Refer for trauma, substance use, clinical cases.
""",
    "general": """
GENERAL WELLNESS PROTOCOL
Based on: ACLM 6 Pillars, Blue Zones Power 9 (Buettner), Fogg Tiny Habits, DPP, Ornish Lifestyle Medicine

THE 6 PILLARS (ACLM — American College of Lifestyle Medicine):
1. Sleep (7-9 hours, consistent timing)
2. Movement (150 min/week moderate activity)
3. Nutrition (whole foods, plant-predominant)
4. Stress management (daily practice)
5. Avoidance of risky substances
6. Positive social connection

SEQUENCING RATIONALE (evidence-based order):
1. Sleep first: poor sleep drives hunger hormones, impairs willpower, undermines everything else
2. Stress second: chronic stress depletes prefrontal cortex and willpower capacity
3. Nutrition third: requires cognitive bandwidth and mood stability from pillars 1-2
4. Movement fourth: requires energy and motivation built from the above
5. Social: woven throughout, culminates in Week 4

WEEK 1 — SLEEP FOUNDATION
Consistent wake time (keystone habit), phone charger outside bedroom, 10-min daily walk

WEEK 2 — NERVOUS SYSTEM
Morning breath practice stacked on wake time, evening wind-down, daily downshift ritual

WEEK 3 — NUTRITION FOUNDATION
Add vegetables (don't subtract first), protein breakfast, environmental design for easy healthy choices

WEEK 4 — MOVEMENT & CONNECTION
3x 20-min sessions, accountability partner, identity framing, 90-day intention

EVIDENCE BASE:
- Lally et al. 2010 (UCL): mean habit formation = 66 days (range 18-254); missing one day does not break formation
- Blue Zones: social connection and purpose more predictive of longevity than any single dietary intervention
- Ornish 1990 (JAMA): lifestyle medicine reverses coronary artery disease — 4 equal pillars
- Fogg: ability and prompt matter more than motivation for sustained behavior change

SCOPE: General wellness coaching. No calorie prescriptions. No diagnoses. Refer for red-flag symptoms.
"""
}


def _get_week_data(day: int, route: str) -> dict:
    track = PROGRAM_ROUTES.get(route, PROGRAM_ROUTES["general"])
    if day <= 7:
        return track[0]
    elif day <= 14:
        return track[1]
    elif day <= 21:
        return track[2]
    else:
        return track[3]


def detect_program_route(profile: PatientProfile) -> str:
    concerns = ", ".join(profile.health_concerns) if profile.health_concerns else ""
    goals = ", ".join(profile.goals) if profile.goals else ""
    response = client.messages.create(
        model=MODEL,
        max_tokens=10,
        system="""You are a health program router. Based on the patient's concerns and goals, pick the single best route.
Return ONLY one of these exact strings: anxiety, weight_loss, skin, energy, behavioral, general
Rules:
- behavioral: compulsive habits, addiction, porn, masturbation, social media overuse, gambling, impulse control
- anxiety: stress, panic, worry, mental health, burnout, overwhelm
- weight_loss: weight, fat loss, obesity, BMI, diet
- skin: acne, eczema, rosacea, skin health, complexion
- energy: fatigue, tiredness, low energy, brain fog, motivation
- general: everything else or mixed concerns
No explanation. Just the one word.""",
        messages=[{"role": "user", "content": f"Concerns: {concerns}\nGoals: {goals}"}]
    )
    route = response.content[0].text.strip().lower()
    return route if route in PROGRAM_ROUTES else "general"


def parse_patient_profile(raw_text: str) -> PatientProfile:
    response = client.messages.create(
        model=MODEL,
        max_tokens=512,
        system="""You are a health data parser. Extract patient info from intake form data.
Return ONLY a valid JSON object with exactly these fields:
{
  "name": string or null,
  "age": integer or null,
  "weight": string or null,
  "height": string or null,
  "sleep_hours": float or null,
  "goals": ["list", "of", "strings"],
  "current_habits": ["list", "of", "strings"],
  "health_concerns": ["list", "of", "strings"]
}
Infer goals and concerns from the "Health concerns and goals" field.
No explanation. No markdown. Just the JSON object.""",
        messages=[{"role": "user", "content": raw_text}]
    )
    data = json.loads(response.content[0].text)
    return PatientProfile(**data)


def generate_checkin_questions(day: int, profile: PatientProfile, previous_checkins: list) -> list[str]:
    route = profile.program_route or "general"
    week_data = _get_week_data(day, route)
    week_name = week_data["name"]
    focus = week_data["focus"]
    techniques_text = "\n".join(f"- {t}" for t in week_data["techniques"])
    framework = week_data["framework"]
    guardrails = TRACK_GUARDRAILS.get(route, TRACK_GUARDRAILS["general"])

    all_asked = [q for c in previous_checkins for q in c.questions_asked]
    previous_summary = ""
    if all_asked:
        previous_summary = f"Questions already asked (do NOT repeat or paraphrase these):\n" + "\n".join(f"- {q}" for q in all_asked)
    if previous_checkins and previous_checkins[-1].user_responses:
        previous_summary += f"\nLast responses: {previous_checkins[-1].user_responses}"

    commitment_context = ""
    last_with_commitment = next((c for c in reversed(previous_checkins) if c.commitment), None)
    if last_with_commitment:
        commitment_context = (
            f"\n\nCommitment from last check-in: \"{last_with_commitment.commitment}\""
            f"\nMake the FIRST of your 3 questions directly ask whether they kept this commitment and how it went. Be specific — name the commitment explicitly."
        )

    pattern_context = ""
    completed = [c for c in previous_checkins if c.user_responses]
    if len(completed) >= 3:
        recent_lines = []
        for c in completed[-7:]:
            pairs = " | ".join([f"Q: {q} — A: {r}" for q, r in zip(c.questions_asked, c.user_responses)])
            recent_lines.append(f"Day {c.day}: {pairs}")
        pattern_context = (
            "\n\nRecent check-in history (last 7 days):\n" + "\n".join(recent_lines) +
            "\n\nPattern instruction: Scan the history above for anything recurring — same struggle 3+ days, "
            "consistent avoidance, repeated timing, a habit that keeps slipping. "
            "If you find one, make at least 1 question directly reference it by name. "
            "Don't be subtle — call it out. If no clear pattern exists, ignore this instruction."
        )

    concerns = ", ".join(profile.health_concerns) if profile.health_concerns else ""
    goals = ", ".join(profile.goals) if profile.goals else ""

    response = client.messages.create(
        model=MODEL,
        max_tokens=512,
        system=f"""You are a health coach running a 30-day evidence-based wellness program.
Framework: {framework}
Patient: age={profile.age}, sleep={profile.sleep_hours}hrs, goals={goals}, health concerns={concerns}.
Today is Day {day} — {week_name}.
Week focus: {focus}

This week's evidence-based techniques to draw from:
{techniques_text}

{previous_summary}{commitment_context}{pattern_context}

Generate exactly 3 check-in questions focused on {focus}.
Rules:
- Connect the week's focus and techniques to this patient's specific goals and concerns
- Reference specific techniques from the list above naturally in your questions where relevant
- Questions must feel written for this specific person, not generic
- No emojis, no fluff. Direct and conversational.
- Return ONLY a JSON array of 3 strings. No explanation. No markdown.

{guardrails}""",
        messages=[{"role": "user", "content": f"Generate Day {day} check-in questions."}]
    )
    return json.loads(response.content[0].text)


def generate_coaching_response(day: int, questions: list, responses: list, profile: PatientProfile) -> str:
    route = profile.program_route or "general"
    week_data = _get_week_data(day, route)
    framework = week_data["framework"]
    guardrails = TRACK_GUARDRAILS.get(route, TRACK_GUARDRAILS["general"])

    qa_pairs = "\n".join([f"Q: {q}\nA: {r}" for q, r in zip(questions, responses)])
    response = client.messages.create(
        model=MODEL,
        max_tokens=250,
        system=f"""You are a health coach reviewing a patient's daily check-in answers.
Framework: {framework}
Patient: age={profile.age}, sleep={profile.sleep_hours}hrs, goals={profile.goals}, Day {day} of 30.
Rules:
- No emojis. No filler like "great job" or "well done".
- Acknowledge what they shared in 1 sentence.
- Give 1-2 specific, actionable next steps based on their answers — reference the evidence-based technique by name when recommending it.
- Max 80 words. Warm but direct.

{guardrails}""",
        messages=[{"role": "user", "content": f"Check-in responses:\n{qa_pairs}"}]
    )
    return response.content[0].text


def extract_commitment(coaching_text: str) -> str:
    response = client.messages.create(
        model=MODEL,
        max_tokens=60,
        system="""Extract the single most concrete, actionable commitment from this coaching response.
Return it as a short first-person statement starting with "I will..."
Max 20 words. Just the commitment, nothing else. No emojis.""",
        messages=[{"role": "user", "content": coaching_text}]
    )
    return response.content[0].text.strip()


def generate_progress_summary(profile: PatientProfile, check_ins: list) -> str:
    def format_checkins(checkins):
        parts = []
        for c in checkins:
            pairs = "\n".join([f"  Q: {q}\n  A: {r}" for q, r in zip(c.questions_asked, c.user_responses)])
            parts.append(f"Day {c.day}:\n{pairs}")
        return "\n\n".join(parts)

    this_week = check_ins[-7:]
    last_week = check_ins[-14:-7] if len(check_ins) >= 8 else []
    last_week_text = format_checkins(last_week) if last_week else "No previous week data yet."

    response = client.messages.create(
        model=MODEL,
        max_tokens=500,
        system=f"""You are a health coach reviewing a patient's progress.
Patient: {profile.name or 'Patient'}, age={profile.age}, goals={profile.goals}, concerns={profile.health_concerns}.
Rules:
- No emojis. No filler like "great job".
- Be specific — reference actual things the patient said in their responses.
- Identify 2-3 clear trends (improving, worsening, or consistent) across the check-ins.
- If last week data exists, compare directly. If not, summarize patterns from this week only.
- End with 1 concrete focus area for the coming days.
- Max 150 words. Warm but direct.""",
        messages=[{"role": "user", "content": f"THIS WEEK:\n{format_checkins(this_week)}\n\nLAST WEEK:\n{last_week_text}"}]
    )
    return response.content[0].text


def answer_from_protocol(question: str, protocol_context: str, profile: PatientProfile) -> str:
    response = client.messages.create(
        model=MODEL,
        max_tokens=400,
        system=f"""You are a health coach. Answer using the wellness protocol below.
Rules:
- No emojis. No "great question". No filler phrases.
- Be direct and warm. 2-4 sentences max unless a list is genuinely needed.
- If the answer is not in the protocol, say exactly: "That's outside your current protocol — check with your doctor."
- Do not invent facts or add advice not in the protocol.

Patient: age={profile.age}, goals={profile.goals}.

WELLNESS PROTOCOL:
{protocol_context}""",
        messages=[{"role": "user", "content": question}]
    )
    return response.content[0].text
