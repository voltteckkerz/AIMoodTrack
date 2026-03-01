# AIMoodTrack 🎵

AIMoodTrack is a dynamic, mood-based music recommender web application. It analyzes your text input and typing speed (BPM proxy) to determine your current mood, then fetches and plays full, mood-matching tracks directly from YouTube within a smooth, 3D Cover Flow interface.

![AIMoodTrack Application](frontend/bg.png)

## 🌟 Key Features

- **Mood Analysis (NLP + BPM)**: Blends natural language sentiment (60%) with your typing speed / CPM (40%) to accurately detect your vibe (e.g., Happy, Melancholic, Chill, Energetic, Angry).
- **YouTube Audio Streaming**: Fetches top, popular songs matching your mood directly from YouTube. Plays **full audio tracks** in the browser, bypassing 30-second Spotify preview limitations.
- **3D Cover Flow Interface**: A sleek, physics-based, draggable 3D carousel UI inspired by classic iPods.
- **Dark Brutalist Theme**: Features a gritty, techno-brutalist aesthetic with a dark laundromat background, electric neon lime green accents, and frosted glass components.
- **Result Randomization**: Implements robust query pooling and array shuffling so every search yields a fresh set of songs.

## 🛠️ Technology Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript
- **Backend**: Node.js, Express.js
- **Key Modules**:
  - `sentiment`: For text-based NLP mood detection.
  - `yt-search`: To discover popular YouTube videos matching generated mood queries.
  - `@distube/ytdl-core`: To extract the raw, direct audio stream URL from YouTube videos.

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/voltteckkerz/AIMoodTrack.git
   cd AIMoodTrack
   ```

2. **Install Backend Dependencies**
   Navigate to the `backend` directory and install the required packages:
   ```bash
   cd backend
   npm install
   ```

3. **Start the Server**
   Start the Node.js Express server:
   ```bash
   node server.js
   ```

4. **Open the Application**
   The server also serves the static frontend files. Open your web browser and navigate to:
   ```
   http://localhost:3000
   ```

## 🎮 How to Use

1. **Type your mood**: Enter a sentence describing how you feel in the bottom input bar.
   - *Tip: The faster you type, the higher the detected BPM, which pushes the recommendations towards more energetic genres!*
2. **Hit Enter / Submit**: The app analyzes your input, hits the YouTube API, and loads 12 songs into the Cover Flow.
3. **Swipe & Select**: Drag left or right on the album art carousel to browse tracks. The active center track will automatically begin playing full audio from YouTube.

## 📝 License
This project is open-source and available under the [MIT License](LICENSE).
