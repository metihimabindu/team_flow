import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('✅ Firebase Admin initialized');
    }
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Middleware to verify Firebase ID Token
  const verifyToken = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.user = { uid: decodedToken.uid, email: decodedToken.email };
      next();
    } catch (error) {
      console.error('Error verifying token:', error);
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  };

  // API Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // REST API Routes
  
  // Auth Signup
  app.post('/api/auth/signup', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: name
      });

      const userProfile = {
        name,
        email,
        role: 'member',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await admin.firestore().collection('users').doc(userRecord.uid).set(userProfile);

      res.status(201).json({ 
        uid: userRecord.uid, 
        name, 
        email, 
        role: 'member' 
      });
    } catch (error: any) {
      console.error('Signup error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Projects - Get all for user
  app.get('/api/projects', verifyToken, async (req: any, res) => {
    const uid = req.user.uid;
    try {
      const projectsSnapshot = await admin.firestore()
        .collection('projects')
        .where('members', 'array-contains', uid)
        .get();

      const projects = projectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      res.json({ projects });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create Project
  app.post('/api/projects', verifyToken, async (req: any, res) => {
    const uid = req.user.uid;
    const { name, description, color } = req.body;
    
    if (!name) return res.status(400).json({ error: 'Project name is required' });

    try {
      const projectData = {
        name,
        description: description || '',
        color: color || 'bg-indigo-500',
        adminId: uid,
        members: [uid],
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const docRef = await admin.firestore().collection('projects').add(projectData);
      res.status(201).json({ project: { id: docRef.id, ...projectData } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get Tasks for Project
  app.get('/api/projects/:projectId/tasks', verifyToken, async (req: any, res) => {
    const { projectId } = req.params;
    const uid = req.user.uid;

    try {
      const projectDoc = await admin.firestore().collection('projects').doc(projectId).get();
      if (!projectDoc.exists) return res.status(404).json({ error: 'Project not found' });
      
      const project = projectDoc.data();
      if (!project?.members.includes(uid)) {
        return res.status(403).json({ error: 'Access denied: You are not a member of this project' });
      }

      const tasksSnapshot = await admin.firestore()
        .collection('projects')
        .doc(projectId)
        .collection('tasks')
        .get();

      const tasks = tasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      res.json({ tasks });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create Task
  app.post('/api/projects/:projectId/tasks', verifyToken, async (req: any, res) => {
    const { projectId } = req.params;
    const uid = req.user.uid;
    const { title, description, priority, assignedTo, dueDate, status } = req.body;

    if (!title) return res.status(400).json({ error: 'Task title is required' });

    try {
      const projectDoc = await admin.firestore().collection('projects').doc(projectId).get();
      if (!projectDoc.exists) return res.status(404).json({ error: 'Project not found' });
      
      const project = projectDoc.data();
      if (!project?.members.includes(uid)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const taskData = {
        title,
        description: description || '',
        priority: priority || 'medium',
        assignedTo: assignedTo || null,
        dueDate: dueDate ? admin.firestore.Timestamp.fromDate(new Date(dueDate)) : null,
        status: status || 'todo',
        projectId,
        creatorId: uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const taskRef = await admin.firestore()
        .collection('projects')
        .doc(projectId)
        .collection('tasks')
        .add(taskData);

      res.status(201).json({ task: { id: taskRef.id, ...taskData } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update Task
  app.patch('/api/projects/:projectId/tasks/:taskId', verifyToken, async (req: any, res) => {
    const { projectId, taskId } = req.params;
    const uid = req.user.uid;
    const updates = req.body;

    try {
      const projectDoc = await admin.firestore().collection('projects').doc(projectId).get();
      if (!projectDoc.exists) return res.status(404).json({ error: 'Project not found' });
      
      const project = projectDoc.data();
      if (!project?.members.includes(uid)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const taskRef = admin.firestore()
        .collection('projects')
        .doc(projectId)
        .collection('tasks')
        .doc(taskId);

      const taskDoc = await taskRef.get();
      if (!taskDoc.exists) return res.status(404).json({ error: 'Task not found' });

      await taskRef.update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      const updatedTask = (await taskRef.get()).data();
      res.json({ task: { id: taskId, ...updatedTask } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Remove Member
  app.delete('/api/projects/:projectId/members/:memberId', verifyToken, async (req: any, res) => {
    const { projectId, memberId } = req.params;
    const uid = req.user.uid;

    try {
      const projectRef = admin.firestore().collection('projects').doc(projectId);
      const projectDoc = await projectRef.get();
      
      if (!projectDoc.exists) return res.status(404).json({ error: 'Project not found' });
      
      const project = projectDoc.data();
      if (project?.adminId !== uid) {
        return res.status(403).json({ error: 'Access denied: Only project admin can remove members' });
      }

      if (memberId === uid) {
        return res.status(400).json({ error: 'Admin cannot remove themselves' });
      }

      await projectRef.update({
        members: admin.firestore.FieldValue.arrayRemove(memberId)
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Development fallback for SPA
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 TeamFlow Pro server running at http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
