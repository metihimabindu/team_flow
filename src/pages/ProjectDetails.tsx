import { 
  useParams, 
  useNavigate 
} from 'react-router-dom';
import { 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  where,
  getDocs
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { db, OperationType, handleFirestoreError, auth } from '../lib/firebase';
import { Project, Task, TaskStatus, Priority, UserProfile } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useIsProjectAdmin } from '../hooks/useIsAdmin';
import { 
  DragDropContext, 
  Droppable, 
  Draggable, 
  DropResult 
} from '@hello-pangea/dnd';
import { 
  Plus, 
  MoreVertical, 
  Calendar, 
  UserPlus, 
  ArrowLeft, 
  MessageSquare, 
  History,
  CheckCircle2,
  AlertCircle,
  Flag,
  Search,
  Clock,
  X,
  Loader2,
  Filter,
  UserMinus,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

const STATUS_COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'todo', label: 'To Do', color: 'bg-slate-100 text-slate-800' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-50 text-blue-800' },
  { id: 'done', label: 'Done', color: 'bg-emerald-50 text-emerald-800' },
];

export default function ProjectDetails() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectMembers, setProjectMembers] = useState<UserProfile[]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<UserProfile | null>(null);
  const [searchMember, setSearchMember] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [taskSearchTerm, setTaskSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  
  const isAdmin = useIsProjectAdmin(project);

  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    priority: 'medium',
    status: 'todo',
  });

  useEffect(() => {
    if (!projectId || !profile) return;

    // 1. Fetch Project
    const unsubscribeProject = onSnapshot(doc(db, 'projects', projectId), (snapshot) => {
      if (!snapshot.exists()) {
        navigate('/projects');
        return;
      }
      setProject({ ...snapshot.data(), id: snapshot.id } as Project);
    }, (error) => handleFirestoreError(error, OperationType.GET, `projects/${projectId}`));

    // 2. Fetch Tasks
    const qTasks = query(collection(db, `projects/${projectId}/tasks`), orderBy('createdAt', 'desc'));
    const unsubscribeTasks = onSnapshot(qTasks, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/tasks`));

    return () => {
      unsubscribeProject();
      unsubscribeTasks();
    };
  }, [projectId, profile, navigate]);

  // Fetch Member Details
  useEffect(() => {
    if (!project?.members) return;

    const fetchMembers = async () => {
       const uids = project.members;
       if (uids.length === 0) return;
       
       const memberData: UserProfile[] = [];
       // Batch fetch users
       for (const uid of uids) {
         const userDoc = await getDoc(doc(db, 'users', uid));
         if (userDoc.exists()) memberData.push({ ...userDoc.data(), id: userDoc.id } as UserProfile);
       }
       setProjectMembers(memberData);
    };

    fetchMembers().catch(console.error);
  }, [project?.members]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as TaskStatus;
    
    // Optimistic UI update
    const updatedTasks = [...tasks];
    const taskIdx = updatedTasks.findIndex(t => t.id === draggableId);
    const oldStatus = updatedTasks[taskIdx].status;
    updatedTasks[taskIdx].status = newStatus;
    setTasks(updatedTasks);

    try {
      await updateDoc(doc(db, `projects/${projectId}/tasks`, draggableId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      // Log movement
      await addDoc(collection(db, `projects/${projectId}/logs`), {
        projectId,
        taskId: draggableId,
        userId: profile?.id,
        action: 'TASK_MOVED',
        details: `Moved task from ${oldStatus} to ${newStatus}`,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}/tasks/${draggableId}`);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !projectId) return;

    try {
      const taskData = {
        ...newTask,
        projectId,
        creatorId: profile.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      await addDoc(collection(db, `projects/${projectId}/tasks`), taskData);
      
      await addDoc(collection(db, `projects/${projectId}/logs`), {
        projectId,
        userId: profile.id,
        action: 'TASK_CREATED',
        details: `Created task: ${newTask.title}`,
        timestamp: serverTimestamp(),
      });

      setIsTaskModalOpen(false);
      setNewTask({ title: '', description: '', priority: 'medium', status: 'todo', assignedTo: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `projects/${projectId}/tasks`);
    }
  };

  const handleRemoveMember = async () => {
    if (!projectId || !memberToRemove) return;
    setIsRemoving(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      
      // 1. Call REST API via server.ts
      const response = await fetch(`/api/projects/${projectId}/members/${memberToRemove.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove member via API');
      }

      // 2. Local Firestore update (sync confirmation)
      await updateDoc(doc(db, 'projects', projectId), {
        members: arrayRemove(memberToRemove.id)
      });

      await addDoc(collection(db, `projects/${projectId}/logs`), {
        projectId,
        userId: profile?.id,
        action: 'MEMBER_REMOVED',
        details: `Removed ${memberToRemove.name} from project`,
        timestamp: serverTimestamp(),
      });

      setMemberToRemove(null);
    } catch (error) {
      console.error('Removal error:', error);
      alert(error instanceof Error ? error.message : 'Failed to remove member');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleSearchUsers = async () => {
    if (!searchMember.trim()) return;
    const q = query(collection(db, 'users'), where('email', '==', searchMember.trim()));
    const snapshot = await getDocs(q);
    const results = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserProfile));
    setSearchResults(results);
  };

  const handleAddMember = async (userId: string) => {
    if (!projectId || !project) return;
    try {
      await updateDoc(doc(db, 'projects', projectId), {
        members: arrayUnion(userId)
      });
      setIsMemberModalOpen(false);
      setSearchMember('');
      setSearchResults([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}`);
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(taskSearchTerm.toLowerCase()) || 
                         task.description?.toLowerCase().includes(taskSearchTerm.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  if (!project) return (
    <div className="flex items-center justify-center p-24">
      <Loader2 className="animate-spin text-indigo-600" size={40} />
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Dynamic Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/projects')}
            className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
               <h1 className="text-3xl font-black text-slate-900 tracking-tight">{project.name}</h1>
               <div className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-sm", project.color || 'bg-indigo-500')}>
                 {project.adminId === profile?.id ? 'Admin' : 'Member'}
               </div>
            </div>
            <p className="text-slate-500 mt-1 font-medium italic">{project.description || 'Enterprise collaboration workspace.'}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex -space-x-4 mr-2">
            {projectMembers.slice(0, 5).map(member => (
              <div 
                key={member.id} 
                onClick={() => isAdmin && member.id !== profile?.id && setMemberToRemove(member)}
                title={isAdmin && member.id !== profile?.id ? `Remove ${member.name}` : member.name}
                className={cn(
                  "w-10 h-10 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-xs font-bold ring-2 ring-transparent transition-all relative overflow-hidden group",
                  isAdmin && member.id !== profile?.id ? "cursor-pointer hover:ring-rose-500" : "cursor-default hover:ring-indigo-500"
                )}
              >
                {member.name.charAt(0)}
                {isAdmin && member.id !== profile?.id && (
                  <div className="absolute inset-0 bg-rose-500/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                    <UserMinus size={14} />
                  </div>
                )}
              </div>
            ))}
            {projectMembers.length > 5 && (
              <div className="w-10 h-10 rounded-full border-2 border-white bg-indigo-50 flex items-center justify-center text-xs font-bold text-indigo-600">
                +{projectMembers.length - 5}
              </div>
            )}
            {isAdmin && (
              <button 
                onClick={() => setIsMemberModalOpen(true)}
                className="w-10 h-10 rounded-full border-2 border-dashed border-slate-300 bg-white flex items-center justify-center text-slate-400 hover:border-indigo-500 hover:text-indigo-600 transition-all ml-4"
              >
                <UserPlus size={18} />
              </button>
            )}
          </div>
          
          {(isAdmin || tasks.some(t => t.assignedTo === profile?.id)) && (
            <button 
              onClick={() => setIsTaskModalOpen(true)}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              <Plus size={20} />
              Create Task
            </button>
          )}
        </div>
      </header>

      {/* Kanban Search & Filters */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search objectives in this project..." 
              value={taskSearchTerm}
              onChange={(e) => setTaskSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 pl-11 pr-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "px-4 py-2 rounded-2xl flex items-center gap-2 font-bold transition-all border shadow-sm",
              showFilters 
                ? "bg-slate-900 text-white border-slate-900" 
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            <Filter size={18} /> Filters
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 bg-white border border-slate-200 rounded-[2rem] shadow-sm flex flex-wrap gap-8"
            >
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Priority Breakdown</label>
                <div className="flex bg-slate-50 p-1 rounded-xl">
                  {['all', 'high', 'medium', 'low'].map(p => (
                    <button
                      key={p}
                      onClick={() => setPriorityFilter(p)}
                      className={cn(
                        "px-6 py-1.5 rounded-lg text-xs font-bold capitalize transition-all",
                        priorityFilter === p 
                          ? "bg-white text-indigo-600 shadow-sm" 
                          : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Board Layout */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 h-full">
          {STATUS_COLUMNS.map((col) => (
            <Droppable key={col.id} droppableId={col.id}>
              {(provided, snapshot) => (
                <div 
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={cn(
                    "flex flex-col rounded-[2.5rem] p-4 min-h-[600px] transition-colors",
                    snapshot.isDraggingOver ? "bg-indigo-50/50" : "bg-slate-50/50"
                  )}
                >
                  <div className="flex items-center justify-between px-4 mb-6 pt-2">
                    <div className="flex items-center gap-3">
                      <span className="font-black text-xs uppercase tracking-widest text-slate-400">{col.label}</span>
                      <span className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 shadow-sm">
                        {tasks.filter(t => t.status === col.id).length}
                      </span>
                    </div>
                    <MoreVertical size={16} className="text-slate-400 cursor-pointer" />
                  </div>

                  <div className="space-y-4 flex-1">
                    {filteredTasks
                      .filter((task) => task.status === col.id)
                      .map((task, index) => (
                        /* @ts-ignore - key is required by React but causing TS error in some environments with dnd */
                        <Draggable 
                          key={task.id} 
                          draggableId={task.id} 
                          index={index}
                          isDragDisabled={!isAdmin && task.assignedTo !== profile?.id}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                "bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-100 group transition-all",
                                snapshot.isDragging && "shadow-2xl border-indigo-500 ring-4 ring-indigo-500/10 rotate-2",
                                !isAdmin && task.assignedTo !== profile?.id 
                                  ? "opacity-60 cursor-not-allowed" 
                                  : "cursor-grab"
                              )}
                            >
                              <div className="flex justify-between items-start mb-3">
                                <span className={cn(
                                  "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight",
                                  task.priority === 'high' ? 'bg-rose-50 text-rose-600' : 
                                  task.priority === 'medium' ? 'bg-amber-50 text-amber-600' : 
                                  'bg-emerald-50 text-emerald-600'
                                )}>
                                  {task.priority}
                                </span>
                                <div className="flex items-center gap-2 text-slate-300 group-hover:text-slate-400 transition-colors">
                                   <MessageSquare size={14} />
                                   <span className="text-xs font-bold">2</span>
                                </div>
                              </div>
                              
                              <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mb-2 leading-tight">
                                {task.title}
                              </h4>
                              
                              <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed font-medium">
                                {task.description || 'No description provided for this objective.'}
                              </p>

                              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-slate-400">
                                   <Clock size={12} />
                                   <span className="text-[10px] font-bold">
                                     {task.dueDate ? format(task.dueDate.toDate(), 'MMM dd') : 'No date'}
                                   </span>
                                </div>
                                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shadow-lg">
                                   {projectMembers.find(m => m.id === task.assignedTo)?.name.charAt(0) || '?'}
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                    
                    {(isAdmin || tasks.some(t => t.assignedTo === profile?.id)) && (
                      <button 
                        onClick={() => {
                          setNewTask(prev => ({ ...prev, status: col.id }));
                          setIsTaskModalOpen(true);
                        }}
                        className="w-full py-4 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 font-bold text-sm hover:border-indigo-300 hover:text-indigo-500 hover:bg-white transition-all flex items-center justify-center gap-2 mt-4"
                      >
                        <Plus size={16} /> Add Task
                      </button>
                    )}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      {/* Task Modal */}
      <AnimatePresence>
        {isTaskModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsTaskModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.form
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onSubmit={handleCreateTask}
              className="relative w-full max-w-xl bg-white rounded-[3.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-10 md:p-14">
                <h2 className="text-3xl font-black text-slate-900 mb-8 border-l-8 border-indigo-600 pl-6 tracking-tight">Capture Objective</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">Technical Title</label>
                    <input 
                      required
                      type="text" 
                      value={newTask.title}
                      onChange={e => setNewTask({...newTask, title: e.target.value})}
                      placeholder="e.g. Implement Webhooks for API" 
                      className="w-full bg-slate-50 border-none px-6 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">Scope of Work</label>
                    <textarea 
                      value={newTask.description}
                      onChange={e => setNewTask({...newTask, description: e.target.value})}
                      rows={4}
                      placeholder="Specify the technical requirements and success criteria..." 
                      className="w-full bg-slate-50 border-none px-6 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-medium text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">Criticality</label>
                    <select 
                      value={newTask.priority}
                      onChange={e => setNewTask({...newTask, priority: e.target.value as Priority})}
                      className="w-full bg-slate-50 border-none px-6 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 appearance-none font-bold text-slate-900 cursor-pointer"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">Owner Assignment</label>
                    <select 
                      value={newTask.assignedTo}
                      onChange={e => setNewTask({...newTask, assignedTo: e.target.value})}
                      className="w-full bg-slate-50 border-none px-6 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 appearance-none font-bold text-slate-900 cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {projectMembers.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-12 flex gap-4">
                  <button type="button" onClick={() => setIsTaskModalOpen(false)} className="flex-1 px-8 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Discard</button>
                  <button type="submit" className="flex-1 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20">Commit Entry</button>
                </div>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal for Removal */}
      <AnimatePresence>
        {memberToRemove && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !isRemoving && setMemberToRemove(null)} className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-10 shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={40} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">Offboard Talent?</h2>
              <p className="text-slate-500 mb-8 font-medium">Remove <span className="font-bold text-slate-900">{memberToRemove.name}</span> from the project? This action is disruptive to ongoing workflows.</p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleRemoveMember}
                  disabled={isRemoving}
                  className="w-full bg-rose-600 text-white py-4 rounded-2xl font-bold hover:bg-rose-700 transition-all flex items-center justify-center gap-2"
                >
                  {isRemoving ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
                  Confirm Removal
                </button>
                <button 
                  onClick={() => setMemberToRemove(null)}
                  disabled={isRemoving}
                  className="w-full bg-slate-50 text-slate-900 py-4 rounded-2xl font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Member Invitations Modal */}
      <AnimatePresence>
        {isMemberModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMemberModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-md bg-white rounded-[3rem] p-10 shadow-2xl"
            >
              <h2 className="text-2xl font-black text-slate-900 mb-8 tracking-tight">Expand Workspace</h2>
              <div className="space-y-6">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      value={searchMember}
                      onChange={e => setSearchMember(e.target.value)}
                      placeholder="Enter verified user email..." 
                      className="w-full bg-slate-50 border-none pl-12 pr-4 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
                    />
                  </div>
                  <button onClick={handleSearchUsers} className="bg-indigo-600 w-14 rounded-2xl text-white flex items-center justify-center hover:bg-indigo-700 shadow-lg shadow-indigo-500/20"><Search size={24}/></button>
                </div>
                
                <div className="mt-8 space-y-3">
                  {searchResults.map(user => (
                    <div key={user.id} className="flex justify-between items-center p-4 bg-slate-50 hover:bg-white hover:shadow-xl transition-all rounded-2xl border border-transparent hover:border-slate-100 group">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-sm font-black shadow-lg group-hover:bg-indigo-600 transition-colors">{user.name.charAt(0)}</div>
                         <div>
                            <p className="text-sm font-black text-slate-900 tracking-tight">{user.name}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{user.email}</p>
                         </div>
                      </div>
                      <button 
                        onClick={() => handleAddMember(user.id)}
                        disabled={project.members.includes(user.id)}
                        className={cn(
                          "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          project.members.includes(user.id) 
                            ? "bg-slate-200 text-slate-400 cursor-not-allowed" 
                            : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md"
                        )}
                      >
                        {project.members.includes(user.id) ? 'Member' : 'Invite'}
                      </button>
                    </div>
                  ))}
                  {searchMember && searchResults.length === 0 && (
                    <div className="text-center py-8">
                       <AlertCircle size={32} className="mx-auto text-slate-200 mb-2" />
                       <p className="text-sm text-slate-400 italic">No matching verified professionals found.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
