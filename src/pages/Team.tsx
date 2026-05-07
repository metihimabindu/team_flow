import { collection, query, onSnapshot, where, getDocs } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { UserProfile } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, 
  Mail, 
  Shield, 
  Activity,
  ArrowUpRight,
  UserCheck,
  Search,
  X,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function Team() {
  const { profile } = useAuth();
  const [dbUsers, setDbUsers] = useState<UserProfile[]>([]);
  const [extraUsers, setExtraUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'found' | 'not_found' | 'sent'>('idle');
  const [foundUser, setFoundUser] = useState<UserProfile | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const isAdmin = profile?.role === 'admin';

  const MOCK_PROFESSIONALS: UserProfile[] = [
    { id: 'mock-0', name: 'Marcus Thorne', email: 'marcus@admin.io', role: 'admin', title: 'Technical Director', status: 'online', createdAt: new Date() },
    { id: 'mock-1', name: 'Alex Rivera', email: 'alex@design.com', role: 'member', title: 'Product Designer', status: 'online', createdAt: new Date() },
    { id: 'mock-2', name: 'Sarah Chen', email: 'sarah@tech.io', role: 'member', title: 'Frontend Architect', status: 'online', createdAt: new Date() },
    { id: 'mock-3', name: 'Jordan Smith', email: 'jordan@dev.net', role: 'member', title: 'Backend Lead', status: 'offline', createdAt: new Date() },
    { id: 'mock-4', name: 'Elena Vance', email: 'elena@vance.com', role: 'member', title: 'Security Analyst', status: 'online', createdAt: new Date() },
  ];

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDbUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserProfile)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    return () => unsubscribe();
  }, []);

  const users = [...dbUsers, ...extraUsers];

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleSearchInvite = async () => {
    if (!inviteEmail.trim()) return;
    setSearchStatus('searching');
    
    // Check mocks first for demo purposes
    const mock = MOCK_PROFESSIONALS.find(p => p.email.toLowerCase() === inviteEmail.trim().toLowerCase());
    if (mock) {
      setFoundUser(mock);
      setSearchStatus('found');
      return;
    }
    
    try {
      const q = query(collection(db, 'users'), where('email', '==', inviteEmail.trim()));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        setFoundUser({ ...snapshot.docs[0].data(), id: snapshot.docs[0].id } as UserProfile);
        setSearchStatus('found');
      } else {
        setFoundUser(null);
        setSearchStatus('not_found');
      }
    } catch (error) {
      console.error('Error searching user:', error);
      setSearchStatus('idle');
    }
  };

  const handleSendInvite = () => {
    // If it was a mock user, "connect" them to our team for the session
    if (foundUser && foundUser.id.startsWith('mock-')) {
      if (!extraUsers.find(u => u.id === foundUser.id) && !dbUsers.find(u => u.email === foundUser.email)) {
        setExtraUsers(prev => [...prev, foundUser]);
      }
    }
    
    setSearchStatus('sent');
    setTimeout(() => {
      setIsInviteModalOpen(false);
      setInviteEmail('');
      setSearchStatus('idle');
      setFoundUser(null);
    }, 2000);
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Organization Directory</h1>
          <p className="text-slate-500 mt-1">Manage cross-functional teams and permissions.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsInviteModalOpen(true)}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            Invite Talent <UserCheck size={18} />
          </button>
        )}
      </header>

      {/* Search & Filter Bar */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search team members by name or email..." 
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
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Role Filter</label>
              <div className="flex bg-slate-50 p-1 rounded-xl w-fit">
                {['all', 'admin', 'member'].map(role => (
                  <button
                    key={role}
                    onClick={() => setRoleFilter(role)}
                    className={cn(
                      "px-6 py-2 rounded-lg text-xs font-bold capitalize transition-all",
                      roleFilter === role 
                        ? "bg-white text-indigo-600 shadow-sm" 
                        : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.length === 0 ? (
          <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
            <Users size={48} className="mx-auto mb-4 text-slate-300" />
            <h3 className="text-xl font-bold text-slate-900">No Teammates Found</h3>
            <p className="text-slate-500 mt-2">Try adjusting your filters or search terms.</p>
          </div>
        ) : filteredUsers.map((user, idx) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            key={user.id}
            className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xl font-black shadow-2xl group-hover:bg-indigo-600 transition-colors">
                {user.name.charAt(0)}
              </div>
              <div className={cn(
                "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                user.role === 'admin' ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"
              )}>
                {user.role}
              </div>
            </div>

            <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{user.name}</h3>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">
              {user.title || (user.role === 'admin' ? 'Organization Admin' : 'Full-stack Developer')}
            </p>
            <div className="flex items-center gap-2 text-slate-500 mt-3">
              <Mail size={14} />
              <span className="text-sm font-medium">{user.email}</span>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-50 grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Tasks</span>
                <span className="text-lg font-bold text-slate-900">12</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Efficiency</span>
                <span className="text-lg font-bold text-emerald-600">94%</span>
              </div>
            </div>

            <button 
              onClick={() => setSelectedUser(user)}
              className="w-full mt-8 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-50 text-slate-900 font-bold hover:bg-slate-900 hover:text-white transition-all"
            >
              View Profile <ArrowUpRight size={16} />
            </button>
          </motion.div>
        ))}
      </div>
      <AnimatePresence>
        {isInviteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsInviteModalOpen(false)} 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-10">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold text-slate-900 px-2 border-l-4 border-indigo-600">Invite New Talent</h2>
                  <button onClick={() => setIsInviteModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">Professional Email</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="email" 
                          value={inviteEmail}
                          onChange={e => {
                            setInviteEmail(e.target.value);
                            if (searchStatus !== 'idle') setSearchStatus('idle');
                          }}
                          placeholder="professional@company.com" 
                          className="w-full bg-slate-50 border-none pl-12 pr-6 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                        />
                      </div>
                      <button 
                        onClick={handleSearchInvite}
                        disabled={!inviteEmail.includes('@') || searchStatus === 'searching'}
                        className="bg-slate-900 text-white px-6 rounded-2xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {searchStatus === 'searching' ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {searchStatus === 'found' && foundUser && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                            {foundUser.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{foundUser.name}</p>
                            <p className="text-sm text-slate-500">Verified Professional</p>
                          </div>
                        </div>
                        <button 
                          onClick={handleSendInvite}
                          className="bg-white text-indigo-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                        >
                          {foundUser.id.startsWith('mock-') ? 'Connect' : 'Send Link'}
                        </button>
                      </motion.div>
                    )}

                    {searchStatus === 'not_found' && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-amber-50 p-6 rounded-3xl border border-amber-100"
                      >
                        <div className="flex items-start gap-4">
                          <div className="p-3 rounded-xl bg-amber-100 text-amber-600">
                            <AlertCircle size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">User not found</p>
                            <p className="text-sm text-slate-500 mt-1">This professional hasn't joined TeamFlow yet. We can send them a direct invitation link instead.</p>
                            <button 
                              onClick={handleSendInvite}
                              className="mt-4 bg-amber-600 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-amber-700 transition-colors"
                            >
                              Send Invite via Email
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {searchStatus === 'sent' && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }} 
                        animate={{ opacity: 1, scale: 1 }}
                        className="py-12 flex flex-col items-center justify-center text-center"
                      >
                        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                          <CheckCircle2 size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">
                          {foundUser?.id.startsWith('mock-') ? 'Successfully Connected' : 'Invitation Dispatched'}
                        </h3>
                        <p className="text-slate-500 mt-2 max-w-[280px]">
                          {foundUser?.id.startsWith('mock-') 
                            ? `${foundUser.name} has been added to your cross-functional team directory.`
                            : `The invitation link has been successfully sent to `}
                          {!foundUser?.id.startsWith('mock-') && <span className="font-bold text-slate-900">{inviteEmail}</span>}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {searchStatus !== 'sent' && (
                  <div className="mt-12 pt-8 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-400 font-medium">Invited talent will receive access to your organization's shared workspaces and dashboard analytics.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Profile Detail Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setSelectedUser(null)} 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="absolute top-8 right-8 z-10">
                <button onClick={() => setSelectedUser(null)} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={20} className="text-slate-600" />
                </button>
              </div>

              <div className="flex flex-col md:flex-row">
                <div className="w-full md:w-2/5 bg-slate-900 p-12 text-white flex flex-col items-center justify-center text-center">
                  <div className="w-32 h-32 rounded-[2.5rem] bg-indigo-600 flex items-center justify-center text-4xl font-black shadow-2xl mb-6">
                    {selectedUser.name.charAt(0)}
                  </div>
                  <h2 className="text-2xl font-bold uppercase tracking-tight mb-2">{selectedUser.name}</h2>
                  <div className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-8",
                    selectedUser.role === 'admin' ? "bg-indigo-500/20 text-indigo-300" : "bg-emerald-500/20 text-emerald-300"
                  )}>
                    {selectedUser.role}
                  </div>

                  <div className="w-full space-y-4 text-left">
                    <div className="flex items-center gap-3 text-slate-400">
                      <Mail size={16} />
                      <span className="text-sm font-medium truncate">{selectedUser.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400">
                      <Shield size={16} />
                      <span className="text-sm font-medium">{selectedUser.title || 'Professional Partner'}</span>
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-3/5 p-12 overflow-y-auto max-h-[80vh]">
                  <div className="mb-10">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Performance Metrics</h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Velocity</p>
                        <p className="text-2xl font-black text-slate-900">4.8<span className="text-sm text-slate-400 ml-1">pts/d</span></p>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Accuracy</p>
                        <p className="text-2xl font-black text-emerald-600">98%</p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-10">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Core Competencies</h3>
                    <div className="flex flex-wrap gap-2">
                      {['Strategic Analysis', 'Full-stack Dev', 'Team Leadership', 'Agile Architecture'].map(skill => (
                        <span key={skill} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-8 bg-indigo-50/50 rounded-[2rem] border border-indigo-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-indigo-600 text-white rounded-lg">
                        <Activity size={16} />
                      </div>
                      <h4 className="font-bold text-slate-900">Current Focus</h4>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Currently optimizing the core logistics engine and overseeing secondary project migrations for the Q3 roadmap.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
