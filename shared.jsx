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
    
    const teams = teamNames.map((name, index) => ({
      id: `team_${index + 1}`,
      name: name,
      points: 0,
      diff: 0,
      played: 0,
      won: 0,
      lost: 0
    }));
    
    // Standard round-robin scheduling algorithm (Berger tables / Circle method)
    const list = [...teams];
    if (T % 2 !== 0) {
      list.push({ id: 'bye', name: 'BYE', isDummy: true });
    }
    
    const numTeams = list.length;
    const numRounds = numTeams - 1;
    const rounds = [];
    
    for (let r = 0; r < numRounds; r++) {
      const roundMatches = [];
      const sittingOut = [];
      let courtIndex = 1;
      
      for (let i = 0; i < numTeams / 2; i++) {
        const t1 = list[i];
        const t2 = list[numTeams - 1 - i];
        
        if (t1.id === 'bye') {
          if (!t2.isDummy) sittingOut.push(t2);
        } else if (t2.id === 'bye') {
          if (!t1.isDummy) sittingOut.push(t1);
        } else {
          // Both are real teams
          if (courtIndex <= courtsCount) {
            roundMatches.push({
              id: `r${r+1}_m${courtIndex}`,
              court: courtIndex,
              // Map team object to a doubles format (can represent 2 players conceptually)
              teamA: { p1: { name: t1.name, id: t1.id }, p2: { name: '', id: '' } },
              teamB: { p1: { name: t2.name, id: t2.id }, p2: { name: '', id: '' } },
              score: null,
              completed: false,
              rawTeamA: t1,
              rawTeamB: t2
            });
            courtIndex++;
          } else {
            // No courts left, they sit out
            sittingOut.push(t1, t2);
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
const StatsEngine = {
  // Re-calculates player rankings from scratch based on all completed match scores
  tallyTournament: (tournament) => {
    if (!tournament) return [];
    
    const isIndividual = tournament.format.includes('individual') || tournament.format === 'mexicano';
    
    // Reset player scores
    const playerMap = {};
    tournament.players.forEach(p => {
      playerMap[p.id] = {
        ...p,
        points: 0,
        diff: 0,
        played: 0,
        won: 0,
        lost: 0,
        rawWins: 0, // matches won
      };
    });
    
    // Process all rounds and finished matches
    tournament.rounds.forEach(round => {
      round.matches.forEach(match => {
        if (!match.completed || !match.score) return;
        
        const scoreA = match.score.teamAScore;
        const scoreB = match.score.teamBScore;
        const diff = scoreA - scoreB;
        
        if (isIndividual) {
          // Update Team A players
          const idsA = [match.teamA.p1.id, match.teamA.p2.id];
          idsA.forEach(id => {
            if (playerMap[id]) {
              playerMap[id].played += 1;
              playerMap[id].points += scoreA;
              playerMap[id].diff += diff;
              if (diff > 0) playerMap[id].won += 1;
              else if (diff < 0) playerMap[id].lost += 1;
            }
          });
          
          // Update Team B players
          const idsB = [match.teamB.p1.id, match.teamB.p2.id];
          idsB.forEach(id => {
            if (playerMap[id]) {
              playerMap[id].played += 1;
              playerMap[id].points += scoreB;
              playerMap[id].diff -= diff;
              if (diff < 0) playerMap[id].won += 1;
              else if (diff > 0) playerMap[id].lost += 1;
            }
          });
        } else {
          // Team Americano (fixed pairs, players list are actually teams)
          const teamIdA = match.rawTeamA ? match.rawTeamA.id : match.teamA.p1.id;
          const teamIdB = match.rawTeamB ? match.rawTeamB.id : match.teamB.p1.id;
          
          if (playerMap[teamIdA]) {
            playerMap[teamIdA].played += 1;
            playerMap[teamIdA].points += scoreA;
            playerMap[teamIdA].diff += diff;
            if (diff > 0) playerMap[teamIdA].won += 1;
            else if (diff < 0) playerMap[teamIdA].lost += 1;
          }
          
          if (playerMap[teamIdB]) {
            playerMap[teamIdB].played += 1;
            playerMap[teamIdB].points += scoreB;
            playerMap[teamIdB].diff -= diff;
            if (diff < 0) playerMap[teamIdB].won += 1;
            else if (diff > 0) playerMap[teamIdB].lost += 1;
          }
        }
      });
    });
    
    // Convert back to sorted array
    // Rank primary by Wins (for Tennis/Sets) or Points Tally (for Americano points)
    return Object.values(playerMap).sort((a, b) => {
      // In classic Americano, points won is primary. In sets/tennis, matches won/diff is primary.
      if (tournament.scoringMode === 'tennis') {
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

Object.assign(window, { Icon, SpeechAnnouncer, Matchmaker, StatsEngine, AppLayout });
