export type Priority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type UserRole = 'admin' | 'member';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title?: string;
  avatar?: string;
  status?: 'online' | 'offline';
  createdAt: any;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  adminId: string;
  members: string[];
  color?: string;
  createdAt: any;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  assignedTo?: string;
  priority: Priority;
  status: TaskStatus;
  dueDate?: any;
  creatorId: string;
  createdAt: any;
  updatedAt: any;
}

export interface ActivityLog {
  id: string;
  projectId: string;
  taskId?: string;
  userId: string;
  action: string;
  details: string;
  timestamp: any;
}
