# Blood on Mahjong

A real-time multiplayer Sichuan Mahjong (血战到底) web application with WebSocket-based gameplay, lightweight user-ID sessions, and Kubernetes deployment.

---

## Demo

![Waiting Room](screenshots/waiting-room.png)
![Game Room](screenshots/game.png)
![Results](screenshots/result.png)

---

## Features

- **Real-Time Multiplayer** — WebSocket (Socket.IO) with Redis adapter for horizontal scaling across multiple server instances
- **Sichuan Mahjong Rules** — Full implementation of 血战到底 (Blood Fight) variant including Kong scoring, missing-suit declaration, and multi-winner support
- **Authentication** — Enter a user ID to create or resume a local identity with a seven-day server session
- **Game State Persistence** — MongoDB-backed game state with automatic hydration on server restart
- **Match History** — Persistent game records with player scores, win/loss tracking, and round details
- **Room Management** — Create, join, and spectate game rooms with real-time player count updates
- **Automated Testing** — Playwright E2E tests integrated into CI/CD pipeline
- **Container-Native Deployment** — Docker multi-stage builds, Helm charts, and Kubernetes manifests via Werf

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | Vue 3, Nuxt 4, Nuxt UI, TypeScript |
| **Backend** | Nuxt Server (Nitro), Socket.IO, Node.js |
| **Database** | MongoDB Atlas |
| **Cache / Pub-Sub** | Redis (Socket.IO adapter) |
| **Auth** | User ID login, server-side session cookies |
| **Infrastructure** | Docker, Kubernetes, Helm, Werf |
| **CI/CD** | GitHub Actions, Playwright |

---

## Installation

### Prerequisites

- Node.js 20+
- MongoDB instance (local or Atlas)
- Redis (optional, for multi-instance scaling)

### Setup

```bash
# Clone the repository
git clone https://github.com/Justin6Liu/blood-on-mahjong.git
cd blood-on-mahjong

# Install dependencies
npm install
```

Create `.env` with your credentials:

```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=blood_on_mahjong
REDIS_URL=redis://localhost:6379
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_MODEL=deepseek-chat
# Only for temporary HTTP deployments without TLS; omit this when using HTTPS.
COOKIE_SECURE=false
```

Optional AI tuning:

```env
DEEPSEEK_BASE_URL=https://api.deepseek.com/chat/completions
DEEPSEEK_TIMEOUT_MS=12000
AI_ACTION_DELAY_MS=900
```

The room owner can add DeepSeek AI players while a room is waiting. Human and
AI players together must fill all four seats before the game can start. The API
key is read only by the server and must never be exposed through client-side
runtime configuration. If DeepSeek is unavailable, AI players use a small local
fallback policy so the round does not become stuck.

Open the login page and enter a 2–32 character ID containing letters, numbers,
underscores, or hyphens. New IDs are created automatically. This intentionally
has no password, so anyone who knows an ID can use the same identity.

---

## Usage

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm run start
```

### Run Tests

```bash
# E2E tests with Playwright
npm test

# With custom base URL
BASE_URL=http://localhost:3000 npm test
```

---

## Project Structure

```
blood-on-mahjong/
├── app/                    # Frontend (Nuxt)
│   ├── components/         # Vue components (MahjongTile, PlayerArea, etc.)
│   ├── composables/        # Composition API hooks (useGame)
│   ├── pages/              # Route pages (login, gameroom, history)
│   └── middleware/         # Auth guards
├── server/                 # Backend (Nitro)
│   ├── api/                # REST endpoints (auth, game, rooms, history)
│   ├── services/           # Business logic (AuthService, GameService)
│   ├── utils/              # Core utilities (gameManager, socket, tiles)
│   └── types/              # TypeScript definitions
├── tests/                  # Playwright E2E tests
├── .github/workflows/      # CI/CD pipeline
├── .helm/                  # Kubernetes Helm charts
├── Dockerfile              # Multi-stage container build
└── werf.yaml               # Werf deployment config
```

---

## License

MIT
