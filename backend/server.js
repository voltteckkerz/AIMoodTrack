const express = require('express');
const cors = require('cors');
const path = require('path');
const ytdl = require('@distube/ytdl-core');
const ytsearch = require('yt-search');
const { determineMood } = require('./nlp');
const { getRecommendationsForMood } = require('./recommender');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ── Mood + track recommendations ─────────────────────────────────────────────
app.post('/api/recommend', async (req, res) => {
    try {
        const { text, typingData } = req.body;
        if (!text) return res.status(400).json({ error: 'Text is required.' });

        const cpm = typingData?.cpm || 0;
        const { mood: predictedMood, bpm } = determineMood(text, cpm);
        const tracks = await getRecommendationsForMood(predictedMood);

        res.json({ mood: predictedMood, bpm, tracks });
    } catch (err) {
        console.error('Recommend error:', err);
        res.status(500).json({ error: 'Failed to generate recommendations.' });
    }
});

// ── YouTube audio stream URL (on-demand) ─────────────────────────────────────
// Accepts either ?videoId=xxx (preferred, faster) or ?q=search+query (fallback)
app.get('/api/youtube', async (req, res) => {
    try {
        let videoUrl;

        if (req.query.videoId) {
            videoUrl = `https://www.youtube.com/watch?v=${req.query.videoId}`;
        } else if (req.query.q) {
            const results = await ytsearch(req.query.q + ' official audio');
            const video = results.videos[0];
            if (!video) return res.status(404).json({ error: 'No results found' });
            videoUrl = video.url;
        } else {
            return res.status(400).json({ error: 'Provide videoId or q param' });
        }

        const info = await ytdl.getInfo(videoUrl);
        const formats = ytdl.filterFormats(info.formats, 'audioonly');
        const format = formats.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

        if (!format) return res.status(404).json({ error: 'No audio format found' });

        res.json({ audioUrl: format.url, videoUrl });
    } catch (err) {
        console.error('YouTube error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`Server running → http://localhost:${PORT}`));
