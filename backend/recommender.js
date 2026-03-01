const ytsearch = require('yt-search');

// Larger query pools — we randomly pick 3 each call for fresh results
const MOOD_QUERIES = {
    'Happy & Joyful': [
        'happy pop songs 2024', 'feel good hits playlist', 'upbeat songs 2024',
        'fun pop music 2023', 'joyful music hits', 'positive vibes songs',
        'happy hits top chart', 'summer pop bops 2024', 'smile songs playlist'
    ],
    'Melancholic': [
        'sad songs 2024', 'emotional music playlist', 'heartbreak songs 2024',
        'melancholy indie songs', 'sad pop 2023', 'rainy day songs playlist',
        'lonely songs hits', 'tearful music hits', 'slow sad songs 2024'
    ],
    'Energetic & Motivated': [
        'workout music 2024', 'hype gym playlist', 'motivational music hits',
        'energy boost songs', 'running music 2024', 'pump up songs playlist',
        'intense workout beats', 'motivation workout hits 2023', 'power songs gym'
    ],
    'Chill & Relaxed': [
        'chill vibes music 2024', 'lofi chill playlist', 'relaxing popular songs',
        'calm music 2023', 'easy listening hits', 'lo fi hip hop beats',
        'mellow songs playlist', 'peaceful music hits', 'chill indie 2024'
    ],
    'Angry & Frustrated': [
        'rock hits 2024', 'aggressive music playlist', 'metal intensity songs',
        'hard rock banger 2023', 'angry songs playlist', 'intense rock music',
        'heavy music hits', 'punk rock songs 2024', 'rage music playlist'
    ],
};

// Fisher-Yates shuffle
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * Search YouTube for top tracks matching a mood.
 * Returns up to `limit` tracks with full YouTube metadata.
 */
async function getRecommendationsForMood(moodStr, limit = 12) {
    const pool = MOOD_QUERIES[moodStr] || ['top hits 2024', 'popular songs this week'];

    // Randomly pick 3 queries from the pool — different every call
    const chosen = shuffle(pool).slice(0, 3);

    const allVideos = [];
    const results = await Promise.allSettled(chosen.map(q => ytsearch(q)));

    for (const result of results) {
        if (result.status === 'fulfilled' && result.value.videos) {
            allVideos.push(...result.value.videos);
        }
    }

    // Deduplicate by videoId
    const seen = new Set();
    const unique = allVideos.filter(v => {
        if (!v.videoId || seen.has(v.videoId)) return false;
        seen.add(v.videoId);
        return true;
    });

    // Filter out non-music (< 60s or > 15min)
    const songs = unique.filter(v => {
        const secs = v.duration?.seconds || 0;
        return secs >= 60 && secs <= 900;
    });

    // Shuffle final results so order is different each time, then take limit
    return shuffle(songs).slice(0, limit).map(v => ({
        track_id: v.videoId,
        track_name: v.title,
        artist_name: v.author?.name || 'YouTube',
        album_art: v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
        video_id: v.videoId,
        youtube_url: v.url,
        duration: v.duration?.seconds,
        duration_label: v.duration?.timestamp || '',
        views: v.views || 0,
    }));
}

module.exports = { getRecommendationsForMood };
