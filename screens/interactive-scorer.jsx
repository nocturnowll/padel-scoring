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
      
      if (match.isTournament) {
        const fmt = match.rules.setsFormat || 'best3';
        const totalGames = gamesWon + gamesLost;
        if (fmt === 'best3') return totalGames >= 3;
        if (fmt === 'best4') return totalGames >= 4;
        if (fmt === 'best5') return totalGames >= 5;
        if (fmt === 'first3') return gamesWon >= 3 || gamesLost >= 3;
        return false;
      }
      
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
            Format: {match.scoringMode === 'points' 
              ? `Points target: ${match.rules.pointsLimit} pts` 
              : match.isTournament 
                ? `Tournament Sets: ${match.rules.setsFormat === 'best3' 
                  ? 'Play exactly 3 games in total' 
                  : match.rules.setsFormat === 'best4' 
                    ? 'Play exactly 4 games in total' 
                    : match.rules.setsFormat === 'best5' 
                      ? 'Play exactly 5 games in total' 
                      : 'First to 3 games'}`
                : `Sets Format: ${match.rules.setsFormat === 'best3' ? 'Best of 3' : match.rules.setsFormat === 'best4' ? 'Best of 4 (ties possible)' : match.rules.setsFormat === 'best5' ? 'Best of 5' : 'First to 3'} (${match.rules.gamesPerSet || 6} games per set)`}
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
