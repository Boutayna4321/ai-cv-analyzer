import { useEffect, useState } from 'react';

const API_BASE = 'http://localhost:5000/api';

function App() {
  const [mode, setMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [cvFile, setCvFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      fetchProfile(storedToken);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchHistory();
    } else {
      setHistory([]);
    }
  }, [token]);

  const fetchProfile = async (authToken = token) => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.data);
      } else {
        throw new Error(data.message || 'Erreur profil');
      }
    } catch (error) {
      console.error(error);
      handleLogout();
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/cv/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setHistory(data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleAuthSubmit = (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const endpoint = mode === 'login' ? 'login' : 'register';
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authForm.email)) {
      setMessage('Email invalide');
      setLoading(false);
      return;
    }
    if (mode === 'register' && (!authForm.name || authForm.name.trim().length < 2)) {
      setMessage('Le nom doit contenir au moins 2 caractères');
      setLoading(false);
      return;
    }
    if (!authForm.password || authForm.password.length < 6) {
      setMessage('Le mot de passe doit contenir au moins 6 caractères');
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/auth/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authForm)
    })
      .then(res => res.json())
      .then(data => {
        if (data.data && data.data.token) {
          setToken(data.data.token);
          localStorage.setItem('token', data.data.token);
          setUser(data.data.user);
          setMessage('Connecté avec succès');
        } else {
          throw new Error(data.message || 'Erreur authentification');
        }
      })
      .catch(error => {
        setMessage(error.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleUpload = (event) => {
    event.preventDefault();
    if (!cvFile) {
      setMessage('Sélectionnez un fichier PDF');
      return;
    }

    setLoading(true);
    setMessage('');

    if (cvFile.type !== 'application/pdf') {
      setMessage('Seuls les fichiers PDF sont autorisés');
      setLoading(false);
      return;
    }
    const maxSize = 5242880;
    if (cvFile.size > maxSize) {
      setMessage('Le fichier est trop volumineux (max 5MB)');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('cv', cvFile);

    fetch(`${API_BASE}/cv/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          setAnalysis(data.data);
          setMessage('Analyse terminée');
          fetchHistory();
        } else {
          throw new Error(data.message || 'Erreur analyse');
        }
      })
      .catch(error => {
        setMessage(error.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setAnalysis(null);
    setHistory([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-12">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
              AI CV Analyzer
            </h1>
            <p className="text-slate-400 text-lg">Analyse instantanée et optimisation de CV</p>
          </div>
          {user && (
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-lg rounded-full px-6 py-3 border border-white/20">
              <span className="font-medium">{user.name}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                user.planType === 'premium' 
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-slate-900' 
                  : 'bg-white/20 text-white'
              }`}>
                {user.planType}
              </span>
              <button 
                onClick={handleLogout}
                className="ml-2 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200 text-sm font-medium"
              >
                Déconnexion
              </button>
            </div>
          )}
        </header>

        {/* Auth Section */}
        {!user && (
          <div className="max-w-md mx-auto">
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
              <div className="flex gap-2 mb-6 bg-white/5 rounded-xl p-1">
                <button
                  className={`flex-1 py-3 rounded-lg font-semibold transition-all duration-300 ${
                    mode === 'login' 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg' 
                      : 'hover:bg-white/10'
                  }`}
                  onClick={() => setMode('login')}
                >
                  Connexion
                </button>
                <button
                  className={`flex-1 py-3 rounded-lg font-semibold transition-all duration-300 ${
                    mode === 'register' 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg' 
                      : 'hover:bg-white/10'
                  }`}
                  onClick={() => setMode('register')}
                >
                  Inscription
                </button>
              </div>

              <div className="space-y-4">
                {mode === 'register' && (
                  <input
                    type="text"
                    placeholder="Nom complet"
                    value={authForm.name}
                    onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50 transition-all duration-200"
                  />
                )}
                <input
                  type="email"
                  placeholder="Email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50 transition-all duration-200"
                />
                <input
                  type="password"
                  placeholder="Mot de passe"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50 transition-all duration-200"
                />
                <button
                  onClick={handleAuthSubmit}
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {loading ? 'Veuillez patienter...' : mode === 'login' ? 'Se connecter' : 'Créer un compte'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Section */}
        {user && (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
              <h2 className="text-2xl font-bold mb-2">Analyser un CV</h2>
              <p className="text-slate-400 mb-6">Plan gratuit : 3 analyses / mois. Plan premium : illimité.</p>
              
              <div className="space-y-4">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50 transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-indigo-500 file:to-purple-600 file:text-white file:font-semibold file:cursor-pointer hover:file:from-indigo-600 hover:file:to-purple-700"
                />
                <button
                  onClick={handleUpload}
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {loading ? 'Analyse en cours...' : 'Lancer l\'analyse'}
                </button>
              </div>
            </div>

            {/* Results Section */}
            {analysis && (
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
                <h2 className="text-2xl font-bold mb-6">Résultat de l'analyse</h2>
                
                <div className="mb-8 p-6 bg-gradient-to-r from-indigo-500/20 to-purple-600/20 rounded-xl border border-indigo-400/30">
                  <div className="text-5xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    {analysis.score}/100
                  </div>
                  <div className="text-slate-400 mt-1">Score global</div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                    <h3 className="text-lg font-bold mb-4 text-green-400">✓ Points forts</h3>
                    <ul className="space-y-2">
                      {analysis.strengths?.map((item, idx) => (
                        <li key={idx} className="text-slate-300 pl-4 border-l-2 border-green-400/50">{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                    <h3 className="text-lg font-bold mb-4 text-orange-400">⚠ Points faibles</h3>
                    <ul className="space-y-2">
                      {analysis.weaknesses?.map((item, idx) => (
                        <li key={idx} className="text-slate-300 pl-4 border-l-2 border-orange-400/50">{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                    <h3 className="text-lg font-bold mb-4 text-blue-400">+ Compétences manquantes</h3>
                    <ul className="space-y-2">
                      {analysis.missingSkills?.map((item, idx) => (
                        <li key={idx} className="text-slate-300 pl-4 border-l-2 border-blue-400/50">{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* History Section */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
              <h2 className="text-2xl font-bold mb-6">Historique récent</h2>
              
              {history.length === 0 ? (
                <p className="text-slate-400 text-center py-8">Aucune analyse pour le moment.</p>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <div key={item._id} className="bg-white/5 rounded-xl p-5 border border-white/10 hover:bg-white/10 transition-all duration-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-lg mb-1">{item.originalFileName}</h4>
                          <div className="flex gap-4 text-sm text-slate-400">
                            <span>Score : <span className="font-semibold text-purple-400">{item.score || '—'}</span></span>
                            <span>Statut : <span className="font-semibold">{item.status}</span></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Toast Message */}
        {message && (
          <div className="fixed bottom-6 right-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl px-6 py-4 shadow-2xl animate-pulse">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;