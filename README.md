# FileFlow AI 🚀

**FileFlow AI** is an intelligent email and document management system powered by advanced AI. It transforms how you interact with emails by providing smart summaries, action item extraction, personalized replies, and a knowledge graph that connects related documents and conversations—all wrapped in a premium mobile experience.

---

## ✨ Key Features

### 🧠 AI Intelligence Suite
- **Multi-Model Fallback**: Seamless switching between **Google Gemini 2.5 Flash** and **Hugging Face (Mistral/Phi-3)** providers
- **Streaming AI Responses**: Real-time, word-by-word text generation for instant feedback
- **Smart Summarization**: "Bottom Line Up Front" (BLUF) summaries provide instant clarity on email intent
- **Action Item Extraction**: Automatically identifies and formats to-do lists from emails with priority tagging
- **Personalized Smart Replies**: Context-aware, one-tap replies customized with your name
- **Semantic Search**: Vector embeddings enable natural language queries like "Show me the mobile app budget"
- **AI Classification**: Automatically categorizes files into Finance, Legal, Work, or Personal

### 🔗 Knowledge Engine
- **Document Linkage**: Automatically discovers and suggests related files and email threads based on sender context
- **Relationship Mapping**: Connects emails, attachments, and conversations to build a knowledge graph
- **Smart Navigation**: Tap any related item to instantly navigate to that file or email thread

### 📱 Premium Mobile Experience
- **Minimalist Design**: Clean, flat UI with refined typography and optimal spacing
- **Glassmorphism Effects**: High-end frosted glass aesthetics with Expo Blur
- **Staggered Animations**: Smooth, cinematic transitions using React Native Reanimated
- **Skeleton Loading**: Premium loading states that transition seamlessly to content
- **Global Toast System**: Animated, non-intrusive notifications for user feedback
- **Dynamic Theming**: Sophisticated Dark and Light modes with system preference support

---

## 🛠️ Technology Stack

### Backend
- **Core**: Node.js & Express
- **AI Integration**: 
  - Google Gemini API (text-embedding-004 for semantic search)
  - Hugging Face Inference API
  - REST-based connectors (zero SDK overhead)
- **Architecture**: Clean MVC (Model-View-Controller) structure
- **Streaming**: Chunked transfer encoding for real-time AI responses

### Mobile
- **Framework**: React Native with Expo Router
- **UI Components**: Custom components with BlurView, LinearGradient
- **Icons**: Lucide React Native
- **Animations**: React Native Reanimated
- **State Management**: React Hooks
- **Storage**: Expo SecureStore & AsyncStorage
- **Authentication**: Google OAuth2 with Gmail API integration

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Expo Go app (on your mobile device)
- Google Cloud Project with Gmail API enabled
- Gemini API key (optional: Hugging Face API key)

### 1. Backend Setup
```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory:
```env
PORT=3000
GEMINI_API_KEY=your_gemini_key_here
HUGGINGFACE_API_KEY=your_hf_key_here  # Optional

# Google OAuth (for Gmail integration)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

Run the server:
```bash
npm start
```

### 2. Mobile Setup
```bash
cd mobile
npm install
```

Create a `.env` file in the `mobile/` directory:
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_key_here
EXPO_PUBLIC_HF_API_KEY=your_hf_key_here  # Optional

# Google OAuth
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_client_id
```

Run the app:
```bash
npx expo start
```

Scan the QR code with Expo Go to launch the app.

---

## 📁 Project Structure

```text
FileFlow-AI/
├── mobile/                 # Expo React Native App
│   ├── app/                # Expo Router Pages
│   │   ├── _layout.tsx     # Root layout with theme & toast providers
│   │   ├── index.tsx       # Home screen
│   │   └── email/[id].tsx  # Email detail with AI insights
│   ├── components/         # UI Components
│   │   ├── ThemeContext.tsx
│   │   ├── Toast.tsx
│   │   └── Skeleton.tsx
│   ├── services/           # Frontend Logic
│   │   ├── auth.ts         # Google OAuth & Gmail
│   │   ├── AIService.ts    # AI API integration
│   │   ├── LinkageService.ts  # Document relationships
│   │   └── SearchService.ts   # Semantic search
│   └── utils/
│       └── storage.ts      # Secure & async storage
└── server/                 # Node.js Express Backend
    ├── controllers/        # Business Logic
    │   └── aiController.js
    ├── services/           # AI Provider Integrations
    │   ├── geminiService.js
    │   ├── huggingFaceService.js
    │   └── aiService.js    # Unified AI service
    ├── routes/             # API Endpoints
    │   └── aiRoutes.js
    └── index.js            # Entry Point
```

---

## 🎯 API Endpoints

### AI Services
- `POST /api/ai/classify` - Classify file attachments
- `POST /api/ai/summary` - Generate email summaries (supports streaming)
- `POST /api/ai/replies` - Generate smart reply suggestions
- `POST /api/ai/todo` - Extract action items (supports streaming)
- `POST /api/ai/search` - Semantic search with vector embeddings
- `GET /api/ai/models` - Get available AI models

---

## 🎨 UI Highlights

### Action Items
- Minimalist card design with clean borders
- Priority tagging with color coding (`[High]` in red)
- Deadline highlighting in theme color
- Staggered slide-in animations

### Related Knowledge
- Horizontal scrollable cards
- Real-time Gmail integration
- Tap to navigate to related files/emails
- Smart filtering by sender

### AI Insights
- Streaming text generation
- Skeleton-to-content transitions
- Personalized with user's name
- Glassmorphism card effects

---

## 🔐 Security

- OAuth2 authentication with Google
- Secure token storage using Expo SecureStore
- Environment variables for sensitive data
- No credentials stored in code

---

## 🚧 Future Enhancements

- MongoDB Vector Search integration for production-scale semantic search
- Multi-language support
- Offline mode with local AI models
- Calendar integration for deadline tracking
- Team collaboration features

---

## 📝 License

Built with ❤️ for the future of intelligent email management.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.
