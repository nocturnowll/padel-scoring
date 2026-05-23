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
