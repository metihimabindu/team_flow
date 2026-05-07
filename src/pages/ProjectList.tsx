import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { Project, Task, ActivityLog } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Calendar, 
  Users, 
  Folder,
  LayoutGrid,
  List as ListIcon,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

export default function ProjectList() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '', color: 'bg-indigo-500' });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [colorFilter, setColorFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;

    const q = query(collection(db, 'projects'), where('members', 'array-contains', profile.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Project)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'projects'));

    return () => unsubscribe();
  }, [profile]);

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         project.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesColor = colorFilter === 'all' || project.color === colorFilter;
    return matchesSearch && matchesColor;
  });

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      const projectData = {
        name: newProject.name,
        description: newProject.description,
        color: newProject.color,
        adminId: profile.id,
        members: [profile.id],
        createdAt: serverTimestamp(),
      };
      
      const docRef = await addDoc(collection(db, 'projects'), projectData);
      
      // Log activity
      await addDoc(collection(db, `projects/${docRef.id}/logs`), {
        projectId: docRef.id,
        userId: profile.id,
        action: 'PROJECT_CREATED',
        details: `Created project: ${newProject.name}`,
        timestamp: serverTimestamp(),
      });

      setIsModalOpen(false);
      setNewProject({ name: '', description: '', color: 'bg-indigo-500' });
      navigate(`/projects/${docRef.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'projects');
    }
  };

  const colors = [
    { name: 'Indigo', class: 'bg-indigo-500' },
    { name: 'Emerald', class: 'bg-emerald-500' },
    { name: 'Rose', class: 'bg-rose-500' },
    { name: 'Amber', class: 'bg-amber-500' },
    { name: 'Sky', class: 'bg-sky-500' },
    { name: 'Purple', class: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Project Portfolio</h1>
          <p className="text-slate-500 mt-1">Manage and organize your team initiatives.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-white p-1 rounded-xl border border-slate-200">
             <button 
              onClick={() => setViewMode('grid')}
              className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-slate-100 text-indigo-600 shadow-sm" : "text-slate-400")}
             >
               <LayoutGrid size={20} />
             </button>
             <button 
              onClick={() => setViewMode('list')}
              className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-slate-100 text-indigo-600 shadow-sm" : "text-slate-400")}
             >
               <ListIcon size={20} />
             </button>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            <Plus size={20} />
            New Project
          </button>
        </div>
      </header>

      {/* Search & Filter Bar */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search projects by name or description..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 pl-11 pr-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "px-4 py-2 rounded-2xl flex items-center gap-2 font-bold transition-all border",
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
              className="p-6 bg-white border border-slate-200 rounded-3xl"
            >
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Color Label Filter</label>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setColorFilter('all')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                    colorFilter === 'all' ? "bg-slate-900 text-white border-slate-900 shadow-md" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  All Projects
                </button>
                {colors.map(color => (
                  <button
                    key={color.name}
                    onClick={() => setColorFilter(color.class)}
                    className={cn(
                      "w-10 h-10 rounded-xl transition-all border-4 flex items-center justify-center",
                      color.class,
                      colorFilter === color.class ? "border-white ring-2 ring-indigo-500 shadow-md" : "border-transparent opacity-60 hover:opacity-100"
                    )}
                  >
                    {colorFilter === color.class && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
            <Folder className="text-slate-300" size={40} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            {searchTerm || colorFilter !== 'all' ? "No Matching Projects" : "No Projects Found"}
          </h2>
          <p className="text-slate-500 max-w-xs mt-2">
            {searchTerm || colorFilter !== 'all' 
              ? "Try adjusting your search terms or filters to find what you're looking for." 
              : "Create your first project to start organizing tasks with your team."}
          </p>
          {!searchTerm && colorFilter === 'all' && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="mt-6 text-indigo-600 font-bold hover:underline underline-offset-4"
            >
              Design your workspace
            </button>
          )}
        </div>
      ) : (
        <div className={cn(
          viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" 
            : "space-y-4"
        )}>
          {filteredProjects.map((project, idx) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              key={project.id}
              onClick={() => navigate(`/projects/${project.id}`)}
              className={cn(
                "bg-white border border-slate-100 shadow-sm transition-all cursor-pointer group",
                viewMode === 'grid' 
                  ? "p-8 rounded-[2rem] hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-200" 
                  : "p-4 rounded-2xl flex items-center justify-between hover:border-indigo-200"
              )}
            >
              <div className={cn("flex", viewMode === 'grid' ? "flex-col" : "items-center gap-4 flex-1")}>
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg", project.color || 'bg-indigo-500')}>
                  <Folder className="text-white" size={28} />
                </div>
                <div className="flex-1">
                  <h3 className={cn("font-bold text-slate-900 group-hover:text-indigo-600 transition-colors", viewMode === 'grid' ? "text-xl" : "text-lg")}>
                    {project.name}
                  </h3>
                  <p className="text-slate-500 mt-2 line-clamp-2 text-sm leading-relaxed">
                    {project.description || 'No project description established.'}
                  </p>
                </div>
              </div>

              <div className={cn(
                "flex items-center justify-between",
                viewMode === 'grid' ? "mt-8 pt-6 border-t border-slate-50" : "gap-8"
              )}>
                <div className="flex items-center gap-2 text-slate-500">
                  <Users size={16} />
                  <span className="text-xs font-bold">{project.members.length} Members</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                   <Calendar size={16} />
                   <span className="text-xs font-bold">Updated Recently</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.form
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onSubmit={handleCreateProject}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-10">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold text-slate-900">Launch New Project</h2>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={24} />
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Project Identity</label>
                    <input 
                      required
                      type="text" 
                      value={newProject.name}
                      onChange={e => setNewProject({...newProject, name: e.target.value})}
                      placeholder="e.g. Q4 Growth Strategy" 
                      className="w-full bg-slate-50 border-none px-5 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Mission Brief (Optional)</label>
                    <textarea 
                      value={newProject.description}
                      onChange={e => setNewProject({...newProject, description: e.target.value})}
                      rows={3}
                      placeholder="What is this project's core purpose?" 
                      className="w-full bg-slate-50 border-none px-5 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Color Label</label>
                    <div className="flex gap-3 mt-2">
                       {colors.map(color => (
                         <button
                          key={color.name}
                          type="button"
                          onClick={() => setNewProject({...newProject, color: color.class})}
                          className={cn(
                            "w-10 h-10 rounded-xl transition-all border-4",
                            color.class,
                            newProject.color === color.class ? "border-white ring-2 ring-indigo-500 shadow-md" : "border-transparent opacity-80 hover:opacity-100"
                          )}
                         />
                       ))}
                    </div>
                  </div>
                </div>

                <div className="mt-10 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-4 rounded-2xl font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-indigo-600 text-white px-6 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                  >
                    Create Project
                  </button>
                </div>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
