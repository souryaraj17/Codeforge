import React, { useState, useEffect, useMemo, useRef } from 'react';
// import jsQR from 'jsqr'; // UNCOMMENT FOR LOCAL USE: npm install jsqr
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
  setDoc,
  getDoc,
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
  ChevronRight,
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
  Wallet,
  Camera,
  Info,
  Edit2,
  Save,
  User,
  Phone,
  Mail,
  Edit3,
  ScanLine,
  Image as ImageIcon,
  Video,
  QrCode
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

// --- Helper: Mock jsQR for Preview (Remove when using real library) ---
const jsQR = (data, width, height) => {
    // Simulate scanning success randomly for preview purposes
    if (Math.random() > 0.98) {
        return { data: JSON.stringify({ amount: 150, note: "Scanned Receipt" }) };
    }
    return null;
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
    { id: 'chat', icon: <MessageCircle size={20} />, label: 'Chat' }, // Kept here as well for accessibility
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
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

// 5. QR Scanner Component (New)
const QRScanner = ({ onScan, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scanError, setScanError] = useState('');

  // Camera Logic
  useEffect(() => {
    let animationFrameId;
    
    const tick = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          stopCamera();
          onScan(code.data);
        }
      }
      if (isCameraActive) {
        animationFrameId = requestAnimationFrame(tick);
      }
    };

    if (isCameraActive) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.setAttribute('playsinline', true); // required to tell iOS safari we don't want fullscreen
            videoRef.current.play();
            requestAnimationFrame(tick);
          }
        })
        .catch(err => {
          console.error("Camera Error", err);
          setScanError('Unable to access camera. Try uploading an image.');
          setIsCameraActive(false);
        });
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      stopCamera();
    };
  }, [isCameraActive]);

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code) {
          onScan(code.data);
        } else {
          setScanError('No QR code found in image.');
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative w-full aspect-square bg-gray-100 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center">
        {!isCameraActive && (
           <div className="text-center p-4">
              <ScanLine size={48} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">{scanError || "Ready to Scan"}</p>
           </div>
        )}
        <video ref={videoRef} className={`absolute inset-0 w-full h-full object-cover ${!isCameraActive ? 'hidden' : ''}`} />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="grid grid-cols-2 gap-3 w-full">
        <button 
          onClick={() => { setIsCameraActive(true); setScanError(''); }}
          className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-colors ${isCameraActive ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}
        >
           {isCameraActive ? <><X size={18}/> Stop</> : <><Video size={18}/> Camera</>}
        </button>
        <label className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold bg-gray-100 text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors">
           <ImageIcon size={18}/> Upload
           <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </label>
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
  const [friends, setFriends] = useState([]);
  const [userSettings, setUserSettings] = useState({ monthlyBudget: 10000, dailyLimit: 500 });
  const [appSettings, setAppSettings] = useState({ notifications: true, camera: true });
  const [stats, setStats] = useState({ totalSpent: 0, remaining: 10000 });

  // UI State
  const [chatMessages, setChatMessages] = useState([{ id: 1, text: "Hi! I'm Dost 🤖. How can I help?", sender: 'bot' }]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);
  const [debtTab, setDebtTab] = useState('owed'); 
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [selectedDebtForReminder, setSelectedDebtForReminder] = useState(null);
  const [timeRange, setTimeRange] = useState('month'); 
  const [isFriendModalOpen, setIsFriendModalOpen] = useState(false);
  const [editingFriend, setEditingFriend] = useState(null);
  const [isEditBalanceModalOpen, setIsEditBalanceModalOpen] = useState(false);
  const [newBudget, setNewBudget] = useState('');
  
  // QR State
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

  // Form State
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [note, setNote] = useState('');
  
  // Debt Form
  const [debtName, setDebtName] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [debtType, setDebtType] = useState('owed');
  
  // Friend Form
  const [friendName, setFriendName] = useState('');
  const [friendPhone, setFriendPhone] = useState('');
  const [friendEmail, setFriendEmail] = useState('');

  // Profile Form
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
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
      if (currentUser) {
          setProfileName(currentUser.displayName || '');
          setProfileEmail(currentUser.email || '');
      }
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
    
    // Listeners
    const configRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config');
    const unsubConfig = onSnapshot(configRef, (docSnap) => {
        if (docSnap.exists()) {
            setUserSettings(docSnap.data());
        } else {
            setDoc(configRef, { monthlyBudget: 10000, dailyLimit: 500 }); 
        }
    });

    const prefsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'preferences');
    const unsubPrefs = onSnapshot(prefsRef, (docSnap) => {
        if (docSnap.exists()) setAppSettings(docSnap.data());
        else setDoc(prefsRef, { notifications: true, camera: true });
    });

    const friendsQuery = query(collection(db, 'artifacts', appId, 'users', user.uid, 'friends'), orderBy('name'));
    const unsubFriends = onSnapshot(friendsQuery, (snap) => {
        setFriends(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qTx = query(collection(db, 'artifacts', appId, 'users', user.uid, 'transactions'), orderBy('date', 'desc'), limit(100));
    const unsubTx = onSnapshot(qTx, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTransactions(txs);
    });

    const qDebts = query(collection(db, 'artifacts', appId, 'users', user.uid, 'debts'), orderBy('date', 'desc'));
    const unsubDebts = onSnapshot(qDebts, (snapshot) => {
      const d = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDebts(d);
    });

    return () => { unsubTx(); unsubDebts(); unsubConfig(); unsubPrefs(); unsubFriends(); };
  }, [user]);

  useEffect(() => {
      const total = transactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
      setStats({ totalSpent: total, remaining: userSettings.monthlyBudget });
  }, [transactions, userSettings]);

  // --- Handlers ---

  const handleQRScanResult = (data) => {
      try {
          // Try parsing as JSON
          const parsed = JSON.parse(data);
          if (parsed.amount) setAmount(String(parsed.amount));
          if (parsed.note) setNote(parsed.note);
          // Could look up category too if provided
          alert("✅ QR Code Scanned! Details filled.");
      } catch (e) {
          // If not JSON, check if it's a simple number or just text
          if (!isNaN(data)) {
              setAmount(data);
              alert("✅ Number detected! Amount filled.");
          } else {
              setNote(data); // Assume it's a note/description
              alert("✅ Text detected! Note filled.");
          }
      }
      setIsQRScannerOpen(false);
      setIsAddModalOpen(true);
  };

  const handleToggleSetting = async (key) => {
    if (!user) return;
    const newValue = !appSettings[key];
    setAppSettings(prev => ({ ...prev, [key]: newValue }));
    try {
       const settingsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'preferences');
       await setDoc(settingsRef, { ...appSettings, [key]: newValue }, { merge: true });
    } catch (err) {
       setAppSettings(prev => ({ ...prev, [key]: !newValue }));
    }
  };

  const handleSaveProfile = async () => {
      try {
          await updateProfile(user, { displayName: profileName });
          setIsEditingProfile(false);
      } catch (err) { console.error(err); }
  };

  const handleSaveBudget = async () => {
      try {
          const configRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config');
          await setDoc(configRef, userSettings, { merge: true });
          alert("Budget updated!");
      } catch (err) { console.error(err); }
  };

  const handleSaveBudgetFromModal = async () => {
      const val = parseInt(newBudget);
      if (!val || val < 0) return;
      try {
          const configRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config');
          await setDoc(configRef, { ...userSettings, monthlyBudget: val }, { merge: true });
          setIsEditBalanceModalOpen(false);
      } catch (err) { console.error(err); }
  };

  const handleSaveFriend = async () => {
      if (!friendName || !friendPhone) {
          alert("Name and Phone are required");
          return;
      }
      try {
          const friendData = { name: friendName, phone: friendPhone, email: friendEmail, updatedAt: serverTimestamp() };
          if (editingFriend) {
              await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'friends', editingFriend.id), friendData);
          } else {
              await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'friends'), { ...friendData, createdAt: serverTimestamp() });
          }
          setIsFriendModalOpen(false);
          setEditingFriend(null);
          setFriendName(''); setFriendPhone(''); setFriendEmail('');
      } catch (err) { console.error(err); }
  };

  const handleDeleteFriend = async (id) => {
      if(!confirm("Delete this friend?")) return;
      try {
          await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'friends', id));
      } catch (err) { console.error(err); }
  };

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
        
        const totalPeople = selectedFriends.length + 1; 
        
        if (splitMethod === 'equal') {
            const perPerson = val / totalPeople; 
            selectedFriends.forEach(friendName => {
                finalSplits[friendName] = parseFloat(perPerson.toFixed(2));
            });
        } else {
             selectedFriends.forEach(friendName => {
                finalSplits[friendName] = parseFloat(customAmounts[friendName] || 0);
             });
             const friendsTotal = Object.values(finalSplits).reduce((a,b) => a+b, 0);
             if (friendsTotal > val) {
                alert(`Friend shares (₹${friendsTotal}) cannot exceed total amount (₹${val}).`);
                return;
             }
        }
    }
    
    try {
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

      if (isSplit) {
        const batch = writeBatch(db);
        Object.entries(finalSplits).forEach(([friendName, debtAmount]) => {
            if (debtAmount > 0) {
                const debtRef = doc(collection(db, 'artifacts', appId, 'users', user.uid, 'debts'));
                batch.set(debtRef, {
                    name: friendName,
                    amount: debtAmount,
                    type: 'owed',
                    status: 'pending',
                    date: serverTimestamp()
                });
            }
        });
        await batch.commit();
      }

      setAmount(''); setNote(''); setIsSplit(false); setSelectedFriends([]); setCustomAmounts({}); setIsAddModalOpen(false);
    } catch (error) { console.error("Error adding doc", error); }
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
          setDebtName(''); setDebtAmount(''); setIsDebtModalOpen(false);
      } catch (err) { console.error("Error adding debt", err); }
  };

  const handleMarkPaid = async (id) => {
      try { await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'debts', id), { status: 'paid' }); } catch(err) { console.error(err); }
  };

  const handleDeleteTransaction = async (id) => {
    if (!confirm("Are you sure you want to delete this?")) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'transactions', id)); } catch (error) { console.error(error); }
  };

  const seedData = async () => {
    if (!user) return;
    const batch = writeBatch(db);
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
    await batch.commit();
  };

  const localReply = (msg) => {
    msg = msg.toLowerCase();
    if (msg.includes('left') || msg.includes('balance')) return `You have ${formatCurrency(stats.remaining - stats.totalSpent)} left.`;
    if (msg.includes('spent')) return `Spent: ${formatCurrency(stats.totalSpent)}.`;
    return 'I can help with budgets and spending tips.';
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = { id: Date.now(), text: chatInput, sender: 'user' };
    setChatMessages(prev => [...prev, userMsg]);
    const botResponseText = localReply(chatInput);
    setChatInput('');
    setTimeout(() => { setChatMessages(prev => [...prev, { id: Date.now() + 1, text: botResponseText, sender: 'bot' }]); }, 600);
  };

  // --- Analytics Helpers ---
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

    let rangeBudget = userSettings.monthlyBudget; 
    if (timeRange === 'week') rangeBudget = userSettings.monthlyBudget / 4;
    if (timeRange === 'year') rangeBudget = userSettings.monthlyBudget * 12;

    return { totalSpent: totalFilteredSpent, budget: rangeBudget, saved: Math.max(rangeBudget - totalFilteredSpent, 0), categoryBreakdown };
  };

  const analyticsData = useMemo(() => getAnalyticsData(), [transactions, timeRange, userSettings]);
  const dashboardChartData = analyticsData.categoryBreakdown; 
  
  const handleFriendToggle = (friendName) => {
      setSelectedFriends(prev => prev.includes(friendName) ? prev.filter(f => f !== friendName) : [...prev, friendName]);
  };
  const handleCustomAmountChange = (friendName, val) => {
      setCustomAmounts(prev => ({ ...prev, [friendName]: val }));
  };
  const handleSendWhatsApp = () => {
      if (!selectedDebtForReminder) return;
      const message = `Hey, just reminding you about the ₹${selectedDebtForReminder.amount} you owe me 😊`;
      const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
      setIsReminderModalOpen(false);
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
      
      {/* --- Global QR Scanner Modal --- */}
      {isQRScannerOpen && (
          <div className="fixed inset-0 z-[110] bg-white flex flex-col p-4 animate-in slide-in-from-bottom">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg">Scan Receipt / QR</h3>
                  <button onClick={() => setIsQRScannerOpen(false)} className="p-2 bg-gray-100 rounded-full"><X size={20}/></button>
              </div>
              <QRScanner onScan={handleQRScanResult} onClose={() => setIsQRScannerOpen(false)} />
          </div>
      )}

      <div className="bg-white px-6 pt-12 pb-4 flex justify-between items-center sticky top-0 z-30 shadow-sm">
        <div>
           {activeTab === 'analytics' ? <h1 className="text-2xl font-bold text-gray-900">Analytics</h1> :
            activeTab === 'debts' ? <h1 className="text-2xl font-bold text-gray-900">Debts</h1> :
            activeTab === 'settings' ? <h1 className="text-2xl font-bold text-gray-900">Settings</h1> :
            activeTab === 'chat' ? <h1 className="text-2xl font-bold text-indigo-600 flex items-center gap-2"><Bot size={28} /> Dost AI</h1> :
             <>
               <h2 className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total Balance</h2>
               <h1 className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(stats.remaining - stats.totalSpent)}</h1>
             </>
           }
        </div>
        {activeTab === 'analytics' ? (
           <div className="bg-gray-100 rounded-lg p-1 flex">
              {['week', 'month', 'year'].map(range => (
                <button key={range} onClick={() => setTimeRange(range)} className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-all ${timeRange === range ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>{range}</button>
              ))}
           </div>
        ) : (
          <div className="flex items-center gap-3">
              {/* QR Code Icon */}
              <button 
                onClick={() => setIsQRScannerOpen(true)} 
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                title="Scan QR Code"
              >
                  <QrCode size={24} />
              </button>
              
              {/* Chatbot Icon */}
              <button 
                onClick={() => setActiveTab('chat')} 
                className={`p-2 rounded-full transition-colors ${activeTab === 'chat' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-600 hover:bg-gray-100'}`}
                title="Dost AI Chat"
              >
                  <MessageCircle size={24} />
              </button>

              <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold">
                  {user.email ? user.email[0].toUpperCase() : 'U'}
              </div>
          </div>
        )}
      </div>

      <div className="px-4 py-6 space-y-6">
        
        {/* --- Dashboard Tab --- */}
        {activeTab === 'dashboard' && (
          <>
            <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-lg shadow-indigo-200 mb-6 relative overflow-hidden group">
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <p className="opacity-80 text-sm font-medium mb-1">Available to Spend</p>
                        <h2 className="text-3xl font-bold">{formatCurrency(stats.remaining - stats.totalSpent)}</h2>
                    </div>
                    <button 
                        onClick={() => { setNewBudget(userSettings.monthlyBudget); setIsEditBalanceModalOpen(true); }}
                        className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors"
                    >
                        <Edit2 size={18} className="text-white" />
                    </button>
                </div>
                <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-8 -mt-8 blur-2xl"></div>
            </div>

            <div className="flex gap-4 mb-6">
                <button onClick={() => { setIsAddModalOpen(true); setIsSplit(false); }} className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:bg-gray-50 transition"><div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600"><Plus size={20} /></div><span className="text-sm font-semibold text-gray-700">Add Expense</span></button>
                <button onClick={() => { setIsAddModalOpen(true); setIsSplit(true); }} className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:bg-gray-50 transition"><div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600"><Users size={20} /></div><span className="text-sm font-semibold text-gray-700">Split Bill</span></button>
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
                             <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${msg.sender === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'}`}>{msg.text}</div>
                         </div>
                     ))}
                     <div ref={chatEndRef} />
                 </div>
                 <div className="mt-4">
                    <form onSubmit={handleSendMessage} className="relative">
                        <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask Dost about your budget..." className="w-full bg-white border border-gray-200 rounded-full pl-5 pr-12 py-4 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                        <button type="submit" className="absolute right-2 top-2 p-2 bg-indigo-600 text-white rounded-full"><Send size={18} /></button>
                    </form>
                 </div>
            </div>
        )}

        {/* --- Debts Tab --- */}
        {activeTab === 'debts' && (
            <div className="h-full">
                <div className="flex border-b border-gray-200 mb-6">
                    <button onClick={() => setDebtTab('owe')} className={`flex-1 pb-3 text-sm font-bold transition-colors ${debtTab === 'owe' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400'}`}>You Owe</button>
                    <button onClick={() => setDebtTab('owed')} className={`flex-1 pb-3 text-sm font-bold transition-colors ${debtTab === 'owed' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400'}`}>Owed To You</button>
                </div>
                <div className="space-y-4 pb-20">
                    {debts.filter(d => d.type === debtTab && d.status !== 'paid').map(debt => (
                        <div key={debt.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start mb-4">
                                <div><h3 className="font-bold text-lg text-gray-900">{debt.name}</h3><p className={`text-2xl font-bold mt-1 ${debtTab === 'owed' ? 'text-indigo-600' : 'text-orange-600'}`}>{formatCurrency(debt.amount)}</p></div>
                                <span className="bg-orange-100 text-orange-600 text-xs font-bold px-2 py-1 rounded-md">Pending</span>
                            </div>
                            <div className="flex gap-3">
                                {debtTab === 'owed' && (
                                    <button onClick={() => { setSelectedDebtForReminder(debt); setIsReminderModalOpen(true); }} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"><Bell size={16} /> Reminder</button>
                                )}
                                <button onClick={() => handleMarkPaid(debt.id)} className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl font-semibold text-sm">Mark Paid</button>
                            </div>
                        </div>
                    ))}
                    {debts.filter(d => d.type === debtTab && d.status !== 'paid').length === 0 && (
                        <div className="text-center py-12 text-gray-400"><Banknote size={48} className="mx-auto mb-3 opacity-20" /><p>No pending debts.</p></div>
                    )}
                </div>
                <button onClick={() => setIsDebtModalOpen(true)} className="fixed bottom-24 right-6 bg-gray-900 text-white px-5 py-3 rounded-full shadow-lg flex items-center gap-2 font-semibold hover:bg-black active:scale-95"><Plus size={20} /> Add Debt</button>
            </div>
        )}

        {/* --- Transactions Tab --- */}
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            {transactions.map((tx) => (
                <div key={tx.id} className="bg-white p-4 rounded-2xl shadow-sm space-y-3">
                  <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 text-gray-600">{CATEGORIES.find(c => c.name === tx.categoryName)?.icon || <CreditCard size={18}/>}</div>
                      <div className="flex-1">
                        <div className="flex justify-between"><h4 className="font-bold text-gray-800 text-sm">{tx.note || tx.categoryName}</h4><span className="font-bold text-gray-900">{formatCurrency(tx.amount)}</span></div>
                        <p className="text-xs text-gray-400 mt-1">{formatDate(tx.date)}</p>
                      </div>
                      <button onClick={() => handleDeleteTransaction(tx.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>
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
            <div className="space-y-6">
                {/* Profile Card */}
                <div className="bg-white p-6 rounded-3xl shadow-sm">
                     <div className="flex items-center justify-between mb-4">
                         <h3 className="font-bold text-gray-900 text-lg">Profile</h3>
                         <button onClick={() => setIsEditingProfile(!isEditingProfile)} className="text-indigo-600 text-sm font-medium">
                             {isEditingProfile ? 'Cancel' : 'Edit'}
                         </button>
                     </div>
                     {isEditingProfile ? (
                         <div className="space-y-3">
                             <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg text-sm" placeholder="Your Name" />
                             <input type="email" value={profileEmail} disabled className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500" placeholder="Email (read-only)" />
                             <button onClick={handleSaveProfile} className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium">Save Changes</button>
                         </div>
                     ) : (
                         <div className="flex items-center gap-4">
                             <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xl font-bold">{profileName ? profileName[0].toUpperCase() : 'U'}</div>
                             <div>
                                 <h3 className="font-bold text-lg">{profileName || 'User'}</h3>
                                 <p className="text-sm text-gray-500">{profileEmail}</p>
                             </div>
                         </div>
                     )}
                </div>

                {/* Budget Settings */}
                <div className="bg-white p-5 rounded-3xl shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-gray-900 text-lg">Budget Settings</h3>
                        <button onClick={handleSaveBudget} className="text-green-600 text-xs font-bold uppercase flex items-center gap-1"><Save size={14}/> Save</button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Monthly Budget</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-gray-400 text-sm">₹</span>
                                <input type="number" value={userSettings.monthlyBudget} onChange={(e) => setUserSettings({...userSettings, monthlyBudget: parseInt(e.target.value) || 0})} className="w-full pl-6 py-2 bg-gray-50 rounded-lg text-sm font-bold outline-none focus:ring-1 focus:ring-indigo-500" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Daily Limit</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-gray-400 text-sm">₹</span>
                                <input type="number" value={userSettings.dailyLimit} onChange={(e) => setUserSettings({...userSettings, dailyLimit: parseInt(e.target.value) || 0})} className="w-full pl-6 py-2 bg-gray-50 rounded-lg text-sm font-bold outline-none focus:ring-1 focus:ring-indigo-500" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Friends Management */}
                <div className="bg-white p-5 rounded-3xl shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-900 text-lg">Friends</h3>
                        <button onClick={() => { setIsFriendModalOpen(true); setEditingFriend(null); setFriendName(''); setFriendPhone(''); setFriendEmail(''); }} className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Plus size={14}/> Add</button>
                    </div>
                    <div className="space-y-3">
                        {friends.map(f => (
                            <div key={f.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg group">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">{f.name[0]}</div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800">{f.name}</p>
                                        <p className="text-xs text-gray-400">{f.phone}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditingFriend(f); setFriendName(f.name); setFriendPhone(f.phone); setFriendEmail(f.email || ''); setIsFriendModalOpen(true); }} className="p-1 text-gray-400 hover:text-indigo-600"><Edit2 size={14} /></button>
                                    <button onClick={() => handleDeleteFriend(f.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))}
                        {friends.length === 0 && <p className="text-center text-gray-400 text-xs py-2">No friends added yet.</p>}
                    </div>
                </div>

                {/* App Preferences */}
                <div className="bg-white p-5 rounded-3xl shadow-sm space-y-6">
                    <h3 className="font-bold text-gray-900 text-lg">App Preferences</h3>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600"><Bell size={20} /></div>
                            <div><p className="font-semibold text-gray-900 text-sm">Notifications</p><p className="text-gray-500 text-xs">Get reminders and updates</p></div>
                        </div>
                        <button onClick={() => handleToggleSetting('notifications')} className={`w-12 h-7 rounded-full transition-colors relative ${appSettings.notifications ? 'bg-green-500' : 'bg-gray-200'}`}><div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-1 transition-all ${appSettings.notifications ? 'left-6' : 'left-1'}`} /></button>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600"><Camera size={20} /></div>
                            <div><p className="font-semibold text-gray-900 text-sm">Camera Scanner</p><p className="text-gray-500 text-xs">Scan receipts and QR codes</p></div>
                        </div>
                        <button onClick={() => handleToggleSetting('camera')} className={`w-12 h-7 rounded-full transition-colors relative ${appSettings.camera ? 'bg-green-500' : 'bg-gray-200'}`}><div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-1 transition-all ${appSettings.camera ? 'left-6' : 'left-1'}`} /></button>
                    </div>
                </div>

                {/* About & Logout */}
                <div className="bg-white p-4 rounded-3xl shadow-sm space-y-2">
                    <h3 className="font-bold text-gray-900 text-lg px-2 pt-2">About</h3>
                    <button className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl transition-colors">
                        <div className="flex items-center gap-3"><Info size={20} className="text-gray-400"/><span className="text-sm font-medium text-gray-700">About MyFinance</span></div><ChevronRight size={16} className="text-gray-400" />
                    </button>
                    <div className="h-px bg-gray-100 my-1 mx-2"></div>
                    <button onClick={seedData} className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl transition-colors">
                        <div className="flex items-center gap-3"><ArrowDownLeft size={20} className="text-gray-400"/><span className="text-sm font-medium text-gray-700">Seed Demo Data</span></div><ChevronRight size={16} className="text-gray-400" />
                    </button>
                    <div className="h-px bg-gray-100 my-1 mx-2"></div>
                    <button onClick={() => signOut(auth)} className="w-full flex items-center gap-3 p-2 text-red-600 font-medium text-sm hover:bg-red-50 rounded-xl transition-colors"><LogOut size={20} /> Sign Out</button>
                </div>
                <p className="text-center text-xs text-gray-400 pb-4">Version 1.0.2</p>
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
                
                {/* QR Scan Button - Inside Modal (Optional, since we have a global one now) */}
                <button 
                    onClick={() => setIsQRScannerOpen(true)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                    title="Scan QR Code"
                >
                    <ScanLine size={24} />
                </button>
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
                <div className="flex items-center gap-3"><div className="bg-white p-2 rounded-full shadow-sm text-indigo-600"><Users size={18} /></div><div><span className="block text-sm font-bold text-gray-800">Split this expense</span><span className="text-xs text-gray-500">Share cost with friends</span></div></div>
                <div className={`w-12 h-7 rounded-full transition-colors relative ${isSplit ? 'bg-indigo-600' : 'bg-gray-300'}`}><div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform ${isSplit ? 'left-6' : 'left-1'}`}></div></div>
            </div>

            {isSplit && (
                <div className="bg-indigo-50 p-4 rounded-xl space-y-4 animate-in slide-in-from-top-2">
                    <div className="flex bg-white rounded-lg p-1 shadow-sm">
                        <button onClick={() => setSplitMethod('equal')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${splitMethod === 'equal' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500'}`}>Equal Split</button>
                        <button onClick={() => setSplitMethod('custom')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${splitMethod === 'custom' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500'}`}>Custom Amount</button>
                    </div>
                    <div className="space-y-3">
                         <p className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Select Friends</p>
                         {friends.length === 0 ? (
                             <div className="text-center py-4">
                                 <p className="text-sm text-indigo-700 mb-2">No friends added yet.</p>
                                 <button onClick={() => { setIsAddModalOpen(false); setActiveTab('settings'); }} className="text-xs font-bold underline text-indigo-600">Go to Settings to add friends</button>
                             </div>
                         ) : (
                             friends.map(friend => {
                                 const isSelected = selectedFriends.includes(friend.name);
                                 const peopleCount = selectedFriends.length + 1; 
                                 const equalShare = (amount && peopleCount > 0) ? (amount / peopleCount).toFixed(0) : 0;
                                 
                                 return (
                                     <div key={friend.id} className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${isSelected ? 'bg-white shadow-sm' : 'hover:bg-indigo-100/50'}`}>
                                         <button onClick={() => handleFriendToggle(friend.name)} className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 bg-white'}`}>{isSelected && <Check size={12} />}</button>
                                         <span className={`text-sm flex-1 ${isSelected ? 'font-bold text-indigo-900' : 'text-gray-600'}`}>{friend.name}</span>
                                         {isSelected && (
                                             <div className="w-24">
                                                {splitMethod === 'equal' ? <div className="text-right text-sm font-bold text-gray-400">₹{equalShare}</div> : 
                                                <input type="number" placeholder="0" value={customAmounts[friend.name] || ''} onChange={(e) => handleCustomAmountChange(friend.name, e.target.value)} className="w-full text-right bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm font-bold focus:border-indigo-500 outline-none" />}
                                             </div>
                                         )}
                                     </div>
                                 );
                             })
                         )}
                    </div>
                </div>
            )}
            <button onClick={handleAddTransaction} disabled={!amount} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2"><Check size={20} />{isSplit ? 'Save Split & Add Debts' : 'Save Expense'}</button>
        </div>
      </Modal>

      {/* --- MODAL 2: Add Debt Manual --- */}
      <Modal 
        isOpen={isDebtModalOpen} 
        onClose={() => setIsDebtModalOpen(false)}
        title="Add Debt"
      >
        <div className="space-y-4">
             <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Person Name</label><input type="text" value={debtName} onChange={(e) => setDebtName(e.target.value)} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Rohan" /></div>
             <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Amount</label><input type="number" value={debtAmount} onChange={(e) => setDebtAmount(e.target.value)} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="0" /></div>
             <div className="flex bg-gray-100 rounded-lg p-1">
                <button onClick={() => setDebtType('owed')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${debtType === 'owed' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500'}`}>Owes Me</button>
                <button onClick={() => setDebtType('owe')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${debtType === 'owe' ? 'bg-white shadow-sm text-red-500' : 'text-gray-500'}`}>I Owe</button>
             </div>
             <button onClick={handleAddDebt} className="w-full bg-black text-white py-3 rounded-xl font-bold mt-2">Save Debt</button>
        </div>
      </Modal>

      {/* --- MODAL 3: Add/Edit Friend --- */}
      <Modal
        isOpen={isFriendModalOpen}
        onClose={() => { setIsFriendModalOpen(false); setEditingFriend(null); setFriendName(''); setFriendPhone(''); setFriendEmail(''); }}
        title={editingFriend ? "Edit Friend" : "Add Friend"}
      >
          <div className="space-y-4">
              <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Name</label>
                  <div className="relative">
                      <User size={16} className="absolute left-3 top-3 text-gray-400" />
                      <input type="text" value={friendName} onChange={(e) => setFriendName(e.target.value)} className="w-full pl-10 py-2 bg-gray-50 rounded-lg text-sm border border-gray-100 focus:border-indigo-500 outline-none" placeholder="Friend's Name" />
                  </div>
              </div>
              <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Phone</label>
                  <div className="relative">
                      <Phone size={16} className="absolute left-3 top-3 text-gray-400" />
                      <input type="tel" value={friendPhone} onChange={(e) => setFriendPhone(e.target.value)} className="w-full pl-10 py-2 bg-gray-50 rounded-lg text-sm border border-gray-100 focus:border-indigo-500 outline-none" placeholder="Mobile Number" />
                  </div>
              </div>
              <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email (Optional)</label>
                  <div className="relative">
                      <Mail size={16} className="absolute left-3 top-3 text-gray-400" />
                      <input type="email" value={friendEmail} onChange={(e) => setFriendEmail(e.target.value)} className="w-full pl-10 py-2 bg-gray-50 rounded-lg text-sm border border-gray-100 focus:border-indigo-500 outline-none" placeholder="friend@example.com" />
                  </div>
              </div>
              <button onClick={handleSaveFriend} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold mt-2">{editingFriend ? 'Update Friend' : 'Add Friend'}</button>
          </div>
      </Modal>

      {/* --- MODAL 4: WhatsApp Reminder --- */}
      {isReminderModalOpen && selectedDebtForReminder && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">Send Reminder?</h3>
                  <p className="text-gray-500 text-sm mb-4">To {selectedDebtForReminder.name} • {formatCurrency(selectedDebtForReminder.amount)}</p>
                  <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-700 italic border border-gray-100 mb-6">"Hey, just reminding you about the {formatCurrency(selectedDebtForReminder.amount)} you owe me 😊"</div>
                  <div className="space-y-3">
                      <button onClick={handleSendWhatsApp} className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95"><MessageCircle size={20} fill="white" /> Send via WhatsApp</button>
                      <button onClick={() => setIsReminderModalOpen(false)} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl">Cancel</button>
                  </div>
              </div>
          </div>
      )}

      {/* --- MODAL 5: Edit Balance (Update Budget) --- */}
      <Modal
        isOpen={isEditBalanceModalOpen}
        onClose={() => setIsEditBalanceModalOpen(false)}
        title="Update Monthly Budget"
      >
          <div className="space-y-6">
              <div className="text-center">
                  <p className="text-gray-500 text-sm mb-2">Current Budget</p>
                  <h2 className="text-3xl font-bold text-indigo-600">{formatCurrency(userSettings.monthlyBudget)}</h2>
              </div>
              
              <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">New Budget Amount</label>
                  <div className="relative">
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 text-3xl font-bold text-gray-400">₹</span>
                      <input 
                        type="number" 
                        value={newBudget} 
                        onChange={(e) => setNewBudget(e.target.value)} 
                        placeholder="0" 
                        className="w-full pl-8 py-2 text-4xl font-bold text-gray-900 border-b-2 border-gray-200 focus:border-indigo-600 outline-none placeholder-gray-200" 
                        autoFocus 
                      />
                  </div>
              </div>

              <button onClick={handleSaveBudgetFromModal} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold mt-2 hover:bg-indigo-700 transition">Update Balance</button>
          </div>
      </Modal>

      <BottomNav activeTab={activeTab} onTabChange={(id) => { if(id === 'add') { setIsAddModalOpen(true); } else { setActiveTab(id); } }} />

    </div>
  );
}