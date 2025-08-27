import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import './App.css';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      // Verify token and get user info
      getCurrentUser();
    }
  }, [token]);

  const getCurrentUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      logout();
    }
  };

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { access_token, user: userData } = response.data;
    
    localStorage.setItem('token', access_token);
    setToken(access_token);
    setUser(userData);
    
    return userData;
  };

  const signup = async (userData) => {
    const response = await axios.post(`${API}/auth/signup`, userData);
    const { access_token, user: newUser } = response.data;
    
    localStorage.setItem('token', access_token);
    setToken(access_token);
    setUser(newUser);
    
    return newUser;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, signup, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

// Icon Components
const CameraIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 17C14.7614 17 17 14.7614 17 12C17 9.23858 14.7614 7 12 7C9.23858 7 7 9.23858 7 12C7 14.7614 9.23858 17 12 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const UploadIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 2.58579 20.4142C2.21071 20.0391 2 19.5304 2 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17 8L12 3L7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const UserIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const StatsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 3V21H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 9L12 6L16 10L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const TrophyIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 9H4.5C3.11929 9 2 10.1193 2 11.5C2 12.8807 3.11929 14 4.5 14H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18 9H19.5C20.8807 9 22 10.1193 22 11.5C22 12.8807 20.8807 14 19.5 14H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 9V14C6 16.2091 7.79086 18 10 18H14C16.2091 18 18 16.2091 18 14V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 9V6C6 4.34315 7.34315 3 9 3H15C16.6569 3 18 4.34315 18 6V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 21V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 21H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const AnalyticsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 20V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18 20V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 20V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Achievement notification component
const AchievementNotification = ({ achievements, onClose }) => {
  useEffect(() => {
    if (achievements.length > 0) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [achievements, onClose]);

  if (achievements.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {achievements.map((achievement) => (
        <div key={achievement.id} className="bg-gradient-button text-white p-4 rounded-lg shadow-lg max-w-sm">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">{achievement.badge_icon}</span>
            <div>
              <div className="font-semibold">{achievement.name} Unlocked!</div>
              <div className="text-sm opacity-90">{achievement.description}</div>
              <div className="text-xs opacity-75">+{achievement.points} points</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Login/Signup Component
const AuthScreen = () => {
  const { login, signup } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    age: '',
    gender: 'male',
    height_cm: '',
    weight_kg: '',
    activity_level: 'moderately_active',
    goal: 'maintain',
    goal_weight_kg: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        const signupData = {
          ...formData,
          age: parseInt(formData.age),
          height_cm: parseFloat(formData.height_cm),
          weight_kg: parseFloat(formData.weight_kg),
          goal_weight_kg: formData.goal_weight_kg ? parseFloat(formData.goal_weight_kg) : null
        };
        await signup(signupData);
      }
    } catch (error) {
      alert(error.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="heading-2 text-center mb-6">
            {isLogin ? 'Welcome Back' : 'Join CaloriePro'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block body-small text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block body-small text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>

            {!isLogin && (
              <>
                <div>
                  <label className="block body-small text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block body-small text-gray-700 mb-1">Age</label>
                    <input
                      type="number"
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.age}
                      onChange={(e) => setFormData({...formData, age: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block body-small text-gray-700 mb-1">Gender</label>
                    <select
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.gender}
                      onChange={(e) => setFormData({...formData, gender: e.target.value})}
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block body-small text-gray-700 mb-1">Height (cm)</label>
                    <input
                      type="number"
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.height_cm}
                      onChange={(e) => setFormData({...formData, height_cm: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block body-small text-gray-700 mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.weight_kg}
                      onChange={(e) => setFormData({...formData, weight_kg: e.target.value})}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block body-small text-gray-700 mb-1">Activity Level</label>
                  <select
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.activity_level}
                    onChange={(e) => setFormData({...formData, activity_level: e.target.value})}
                  >
                    <option value="sedentary">Sedentary (little or no exercise)</option>
                    <option value="lightly_active">Lightly Active (light exercise 1-3 days/week)</option>
                    <option value="moderately_active">Moderately Active (moderate exercise 3-5 days/week)</option>
                    <option value="very_active">Very Active (hard exercise 6-7 days/week)</option>
                    <option value="extremely_active">Extremely Active (very hard exercise, physical job)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block body-small text-gray-700 mb-1">Goal</label>
                  <select
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.goal}
                    onChange={(e) => setFormData({...formData, goal: e.target.value})}
                  >
                    <option value="lose">Lose Weight</option>
                    <option value="maintain">Maintain Weight</option>
                    <option value="gain">Gain Weight</option>
                  </select>
                </div>
              </>
            )}
            
            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Sign Up')}
            </button>
          </form>
          
          <p className="text-center mt-4 body-small">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 hover:underline"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, isAuthenticated, logout, token } = useAuth();
  const [currentView, setCurrentView] = useState('camera');
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [dailyStats, setDailyStats] = useState(null);
  const [foodEntries, setFoodEntries] = useState([]);
  const [streaks, setStreaks] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [weeklyAnalytics, setWeeklyAnalytics] = useState([]);
  const [monthlyAnalytics, setMonthlyAnalytics] = useState([]);
  const [analyticsSummary, setAnalyticsSummary] = useState(null);
  const [newAchievements, setNewAchievements] = useState([]);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserData();
    }
  }, [isAuthenticated, user]);

  const loadUserData = async () => {
    if (!user) return;
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Load daily stats
      const statsResponse = await axios.get(`${API}/users/${user.id}/daily-stats`, { headers });
      setDailyStats(statsResponse.data);
      
      // Load today's food entries
      const today = new Date().toISOString().split('T')[0];
      const entriesResponse = await axios.get(`${API}/users/${user.id}/food-entries?date_filter=${today}`, { headers });
      setFoodEntries(entriesResponse.data);
      
      // Load streaks
      const streaksResponse = await axios.get(`${API}/users/${user.id}/streaks`, { headers });
      setStreaks(streaksResponse.data);
      
      // Load achievements
      const achievementsResponse = await axios.get(`${API}/users/${user.id}/achievements`, { headers });
      setAchievements(achievementsResponse.data);
      
      // Load analytics data
      if (currentView === 'analytics') {
        await loadAnalytics();
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadAnalytics = async () => {
    if (!user) return;
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Load weekly analytics
      const weeklyResponse = await axios.get(`${API}/users/${user.id}/analytics/weekly`, { headers });
      setWeeklyAnalytics(weeklyResponse.data);
      
      // Load monthly analytics
      const monthlyResponse = await axios.get(`${API}/users/${user.id}/analytics/monthly`, { headers });
      setMonthlyAnalytics(monthlyResponse.data);
      
      // Load summary
      const summaryResponse = await axios.get(`${API}/users/${user.id}/analytics/summary`, { headers });
      setAnalyticsSummary(summaryResponse.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Error accessing camera. Please allow camera permissions or use file upload.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      setCameraActive(false);
    }
  };

  const capturePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (canvas && video) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        const reader = new FileReader();
        reader.onload = () => {
          setCapturedImage(reader.result);
          stopCamera();
        };
        reader.readAsDataURL(blob);
      });
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeFood = async () => {
    if (!capturedImage) return;
    
    setIsAnalyzing(true);
    try {
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('file', blob, 'food_image.jpg');
      
      const analysisResponse = await axios.post(`${API}/analyze-food`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      
      setAnalysisResult(analysisResponse.data);
    } catch (error) {
      console.error('Error analyzing food:', error);
      alert('Error analyzing food. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const logFood = async () => {
    if (!analysisResult || !user) return;
    
    try {
      const formData = new FormData();
      formData.append('user_id', user.id);
      formData.append('food_name', analysisResult.food_name);
      formData.append('calories_per_100g', analysisResult.calories_per_100g);
      formData.append('protein_per_100g', analysisResult.protein_per_100g);
      formData.append('carbs_per_100g', analysisResult.carbs_per_100g || 0);
      formData.append('fat_per_100g', analysisResult.fat_per_100g || 0);
      formData.append('estimated_portion_g', analysisResult.estimated_portion_g);
      formData.append('total_calories', analysisResult.total_calories);
      formData.append('total_protein', analysisResult.total_protein);
      formData.append('image_base64', analysisResult.image_base64);
      formData.append('analysis_confidence', analysisResult.confidence);
      
      const response = await axios.post(`${API}/food-entries`, formData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Check for new achievements
      if (response.data.newly_unlocked_achievements && response.data.newly_unlocked_achievements.length > 0) {
        setNewAchievements(response.data.newly_unlocked_achievements);
      }
      
      // Refresh data
      loadUserData();
      
      // Reset states
      setCapturedImage(null);
      setAnalysisResult(null);
      
      alert('Food logged successfully!');
    } catch (error) {
      console.error('Error logging food:', error);
      alert('Error logging food. Please try again.');
    }
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setAnalysisResult(null);
  };

  // Chart configurations
  const weeklyChartData = {
    labels: weeklyAnalytics.map(w => `Week of ${new Date(w.week_start).toLocaleDateString()}`),
    datasets: [
      {
        label: 'Average Calories',
        data: weeklyAnalytics.map(w => w.avg_calories),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        yAxisID: 'y',
      },
      {
        label: 'Average Protein (g)',
        data: weeklyAnalytics.map(w => w.avg_protein),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        yAxisID: 'y1',
      },
    ],
  };

  const weeklyChartOptions = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Week'
        }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Calories'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Protein (g)'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  const monthlyChartData = {
    labels: monthlyAnalytics.map(m => `${m.month} ${m.year}`),
    datasets: [
      {
        label: 'Days Logged',
        data: monthlyAnalytics.map(m => m.days_logged),
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
      {
        label: 'Goal Adherence %',
        data: monthlyAnalytics.map(m => m.goal_adherence),
        backgroundColor: 'rgba(255, 206, 86, 0.5)',
      },
    ],
  };

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Achievement Notifications */}
      <AchievementNotification 
        achievements={newAchievements}
        onClose={() => setNewAchievements([])}
      />

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="heading-3">CaloriePro</h1>
            <div className="flex items-center space-x-4">
              {streaks && (
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">🔥</span>
                  <span className="body-small text-gray-600">{streaks.current_streak} day streak</span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <span className="body-small text-gray-600">Hi, {user?.name}!</span>
                <button 
                  onClick={logout}
                  className="p-2 text-gray-600 hover:text-red-600"
                  title="Logout"
                >
                  <LogoutIcon />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex space-x-1">
            <button
              onClick={() => setCurrentView('camera')}
              className={`nav-link ${currentView === 'camera' ? 'bg-blue-50 text-blue-600' : ''}`}
            >
              <CameraIcon />
              <span className="ml-2">Scan Food</span>
            </button>
            <button
              onClick={() => setCurrentView('stats')}
              className={`nav-link ${currentView === 'stats' ? 'bg-blue-50 text-blue-600' : ''}`}
            >
              <StatsIcon />
              <span className="ml-2">Daily Stats</span>
            </button>
            <button
              onClick={() => { setCurrentView('achievements'); }}
              className={`nav-link ${currentView === 'achievements' ? 'bg-blue-50 text-blue-600' : ''}`}
            >
              <TrophyIcon />
              <span className="ml-2">Achievements</span>
            </button>
            <button
              onClick={() => { setCurrentView('analytics'); loadAnalytics(); }}
              className={`nav-link ${currentView === 'analytics' ? 'bg-blue-50 text-blue-600' : ''}`}
            >
              <AnalyticsIcon />
              <span className="ml-2">Analytics</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {currentView === 'camera' && (
          <div className="space-y-6">
            {/* Daily Summary Card */}
            {dailyStats && (
              <div className="service-card">
                <h3 className="service-card-title mb-4">Today's Progress</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="heading-4 text-blue-600">{dailyStats.total_calories}</div>
                    <div className="body-small text-gray-600">of {dailyStats.recommended_calories} calories</div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className={`h-2 rounded-full ${dailyStats.calorie_goal_met ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min((dailyStats.total_calories / dailyStats.recommended_calories) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="heading-4 text-green-600">{dailyStats.total_protein}g</div>
                    <div className="body-small text-gray-600">of {dailyStats.recommended_protein}g protein</div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className={`h-2 rounded-full ${dailyStats.protein_goal_met ? 'bg-green-500' : 'bg-orange-500'}`}
                        style={{ width: `${Math.min((dailyStats.total_protein / dailyStats.recommended_protein) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Camera/Upload Section */}
            <div className="service-card text-center">
              {!capturedImage ? (
                <>
                  <h3 className="service-card-title mb-4">Scan or Upload Food Image</h3>
                  
                  {!cameraActive ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button onClick={startCamera} className="btn-primary">
                          <CameraIcon />
                          <span className="ml-2">Take Photo</span>
                        </button>
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="btn-secondary"
                        >
                          <UploadIcon />
                          <span className="ml-2">Upload Image</span>
                        </button>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full max-w-md mx-auto rounded-lg"
                      />
                      <div className="flex gap-4 justify-center">
                        <button onClick={capturePhoto} className="btn-primary">
                          Capture Photo
                        </button>
                        <button onClick={stopCamera} className="btn-secondary">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <img
                    src={capturedImage}
                    alt="Captured food"
                    className="w-full max-w-md mx-auto rounded-lg"
                  />
                  
                  {!analysisResult ? (
                    <div className="flex gap-4 justify-center">
                      <button 
                        onClick={analyzeFood} 
                        disabled={isAnalyzing}
                        className="btn-primary"
                      >
                        {isAnalyzing ? 'Analyzing...' : 'Analyze Food'}
                      </button>
                      <button onClick={resetCapture} className="btn-secondary">
                        Retake
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-gray-50 rounded-lg p-4 text-left">
                        <h4 className="heading-4 mb-2">{analysisResult.food_name}</h4>
                        <div className="grid grid-cols-2 gap-2 body-small">
                          <div>Portion: {analysisResult.estimated_portion_g}g</div>
                          <div>Confidence: {analysisResult.confidence}</div>
                          <div>Calories: {analysisResult.total_calories}</div>
                          <div>Protein: {analysisResult.total_protein}g</div>
                        </div>
                      </div>
                      <div className="flex gap-4 justify-center">
                        <button onClick={logFood} className="btn-primary">
                          Log This Food
                        </button>
                        <button onClick={resetCapture} className="btn-secondary">
                          Start Over
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'stats' && (
          <div className="space-y-6">
            {/* Daily Stats */}
            {dailyStats && (
              <div className="service-card">
                <h3 className="service-card-title mb-4">Daily Nutrition Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="body-medium">Calories</span>
                    <span className="heading-4">{dailyStats.total_calories} / {dailyStats.recommended_calories}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${dailyStats.calorie_goal_met ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min((dailyStats.total_calories / dailyStats.recommended_calories) * 100, 100)}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="body-medium">Protein</span>
                    <span className="heading-4">{dailyStats.total_protein}g / {dailyStats.recommended_protein}g</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${dailyStats.protein_goal_met ? 'bg-green-500' : 'bg-orange-500'}`}
                      style={{ width: `${Math.min((dailyStats.total_protein / dailyStats.recommended_protein) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* Streak Information */}
            {streaks && (
              <div className="service-card">
                <h3 className="service-card-title mb-4">Your Streaks 🔥</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="heading-3 text-orange-600">{streaks.current_streak}</div>
                    <div className="body-small text-gray-600">Current Streak</div>
                  </div>
                  <div>
                    <div className="heading-3 text-purple-600">{streaks.longest_streak}</div>
                    <div className="body-small text-gray-600">Longest Streak</div>
                  </div>
                  <div>
                    <div className="heading-3 text-blue-600">{streaks.total_days_logged}</div>
                    <div className="body-small text-gray-600">Total Days</div>
                  </div>
                </div>
              </div>
            )}

            {/* Food Entries */}
            <div className="service-card">
              <h3 className="service-card-title mb-4">Today's Food Log</h3>
              {foodEntries.length > 0 ? (
                <div className="space-y-3">
                  {foodEntries.map((entry) => (
                    <div key={entry.id} className="border-b border-gray-200 pb-3 last:border-b-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="body-medium font-medium">{entry.food_name}</div>
                          <div className="body-small text-gray-600">
                            {entry.estimated_portion_g}g portion
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="body-small">{entry.total_calories} cal</div>
                          <div className="body-small text-gray-600">{entry.total_protein}g protein</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="body-medium text-gray-500 text-center py-4">
                  No food entries for today. Start scanning your meals!
                </p>
              )}
            </div>
          </div>
        )}

        {currentView === 'achievements' && (
          <div className="space-y-6">
            <div className="service-card">
              <h3 className="service-card-title mb-4">Your Achievements 🏆</h3>
              
              {achievements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {achievements.map((achievement) => (
                    <div key={achievement.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <span className="text-3xl">{achievement.badge_icon}</span>
                        <div className="flex-1">
                          <div className="body-medium font-semibold">{achievement.name}</div>
                          <div className="body-small text-gray-600">{achievement.description}</div>
                          <div className="flex justify-between items-center mt-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              achievement.rarity === 'platinum' ? 'bg-gray-900 text-white' :
                              achievement.rarity === 'gold' ? 'bg-yellow-500 text-white' :
                              achievement.rarity === 'silver' ? 'bg-gray-400 text-white' :
                              'bg-amber-600 text-white'
                            }`}>
                              {achievement.rarity.toUpperCase()}
                            </span>
                            <span className="body-small text-gray-500">+{achievement.points} pts</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <span className="text-6xl">🏆</span>
                  <p className="body-medium text-gray-500 mt-4">
                    No achievements yet. Start logging meals to unlock your first badge!
                  </p>
                </div>
              )}
            </div>

            {/* Achievement Progress Hints */}
            <div className="service-card">
              <h3 className="service-card-title mb-4">Next Milestones</h3>
              <div className="space-y-2">
                <div className="body-small text-gray-600">
                  🔥 Log meals for {Math.max(3 - (streaks?.current_streak || 0), 0)} more days to unlock "Three Day Warrior"
                </div>
                <div className="body-small text-gray-600">
                  💪 Meet your protein goal to unlock "Protein Seeker"
                </div>
                <div className="body-small text-gray-600">
                  📝 Log {Math.max(50 - (streaks?.total_days_logged || 0), 0)} more meals to become a "Dedicated Logger"
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'analytics' && (
          <div className="space-y-6">
            {/* Analytics Summary */}
            {analyticsSummary && (
              <div className="service-card">
                <h3 className="service-card-title mb-4">Analytics Overview</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="heading-3 text-blue-600">{analyticsSummary.total_entries}</div>
                    <div className="body-small text-gray-600">Total Entries</div>
                  </div>
                  <div className="text-center">
                    <div className="heading-3 text-orange-600">{analyticsSummary.current_streak}</div>
                    <div className="body-small text-gray-600">Current Streak</div>
                  </div>
                  <div className="text-center">
                    <div className="heading-3 text-purple-600">{analyticsSummary.total_achievements}</div>
                    <div className="body-small text-gray-600">Achievements</div>
                  </div>
                  <div className="text-center">
                    <div className="heading-3 text-green-600">{analyticsSummary.this_month_entries}</div>
                    <div className="body-small text-gray-600">This Month</div>
                  </div>
                </div>
              </div>
            )}

            {/* Weekly Trends Chart */}
            {weeklyAnalytics.length > 0 && (
              <div className="service-card">
                <h3 className="service-card-title mb-4">Weekly Nutrition Trends</h3>
                <div className="h-96">
                  <Line data={weeklyChartData} options={weeklyChartOptions} />
                </div>
              </div>
            )}

            {/* Monthly Consistency Chart */}
            {monthlyAnalytics.length > 0 && (
              <div className="service-card">
                <h3 className="service-card-title mb-4">Monthly Consistency</h3>
                <div className="h-96">
                  <Bar data={monthlyChartData} options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Count / Percentage'
                        }
                      }
                    }
                  }} />
                </div>
              </div>
            )}

            {/* Monthly Analytics Table */}
            {monthlyAnalytics.length > 0 && (
              <div className="service-card">
                <h3 className="service-card-title mb-4">Monthly Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b">
                        <th className="body-small text-gray-600 pb-2">Month</th>
                        <th className="body-small text-gray-600 pb-2">Days Logged</th>
                        <th className="body-small text-gray-600 pb-2">Avg Calories</th>
                        <th className="body-small text-gray-600 pb-2">Avg Protein</th>
                        <th className="body-small text-gray-600 pb-2">Goal Adherence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyAnalytics.map((month, index) => (
                        <tr key={index} className="border-b">
                          <td className="body-medium py-2">{month.month} {month.year}</td>
                          <td className="body-small py-2">{month.days_logged}</td>
                          <td className="body-small py-2">{month.avg_calories}</td>
                          <td className="body-small py-2">{month.avg_protein}g</td>
                          <td className="body-small py-2">{month.goal_adherence}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Hidden elements for camera functionality */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}

export default App;