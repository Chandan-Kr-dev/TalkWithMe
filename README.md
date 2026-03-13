# TalkWithMe 💬

TalkWithMe is a full-stack real-time chat app built with Next.js, Socket.IO, MongoDB, and TypeScript. It supports private and group conversations, encrypted message storage, OTP-based email verification, password recovery, media sharing, delivery/read states, and responsive light/dark UI.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4-white?logo=socket.io&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)

---

## ✨ Highlights

### 🔐 Authentication & Account Security
- Register with name, unique username, email, password, and optional avatar upload
- OTP email verification for new accounts, including resend support
- Login flow that detects unverified accounts and routes users back to verification
- Forgot-password flow with email OTP and secure password reset
- In-app change-password screen from settings
- JWT-based auth with bcrypt password hashing

### 💬 Real-Time Chat
- One-to-one and group conversations
- Socket.IO-powered real-time message delivery
- Typing indicators for active conversations
- Delivery and read states with live updates
- Real-time online/offline presence
- Direct messaging lock until both users are connected as friends
- Toast notifications for messages received outside the active chat
- Message deletion support for your own sent messages

### 📎 Media & File Sharing
- Upload chat attachments through Cloudinary
- Supported chat file categories: images, videos, and documents
- Supported formats include JPEG, PNG, WebP, GIF, MP4, WebM, MOV, PDF, Word, Excel, PowerPoint, TXT, ZIP, and RAR
- Inline image previews with full-screen lightbox
- Inline video playback and downloadable documents
- Avatar uploads with validation and image optimization

### 👥 Social & Group Features
- Search users by username and manage relationship state
- Friend request flow (send, accept, decline, cancel)
- Direct chat creation restricted to accepted friendships
- Create group chats with selected members
- Group creation restricted to users in your friends list
- Group admin controls to add or remove members
- Group info modal with member management
- Friend profile modal with avatar, email, about text, and presence state
- “Delete & Remove” action for one-to-one chats that removes both friendship and pending requests

### 🎨 UX Enhancements
- Fully responsive auth and chat experience
- Mobile sidebar/chat navigation
- Persisted light and dark theme toggle
- Modern modal-based settings, profile, and group management flows
- Emoji picker integrated into the chat composer

### 🛡️ Data Protection
- AES-256-GCM encryption for message content at rest
- MongoDB persistence through Mongoose models
- Secure SMTP-based OTP delivery via Nodemailer

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, Zustand, React Hot Toast |
| Backend | Next.js App Router API routes, custom Node HTTP server |
| Real-time | Socket.IO server + client |
| Database | MongoDB Atlas, Mongoose |
| Auth | JWT, bcryptjs, Nodemailer |
| Storage | Cloudinary |
| Security | Node.js crypto with AES-256-GCM |
| Language | TypeScript |

---

## 🧩 Current Feature Set

- Email verification flow with OTP entry screen and resend action
- Forgot password and reset password flow on the auth page
- Settings modal with theme switching and password change
- Chat sidebar with username search, friend request inbox, notifications, unread indicators, and logout
- Chat window with message composer, emoji picker, file uploads, and read receipts
- Friend-gated direct chat messaging with UI lock/banner until request acceptance
- Delete your own messages and remove a direct contact from chat actions
- Friend and group detail modals for richer conversation context
- Encrypted message storage with real-time delivery updates

---

## 📁 Project Structure

```text
talkwithme/
├── app/
│   ├── page.tsx                         # Auth page: login, register, verify OTP, forgot/reset password
│   ├── chat/page.tsx                    # Main chat shell and socket setup
│   ├── layout.tsx                       # App layout + theme provider
│   ├── globals.css                      # Global styling
│   └── api/
│       ├── auth/
│       │   ├── change-password/route.ts
│       │   ├── forgot-password/route.ts
│       │   ├── login/route.ts
│       │   ├── register/route.ts
│       │   ├── reset-password/route.ts
│       │   └── verify-email/route.ts
│       ├── chat/
│       │   ├── route.ts
│       │   └── group/
│       │       ├── route.ts
│       │       ├── add/route.ts
│       │       └── remove/route.ts
│       ├── friends/route.ts
│       ├── message/
│       │   ├── route.ts
│       │   └── read/route.ts
│       ├── notification/route.ts
│       ├── upload/route.ts
│       └── user/route.ts
├── components/
│   ├── ChatWindow.tsx                   # Chat UI, attachments, emoji picker, lightbox, read states
│   ├── FriendProfileModal.tsx           # Friend profile details modal
│   ├── GroupChatModal.tsx               # Create group modal
│   ├── GroupInfoModal.tsx               # Group info and member management
│   ├── ProfileModal.tsx                 # Edit current user profile
│   ├── SettingsModal.tsx                # Theme + password settings
│   ├── Sidebar.tsx                      # Chat list, search, notifications, settings entry
│   ├── ThemeProvider.tsx                # Applies persisted theme to the app
│   └── WelcomeScreen.tsx                # Empty-state view
├── lib/
│   ├── auth.ts                          # JWT helpers
│   ├── cloudinary.ts                    # Cloudinary configuration
│   ├── db.ts                            # MongoDB connection helper
│   ├── encryption.ts                    # Encrypt/decrypt message content
│   ├── getAuthUser.ts                   # Authenticated user resolver for API routes
│   ├── mailer.ts                        # Verification and reset OTP emails
│   ├── socket.ts                        # Socket.IO server initialization
│   └── socketClient.ts                  # Shared client socket instance
├── models/
│   ├── Chat.ts
│   ├── Message.ts
│   ├── Notification.ts
│   └── User.ts
├── public/
│   └── avatars/
├── store/
│   └── chatStore.ts                     # Zustand state, user session, theme, chat data
├── server.ts                            # Custom Next.js + Socket.IO server
├── socket-server.ts                     # Alternate Socket.IO server entry
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm
- MongoDB Atlas account or local MongoDB instance
- Cloudinary account
- SMTP provider credentials for OTP emails

### 1. Clone the repository

```bash
git clone https://github.com/your-username/talkwithme.git
cd talkwithme
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root:

```env
# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/<dbname>

# Auth
JWT_SECRET=your_jwt_secret

# SMTP (OTP verification + password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Message encryption key
# Generate with:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
MESSAGE_ENCRYPTION_KEY=your_64_char_hex_key

# Optional
PORT=3000
```

> Important: keep `MESSAGE_ENCRYPTION_KEY` safe. If it changes, previously encrypted messages cannot be decrypted.

### 4. Run in development

```bash
npm run dev
```

This starts the custom server in `server.ts`, which boots both Next.js and Socket.IO together.

Open http://localhost:3000 in your browser.

### 5. Build and run in production

```bash
npm run build
npm start
```

---

## 📜 Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the custom Next.js + Socket.IO development server |
| `npm run dev:next` | Start plain Next.js dev mode without the custom server |
| `npm run build` | Build the Next.js app for production |
| `npm start` | Start the production custom server |
| `npm run socket-server` | Run the alternate Socket.IO server entry manually |
| `npm run lint` | Run ESLint |

---

## 🔄 Core Flows

### New account flow
1. Register with name, username, email, password, and optional avatar
2. Receive a 6-digit verification code by email
3. Verify the code on the auth page
4. Log in and enter the chat workspace

### Friend connection flow
1. Search a user by username
2. Send a friend request
3. Receiver accepts (or declines) in notifications
4. Once accepted, both users can start/directly continue one-to-one messaging

### Password recovery flow
1. Click “Forgot Password?”
2. Request a reset code by email
3. Enter the OTP and a new password
4. Return to login with the updated password

### Messaging flow
1. Open an existing chat (or start one after friendship is accepted)
2. Send text, emoji, image, video, or document messages
3. Receive live delivery/read state updates through Socket.IO
4. Delete your own message if needed
5. Get notifications for messages outside the active conversation

---

## 📌 Notes

- `npm run dev` is the recommended local command because the chat experience depends on the custom Socket.IO server.
- File validation happens on both the client and server for safer uploads.
- The app stores theme preference and user session in Zustand persistence.
- For one-to-one chats, both users must be friends to exchange messages.

---

## 📄 License

This project is intended for personal and educational use.
