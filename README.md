# FileFlow AI 🚀

**FileFlow AI** is an intelligent email and document management system powered by advanced AI. It transforms how you interact with emails by providing smart summaries, action item extraction, personalized replies, intent detection, and seamless M-Pesa subscription payments—all wrapped in a premium mobile experience with Royal Violet & Slate theming.

---

## ✨ Key Features

### 🧠 AI Intelligence Suite
- **Multi-Model AI**: Google Gemini 2.5 Flash/Pro with Hugging Face fallback (Mistral/Phi-3)
- **Unified Email Analysis**: Single API call returns summary, smart replies, action items, and intent detection
- **Smart Summarization**: "Bottom Line Up Front" (BLUF) summaries with confidence scores
- **Action Item Extraction**: Auto-identifies to-dos with priority tagging (High/Medium/Low) and due dates
- **Personalized Smart Replies**: Context-aware, one-tap replies customized with your name
- **Intent Detection**: Automatically classifies emails as INVOICE, MEETING, CONTRACT, or INFO
- **Sentient Actions**: AI-powered contextual actions (e.g., "Pay Invoice", "Add to Calendar")
- **AI Feedback System**: Thumbs up/down on summaries, replies, and action items to improve models
- **Semantic Search**: Vector embeddings enable natural language queries
- **Document Chat (RAG)**: Ask questions about uploaded files using retrieval-augmented generation

### 💎 Pro Subscription Features
- **M-Pesa Integration**: Seamless STK Push payments (KES 10/month or KES 1,000/year)
- **Unlimited AI**: No daily limits on summaries, replies, or searches
- **Calendar Integration**: One-tap add action items to device calendar with smart reminders
- **Direct Email Send**: Send AI-generated replies instantly (not just drafts)
- **Advanced Analytics**: Email velocity, response time tracking, and completion rates
- **Premium Theme**: Exclusive Royal Violet & Slate color scheme
- **Priority Processing**: Faster AI responses with better models (Gemini Pro vs Flash)

### 🔗 Knowledge Engine
- **Document Linkage**: Automatically discovers related files and email threads by sender
- **Relationship Mapping**: Builds knowledge graph connecting emails, attachments, and conversations
- **Smart Navigation**: Tap any related item to instantly navigate to that file or thread

### 📱 Premium Mobile Experience
- **Royal Violet & Slate Theme**: Sophisticated purple gradient design with dark mode support
- **Glassmorphism Effects**: High-end frosted glass aesthetics with Expo Blur
- **Staggered Animations**: Smooth, cinematic transitions using React Native Reanimated
- **Skeleton Loading**: Premium shimmer loading states with gradient animations
- **Global Toast System**: Animated, non-intrusive notifications
- **Dynamic Theming**: Dark and Light modes with system preference support
- **Haptic Feedback**: Tactile responses for mobile interactions

---

## 🛠️ Technology Stack

### Backend
- **Core**: Node.js & Express
- **Database**: MongoDB (User profiles, subscriptions, transactions, AI cache)
- **AI Integration**: 
  - Google Gemini API (Flash & Pro models)
  - Hugging Face Inference API
  - Text embeddings for semantic search
- **Payment**: M-Pesa Daraja API (STK Push)
- **Architecture**: Clean MVC with service layer pattern
- **Caching**: MongoDB-based AI response caching with TTL

### Mobile
- **Framework**: React Native with Expo Router (file-based routing)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **UI Components**: Custom components with BlurView, LinearGradient
- **Icons**: Lucide React Native
- **Animations**: React Native Reanimated
- **State Management**: React Context + Hooks
- **Storage**: Expo SecureStore (tokens) & AsyncStorage (app data)
- **Authentication**: Google OAuth2 with Gmail & Drive API integration
- **Background Tasks**: Expo Background Fetch for email sync

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (local or Atlas)
- Expo Go app (on your mobile device)
- Google Cloud Project with Gmail & Drive APIs enabled
- Gemini API key
- M-Pesa Daraja API credentials (optional, for payments)

### 1. Backend Setup
```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory:
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/fileflow

# AI APIs
GEMINI_API_KEY=your_gemini_key_here
HUGGINGFACE_API_KEY=your_hf_key_here  # Optional

# Google OAuth (for Gmail/Drive integration)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# M-Pesa Daraja API (Optional)
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORTCODE=your_shortcode
MPESA_PASSKEY=your_passkey
MPESA_ENVIRONMENT=sandbox  # or production
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
EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:3001/api  # Use your local IP

# Google OAuth
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_client_id
EXPO_PUBLIC_GOOGLE_CLIENT_SECRET=your_client_secret
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
├── mobile/                     # Expo React Native App
│   ├── app/                    # Expo Router Pages
│   │   ├── (tabs)/             # Tab navigation
│   │   │   └── index.tsx       # Dashboard with KPIs
│   │   ├── email/[id].tsx      # Email detail with AI insights
│   │   ├── auth/               # Authentication screens
│   │   └── subscription.tsx    # Pro subscription page
│   ├── components/             # UI Components
│   │   ├── ThemeContext.tsx    # Dark/Light theme provider
│   │   ├── Toast.tsx           # Global toast notifications
│   │   ├── Skeleton.tsx        # Shimmer loading states
│   │   ├── PaywallModal.tsx    # Pro upgrade modal
│   │   ├── ProBadge.tsx        # Pro tier indicator
│   │   └── SmartHeader.tsx     # Intent-based action header
│   ├── services/               # Frontend Logic
│   │   ├── auth.ts             # Google OAuth & Gmail
│   │   ├── AIService.ts        # AI API integration
│   │   ├── SubscriptionService.ts  # Pro tier management
│   │   ├── PaymentService.ts   # M-Pesa integration
│   │   ├── LinkageService.ts   # Document relationships
│   │   └── background.ts       # Background email sync
│   └── utils/
│       └── storage.ts          # Secure & async storage
└── server/                     # Node.js Express Backend
    ├── controllers/            # Business Logic
    │   ├── aiController.js     # AI endpoints
    │   ├── paymentController.js # M-Pesa STK Push
    │   └── feedbackController.js # AI feedback collection
    ├── services/               # Service Layer
    │   ├── geminiService.js    # Google Gemini integration
    │   ├── huggingFaceService.js # HF fallback
    │   ├── aiService.js        # Unified AI service
    │   ├── mpesaService.js     # M-Pesa Daraja API
    │   ├── userService.js      # User management
    │   └── ragService.js       # Document chat (RAG)
    ├── models/                 # MongoDB Models
    │   ├── User.js             # User profiles & subscriptions
    │   ├── Transaction.js      # Payment transactions
    │   ├── EmailAnalysis.js    # AI analysis cache
    │   ├── AICache.js          # General AI cache
    │   └── AIFeedback.js       # User feedback
    ├── routes/                 # API Endpoints
    │   ├── aiRoutes.js
    │   ├── userRoutes.js
    │   └── paymentRoutes.js
    └── index.js                # Entry Point

```

---

## 🎯 API Endpoints

### AI Services
- `POST /api/ai/analyze-email` - Unified email analysis (summary, replies, todos, intent)
- `POST /api/ai/classify` - Classify file attachments
- `POST /api/ai/summary` - Generate email summaries (supports streaming)
- `POST /api/ai/replies` - Generate smart reply suggestions
- `POST /api/ai/todo` - Extract action items (supports streaming)
- `POST /api/ai/detect-intent` - Detect email intent (INVOICE/MEETING/CONTRACT/INFO)
- `POST /api/ai/search` - Semantic search with vector embeddings
- `POST /api/ai/chat` - Chat with documents (RAG)
- `POST /api/ai/recap` - Generate user activity recap
- `GET /api/ai/models` - Get available AI models

### User & Subscription
- `GET /api/user/status?email=user@example.com` - Get subscription status
- `POST /api/user/sync` - Sync user profile from Google

### Payments (M-Pesa)
- `POST /api/payments/stk-push` - Initiate M-Pesa payment
- `POST /api/payments/callback` - M-Pesa callback handler
- `GET /api/payments/status/:checkoutRequestId` - Check payment status

### Feedback
- `POST /api/feedback` - Submit AI feedback (thumbs up/down)

---

## 💳 Subscription Tiers

### Free Tier
- ✅ 5 AI summaries per day
- ✅ 1 smart reply per email
- ✅ Basic file categorization
- ✅ Manual Drive upload
- ❌ No calendar integration
- ❌ No direct send (drafts only)
- ❌ No semantic search

### Pro Tier (KES 10/month or KES 1,000/year)
- ✅ **Unlimited everything**
- ✅ Calendar integration
- ✅ Direct email sending
- ✅ Semantic search
- ✅ Document chat (RAG)
- ✅ Advanced intent detection
- ✅ Priority AI processing (Gemini Pro)
- ✅ Premium Royal Violet theme
- ✅ Advanced analytics

---

## 🎨 UI Highlights

### Royal Violet & Slate Theme
- Primary: `#7c3aed` (Royal Violet)
- Accent: `#6d28d9` (Deep Purple)
- Surface: Slate tones with glassmorphism
- Gradients: Linear purple gradients throughout

### Action Items
- Minimalist card design with priority badges
- Color-coded priorities (High: Red, Medium: Orange, Low: Blue)
- Due date highlighting with calendar integration
- Staggered slide-in animations

### Smart Replies
- Glassmorphic cards with blur effects
- Draft vs Send actions (Send is Pro-only)
- Inline feedback (thumbs up/down)
- Loading states with shimmer

### Intent Detection
- Smart header with contextual actions
- INVOICE: "Pay Now" button
- MEETING: "Add to Calendar" button
- CONTRACT: "Review & Sign" prompt
- End-to-end encryption badge

---

## 🔐 Security

- OAuth2 authentication with Google
- Secure token storage using Expo SecureStore
- Environment variables for sensitive data
- MongoDB for persistent user data
- M-Pesa callback IP whitelisting
- Transaction audit trails
- No credentials stored in code

---

## 🧪 Testing

### Sample Emails
Use the provided sample emails in `docs/sample_emails.md` to test:
- Invoice detection
- Meeting request parsing
- Contract identification
- Action item extraction
- Smart reply generation

### Payment Testing
- Use M-Pesa sandbox for testing
- Test phone: `254708374149`
- Test amounts: KES 10 (monthly), KES 1,000 (annual)

---

## 🚧 Future Enhancements

- ✅ ~~M-Pesa subscription payments~~ (Completed)
- ✅ ~~Intent detection with smart actions~~ (Completed)
- ✅ ~~Calendar integration~~ (Completed)
- 🔄 Email scheduling (Pro feature)
- 🔄 Bulk email processing
- 🔄 Custom AI preferences (tone, style)
- 🔄 AI-powered priority inbox
- 🔄 Slack/Teams integration
- 🔄 Multi-language support
- 🔄 Offline mode with local AI models
- 🔄 Team collaboration features

---

## 📝 License

Built with ❤️ for the future of intelligent email management.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

---

## 📧 Support

For issues or questions, please open a GitHub issue or contact the development team.
