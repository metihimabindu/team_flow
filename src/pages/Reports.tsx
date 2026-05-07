import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, getDocs, collectionGroup } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { Project, Task } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { 
  BarChart2, 
  Download, 
  FileText, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { cn } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';

export default function Reports() {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  useEffect(() => {
    if (!profile?.id) return;

    // Fetch projects where user is a member
    const qProjects = query(collection(db, 'projects'), where('members', 'array-contains', profile.id));
    const unsubscribeProjects = onSnapshot(qProjects, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Project));
      setProjects(projectsData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'projects'));

    // Fetch all tasks for these projects where the user is assigned
    const qTasks = query(collectionGroup(db, 'tasks'), where('assignedTo', '==', profile.id));
    const unsubscribeTasks = onSnapshot(qTasks, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task));
      setTasks(tasksData);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'tasks_group'));

    return () => {
      unsubscribeProjects();
      unsubscribeTasks();
    };
  }, [profile?.id]);

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const taskStats = [
    { name: 'Todo', value: tasks.filter(t => t.status === 'todo').length, color: '#94a3b8' },
    { name: 'In Progress', value: tasks.filter(t => t.status === 'in-progress').length, color: '#6366f1' },
    { name: 'Done', value: tasks.filter(t => t.status === 'done').length, color: '#22c55e' }
  ];

  const exportCSV = () => {
    const headers = ['Task Name', 'Project', 'Status', 'Due Date'];
    const rows = tasks.map(t => [
      t.title,
      projects.find(p => p.id === t.projectId)?.name || 'Unknown',
      t.status,
      t.dueDate instanceof Date ? t.dueDate.toLocaleDateString() : t.dueDate
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `teamflow_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJSON = () => {
    const data = {
      generatedAt: new Date().toISOString(),
      user: profile?.name,
      projects: projects.map(p => ({
        name: p.name,
        description: p.description,
        status: p.status
      })),
      tasks: tasks.map(t => ({
        title: t.title,
        status: t.status,
        projectId: t.projectId
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `teamflow_report_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading statistics...</div>;
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Reports & Analytics</h1>
          <p className="text-slate-500 mt-1">Track project velocity and team performance.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <Download size={18} />
            <span className="font-medium">Export CSV</span>
          </button>
          <button 
            onClick={exportJSON}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <FileText size={18} />
            <span className="font-medium">Export JSON</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Active Projects', value: projects.length, icon: TrendingUp, color: 'bg-blue-50 text-blue-600' },
          { label: 'Total Tasks', value: tasks.length, icon: CheckCircle2, color: 'bg-green-50 text-green-600' },
          { label: 'Completion Rate', value: `${tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100) : 0}%`, icon: PieChart, color: 'bg-purple-50 text-purple-600' },
          { label: 'Pending Tasks', value: tasks.filter(t => t.status !== 'done').length, icon: Clock, color: 'bg-amber-50 text-amber-600' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-3 rounded-xl", stat.color)}>
                {/* @ts-ignore */}
                <stat.icon size={22} />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Task Distribution */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm"
        >
          <h3 className="text-lg font-bold text-slate-900 mb-8">Task Status Distribution</h3>
          <div className="h-[300px] w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minHeight={300}>
              <BarChart data={taskStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {taskStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Project Breakdown */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm"
        >
          <h3 className="text-lg font-bold text-slate-900 mb-8">Tasks per Project</h3>
          <div className="space-y-6">
            {projects.slice(0, 5).map(project => {
              const projectTasks = tasks.filter(t => t.projectId === project.id);
              const completed = projectTasks.filter(t => t.status === 'done').length;
              const total = projectTasks.length;
              const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

              return (
                <div key={project.id} className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-slate-700">{project.name}</span>
                    <span className="text-slate-500">{completed}/{total} tasks</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-600 transition-all duration-500" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {projects.length === 0 && (
              <div className="text-center py-12">
                <BarChart2 size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-500">No project data available</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Detailed Task Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
      >
        <div className="px-8 py-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-slate-900">Performance Log</h3>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search logs..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
              />
              <BarChart2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            </div>
            
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="done">Done</option>
            </select>

            <select 
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none cursor-pointer"
            >
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Task</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Project</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.length > 0 ? filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-4">
                    <div className="text-sm font-semibold text-slate-900">{task.title}</div>
                    <div className="text-xs text-slate-400">Assigned to you</div>
                  </td>
                  <td className="px-8 py-4">
                    <span className="text-sm text-slate-600 font-medium">
                      {projects.find(p => p.id === task.projectId)?.name || 'N/A'}
                    </span>
                  </td>
                  <td className="px-8 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                      task.priority === 'high' ? "bg-rose-50 text-rose-600" :
                      task.priority === 'medium' ? "bg-amber-50 text-amber-600" :
                      "bg-blue-50 text-blue-600"
                    )}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        task.status === 'done' ? "bg-green-500" :
                        task.status === 'in-progress' ? "bg-indigo-500" :
                        "bg-slate-400"
                      )} />
                      <span className="text-sm text-slate-600 capitalize font-medium">{task.status}</span>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-8 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle size={32} className="opacity-20" />
                      <p className="font-medium italic">No logs found matching your criteria.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
