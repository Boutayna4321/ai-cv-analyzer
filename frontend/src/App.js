import { useEffect, useState } from 'react';
import './App.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const endpoint = mode === 'login' ? 'login' : 'register';
      const res = await fetch(`${API_BASE}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Erreur authentification');
      }

      setToken(data.data.token);
      localStorage.setItem('token', data.data.token);
      setUser(data.data.user);
      setMessage('Connecté avec succès');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!cvFile) {
      setMessage('Sélectionnez un fichier PDF');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('cv', cvFile);

      const res = await fetch(`${API_BASE}/cv/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Erreur analyse');
      }

      setAnalysis(data.data);
      setMessage('Analyse terminée');
      fetchHistory();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setAnalysis(null);
    setHistory([]);
  };

  return (
    <div className="app-shell">
      <header>
        <div>
          <h1>AI CV Analyzer</h1>
          <p>Analyse instantanée et optimisation de CV</p>
        </div>
        {user ? (
          <div className="user-badge">
            <span>{user.name}</span>
            <span className={`plan ${user.planType}`}>{user.planType}</span>
            <button onClick={handleLogout}>Déconnexion</button>
          </div>
        ) : null}
      </header>

      {!user && (
        <section className="card auth">
          <div className="auth-toggle">
            <button
              className={mode === 'login' ? 'active' : ''}
              onClick={() => setMode('login')}
            >
              Connexion
            </button>
            <button
              className={mode === 'register' ? 'active' : ''}
              onClick={() => setMode('register')}
            >
              Inscription
            </button>
          </div>

          <form onSubmit={handleAuthSubmit}>
            {mode === 'register' && (
              <input
                type="text"
                placeholder="Nom complet"
                value={authForm.name}
                onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                required
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={authForm.email}
              onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
              required
            />
            <input
              type="password"
              placeholder="Mot de passe"
              value={authForm.password}
              onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Veuillez patienter...' : mode === 'login' ? 'Se connecter' : 'Créer un compte'}
            </button>
          </form>
        </section>
      )}

      {user && (
        <>
          <section className="card upload">
            <h2>Analyser un CV</h2>
            <p>Plan gratuit : 3 analyses / mois. Plan premium : illimité.</p>
            <form onSubmit={handleUpload}>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                required
              />
              <button type="submit" disabled={loading}>
                {loading ? 'Analyse en cours...' : 'Lancer l’analyse'}
              </button>
            </form>
          </section>

          {analysis && (
            <section className="card results">
              <h2>Résultat de l’analyse</h2>
              <div className="score">Score : {analysis.score}/100</div>
              <div className="grid">
                <div>
                  <h3>Points forts</h3>
                  <ul>
                    {analysis.strengths?.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3>Points faibles</h3>
                  <ul>
                    {analysis.weaknesses?.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3>Compétences manquantes</h3>
                  <ul>
                    {analysis.missingSkills?.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}

          <section className="card history">
            <h2>Historique récent</h2>
            <div className="history-list">
              {history.length === 0 && <p>Aucune analyse pour le moment.</p>}
              {history.map((item) => (
                <article key={item._id}>
                  <h4>{item.originalFileName}</h4>
                  <p>Score : {item.score || '—'}</p>
                  <p>Statut : {item.status}</p>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

  {message && <div className="toast">{message}</div>}
    </div>
  );
}

export default App;
