# TeamFlow Pro — Team Task Management

A full-stack collaborative task management web application built with 
React, Express, and Firebase. Users can create projects, assign tasks, 
track progress, and manage teams with role-based access control.

## Features
- Email/password signup and login (plus Google OAuth)
- Create and manage projects (creator becomes Admin)
- Admin can add and remove members from projects
- Create tasks with title, description, due date, and priority
- Assign tasks to team members
- Drag-and-drop Kanban board (To Do / In Progress / Done)
- Dashboard with real-time stats, overdue count, and workload per user
- Role-based access: Admin manages everything, Members update own tasks
- Reports page with CSV and JSON export
- RESTful API backend with Firebase Admin SDK and JWT verification

## Tech Stack
- Frontend: React 19, Vite, TypeScript, Tailwind CSS 4, React Router 7, 
  Recharts, Framer Motion
- Backend: Node.js, Express.js, Firebase Admin SDK
- Database & Auth: Firebase Firestore, Firebase Authentication
- Deployment: Railway

## Project Structure
- `/src`: Frontend React application
- `/server.ts`: Express.js backend server
- `/public`: Static assets

## Prerequisites
- Node.js 20+
- Firebase Project with Firestore and Auth enabled
- Firebase Admin SDK Service Account JSON

## Environment Variables
Create a `.env` file with these keys (Railway will prompt for them):
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
FIREBASE_SERVICE_ACCOUNT_JSON=pasted_json_here
```

## Get this from: Firebase Console → Project Settings → Service Accounts → Generate New Private Key

## Local Development
```bash
npm install
npm run dev
```
App runs at http://localhost:3000

## Production Build
```bash
npm run build
npm start
```

## Deploy to Railway (Step by Step)
1. Push your code to a GitHub repository
2. Go to https://railway.app and create a new project
3. Click "Deploy from GitHub repo" and select your repository
4. Go to the service → Variables tab
5. Add environment variable:
   - Key: FIREBASE_SERVICE_ACCOUNT_JSON
   - Value: paste the full JSON from your Firebase service account key file
6. Railway will automatically run `npm run build` then `npm start`
7. Click "Generate Domain" to get your public URL

## API Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/signup | None | Create account |
| GET | /api/projects | Bearer token | Get user's projects |
| POST | /api/projects | Bearer token | Create project |
| GET | /api/projects/:id/tasks | Bearer token | Get project tasks |
| POST | /api/projects/:id/tasks | Bearer token | Create task |
| PATCH | /api/projects/:id/tasks/:taskId | Bearer token | Update task |
| DELETE | /api/projects/:id/members/:memberId | Bearer token | Remove member (admin only) |

## Roles
- Admin: Created when a user creates a project. Can manage tasks, 
  add/remove members, and see all project data.
- Member: Added by admin. Can view assigned projects and update 
  status of their own assigned tasks.
