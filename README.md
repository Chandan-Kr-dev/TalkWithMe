# TalkWithMe 💬

A full-stack real-time chat application built with **Next.js**, **Socket.IO**, and **MongoDB**. Features one-on-one and group chats, file sharing, end-to-end message encryption, and more.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4-white?logo=socket.io&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)

---

## ✨ Features

### 💬 Messaging
- **Real-time messaging** with Socket.IO — instant delivery, no polling
- **One-on-one chats** and **group chats** with admin controls
- **Typing indicators** — see when someone is typing
- **Emoji picker** — built-in emoji support
- **Read receipts** — track who has read your messages

### 📎 File Sharing
- Send **photos**, **videos**, and **documents** in chat
- Supported formats: JPEG, PNG, WebP, GIF, MP4, WebM, MOV, PDF, Word, Excel, PowerPoint, TXT, ZIP, RAR
- **Image lightbox** — click images to view full-screen with download option
- **Inline video player** — videos play directly in chat
- **Document downloads** — one-click download for files
- Files stored on **Cloudinary** (25 GB free tier)

### 🔐 Security
- **AES-256-GCM message encryption** — messages are encrypted at rest in MongoDB; a DBA cannot read them
- **JWT authentication** with secure token handling
- **Password hashing** with bcrypt
- **Email verification** via OTP on registration

### 👤 User Profiles
- Customizable **avatar** (uploaded to Cloudinary), **name**, and **about** status
- **Online/offline** presence indicators
- **User search** to find and start conversations

### 👥 Group Chats
- Create groups with custom name and avatar
- **Add/remove members** (admin only)
- Group info modal with member list

### 🔔 Notifications
- Real-time **in-app notifications** for new messages
- Toast alerts for messages received outside the active chat

### 📱 Responsive Design
- Fully responsive — works on **desktop**, **tablet**, and **mobile**
- Mobile-first sidebar/chat toggle layout

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4, Zustand |
| **Backend** | Next.js API Routes, Custom HTTP server |
| **Real-time** | Socket.IO (server + client) |
| **Database** | MongoDB Atlas + Mongoose |
| **File Storage** | Cloudinary |
| **Auth** | JWT (jsonwebtoken) + bcrypt + Nodemailer OTP |
| **Encryption** | AES-256-GCM (Node.js crypto) |
| **Language** | TypeScript |

---

## 📁 Project Structure

```
talkwithme/
├── app/
│   ├── page.tsx                  # Auth page (login/register)
│   ├── chat/page.tsx             # Main chat page
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Global styles
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts
│       │   ├── register/route.ts
│       │   └── verify-email/route.ts
│       ├── chat/
│       │   ├── route.ts          # Fetch/create chats
│       │   └── group/            # Group chat CRUD
│       ├── message/route.ts      # Send/fetch messages
│       ├── notification/route.ts # Notification management
│       ├── upload/route.ts       # File upload (Cloudinary)
│       └── user/route.ts         # User search & profile update
├── components/
│   ├── ChatWindow.tsx            # Chat messages, file sharing, lightbox
│   ├── Sidebar.tsx               # Chat list, search, notifications
│   ├── GroupChatModal.tsx         # Create group modal
│   ├── GroupInfoModal.tsx         # Group details & member management
│   ├── ProfileModal.tsx          # Edit profile modal
│   └── WelcomeScreen.tsx         # Shown when no chat is selected
├── lib/
│   ├── auth.ts                   # JWT helpers
│   ├── cloudinary.ts             # Cloudinary config
│   ├── db.ts                     # MongoDB connection
│   ├── encryption.ts             # AES-256-GCM encrypt/decrypt
│   ├── getAuthUser.ts            # Auth middleware
│   ├── mailer.ts                 # Nodemailer OTP emails
│   ├── socket.ts                 # Socket.IO server
│   └── socketClient.ts           # Socket.IO client
├── models/
│   ├── Chat.ts
│   ├── Message.ts
│   ├── Notification.ts
│   └── User.ts
├── store/
│   └── chatStore.ts              # Zustand state management
├── server.ts                     # Custom HTTP server with Socket.IO
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and **npm**
- **MongoDB Atlas** account (or local MongoDB)
- **Cloudinary** account ([free tier](https://cloudinary.com/))
- **Gmail** (or any SMTP provider) for email verification

### 1. Clone the repository

```bash
git clone https://github.com/your-username/talkwithme.git
cd talkwithme
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the root directory:

```env
# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/<dbname>

# Auth
JWT_SECRET=your_jwt_secret

# SMTP (for email OTP verification)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Message encryption key (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
MESSAGE_ENCRYPTION_KEY=your_64_char_hex_key
```

> ⚠️ **Important:** Never lose the `MESSAGE_ENCRYPTION_KEY` — without it, encrypted messages become permanently unreadable.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for production

```bash
npm run build
npm start
```

---

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server (Next.js + Socket.IO) |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

---

## 📄 License

This project is for personal/educational use.
