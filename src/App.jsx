import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { Cloud, CloudOff, RefreshCw, CheckCircle, Plus, X, Download, BarChart2, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const firebaseConfig = {
  apiKey: "AIzaSyCeSxYSw8WEEPHLRas3XHyh9yDzV3JnMGw",
  authDomain: "gym-tracker-8d583.firebaseapp.com",
  projectId: "gym-tracker-8d583",
  storageBucket: "gym-tracker-8d583.firebasestorage.app",
  messagingSenderId: "319161013526",
  appId: "1:319161013526:web:1f4d5c0a1c88c4fdba6c37",
  measurementId: "G-KP4D0JQLR8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const USER_DOC_PATH = ['users', 'jimmy_local_user'];

const DEFAULT_TEMPLATES = {
  Push: [
    { id: '1', name: 'Flat Chest Press', sets: [] },
    { id: '2', name: 'Incline Chest Press', sets: [] },
    { id: '3', name: 'Decline Chest Press', sets: [] },
    { id: '4', name: 'Lateral Raises (كتف جانبي)', sets: [] },
    { id: '5', name: 'Rear Delt Fly (كتف خلفي)', sets: [] },
    { id: '6', name: 'Triceps Pushdown', sets: [] }
  ],
  Pull: [
    { id: '7', name: 'High Row (ضهر عالي)', sets: [] },
    { id: '8', name: 'Low Row (ضهر واطي)', sets: [] },
    { id: '9', name: 'Shrugs (ترابيس)', sets: [] },
    { id: '10', name: 'Bicep Curls', sets: [] },
    { id: '11', name: 'Front Raises (كتف أمامي)', sets: [] }
  ],
  Legs: [
    { id: '12', name: 'Leg Extension (أمامي)', sets: [] },
    { id: '13', name: 'Leg Curl (خلفي)', sets: [] },
    { id: '14', name: 'Calf Raises (سمانة)', sets: [] },
    { id: '15', name: 'Back Extension (قطنية)', sets: [] }
  ]
};

export default function GymTrackerApp() {
  const [activeTab, setActiveTab] = useState('workout');
  const [syncStatus, setSyncStatus] = useState('syncing');
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [history, setHistory] = useState([]);
  const [currentRoutine, setCurrentRoutine] = useState(null);
  const [currentWorkout, setCurrentWorkout] = useState([]);
  const [restTimer, setRestTimer] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      setSyncStatus('syncing');
      try {
        const docRef = doc(db, ...USER_DOC_PATH);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.templates) setTemplates(data.templates);
          if (data.history) setHistory(data.history);
          calculateStreak(data.history || []);
        }
        setSyncStatus('saved');
      } catch (err) {
        console.error("Firebase load error", err);
        setSyncStatus('error');
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    let interval;
    if (restTimer > 0) {
      interval = setInterval(() => setRestTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [restTimer]);

  const calculateStreak = (hist) => {
    if (hist.length > 0) {
      const count = hist.filter(h => new Date(h.date).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000).length;
      setStreak(count);
    }
  };

  const saveDataToFirebase = async (newTemplates, newHistory) => {
    setSyncStatus('syncing');
    try {
      await setDoc(doc(db, ...USER_DOC_PATH), {
        templates: newTemplates,
        history: newHistory,
        lastUpdated: new Date().toISOString()
      });
      setSyncStatus('saved');
      calculateStreak(newHistory);
    } catch (err) {
      console.error("Firebase save error", err);
      setSyncStatus('error');
    }
  };

  const startWorkout = (routineName) => {
    setCurrentRoutine(routineName);
    setCurrentWorkout(JSON.parse(JSON.stringify(templates[routineName])));
  };

  const updateSet = (exIndex, setIndex, field, value) => {
    const updated = [...currentWorkout];
    updated[exIndex].sets[setIndex][field] = value;
    setCurrentWorkout(updated);
  };

  const completeSet = (exIndex, setIndex) => {
    const updated = [...currentWorkout];
    updated[exIndex].sets[setIndex].completed = !updated[exIndex].sets[setIndex].completed;
    setCurrentWorkout(updated);
    setRestTimer(updated[exIndex].sets[setIndex].completed ? 90 : 0);
  };

  const addSet = (exIndex) => {
    const updated = [...currentWorkout];
    const prevSet = updated[exIndex].sets[updated[exIndex].sets.length - 1] || { weight: '', reps: '', rpe: '' };
    updated[exIndex].sets.push({ weight: prevSet.weight, reps: prevSet.reps, rpe: prevSet.rpe, completed: false });
    setCurrentWorkout(updated);
  };

  const finishWorkout = () => {
    const newTemplates = { ...templates, [currentRoutine]: currentWorkout.map(ex => ({ ...ex, sets: [] })) };
    const workoutRecord = { id: Date.now(), date: new Date().toISOString(), routine: currentRoutine, exercises: currentWorkout };
    const newHistory = [...history, workoutRecord];
    setTemplates(newTemplates);
    setHistory(newHistory);
    saveDataToFirebase(newTemplates, newHistory);
    setCurrentRoutine(null);
    setCurrentWorkout([]);
    setRestTimer(0);
  };

  const exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ templates, history }));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "gym_tracker_backup.json");
    dlAnchorElem.click();
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 font-sans pb-24">
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-gray-800 p-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Gym Tracker</h1>
          <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
            <Activity size={12} className="text-green-500" /> {streak} Workouts (Last 7d)
          </div>
        </div>
        <div className="flex items-center text-xs text-gray-400">
          {syncStatus === 'syncing' && <><RefreshCw size={14} className="animate-spin mr-1 text-blue-400" /> Syncing...</>}
          {syncStatus === 'saved' && <><Cloud size={14} className="mr-1 text-green-500" /> Saved</>}
          {syncStatus === 'error' && <><CloudOff size={14} className="mr-1 text-red-500" /> Offline</>}
        </div>
      </header>

      <main className="p-4">
        {activeTab === 'workout' && !currentRoutine && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">Select Routine</h2>
            {Object.keys(templates).map(routine => (
              <button key={routine} onClick={() => startWorkout(routine)} className="w-full bg-gray-900 border border-gray-800 p-5 rounded-2xl flex justify-between items-center active:scale-95 transition-transform">
                <span className="text-lg font-medium text-white">{routine}</span>
                <Plus size={20} className="text-gray-500" />
              </button>
            ))}
          </div>
        )}

        {activeTab === 'workout' && currentRoutine && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">{currentRoutine}</h2>
              <button onClick={() => setCurrentRoutine(null)} className="text-gray-400 p-2"><X size={24} /></button>
            </div>

            {currentWorkout.map((exercise, exIndex) => (
              <div key={exercise.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <h3 className="text-base font-semibold text-white mb-3">{exercise.name}</h3>
                <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 mb-2 px-1">
                  <div className="col-span-1 text-center">Set</div>
                  <div className="col-span-3 text-center">kg</div>
                  <div className="col-span-3 text-center">Reps</div>
                  <div className="col-span-3 text-center">RPE</div>
                  <div class
cat << 'EOF' > src/App.jsx
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { Cloud, CloudOff, RefreshCw, CheckCircle, Plus, X, Download, BarChart2, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const firebaseConfig = {
  apiKey: "AIzaSyCeSxYSw8WEEPHLRas3XHyh9yDzV3JnMGw",
  authDomain: "gym-tracker-8d583.firebaseapp.com",
  projectId: "gym-tracker-8d583",
  storageBucket: "gym-tracker-8d583.firebasestorage.app",
  messagingSenderId: "319161013526",
  appId: "1:319161013526:web:1f4d5c0a1c88c4fdba6c37",
  measurementId: "G-KP4D0JQLR8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const USER_DOC_PATH = ['users', 'jimmy_local_user'];

const DEFAULT_TEMPLATES = {
  Push: [
    { id: '1', name: 'Flat Chest Press', sets: [] },
    { id: '2', name: 'Incline Chest Press', sets: [] },
    { id: '3', name: 'Decline Chest Press', sets: [] },
    { id: '4', name: 'Lateral Raises (كتف جانبي)', sets: [] },
    { id: '5', name: 'Rear Delt Fly (كتف خلفي)', sets: [] },
    { id: '6', name: 'Triceps Pushdown', sets: [] }
  ],
  Pull: [
    { id: '7', name: 'High Row (ضهر عالي)', sets: [] },
    { id: '8', name: 'Low Row (ضهر واطي)', sets: [] },
    { id: '9', name: 'Shrugs (ترابيس)', sets: [] },
    { id: '10', name: 'Bicep Curls', sets: [] },
    { id: '11', name: 'Front Raises (كتف أمامي)', sets: [] }
  ],
  Legs: [
    { id: '12', name: 'Leg Extension (أمامي)', sets: [] },
    { id: '13', name: 'Leg Curl (خلفي)', sets: [] },
    { id: '14', name: 'Calf Raises (سمانة)', sets: [] },
    { id: '15', name: 'Back Extension (قطنية)', sets: [] }
  ]
};

export default function GymTrackerApp() {
  const [activeTab, setActiveTab] = useState('workout');
  const [syncStatus, setSyncStatus] = useState('syncing');
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [history, setHistory] = useState([]);
  const [currentRoutine, setCurrentRoutine] = useState(null);
  const [currentWorkout, setCurrentWorkout] = useState([]);
  const [restTimer, setRestTimer] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      setSyncStatus('syncing');
      try {
        const docRef = doc(db, ...USER_DOC_PATH);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.templates) setTemplates(data.templates);
          if (data.history) setHistory(data.history);
          calculateStreak(data.history || []);
        }
        setSyncStatus('saved');
      } catch (err) {
        console.error("Firebase load error", err);
        setSyncStatus('error');
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    let interval;
    if (restTimer > 0) {
      interval = setInterval(() => setRestTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [restTimer]);

  const calculateStreak = (hist) => {
    if (hist.length > 0) {
      const count = hist.filter(h => new Date(h.date).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000).length;
      setStreak(count);
    }
  };

  const saveDataToFirebase = async (newTemplates, newHistory) => {
    setSyncStatus('syncing');
    try {
      await setDoc(doc(db, ...USER_DOC_PATH), {
        templates: newTemplates,
        history: newHistory,
        lastUpdated: new Date().toISOString()
      });
      setSyncStatus('saved');
      calculateStreak(newHistory);
    } catch (err) {
      console.error("Firebase save error", err);
      setSyncStatus('error');
    }
  };

  const startWorkout = (routineName) => {
    setCurrentRoutine(routineName);
    setCurrentWorkout(JSON.parse(JSON.stringify(templates[routineName])));
  };

  const updateSet = (exIndex, setIndex, field, value) => {
    const updated = [...currentWorkout];
    updated[exIndex].sets[setIndex][field] = value;
    setCurrentWorkout(updated);
  };

  const completeSet = (exIndex, setIndex) => {
    const updated = [...currentWorkout];
    updated[exIndex].sets[setIndex].completed = !updated[exIndex].sets[setIndex].completed;
    setCurrentWorkout(updated);
    setRestTimer(updated[exIndex].sets[setIndex].completed ? 90 : 0);
  };

  const addSet = (exIndex) => {
    const updated = [...currentWorkout];
    const prevSet = updated[exIndex].sets[updated[exIndex].sets.length - 1] || { weight: '', reps: '', rpe: '' };
    updated[exIndex].sets.push({ weight: prevSet.weight, reps: prevSet.reps, rpe: prevSet.rpe, completed: false });
    setCurrentWorkout(updated);
  };

  const finishWorkout = () => {
    const newTemplates = { ...templates, [currentRoutine]: currentWorkout.map(ex => ({ ...ex, sets: [] })) };
    const workoutRecord = { id: Date.now(), date: new Date().toISOString(), routine: currentRoutine, exercises: currentWorkout };
    const newHistory = [...history, workoutRecord];
    setTemplates(newTemplates);
    setHistory(newHistory);
    saveDataToFirebase(newTemplates, newHistory);
    setCurrentRoutine(null);
    setCurrentWorkout([]);
    setRestTimer(0);
  };

  const exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ templates, history }));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "gym_tracker_backup.json");
    dlAnchorElem.click();
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 font-sans pb-24">
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-gray-800 p-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Gym Tracker</h1>
          <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
            <Activity size={12} className="text-green-500" /> {streak} Workouts (Last 7d)
          </div>
        </div>
        <div className="flex items-center text-xs text-gray-400">
          {syncStatus === 'syncing' && <><RefreshCw size={14} className="animate-spin mr-1 text-blue-400" /> Syncing...</>}
          {syncStatus === 'saved' && <><Cloud size={14} className="mr-1 text-green-500" /> Saved</>}
          {syncStatus === 'error' && <><CloudOff size={14} className="mr-1 text-red-500" /> Offline</>}
        </div>
      </header>

      <main className="p-4">
        {activeTab === 'workout' && !currentRoutine && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">Select Routine</h2>
            {Object.keys(templates).map(routine => (
              <button key={routine} onClick={() => startWorkout(routine)} className="w-full bg-gray-900 border border-gray-800 p-5 rounded-2xl flex justify-between items-center active:scale-95 transition-transform">
                <span className="text-lg font-medium text-white">{routine}</span>
                <Plus size={20} className="text-gray-500" />
              </button>
            ))}
          </div>
        )}

        {activeTab === 'workout' && currentRoutine && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">{currentRoutine}</h2>
              <button onClick={() => setCurrentRoutine(null)} className="text-gray-400 p-2"><X size={24} /></button>
            </div>

            {currentWorkout.map((exercise, exIndex) => (
              <div key={exercise.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <h3 className="text-base font-semibold text-white mb-3">{exercise.name}</h3>
                <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 mb-2 px-1">
                  <div className="col-span-1 text-center">Set</div>
                  <div className="col-span-3 text-center">kg</div>
                  <div className="col-span-3 text-center">Reps</div>
                  <div className="col-span-3 text-center">RPE</div>
                  <div className="col-span-2 text-center">Done</div>
                </div>
                {exercise.sets.map((set, setIndex) => (
                  <div key={setIndex} className={`grid grid-cols-12 gap-2 items-center mb-2 ${set.completed ? 'opacity-50' : ''}`}>
                    <div className="col-span-1 text-center text-sm text-gray-400">{setIndex + 1}</div>
                    <div className="col-span-3">
                      <input type="number" value={set.weight} onChange={(e) => updateSet(exIndex, setIndex, 'weight', e.target.value)} className="w-full bg-black border border-gray-700 rounded-lg p-2 text-center text-white focus:border-blue-500 outline-none" placeholder="--" />
                    </div>
                    <div className="col-span-3">
                      <input type="number" value={set.reps} onChange={(e) => updateSet(exIndex, setIndex, 'reps', e.target.value)} className="w-full bg-black border border-gray-700 rounded-lg p-2 text-center text-white focus:border-blue-500 outline-none" placeholder="--" />
                    </div>
                    <div className="col-span-3">
                      <input type="number" value={set.rpe} onChange={(e) => updateSet(exIndex, setIndex, 'rpe', e.target.value)} className="w-full bg-black border border-gray-700 rounded-lg p-2 text-center text-orange-400 focus:border-orange-500 outline-none" placeholder="--" />
                    </div>
                    <button onClick={() => completeSet(exIndex, setIndex)} className={`col-span-2 flex justify-center items-center p-2 rounded-lg ${set.completed ? 'bg-green-500/20 text-green-500' : 'bg-gray-800 text-gray-400'}`}>
                      <CheckCircle size={20} />
                    </button>
                  </div>
                ))}
                <button onClick={() => addSet(exIndex)} className="w-full mt-3 py-2 text-sm text-blue-400 bg-blue-500/10 rounded-lg font-medium">+ Add Set</button>
              </div>
            ))}
            <button onClick={finishWorkout} className="w-full bg-blue-600 text-white font-bold text-lg py-4 rounded-2xl active:scale-95 transition-transform mt-8 mb-4 shadow-lg shadow-blue-500/20">Finish Workout</button>
          </div>
        )}

        {activeTab === 'progress' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Progress & Data</h2>
              <button onClick={exportData} className="flex items-center gap-2 text-sm bg-gray-900 border border-gray-700 px-3 py-1.5 rounded-lg text-gray-300"><Download size={16} /> Export</button>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 h-64">
              <h3 className="text-sm font-semibold text-gray-400 mb-4">Volume Overview (Last workouts)</h3>
              {history.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-600 text-sm">No data yet. Complete a workout!</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={history.slice(-10).map((h) => ({ name: h.routine, volume: h.exercises.reduce((acc, ex) => acc + ex.sets.reduce((sAcc, set) => sAcc + (Number(set.weight||0) * Number(set.reps||0)), 0), 0) }))}>
                    <XAxis dataKey="name" stroke="#4B5563" fontSize={12} />
                    <Tooltip cursor={{fill: '#1F2937'}} contentStyle={{backgroundColor: '#000', border: '1px solid #374151', borderRadius: '8px'}} />
                    <Bar dataKey="volume" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}
      </main>

      {restTimer > 0 && (
        <div className="fixed bottom-24 left-4 right-4 bg-gray-900 border border-blue-500/30 rounded-2xl p-4 shadow-2xl flex justify-between items-center z-20">
          <div className="flex items-center gap-3">
            <span className="text-blue-400 font-bold text-xl">{restTimer}s</span>
            <span className="text-white font-medium">Resting...</span>
          </div>
          <button onClick={() => setRestTimer(0)} className="text-gray-400 bg-black px-3 py-1.5 rounded-lg text-sm">Skip</button>
        </div>
      )}

      <nav className="fixed bottom-0 w-full bg-black/90 backdrop-blur-md border-t border-gray-900 z-10">
        <div className="flex justify-around p-3">
          <button onClick={() => setActiveTab('workout')} className={`flex flex-col items-center gap-1 ${activeTab === 'workout' ? 'text-blue-500' : 'text-gray-500'}`}>
            <Activity size={24} /><span className="text-[10px] font-medium">Workout</span>
          </button>
          <button onClick={() => setActiveTab('progress')} className={`flex flex-col items-center gap-1 ${activeTab === 'progress' ? 'text-blue-500' : 'text-gray-500'}`}>
            <BarChart2 size={24} /><span className="text-[10px] font-medium">Progress</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
