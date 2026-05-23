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
