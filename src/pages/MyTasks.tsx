import { collectionGroup, query, where, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { Task } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Flag,
  Search,
  Filter
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export default function MyTasks() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;

    // Use collectionGroup to find tasks assigned to me across all projects
    // Note: This requires a composite index in production, but works for simpler queries
    const q = query(
      collectionGroup(db, 'tasks'), 
      where('assignedTo', '==', profile.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'tasks_group'));

    return () => unsubscribe();
  }, [profile]);

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Personal Backlog</h1>
        <p className="text-slate-500 mt-1">Focus on your assigned objectives and deadlines.</p>
      </header>

      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search objectives..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 pl-11 pr-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "px-4 py-2 rounded-2xl flex items-center gap-2 font-medium transition-all border",
              showFilters 
                ? "bg-slate-900 text-white border-slate-900" 
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            <Filter size={18} /> Filters
          </button>
        </div>

        {showFilters && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-white border border-slate-200 rounded-3xl flex flex-wrap gap-8"
          >
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Status Filter</label>
              <div className="flex bg-slate-50 p-1 rounded-xl">
                {['all', 'todo', 'in_progress', 'done'].map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all",
                      statusFilter === status 
                        ? "bg-white text-indigo-600 shadow-sm" 
                        : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Priority Filter</label>
              <div className="flex bg-slate-50 p-1 rounded-xl">
                {['all', 'high', 'medium', 'low'].map(priority => (
                  <button
                    key={priority}
                    onClick={() => setPriorityFilter(priority)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all",
                      priorityFilter === priority 
                        ? "bg-white text-indigo-600 shadow-sm" 
                        : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    {priority}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/50">
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Task Name</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Priority</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Due Date</th>
                <th className="px-8 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-24 text-center text-slate-400">
                    <CheckCircle2 size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="font-medium italic">
                      {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' 
                        ? "No tasks match your current filters." 
                        : "Your backlog is clear. Great work!"}
                    </p>
                  </td>
                </tr>
              ) : filteredTasks.map((task, idx) => (
                <motion.tr 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={task.id} 
                  className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group cursor-pointer"
                >
                  <td className="px-8 py-5">
                    <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{task.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Project ID: {task.projectId.slice(0, 8)}...</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest leading-none",
                      task.status === 'done' ? "bg-emerald-100 text-emerald-700" :
                      task.status === 'in_progress' ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"
                    )}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <Flag className={cn(
                        "w-3 h-3",
                        task.priority === 'high' ? 'text-rose-500 fill-rose-500' :
                        task.priority === 'medium' ? 'text-amber-500 fill-amber-500' : 'text-emerald-500 fill-emerald-500'
                      )} />
                      <span className="text-xs font-bold text-slate-600 capitalize">{task.priority}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                      <Clock size={14} />
                      <span>{task.dueDate ? format(task.dueDate.toDate(), 'MMM dd, yyyy') : 'No deadline'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button className="text-slate-300 hover:text-indigo-600 transition-colors">
                      <Search size={18} />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
