const Sentiment = require('sentiment');
const sentiment = new Sentiment();

const MOODS = {
  HAPPY: 'Happy & Joyful',
  SAD: 'Melancholic',
  ENERGETIC: 'Energetic & Motivated',
  CHILL: 'Chill & Relaxed',
  ANGRY: 'Angry & Frustrated'
};

/**
 * Convert typing speed (CPM) to a rough "BPM feel".
 * Average adult types ~200 CPM at normal pace.
 * We map CPM → musical BPM range:
 *   < 60  CPM → ~50–70  BPM : very slow, melancholic
 *   60–120 CPM → ~70–90  BPM : slow/chill
 *  120–200 CPM → ~90–120 BPM : normal/happy
 *  200–280 CPM → ~120–150 BPM: fast/energetic
 *   280+   CPM → ~150+   BPM : very fast/intense/angry
 */
function cpmToBpm(cpm) {
  if (!cpm || cpm <= 0) return null;
  // Simple linear map: BPM ≈ CPM * 0.55 clamped to [50, 180]
  const bpm = Math.round(cpm * 0.55);
  return Math.min(180, Math.max(50, bpm));
}

function moodFromBpm(bpm) {
  if (bpm < 65) return MOODS.SAD;
  if (bpm < 88) return MOODS.CHILL;
  if (bpm < 115) return MOODS.HAPPY;
  if (bpm < 145) return MOODS.ENERGETIC;
  return MOODS.ANGRY;
}

/**
 * Determine mood from text + optional typing CPM.
 * BPM (from typing speed) is weighted 40%, text sentiment 60%.
 * Strong explicit keywords always override.
 */
function determineMood(text, cpm = 0) {
  text = text.toLowerCase();

  // Hard keyword overrides — always take priority
  const angryWords = ['mad', 'angry', 'hate', 'furious', 'annoyed', 'rage', 'pissed'];
  const sadWords = ['depressed', 'crying', 'sad', 'heartbreak', 'lonely', 'miss', 'grief'];
  const energeticWords = ['motivated', 'pumped', 'ready', 'workout', 'energy', 'unstoppable', 'hype'];
  const chillWords = ['tired', 'sleepy', 'relax', 'calm', 'peaceful', 'quiet', 'lazy', 'rest'];

  const angryCount = angryWords.filter(w => text.includes(w)).length;
  const sadCount = sadWords.filter(w => text.includes(w)).length;
  const energeticCount = energeticWords.filter(w => text.includes(w)).length;
  const chillCount = chillWords.filter(w => text.includes(w)).length;

  if (angryCount >= 2) return { mood: MOODS.ANGRY, bpm: null };
  if (sadCount >= 2) return { mood: MOODS.SAD, bpm: null };
  if (energeticCount >= 2) return { mood: MOODS.ENERGETIC, bpm: null };

  // Text sentiment score
  const result = sentiment.analyze(text);
  const sentimentScore = result.score;  // typically -5 to +5

  let textMood;
  if (angryCount > 0) textMood = MOODS.ANGRY;
  else if (sadCount > 0) textMood = MOODS.SAD;
  else if (energeticCount > 0) textMood = MOODS.ENERGETIC;
  else if (chillCount > 0) textMood = MOODS.CHILL;
  else if (sentimentScore > 2) textMood = MOODS.HAPPY;
  else if (sentimentScore < -2) textMood = MOODS.SAD;
  else if (sentimentScore > 0) textMood = MOODS.HAPPY;
  else textMood = MOODS.CHILL;

  // BPM component from typing speed
  const bpm = cpmToBpm(cpm);
  const bpmMood = bpm ? moodFromBpm(bpm) : null;

  // Blend: if BPM mood is available, it weights 40% of the decision
  let finalMood;
  if (!bpmMood || bpmMood === textMood) {
    finalMood = textMood;
  } else {
    // When they disagree, lean toward the more "extreme" one
    const moodRank = {
      [MOODS.SAD]: 0,
      [MOODS.CHILL]: 1,
      [MOODS.HAPPY]: 2,
      [MOODS.ENERGETIC]: 3,
      [MOODS.ANGRY]: 4
    };
    // Weighted average index (text 60%, bpm 40%)
    const blended = moodRank[textMood] * 0.6 + moodRank[bpmMood] * 0.4;
    const moods = [MOODS.SAD, MOODS.CHILL, MOODS.HAPPY, MOODS.ENERGETIC, MOODS.ANGRY];
    finalMood = moods[Math.round(blended)];
  }

  return { mood: finalMood, bpm };
}

module.exports = { determineMood, cpmToBpm, moodFromBpm, MOODS };
