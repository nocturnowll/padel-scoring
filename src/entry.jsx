/* Concatenated Safeguarded Padel App Source */

/* --- START FILE: shared.jsx --- */
/* shared.jsx — common components and core matchmaking logic */

// Icon Wrapper for Lucide CDN
function Icon({ name, size = 18, color = 'currentColor', className = '' }) {
  React.useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, [name]);
  
  return (
    <i 
      data-lucide={name} 
      style={{ 
        width: size, 
        height: size, 
        color: color,
        strokeWidth: 2, 
        display: 'inline-flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        verticalAlign: 'middle'
      }} 
      className={className}
    ></i>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Speech Announcer (HTML5 Speech Synthesis)
// ──────────────────────────────────────────────────────────────────────────
const SpeechAnnouncer = {
  speak: (text, lang = 'en-US') => {
    if (!('speechSynthesis' in window)) return;
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.05; // Slightly faster for referee feel
    utterance.pitch = 1.0;
    
    // Attempt to pick a suitable voice
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      // Look for a voice matching the desired locale
      const match = voices.find(v => v.lang.startsWith(lang));
      if (match) utterance.voice = match;
    }
    
    window.speechSynthesis.speak(utterance);
  },
  
  announceScore: (scoreA, scoreB, isTennis = false, isGoldenPoint = false, lang = 'en-US') => {
    let phrase = "";
    
    if (isTennis) {
      const getTennisLabel = (s) => {
        if (s === 0) return "love";
        if (s === 15) return "fifteen";
        if (s === 30) return "thirty";
        if (s === 40) return "forty";
        if (s === 'AD') return "advantage";
        return s;
      };
      
      const labelA = getTennisLabel(scoreA);
      const labelB = getTennisLabel(scoreB);
      
      if (scoreA === 'AD') {
        phrase = lang.startsWith('es') ? "Ventaja Equipo A" : "Advantage Team A";
      } else if (scoreB === 'AD') {
        phrase = lang.startsWith('es') ? "Ventaja Equipo B" : "Advantage Team B";
      } else if (scoreA === 40 && scoreB === 40) {
        if (isGoldenPoint) {
          phrase = lang.startsWith('es') ? "Punto de oro. Punto decisivo." : "Golden point. Deciding point.";
        } else {
          phrase = lang.startsWith('es') ? "Iguales" : "Deuce";
        }
      } else if (scoreA === scoreB) {
        phrase = `${labelA} all`;
        if (lang.startsWith('es')) phrase = `${scoreA} iguales`;
      } else {
        phrase = `${labelA} - ${labelB}`;
      }
    } else {
      // Raw points Americano
      phrase = `${scoreA} - ${scoreB}`;
    }
    
    SpeechAnnouncer.speak(phrase, lang);
  }
};

// Ensure voices are pre-loaded
if ('speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

// ──────────────────────────────────────────────────────────────────────────
// Smart Matchmaking Algorithms
// ──────────────────────────────────────────────────────────────────────────
const Matchmaker = {
  
  // 1. Individual Americano Generator
  // Schedules a tournament for N players on C courts.
  // Every player is paired with every other player once, and plays against others.
  generateIndividualAmericano: (playerNames, courtsCount, pointsLimit, sport, scoringMode, rules) => {
    const N = playerNames.length;
    if (N < 4) return null;
    
    // Create player objects
    const players = playerNames.map((name, index) => ({
      id: `p_${index + 1}`,
      name: name,
      points: 0,
      diff: 0,
      played: 0,
      won: 0,
      lost: 0
    }));
    
    // Generate all possible unique pairs
    const pairs = [];
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        pairs.push([players[i], players[j]]);
      }
    }
    
    // Generate rounds
    // A robust rotation algorithm for Americano tournaments (Social Scheduling)
    // We construct rounds ensuring players are active on available courts, or rest.
    const rounds = [];
    const maxRounds = N % 2 === 0 ? N - 1 : N; // standard round robin schedule limit
    
    // For smaller player counts (e.g. 4, 5, 8), generate a beautiful circular rotation
    // Let's implement a clean circular rotation list for scheduling:
    const activePlayersList = [...players];
    
    for (let r = 0; r < maxRounds; r++) {
      const roundMatches = [];
      const usedInRound = new Set();
      
      // Shuffle active list slightly or rotate it
      // Circular schedule generator logic
      const roundPlayers = [...activePlayersList];
      
      // Schedule matches based on active courts
      for (let c = 0; c < courtsCount; c++) {
        // We need 4 players for a doubles match
        const available = roundPlayers.filter(p => !usedInRound.has(p.id));
        if (available.length < 4) break;
        
        // Grab 4 players and pair them
        const p1 = available[0];
        const p2 = available[1];
        const p3 = available[2];
        const p4 = available[3];
        
        usedInRound.add(p1.id);
        usedInRound.add(p2.id);
        usedInRound.add(p3.id);
        usedInRound.add(p4.id);
        
        roundMatches.push({
          id: `r${r+1}_m${c+1}`,
          court: c + 1,
          teamA: { p1, p2 },
          teamB: { p3, p4 },
          score: null,
          completed: false
        });
      }
      
      // Find who is sitting out this round
      const sittingOut = players.filter(p => !usedInRound.has(p.id));
      
      rounds.push({
        roundIndex: r,
        name: `Round ${r + 1}`,
        matches: roundMatches,
        sittingOut: sittingOut
      });
      
      // Rotate players for next round (circular shift, keep first element fixed if even)
      if (N % 2 === 0) {
        const first = activePlayersList[0];
        const rest = activePlayersList.slice(1);
        // Shift rest
        rest.push(rest.shift());
        activePlayersList.length = 0;
        activePlayersList.push(first, ...rest);
      } else {
        // Shift all for odd player count
        activePlayersList.push(activePlayersList.shift());
      }
    }
    
    return {
      id: `tourney_${Date.now()}`,
      name: `${sport === 'padel' ? 'Padel' : 'Tennis'} Americano`,
      sport,
      format: 'individual_americano',
      scoringMode, // 'points' or 'tennis'
      rules: {
        pointsLimit,
        ...rules
      },
      players,
      rounds,
      completed: false,
      createdAt: new Date().toISOString()
    };
  },
  
  // 2. Team Americano Generator
  // Schedules standard round-robin matches for fixed teams.
  generateTeamAmericano: (teamNames, courtsCount, pointsLimit, sport, scoringMode, rules) => {
    const T = teamNames.length;
    if (T < 2) return null;
    
    // Group individual players into fixed doubles teams of 2 players
    const teams = [];
    for (let i = 0; i < T; i += 2) {
      const p1Name = teamNames[i];
      const p2Name = teamNames[i + 1] || '';
      teams.push({
        id: `team_${Math.floor(i/2) + 1}`,
        name: p2Name ? `${p1Name} + ${p2Name}` : p1Name,
        p1: { id: `p_${i + 1}`, name: p1Name },
        p2: p2Name ? { id: `p_${i + 2}`, name: p2Name } : { id: '', name: '' },
        points: 0,
        diff: 0,
        played: 0,
        won: 0,
        lost: 0
      });
    }
    
    const numTeams = teams.length;
    const list = [...teams];
    if (numTeams % 2 !== 0) {
      list.push({ id: 'bye', name: 'BYE', isDummy: true });
    }
    
    const numTeamsWithBye = list.length;
    const numRounds = numTeamsWithBye - 1;
    const rounds = [];
    
    for (let r = 0; r < numRounds; r++) {
      const roundMatches = [];
      const sittingOut = [];
      let courtIndex = 1;
      
      for (let i = 0; i < numTeamsWithBye / 2; i++) {
        const t1 = list[i];
        const t2 = list[numTeamsWithBye - 1 - i];
        
        if (t1.id === 'bye') {
          if (!t2.isDummy) {
            if (t2.p1?.name) sittingOut.push(t2.p1.name);
            if (t2.p2?.name) sittingOut.push(t2.p2.name);
          }
        } else if (t2.id === 'bye') {
          if (!t1.isDummy) {
            if (t1.p1?.name) sittingOut.push(t1.p1.name);
            if (t1.p2?.name) sittingOut.push(t1.p2.name);
          }
        } else {
          // Both are real teams
          if (courtIndex <= courtsCount) {
            roundMatches.push({
              id: `r${r+1}_m${courtIndex}`,
              court: courtIndex,
              teamA: { 
                p1: { name: t1.p1.name, id: t1.p1.id }, 
                p2: { name: t1.p2.name, id: t1.p2.id } 
              },
              teamB: { 
                p1: { name: t2.p1.name, id: t2.p1.id }, 
                p2: { name: t2.p2.name, id: t2.p2.id } 
              },
              score: null,
              completed: false,
              rawTeamA: t1,
              rawTeamB: t2
            });
            courtIndex++;
          } else {
            // No courts left, they sit out
            if (t1.p1?.name) sittingOut.push(t1.p1.name);
            if (t1.p2?.name) sittingOut.push(t1.p2.name);
            if (t2.p1?.name) sittingOut.push(t2.p1.name);
            if (t2.p2?.name) sittingOut.push(t2.p2.name);
          }
        }
      }
      
      rounds.push({
        roundIndex: r,
        name: `Round ${r + 1}`,
        matches: roundMatches,
        sittingOut: sittingOut
      });
      
      // Rotate list
      const first = list[0];
      const rest = list.slice(1);
      rest.push(rest.shift());
      list.length = 0;
      list.push(first, ...rest);
    }
    
    return {
      id: `tourney_${Date.now()}`,
      name: `${sport === 'padel' ? 'Padel' : 'Tennis'} Team Americano`,
      sport,
      format: 'team_americano',
      scoringMode,
      rules: {
        pointsLimit,
        ...rules
      },
      players: teams, // Treat teams as "players" on the leaderboard
      rounds,
      completed: false,
      createdAt: new Date().toISOString()
    };
  },
  
  // 3. Dynamic Mexicano Matcher (Generates subsequent rounds based on active leaderboard)
  // Standard Mexicano matches players with similar score rankings: 1st & 4th vs 2nd & 3rd, or 1st & 2nd vs 3rd & 4th.
  generateNextMexicanoRound: (tournament, currentLeaderboard) => {
    const N = currentLeaderboard.length;
    if (N < 4) return null;
    
    const nextRoundIndex = tournament.rounds.length;
    const roundMatches = [];
    const usedInRound = new Set();
    
    // Sort players by points descending
    const sorted = [...currentLeaderboard];
    
    let courtIndex = 1;
    // Walk down the standings, grouping them in 4s
    for (let i = 0; i < N; i += 4) {
      if (i + 3 < N) {
        // Group of 4 adjacent rank players
        const p1 = sorted[i];
        const p2 = sorted[i + 3]; // Match 1st and 4th
        const p3 = sorted[i + 1];
        const p4 = sorted[i + 2]; // Match 2nd and 3rd for balanced game
        
        roundMatches.push({
          id: `r${nextRoundIndex+1}_m${courtIndex}`,
          court: courtIndex,
          teamA: { p1, p2 },
          teamB: { p3, p4 },
          score: null,
          completed: false
        });
        
        usedInRound.add(p1.id);
        usedInRound.add(p2.id);
        usedInRound.add(p3.id);
        usedInRound.add(p4.id);
        courtIndex++;
      }
    }
    
    const sittingOut = sorted.filter(p => !usedInRound.has(p.id));
    
    return {
      roundIndex: nextRoundIndex,
      name: `Round ${nextRoundIndex + 1} (Mexicano Dynamic)`,
      matches: roundMatches,
      sittingOut: sittingOut
    };
  }
};

// ──────────────────────────────────────────────────────────────────────────
// Leaderboard Stats Tally Engine
// ──────────────────────────────────────────────────────────────────────────
const getPlayerName = (p) => {
  if (!p) return '';
  return typeof p === 'object' ? p.name : p;
};

const getTeamAPlayersString = (match) => {
  if (!match || !match.teamA) return 'Unknown';
  const p1Name = getPlayerName(match.teamA.p1);
  const p2Name = getPlayerName(match.teamA.p2);
  if (p1Name && p2Name) return `${p1Name} + ${p2Name}`;
  return p1Name || p2Name || 'Unknown';
};

const getTeamBPlayersString = (match) => {
  if (!match || !match.teamB) return 'Unknown';
  const p1Name = getPlayerName(match.teamB.p1);
  const p2Name = getPlayerName(match.teamB.p2);
  if (p1Name && p2Name) return `${p1Name} + ${p2Name}`;
  return p1Name || p2Name || 'Unknown';
};

const StatsEngine = {
  // Re-calculates player rankings from scratch based on all completed match scores
  tallyTournament: (tournament) => {
    if (!tournament || !tournament.players || !Array.isArray(tournament.players)) return [];
    
    const format = tournament.format || 'individual_americano';
    const isIndividual = format.includes('individual') || format === 'mexicano';
    const scoringMode = tournament.scoringMode || 'points';
    
    // Reset player scores
    const playerMap = {};
    tournament.players.forEach(p => {
      if (!p) return;
      const pId = p.id || `p_${Math.random()}`;
      playerMap[pId] = {
        ...p,
        id: pId,
        points: 0,
        diff: 0,
        played: 0,
        won: 0,
        lost: 0
      };
    });
    
    // Process all rounds and matches
    const rounds = tournament.rounds || [];
    rounds.forEach(round => {
      if (!round || !round.matches) return;
      round.matches.forEach(match => {
        if (!match || !match.score) return;
        
        let scoreA = 0;
        let scoreB = 0;
        
        if (scoringMode === 'tennis') {
          // Tennis Sets: points and difference are tallied based on total games won!
          // We sum the games from all completed sets in the sets array, plus current active set games.
          const sets = match.score.sets || [];
          let gamesA = 0;
          let gamesB = 0;
          sets.forEach(s => {
            gamesA += s.teamA || 0;
            gamesB += s.teamB || 0;
          });
          gamesA += match.score.currentGameA || 0;
          gamesB += match.score.currentGameB || 0;
          
          scoreA = gamesA;
          scoreB = gamesB;
        } else {
          // Raw points Americano: points and difference are raw points scored
          scoreA = match.score.teamAScore !== undefined ? match.score.teamAScore : 0;
          scoreB = match.score.teamBScore !== undefined ? match.score.teamBScore : 0;
        }
        
        const diff = scoreA - scoreB;
        
        // Helper to update player stats
        const updatePlayerStats = (id, pointsToAdd, diffToAdd, isMatchCompleted, isMatchWon) => {
          if (playerMap[id]) {
            playerMap[id].points += pointsToAdd;
            playerMap[id].diff += diffToAdd;
            if (isMatchCompleted) {
              playerMap[id].played += 1;
              if (isMatchWon) {
                playerMap[id].won += 1;
              } else {
                playerMap[id].lost += 1;
              }
            }
          }
        };
        
        if (isIndividual) {
          if (!match.teamA || !match.teamB) return;
          const p1A = match.teamA.p1 ? match.teamA.p1.id : null;
          const p2A = match.teamA.p2 ? match.teamA.p2.id : null;
          const idsA = [p1A, p2A].filter(Boolean);
          
          const p1B = match.teamB.p1 ? match.teamB.p1.id : null;
          const p2B = match.teamB.p2 ? match.teamB.p2.id : null;
          const idsB = [p1B, p2B].filter(Boolean);
          
          // Determine who won the match overall
          let isWonA = false;
          let isWonB = false;
          
          if (match.completed) {
            if (scoringMode === 'tennis') {
              // Count sets won
              let setsWonA = 0;
              let setsWonB = 0;
              (match.score.sets || []).forEach(s => {
                if (s.teamA > s.teamB) setsWonA += 1;
                else if (s.teamB > s.teamA) setsWonB += 1;
              });
              isWonA = setsWonA > setsWonB;
              isWonB = setsWonB > setsWonA;
            } else {
              isWonA = scoreA > scoreB;
              isWonB = scoreB > scoreA;
            }
          }
          
          idsA.forEach(id => {
            updatePlayerStats(id, scoreA, diff, match.completed, isWonA);
          });
          idsB.forEach(id => {
            updatePlayerStats(id, scoreB, -diff, match.completed, isWonB);
          });
        } else {
          // Team Americano
          const teamIdA = match.rawTeamA ? match.rawTeamA.id : (match.teamA && match.teamA.p1 ? match.teamA.p1.id : null);
          const teamIdB = match.rawTeamB ? match.rawTeamB.id : (match.teamB && match.teamB.p1 ? match.teamB.p1.id : null);
          
          let isWonA = false;
          let isWonB = false;
          
          if (match.completed) {
            if (scoringMode === 'tennis') {
              let setsWonA = 0;
              let setsWonB = 0;
              (match.score.sets || []).forEach(s => {
                if (s.teamA > s.teamB) setsWonA += 1;
                else if (s.teamB > s.teamA) setsWonB += 1;
              });
              isWonA = setsWonA > setsWonB;
              isWonB = setsWonB > setsWonA;
            } else {
              isWonA = scoreA > scoreB;
              isWonB = scoreB > scoreA;
            }
          }
          
          if (teamIdA) {
            updatePlayerStats(teamIdA, scoreA, diff, match.completed, isWonA);
          }
          if (teamIdB) {
            updatePlayerStats(teamIdB, scoreB, -diff, match.completed, isWonB);
          }
        }
      });
    });
    
    // Convert back to sorted array
    return Object.values(playerMap).sort((a, b) => {
      if (scoringMode === 'tennis') {
        if (b.won !== a.won) return b.won - a.won; // Most match wins
        if (b.diff !== a.diff) return b.diff - a.diff; // Best game difference
        return b.points - a.points; // Most total points
      } else {
        if (b.points !== a.points) return b.points - a.points; // Most total points
        if (b.diff !== a.diff) return b.diff - a.diff; // Best point difference
        return b.won - a.won;
      }
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// Layout Shell Frame
// ──────────────────────────────────────────────────────────────────────────
function AppLayout({ tweaks, children, onBack, title, eyebrow, actions }) {
  return (
    <div className="ag-layout-container">
      <div className="ag-layout-inner ag-heavy">
        
        {/* Header toolbar */}
        <header className="ag-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {onBack && (
              <button onClick={onBack} className="ag-btn ag-btn-ghost ag-btn-sm" style={{ padding: 6, borderRadius: '50%' }}>
                <Icon name="arrow-left" size={16} />
              </button>
            )}
            <div>
              {eyebrow && <div className="ag-eyebrow" style={{ fontSize: 9.5, marginBottom: 2 }}>{eyebrow}</div>}
              <h1 className="ag-h2" style={{ margin: 0 }}>{title}</h1>
            </div>
          </div>
          
          <div className="ag-header-actions">
            {actions}
          </div>
        </header>

        {/* Content Box */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', width: '100%' }} className="ag-scroll">
          {children}
        </div>
        
      </div>
    </div>
  );
}

Object.assign(window, { Icon, SpeechAnnouncer, Matchmaker, StatsEngine, AppLayout, getPlayerName, getTeamAPlayersString, getTeamBPlayersString });


/* --- START FILE: dashboard.jsx --- */
/* screens/dashboard.jsx — Dashboard / Welcome screen */

function DashboardScreen({ tweaks, tournamentHistory, activeTournament, onNewTournament, onResumeTournament, onQuickMatch, onViewHistory }) {
  // Sum stats from history
  const totalCompleted = (tournamentHistory && Array.isArray(tournamentHistory)) ? tournamentHistory.length : 0;
  const totalActive = activeTournament ? 1 : 0;
  
  // Calculate total players registered across history
  const allPlayers = new Set();
  if (tournamentHistory && Array.isArray(tournamentHistory)) {
    tournamentHistory.forEach(t => {
      if (t && t.players && Array.isArray(t.players)) {
        t.players.forEach(p => {
          if (p) {
            const name = typeof p === 'object' ? p.name : p;
            if (name) allPlayers.add(name);
          }
        });
      }
    });
  }
  if (activeTournament && activeTournament.players && Array.isArray(activeTournament.players)) {
    activeTournament.players.forEach(p => {
      if (p) {
        const name = typeof p === 'object' ? p.name : p;
        if (name) allPlayers.add(name);
      }
    });
  }
  
  return (
    <AppLayout 
      tweaks={tweaks}
      title=""
      eyebrow=""
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="ag-btn ag-btn-ghost ag-btn-sm" onClick={onQuickMatch}>
            <Icon name="play" size={14} /> Quick Scorer
          </button>
          <button className="ag-btn ag-btn-primary ag-btn-sm" onClick={onNewTournament}>
            <Icon name="plus" size={14} /> Host Match
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        {/* Dynamic Greeting Hero Card */}
        <div className="ag-card" style={{
          padding: 24,
          background: 'linear-gradient(135deg, var(--brand-light), rgba(255,255,255,0.01))',
          border: '1px solid color-mix(in oklab, var(--brand-primary) 24%, transparent)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 16
        }}>
          <div>
            <h2 className="ag-h2" style={{ margin: '0 0 4px', color: '#fff' }}>Welcome to {tweaks.clubName}</h2>
            <p className="ag-body" style={{ margin: 0, opacity: 0.8 }}>
              Manage your padel Americano, Mexicano, and traditional tennis/padel matches in elegant dark glass.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {activeTournament ? (
              <button className="ag-btn ag-btn-primary pulse-glow-border" onClick={onResumeTournament}>
                <Icon name="activity" size={15} /> Resume Match
              </button>
            ) : (
              <button className="ag-btn ag-btn-primary" onClick={onNewTournament}>
                <Icon name="swords" size={15} /> Start Match
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          
          {/* Ongoing Panel */}
          <div className="ag-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="ag-meta">Active Matches</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="score-glow-sub" style={{ fontSize: 32, fontWeight: 700, color: totalActive > 0 ? 'var(--brand-primary)' : 'var(--text-primary)' }}>
                {totalActive}
              </span>
              <span className="ag-body" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>running</span>
            </div>
            <div style={{ marginTop: 'auto', fontSize: 11, color: 'var(--text-secondary)' }}>
              {activeTournament ? `${activeTournament.name} in progress` : "No ongoing match"}
            </div>
          </div>

          {/* History Count Panel */}
          <div className="ag-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="ag-meta">Archived Matches</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="score-glow-sub" style={{ fontSize: 32, fontWeight: 700 }}>{totalCompleted}</span>
              <span className="ag-body" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>saved</span>
            </div>
            <div style={{ marginTop: 'auto', fontSize: 11, color: 'var(--text-secondary)' }}>
              Local match record history
            </div>
          </div>

          {/* Player Database Count Panel */}
          <div className="ag-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="ag-meta">Total Players Logged</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="score-glow-sub" style={{ fontSize: 32, fontWeight: 700, color: 'var(--brand-primary)' }}>{allPlayers.size}</span>
              <span className="ag-body" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>athletes</span>
            </div>
            <div style={{ marginTop: 'auto', fontSize: 11, color: 'var(--text-secondary)' }}>
              Active player roster database
            </div>
          </div>

        </div>

        {/* Bottom Section Layout */}
        <div className="ag-dashboard-bottom-grid">
          
          {/* History / Active queue */}
          <div className="ag-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="ag-h3" style={{ margin: 0 }}>Match Roster History</h3>
              <Icon name="history" size={16} color="var(--text-tertiary)" />
            </div>
            
            {tournamentHistory.length === 0 ? (
              <div style={{ padding: '30px 10px', textAlign: 'center', border: '1px dashed var(--hairline)', borderRadius: 12 }}>
                <Icon name="archive" size={28} color="var(--text-tertiary)" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>No completed matches</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Host your first match to see it logged here!</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tournamentHistory.map((t, idx) => (
                  <div 
                    key={t.id || idx} 
                    className="ag-inset" 
                    style={{
                      padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      transition: 'border-color 0.2s', cursor: 'pointer'
                    }}
                    onClick={() => onViewHistory(t)}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)', marginTop: 2, display: 'flex', gap: 8 }}>
                        <span>Sport: {t.sport === 'padel' ? 'Padel' : 'Tennis'}</span>
                        <span>•</span>
                        <span>Players: {t.players ? t.players.length : 0}</span>
                        <span>•</span>
                        <span>Date: {t.finishedAt ? new Date(t.finishedAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                    
                    <button className="ag-btn ag-btn-ghost ag-btn-sm" style={{ padding: '4px 10px' }}>
                      View Stats <Icon name="chevron-right" size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick instructions / Sports tips */}
          <div className="ag-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 className="ag-h3" style={{ margin: 0 }}>Roster Formats</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ color: 'var(--brand-primary)', marginTop: 2 }}><Icon name="users" size={16} /></div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>Individual Americano</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Dynamic pairings every round. Tally personal scores. Perfect for social groups.</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ color: 'var(--brand-primary)', marginTop: 2 }}><Icon name="users-2" size={16} /></div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>Team Americano</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Fixed doubles partnerships. Classic round robin matchmaker.</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ color: 'var(--brand-primary)', marginTop: 2 }}><Icon name="trending-up" size={16} /></div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>Mexicano</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Dynamic pairings matching equal levels. Leaderboard rankings generate the next rounds.</div>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </AppLayout>
  );
}

window.DashboardScreen = DashboardScreen;


/* --- START FILE: setup.jsx --- */
/* screens/setup.jsx — Setup Wizard screen */

function StepPills({ current, total, labels }) {
  return (
    <div className="ag-step-pills">
      {Array.from({ length: total }).map((_, idx) => {
        const active = current === idx + 1;
        const done = current > idx + 1;
        return (
          <div 
            key={idx} 
            className={`ag-inset ag-step-pill ${active ? 'pulse-glow-border' : ''}`}
            style={{
              background: active 
                ? 'var(--brand-light)' 
                : done 
                  ? 'rgba(255, 255, 255, 0.02)' 
                  : 'rgba(0, 0, 0, 0.1)',
              borderColor: active 
                ? 'var(--brand-primary)' 
                : done 
                  ? 'rgba(255, 255, 255, 0.15)' 
                  : 'var(--hairline)',
              opacity: active || done ? 1 : 0.5
            }}
          >
            <div className="ag-step-pill-number" style={{ color: active ? 'var(--brand-primary)' : 'var(--text-secondary)' }}>
              Step {idx + 1}
            </div>
            <div className="ag-step-pill-label">
              {labels[idx]}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SetupScreen({ tweaks, onBack, onStart }) {
  const [step, setStep] = React.useState(1); // Step 1, 2, 3

  // Wizard Config State
  const [sport, setSport] = React.useState('padel'); // 'padel', 'tennis'
  const [format, setFormat] = React.useState('individual_americano'); // 'individual_americano', 'team_americano', 'mexicano', 'single_match'
  const [scoringMode, setScoringMode] = React.useState('points'); // 'points' (Raw points), 'tennis' (Sets)
  
  // Scoring rules
  const [pointsLimit, setPointsLimit] = React.useState(24); // 16, 24, 32, 40 points
  const [setsFormat, setSetsFormat] = React.useState('best3'); // 'best3', 'best4', 'best5', 'first3'
  const [gamesPerSet, setGamesPerSet] = React.useState(6); // 4, 5, 6, 8 games target
  const [advantageRule, setAdvantageRule] = React.useState('goldenPoint'); // 'goldenPoint', 'deuce'
  const [tiebreakerTarget, setTiebreakerTarget] = React.useState(7); // 7, 10
  const [isCustomPoints, setIsCustomPoints] = React.useState(false);
  const [showHelpModal, setShowHelpModal] = React.useState(false);
  
  // Courts count
  const [courtsCount, setCourtsCount] = React.useState(1);
  
  // Players / Teams list
  const [newPlayerName, setNewPlayerName] = React.useState('');
  const [playerList, setPlayerList] = React.useState([]);

  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) return;
    if (playerList.includes(newPlayerName.trim())) {
      alert("Name already exists.");
      return;
    }
    setPlayerList([...playerList, newPlayerName.trim()]);
    setNewPlayerName('');
  };

  const handleRemovePlayer = (index) => {
    const updated = [...playerList];
    updated.splice(index, 1);
    setPlayerList(updated);
  };

  const handleClearPlayers = () => {
    if (confirm("Clear player roster?")) setPlayerList([]);
  };

  // Standard preset loader
  const loadPreset = (count) => {
    const names = [];
    for (let i = 1; i <= count; i++) {
      names.push(`Player ${i}`);
    }
    setPlayerList(names);
  };

  const handleLaunch = () => {
    // Validation
    const minNeeded = format === 'single_match' ? 4 : 4; 
    if (playerList.length < minNeeded) {
      alert(`You need at least ${minNeeded} players/teams to start.`);
      return;
    }

    if (format === 'individual_americano' && playerList.length % 2 !== 0) {
      alert("Individual Americano requires an even number of players (e.g. 4, 6, 8, 10...) so everyone can pair up in matches. Or add players to reach an even count.");
      return;
    }

    // Call shared matchmaker generators
    let config = null;
    const rules = {
      setsFormat,
      advantageRule,
      tiebreakerTarget,
      gamesPerSet
    };
    
    if (format === 'individual_americano') {
      config = Matchmaker.generateIndividualAmericano(playerList, courtsCount, pointsLimit, sport, scoringMode, rules);
    } else if (format === 'team_americano') {
      // In team Americano, player list represents team names
      config = Matchmaker.generateTeamAmericano(playerList, courtsCount, pointsLimit, sport, scoringMode, rules);
    } else if (format === 'mexicano') {
      // Mexicano generates rounds dynamically. We build round 1 first using individual Americano algorithm
      config = Matchmaker.generateIndividualAmericano(playerList, courtsCount, pointsLimit, sport, scoringMode, rules);
      config.format = 'mexicano';
      config.name = `${sport === 'padel' ? 'Padel' : 'Tennis'} Mexicano`;
    }

    if (config) {
      onStart(config);
    } else {
      alert("Failed to generate tournament. Verify player counts.");
    }
  };

  // Stable backtracking handler
  const handleBack = () => {
    if (step > 1) {
      setStep(prev => prev - 1);
    } else {
      if (typeof onBack === 'function') {
        onBack();
      }
    }
  };

  return (
    <AppLayout
      tweaks={tweaks}
      title="Setup Tournament"
      eyebrow="Matchmaker Wizard"
      onBack={handleBack}
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {step > 1 && (
            <button className="ag-btn ag-btn-ghost ag-btn-sm" onClick={handleBack}>
              Back
            </button>
          )}
          {step < 3 ? (
            <button className="ag-btn ag-btn-primary ag-btn-sm" onClick={() => setStep(step + 1)}>
              Continue
            </button>
          ) : (
            <button className="ag-btn ag-btn-primary ag-btn-sm pulse-glow-border" onClick={handleLaunch}>
              <Icon name="play" size={14} /> Start Matches
            </button>
          )}
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        {/* Step Indicator */}
        <StepPills 
          current={step} 
          total={3} 
          labels={["Sport & Format", "Scoring Rules", "Players & Courts"]} 
        />

        {/* STEP 1: Sport & Format */}
        {step === 1 && (
          <div className="ag-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h3 className="ag-h3" style={{ margin: 0 }}>Select Sport & Tournament Type</h3>
            
            {/* Sport toggle */}
            <div>
              <label className="ag-label">1. Sport Type</label>
              <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                <button 
                  className={`ag-pill ${sport === 'padel' ? 'ag-pill-active' : ''}`}
                  onClick={() => {
                    setSport('padel');
                    // Padel defaults to raw points typically, or tennis sets
                  }}
                  style={{ flex: 1, height: 44, justifyContent: 'center' }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: 'middle', display: 'inline-flex' }}>
                    <circle cx="10" cy="9" r="6" fill="currentColor" fillOpacity="0.1" />
                    <line x1="14.24" y1="13.24" x2="20" y2="19" />
                    <line x1="18" y1="21" x2="21" y2="18" />
                    <circle cx="8" cy="8" r="0.5" fill="currentColor" />
                    <circle cx="10" cy="7" r="0.5" fill="currentColor" />
                    <circle cx="12" cy="8" r="0.5" fill="currentColor" />
                    <circle cx="9" cy="10" r="0.5" fill="currentColor" />
                    <circle cx="11" cy="10" r="0.5" fill="currentColor" />
                  </svg>
                  Padel Scorer
                </button>
                <button 
                  className={`ag-pill ${sport === 'tennis' ? 'ag-pill-active' : ''}`}
                  onClick={() => {
                    setSport('tennis');
                    setScoringMode('tennis'); // Force tennis sets for tennis sport
                  }}
                  style={{ flex: 1, height: 44, justifyContent: 'center' }}
                >
                  <Icon name="swords" size={16} /> Tennis Clay Scorer
                </button>
              </div>
            </div>

            {/* Tournament Format Selector */}
            <div>
              <label className="ag-label">2. Tournament Structure</label>
              <div className="ag-structure-grid">
                
                <div 
                  className={`ag-inset ${format === 'individual_americano' ? 'pulse-glow-border' : ''}`}
                  style={{ padding: 14, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4, transition: 'all 0.2s' }}
                  onClick={() => setFormat('individual_americano')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="radio" checked={format === 'individual_americano'} readOnly />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Individual Americano</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 20 }}>
                    Players play individually. Rotate partners/opponents every round.
                  </span>
                </div>

                <div 
                  className={`ag-inset ${format === 'team_americano' ? 'pulse-glow-border' : ''}`}
                  style={{ padding: 14, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4, transition: 'all 0.2s' }}
                  onClick={() => setFormat('team_americano')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="radio" checked={format === 'team_americano'} readOnly />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Team Americano</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 20 }}>
                    Fixed doubles teams. Classic round-robin team tournament.
                  </span>
                </div>

                <div 
                  className={`ag-inset ${format === 'mexicano' ? 'pulse-glow-border' : ''}`}
                  style={{ padding: 14, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4, transition: 'all 0.2s' }}
                  onClick={() => setFormat('mexicano')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="radio" checked={format === 'mexicano'} readOnly />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Mexicano (Dynamic Levels)</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 20 }}>
                    Leaderboards determine next matches. 1st plays 2nd, keeping games balanced.
                  </span>
                </div>

                <div 
                  className={`ag-inset`}
                  style={{ padding: 14, opacity: 0.5, cursor: 'not-allowed', display: 'flex', flexDirection: 'column', gap: 4 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="radio" disabled />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-tertiary)' }}>Single Match Mode</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 20 }}>
                    Available directly from Court Central Home Dashboard.
                  </span>
                </div>
              </div>
            </div>

            {/* Step 1 Bottom Button Bar */}
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--hairline-soft)', paddingTop: 16 }}>
              <button 
                className="ag-btn ag-btn-primary" 
                onClick={() => setStep(2)}
                style={{ padding: '10px 24px' }}
              >
                Continue <Icon name="chevron-right" size={14} />
              </button>
            </div>

          </div>
        )}

        {/* STEP 2: Scoring Rules */}
        {step === 2 && (
          <div className="ag-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {/* Header with Help button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="ag-h3" style={{ margin: 0 }}>Configure Match Scoring Rules</h3>
              <button 
                className="ag-btn ag-btn-ghost ag-btn-sm" 
                onClick={() => setShowHelpModal(true)}
                style={{ padding: 6, borderRadius: '50%', border: 'none', background: 'transparent' }}
                title="Scoring Rules Guide"
              >
                <Icon name="help-circle" size={18} color="var(--brand-primary)" />
              </button>
            </div>
            
            {/* Scoring Mode */}
            <div>
              <label className="ag-label">Scoring Method</label>
              <div className="ag-flex-row-responsive">
                {sport !== 'tennis' && (
                  <button 
                    className={`ag-pill ${scoringMode === 'points' ? 'ag-pill-active' : ''}`}
                    onClick={() => setScoringMode('points')}
                    style={{ flex: 1, height: 'auto', minHeight: 40, padding: '8px 12px', whiteSpace: 'normal', textAlign: 'center', justifyContent: 'center' }}
                  >
                    Raw Points
                  </button>
                )}
                <button 
                  className={`ag-pill ${scoringMode === 'tennis' ? 'ag-pill-active' : ''}`}
                  onClick={() => setScoringMode('tennis')}
                  style={{ flex: 1, height: 'auto', minHeight: 40, padding: '8px 12px', whiteSpace: 'normal', textAlign: 'center', justifyContent: 'center' }}
                >
                  Tennis Points
                </button>
              </div>
            </div>

            {/* Sub options based on scoring mode */}
            {scoringMode === 'points' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="ag-label">Total Points per Match</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', width: '100%' }}>
                    {[18, 21, 24, 32].map(p => (
                      <button 
                        key={p} 
                        className={`ag-pill ${!isCustomPoints && pointsLimit === p ? 'ag-pill-active' : ''}`}
                        onClick={() => {
                          setPointsLimit(p);
                          setIsCustomPoints(false);
                        }}
                        style={{ flex: 1, justifyContent: 'center', height: 36, padding: 0, minWidth: 60, fontSize: 11 }}
                      >
                        {p} Pts
                      </button>
                    ))}
                    <button 
                      className={`ag-pill ${isCustomPoints ? 'ag-pill-active' : ''}`}
                      onClick={() => {
                        setIsCustomPoints(true);
                      }}
                      style={{ flex: 1, justifyContent: 'center', height: 36, padding: 0, minWidth: 60, fontSize: 11 }}
                    >
                      Custom
                    </button>
                  </div>
                </div>

                {isCustomPoints && (
                  <div>
                    <label className="ag-label">Enter Custom Points Target</label>
                    <input 
                      type="number" 
                      className="ag-input" 
                      value={pointsLimit}
                      onChange={(e) => setPointsLimit(Math.max(1, parseInt(e.target.value) || 0))}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                      min="1"
                    />
                  </div>
                )}

                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  Every single point scored counts toward the individual's standings pool. Match service alternates every 4 points.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                
                {/* Sets format */}
                <div>
                  <label className="ag-label">Sets Format (Best-Of / First-To)</label>
                  <div className="ag-sets-grid">
                    <button 
                      className={`ag-pill ${setsFormat === 'best3' ? 'ag-pill-active' : ''}`}
                      onClick={() => { setSetsFormat('best3'); setGamesPerSet(3); }}
                      style={{ justifyContent: 'center', height: 'auto', minHeight: 36, padding: '4px 8px', whiteSpace: 'normal', textAlign: 'center', fontSize: 11 }}
                    >
                      BO3
                    </button>
                    <button 
                      className={`ag-pill ${setsFormat === 'best4' ? 'ag-pill-active' : ''}`}
                      onClick={() => { setSetsFormat('best4'); setGamesPerSet(4); }}
                      style={{ justifyContent: 'center', height: 'auto', minHeight: 36, padding: '4px 8px', whiteSpace: 'normal', textAlign: 'center', fontSize: 11 }}
                    >
                      BO4
                    </button>
                    <button 
                      className={`ag-pill ${setsFormat === 'best5' ? 'ag-pill-active' : ''}`}
                      onClick={() => { setSetsFormat('best5'); setGamesPerSet(5); }}
                      style={{ justifyContent: 'center', height: 'auto', minHeight: 36, padding: '4px 8px', whiteSpace: 'normal', textAlign: 'center', fontSize: 11 }}
                    >
                      BO5
                    </button>
                    <button 
                      className={`ag-pill ${setsFormat === 'first3' ? 'ag-pill-active' : ''}`}
                      onClick={() => { setSetsFormat('first3'); setGamesPerSet(3); }}
                      style={{ justifyContent: 'center', height: 'auto', minHeight: 36, padding: '4px 8px', whiteSpace: 'normal', textAlign: 'center', fontSize: 11 }}
                    >
                      First to 3
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>
                    {setsFormat === 'best4' && "Best of 4 sets allows matches to end in a 2-2 tie. Points are tallies of total games/points won."}
                    {setsFormat === 'first3' && "Match finishes immediately when a side achieves 3 set wins (equivalent to best of 5, but speedier)."}
                  </div>
                </div>

                <div className={scoringMode === 'tennis' ? "ag-rules-grid" : ""}>
                  {/* Advantage rule */}
                  <div>
                    <label className="ag-label">Advantage / Deuce Rule</label>
                    <select 
                      className="ag-select" 
                      value={advantageRule} 
                      onChange={(e) => setAdvantageRule(e.target.value)}
                    >
                      <option value="goldenPoint">Golden Point Rule</option>
                      <option value="deuce">Standard Advantage</option>
                    </select>
                  </div>

                  {/* Tiebreaker Target */}
                  {scoringMode === 'tennis' && (
                    <div>
                      <label className="ag-label">Tiebreaker Target</label>
                      <select 
                        className="ag-select" 
                        value={tiebreakerTarget} 
                        onChange={(e) => setTiebreakerTarget(parseInt(e.target.value))}
                      >
                        <option value="7">First to 7</option>
                        <option value="10">First to 10</option>
                      </select>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Step 2 Bottom Button Bar */}
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--hairline-soft)', paddingTop: 16 }}>
              <button 
                className="ag-btn ag-btn-ghost" 
                onClick={handleBack}
                style={{ padding: '10px 20px' }}
              >
                <Icon name="chevron-left" size={14} /> Back
              </button>
              <button 
                className="ag-btn ag-btn-primary" 
                onClick={() => setStep(3)}
                style={{ padding: '10px 24px' }}
              >
                Continue <Icon name="chevron-right" size={14} />
              </button>
            </div>

          </div>
        )}

        {/* STEP 3: Players & Courts */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
            
            {/* Arena Config (Courts) */}
            <div className="ag-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h3 className="ag-h3" style={{ margin: 0 }}>Courts & Arena Layout</h3>
              
              <div>
                <label className="ag-label">Available Courts</label>
                <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                  {[1, 2, 3, 4].map(c => (
                    <button 
                      key={c} 
                      className={`ag-pill ${courtsCount === c ? 'ag-pill-active' : ''}`}
                      onClick={() => setCourtsCount(c)}
                      style={{ flex: 1, justifyContent: 'center', height: 40, padding: 0, minWidth: 0, fontSize: 11 }}
                    >
                      {c} {c === 1 ? 'Court' : 'Courts'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic pairing helper notice */}
              <div className="ag-inset" style={{ padding: 12, display: 'flex', gap: 10 }}>
                <Icon name="info" size={16} color="var(--brand-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {format === 'individual_americano' && (
                    <>
                      <strong>Individual Americano Info:</strong> Since individuals rotate, 8 players on 2 courts works perfectly. 
                      If you have uneven counts (e.g. 5 players, 1 court), the app will automatically rotate 1 player to sit out (rest) each round, ensuring equal court time!
                    </>
                  )}
                  {format === 'team_americano' && (
                    <>
                      <strong>Team Americano Info:</strong> Teams will play in a circular round-robin schedule. Matches are distributed over available courts.
                    </>
                  )}
                  {format === 'mexicano' && (
                    <>
                      <strong>Mexicano Info:</strong> Round 1 starts with a standard random schedule. Starting Round 2, players are grouped in matches based on their active positions on the leaderboard!
                    </>
                  )}
                </div>
              </div>

            </div>

            {/* Roster management */}
            <div className="ag-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="ag-h3" style={{ margin: 0 }}>
                  {format === 'team_americano' ? 'Teams Registry' : 'Players Registry'} ({playerList.length})
                </h3>
                <button className="ag-btn ag-btn-link ag-btn-sm" style={{ color: 'var(--danger)' }} onClick={handleClearPlayers}>
                  Clear All
                </button>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <input 
                  type="text" 
                  className="ag-input" 
                  placeholder={format === 'team_americano' ? 'Add team name...' : 'Add player name...'} 
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddPlayer(); }}
                  style={{ flex: 1, minWidth: 0 }}
                />
                <button className="ag-btn ag-btn-primary" onClick={handleAddPlayer} style={{ padding: '0 18px', flexShrink: 0 }}>
                  <Icon name="plus" size={16} />
                </button>
              </div>

              {/* List */}
              <div className="ag-inset ag-scroll" style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: 4 }}>
                {playerList.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)' }}>Roster is empty. Add names above.</div>
                ) : (
                  playerList.map((p, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                        padding: '6px 10px', borderRadius: 8, borderBottom: '1px solid var(--hairline-soft)'
                      }}
                    >
                      <span style={{ fontSize: 12.5, fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }} title={p}>
                        {idx + 1}. {p}
                      </span>
                      <button 
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}
                        onClick={() => handleRemovePlayer(idx)}
                      >
                        <Icon name="x" size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          {/* Step 3 Bottom Button Bar */}
          <div className="ag-card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
            <button 
              className="ag-btn ag-btn-ghost" 
              onClick={handleBack}
              style={{ padding: '10px 20px' }}
            >
              <Icon name="chevron-left" size={14} /> Back
            </button>
            <button 
              className="ag-btn ag-btn-primary pulse-glow-border" 
              onClick={handleLaunch}
              style={{ padding: '10px 28px' }}
            >
              <Icon name="play" size={14} /> Start Matches
            </button>
          </div>

        </div>
      )}

      {/* Help Modal Popup Overlay */}
      {showHelpModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1100,
          background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16
        }}>
          <div className="ag-card-solid ag-float" style={{
            width: '100%', maxWidth: 460, padding: 24,
            display: 'flex', flexDirection: 'column', gap: 16,
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--hairline-strong)', paddingBottom: 12 }}>
              <h3 className="ag-h3" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--brand-primary)' }}>
                <Icon name="help-circle" size={18} /> Scoring Rules Guide
              </h3>
              <button 
                className="ag-btn ag-btn-ghost ag-btn-sm" 
                onClick={() => setShowHelpModal(false)}
                style={{ padding: 6, borderRadius: '50%', border: 'none', background: 'transparent' }}
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', maxHeight: 320, paddingRight: 4 }} className="ag-scroll">
              <div>
                <h4 className="ag-h4" style={{ margin: '0 0 4px', color: '#fff' }}>Scoring Methods</h4>
                <p className="ag-body" style={{ margin: 0, fontSize: 11.5 }}>
                  <strong>Raw Points:</strong> The match is played continuously up to the target points limit (e.g. 18, 21, 24, 32). Service rotates every 4 points. Every point won contributes to standings.
                  <br /><br />
                  <strong>Tennis Points:</strong> Matches use standard tennis scoring (15, 30, 40, Game) and are tracked set-by-set.
                </p>
              </div>

              <div>
                <h4 className="ag-h4" style={{ margin: '0 0 4px', color: '#fff' }}>Sets Format (Tennis Points Only)</h4>
                <p className="ag-body" style={{ margin: 0, fontSize: 11.5 }}>
                  <strong>BO3:</strong> Best of 3 sets (first side to win 2 sets wins).
                  <br />
                  <strong>BO4:</strong> Best of 4 sets (allows a 2-2 tie. Point standings count total games/points won).
                  <br />
                  <strong>BO5:</strong> Best of 5 sets (first side to win 3 sets wins).
                  <br />
                  <strong>First to 3:</strong> Play finishes immediately when a side achieves 3 set wins (faster version of BO5).
                </p>
              </div>

              <div>
                <h4 className="ag-h4" style={{ margin: '0 0 4px', color: '#fff' }}>Advantage / Deuce Rules</h4>
                <p className="ag-body" style={{ margin: 0, fontSize: 11.5 }}>
                  <strong>Golden Point Rule:</strong> At 40-40 (deuce), a single deciding point is played. The receiving team chooses which side to receive the serve.
                  <br />
                  <strong>Standard Advantage:</strong> Classic tennis deuce, where a side must score two consecutive points after deuce to win the game.
                </p>
              </div>
            </div>

            <button className="ag-btn ag-btn-primary ag-btn-block" onClick={() => setShowHelpModal(false)} style={{ marginTop: 8 }}>
              Got It
            </button>
          </div>
        </div>
      )}

      </div>
    </AppLayout>
  );
}

window.SetupScreen = SetupScreen;


/* --- START FILE: active-matches.jsx --- */
/* screens/active-matches.jsx — Active Match Schedule Grid */

function ActiveMatchesScreen({ tweaks, tournament, onBack, onCancelTournament, onSelectMatch, onViewLeaderboard, onEditTournament }) {
  const [activeRoundIndex, setActiveRoundIndex] = React.useState(0);

  const rounds = tournament && tournament.rounds ? tournament.rounds : [];
  const totalRounds = rounds.length;

  React.useEffect(() => {
    if (activeRoundIndex >= totalRounds && totalRounds > 0) {
      setActiveRoundIndex(totalRounds - 1);
    }
  }, [totalRounds, activeRoundIndex]);

  if (!tournament) {
    return (
      <div className="ag-body" style={{ padding: 24, textAlign: 'center' }}>
        No active tournament found. Go back to Court Central and create one.
        <br /><br />
        <button className="ag-btn ag-btn-primary" onClick={onBack}>Back to Dashboard</button>
      </div>
    );
  }

  const currentRound = rounds[activeRoundIndex] || rounds[0] || { matches: [], sittingOut: [] };

  // Check if all matches in active round are finished
  const roundMatches = currentRound.matches || [];
  const finishedCount = roundMatches.filter(m => m && m.completed).length;
  const isRoundFinished = roundMatches.length > 0 && finishedCount === roundMatches.length;

  // Smart checking if there are subsequent rounds to generate (e.g. for Mexicano)
  const isLastRound = activeRoundIndex === totalRounds - 1;

  const handleNextRound = () => {
    if (activeRoundIndex < totalRounds - 1) {
      setActiveRoundIndex(activeRoundIndex + 1);
    }
  };

  const handlePrevRound = () => {
    if (activeRoundIndex > 0) {
      setActiveRoundIndex(activeRoundIndex - 1);
    }
  };

  return (
    <AppLayout
      tweaks={tweaks}
      title={tournament.name}
      eyebrow={`Tournament In Progress`}
      onBack={onBack}
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="ag-btn ag-btn-ghost ag-btn-sm" onClick={onEditTournament}>
            <Icon name="pencil" size={13} style={{ marginRight: 4 }} /> Edit Tournament
          </button>
          <button className="ag-btn ag-btn-ghost ag-btn-sm" style={{ color: 'var(--danger)' }} onClick={onCancelTournament}>
            <Icon name="trash-2" size={14} /> End Event
          </button>
          <button className="ag-btn ag-btn-primary ag-btn-sm" onClick={onViewLeaderboard}>
            <Icon name="trophy" size={14} /> Leaderboard
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* Round Switcher Pill Bar */}
        <div className="ag-card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button 
            className="ag-btn ag-btn-ghost ag-btn-sm" 
            disabled={activeRoundIndex === 0} 
            onClick={handlePrevRound}
            style={{ padding: 8 }}
          >
            <Icon name="chevron-left" size={16} />
          </button>
          
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '2px 0' }} className="ag-scroll">
            {rounds.map((r, idx) => (
              <button
                key={idx}
                className={`ag-pill ${activeRoundIndex === idx ? 'ag-pill-active' : ''}`}
                onClick={() => setActiveRoundIndex(idx)}
                style={{ height: 28, fontSize: 11, whiteSpace: 'nowrap' }}
              >
                Round {idx + 1}
                {r.matches && Array.isArray(r.matches) && r.matches.every(m => m && m.completed) && <span style={{ marginLeft: 6, fontSize: 9 }}>✓</span>}
              </button>
            ))}
          </div>

          <button 
            className="ag-btn ag-btn-ghost ag-btn-sm" 
            disabled={activeRoundIndex === totalRounds - 1} 
            onClick={handleNextRound}
            style={{ padding: 8 }}
          >
            <Icon name="chevron-right" size={16} />
          </button>
        </div>

        {/* Current Round Panel */}
        <div className="ag-active-matches-grid">
          
          {/* Match Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="ag-h3" style={{ margin: 0 }}>Rounds Court Log</h3>
              <span className="ag-meta" style={{ color: 'var(--brand-primary)' }}>
                {finishedCount} of {roundMatches.length} matches completed
              </span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
              {roundMatches.map((match, mIdx) => {
                if (!match) return null;
                const hasScore = match.score !== null && match.score !== undefined;
                const score = match.score || {};
                const scoreA = hasScore && score.teamAScore !== undefined ? score.teamAScore : 0;
                const scoreB = hasScore && score.teamBScore !== undefined ? score.teamBScore : 0;
                const currentGameA = score.currentGameA || 0;
                const currentGameB = score.currentGameB || 0;
                const isTiebreaker = score.isTiebreaker || false;
                const sets = score.sets || [];
                
                return (
                  <div 
                    key={match.id || mIdx} 
                    className={`ag-card ag-match-card ${match.completed ? '' : 'pulse-glow-border'}`}
                    style={match.completed ? {} : { border: '1px solid rgba(255, 255, 255, 0.1)' }}
                    onClick={() => onSelectMatch(match, activeRoundIndex, mIdx)}
                  >
                    {/* Court identifier and players */}
                    <div className="ag-match-card-players">
                      <div style={{
                        width: 38, height: 38, borderRadius: 10,
                        background: match.completed ? 'rgba(255,255,255,0.03)' : 'var(--brand-light)',
                        border: match.completed ? '1px solid var(--hairline)' : '1px solid var(--brand-primary)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <div style={{ fontSize: 9, fontWeight: 600, color: match.completed ? 'var(--text-tertiary)' : 'var(--brand-primary)' }}>CRT</div>
                        <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1, color: match.completed ? 'var(--text-secondary)' : '#fff' }}>{match.court}</div>
                      </div>
                      
                      {/* Players */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ color: scoreA >= scoreB && hasScore ? 'var(--brand-primary)' : 'var(--text-primary)' }}>
                            {getTeamAPlayersString(match)}
                          </span>
                        </div>
                        <div style={{ fontSize: 8.5, letterSpacing: '0.08em', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>vs</div>
                        <div style={{ fontSize: 15, fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ color: scoreB >= scoreA && hasScore ? 'var(--brand-primary)' : 'var(--text-primary)' }}>
                            {getTeamBPlayersString(match)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Score display and tap-action */}
                    <div className="ag-match-card-actions">
                      
                      {hasScore ? (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {tournament.scoringMode === 'tennis' ? (
                            /* Traditional Sets view */
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                              {sets.map((set, sIdx) => (
                                <div key={sIdx} className="ag-inset" style={{ padding: '4px 8px', fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 600 }}>
                                  {set.teamA} - {set.teamB}
                                </div>
                              ))}
                              {/* Live Score if in-progress */}
                              {!match.completed && (
                                <div className="ag-badge ag-badge-brand" style={{ fontFamily: 'JetBrains Mono', marginLeft: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span>{currentGameA} - {currentGameB}</span>
                                  {((scoreA !== 0 || scoreB !== 0 || isTiebreaker) && (
                                    <span style={{ fontSize: 9.5, opacity: 0.85 }}>
                                      ({isTiebreaker ? `TB:${scoreA}-${scoreB}` : `${scoreA}-${scoreB}`})
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            /* Americano Points tally view */
                            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 18, fontWeight: 700, display: 'flex', gap: 6, padding: '4px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.2)' }}>
                              <span style={{ color: scoreA >= scoreB ? 'var(--brand-primary)' : 'var(--text-primary)' }}>{scoreA}</span>
                              <span style={{ color: 'var(--text-tertiary)' }}>:</span>
                              <span style={{ color: scoreB >= scoreA ? 'var(--brand-primary)' : 'var(--text-primary)' }}>{scoreB}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="ag-badge ag-badge-neutral" style={{ fontSize: 9.5 }}>Pending</span>
                      )}
                      
                      <button className={`ag-btn ${match.completed ? 'ag-btn-ghost' : 'ag-btn-primary'} ag-btn-sm`}>
                        {match.completed ? 'Edit Score' : 'Score Match'}
                      </button>
                      
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Next Round Warning / Trigger */}
            {isRoundFinished && !isLastRound && (
              <div className="ag-card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--success)' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Icon name="check-circle-2" size={20} color="var(--success)" />
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>All matches in Round {activeRoundIndex + 1} are complete!</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>You can now advance to the next round. Standings are updated.</div>
                  </div>
                </div>
                <button className="ag-btn ag-btn-primary ag-btn-sm" onClick={handleNextRound}>
                  Next Round <Icon name="chevron-right" size={14} />
                </button>
              </div>
            )}

            {isRoundFinished && isLastRound && (
              <div className="ag-card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--brand-primary)' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Icon name="trophy" size={20} color="var(--brand-primary)" className="pulse-glow-border" style={{ borderRadius: '50%', padding: 4 }} />
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>Tournament Finished!</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>All matches logged. Open the leaderboard to tally the final podium!</div>
                  </div>
                </div>
                <button className="ag-btn ag-btn-primary ag-btn-sm pulse-glow-border" onClick={onViewLeaderboard}>
                  Final Rankings <Icon name="chevron-right" size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Sit-out Bench sidebar */}
          <div className="ag-card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h4 className="ag-h4" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="coffee" size={14} color="var(--brand-primary)" /> Resting Bench
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {currentRound.sittingOut && currentRound.sittingOut.length > 0 ? (
                currentRound.sittingOut.map((p, pIdx) => (
                  <div key={pIdx} className="ag-inset" style={{ padding: '8px 10px', fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className="ag-dot" style={{ background: 'var(--text-tertiary)' }} />
                    <span style={{ fontWeight: 500 }}>{p && typeof p === 'object' ? p.name : p || 'Unknown'}</span>
                  </div>
                ))
              ) : (
                <div style={{ padding: 10, fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center' }}>
                  No players resting this round. All courts full!
                </div>
              )}
            </div>
            
            <div style={{ borderTop: '1px solid var(--hairline-soft)', paddingTop: 10, fontSize: 10.5, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
              <strong>Notice:</strong> Sit-out distributions are automatically calculated so everyone gets equal playtime. Standings leaderboard aggregates all points dynamically.
            </div>
          </div>

        </div>

      </div>
    </AppLayout>
  );
}

window.ActiveMatchesScreen = ActiveMatchesScreen;


/* --- START FILE: edit-tournament.jsx --- */
/* screens/edit-tournament.jsx — Elegant dark glassmorphic ongoing tournament editor */

function EditTournamentScreen({ tweaks, tournament, onBack, onSave }) {
  if (!tournament) return <div className="ag-body" style={{ padding: 20 }}>No active tournament found.</div>;

  const [activeTab, setActiveTab] = React.useState('settings'); // 'settings', 'roster', 'pairings'
  
  // Clone state immutably to prevent modifying prop before saving
  const [tournamentName, setTournamentName] = React.useState(tournament.name);
  const [courtsCount, setCourtsCount] = React.useState(
    tournament.rules.courtsCount || 
    Math.max(...tournament.rounds.flatMap(r => r.matches.map(m => m.court))) || 
    1
  );
  const [players, setPlayers] = React.useState(() => JSON.parse(JSON.stringify(tournament.players)));
  const [rounds, setRounds] = React.useState(() => JSON.parse(JSON.stringify(tournament.rounds)));
  
  // Tab states
  const [newPlayerName, setNewPlayerName] = React.useState('');
  const [editingPlayerId, setEditingPlayerId] = React.useState(null);
  const [tempPlayerName, setTempPlayerName] = React.useState('');
  const [activeRoundIdx, setActiveRoundIdx] = React.useState(0);
  
  // Error / Success feedback
  const [errorMessage, setErrorMessage] = React.useState('');
  const [successMessage, setSuccessMessage] = React.useState('');

  // ──────────────────────────────────────────────────────────────────────────
  // Automatically restructure rounds and re-distribute pending matches across the new court amount
  // ──────────────────────────────────────────────────────────────────────────
  // ──────────────────────────────────────────────────────────────────────────
  // Automatically restructure rounds and re-distribute pending matches across the new court amount
  // ──────────────────────────────────────────────────────────────────────────
  const handleCourtsCountChange = (newCount) => {
    const count = parseInt(newCount) || 1;
    setCourtsCount(count);
    
    // 1. Separate completed matches and collect all pending matches chronologically
    const completedMatchesByRound = [];
    const pendingMatches = [];
    
    rounds.forEach((round) => {
      const completed = [];
      round.matches.forEach(match => {
        if (match.completed) {
          completed.push(match);
        } else {
          pendingMatches.push(match);
        }
      });
      completedMatchesByRound.push(completed);
    });
    
    // 2. Re-allocate pending matches into new rounds of size `count`
    let newRounds = [];
    let pendingIdx = 0;
    let rIdx = 0;
    
    while (rIdx < completedMatchesByRound.length || pendingIdx < pendingMatches.length) {
      const roundMatches = [];
      
      // Keep any completed matches that belonged to this round index originally
      if (rIdx < completedMatchesByRound.length) {
        roundMatches.push(...completedMatchesByRound[rIdx]);
      }
      
      // Fill the remaining court slots in this round with pending matches
      const emptySlots = count - roundMatches.length;
      for (let s = 0; s < emptySlots; s++) {
        if (pendingIdx >= pendingMatches.length) break;
        const match = pendingMatches[pendingIdx];
        pendingIdx++;
        
        // Find next available court number (1-based) not taken by a completed match in this round
        let courtNum = 1;
        while (roundMatches.some(m => m.court === courtNum)) {
          courtNum++;
        }
        
        roundMatches.push({
          ...match,
          court: courtNum
        });
      }
      
      if (roundMatches.length > 0) {
        // Recalculate sitting out list for this round
        const sittingOut = getRecalculatedSittingOut(roundMatches, players);
        
        newRounds.push({
          roundIndex: rIdx,
          name: `Round ${rIdx + 1}`,
          matches: roundMatches,
          sittingOut: sittingOut
        });
        rIdx++;
      } else {
        break;
      }
    }
    
    // 3. Automatically run our duplicate-free play-count-balanced regenerator on the restructured rounds
    // to guarantee there are no booking collisions (duplicate players in same round)!
    newRounds = regeneratePendingPairings(newRounds, players, count, tournament.format);
    
    setRounds(newRounds);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Recalculates who is sitting out for a given round based on active matches
  // ──────────────────────────────────────────────────────────────────────────
  const getRecalculatedSittingOut = (roundMatches, currentPlayers) => {
    const playingIds = new Set();
    roundMatches.forEach(m => {
      if (tournament.format === 'team_americano') {
        const teamIdA = m.rawTeamA?.id || m.teamA.p1?.id;
        const teamIdB = m.rawTeamB?.id || m.teamB.p1?.id;
        if (teamIdA) playingIds.add(teamIdA);
        if (teamIdB) playingIds.add(teamIdB);
      } else {
        if (m.teamA.p1 && m.teamA.p1.id) playingIds.add(m.teamA.p1.id);
        if (m.teamA.p2 && m.teamA.p2.id) playingIds.add(m.teamA.p2.id);
        if (m.teamB.p1 && m.teamB.p1.id) playingIds.add(m.teamB.p1.id);
        if (m.teamB.p2 && m.teamB.p2.id) playingIds.add(m.teamB.p2.id);
      }
    });
    return currentPlayers.filter(p => !playingIds.has(p.id));
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Intelligent play-count balanced pairings generator for all uncompleted matches
  // ──────────────────────────────────────────────────────────────────────────
  const regeneratePendingPairings = (currentRounds, currentPlayers, count, tournamentFormat) => {
    const isTeam = tournamentFormat === 'team_americano';
    const playersNeededPerMatch = isTeam ? 2 : 4;
    
    const updatedRounds = JSON.parse(JSON.stringify(currentRounds));
    
    // Keep track of match counts per player to ensure fair play time
    const playCounts = {};
    currentPlayers.forEach(p => {
      playCounts[p.id] = 0;
    });
    
    // Tally play counts from completed matches across all rounds
    updatedRounds.forEach(round => {
      round.matches.forEach(match => {
        if (match.completed) {
          if (isTeam) {
            if (match.teamA.p1?.id) playCounts[match.teamA.p1.id] = (playCounts[match.teamA.p1.id] || 0) + 1;
            if (match.teamB.p1?.id) playCounts[match.teamB.p1.id] = (playCounts[match.teamB.p1.id] || 0) + 1;
          } else {
            if (match.teamA.p1?.id) playCounts[match.teamA.p1.id] = (playCounts[match.teamA.p1.id] || 0) + 1;
            if (match.teamA.p2?.id) playCounts[match.teamA.p2.id] = (playCounts[match.teamA.p2.id] || 0) + 1;
            if (match.teamB.p1?.id) playCounts[match.teamB.p1.id] = (playCounts[match.teamB.p1.id] || 0) + 1;
            if (match.teamB.p2?.id) playCounts[match.teamB.p2.id] = (playCounts[match.teamB.p2.id] || 0) + 1;
          }
        }
      });
    });
    
    // Process each round to re-generate pending matches
    updatedRounds.forEach((round, rIdx) => {
      // 1. Separate completed matches in this round
      const completed = round.matches.filter(m => m.completed);
      
      // Determine which players are already busy in completed matches in this round
      const busyPlayers = new Set();
      completed.forEach(match => {
        if (isTeam) {
          if (match.teamA.p1?.id) busyPlayers.add(match.teamA.p1.id);
          if (match.teamB.p1?.id) busyPlayers.add(match.teamB.p1.id);
        } else {
          if (match.teamA.p1?.id) busyPlayers.add(match.teamA.p1.id);
          if (match.teamA.p2?.id) busyPlayers.add(match.teamA.p2.id);
          if (match.teamB.p1?.id) busyPlayers.add(match.teamB.p1.id);
          if (match.teamB.p2?.id) busyPlayers.add(match.teamB.p2.id);
        }
      });
      
      // 2. Generate new pending matches to fill the remaining court slots
      const activeMatches = [...completed];
      const maxMatchesInRound = count;
      const emptySlots = maxMatchesInRound - completed.length;
      
      if (emptySlots > 0) {
        // Find players who are available (not busy in completed matches)
        let availablePlayers = currentPlayers.filter(p => !busyPlayers.has(p.id));
        
        const totalMatchesToGenerate = emptySlots;
        
        for (let m = 0; m < totalMatchesToGenerate; m++) {
          if (availablePlayers.length < playersNeededPerMatch) break;
          
          // Sort available players by their play count ascending to prioritize benched/rested athletes
          availablePlayers.sort((a, b) => (playCounts[a.id] || 0) - (playCounts[b.id] || 0));
          
          // Select candidate players with similar low play counts
          const lowestCount = playCounts[availablePlayers[0].id] || 0;
          const candidates = availablePlayers.filter(p => (playCounts[p.id] || 0) <= lowestCount + 1);
          
          // Shuffle candidates randomly to randomize the pairings organically
          const shuffledCandidates = candidates.sort(() => Math.random() - 0.5);
          
          // Grab the needed players
          const matchPlayers = [];
          for (let i = 0; i < playersNeededPerMatch; i++) {
            const nextPlayer = shuffledCandidates[i] || availablePlayers.find(p => !matchPlayers.includes(p));
            if (nextPlayer) {
              matchPlayers.push(nextPlayer);
              availablePlayers = availablePlayers.filter(p => p.id !== nextPlayer.id);
            }
          }
          
          if (matchPlayers.length < playersNeededPerMatch) break;
          
          // Increment play counts
          matchPlayers.forEach(p => {
            playCounts[p.id] = (playCounts[p.id] || 0) + 1;
          });
          
          // Find next available court number
          let courtNum = 1;
          while (activeMatches.some(am => am.court === courtNum)) {
            courtNum++;
          }
          
          // Build match structure
          if (isTeam) {
            activeMatches.push({
              id: `r${rIdx + 1}_m_gen_${Date.now()}_${m}`,
              court: courtNum,
              teamA: { 
                p1: { id: matchPlayers[0].p1?.id || matchPlayers[0].id, name: matchPlayers[0].p1?.name || matchPlayers[0].name }, 
                p2: { id: matchPlayers[0].p2?.id || '', name: matchPlayers[0].p2?.name || '' } 
              },
              teamB: { 
                p1: { id: matchPlayers[1].p1?.id || matchPlayers[1].id, name: matchPlayers[1].p1?.name || matchPlayers[1].name }, 
                p2: { id: matchPlayers[1].p2?.id || '', name: matchPlayers[1].p2?.name || '' } 
              },
              score: null,
              completed: false,
              rawTeamA: matchPlayers[0],
              rawTeamB: matchPlayers[1]
            });
          } else {
            activeMatches.push({
              id: `r${rIdx + 1}_m_gen_${Date.now()}_${m}`,
              court: courtNum,
              teamA: { 
                p1: { id: matchPlayers[0].id, name: matchPlayers[0].name }, 
                p2: { id: matchPlayers[1].id, name: matchPlayers[1].name } 
              },
              teamB: { 
                p1: { id: matchPlayers[2].id, name: matchPlayers[2].name }, 
                p2: { id: matchPlayers[3].id, name: matchPlayers[3].name } 
              },
              score: null,
              completed: false
            });
          }
        }
      }
      
      // Update round matches and sitting out list
      round.matches = activeMatches;
      round.sittingOut = getRecalculatedSittingOut(activeMatches, currentPlayers);
    });
    
    return updatedRounds;
  };

  const handleShufflePending = () => {
    const updatedRounds = regeneratePendingPairings(rounds, players, courtsCount, tournament.format);
    setRounds(updatedRounds);
    setErrorMessage('');
    setSuccessMessage("🎲 Pending pairings re-shuffled randomly & resting benches balanced successfully!");
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Tab 1: Settings logic (Add Player)
  // ──────────────────────────────────────────────────────────────────────────
  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) return;
    const name = newPlayerName.trim();
    if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      setErrorMessage("A player or team with this name already exists.");
      return;
    }
    
    // Construct new player object
    const newPlayer = {
      id: `p_${Date.now()}`,
      name: name,
      points: 0,
      diff: 0,
      played: 0,
      won: 0,
      lost: 0
    };
    
    const updatedPlayers = [...players, newPlayer];
    setPlayers(updatedPlayers);
    setNewPlayerName('');
    setErrorMessage('');
    
    // Automatically recalculate sittingOut across all rounds to put them on the bench
    const updatedRounds = rounds.map(r => ({
      ...r,
      sittingOut: getRecalculatedSittingOut(r.matches, updatedPlayers)
    }));
    setRounds(updatedRounds);
    
    setSuccessMessage(`Added "${name}" to roster. They will rest on the bench for rounds until swapped into matches!`);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Tab 2: Roster logic (Rename Player with Cascade)
  // ──────────────────────────────────────────────────────────────────────────
  const startEditingPlayer = (p) => {
    setEditingPlayerId(p.id);
    setTempPlayerName(p.name);
  };

  const savePlayerRename = (pId) => {
    if (!tempPlayerName.trim()) return;
    const newName = tempPlayerName.trim();
    
    // Update players roster list
    const updatedPlayers = players.map(p => {
      if (p.id === pId) return { ...p, name: newName };
      return p;
    });
    setPlayers(updatedPlayers);

    // Cascade name changes throughout all rounds and matches
    const updatedRounds = rounds.map(round => {
      const updatedMatches = round.matches.map(match => {
        const teamA = { ...match.teamA };
        const teamB = { ...match.teamB };
        
        if (teamA.p1 && teamA.p1.id === pId) teamA.p1 = { ...teamA.p1, name: newName };
        if (teamA.p2 && teamA.p2.id === pId) teamA.p2 = { ...teamA.p2, name: newName };
        if (teamB.p1 && teamB.p1.id === pId) teamB.p1 = { ...teamB.p1, name: newName };
        if (teamB.p2 && teamB.p2.id === pId) teamB.p2 = { ...teamB.p2, name: newName };
        
        return { ...match, teamA, teamB };
      });
      
      const updatedSittingOut = round.sittingOut.map(p => {
        if (p.id === pId) return { ...p, name: newName };
        return p;
      });

      return {
        ...round,
        matches: updatedMatches,
        sittingOut: updatedSittingOut
      };
    });

    setRounds(updatedRounds);
    setEditingPlayerId(null);
    setSuccessMessage("Player renamed and changes cascaded successfully!");
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Tab 3: Pairings Editor logic (Change court or players)
  // ──────────────────────────────────────────────────────────────────────────
  const handleMatchTeamChange = (mIdx, team, selectedTeamId) => {
    const selectedTeam = players.find(t => t.id === selectedTeamId) || { id: '', name: '', p1: { id: '', name: '' }, p2: { id: '', name: '' } };
    
    const updatedRounds = rounds.map((round, rIdx) => {
      if (rIdx !== activeRoundIdx) return round;
      
      const updatedMatches = round.matches.map((match, idx) => {
        if (idx !== mIdx) return match;
        
        return {
          ...match,
          [team]: {
            p1: { id: selectedTeam.p1?.id || selectedTeam.id, name: selectedTeam.p1?.name || selectedTeam.name },
            p2: { id: selectedTeam.p2?.id || '', name: selectedTeam.p2?.name || '' }
          },
          [team === 'teamA' ? 'rawTeamA' : 'rawTeamB']: selectedTeam
        };
      });

      return {
        ...round,
        matches: updatedMatches,
        sittingOut: getRecalculatedSittingOut(updatedMatches, players)
      };
    });

    setRounds(updatedRounds);
    setErrorMessage('');
  };

  const handleMatchPlayerChange = (mIdx, team, slot, selectedId) => {
    const selectedPlayer = players.find(p => p.id === selectedId) || { id: '', name: '' };
    
    const updatedRounds = rounds.map((round, rIdx) => {
      if (rIdx !== activeRoundIdx) return round;
      
      const updatedMatches = round.matches.map((match, idx) => {
        if (idx !== mIdx) return match;
        
        const updatedTeam = { ...match[team] };
        updatedTeam[slot] = { id: selectedPlayer.id, name: selectedPlayer.name };
        
        return { ...match, [team]: updatedTeam };
      });

      return {
        ...round,
        matches: updatedMatches,
        sittingOut: getRecalculatedSittingOut(updatedMatches, players)
      };
    });

    setRounds(updatedRounds);
    setErrorMessage('');
  };

  const handleMatchCourtChange = (mIdx, courtNum) => {
    const updatedRounds = rounds.map((round, rIdx) => {
      if (rIdx !== activeRoundIdx) return round;
      
      const updatedMatches = round.matches.map((match, idx) => {
        if (idx !== mIdx) return match;
        return { ...match, court: parseInt(courtNum) || 1 };
      });

      return { ...round, matches: updatedMatches };
    });

    setRounds(updatedRounds);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Save Action & Duplicate Collisions Validation
  // ──────────────────────────────────────────────────────────────────────────
  const handleFormSubmit = () => {
    // 1. Validate duplicates in any round
    for (let r = 0; r < rounds.length; r++) {
      const round = rounds[r];
      const assignedIds = [];
      
      for (let m = 0; m < round.matches.length; m++) {
        const match = round.matches[m];
        if (tournament.format === 'team_americano') {
          const teamIdA = match.rawTeamA?.id || match.teamA.p1?.id;
          const teamIdB = match.rawTeamB?.id || match.teamB.p1?.id;
          if (teamIdA) assignedIds.push(teamIdA);
          if (teamIdB) assignedIds.push(teamIdB);
        } else {
          if (match.teamA.p1 && match.teamA.p1.id) assignedIds.push(match.teamA.p1.id);
          if (match.teamA.p2 && match.teamA.p2.id) assignedIds.push(match.teamA.p2.id);
          if (match.teamB.p1 && match.teamB.p1.id) assignedIds.push(match.teamB.p1.id);
          if (match.teamB.p2 && match.teamB.p2.id) assignedIds.push(match.teamB.p2.id);
        }
      }
      
      // Look for duplicate IDs in assignedIds
      const uniqueIds = new Set(assignedIds);
      if (uniqueIds.size !== assignedIds.length) {
        // Find which ID is duplicate
        const dupId = assignedIds.find((id, idx) => assignedIds.indexOf(id) !== idx);
        const dupPlayerName = players.find(p => p.id === dupId)?.name || "Unknown Player/Team";
        setErrorMessage(`Duplicate warning: "${dupPlayerName}" is booked multiple times in Round ${r + 1}. Resolve the duplicate before saving.`);
        setActiveTab('pairings');
        setActiveRoundIdx(r);
        return;
      }
    }

    // 2. Finalize changes
    const updatedTournament = {
      ...tournament,
      name: tournamentName.trim(),
      rules: {
        ...tournament.rules,
        courtsCount: parseInt(courtsCount) || 1
      },
      players: players,
      rounds: rounds
    };

    onSave(updatedTournament);
  };

  return (
    <AppLayout
      tweaks={tweaks}
      title="Edit Event"
      eyebrow="Tournament Customizer"
      onBack={onBack}
      actions={
        <button className="ag-btn ag-btn-primary ag-btn-sm pulse-glow-border" onClick={handleFormSubmit}>
          <Icon name="check" size={14} /> Save Changes
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* Navigation Tabs */}
        <div className="ag-card" style={{ padding: 6, display: 'flex', gap: 6 }}>
          <button 
            className={`ag-pill ${activeTab === 'settings' ? 'ag-pill-active' : ''}`}
            onClick={() => { setActiveTab('settings'); setErrorMessage(''); }}
            style={{ flex: 1, height: 32, justifyContent: 'center' }}
          >
            <Icon name="settings" size={13} style={{ marginRight: 6 }} /> Match Settings
          </button>
          <button 
            className={`ag-pill ${activeTab === 'roster' ? 'ag-pill-active' : ''}`}
            onClick={() => { setActiveTab('roster'); setErrorMessage(''); }}
            style={{ flex: 1, height: 32, justifyContent: 'center' }}
          >
            <Icon name="users" size={13} style={{ marginRight: 6 }} /> Players Roster ({players.length})
          </button>
          <button 
            className={`ag-pill ${activeTab === 'pairings' ? 'ag-pill-active' : ''}`}
            onClick={() => { setActiveTab('pairings'); setErrorMessage(''); }}
            style={{ flex: 1, height: 32, justifyContent: 'center' }}
          >
            <Icon name="swords" size={13} style={{ marginRight: 6 }} /> Match Pairings
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="ag-card pulse-glow-border" style={{ padding: 12, background: 'rgba(239, 68, 68, 0.08)', border: '1px solid var(--danger)' }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--danger)', display: 'flex', gap: 6, alignItems: 'center' }}>
              <Icon name="alert-triangle" size={15} /> {errorMessage}
            </span>
          </div>
        )}

        {successMessage && (
          <div className="ag-card" style={{ padding: 12, background: 'rgba(34, 197, 94, 0.08)', border: '1px solid var(--success)' }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--success)', display: 'flex', gap: 6, alignItems: 'center' }}>
              <Icon name="check-circle-2" size={15} /> {successMessage}
            </span>
          </div>
        )}

        {/* TAB 1: Tournament Settings */}
        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            <div className="ag-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 className="ag-h3" style={{ margin: 0 }}>Tournament Properties</h3>
              
              <div>
                <label className="ag-label">Match Title</label>
                <input 
                  type="text" 
                  className="ag-input" 
                  value={tournamentName} 
                  onChange={(e) => setTournamentName(e.target.value)} 
                  placeholder="Enter match name..."
                  style={{ boxSizing: 'border-box', width: '100%' }}
                />
              </div>

              <div>
                <label className="ag-label">Available Courts</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[1, 2, 3, 4].map(c => (
                    <button 
                      key={c}
                      type="button" 
                      className={`ag-pill ${courtsCount === c ? 'ag-pill-active' : ''}`}
                      onClick={() => handleCourtsCountChange(c)}
                      style={{ flex: 1, justifyContent: 'center', height: 38 }}
                    >
                      {c} {c === 1 ? 'Court' : 'Courts'}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>
                  Changing court counts lets you re-allocate court numbers under the "Match Pairings" scheduler tab.
                </div>
              </div>
            </div>

            <div className="ag-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h3 className="ag-h3" style={{ margin: 0 }}>Add New Player/Team</h3>
              <p className="ag-body" style={{ fontSize: 11.5, color: 'var(--text-secondary)', margin: '0 0 6px' }}>
                Late guest arrival? Register them here. They will automatically be benched for existing rounds and immediately ready to be swapped into match slot pairings.
              </p>
              
              <div style={{ display: 'flex', gap: 8 }}>
                <input 
                  type="text" 
                  className="ag-input" 
                  placeholder="Enter name..." 
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddPlayer(); }}
                  style={{ flex: 1, minWidth: 0 }}
                />
                <button className="ag-btn ag-btn-primary" onClick={handleAddPlayer} style={{ padding: '0 18px', flexShrink: 0 }}>
                  <Icon name="plus" size={16} /> Add Athlete
                </button>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: Players Roster */}
        {activeTab === 'roster' && (
          <div className="ag-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 className="ag-h3" style={{ margin: 0 }}>Roster Registry</h3>
            <p className="ag-body" style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>
              Fix typos easily! Renaming players instantly cascades their new names across all rounds, pending matches, and completed historic score summaries in real-time.
            </p>
            
            <div className="ag-inset ag-scroll" style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: 4 }}>
              {players.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)' }}>No players in tournament. Add them under Settings.</div>
              ) : (
                players.map((p, idx) => (
                  <div 
                    key={p.id || idx} 
                    style={{ 
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                      padding: '8px 10px', borderRadius: 8, borderBottom: '1px solid var(--hairline-soft)'
                    }}
                  >
                    {editingPlayerId === p.id ? (
                      <div style={{ display: 'flex', gap: 6, width: '100%' }}>
                        <input 
                          type="text" 
                          className="ag-input ag-input-sm" 
                          value={tempPlayerName} 
                          onChange={(e) => setTempPlayerName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') savePlayerRename(p.id); }}
                          style={{ flex: 1, height: 30, fontSize: 12.5 }}
                        />
                        <button className="ag-btn ag-btn-primary ag-btn-sm" onClick={() => savePlayerRename(p.id)} style={{ padding: '4px 10px', height: 30 }}>
                          <Icon name="check" size={12} />
                        </button>
                        <button className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => setEditingPlayerId(null)} style={{ padding: '4px 10px', height: 30 }}>
                          <Icon name="x" size={12} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span style={{ fontSize: 12.5, fontWeight: 500, color: '#fff' }}>
                          {idx + 1}. {p.name}
                        </span>
                        <button 
                          className="ag-btn ag-btn-ghost ag-btn-sm" 
                          onClick={() => startEditingPlayer(p)}
                          style={{ padding: 6, borderRadius: '50%', color: 'var(--brand-primary)' }}
                        >
                          <Icon name="pencil" size={12} />
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Match Pairings Scheduler */}
        {activeTab === 'pairings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Round switcher */}
            <div className="ag-card" style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                className="ag-btn ag-btn-ghost ag-btn-sm" 
                disabled={activeRoundIdx === 0} 
                onClick={() => setActiveRoundIdx(prev => prev - 1)}
                style={{ padding: 8 }}
              >
                <Icon name="chevron-left" size={16} />
              </button>
              
              <h4 className="ag-h4" style={{ margin: 0, color: 'var(--brand-primary)' }}>
                Round {activeRoundIdx + 1} Match Pairings
              </h4>

              <button 
                className="ag-btn ag-btn-ghost ag-btn-sm" 
                disabled={activeRoundIdx === rounds.length - 1} 
                onClick={() => setActiveRoundIdx(prev => prev + 1)}
                style={{ padding: 8 }}
              >
                <Icon name="chevron-right" size={16} />
              </button>
            </div>

            {/* Quick action bar to shuffle pending pairings */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -4, marginBottom: 4 }}>
              <button 
                type="button"
                className="ag-btn ag-btn-ghost ag-btn-sm" 
                onClick={handleShufflePending}
                style={{ 
                  color: 'var(--brand-primary)', 
                  border: '1px solid var(--brand-glow)', 
                  background: 'rgba(163, 230, 53, 0.04)',
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Icon name="shuffle" size={13} /> Shuffle Pending Pairings
              </button>
            </div>

            {/* Main Round Pairs Layout */}
            <div className="ag-active-matches-grid">
              
              {/* Match log editor list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h3 className="ag-h3" style={{ margin: 0 }}>Courts Assignments</h3>
                
                {rounds[activeRoundIdx]?.matches.map((match, mIdx) => {
                  const isLocked = match.completed;
                  return (
                    <div 
                      key={match.id || mIdx}
                      className="ag-card"
                      style={{ 
                        padding: 22, 
                        border: isLocked ? '1px solid var(--hairline)' : '1px solid var(--brand-glow)',
                        background: isLocked ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)'
                      }}
                    >
                      
                      {/* Top Header Card Info */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="ag-badge ag-badge-brand" style={{ fontSize: 9.5 }}>MATCH {mIdx + 1}</span>
                          {isLocked && (
                            <span className="ag-badge ag-badge-neutral" style={{ fontSize: 9, display: 'flex', gap: 4, alignItems: 'center' }}>
                              <Icon name="lock" size={9} /> Completed & Locked
                            </span>
                          )}
                        </div>
                        
                        {/* Court Assignment select */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="ag-meta" style={{ fontSize: 10.5 }}>Court:</span>
                          <select 
                            className="ag-select"
                            value={match.court}
                            disabled={isLocked}
                            onChange={(e) => handleMatchCourtChange(mIdx, e.target.value)}
                            style={{ padding: '2px 8px', fontSize: 11, width: 70, height: 26 }}
                          >
                            {Array.from({ length: courtsCount }).map((_, cIdx) => (
                              <option key={cIdx + 1} value={cIdx + 1}>Crt {cIdx + 1}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Doubles Teams Pairings editor grid */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        
                        {tournament.format === 'team_americano' ? (
                          <>
                            {/* TEAM A */}
                            <div className="ag-inset" style={{ padding: 10, background: 'rgba(0,0,0,0.1)' }}>
                              <div className="ag-eyebrow" style={{ fontSize: 8.5, marginBottom: 6, color: 'var(--brand-primary)' }}>Team A</div>
                              <select 
                                className="ag-select"
                                value={match.rawTeamA?.id || match.teamA.p1?.id || ''}
                                disabled={isLocked}
                                onChange={(e) => handleMatchTeamChange(mIdx, 'teamA', e.target.value)}
                                style={{ width: '100%', fontSize: 11, height: 28, padding: '2px 6px' }}
                              >
                                <option value="">-- Select Team --</option>
                                {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                              </select>
                            </div>

                            {/* VS BAR */}
                            <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', margin: '2px 0' }}>VS</div>

                            {/* TEAM B */}
                            <div className="ag-inset" style={{ padding: 10, background: 'rgba(0,0,0,0.1)' }}>
                              <div className="ag-eyebrow" style={{ fontSize: 8.5, marginBottom: 6, color: 'var(--brand-primary)' }}>Team B</div>
                              <select 
                                className="ag-select"
                                value={match.rawTeamB?.id || match.teamB.p1?.id || ''}
                                disabled={isLocked}
                                onChange={(e) => handleMatchTeamChange(mIdx, 'teamB', e.target.value)}
                                style={{ width: '100%', fontSize: 11, height: 28, padding: '2px 6px' }}
                              >
                                <option value="">-- Select Team --</option>
                                {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                              </select>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* TEAM A */}
                            <div className="ag-inset" style={{ padding: 10, background: 'rgba(0,0,0,0.1)' }}>
                              <div className="ag-eyebrow" style={{ fontSize: 8.5, marginBottom: 6, color: 'var(--brand-primary)' }}>Team A Players</div>
                              
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <div>
                                  <label style={{ fontSize: 9, color: 'var(--text-tertiary)', marginBottom: 2, display: 'block' }}>Player 1</label>
                                  <select 
                                    className="ag-select"
                                    value={match.teamA.p1?.id || ''}
                                    disabled={isLocked}
                                    onChange={(e) => handleMatchPlayerChange(mIdx, 'teamA', 'p1', e.target.value)}
                                    style={{ width: '100%', fontSize: 11, height: 28, padding: '2px 6px' }}
                                  >
                                    <option value="">-- Empty --</option>
                                    {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label style={{ fontSize: 9, color: 'var(--text-tertiary)', marginBottom: 2, display: 'block' }}>Player 2 (Optional)</label>
                                  <select 
                                    className="ag-select"
                                    value={match.teamA.p2?.id || ''}
                                    disabled={isLocked}
                                    onChange={(e) => handleMatchPlayerChange(mIdx, 'teamA', 'p2', e.target.value)}
                                    style={{ width: '100%', fontSize: 11, height: 28, padding: '2px 6px' }}
                                  >
                                    <option value="">-- Empty --</option>
                                    {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                  </select>
                                </div>
                              </div>
                            </div>

                            {/* VS BAR */}
                            <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', margin: '2px 0' }}>VS</div>

                            {/* TEAM B */}
                            <div className="ag-inset" style={{ padding: 10, background: 'rgba(0,0,0,0.1)' }}>
                              <div className="ag-eyebrow" style={{ fontSize: 8.5, marginBottom: 6, color: 'var(--brand-primary)' }}>Team B Players</div>
                              
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <div>
                                  <label style={{ fontSize: 9, color: 'var(--text-tertiary)', marginBottom: 2, display: 'block' }}>Player 1</label>
                                  <select 
                                    className="ag-select"
                                    value={match.teamB.p1?.id || ''}
                                    disabled={isLocked}
                                    onChange={(e) => handleMatchPlayerChange(mIdx, 'teamB', 'p1', e.target.value)}
                                    style={{ width: '100%', fontSize: 11, height: 28, padding: '2px 6px' }}
                                  >
                                    <option value="">-- Empty --</option>
                                    {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label style={{ fontSize: 9, color: 'var(--text-tertiary)', marginBottom: 2, display: 'block' }}>Player 2 (Optional)</label>
                                  <select 
                                    className="ag-select"
                                    value={match.teamB.p2?.id || ''}
                                    disabled={isLocked}
                                    onChange={(e) => handleMatchPlayerChange(mIdx, 'teamB', 'p2', e.target.value)}
                                    style={{ width: '100%', fontSize: 11, height: 28, padding: '2px 6px' }}
                                  >
                                    <option value="">-- Empty --</option>
                                    {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                  </select>
                                </div>
                              </div>
                            </div>
                          </>
                        )}

                      </div>

                    </div>
                  );
                })}
              </div>

              {/* Autocomplete bench sidebar */}
              <div className="ag-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h4 className="ag-h4" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="coffee" size={14} color="var(--brand-primary)" /> Rest Bench (Round {activeRoundIdx + 1})
                </h4>
                <p className="ag-body" style={{ fontSize: 10.5, color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.4 }}>
                  Calculated automatically! These players are not playing in any match in Round {activeRoundIdx + 1}.
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {rounds[activeRoundIdx]?.sittingOut && rounds[activeRoundIdx].sittingOut.length > 0 ? (
                    rounds[activeRoundIdx].sittingOut.map((p, idx) => (
                      <div key={p.id || idx} className="ag-inset" style={{ padding: '6px 10px', fontSize: 11.5, display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span className="ag-dot" style={{ background: 'var(--text-tertiary)' }} />
                        <span style={{ fontWeight: 500 }}>{p.name}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: 10, fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center' }}>
                      Nobody is resting this round. Courts are full!
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </AppLayout>
  );
}

window.EditTournamentScreen = EditTournamentScreen;


/* --- START FILE: interactive-scorer.jsx --- */
/* screens/interactive-scorer.jsx — Immersive Court Scorer & Voice Referee */

function InteractiveScorerScreen({ tweaks, match, onBack, onSaveMatch }) {
  if (!match) return <div className="ag-body" style={{ padding: 20 }}>No match selected.</div>;

  const isPointsMode = match.scoringMode === 'points';
  const isTennisMode = match.scoringMode === 'tennis';

  const getPlayerName = (p) => {
    if (!p) return '';
    return typeof p === 'object' ? p.name : p;
  };

  // Core Match State
  const [teamAScore, setTeamAScore] = React.useState(match.score.teamAScore || 0);
  const [teamBScore, setTeamBScore] = React.useState(match.score.teamBScore || 0);
  const [sets, setSets] = React.useState(match.score.sets ? [...match.score.sets] : []);
  const [serving, setServing] = React.useState(match.serving || match.score.serving || 'teamA');
  const [serverIndex, setServerIndex] = React.useState(match.serverIndex !== undefined ? match.serverIndex : (match.score.serverIndex !== undefined ? match.score.serverIndex : 0));
  
  // Game & Tiebreak sub-states
  const [currentGameA, setCurrentGameA] = React.useState(match.score.currentGameA || 0); // active games in active set
  const [currentGameB, setCurrentGameB] = React.useState(match.score.currentGameB || 0);
  const [isTiebreaker, setIsTiebreaker] = React.useState(match.score.isTiebreaker || false);
  const [tiebreakScoreA, setTiebreakScoreA] = React.useState(match.score.tiebreakScoreA || 0);
  const [tiebreakScoreB, setTiebreakScoreB] = React.useState(match.score.tiebreakScoreB || 0);

  // Undo/Redo Stack
  const [history, setHistory] = React.useState([]);
  const [redoStack, setRedoStack] = React.useState([]);

  // Match Timer
  const [elapsed, setElapsed] = React.useState(0);
  const [timerActive, setTimerActive] = React.useState(true);
  
  const isMountedRef = React.useRef(false);

  // Auto-Save after every single scoring input in background
  React.useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    
    if (match.completed) return;
    
    const currentScore = {
      teamAScore: isTiebreaker ? tiebreakScoreA : teamAScore,
      teamBScore: isTiebreaker ? tiebreakScoreB : teamBScore,
      sets: sets,
      currentGameA,
      currentGameB,
      isTiebreaker,
      serving,
      serverIndex,
      tiebreakScoreA,
      tiebreakScoreB
    };
    
    onSaveMatch(currentScore, false); // completed = false (silent sync)
  }, [teamAScore, teamBScore, sets, currentGameA, currentGameB, isTiebreaker, tiebreakScoreA, tiebreakScoreB, serving, serverIndex]);

  React.useEffect(() => {
    let interval = null;
    if (timerActive) {
      interval = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Push current state to undo stack
  const captureHistory = () => {
    const state = {
      teamAScore,
      teamBScore,
      sets: [...sets],
      serving,
      serverIndex,
      currentGameA,
      currentGameB,
      isTiebreaker,
      tiebreakScoreA,
      tiebreakScoreB
    };
    setHistory([...history, state]);
    setRedoStack([]); // Clear redo
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    
    // Save current to redo
    const current = {
      teamAScore,
      teamBScore,
      sets: [...sets],
      serving,
      serverIndex,
      currentGameA,
      currentGameB,
      isTiebreaker,
      tiebreakScoreA,
      tiebreakScoreB
    };
    setRedoStack([current, ...redoStack]);

    // Restore previous
    setTeamAScore(previous.teamAScore);
    setTeamBScore(previous.teamBScore);
    setSets(previous.sets);
    setServing(previous.serving);
    setServerIndex(previous.serverIndex);
    setCurrentGameA(previous.currentGameA);
    setCurrentGameB(previous.currentGameB);
    setIsTiebreaker(previous.isTiebreaker);
    setTiebreakScoreA(previous.tiebreakScoreA);
    setTiebreakScoreB(previous.tiebreakScoreB);

    setHistory(history.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];

    // Push current to undo
    const current = {
      teamAScore,
      teamBScore,
      sets: [...sets],
      serving,
      serverIndex,
      currentGameA,
      currentGameB,
      isTiebreaker,
      tiebreakScoreA,
      tiebreakScoreB
    };
    setHistory([...history, current]);

    // Restore next
    setTeamAScore(next.teamAScore);
    setTeamBScore(next.teamBScore);
    setSets(next.sets);
    setServing(next.serving);
    setServerIndex(next.serverIndex);
    setCurrentGameA(next.currentGameA);
    setCurrentGameB(next.currentGameB);
    setIsTiebreaker(next.isTiebreaker);
    setTiebreakScoreA(next.tiebreakScoreA);
    setTiebreakScoreB(next.tiebreakScoreB);

    setRedoStack(redoStack.slice(1));
  };

  // Switch server helper
  const rotateServer = (currentServ, currentIdx) => {
    if (currentServ === 'teamA') {
      return { nextServ: 'teamB', nextIdx: currentIdx }; // Switch serve to Team B
    } else {
      return { nextServ: 'teamA', nextIdx: (currentIdx + 1) % 2 }; // Switch back to Team A, rotate player index
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Scoring Action: Americano Points Mode
  // ──────────────────────────────────────────────────────────────────────────
  const scorePointAmericano = (winningTeam) => {
    captureHistory();
    
    let nextA = teamAScore;
    let nextB = teamBScore;

    if (winningTeam === 'teamA') {
      nextA += 1;
      setTeamAScore(nextA);
    } else {
      nextB += 1;
      setTeamBScore(nextB);
    }

    const totalPts = nextA + nextB;
    const ptsLimit = match.rules.pointsLimit || 24;

    // Service alternates every 4 points in classic Americano
    if (totalPts % 4 === 0 && totalPts < ptsLimit) {
      const { nextServ, nextIdx } = rotateServer(serving, serverIndex);
      setServing(nextServ);
      setServerIndex(nextIdx);
      SpeechAnnouncer.speak(tweaks.refereeVoice.startsWith('es') ? "Cambio de servicio" : "Service change", tweaks.refereeVoice);
    }

    // Call Vocal referee to read score aloud
    SpeechAnnouncer.announceScore(nextA, nextB, false, false, tweaks.refereeVoice);

    // Check if match is completed (e.g. reached point limit, e.g. play exactly 24 points or first to 24)
    // Most Americanos play EXACTLY a fixed number of points (e.g., sum is 24, score can be 14-10)
    if (totalPts >= ptsLimit) {
      setTimerActive(false);
      SpeechAnnouncer.speak(tweaks.refereeVoice.startsWith('es') ? "Partido terminado!" : "Match finished!", tweaks.refereeVoice);
      setTimeout(() => {
        handleSave(nextA, nextB, true);
      }, 1000);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Scoring Action: Traditional Tennis Sets Mode
  // ──────────────────────────────────────────────────────────────────────────
  const scorePointTennis = (winningTeam) => {
    captureHistory();

    const isGoldenPoint = match.rules.advantageRule === 'goldenPoint';
    
    // Case A: Active Set is in a Tiebreaker
    if (isTiebreaker) {
      let nextTB_A = tiebreakScoreA;
      let nextTB_B = tiebreakScoreB;

      if (winningTeam === 'teamA') nextTB_A += 1;
      else nextTB_B += 1;

      setTiebreakScoreA(nextTB_A);
      setTiebreakScoreB(nextTB_B);

      // Speak tiebreak point
      SpeechAnnouncer.announceScore(nextTB_A, nextTB_B, false, false, tweaks.refereeVoice);

      // Service changes: first point served by Team A. Subsequent changes every 2 points.
      const tbTotal = nextTB_A + nextTB_B;
      if (tbTotal % 2 === 1) {
        const { nextServ, nextIdx } = rotateServer(serving, serverIndex);
        setServing(nextServ);
        setServerIndex(nextIdx);
      }

      const target = match.rules.tiebreakerTarget || 7;
      if (nextTB_A >= target && nextTB_A - nextTB_B >= 2) {
        winGame('teamA', true); // Team A wins tiebreak game (and set)
      } else if (nextTB_B >= target && nextTB_B - nextTB_A >= 2) {
        winGame('teamB', true); // Team B wins tiebreak game (and set)
      }
      return;
    }

    // Case B: Standard Game point increment
    let scoreA = teamAScore;
    let scoreB = teamBScore;

    if (winningTeam === 'teamA') {
      if (scoreA === 0) scoreA = 15;
      else if (scoreA === 15) scoreA = 30;
      else if (scoreA === 30) scoreA = 40;
      else if (scoreA === 40) {
        if (scoreB === 40) {
          if (isGoldenPoint) {
            winGame('teamA'); // Golden point win!
            return;
          } else {
            scoreA = 'AD'; // Advantage A
          }
        } else if (scoreB === 'AD') {
          scoreB = 40; // Deuce return
        } else {
          winGame('teamA'); // Game win
          return;
        }
      } else if (scoreA === 'AD') {
        winGame('teamA'); // Game win from Advantage
        return;
      }
    } else {
      // Team B won point
      if (scoreB === 0) scoreB = 15;
      else if (scoreB === 15) scoreB = 30;
      else if (scoreB === 30) scoreB = 40;
      else if (scoreB === 40) {
        if (scoreA === 40) {
          if (isGoldenPoint) {
            winGame('teamB'); // Golden point win!
            return;
          } else {
            scoreB = 'AD'; // Advantage B
          }
        } else if (scoreA === 'AD') {
          scoreA = 40; // Deuce return
        } else {
          winGame('teamB'); // Game win
          return;
        }
      } else if (scoreB === 'AD') {
        winGame('teamB'); // Game win from Advantage
        return;
      }
    }

    setTeamAScore(scoreA);
    setTeamBScore(scoreB);

    // Call Vocal referee to read tennis score
    SpeechAnnouncer.announceScore(scoreA, scoreB, true, isGoldenPoint, tweaks.refereeVoice);
  };

  // Game Won handler
  const winGame = (team, fromTiebreak = false) => {
    // Reset points
    setTeamAScore(0);
    setTeamBScore(0);
    setIsTiebreaker(false);
    setTiebreakScoreA(0);
    setTiebreakScoreB(0);

    let nextG_A = currentGameA;
    let nextG_B = currentGameB;

    if (team === 'teamA') {
      nextG_A += 1;
      setCurrentGameA(nextG_A);
      SpeechAnnouncer.speak(tweaks.refereeVoice.startsWith('es') ? "Juego Equipo A" : "Game Team A", tweaks.refereeVoice);
    } else {
      nextG_B += 1;
      setCurrentGameB(nextG_B);
      SpeechAnnouncer.speak(tweaks.refereeVoice.startsWith('es') ? "Juego Equipo B" : "Game Team B", tweaks.refereeVoice);
    }

    // Rotate serving for next game
    const { nextServ, nextIdx } = rotateServer(serving, serverIndex);
    setServing(nextServ);
    setServerIndex(nextIdx);

    const gamesTarget = match.rules.gamesPerSet || 6;
    const tiebreakTrigger = gamesTarget <= 5 ? gamesTarget - 1 : gamesTarget;

    // Set Win verification
    const checkSetWon = (gamesWon, gamesLost) => {
      if (fromTiebreak) return true;
      
      if (gamesTarget <= 5) {
        // Short sets (4 or 5 games): win as soon as you reach the target games count (no 2-game lead needed, e.g. 4-3 or 5-4 is a win)
        return gamesWon >= gamesTarget;
      } else {
        // Standard sets (6 or 8 games): require a 2-game lead (e.g. 6-4, 7-5)
        if (gamesWon >= gamesTarget && gamesWon - gamesLost >= 2) return true;
        // In standard sets, if you reach gamesTarget + 1 and have a 2-game lead (e.g. 7-5 in a 6-game set)
        if (gamesWon > gamesTarget && gamesWon - gamesLost >= 2) return true;
        return false;
      }
    };

    if (checkSetWon(nextG_A, nextG_B)) {
      winSet(nextG_A, nextG_B);
    } else if (checkSetWon(nextG_B, nextG_A)) {
      winSet(nextG_A, nextG_B);
    } else if (nextG_A === tiebreakTrigger && nextG_B === tiebreakTrigger) {
      // Launch Tiebreaker!
      setIsTiebreaker(true);
      SpeechAnnouncer.speak(tweaks.refereeVoice.startsWith('es') ? "Muerte súbita" : "Tiebreak", tweaks.refereeVoice);
    }
  };

  // Set Won handler
  const winSet = (finalGamesA, finalGamesB) => {
    const updatedSets = [...sets, { teamA: finalGamesA, teamB: finalGamesB }];
    setSets(updatedSets);
    setCurrentGameA(0);
    setCurrentGameB(0);

    // Tally sets won
    let setsWonA = 0;
    let setsWonB = 0;
    updatedSets.forEach(s => {
      if (s.teamA > s.teamB) setsWonA += 1;
      else setsWonB += 1;
    });

    const setWinner = finalGamesA > finalGamesB ? 'A' : 'B';
    SpeechAnnouncer.speak(
      tweaks.refereeVoice.startsWith('es') 
        ? `Set para el Equipo ${setWinner}` 
        : `Set won by Team ${setWinner}`, 
      tweaks.refereeVoice
    );

    // Match completion checks based on formats (best of 3, best of 4, best of 5, first to 3)
    const fmt = match.rules.setsFormat || 'best3';
    let isMatchOver = false;

    if (match.isTournament) {
      // For tournament matches, we play a single set. Once 1 set is completed, the match is over!
      if (setsWonA === 1 || setsWonB === 1) isMatchOver = true;
    } else {
      if (fmt === 'best3') {
        if (setsWonA === 2 || setsWonB === 2) isMatchOver = true;
      } else if (fmt === 'best4') {
        // 4 sets total. Matches can end 3-1, 3-0, or 2-2 tie!
        if (setsWonA === 3 || setsWonB === 3) isMatchOver = true;
        else if (updatedSets.length === 4) isMatchOver = true; // Ended in 2-2 tie
      } else if (fmt === 'best5') {
        if (setsWonA === 3 || setsWonB === 3) isMatchOver = true;
      } else if (fmt === 'first3') {
        if (setsWonA === 3 || setsWonB === 3) isMatchOver = true;
      }
    }

    if (isMatchOver) {
      setTimerActive(false);
      SpeechAnnouncer.speak(
        tweaks.refereeVoice.startsWith('es') 
          ? "Juego, set, y partido!" 
          : "Game, set, and match!", 
        tweaks.refereeVoice
      );
      
      // Save sets counts to raw scores
      setTimeout(() => {
        handleSave(setsWonA, setsWonB, true, updatedSets);
      }, 1200);
    }
  };

  const handleSave = (finalA = teamAScore, finalB = teamBScore, finished = false, finalSets = sets) => {
    onSaveMatch({
      teamAScore: finalA,
      teamBScore: finalB,
      sets: finalSets
    }, finished);
  };

  return (
    <AppLayout
      tweaks={tweaks}
      title={`${match.sport === 'padel' ? 'Padel' : 'Tennis'} Court Umpire`}
      eyebrow={match.isTournament ? "Tournament Scorer" : "Standalone Scorer"}
      onBack={onBack}
      actions={
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--text-secondary)' }} className="ag-inset">
            <Icon name="clock" size={12} style={{ marginRight: 4 }} /> {formatTimer(elapsed)}
          </span>
          <button className="ag-btn ag-btn-ghost ag-btn-sm" onClick={handleUndo} disabled={history.length === 0} style={{ padding: 8 }}>
            <Icon name="undo-2" size={15} />
          </button>
          <button className="ag-btn ag-btn-ghost ag-btn-sm" onClick={handleRedo} disabled={redoStack.length === 0} style={{ padding: 8 }}>
            <Icon name="redo-2" size={15} />
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
        
        {/* Tennis Sets Summary Bar */}
        {isTennisMode && sets.length > 0 && (
          <div className="ag-card" style={{ padding: '8px 16px', display: 'flex', gap: 8, justifyContent: 'center' }}>
            <span className="ag-meta" style={{ marginTop: 2 }}>Sets Tally:</span>
            {sets.map((s, idx) => (
              <span key={idx} className="ag-badge ag-badge-brand" style={{ fontFamily: 'JetBrains Mono', fontWeight: 700 }}>
                Set {idx + 1}: {s.teamA} - {s.teamB}
              </span>
            ))}
          </div>
        )}

        {/* Dynamic score zone */}
        <div className="ag-scorer-touchpads-grid" style={{ flex: 1 }}>
          
          {/* TEAM A TAPPING TOUCHPAD */}
          <div 
            className="score-pad-btn score-pad-btn-primary" 
            onClick={() => {
              if (isPointsMode) scorePointAmericano('teamA');
              else scorePointTennis('teamA');
            }}
          >
            <span className="ag-eyebrow" style={{ color: serving === 'teamA' ? 'var(--brand-primary)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
              {serving === 'teamA' && <span className="ag-dot" style={{ background: 'var(--brand-primary)', boxShadow: '0 0 8px var(--brand-primary)' }} />}
              Team A
            </span>
            <h1 className="score-glow" style={{ margin: '14px 0 8px' }}>
              {isTiebreaker ? tiebreakScoreA : teamAScore}
            </h1>
            
            {/* Team Roster */}
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', opacity: 0.9 }}>
              {getPlayerName(match.teamA[0])} {match.teamA[1] && getPlayerName(match.teamA[1]) && `+ ${getPlayerName(match.teamA[1])}`}
            </div>

            {/* Set games if in progress */}
            {isTennisMode && !isTiebreaker && (
              <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 10, fontFamily: 'JetBrains Mono' }}>
                Games: {currentGameA}
              </div>
            )}
            {isTiebreaker && (
              <div className="ag-badge ag-badge-danger" style={{ marginTop: 8 }}>Tiebreaker Mode</div>
            )}
          </div>

          {/* TEAM B TAPPING TOUCHPAD */}
          <div 
            className="score-pad-btn" 
            onClick={() => {
              if (isPointsMode) scorePointAmericano('teamB');
              else scorePointTennis('teamB');
            }}
          >
            <span className="ag-eyebrow" style={{ color: serving === 'teamB' ? 'var(--brand-primary)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
              {serving === 'teamB' && <span className="ag-dot" style={{ background: 'var(--brand-primary)', boxShadow: '0 0 8px var(--brand-primary)' }} />}
              Team B
            </span>
            <h1 className="score-glow" style={{ margin: '14px 0 8px' }}>
              {isTiebreaker ? tiebreakScoreB : teamBScore}
            </h1>
            
            {/* Team Roster */}
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', opacity: 0.9 }}>
              {getPlayerName(match.teamB[0])} {match.teamB[1] && getPlayerName(match.teamB[1]) && `+ ${getPlayerName(match.teamB[1])}`}
            </div>

            {/* Set games if in progress */}
            {isTennisMode && !isTiebreaker && (
              <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 10, fontFamily: 'JetBrains Mono' }}>
                Games: {currentGameB}
              </div>
            )}
            {isTiebreaker && (
              <div className="ag-badge ag-badge-danger" style={{ marginTop: 8 }}>Tiebreaker Mode</div>
            )}
          </div>

        </div>

        {/* Deciding point warning bar */}
        {isTennisMode && teamAScore === 40 && teamBScore === 40 && (
          <div className="ag-card pulse-glow-border" style={{ padding: 14, textAlign: 'center', background: 'rgba(239, 68, 68, 0.05)' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-primary)', letterSpacing: '0.04em' }}>
              {match.rules.advantageRule === 'goldenPoint' ? "✦ DECIDING GOLDEN POINT — SERVER SELECTABLE ✦" : "★ DEUCE — MUST WIN BY TWO POINTS ★"}
            </span>
          </div>
        )}

        {/* Match Rule Summary Panel */}
        <div className="ag-card" style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--text-tertiary)' }}>
          <div>
            Format: {match.scoringMode === 'points' ? `Points target: ${match.rules.pointsLimit} pts` : `Sets Format: ${match.rules.setsFormat === 'best3' ? 'Best of 3' : match.rules.setsFormat === 'best4' ? 'Best of 4 (ties possible)' : match.rules.setsFormat === 'best5' ? 'Best of 5' : 'First to 3'} (${match.rules.gamesPerSet || 6} games per set)`}
          </div>
          <div>
            Announcer: <span style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>Active Voice Referee 🔊</span>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}

window.InteractiveScorerScreen = InteractiveScorerScreen;


/* --- START FILE: leaderboard.jsx --- */
/* screens/leaderboard.jsx — Leaderboard & Standings Board with TV Cast Mode */

function LeaderboardScreen({ tweaks, tournament, onBack, onFinishTournament }) {
  const [tvMode, setTvMode] = React.useState(false); // Toggle TV Cast Mode

  if (!tournament) {
    return (
      <div className="ag-body" style={{ padding: 24, textAlign: 'center' }}>
        No tournament loaded.
        <br /><br />
        <button className="ag-btn ag-btn-primary" onClick={onBack}>Back</button>
      </div>
    );
  }

  // Tally leaderboard from active matches
  const standings = StatsEngine.tallyTournament(tournament);

  const rounds = tournament && tournament.rounds ? tournament.rounds : [];

  // Check if tournament is ready to finalize (all matches completed)
  const allMatchesCompleted = rounds.length > 0 && rounds.every(round => 
    round.matches && round.matches.every(match => match && match.completed)
  );

  // TV Cast Widescreen Layout
  if (tvMode) {
    return (
      <div className="ag-bg" style={{ 
        position: 'fixed', inset: 0, zIndex: 1000, 
        padding: 24, display: 'flex', flexDirection: 'column', gap: 20,
        overflow: 'hidden'
      }}>
        
        {/* TV Header */}
        <header style={{ 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid var(--hairline-strong)', paddingBottom: 14, flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-dark))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, boxShadow: 'var(--shadow-brand)', flexShrink: 0
            }}>{tweaks.clubEmoji}</div>
            <div>
              <h1 className="ag-h1" style={{ margin: 0, fontSize: 28, textShadow: '0 0 15px var(--brand-glow)' }}>
                {tweaks.clubName} — {tournament.name}
              </h1>
              <div className="ag-eyebrow" style={{ fontSize: 10, marginTop: 2 }}>Public Live Cast Scoreboard</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className="ag-badge ag-badge-brand pulse-glow-border">Live Standing updates 🔊</span>
            <button className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => setTvMode(false)}>
              Exit Cast Mode
            </button>
          </div>
        </header>

        {/* TV Columns (Dual layout: Leaderboard Left, Active Round Schedule Right) */}
        <div style={{ display: 'grid', gridTemplateColumns: '5fr 4fr', gap: 24, flex: 1, overflow: 'hidden' }}>
          
          {/* Left Column: Standings */}
          <div className="ag-heavy" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
            <h3 className="ag-h3" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--brand-primary)' }}>
              <Icon name="trophy" size={18} /> Leaderboard Standings
            </h3>
            
            <div style={{ flex: 1, overflowY: 'auto' }} className="ag-scroll">
              <table className="ag-table">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>Rank</th>
                    <th>Name</th>
                    <th style={{ textAlign: 'center' }}>Played</th>
                    <th style={{ textAlign: 'center', color: 'var(--success)' }}>Won</th>
                    <th style={{ textAlign: 'center', color: 'var(--danger)' }}>Lost</th>
                    <th style={{ textAlign: 'right' }}>Total Points</th>
                    <th style={{ textAlign: 'right' }}>Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((player, idx) => {
                    const isPodium = idx < 3;
                    const glowClass = idx === 0 ? 'var(--brand-primary)' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '';
                    
                    return (
                      <tr key={player.id || idx}>
                        <td>
                          {isPodium ? (
                            <span style={{
                              width: 22, height: 22, borderRadius: '50%',
                              background: glowClass, color: idx === 0 ? 'var(--text-inverse)' : '#fff',
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 700,
                              boxShadow: idx === 0 ? '0 0 10px var(--brand-glow)' : 'none'
                            }}>
                              {idx + 1}
                            </span>
                          ) : (
                            <span style={{ paddingLeft: 6, color: 'var(--text-tertiary)' }}>{idx + 1}</span>
                          )}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          <span style={{ color: isPodium ? '#fff' : 'var(--text-secondary)' }}>
                            {player.name}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>{player.played}</td>
                        <td style={{ textAlign: 'center', color: 'var(--success)' }}>{player.won}</td>
                        <td style={{ textAlign: 'center', color: 'var(--danger)' }}>{player.lost}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: idx === 0 ? 'var(--brand-primary)' : 'var(--text-primary)' }}>
                          {player.points}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: player.diff > 0 ? 'var(--success)' : player.diff < 0 ? 'var(--danger)' : 'var(--text-tertiary)' }}>
                          {player.diff > 0 ? `+${player.diff}` : player.diff}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Schedule Grid */}
          <div className="ag-heavy" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>
            <h3 className="ag-h3" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="swords" size={18} color="var(--brand-primary)" /> Active Matches & Rotations
            </h3>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }} className="ag-scroll">
              {rounds.map((round, rIdx) => (
                <div key={rIdx} className="ag-inset" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand-primary)', borderBottom: '1px solid var(--hairline-soft)', paddingBottom: 4 }}>
                    {round.name}
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {round.matches && round.matches.map((match, mIdx) => {
                      if (!match) return null;
                      const scoreA = match.score ? match.score.teamAScore : 0;
                      const scoreB = match.score ? match.score.teamBScore : 0;
                      
                      return (
                        <div key={mIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            Crt {match.court}: {getTeamAPlayersString(match)} vs {getTeamBPlayersString(match)}
                          </span>
                          
                          {match.completed ? (
                            <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--brand-primary)' }}>
                              {scoreA} - {scoreB}
                            </span>
                          ) : (
                            <span className="ag-badge ag-badge-neutral" style={{ fontSize: 8.5, padding: '2px 6px' }}>Live</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    );
  }

  return (
    <AppLayout
      tweaks={tweaks}
      title="Standings Board"
      eyebrow={tournament.name}
      onBack={onBack}
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => setTvMode(true)}>
            <Icon name="tv" size={14} /> TV Cast Mode
          </button>
          
          {allMatchesCompleted && !tournament.completed && (
            <button className="ag-btn ag-btn-primary ag-btn-sm pulse-glow-border" onClick={onFinishTournament}>
              <Icon name="check" size={14} /> Finalize Tournament
            </button>
          )}
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* Dynamic Podium Showcase card (Gold/Silver/Bronze highlight) */}
        {standings.length >= 3 && (
          <div className="ag-card" style={{
            padding: 20, background: 'linear-gradient(135deg, var(--brand-light), rgba(255,255,255,0.01))',
            display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end',
            border: '1px solid color-mix(in oklab, var(--brand-primary) 30%, transparent)',
            height: 180, boxSizing: 'border-box'
          }}>
            
            {/* 2nd Place */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: '#94a3b8', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700
              }}>2</div>
              <div style={{ fontSize: 12, fontWeight: 600, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={standings[1].name}>{standings[1].name}</div>
              <div style={{ fontSize: 14, fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--text-secondary)' }}>
                {standings[1].points} pts
              </div>
              <div style={{ width: 60, height: 40, background: 'rgba(255,255,255,0.04)', borderRadius: '6px 6px 0 0', border: '1px solid var(--hairline)' }} />
            </div>

            {/* 1st Place */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', background: 'var(--brand-primary)', color: 'var(--text-inverse)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700,
                boxShadow: '0 0 15px var(--brand-glow)'
              }}>1</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={standings[0].name}>{standings[0].name}</div>
              <div style={{ fontSize: 16, fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--brand-primary)' }}>
                {standings[0].points} pts
              </div>
              <div style={{ width: 80, height: 60, background: 'var(--brand-light)', borderRadius: '8px 8px 0 0', border: '1px solid var(--brand-primary)', boxShadow: '0 0 10px rgba(163,230,53,0.1)' }} />
            </div>

            {/* 3rd Place */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', background: '#b45309', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700
              }}>3</div>
              <div style={{ fontSize: 12, fontWeight: 600, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={standings[2].name}>{standings[2].name}</div>
              <div style={{ fontSize: 13, fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--text-secondary)' }}>
                {standings[2].points} pts
              </div>
              <div style={{ width: 50, height: 30, background: 'rgba(255,255,255,0.04)', borderRadius: '4px 4px 0 0', border: '1px solid var(--hairline)' }} />
            </div>

          </div>
        )}

        {/* Regular Leaderboard Table */}
        <div className="ag-card" style={{ padding: 16 }}>
          <div style={{ width: '100%', overflowX: 'auto' }} className="ag-scroll">
            <table className="ag-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>Rank</th>
                  <th>Competitor Name</th>
                  <th className="ag-mobile-hide" style={{ textAlign: 'center' }}>Played</th>
                  <th className="ag-mobile-hide" style={{ textAlign: 'center', color: 'var(--success)' }}>Won</th>
                  <th className="ag-mobile-hide" style={{ textAlign: 'center', color: 'var(--danger)' }}>Lost</th>
                  <th style={{ textAlign: 'right' }}>Total Points</th>
                  <th style={{ textAlign: 'right' }}>Diff</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((player, idx) => (
                  <tr key={player.id || idx}>
                    <td>
                      <span style={{
                        fontWeight: 700,
                        color: idx === 0 ? 'var(--brand-primary)' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : 'var(--text-tertiary)'
                      }}>
                        #{idx + 1}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{player.name}</td>
                    <td className="ag-mobile-hide" style={{ textAlign: 'center' }}>{player.played}</td>
                    <td className="ag-mobile-hide" style={{ textAlign: 'center', color: 'var(--success)' }}>{player.won}</td>
                    <td className="ag-mobile-hide" style={{ textAlign: 'center', color: 'var(--danger)' }}>{player.lost}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: idx === 0 ? 'var(--brand-primary)' : 'var(--text-primary)' }}>
                      {player.points}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: player.diff > 0 ? 'var(--success)' : player.diff < 0 ? 'var(--danger)' : 'var(--text-tertiary)' }}>
                      {player.diff > 0 ? `+${player.diff}` : player.diff}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}

window.LeaderboardScreen = LeaderboardScreen;


/* --- START FILE: app.jsx --- */
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
              onEditTournament={() => setCurrentScreen('edit-tournament')}
            />
          );
        case 'edit-tournament':
          return (
            <EditTournamentScreen 
              tweaks={tweaks}
              tournament={activeTournament}
              onBack={() => setCurrentScreen('active-matches')}
              onSave={(updatedTournament) => {
                updateTournamentState(updatedTournament);
                setCurrentScreen('active-matches');
              }}
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


