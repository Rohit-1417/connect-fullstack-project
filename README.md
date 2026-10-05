# CONNECT — Full Stack User Connection & AI Document Platform

CONNECT is a full-stack web application developed as part of a software development internship assignment.

The platform allows users to register and securely log in, purchase subscription plans, manage wallet credits, connect with other users, make video calls, upload PDF documents, and ask questions about their documents using Google Gemini AI.

The application also provides an Admin Dashboard for monitoring users, subscriptions, wallet balances, documents, connections, video calls, and AI usage.

## Features

### User Features
- User registration
- Email OTP verification
- Secure JWT login
- Forgot password and password reset using OTP
- Bcrypt password hashing
- User profile
- Subscription plans
- Wallet and credit management
- Wallet transaction history
- Browse users and send connection requests
- Accept/reject connection requests
- Accepted connections
- WebRTC video calling
- WebSocket real-time signaling
- Call history with duration
- PDF document upload
- Personal document listing
- AI questions about uploaded PDFs
- Google Gemini AI answers
- Retrieval-Augmented Generation (RAG)
- AI question and answer history

### Admin Features
- View all users
- Monitor subscriptions
- Monitor wallet balances
- View uploaded documents
- View connections
- View video call history
- Monitor AI usage
- Admin-only protected APIs

## Technology Stack

### Frontend
- HTML5
- CSS3
- JavaScript
- Fetch API
- WebRTC

### Backend
- Python
- FastAPI
- SQLAlchemy
- JWT Authentication
- Passlib / bcrypt
- WebSockets

### Database
- MySQL
- PyMySQL

### AI / RAG
- Google Gemini
- Google Gemini Embeddings
- PyMuPDF
- FAISS

### Development & Testing
- Visual Studio Code
- MySQL Workbench
- Postman
- Live Server
- Git / GitHub

## System Architecture

```text
Frontend (HTML/CSS/JS)
        |
        | HTTP / WebSocket
        v
FastAPI Backend
   |       |       |
   v       v       v
 MySQL   Gemini   WebRTC
 Database   |    WebSocket
            v
         PDF + RAG
           FAISS
```

## Project Structure

```text
fullstack_project/

├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── auth.py
│   │   ├── otp.py
│   │   ├── email_service.py
│   │   │
│   │   ├── database/
│   │   │   ├── __init__.py
│   │   │   ├── database.py
│   │   │   └── models.py
│   │   │
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── document.py
│   │   │   ├── connection.py
│   │   │   └── subscription.py
│   │   │
│   │   └── routers/
│   │       ├── __init__.py
│   │       ├── auth_routes.py
│   │       ├── subscription_routes.py
│   │       ├── wallet_routes.py
│   │       ├── connection_routes.py
│   │       ├── document_routes.py
│   │       ├── call_routes.py
│   │       └── admin_routes.py
│   │
│   ├── uploads/
│   │   ├── documents/
│   │   └── vectorstores/
│   │
│   ├── create_admin.py
│   ├── .env
│   └── venv/
│
├── frontend/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── verify-otp.html
│   ├── dashboard.html
│   ├── users.html
│   ├── connections.html
│   ├── subscription.html
│   ├── wallet.html
│   ├── documents.html
│   ├── video-call.html
│   ├── admin.html
│   │
│   ├── css/
│   └── js/
│
├── README.md
├── .env.example
└── .gitignore
```

## Database Design

Main database tables:

- **Users** — registered users and administrators
- **Subscriptions** — user subscription plans and credits
- **Wallets** — current wallet balance
- **Wallet Transactions** — wallet credit history
- **Connections** — connection requests and accepted connections
- **Documents** — uploaded PDF information
- **AI Questions** — document questions and AI answers
- **Calls** — video call participants, times and duration

## Authentication

The application uses JWT-based authentication.

### Registration Flow

```text
Registration
     ↓
OTP Generated
     ↓
OTP Sent to Email
     ↓
OTP Verification
     ↓
Account Verified
     ↓
Login
```

Passwords are securely hashed using bcrypt and are never stored as plain text.

### Login Flow

```text
Email + Password
       ↓
Backend Validation
       ↓
Password Verification
       ↓
JWT Access Token
       ↓
Authenticated Requests
```

The application supports two roles:

- User
- Admin

Admin accounts are created separately and are not exposed through public registration.

## Subscription and Wallet

Example subscription plans:

| Plan | Amount | Credits |
|------|--------|---------|
| Basic | ₹199 | 500 |
| Premium | ₹499 | 1500 |

Selecting a subscription:
1. Creates the subscription.
2. Adds credits to the wallet.
3. Creates a wallet transaction.
4. Updates the active subscription.

The payment system is implemented as a mock payment flow for the assignment.

## Connections

```text
User A
  ↓
Send Request
  ↓
User B
  ↓
Accept / Reject
  ↓
Accepted Connection
```

The backend prevents self-connections and duplicate connections.

Only accepted connections can be used for video calls.

## Video Calling

The application uses WebRTC for peer-to-peer video communication and WebSocket for signaling.

The signaling layer exchanges:
- WebRTC offers
- WebRTC answers
- ICE candidates
- Call events

Call flow:

```text
Start Call
    ↓
Create Call Record
    ↓
WebSocket Signaling
    ↓
Incoming Call
    ↓
Accept
    ↓
WebRTC Offer / Answer
    ↓
ICE Candidate Exchange
    ↓
Peer-to-Peer Call
    ↓
End Call
    ↓
Duration Saved
```

Call history stores caller, receiver, start time, end time and duration.

A public STUN server is used for development/testing.

## PDF + AI / RAG

The document feature uses Retrieval-Augmented Generation.

```text
PDF Upload
     ↓
Extract Text
     ↓
Split into Chunks
     ↓
Generate Embeddings
     ↓
Store Vectors in FAISS
     ↓
User Question
     ↓
Similarity Search
     ↓
Relevant Chunks
     ↓
Gemini Answer
     ↓
Save Q&A History
```

Technologies:
- PyMuPDF for PDF extraction
- Google Gemini Embeddings
- FAISS for similarity search
- Google Gemini for answer generation
- MySQL for Q&A history

Each document has its own vector store, and users can access only their own documents.

The Gemini API key is stored only in the backend environment and is never exposed to the frontend.

## Admin Dashboard

The Admin Dashboard provides monitoring for:
- Users
- Subscriptions
- Wallet balances
- Uploaded documents
- Connections
- Call history
- AI usage

All admin APIs require an authenticated admin account.

## API Endpoints

### Authentication

```text
POST /api/registration
POST /api/verify-otp
POST /api/login
GET  /api/profile
POST /api/forget-password
POST /api/forget-password/verify-otp
POST /api/reset-password
```

### Subscriptions

```text
GET  /api/subscriptions
GET  /api/subscription
POST /api/subscribe
```

### Wallet

```text
GET /api/wallet
GET /api/wallet/transactions
```

### Users and Connections

```text
GET  /api/users
POST /api/connect
GET  /api/connections/requests
POST /api/connections/{connection_id}/accept
POST /api/connections/{connection_id}/reject
GET  /api/connections
```

### Documents and AI

```text
POST /api/documents
GET  /api/documents
POST /api/documents/{document_id}/ask
GET  /api/documents/{document_id}/questions
```

### Video Calls

```text
POST /api/calls
POST /api/calls/{call_id}/end
GET  /api/calls/history
```

### Admin

```text
GET /api/admin/users
GET /api/admin/users/{user_id}
GET /api/admin/subscriptions
GET /api/admin/wallets
GET /api/admin/documents
GET /api/admin/connections
GET /api/admin/calls
GET /api/admin/usage
```

## Installation

### 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd fullstack_project
```

### 2. Create and activate virtual environment

Windows:

```bash
cd backend
python -m venv venv
venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install fastapi uvicorn sqlalchemy pymysql python-dotenv passlib[bcrypt] python-jose
pip install email-validator
pip install pymupdf
pip install python-multipart
pip install google-genai
pip install faiss-cpu
```

## Environment Variables

Create `backend/.env`:

```env
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_HOST=localhost
DB_PORT=3306
DB_NAME=fullstack_project

SECRET_KEY=your_secret_key

EMAIL_ADDRESS=your_email
EMAIL_PASSWORD=your_email_app_password

GEMINI_API_KEY=your_gemini_api_key
```

Never commit the real `.env` file to GitHub.

## Database Setup

Create the MySQL database:

```sql
CREATE DATABASE fullstack_project;
```

Make sure MySQL Server is running.

The application automatically creates the required tables through SQLAlchemy when the backend starts.

## Create Admin Account

From the backend directory:

```bash
python create_admin.py
```

The script asks for the admin name, email and password.

The account is created with the `admin` role and verified status.

## Running the Backend

From `backend`:

```bash
uvicorn app.main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

Swagger documentation:

```text
http://127.0.0.1:8000/docs
```

## Running the Frontend

The frontend uses plain HTML, CSS and JavaScript.

Run it with VS Code Live Server.

Recommended address:

```text
http://127.0.0.1:5500
```

Open `index.html` using Live Server.

## API Testing

Postman can be used to test the backend APIs.

Typical flow:

```text
Register
   ↓
Verify OTP
   ↓
Login
   ↓
Get JWT token
   ↓
Use Bearer Token
   ↓
Test protected APIs
```

FastAPI Swagger can also be used for API testing.

## Security Measures

- Bcrypt password hashing
- JWT authentication
- Protected API routes
- Role-based authorization
- Admin-only endpoints
- OTP email verification
- Password reset tokens
- Token type validation
- Document ownership validation
- Accepted-connection validation for calls
- Authenticated WebSocket signaling
- Gemini API key stored in environment variables
- Database credentials stored in environment variables
- Sensitive files excluded from Git


## Author

Developed as part of a Full Stack Software Development Internship Assignment.

**Project:** CONNECT  
**Backend:** FastAPI  
**Frontend:** HTML, CSS, JavaScript  
**Database:** MySQL  
**AI:** Google Gemini  
**RAG:** FAISS  
**Video:** WebRTC + WebSocket
