import React, { useState, useEffect } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

const getFirebaseConfig = () => {
  // 1. Check Vite environment variables (VITE_FIREBASE_*)
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_FIREBASE_PROJECT_ID) {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };
  }
  // 2. Check global configuration object fallback
  if (typeof window !== 'undefined' && window.__firebase_config) {
    try {
      return typeof window.__firebase_config === 'string' 
        ? JSON.parse(window.__firebase_config) 
        : window.__firebase_config;
    } catch (e) {
      console.error("Failed to parse __firebase_config", e);
    }
  }
  return null;
};

const firebaseConfig = getFirebaseConfig();
let app, auth, db;

if (firebaseConfig && firebaseConfig.projectId) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
}

const appId = (typeof window !== 'undefined' && window.__app_id) ? window.__app_id : 'pop-run-team';

const CupIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M17 10v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9" />
    <path d="M6 10V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
    <path d="M6 10h12" />
    <path d="m8 3 1.5 2" />
    <path d="m16 3-1.5 2" />
    <path d="m12 3 v2" />
  </svg>
);

const UsersIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const HistoryIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </svg>
);

const CheckIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const TrashIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

const CloudIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
  </svg>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('run');
  const [members, setMembers] = useState([]);
  const [history, setHistory] = useState([]);
  
  // Cloud sync state
  const [user, setUser] = useState(null);
  const [isCloudSync, setIsCloudSync] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form & Selection state
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [newMemberName, setNewMemberName] = useState('');
  const [manualPayerId, setManualPayerId] = useState(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // Custom modal dialog state
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', action: null });

  useEffect(() => {
    if (!auth || !db) {
      // Fallback: Use LocalStorage if Firebase is not connected
      const localMembers = localStorage.getItem('pop_run_members');
      const localHistory = localStorage.getItem('pop_run_history');
      
      const defaultMembers = [
        { id: '1', name: 'Alice', balance: 0 },
        { id: '2', name: 'Bob', balance: 0 },
        { id: '3', name: 'Charlie', balance: 0 },
        { id: '4', name: 'Dave', balance: 0 },
      ];

      const initialMembers = localMembers ? JSON.parse(localMembers) : defaultMembers;
      setMembers(initialMembers);
      setHistory(localHistory ? JSON.parse(localHistory) : []);
      setSelectedMembers(initialMembers.map(m => m.id));
      setIsCloudSync(false);
      setLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth init error:", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!db || !user) return;

    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'popRunData', 'main');

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMembers(data.members || []);
        setHistory(data.history || []);
        
        if (selectedMembers.length === 0 && data.members && data.members.length > 0) {
          setSelectedMembers(data.members.map(m => m.id));
        }
      } else {
        const initialMembers = [
          { id: '1', name: 'Alice', balance: 0 },
          { id: '2', name: 'Bob', balance: 0 },
          { id: '3', name: 'Charlie', balance: 0 },
          { id: '4', name: 'Dave', balance: 0 },
        ];
        setDoc(docRef, { members: initialMembers, history: [] }).catch(console.error);
        setMembers(initialMembers);
        setSelectedMembers(initialMembers.map(m => m.id));
      }
      setIsCloudSync(true);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching Firestore data:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const saveState = async (newMembers, newHistory) => {
    setMembers(newMembers);
    setHistory(newHistory);

    if (db && user) {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'popRunData', 'main');
      try {
        await setDoc(docRef, { members: newMembers, history: newHistory });
      } catch (error) {
        console.error("Error saving to Firestore:", error);
      }
    } else {
      localStorage.setItem('pop_run_members', JSON.stringify(newMembers));
      localStorage.setItem('pop_run_history', JSON.stringify(newHistory));
    }
  };

  const getLastPaidDate = (memberId) => {
    const runsWherePaid = history.filter(run => run.payerId === memberId);
    if (runsWherePaid.length === 0) return 0;
    return new Date(runsWherePaid[0].date).getTime();
  };

  const getSuggestedPayer = () => {
    const participants = members.filter(m => selectedMembers.includes(m.id));
    if (participants.length === 0) return null;

    const sorted = [...participants].sort((a, b) => {
      if (a.balance !== b.balance) {
        return a.balance - b.balance; // Lowest score pays first
      }
      return getLastPaidDate(a.id) - getLastPaidDate(b.id); // Tie breaker: paid longest ago
    });

    return sorted[0];
  };

  const suggestedPayer = getSuggestedPayer();
  const effectivePayerId = manualPayerId || (suggestedPayer ? suggestedPayer.id : null);

  const toggleMemberSelection = (id) => {
    setSelectedMembers(prev => {
      const isSelected = prev.includes(id);
      const newSelection = isSelected ? prev.filter(m => m !== id) : [...prev, id];
      if (isSelected && id === manualPayerId) {
        setManualPayerId(null);
      }
      return newSelection;
    });
  };

  const recordRun = async () => {
    if (!effectivePayerId || selectedMembers.length === 0) return;

    const payer = members.find(m => m.id === effectivePayerId);
    
    const newMembers = members.map(member => {
      if (!selectedMembers.includes(member.id)) return member;

      if (member.id === effectivePayerId) {
        return { ...member, balance: member.balance + (selectedMembers.length - 1) };
      } else {
        return { ...member, balance: member.balance - 1 };
      }
    });

    const newRun = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      payerId: effectivePayerId,
      payerName: payer.name,
      participants: members.filter(m => selectedMembers.includes(m.id)).map(m => m.name),
    };

    setManualPayerId(null);
    await saveState(newMembers, [newRun, ...history]);
  };

  const addMember = async (e) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    
    const newMember = {
      id: Date.now().toString(),
      name: newMemberName.trim(),
      balance: 0,
    };
    
    const newMembers = [...members, newMember];
    setNewMemberName('');
    setSelectedMembers([...selectedMembers, newMember.id]);
    setShowQuickAdd(false);
    await saveState(newMembers, history);
  };

  const requestRemoveMember = (id) => {
    setConfirmDialog({
      isOpen: true,
      message: 'Are you sure you want to remove this team member?',
      action: async () => {
        const newMembers = members.filter(m => m.id !== id);
        setSelectedMembers(selectedMembers.filter(m => m !== id));
        if (manualPayerId === id) setManualPayerId(null);
        await saveState(newMembers, history);
      }
    });
  };

  const requestUndoLastRun = () => {
    if (history.length === 0) return;
    
    setConfirmDialog({
      isOpen: true,
      message: 'Undo the last run? This will revert scores for everyone involved.',
      action: async () => {
        const lastRun = history[0];
        
        const revertedMembers = members.map(member => {
          const wasParticipant = lastRun.participants.includes(member.name);
          if (!wasParticipant) return member;

          if (member.id === lastRun.payerId) {
            return { ...member, balance: member.balance - (lastRun.participants.length - 1) };
          } else {
            return { ...member, balance: member.balance + 1 };
          }
        });

        await saveState(revertedMembers, history.slice(1));
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <CupIcon className="w-12 h-12 text-orange-500 animate-bounce" />
        <p className="text-slate-500 font-medium">Loading Pop Run Tracker...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans sm:p-6 pb-24 relative">
      
      {/* Custom Confirmation Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Confirm Action</h3>
            <p className="text-slate-600 mb-8">{confirmDialog.message}</p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setConfirmDialog({ isOpen: false, message: '', action: null })}
                className="px-5 py-2.5 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (confirmDialog.action) confirmDialog.action();
                  setConfirmDialog({ isOpen: false, message: '', action: null });
                }}
                className="px-5 py-2.5 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 shadow-md"
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto bg-white sm:rounded-3xl sm:shadow-2xl overflow-hidden min-h-screen sm:min-h-0 border border-slate-200 relative">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-white/20 px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-sm">
            <CloudIcon className="w-3.5 h-3.5" />
            <span>{isCloudSync ? 'LIVE SYNC' : 'LOCAL'}</span>
          </div>
          <div className="flex justify-center mb-2 mt-2">
            <div className="p-3 bg-white/20 rounded-full backdrop-blur-md shadow-inner">
              <CupIcon className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Pop Run Tracker</h1>
          <p className="text-orange-100 font-medium text-xs mt-1">Keep it fair, keep it fizzy.</p>
        </div>

        {/* Tab Navigation Content */}
        <div className="p-6">
          {activeTab === 'run' && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-slate-800">
                    1. Who's going today?
                  </h2>
                  <button 
                    onClick={() => setShowQuickAdd(!showQuickAdd)}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1"
                  >
                    <span>+ Add Member</span>
                  </button>
                </div>

                {showQuickAdd && (
                  <form onSubmit={addMember} className="flex gap-2 mb-4 bg-orange-50/70 p-3 rounded-2xl border border-orange-200">
                    <input
                      type="text"
                      placeholder="Enter member name..."
                      className="flex-1 bg-white border border-orange-200 rounded-xl px-3.5 py-2 text-sm font-medium outline-none focus:border-orange-500"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={!newMemberName.trim()}
                      className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors disabled:opacity-50"
                    >
                      Add & Select
                    </button>
                  </form>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {members.map(member => (
                    <button
                      key={member.id}
                      onClick={() => toggleMemberSelection(member.id)}
                      className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-center justify-between shadow-sm ${
                        selectedMembers.includes(member.id) 
                          ? 'border-orange-500 bg-orange-50 text-orange-900 font-semibold' 
                          : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200'
                      }`}
                    >
                      <span className="truncate">{member.name}</span>
                      {selectedMembers.includes(member.id) && (
                        <CheckIcon className="w-5 h-5 text-orange-500 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {selectedMembers.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                  <h2 className="text-base font-bold text-slate-800 mb-3">
                    2. Who's paying?
                  </h2>
                  
                  <div className="bg-slate-50 rounded-3xl p-5 border border-slate-200 text-center">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-2">Algorithm Suggests</p>
                    <span className="text-3xl font-black text-slate-800 block">
                      {suggestedPayer ? suggestedPayer.name : '...'}
                    </span>
                    {suggestedPayer && (
                      <span className={`inline-block text-xs font-bold mt-2 px-3 py-1 rounded-full ${
                        suggestedPayer.balance > 0 ? 'bg-green-100 text-green-700' : 
                        suggestedPayer.balance < 0 ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-700'
                      }`}>
                        Score: {suggestedPayer.balance > 0 ? '+' : ''}{suggestedPayer.balance}
                      </span>
                    )}

                    <div className="mt-4 pt-4 border-t border-slate-200 text-left">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Override Payer</label>
                      <select 
                        className="w-full bg-white border border-slate-200 text-slate-700 rounded-xl p-3 text-sm font-medium outline-none focus:border-orange-500"
                        value={manualPayerId || (suggestedPayer ? suggestedPayer.id : '')}
                        onChange={(e) => setManualPayerId(e.target.value)}
                      >
                        {members.filter(m => selectedMembers.includes(m.id)).map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name} (Score: {m.balance > 0 ? '+' : ''}{m.balance})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={recordRun}
                    disabled={!effectivePayerId}
                    className="w-full mt-5 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 text-base"
                  >
                    <CupIcon className="w-5 h-5" />
                    Record Run
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-5">
              <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-4 text-xs text-amber-900 leading-relaxed">
                <strong>Rules:</strong> You lose 1 point when someone buys for you. You gain points when you buy for others. Lowest score pays next!
              </div>

              {/* Prominent Add Member Box at top */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Add New Team Member</h3>
                <form onSubmit={addMember} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter team member name..."
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-orange-500"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={!newMemberName.trim()}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 shadow-sm"
                  >
                    Add Member
                  </button>
                </form>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Roster ({members.length})</h3>
                {members.slice().sort((a, b) => b.balance - a.balance).map(member => (
                  <div key={member.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base ${
                        member.balance > 0 ? 'bg-green-100 text-green-700' :
                        member.balance < 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{member.name}</p>
                        <p className={`text-xs font-semibold ${
                          member.balance > 0 ? 'text-green-600' : member.balance < 0 ? 'text-red-500' : 'text-slate-400'
                        }`}>
                          {member.balance > 0 ? `+${member.balance} pts` : member.balance < 0 ? `${member.balance} pts` : '0 pts'}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => requestRemoveMember(member.id)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-base font-bold text-slate-800">Recent Runs</h2>
                {history.length > 0 && (
                  <button 
                    onClick={requestUndoLastRun}
                    className="text-xs font-bold text-orange-600 hover:bg-orange-50 px-3 py-1.5 rounded-lg"
                  >
                    Undo Last Run
                  </button>
                )}
              </div>
              
              {history.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-100">
                  <CupIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-xs font-medium">No runs recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((run) => (
                    <div key={run.id} className="p-3.5 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          <span className="font-bold">{run.payerName}</span> paid for {run.participants.length}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                          {run.participants.join(', ')}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                        {new Date(run.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Tab Bar */}
        <div className="fixed sm:absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around p-2">
          <button
            onClick={() => setActiveTab('run')}
            className={`flex-1 flex flex-col items-center p-2 rounded-xl text-[10px] font-bold uppercase tracking-wider ${
              activeTab === 'run' ? 'text-orange-600 bg-orange-50' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <CupIcon className="w-5 h-5 mb-1" />
            Run
          </button>
          
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 flex flex-col items-center p-2 rounded-xl text-[10px] font-bold uppercase tracking-wider ${
              activeTab === 'members' ? 'text-orange-600 bg-orange-50' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <UsersIcon className="w-5 h-5 mb-1" />
            Team
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex flex-col items-center p-2 rounded-xl text-[10px] font-bold uppercase tracking-wider ${
              activeTab === 'history' ? 'text-orange-600 bg-orange-50' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <HistoryIcon className="w-5 h-5 mb-1" />
            History
          </button>
        </div>

      </div>
    </div>
  );
}