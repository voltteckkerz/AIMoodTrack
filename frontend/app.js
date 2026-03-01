document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('moodInput');
    const predictBtn = document.getElementById('predictBtn');
    const loader = document.getElementById('loadingIndicator');
    const coverflow = document.getElementById('coverflow');
    const detectedMood = document.getElementById('detectedMood');
    const moodHeader = document.getElementById('moodHeader');
    const bottomPlayer = document.getElementById('bottomPlayer');
    const typingStats = document.getElementById('typingStats');
    const appBackground = document.getElementById('albumTint');
    const emptyState = document.getElementById('emptyState');

    const playerArt = document.getElementById('playerArt');
    const playerTitle = document.getElementById('playerTitle');
    const playerArtist = document.getElementById('playerArtist');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const audioPlayer = document.getElementById('audioPlayer');

    let startTime = null;
    let charCount = 0;
    let globalTracks = [];
    let isPlaying = false;

    // Smooth animation state
    let currentOffset = 0;
    let targetOffset = 0;
    let animFrameId = null;

    // Drag state
    let isDragging = false;
    let dragStartX = 0;
    let dragStartOffset = 0;

    // Typing Logic
    input.addEventListener('input', (e) => {
        if (!startTime) startTime = Date.now();
        charCount = e.target.value.length;
        let timeElapsedMin = (Date.now() - startTime) / 60000;
        if (timeElapsedMin > 0 && charCount > 0) {
            typingStats.textContent = `${Math.round(charCount / timeElapsedMin)} CPM`;
        }
        if (charCount === 0) { startTime = null; typingStats.textContent = ''; }
    });

    // Allow pressing Enter to submit
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') predictBtn.click();
    });

    async function fetchMood() {
        const text = input.value.trim();
        if (!text) return;
        predictBtn.disabled = true;
        loader.classList.remove('hidden');
        predictBtn.querySelector('svg').style.display = 'none';
        try {
            const timeElapsedMin = startTime ? (Date.now() - startTime) / 60000 : 0;
            const cpm = timeElapsedMin > 0 ? charCount / timeElapsedMin : 0;
            const response = await fetch('/api/recommend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, typingData: { cpm } })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            globalTracks = data.tracks;
            currentOffset = Math.floor(globalTracks.length / 2);
            targetOffset = currentOffset;

            detectedMood.textContent = data.mood;
            // Show BPM badge if available
            const bpmBadge = document.getElementById('bpmBadge');
            if (bpmBadge) {
                bpmBadge.textContent = data.bpm ? `${data.bpm} BPM` : '';
                bpmBadge.style.display = data.bpm ? 'inline-block' : 'none';
            }
            moodHeader.style.opacity = '1';

            // Hide empty state, show player
            if (emptyState) emptyState.style.display = 'none';
            bottomPlayer.classList.remove('hidden');

            buildCards();
            startAnimLoop();
            updatePlayerBar();
        } catch (error) {
            console.error(error);
            alert("Oops! Failed to connect to backend/Spotify APIs.");
        } finally {
            predictBtn.disabled = false;
            loader.classList.add('hidden');
            predictBtn.querySelector('svg').style.display = '';
        }
    }

    predictBtn.addEventListener('click', fetchMood);


    // Build static card elements once
    function buildCards() {
        coverflow.innerHTML = '';
        globalTracks.forEach((track, index) => {
            const card = document.createElement('div');
            card.className = 'coverflow-card';
            card.style.backgroundImage = `url(${track.album_art})`;
            card.dataset.index = index;
            card.innerHTML = `
                <div class="card-content">
                    <div class="card-title">${track.track_name}</div>
                    <div class="card-artist">${track.artist_name}</div>
                </div>`;
            card.addEventListener('click', () => {
                if (!isDragging) {
                    targetOffset = index;
                }
            });
            coverflow.appendChild(card);
        });
        // Reset snap tracker so buildCards always triggers a fresh load
        lastSnappedIndex = -1;
    }

    // Animation Loop — runs 60fps, smoothly interpolates currentOffset → targetOffset
    let lastSnappedIndex = -1;
    let playerUpdateTimer = null;

    function startAnimLoop() {
        if (animFrameId) cancelAnimationFrame(animFrameId);
        function loop() {
            // Spring lerp
            currentOffset += (targetOffset - currentOffset) * 0.12;
            applyTransforms(currentOffset);
            animFrameId = requestAnimationFrame(loop);
        }
        loop();
    }

    // Apply iPod-accurate transforms to every card
    function applyTransforms(centerPos) {
        const cards = coverflow.querySelectorAll('.coverflow-card');

        // Only show nearest 5 on each side to prevent clutter
        const VISIBLE_SIDE = 5;

        cards.forEach((card, index) => {
            const rawOffset = index - centerPos;  // positive = right of center
            const absOffset = Math.abs(rawOffset);
            const sign = Math.sign(rawOffset);

            // Hide cards too far away
            if (absOffset > VISIBLE_SIDE) {
                card.style.display = 'none';
                return;
            }
            card.style.display = '';

            let rotateY, translateX, translateZ, scale, opacity;

            if (absOffset <= 1) {
                // Center zone: smoothly interpolate from flat to 65deg
                rotateY = sign * absOffset * 65;
                translateX = sign * absOffset * 170;
                translateZ = -(absOffset * 120);
                scale = 1.08 - (absOffset * 0.08);
                opacity = 1;
            } else {
                // Wings: locked at 65deg, tight stack
                rotateY = sign * 65;
                translateX = sign * (170 + (absOffset - 1) * 38);
                translateZ = -120 - (absOffset - 1) * 30;
                scale = 1.0;
                opacity = Math.max(0.3, 1 - absOffset * 0.15);
            }

            card.style.transform = `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`;
            card.style.opacity = opacity;
            card.style.zIndex = Math.round(100 - absOffset * 10);
        });

        // Snap player bar when close enough to integer — use debounce so
        // we don't spam /api/youtube while the user is still swiping
        const snappedIndex = Math.round(centerPos);
        if (Math.abs(currentOffset - snappedIndex) < 0.08 && snappedIndex !== lastSnappedIndex) {
            lastSnappedIndex = snappedIndex;
            clearTimeout(playerUpdateTimer);
            playerUpdateTimer = setTimeout(() => updatePlayerBar(snappedIndex), 300);
        }
    }

    async function updatePlayerBar(idx) {
        const index = idx !== undefined ? idx : Math.round(currentOffset);
        const track = globalTracks[index];
        if (!track) return;

        playerTitle.textContent = track.track_name;
        playerArtist.textContent = track.artist_name;
        playerArt.src = track.album_art;
        appBackground.style.backgroundImage = `url(${track.album_art})`;

        // Show subtle loading on art
        playerArt.style.opacity = '0.5';

        const openSpotifyBtn = document.getElementById('openSpotifyBtn');
        const noPreviewBtn = document.getElementById('noPreviewBtn');

        try {
            // Use the video_id we already know — fastest path
            const url = track.video_id
                ? `/api/youtube?videoId=${encodeURIComponent(track.video_id)}`
                : `/api/youtube?q=${encodeURIComponent(track.track_name + ' ' + track.artist_name)}`;

            const ytRes = await fetch(url);
            const ytData = await ytRes.json();
            playerArt.style.opacity = '1';

            if (ytData.audioUrl && !ytData.error) {
                audioPlayer.src = ytData.audioUrl;
                audioPlayer.load();
                if (isPlaying) audioPlayer.play().catch(() => { });

                if (openSpotifyBtn) {
                    openSpotifyBtn.style.display = 'flex';
                    openSpotifyBtn.title = 'Playing via YouTube';
                    openSpotifyBtn.querySelector('svg').setAttribute('fill', '#FF0000');
                }
                if (noPreviewBtn) noPreviewBtn.style.display = 'none';
            } else {
                throw new Error(ytData.error || 'No audio URL');
            }
        } catch (e) {
            console.warn('Could not load YouTube audio:', e.message);
            playerArt.style.opacity = '1';
            audioPlayer.src = '';
            if (isPlaying) { audioPlayer.pause(); isPlaying = false; setPlayState(false); }
            if (openSpotifyBtn) openSpotifyBtn.style.display = 'none';
            if (noPreviewBtn) noPreviewBtn.style.display = 'flex';
        }
    }


    function setPlayState(playing) {
        isPlaying = playing;
        const playIcon = document.getElementById('playIcon');
        const pauseIcon = document.getElementById('pauseIcon');
        if (playIcon) playIcon.style.display = playing ? 'none' : 'block';
        if (pauseIcon) pauseIcon.style.display = playing ? 'block' : 'none';
    }

    // Progress bar updater
    audioPlayer.addEventListener('timeupdate', () => {
        const fill = document.getElementById('progressFill');
        if (!fill || !audioPlayer.duration) return;
        const pct = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        fill.style.width = pct + '%';
    });

    audioPlayer.addEventListener('ended', () => {
        const next = Math.round(currentOffset) + 1;
        if (next < globalTracks.length) {
            targetOffset = next;
        } else {
            setPlayState(false);
        }
    });

    // Media Controls
    playPauseBtn.addEventListener('click', () => {
        if (!audioPlayer.src || audioPlayer.src === window.location.href) {
            // No track loaded — snap to current track and try
            updatePlayerBar(Math.round(currentOffset));
        }

        if (!isPlaying) {
            audioPlayer.play()
                .then(() => setPlayState(true))
                .catch(err => {
                    console.warn('Playback blocked:', err);
                    // No preview available for this track
                    setPlayState(false);
                });
        } else {
            audioPlayer.pause();
            setPlayState(false);
        }
    });

    prevBtn.addEventListener('click', () => {
        targetOffset = Math.max(0, Math.round(targetOffset) - 1);
    });

    nextBtn.addEventListener('click', () => {
        targetOffset = Math.min(globalTracks.length - 1, Math.round(targetOffset) + 1);
    });

    // DRAG: drag LEFT → content moves left → targetOffset increases (next track)
    function handleStart(x) {
        isDragging = true;
        dragStartX = x;
        dragStartOffset = currentOffset;
    }

    function handleMove(x) {
        if (!isDragging) return;
        const dx = x - dragStartX;
        // Drag right → dx positive → offset decreases (go prev)
        // Drag left  → dx negative → offset increases (go next) ✓
        const dragSensitivity = 180; // px per track
        targetOffset = dragStartOffset - (dx / dragSensitivity);
        // Clamp
        targetOffset = Math.max(0, Math.min(globalTracks.length - 1, targetOffset));
    }

    function handleEnd() {
        if (!isDragging) return;
        isDragging = false;
        // Snap to nearest integer track
        targetOffset = Math.max(0, Math.min(globalTracks.length - 1, Math.round(targetOffset)));
    }

    // Touch
    coverflow.addEventListener('touchstart', e => handleStart(e.touches[0].clientX), { passive: true });
    coverflow.addEventListener('touchmove', e => handleMove(e.touches[0].clientX), { passive: true });
    coverflow.addEventListener('touchend', handleEnd);

    // Mouse
    coverflow.addEventListener('mousedown', e => handleStart(e.clientX));
    window.addEventListener('mousemove', e => handleMove(e.clientX));
    window.addEventListener('mouseup', handleEnd);
});
