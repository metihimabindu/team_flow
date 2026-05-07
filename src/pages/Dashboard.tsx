import { collection, query, where, onSnapshot, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { Project, Task, UserProfile } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Layers,
  ArrowUpRight,
  TrendingUp,
  Users
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { isBefore, startOfToday } from 'date-fns';

interface WorkloadData {
  userId: string;
  name: string;
  total: number;
  completed: number;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [teamProfiles, setTeamProfiles] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;

    // 1. Fetch projects user is a member of
    const qProjects = query(collection(db, 'projects'), where('members', 'array-contains', profile.id));
    
    const unsubscribeProjects = onSnapshot(qProjects, async (snapshot) => {
      const projs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Project));
      setProjects(projs);
      
      // 2. Fetch tasks for all these projects
      // Using a batch approach to avoid too many listeners
      const allTasksData: Task[] = [];
      const userIdsToFetch = new Set<string>();

      for (const project of projs) {
        const tasksSnapshot = await getDocs(collection(db, `projects/${project.id}/tasks`));
        tasksSnapshot.docs.forEach(doc => {
          const task = { ...doc.data(), id: doc.id } as Task;
          allTasksData.push(task);
          if (task.assignedTo) userIdsToFetch.add(task.assignedTo);
        });
      }
      
      setAllTasks(allTasksData);

      // 3. Fetch user profiles for assignees
      const profiles: Record<string, UserProfile> = {};
      for (const uid of Array.from(userIdsToFetch)) {
        if (!teamProfiles[uid]) {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            profiles[uid] = { ...userDoc.data(), id: userDoc.id } as UserProfile;
          }
        }
      }
      setTeamProfiles(prev => ({ ...prev, ...profiles }));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'projects'));

    return () => unsubscribeProjects();
  }, [profile?.id]);

  // Calculations
  const activeTasksCount = allTasks.filter(t => t.status !== 'done').length;
  const completedTasksCount = allTasks.filter(t => t.status === 'done').length;
  
  const today = startOfToday();
  const overdueTasksCount = allTasks.filter(t => {
    if (t.status === 'done' || !t.dueDate) return false;
    const dueDate = t.dueDate.toDate ? t.dueDate.toDate() : new Date(t.dueDate);
    return isBefore(dueDate, today);
  }).length;

  // Stats Grid Data
  const stats = [
    { label: 'Total Projects', value: projects.length, icon: Layers, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Tasks', value: activeTasksCount, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Completed', value: completedTasksCount, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { 
      label: 'Overdue', 
      value: overdueTasksCount, 
      icon: AlertCircle, 
      color: overdueTasksCount > 0 ? 'text-rose-600' : 'text-slate-400', 
      bg: overdueTasksCount > 0 ? 'bg-rose-50' : 'bg-slate-50' 
    },
  ];

  // Workload Aggregation
  const workloadData: WorkloadData[] = (Object.entries(
    allTasks.reduce((acc, task) => {
      const uid = task.assignedTo || 'unassigned';
      if (!acc[uid]) acc[uid] = { total: 0, completed: 0 };
      acc[uid].total++;
      if (task.status === 'done') acc[uid].completed++;
      return acc;
    }, {} as Record<string, { total: number; completed: number }>)
  ) as [string, { total: number; completed: number }][]).map(([uid, stats]) => ({
    userId: uid,
    name: uid === 'unassigned' ? 'Unassigned' : (teamProfiles[uid]?.name || 'Loading...'),
    total: stats.total,
    completed: stats.completed
  })).sort((a, b) => b.total - a.total).slice(0, 5);

  const velocityData = [
    { name: 'Mon', tasks: 4 },
    { name: 'Tue', tasks: 7 },
    { name: 'Wed', tasks: 5 },
    { name: 'Thu', tasks: 12 },
    { name: 'Fri', tasks: 9 },
    { name: 'Sat', tasks: 3 },
    { name: 'Sun', tasks: 2 },
  ];

  const pieData = [
    { name: 'To Do', value: allTasks.filter(t => t.status === 'todo').length },
    { name: 'In Progress', value: allTasks.filter(t => t.status === 'in_progress').length },
    { name: 'Done', value: allTasks.filter(t => t.status === 'done').length },
  ].filter(d => d.value > 0);

  const COLORS = ['#6366f1', '#f59e0b', '#10b981'];

  return (
    <div className="space-y-10 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Enterprise Overview</h1>
          <p className="text-slate-500 mt-2 font-medium">Insights and performance benchmarks for {profile?.name}.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all flex items-center gap-2">
            Generate Intelligence Report <ArrowUpRight size={18} />
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            className={cn(
              "p-8 rounded-[2.5rem] shadow-sm border transition-all hover:shadow-xl",
              stat.bg,
              stat.label === 'Overdue' && stat.value > 0 ? "border-rose-200 ring-4 ring-rose-500/5 shadow-rose-500/10" : "border-slate-50"
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
                <h3 className={cn("text-4xl font-black tracking-tighter", stat.color)}>{stat.value}</h3>
              </div>
              <div className={cn("p-4 rounded-2xl bg-white shadow-sm", stat.color)}>
                <stat.icon size={24} />
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
              <TrendingUp size={14} className="text-emerald-500" />
              <span>Real-time Sync Active</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Task Velocity</h2>
            <select className="bg-slate-50 border-none text-xs font-black uppercase tracking-widest rounded-xl px-4 py-3 outline-none cursor-pointer">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-[300px] w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minHeight={300}>
              <BarChart data={velocityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="tasks" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 h-full flex flex-col">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-10">Allocation</h2>
          <div className="h-[250px] w-full relative min-h-[250px] flex-grow">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={10} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
                <div className="h-full flex items-center justify-center text-slate-300 font-bold italic text-sm">No task data</div>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-4xl font-black text-slate-900 tracking-tighter">
                {allTasks.length > 0 ? Math.round((completedTasksCount / allTasks.length) * 100) : 0}%
              </span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Efficiency</span>
            </div>
          </div>
          <div className="mt-8 space-y-4">
            {pieData.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[idx]}}></div>
                  <span className="text-xs font-bold text-slate-700">{item.name}</span>
                </div>
                <span className="text-xs font-black text-slate-900">{Math.round((item.value / (allTasks.length || 1)) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Workload Widget */}
      <section className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Workload by Team Member</h2>
            <p className="text-sm font-medium text-slate-500">Distribution of objectives across project resources.</p>
          </div>
        </div>

        <div className="space-y-6">
          {workloadData.length === 0 ? (
            <div className="py-12 text-center text-slate-400 italic font-medium">No active workloads to analyze.</div>
          ) : workloadData.map(member => (
            <div key={member.userId} className="group">
              <div className="flex items-center justify-between mb-3 text-sm font-bold">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-black shadow-lg">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <span className="text-slate-900 block">{member.name}</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest">{member.total} Total Objectives</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-900">{Math.round((member.completed / (member.total || 1)) * 100)}% Completed</span>
                  <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest block">{member.completed} Successes</span>
                </div>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner">
                <motion.div 
                  initial={{ width: 0 }}
                  whileInView={{ width: `${(member.completed / (member.total || 1)) * 100}%` }}
                  className="bg-indigo-600 h-full rounded-full shadow-lg shadow-indigo-600/20"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Projects */}
      <section>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Active Workspaces</h2>
          <button className="text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 underline underline-offset-8">View Inventory</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.length === 0 ? (
             <div className="col-span-full py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300">
                <Layers size={64} className="mb-6 opacity-10" />
                <p className="font-bold text-lg">No active workspaces detected.</p>
             </div>
          ) : projects.map(project => (
            <div 
              key={project.id} 
              className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50 group hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer relative overflow-hidden"
            >
              <div className={cn("absolute top-0 right-0 w-32 h-32 opacity-5 rounded-bl-full", project.color || 'bg-indigo-500')}></div>
              <div className="flex justify-between items-start mb-6">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg", project.color || 'bg-indigo-500')}>
                  <Layers className="text-white" size={28} />
                </div>
                <div className="flex -space-x-3">
                  {project.members.slice(0, 3).map(uid => (
                    <div key={uid} className="w-9 h-9 rounded-full border-4 border-white bg-slate-200 flex items-center justify-center text-[10px] font-black shadow-sm">
                      {uid.charAt(0)}
                    </div>
                  ))}
                  {project.members.length > 3 && (
                    <div className="w-9 h-9 rounded-full border-4 border-white bg-indigo-50 flex items-center justify-center text-[10px] font-black text-indigo-600 shadow-sm">+{project.members.length - 3}</div>
                  )}
                </div>
              </div>
              <h3 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{project.name}</h3>
              <p className="text-xs text-slate-500 mt-2 font-medium line-clamp-2 h-8">{project.description || 'Enterprise collaboration workspace.'}</p>
              
              <div className="mt-8">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                   <span>Project Momentum</span>
                   <span>74%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full w-3/4 shadow-lg shadow-indigo-500/20"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
