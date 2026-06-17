/**
 * Resolves full coaching content for any workout exercise.
 * Pattern templates cover all library exercises; plan cues are merged in.
 */

export type CaliPattern =
  | "horizontal_push" | "vertical_push" | "horizontal_pull" | "vertical_pull"
  | "squat" | "lunge" | "hinge" | "anti_extension" | "anti_rotation"
  | "flexion" | "iso_hold" | "locomotion" | "plyo" | "stretch";

export type CaliCategory =
  | "push" | "pull" | "core" | "legs" | "conditioning" | "mobility";

export interface WorkoutExerciseItem {
  exerciseId: string;
  name: string;
  category: CaliCategory;
  pattern: string;
  cues: string[];
  benefit?: string;
  scalingDownName?: string;
  scalingUpName?: string;
}

export interface ExerciseGuide {
  instructions: string;
  formCues: string[];
  commonMistakes: string[];
  breathing: string;
  benefit: string;
  scaling: {
    beginner?: string;
    intermediate: string;
    advanced?: string;
  };
}

const CATEGORY_BENEFITS: Record<CaliCategory, string> = {
  push: "Builds pressing power, shoulder stability, and upper-body resilience",
  pull: "Develops back strength, grip endurance, and postural control",
  core: "Forges trunk stiffness, anti-rotation strength, and midline power",
  legs: "Builds lower-body drive, single-leg balance, and athletic explosiveness",
  conditioning: "Elevates work capacity, heart rate recovery, and mental toughness",
  mobility: "Unlocks range of motion, joint health, and movement quality",
};

const PATTERN_TEMPLATES: Record<string, Omit<ExerciseGuide, "benefit" | "scaling" | "formCues">> = {
  horizontal_push: {
    instructions: "Set a straight line from head to heels. Lower under control until your chest nearly touches, then drive through your palms to full lockout. Own every inch of the range.",
    commonMistakes: ["Sagging hips or piking up", "Elbows flaring to 90°", "Half reps — no lockout at the top"],
    breathing: "Inhale on the way down, brace your core, exhale as you press up.",
  },
  vertical_push: {
    instructions: "Stack shoulders over wrists (or hands). Press vertically while keeping ribs down and glutes engaged. Move with intention — this is overhead strength, not a shrug.",
    commonMistakes: ["Arching the lower back excessively", "Shrugging shoulders to ears", "Rushing the negative"],
    breathing: "Breathe in at the bottom, exhale through the sticking point on the way up.",
  },
  horizontal_pull: {
    instructions: "Lead with your chest, not your hips. Pull your elbows toward your back pockets and squeeze your shoulder blades together at the top. Control the return — don't drop.",
    commonMistakes: ["Using momentum to kip", "Shrugging instead of pulling with lats", "Incomplete range — chin/chest doesn't reach target"],
    breathing: "Exhale on the pull, inhale on the controlled lower.",
  },
  vertical_pull: {
    instructions: "Hang with active shoulders — no dead hang slump. Pull until your chin clears the bar or rings, then lower slowly to full extension. Grip the bar like you mean it.",
    commonMistakes: ["Swinging or kipping for reps", "Half reps at the bottom", "Craning the neck instead of pulling with back"],
    breathing: "Exhale as you pull up, inhale on the descent.",
  },
  squat: {
    instructions: "Feet shoulder-width, toes slightly out. Sit back and down keeping your chest proud. Drive through mid-foot to stand — knees track over toes the whole way.",
    commonMistakes: ["Knees caving inward", "Heels lifting off the floor", "Rounding the lower back at the bottom"],
    breathing: "Big breath and brace before descending, exhale on the way up.",
  },
  lunge: {
    instructions: "Step long enough that both knees hit roughly 90°. Keep your torso tall and front knee stacked over ankle. Push through the front heel to return or alternate.",
    commonMistakes: ["Front knee drifting past toes", "Leaning torso forward", "Tiny steps that don't load the legs"],
    breathing: "Inhale stepping down, exhale driving back up.",
  },
  hinge: {
    instructions: "Hinge at the hips — push your butt back like closing a car door. Keep a flat back and feel tension in hamstrings. Return by squeezing glutes, not yanking with your lower back.",
    commonMistakes: ["Rounding the spine", "Bending knees too much (turning it into a squat)", "Not feeling hamstrings load"],
    breathing: "Inhale on the hinge down, exhale on the hip extension up.",
  },
  anti_extension: {
    instructions: "Brace your abs like someone's about to punch your stomach. Hold the position — don't let your lower back arch or hips sag. Quality over duration.",
    commonMistakes: ["Hips sagging toward the floor", "Holding breath the entire time", "Shrugging shoulders to ears"],
    breathing: "Steady nasal breathing — don't hold your breath unless it's a max-effort short hold.",
  },
  anti_rotation: {
    instructions: "Resist rotation through your trunk. Keep hips and shoulders square while force tries to twist you. You're building a steel core, not twisting for reps.",
    commonMistakes: ["Rotating hips or shoulders to cheat", "Rushing through reps", "Loose core — no brace"],
    breathing: "Exhale on the exertion phase, maintain brace throughout.",
  },
  flexion: {
    instructions: "Curl or crunch through your abs — not your hip flexors. Slow on the way down, pause briefly at peak contraction. Neck stays neutral, chin off chest.",
    commonMistakes: ["Pulling on your neck", "Using momentum to swing up", "Letting lower back peel off the floor"],
    breathing: "Exhale on the crunch, inhale on the return.",
  },
  iso_hold: {
    instructions: "Find the position and own it. Every muscle that's supposed to be on — turn it on. Stillness is strength. If you shake, that's your nervous system learning.",
    commonMistakes: ["Relaxing between muscles that should stay tight", "Holding breath until you turn red", "Breaking form to extend time"],
    breathing: "Rhythmic steady breaths — in through nose, out through mouth.",
  },
  locomotion: {
    instructions: "Move with rhythm and control. Each step or crawl pattern should be deliberate — this builds coordination and conditioning simultaneously.",
    commonMistakes: ["Rushing and losing form", "Letting hips bounce side to side", "Shallow range — go full expression"],
    breathing: "Match breath to movement rhythm — don't gasp, stay controlled.",
  },
  plyo: {
    instructions: "Load then explode. Absorb the landing softly through your ankles, knees, and hips. Every rep should look the same — power with control.",
    commonMistakes: ["Landing with stiff straight legs", "Cutting range short", "Fatigue reps that look sloppy"],
    breathing: "Quick exhale on exertion, reset breath before the next rep.",
  },
  stretch: {
    instructions: "Ease into the stretch — never bounce. Find a mild tension, breathe into it, and let range increase over 30–60 seconds. This is recovery, not competition.",
    commonMistakes: ["Forcing range and wincing", "Holding breath", "Bouncing at end range"],
    breathing: "Long slow exhales — each exhale lets you sink a millimeter deeper.",
  },
};

const DEFAULT_TEMPLATE = PATTERN_TEMPLATES.horizontal_push;

export function getExerciseGuide(item: WorkoutExerciseItem): ExerciseGuide {
  const template = PATTERN_TEMPLATES[item.pattern] ?? DEFAULT_TEMPLATE;
  const benefit = item.benefit ?? CATEGORY_BENEFITS[item.category] ?? CATEGORY_BENEFITS.push;

  return {
    instructions: template.instructions,
    formCues: item.cues.length > 0 ? item.cues : ["Move with control", "Full range of motion", "Brace your core"],
    commonMistakes: template.commonMistakes,
    breathing: template.breathing,
    benefit,
    scaling: {
      beginner: item.scalingDownName,
      intermediate: item.name,
      advanced: item.scalingUpName,
    },
  };
}

export const CATEGORY_COLORS: Record<CaliCategory, string> = {
  push: "#4274B9",
  pull: "#2DD4BF",
  core: "#D4A843",
  legs: "#10B981",
  conditioning: "#F87171",
  mobility: "#A78BFA",
};