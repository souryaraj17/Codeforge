import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  deleteDoc,
  updateDoc,
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  doc, 
  limit,
  writeBatch,
  where
} from 'firebase/firestore';
import { 
  Home, 
  CreditCard, 
  PieChart, 
  Settings, 
  Plus, 
  X, 
  Check, 
  ChevronDown, 
  Utensils, 
  ShoppingBag, 
  Bus, 
  Film, 
  FileText, 
  ShoppingCart,
  LogOut,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  Trash2,
  AlertCircle,
  MessageCircle, 
  Send,
  Bot,
  Banknote,
  Bell,
  Wallet
} from 'lucide-react';

// --- Firebase Configuration ---
// TODO: Replace with your actual Firebase config keys
const firebaseConfig = {
  apiKey: "AIzaSyDJPQpz0GBtdg8KxhHyzBgQ00KBTaZJviw",
  authDomain: "countme-in-729c2.firebaseapp.com",
  projectId: "countme-in-729c2",
  storageBucket: "countme-in-729c2.firebasestorage.app",
  messagingSenderId: "417502725562",
  appId: "1:417502725562:web:29bb15c0c793a4d7f64983"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "my-finance-app"; 

// --- Constants & Utilities ---
const CATEGORIES = [
  { id: 'food', name: 'Food & Dining', color: '#26C281', icon: <Utensils size={18} /> },
  { id: 'shopping', name: 'Shopping', color: '#3498DB', icon: <ShoppingBag size={18} /> },
  { id: 'transport', name: 'Transport', color: '#9B59B6', icon: <Bus size={18} /> },
  { id: 'entertainment', name: 'Entertainment', color: '#F39C12', icon: <Film size={18} /> },
  { id: 'bills', name: 'Bills', color: '#FFEEAD', icon: <FileText size={18} /> },
  { id: 'groceries', name: 'Groceries', color: '#D4A5A5', icon: <ShoppingCart size={18} /> },
];

const MOCK_FRIENDS = ['Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Rohan'];

const USER_SETTINGS = {
  monthlyBudget: 10000,
  dailyLimit: 500
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

const formatDate = (date) => {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
};

// --- Custom Components ---

// 1. Donut Chart
const DonutChart = ({ data, centerText, subText }) => {
  const size = 180;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let startAngle = 0;
  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 relative">
        <div className="w-40 h-40 rounded-full border-8 border-gray-100 flex items-center justify-center">
            <span className="text-gray-400 text-xs">No Data</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center relative">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {data.map((item, index) => {
          const percentage = item.value / total;
          const dashArray = percentage * circumference;
          const gap = circumference - dashArray;
          
          startAngle += percentage * 360;

          return (
            <circle
              key={item.name}
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashArray} ${gap}`}
              strokeDashoffset={0} 
              style={{ 
                transformOrigin: 'center', 
                transform: `rotate(${(startAngle - percentage * 360)}deg)`,
                transition: 'all 0.5s ease-out' 
              }}
            />
          );
        })}
        <circle cx={center} cy={center} r={radius - strokeWidth} fill="white" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
        <span className="text-2xl font-bold text-gray-800">{centerText}</span>
        <span className="text-xs text-gray-400 mt-1">{subText}</span>
      </div>
    </div>
  );
};

// 2. Progress Bar
const ProgressBar = ({ value, max, colorClass = "bg-green-500" }) => {
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
      <div 
        className={`h-full ${colorClass} transition-all duration-500 ease-out`} 
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

// 3. Navigation Bar
const BottomNav = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'dashboard', icon: <Home size={20} />, label: 'Home' },
    { id: 'transactions', icon: <CreditCard size={20} />, label: 'Expenses' },
    { id: 'debts', icon: <Banknote size={20} />, label: 'Debts' },
    { id: 'analytics', icon: <PieChart size={20} />, label: 'Stats' },
    { id: 'chat', icon: <MessageCircle size={20} />, label: 'Chat' },
    { id: 'settings', icon: <Settings size={20} />, label: 'Settings' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe pt-2 px-2 flex justify-between items-end z-40 h-[80px] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex flex-col items-center justify-center w-12 transition-colors duration-200 ${
            tab.isAction ? 'mb-6' : 'mb-3'
          } ${activeTab === tab.id ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          {tab.icon}
          <span className="text-[10px] mt-1 font-medium truncate w-full text-center">{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

// 4. Modal
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Application Core ---

export default function FinanceApp() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Data State
  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts] = useState([]);
  const [stats, setStats] = useState({ totalSpent: 0, remaining: USER_SETTINGS.monthlyBudget });

  // Chat State
  const [chatMessages, setChatMessages] = useState([
    { id: 1, text: "Hi! I'm Dost 🤖. I can help you with your budget. Try asking 'How much left?' or 'Any spending tips?'", sender: 'bot' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);

  // Debts State
  const [debtTab, setDebtTab] = useState('owed'); 
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [selectedDebtForReminder, setSelectedDebtForReminder] = useState(null);

  // Analytics State
  const [timeRange, setTimeRange] = useState('month'); 

  // Form State
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [note, setNote] = useState('');
  
  // Debt Form State
  const [debtName, setDebtName] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [debtType, setDebtType] = useState('owed');
  
  // Split Logic State
  const [isSplit, setIsSplit] = useState(false);
  const [splitMethod, setSplitMethod] = useState('equal'); 
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [customAmounts, setCustomAmounts] = useState({});

  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [authError, setAuthError] = useState('');

  // --- Effects ---

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  useEffect(() => {
    if (!user) return;
    
    // Listen to Transactions
    const qTx = query(
      collection(db, 'artifacts', appId, 'users', user.uid, 'transactions'),
      orderBy('date', 'desc'),
      limit(100)
    );

    // Listen to Debts
    const qDebts = query(
      collection(db, 'artifacts', appId, 'users', user.uid, 'debts'),
      orderBy('date', 'desc')
    );

    const unsubTx = onSnapshot(qTx, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTransactions(txs);
      const total = txs.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
      setStats(prev => ({ ...prev, totalSpent: total }));
    });

    const unsubDebts = onSnapshot(qDebts, (snapshot) => {
      const d = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDebts(d);
    });

    return () => { unsubTx(); unsubDebts(); };
  }, [user]);

  // --- Chat Logic ---

  const localReply = (msg) => {
    msg = msg.toLowerCase();
    
    if (msg.includes('left') || msg.includes('balance') || msg.includes('remain'))
        return `You have ${formatCurrency(stats.remaining - stats.totalSpent)} left for this month from your ${formatCurrency(USER_SETTINGS.monthlyBudget)} budget.`;
    
    if (msg.includes('spent') || msg.includes('total'))
        return `So far you've spent ${formatCurrency(stats.totalSpent)}.`;
    
    if (msg.includes('recent') || msg.includes('spending') || msg.includes('last')) {
        if (transactions.length === 0) return "You haven't added any transactions yet.";
        const recent = transactions.slice(0, 3).map(t => `${t.note || t.categoryName} (${formatCurrency(t.amount)})`).join(', ');
        return `Recent spending: ${recent}.`;
    }
    
    if (msg.includes('advice') || msg.includes('help') || msg.includes('tip'))
        return 'Tip: Try to keep your "Food & Dining" expenses under 30% of your total budget. Also, setting a daily limit helps prevent overspending!';
        
    if (msg.includes('split') || msg.includes('owe'))
        return 'You can split bills by clicking the "+" button and selecting "Split Bill". Check the Debts tab for any pending reminders from friends!';

    return 'I can help with budgets, transactions, spending tips, and more. Try asking "How much left to spend?"';
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = { id: Date.now(), text: chatInput, sender: 'user' };
    setChatMessages(prev => [...prev, userMsg]);
    
    const botResponseText = localReply(chatInput);
    setChatInput('');

    // Simulate network delay
    setTimeout(() => {
        setChatMessages(prev => [...prev, { id: Date.now() + 1, text: botResponseText, sender: 'bot' }]);
    }, 600);
  };

  // --- Handlers ---

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setAuthError(err.message.replace('Firebase: ', ''));
    }
  };

  const handleAddTransaction = async () => {
    if (!amount || isNaN(parseFloat(amount))) return;
    const val = parseFloat(amount);

    let finalSplits = {};
    if (isSplit) {
        if (selectedFriends.length === 0) {
            alert("Please select at least one friend to split with.");
            return;
        }
        
        // --- UPDATED SPLIT LOGIC ---
        // Logic: You + Selected Friends = Total People
        // If 2 friends selected (Alice, Bob) + You = 3 people.
        // Amount 300. Per person 100.
        // Alice owes 100. Bob owes 100. You paid 300 total, so your cost was 100.
        
        const totalPeople = selectedFriends.length + 1; // Include user (you)
        
        if (splitMethod === 'equal') {
            const perPerson = val / totalPeople; 
            selectedFriends.forEach(friend => {
                finalSplits[friend] = parseFloat(perPerson.toFixed(2));
            });
        } else {
             // Custom split: User enters exactly what friends owe
             // Example: Total 200. "Alice owes 50". FinalSplits = { Alice: 50 }.
             // The rest (150) is your share.
             selectedFriends.forEach(friend => {
                finalSplits[friend] = parseFloat(customAmounts[friend] || 0);
             });
             const friendsTotal = Object.values(finalSplits).reduce((a,b) => a+b, 0);
             if (friendsTotal > val) {
                alert(`Friend shares (₹${friendsTotal}) cannot exceed total amount (₹${val}).`);
                return;
             }
        }
    }
    
    try {
      // Add Expense
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'transactions'), {
        amount: val,
        categoryId: selectedCategory.id,
        categoryName: selectedCategory.name,
        categoryColor: selectedCategory.color,
        date: serverTimestamp(),
        note: note,
        isSplit: isSplit,
        splits: isSplit ? finalSplits : {},
        type: 'expense'
      });

      // If split, also add to Debts automatically!
      if (isSplit) {
        const batch = writeBatch(db);
        Object.entries(finalSplits).forEach(([friend, debtAmount]) => {
            if (debtAmount > 0) {
                const debtRef = doc(collection(db, 'artifacts', appId, 'users', user.uid, 'debts'));
                batch.set(debtRef, {
                    name: friend,
                    amount: debtAmount,
                    type: 'owed', // They owe me
                    status: 'pending',
                    date: serverTimestamp()
                });
            }
        });
        await batch.commit();
      }

      setAmount('');
      setNote('');
      setIsSplit(false);
      setSelectedFriends([]);
      setCustomAmounts({});
      setIsAddModalOpen(false);
    } catch (error) {
      console.error("Error adding doc", error);
    }
  };

  const handleAddDebt = async () => {
      if(!debtName || !debtAmount) return;
      try {
          await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'debts'), {
              name: debtName,
              amount: parseFloat(debtAmount),
              type: debtType,
              status: 'pending',
              date: serverTimestamp()
          });
          setDebtName('');
          setDebtAmount('');
          setIsDebtModalOpen(false);
      } catch (err) {
          console.error("Error adding debt", err);
      }
  };

  const handleMarkPaid = async (id) => {
      try {
          await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'debts', id), {
              status: 'paid'
          });
      } catch(err) { console.error(err); }
  };

  const handleSendWhatsApp = () => {
      if (!selectedDebtForReminder) return;
      const message = `Hey, just reminding you about the ₹${selectedDebtForReminder.amount} you owe me 😊`;
      const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
      setIsReminderModalOpen(false);
  };

  const handleDeleteTransaction = async (id) => {
    if (!confirm("Are you sure you want to delete this?")) return;
    try {
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'transactions', id));
    } catch (error) {
        console.error("Error deleting", error);
    }
  };

  const seedData = async () => {
    if (!user) return;
    const batch = writeBatch(db);
    // Seed Transactions
    const collectionRef = collection(db, 'artifacts', appId, 'users', user.uid, 'transactions');
    const mockData = [
      { amount: 320, categoryId: 'food', note: 'Starbucks Coffee', daysAgo: 0 },
      { amount: 1250, categoryId: 'shopping', note: 'Amazon Purchase', daysAgo: 1 },
    ];
    mockData.forEach(d => {
        const cat = CATEGORIES.find(c => c.id === d.categoryId);
        const docRef = doc(collectionRef);
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - d.daysAgo);
        batch.set(docRef, {
            amount: d.amount,
            categoryId: cat.id,
            categoryName: cat.name,
            categoryColor: cat.color,
            date: pastDate, 
            note: d.note,
            type: 'expense',
            splits: {}
        });
    });

    // Seed Debts
    const debtsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'debts');
    const mockDebts = [
        { name: 'Rohan', amount: 80, type: 'owed' },
        { name: 'Alice', amount: 500, type: 'owe' }
    ];
    mockDebts.forEach(d => {
        const docRef = doc(debtsRef);
        batch.set(docRef, {
            name: d.name,
            amount: d.amount,
            type: d.type,
            status: 'pending',
            date: new Date()
        });
    });

    await batch.commit();
  };

  const getAnalyticsData = () => {
    const now = new Date();
    const start = new Date();
    if (timeRange === 'week') start.setDate(now.getDate() - 7);
    else if (timeRange === 'month') { start.setMonth(now.getMonth() - 1); start.setHours(0,0,0,0); } 
    else if (timeRange === 'year') start.setFullYear(now.getFullYear() - 1);

    const filtered = transactions.filter(tx => {
       const txDate = tx.date.toDate ? tx.date.toDate() : new Date(tx.date);
       return txDate >= start;
    });

    const totalFilteredSpent = filtered.reduce((acc, tx) => acc + Number(tx.amount), 0);
    const categoryMap = {};
    filtered.forEach(tx => {
      if (!categoryMap[tx.categoryId]) {
        categoryMap[tx.categoryId] = { ...CATEGORIES.find(c => c.id === tx.categoryId), value: 0 };
      }
      categoryMap[tx.categoryId].value += Number(tx.amount);
    });

    const categoryBreakdown = Object.values(categoryMap)
      .map(cat => ({ ...cat, percentage: ((cat.value / totalFilteredSpent) * 100).toFixed(1) }))
      .sort((a, b) => b.value - a.value);

    let rangeBudget = USER_SETTINGS.monthlyBudget; 
    if (timeRange === 'week') rangeBudget = USER_SETTINGS.monthlyBudget / 4;
    if (timeRange === 'year') rangeBudget = USER_SETTINGS.monthlyBudget * 12;

    const today = new Date();
    const todaySpent = transactions
      .filter(tx => {
         const d = tx.date.toDate ? tx.date.toDate() : new Date(tx.date);
         return d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
      })
      .reduce((acc, tx) => acc + Number(tx.amount), 0);

    return { totalSpent: totalFilteredSpent, budget: rangeBudget, saved: Math.max(rangeBudget - totalFilteredSpent, 0), categoryBreakdown, todaySpent };
  };

  const analyticsData = useMemo(() => getAnalyticsData(), [transactions, timeRange]);
  const dashboardChartData = analyticsData.categoryBreakdown; 
  
  // Helpers
  const handleFriendToggle = (friend) => {
      setSelectedFriends(prev => 
         prev.includes(friend) ? prev.filter(f => f !== friend) : [...prev, friend]
      );
  };
  const handleCustomAmountChange = (friend, val) => {
      setCustomAmounts(prev => ({ ...prev, [friend]: val }));
  };


  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-indigo-600" size={48}/></div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-xl">
          <div className="flex justify-center mb-6"><div className="bg-indigo-100 p-3 rounded-full"><CreditCard className="text-indigo-600" size={32} /></div></div>
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">MyFinance</h1>
          <form onSubmit={handleAuth} className="space-y-4">
            <input type="email" required className="w-full px-4 py-2 rounded-lg border border-gray-300" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="password" required className="w-full px-4 py-2 rounded-lg border border-gray-300" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            {authError && <p className="text-red-500 text-sm">{authError}</p>}
            <button type="submit" className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl">{isLogin ? 'Sign In' : 'Create Account'}</button>
          </form>
          <div className="mt-6 text-center"><button onClick={() => setIsLogin(!isLogin)} className="text-sm text-indigo-600">{isLogin ? "Sign Up" : "Sign In"}</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans text-gray-900 max-w-md mx-auto shadow-2xl overflow-hidden relative border-x border-gray-200">
      
      {/* Top Bar */}
      <div className="bg-white px-6 pt-12 pb-4 flex justify-between items-center sticky top-0 z-30 shadow-sm">
        <div>
           {activeTab === 'analytics' ? (
             <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
           ) : activeTab === 'debts' ? (
             <h1 className="text-2xl font-bold text-gray-900">Debts</h1>
           ) : activeTab === 'chat' ? (
             <h1 className="text-2xl font-bold text-indigo-600 flex items-center gap-2">
                 <Bot size={28} /> Dost AI
             </h1>
           ) : (
             <>
               <h2 className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total Balance</h2>
               <h1 className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(stats.remaining - stats.totalSpent)}</h1>
             </>
           )}
        </div>
        {activeTab === 'analytics' ? (
           <div className="bg-gray-100 rounded-lg p-1 flex">
              {['week', 'month', 'year'].map(range => (
                <button key={range} onClick={() => setTimeRange(range)} className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-all ${timeRange === range ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>{range}</button>
              ))}
           </div>
        ) : (
          <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold">{user.email[0].toUpperCase()}</div>
        )}
      </div>

      <div className="px-4 py-6 space-y-6">
        
        {/* --- Dashboard Tab --- */}
        {activeTab === 'dashboard' && (
          <>
            <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-lg shadow-indigo-200 mb-6 relative overflow-hidden">
                <div className="relative z-10">
                    <p className="opacity-80 text-sm font-medium mb-1">Available to Spend</p>
                    <h2 className="text-3xl font-bold">{formatCurrency(stats.remaining - stats.totalSpent)}</h2>
                </div>
                <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-8 -mt-8 blur-2xl"></div>
            </div>

            <div className="flex gap-4 mb-6">
                <button onClick={() => { setIsAddModalOpen(true); setIsSplit(false); }} className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:bg-gray-50 transition">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                        <Plus size={20} />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">Add Expense</span>
                </button>
                <button onClick={() => { setIsAddModalOpen(true); setIsSplit(true); }} className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:bg-gray-50 transition">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                        <Users size={20} />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">Split Bill</span>
                </button>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-gray-800">Spend Analysis</h3></div>
              <DonutChart data={dashboardChartData} centerText={formatCurrency(stats.totalSpent)} subText="Spent" />
            </div>
            
            {/* Quick Debts Preview */}
            {debts.filter(d => d.status === 'pending').length > 0 && (
                <div className="mt-6">
                    <div className="flex justify-between items-center px-2 mb-3">
                        <h3 className="font-bold text-lg text-gray-800">Pending Debts</h3>
                        <button onClick={() => setActiveTab('debts')} className="text-indigo-600 text-sm font-medium">View All</button>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                        {debts.filter(d => d.status === 'pending').map(debt => (
                            <div key={debt.id} className="min-w-[140px] bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                <p className="text-xs text-gray-500 mb-1">{debt.type === 'owed' ? 'Owed by' : 'You owe'}</p>
                                <p className="font-bold text-gray-800 truncate">{debt.name}</p>
                                <p className={`font-bold ${debt.type === 'owed' ? 'text-green-600' : 'text-red-500'}`}>{formatCurrency(debt.amount)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </>
        )}

        {/* --- Chat Tab --- */}
        {activeTab === 'chat' && (
            <div className="flex flex-col h-[calc(100vh-220px)]">
                 <div className="flex-1 overflow-y-auto space-y-4 px-2 pb-4 scrollbar-hide">
                     {chatMessages.map(msg => (
                         <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                             <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                                 msg.sender === 'user' 
                                 ? 'bg-indigo-600 text-white rounded-br-none' 
                                 : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                             }`}>
                                 {msg.text}
                             </div>
                         </div>
                     ))}
                     <div ref={chatEndRef} />
                 </div>
                 
                 <div className="mt-4">
                    <form onSubmit={handleSendMessage} className="relative">
                        <input 
                            type="text" 
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Ask Dost about your budget..."
                            className="w-full bg-white border border-gray-200 rounded-full pl-5 pr-12 py-4 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                        <button type="submit" className="absolute right-2 top-2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors">
                            <Send size={18} />
                        </button>
                    </form>
                 </div>
            </div>
        )}

        {/* --- NEW: Debts Tab --- */}
        {activeTab === 'debts' && (
            <div className="h-full">
                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-6">
                    <button 
                        onClick={() => setDebtTab('owe')}
                        className={`flex-1 pb-3 text-sm font-bold transition-colors ${debtTab === 'owe' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400'}`}
                    >
                        You Owe
                    </button>
                    <button 
                        onClick={() => setDebtTab('owed')}
                        className={`flex-1 pb-3 text-sm font-bold transition-colors ${debtTab === 'owed' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400'}`}
                    >
                        Owed To You
                    </button>
                </div>

                {/* Debt List */}
                <div className="space-y-4 pb-20">
                    {debts.filter(d => d.type === debtTab && d.status !== 'paid').map(debt => (
                        <div key={debt.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900">{debt.name}</h3>
                                    <p className={`text-2xl font-bold mt-1 ${debtTab === 'owed' ? 'text-indigo-600' : 'text-orange-600'}`}>
                                        {formatCurrency(debt.amount)}
                                    </p>
                                </div>
                                <span className="bg-orange-100 text-orange-600 text-xs font-bold px-2 py-1 rounded-md">Pending</span>
                            </div>
                            
                            <div className="flex gap-3">
                                {debtTab === 'owed' && (
                                    <button 
                                        onClick={() => { setSelectedDebtForReminder(debt); setIsReminderModalOpen(true); }}
                                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition"
                                    >
                                        <Bell size={16} /> Reminder
                                    </button>
                                )}
                                <button 
                                    onClick={() => handleMarkPaid(debt.id)}
                                    className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl font-semibold text-sm transition"
                                >
                                    Mark Paid
                                </button>
                            </div>
                        </div>
                    ))}
                    
                    {debts.filter(d => d.type === debtTab && d.status !== 'paid').length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                            <Banknote size={48} className="mx-auto mb-3 opacity-20" />
                            <p>No pending debts in this category.</p>
                        </div>
                    )}
                </div>

                {/* Floating Add Button */}
                <button 
                    onClick={() => setIsDebtModalOpen(true)}
                    className="fixed bottom-24 right-6 bg-gray-900 text-white px-5 py-3 rounded-full shadow-lg flex items-center gap-2 font-semibold hover:bg-black transition-transform active:scale-95"
                >
                    <Plus size={20} /> Add Debt
                </button>
            </div>
        )}

        {/* --- Transactions Tab --- */}
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            {transactions.map((tx) => (
                <div key={tx.id} className="bg-white p-4 rounded-2xl shadow-sm space-y-3">
                  <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 text-gray-600">
                        {CATEGORIES.find(c => c.name === tx.categoryName)?.icon || <CreditCard size={18}/>}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                            <h4 className="font-bold text-gray-800 text-sm">{tx.note || tx.categoryName}</h4>
                            <span className="font-bold text-gray-900">{formatCurrency(tx.amount)}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{formatDate(tx.date)}</p>
                      </div>
                      <button onClick={() => handleDeleteTransaction(tx.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 size={16} />
                      </button>
                  </div>
                </div>
            ))}
          </div>
        )}

        {/* --- Analytics Tab --- */}
        {activeTab === 'analytics' && (
             <div className="space-y-6">
                 <div className="bg-white p-6 rounded-3xl shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wider">Spending Overview</h3>
                    <DonutChart data={analyticsData.categoryBreakdown} centerText={formatCurrency(analyticsData.saved)} subText={`saved out of ${formatCurrency(analyticsData.budget)}`}/>
                    <div className="mt-6 flex flex-wrap gap-2 justify-center">
                        {analyticsData.categoryBreakdown.map((cat) => (
                            <div key={cat.id} className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }}></div><span className="text-xs text-gray-600 font-medium">{cat.name}</span>
                            </div>
                        ))}
                    </div>
                 </div>
                 <div className="bg-white p-6 rounded-3xl shadow-sm">
                     <h3 className="font-bold text-gray-800 mb-6 text-sm uppercase tracking-wider">Category Details</h3>
                     <div className="space-y-6">
                         {analyticsData.categoryBreakdown.map((cat) => (
                             <div key={cat.id}>
                                 <div className="flex justify-between items-center mb-2">
                                     <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div><span className="text-sm font-semibold text-gray-700">{cat.name}</span></div>
                                     <div className="text-right"><span className="block text-sm font-bold text-gray-900">{formatCurrency(cat.value)}</span><span className="text-xs text-gray-400">{cat.percentage}%</span></div>
                                 </div>
                                 <ProgressBar value={cat.value} max={analyticsData.totalSpent} colorClass="bg-indigo-500" />
                             </div>
                         ))}
                     </div>
                 </div>
             </div>
        )}

        {/* --- Settings Tab --- */}
        {activeTab === 'settings' && (
            <div className="space-y-4">
                <div className="bg-white p-6 rounded-3xl shadow-sm flex items-center gap-4">
                     <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xl font-bold">{user.email[0].toUpperCase()}</div>
                     <div><h3 className="font-bold text-lg">{user.displayName || 'User'}</h3><p className="text-sm text-gray-500">{user.email}</p></div>
                </div>
                <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
                    <button onClick={seedData} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 border-b border-gray-100">
                        <div className="flex items-center gap-3"><ArrowDownLeft size={18} className="text-gray-400" /><span className="text-sm font-medium text-indigo-600">Seed Demo Data</span></div>
                    </button>
                    <button onClick={() => signOut(auth)} className="w-full flex items-center justify-between p-4 hover:bg-red-50 text-red-600">
                        <div className="flex items-center gap-3"><LogOut size={18} /><span className="text-sm font-medium">Sign Out</span></div>
                    </button>
                </div>
            </div>
        )}

      </div>

      {/* --- MODAL 1: Add Expense / Split --- */}
      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => { setIsAddModalOpen(false); setActiveTab('dashboard'); setSelectedFriends([]); setCustomAmounts({}); }}
        title={isSplit ? "Split Expense" : "Add Expense"}
      >
        <div className="space-y-6">
            <div className="relative">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-3xl font-bold text-gray-400">₹</span>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="w-full pl-8 py-2 text-4xl font-bold text-gray-900 border-b-2 border-gray-200 focus:border-indigo-600 outline-none placeholder-gray-200" autoFocus />
            </div>

            {!isSplit && (
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Category</label>
                    <div className="grid grid-cols-3 gap-3">
                        {CATEGORIES.map(cat => (
                            <button key={cat.id} onClick={() => setSelectedCategory(cat)} className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all ${selectedCategory.id === cat.id ? 'bg-indigo-50 border-2 border-indigo-500 shadow-sm' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}>
                                <div style={{ color: cat.color }} className="mb-1">{cat.icon}</div>
                                <span className="text-[10px] font-medium text-gray-600">{cat.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="bg-gray-50 p-4 rounded-xl flex items-center justify-between cursor-pointer" onClick={() => setIsSplit(!isSplit)}>
                <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-full shadow-sm text-indigo-600"><Users size={18} /></div>
                    <div><span className="block text-sm font-bold text-gray-800">Split this expense</span><span className="text-xs text-gray-500">Share cost with friends</span></div>
                </div>
                <div className={`w-12 h-7 rounded-full transition-colors relative ${isSplit ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform ${isSplit ? 'left-6' : 'left-1'}`}></div>
                </div>
            </div>

            {isSplit && (
                <div className="bg-indigo-50 p-4 rounded-xl space-y-4 animate-in slide-in-from-top-2">
                    <div className="flex bg-white rounded-lg p-1 shadow-sm">
                        <button onClick={() => setSplitMethod('equal')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${splitMethod === 'equal' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500'}`}>Equal Split</button>
                        <button onClick={() => setSplitMethod('custom')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${splitMethod === 'custom' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500'}`}>Custom Amount</button>
                    </div>
                    <div className="space-y-3">
                         <p className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Select Friends</p>
                         {MOCK_FRIENDS.map(friend => {
                             const isSelected = selectedFriends.includes(friend);
                             const peopleCount = selectedFriends.length + 1; // You + Friends
                             const equalShare = (amount && peopleCount > 0) ? (amount / peopleCount).toFixed(0) : 0;
                             
                             return (
                                 <div key={friend} className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${isSelected ? 'bg-white shadow-sm' : 'hover:bg-indigo-100/50'}`}>
                                     <button onClick={() => handleFriendToggle(friend)} className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 bg-white'}`}>{isSelected && <Check size={12} />}</button>
                                     <span className={`text-sm flex-1 ${isSelected ? 'font-bold text-indigo-900' : 'text-gray-600'}`}>{friend}</span>
                                     {isSelected && (
                                         <div className="w-24">
                                            {splitMethod === 'equal' ? (
                                                <div className="text-right text-sm font-bold text-gray-400">₹{equalShare}</div>
                                            ) : (
                                                <input type="number" placeholder="0" value={customAmounts[friend] || ''} onChange={(e) => handleCustomAmountChange(friend, e.target.value)} className="w-full text-right bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm font-bold focus:border-indigo-500 outline-none" />
                                            )}
                                         </div>
                                     )}
                                 </div>
                             );
                         })}
                    </div>
                </div>
            )}
            <button onClick={handleAddTransaction} disabled={!amount} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2">
                <Check size={20} />
                {isSplit ? 'Save Split & Add Debts' : 'Save Expense'}
            </button>
        </div>
      </Modal>

      {/* --- MODAL 2: Add Debt Manual --- */}
      <Modal 
        isOpen={isDebtModalOpen} 
        onClose={() => setIsDebtModalOpen(false)}
        title="Add Debt"
      >
        <div className="space-y-4">
             <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Person Name</label>
                <input type="text" value={debtName} onChange={(e) => setDebtName(e.target.value)} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Rohan" />
             </div>
             <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Amount</label>
                <input type="number" value={debtAmount} onChange={(e) => setDebtAmount(e.target.value)} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="0" />
             </div>
             <div className="flex bg-gray-100 rounded-lg p-1">
                <button onClick={() => setDebtType('owed')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${debtType === 'owed' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500'}`}>Owes Me</button>
                <button onClick={() => setDebtType('owe')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${debtType === 'owe' ? 'bg-white shadow-sm text-red-500' : 'text-gray-500'}`}>I Owe</button>
             </div>
             <button onClick={handleAddDebt} className="w-full bg-black text-white py-3 rounded-xl font-bold mt-2">Save Debt</button>
        </div>
      </Modal>

      {/* --- MODAL 3: WhatsApp Reminder --- */}
      {isReminderModalOpen && selectedDebtForReminder && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">Send Reminder?</h3>
                  <p className="text-gray-500 text-sm mb-4">To {selectedDebtForReminder.name} • {formatCurrency(selectedDebtForReminder.amount)}</p>
                  
                  <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-700 italic border border-gray-100 mb-6">
                      "Hey, just reminding you about the {formatCurrency(selectedDebtForReminder.amount)} you owe me 😊"
                  </div>

                  <div className="space-y-3">
                      <button 
                        onClick={handleSendWhatsApp}
                        className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
                      >
                          <MessageCircle size={20} fill="white" /> Send via WhatsApp
                      </button>
                      <button 
                        onClick={() => setIsReminderModalOpen(false)}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl"
                      >
                          Cancel
                      </button>
                  </div>
              </div>
          </div>
      )}

      <BottomNav activeTab={activeTab} onTabChange={(id) => { if(id === 'add') { setIsAddModalOpen(true); } else { setActiveTab(id); } }} />

    </div>
  );
}