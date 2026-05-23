/* screens/app.jsx — Central App Container & Tweak Presets Showcase */

// Hook to manage reactive styling tweaks, matching fnb-agent tweak systems
function useTweaks(defaultVal) {
  const [tweaks, setTweaks] = React.useState(() => {
    try {
      const saved = localStorage.getItem('padel_tweaks');
      return saved ? JSON.parse(saved) : defaultVal;
    } catch (e) {
      return defaultVal;
    }
  });

  const setTweakValue = (key, val) => {
    setTweaks(prev => {
      const updated = { ...prev, [key]: val };
      localStorage.setItem('padel_tweaks', JSON.stringify(updated));
      return updated;
    });
  };

  return [tweaks, setTweakValue];
}

const TWEAK_DEFAULTS = {
  palette: ['#a3e635', '#65a30d'], // Court Neon Lime
  clubName: 'Nocturn Padel Club',
  clubEmoji: '🎾',
  refereeVoice: 'en-US', // Voice preference for vocal announcer
};

const PALETTES = [
  ['#a3e635', '#65a30d'], // Lime Green (Padel Default)
  ['#cb8064', '#a35a3f'], // Clay Terracotta (Tennis Clay)
  ['#38bdf8', '#0284c7'], // Ocean Blue (Hard Court)
  ['#c084fc', '#7c3aed'], // Wimbeldon Purple (Sunset Widescreen)
  ['#f43f5e', '#be123c'], // Crimson Flare
  ['#10b981', '#047857'], // Emerald Club
];

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [currentScreen, setCurrentScreen] = React.useState('dashboard'); // 'dashboard', 'setup', 'active-matches', 'interactive-scorer', 'leaderboard'
  const [viewMode, setViewMode] = React.useState('app'); // 'app' (Fullscreen) or 'canvas' (Design Showcase Artboards)
  
  // Active Tournament & Standalone Match States
  const [activeTournament, setActiveTournament] = React.useState(null);
  const [activeMatch, setActiveMatch] = React.useState(null); // Used for standalone game scoring
  const [activeTournamentMatch, setActiveTournamentMatch] = React.useState(null); // Used to hook active scorer back into the tournament
  const [tournamentHistory, setTournamentHistory] = React.useState([]);

  // Apply selected palette CSS variables to the document element
  React.useEffect(() => {
    const [p, d] = tweaks.palette;
    const r = document.documentElement;
    r.style.setProperty('--brand-primary', p);
    r.style.setProperty('--brand-dark', d);
    r.style.setProperty('--brand-light', hexToRgba(p, 0.12));
    r.style.setProperty('--brand-glow', hexToRgba(p, 0.40));
  }, [tweaks.palette]);

  // Load history on mount
  React.useEffect(() => {
    try {
      const savedHist = localStorage.getItem('padel_tournament_history');
      if (savedHist) setTournamentHistory(JSON.parse(savedHist));
      
      const savedActive = localStorage.getItem('padel_active_tournament');
      const savedActiveMatch = localStorage.getItem('padel_active_match');
      
      if (savedActive) {
        const parsed = JSON.parse(savedActive);
        // Self-Healing Bootloader Check:
        // Ensure parsed tournament exists and has a valid rounds array.
        // If it's legacy data without rounds, we purge it cleanly rather than crashing.
        if (parsed && Array.isArray(parsed.rounds)) {
          setActiveTournament(parsed);
          setCurrentScreen('active-matches');
        } else {
          console.warn("Detected legacy/corrupt active tournament state. Purging automatically.");
          localStorage.removeItem('padel_active_tournament');
        }
      } else if (savedActiveMatch) {
        const parsedMatch = JSON.parse(savedActiveMatch);
        if (parsedMatch && parsedMatch.score) {
          setActiveMatch(parsedMatch);
          setCurrentScreen('interactive-scorer');
        } else {
          localStorage.removeItem('padel_active_match');
        }
      }
    } catch(e) {
      console.error("Failed loading data from localStorage", e);
      try {
        localStorage.removeItem('padel_active_tournament');
        localStorage.removeItem('padel_active_match');
      } catch(_) {}
    }
  }, []);

  function hexToRgba(hex, a) {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0,2), 16);
    const g = parseInt(h.slice(2,4), 16);
    const b = parseInt(h.slice(4,6), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  // Helper to save active tournament state
  const updateTournamentState = (updated) => {
    setActiveTournament(updated);
    if (updated) {
      localStorage.setItem('padel_active_tournament', JSON.stringify(updated));
    } else {
      localStorage.removeItem('padel_active_tournament');
    }
  };

  const handleStartTournament = (config) => {
    updateTournamentState(config);
    setCurrentScreen('active-matches');
  };

  const handleBackToDashboard = () => {
    setCurrentScreen('dashboard');
  };

  // Renders the main active screen in Fullscreen App Mode
  // Safeguarded with a robust try/catch UI block to eliminate blank screens
  const renderActiveScreen = () => {
    try {
      switch (currentScreen) {
        case 'dashboard':
          return (
            <DashboardScreen 
              tweaks={tweaks}
              tournamentHistory={tournamentHistory}
              activeTournament={activeTournament}
              onNewTournament={() => setCurrentScreen('setup')}
              onResumeTournament={() => setCurrentScreen('active-matches')}
              onQuickMatch={() => {
                // Initiate a standalone default match structure
                setActiveMatch({
                  sport: 'padel',
                  teamA: ['Player 1', 'Player 2'],
                  teamB: ['Player 3', 'Player 4'],
                  scoringMode: 'tennis',
                  rules: {
                    setsFormat: 'best3', // best3, best4, best5, first3
                    advantageRule: 'goldenPoint',
                    tiebreakerTarget: 7,
                    gamesPerSet: 6
                  },
                  score: {
                    teamAScore: 0,
                    teamBScore: 0,
                    sets: [] // array of {teamA: number, teamB: number}
                  },
                  serving: 'teamA',
                  serverIndex: 0,
                  history: [],
                  completed: false
                });
                setCurrentScreen('interactive-scorer');
              }}
              onViewHistory={(tourney) => {
                // Open finalized scoreboard/rankings
                setActiveTournament(tourney);
                setCurrentScreen('leaderboard');
              }}
            />
          );
        case 'setup':
          return (
            <SetupScreen 
              tweaks={tweaks}
              onBack={handleBackToDashboard}
              onStart={handleStartTournament}
            />
          );
        case 'active-matches':
          return (
            <ActiveMatchesScreen 
              tweaks={tweaks}
              tournament={activeTournament}
              onBack={handleBackToDashboard}
              onCancelTournament={() => {
                if (confirm("Are you sure you want to end this tournament? Standings will be lost.")) {
                  updateTournamentState(null);
                  setCurrentScreen('dashboard');
                }
              }}
              onSelectMatch={(match, roundIndex, matchIndex) => {
                // Launch Scorer for this specific tournament match
                setActiveTournamentMatch({ roundIndex, matchIndex });
                
                // Map tournament match to activeMatch structure
                const playersA = [match.teamA.p1, match.teamA.p2];
                const playersB = [match.teamB.p1, match.teamB.p2];
                
                setActiveMatch({
                  isTournament: true,
                  sport: activeTournament.sport,
                  teamA: playersA,
                  teamB: playersB,
                  scoringMode: activeTournament.scoringMode, // 'points' or 'tennis'
                  rules: activeTournament.rules,
                  score: match.score || {
                    teamAScore: 0,
                    teamBScore: 0,
                    sets: []
                  },
                  serving: 'teamA',
                  serverIndex: 0,
                  history: [],
                  completed: match.completed
                });
                setCurrentScreen('interactive-scorer');
              }}
              onViewLeaderboard={() => setCurrentScreen('leaderboard')}
            />
          );
        case 'interactive-scorer':
          return (
            <InteractiveScorerScreen 
              tweaks={tweaks}
              match={activeMatch}
              onBack={() => {
                if (activeMatch.isTournament) {
                  setCurrentScreen('active-matches');
                } else {
                  setCurrentScreen('dashboard');
                }
                setActiveMatch(null);
                setActiveTournamentMatch(null);
              }}
              onSaveMatch={(finalScore, completed) => {
                if (activeMatch.isTournament) {
                  const { roundIndex, matchIndex } = activeTournamentMatch;
                  
                  // Clone rounds and matches immutably to trigger state change and re-render correctly
                  const updatedRounds = activeTournament.rounds.map((round, rIdx) => {
                    if (rIdx !== roundIndex) return round;
                    const updatedMatches = round.matches.map((m, mIdx) => {
                      if (mIdx !== matchIndex) return m;
                      return { ...m, score: finalScore, completed: completed };
                    });
                    return { ...round, matches: updatedMatches };
                  });
                  
                  const copy = { ...activeTournament, rounds: updatedRounds };
                  
                  // Update active tournament state and write to localStorage
                  updateTournamentState(copy);
                  
                  // Only route back if completed
                  if (completed) {
                    setCurrentScreen('active-matches');
                    setActiveMatch(null);
                    setActiveTournamentMatch(null);
                  }
                } else {
                  // Standalone match save
                  if (completed) {
                    localStorage.removeItem('padel_active_match');
                    alert("Match completed and saved locally!");
                    setCurrentScreen('dashboard');
                    setActiveMatch(null);
                  } else {
                    // Update active standalone match in localstorage
                    const updatedMatch = { ...activeMatch, score: finalScore };
                    setActiveMatch(updatedMatch);
                    localStorage.setItem('padel_active_match', JSON.stringify(updatedMatch));
                  }
                }
              }}
            />
          );
        case 'leaderboard':
          return (
            <LeaderboardScreen 
              tweaks={tweaks}
              tournament={activeTournament}
              onBack={() => {
                if (activeTournament && !activeTournament.completed) {
                  setCurrentScreen('active-matches');
                } else {
                  setCurrentScreen('dashboard');
                }
              }}
              onFinishTournament={() => {
                if (confirm("Are you sure you want to finish this tournament? Standings will be finalized and archived.")) {
                  const finished = { ...activeTournament, completed: true, finishedAt: new Date().toISOString() };
                  const newHist = [finished, ...tournamentHistory];
                  setTournamentHistory(newHist);
                  localStorage.setItem('padel_tournament_history', JSON.stringify(newHist));
                  updateTournamentState(null);
                  setCurrentScreen('dashboard');
                }
              }}
            />
          );
        default:
          return <div className="ag-body" style={{ padding: 20 }}>Screen not found.</div>;
      }
    } catch (err) {
      console.error("Render crash caught:", err);
      return (
        <div className="ag-body" style={{ padding: 24, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="ag-card" style={{
            padding: 24, maxWidth: 500, width: '100%',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(0, 0, 0, 0.4))',
            border: '1px solid var(--danger)', borderRadius: 12,
            boxShadow: 'var(--shadow-lg)'
          }}>
            <h2 className="ag-h2" style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 10px' }}>
              <Icon name="alert-triangle" color="var(--danger)" /> View Crash Safeguard
            </h2>
            <p className="ag-body" style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.4 }}>
              A dynamic rendering error occurred while loading this view. You can return to the main dashboard or clear the current tournament state to recover.
            </p>
            <div className="ag-inset" style={{
              padding: 12, fontFamily: 'JetBrains Mono', fontSize: 11,
              background: 'rgba(0,0,0,0.3)', marginBottom: 20,
              overflowX: 'auto', whiteSpace: 'pre-wrap', maxHeight: 200, color: 'rgba(255,255,255,0.9)'
            }}>
              {err.stack || err.message || String(err)}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="ag-btn ag-btn-primary ag-btn-sm" onClick={() => setCurrentScreen('dashboard')}>
                Go to Dashboard
              </button>
              <button className="ag-btn ag-btn-ghost ag-btn-sm" style={{ color: 'var(--danger)' }} onClick={() => {
                updateTournamentState(null);
                setCurrentScreen('dashboard');
              }}>
                Reset Active Tournament
              </button>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}>
      
      {/* Top Quick Header bar */}
      <header className="ag-top-header ag-dark">
        <div className="ag-top-header-left">
          <div className="ag-top-header-emoji">{tweaks.clubEmoji}</div>
          <span className="ag-top-header-title-container">
            {tweaks.clubName} <span className="ag-top-header-title-badge">Atelier Glass</span>
          </span>
        </div>

        {/* Dynamic Mode Switcher (PWA vs Design Showcase Canvas) */}
        <div className="ag-top-header-right ag-mobile-hide">
          <button 
            className={`ag-btn ${viewMode === 'app' ? 'ag-btn-primary' : 'ag-btn-ghost'} ag-btn-sm`}
            onClick={() => setViewMode('app')}
            style={{ padding: '6px 14px', height: 'auto', fontSize: 11 }}
          >
            Live App Mode
          </button>
          <button 
            className={`ag-btn ${viewMode === 'canvas' ? 'ag-btn-primary' : 'ag-btn-ghost'} ag-btn-sm`}
            onClick={() => setViewMode('canvas')}
            style={{ padding: '6px 14px', height: 'auto', fontSize: 11 }}
          >
            Showcase Canvas
          </button>
        </div>
      </header>

      {/* Main Body */}
      {viewMode === 'app' ? (
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {renderActiveScreen()}
        </div>
      ) : (
        /* Design System Showcase Canvas (matching fnb-agent design artboards) */
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          
          {/* Design System Sidebar */}
          <div className="ag-dark" style={{
            width: 220, borderRight: '1px solid var(--hairline-soft)',
            padding: 16, display: 'flex', flexDirection: 'column', gap: 14,
            overflowY: 'auto', flexShrink: 0
          }}>
            <div>
              <div className="ag-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>Brand Control</div>
              <h4 className="ag-h4">Tenant Tweaks</h4>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label className="ag-label">Store Preset</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {PALETTES.map((p, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => setTweak('palette', p)}
                      style={{
                        height: 24, borderRadius: 6, cursor: 'pointer',
                        background: `linear-gradient(135deg, ${p[0]}, ${p[1]})`,
                        border: tweaks.palette[0] === p[0] ? '2px solid #fff' : '1px solid var(--hairline)',
                        boxShadow: tweaks.palette[0] === p[0] ? '0 0 8px rgba(255,255,255,0.4)' : 'none'
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="ag-label">Club Name</label>
                <input 
                  type="text" 
                  className="ag-input" 
                  value={tweaks.clubName} 
                  onChange={(e) => setTweak('clubName', e.target.value)} 
                />
              </div>

              <div>
                <label className="ag-label">Club Emoji</label>
                <input 
                  type="text" 
                  className="ag-input" 
                  value={tweaks.clubEmoji} 
                  onChange={(e) => setTweak('clubEmoji', e.target.value)} 
                />
              </div>

              <div>
                <label className="ag-label">Referee Voice</label>
                <select 
                  className="ag-select"
                  value={tweaks.refereeVoice}
                  onChange={(e) => setTweak('refereeVoice', e.target.value)}
                >
                  <option value="en-US">English Referee</option>
                  <option value="es-ES">Spanish (Árbitro)</option>
                  <option value="sv-SE">Swedish (Domare)</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--hairline-soft)' }}>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                Atelier Glass Scoring<br />v1.0.0 · Local Mode
              </div>
            </div>
          </div>

          {/* Large Artboard Design Canvas Scroll Box */}
          <div style={{ flex: 1, padding: 24, overflow: 'auto', background: '#090b10' }}>
            
            <div style={{ marginBottom: 20 }}>
              <span className="ag-eyebrow">Design Showcase</span>
              <h2 className="ag-h2">App Screen Artboards (Figma-style preview)</h2>
              <p className="ag-body" style={{ margin: '4px 0 0' }}>Preview different screens of the scoring application side-by-side using the active brand palette. Double click or tap "Live App Mode" above to use the app in full screen.</p>
            </div>

            <div style={{ display: 'flex', gap: 32, paddingBottom: 40 }}>
              
              {/* Artboard S0: Home Dashboard */}
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>S0 · Home Dashboard (Mobile/Tablet landscape, 960x600)</div>
                <div className="ag-heavy" style={{ width: 960, height: 600, overflow: 'hidden', position: 'relative', border: '1px solid var(--hairline-strong)' }}>
                  <DashboardScreen 
                    tweaks={tweaks}
                    tournamentHistory={tournamentHistory.length > 0 ? tournamentHistory : [
                      { id: 't1', name: 'Terracotta Open', sport: 'padel', completed: true, finishedAt: new Date().toISOString(), players: ['Alex', 'Bob', 'Chris', 'David'], scoringMode: 'points', rules: { pointsLimit: 24 } }
                    ]}
                    activeTournament={null}
                    onNewTournament={() => {}}
                    onResumeTournament={() => {}}
                    onQuickMatch={() => {}}
                    onViewHistory={() => {}}
                  />
                </div>
              </div>

              {/* Artboard S1: Tournament Setup Wizard */}
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>S1 · Setup Wizard (Mobile/Tablet landscape, 960x600)</div>
                <div className="ag-heavy" style={{ width: 960, height: 600, overflow: 'hidden', position: 'relative', border: '1px solid var(--hairline-strong)' }}>
                  <SetupScreen tweaks={tweaks} onBack={() => {}} onStart={() => {}} />
                </div>
              </div>

              {/* Artboard S3: Immersive Scorer */}
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>S3 · Immersive Court Scorer (Mobile Scorer, 480x800)</div>
                <div className="ag-heavy" style={{ width: 480, height: 800, overflow: 'hidden', position: 'relative', border: '1px solid var(--hairline-strong)' }}>
                  <InteractiveScorerScreen 
                    tweaks={tweaks}
                    match={{
                      sport: 'padel',
                      teamA: ['Alex Mercer', 'Jordan Cole'],
                      teamB: ['Sarah Diaz', 'Tommy Kim'],
                      scoringMode: 'tennis',
                      rules: { setsFormat: 'best3', advantageRule: 'goldenPoint' },
                      score: { teamAScore: 30, teamBScore: 40, sets: [{ teamA: 6, teamB: 4 }, { teamA: 3, teamB: 6 }] },
                      serving: 'teamB',
                      serverIndex: 0,
                      completed: false
                    }}
                    onBack={() => {}}
                    onSaveMatch={() => {}}
                  />
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
