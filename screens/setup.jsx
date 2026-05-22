/* screens/setup.jsx — Setup Wizard screen */

function SetupScreen({ tweaks, onBack, onStart }) {
  const [step, setStep] = React.useState(1); // Step 1, 2, 3

  // Wizard Config State
  const [sport, setSport] = React.useState('padel'); // 'padel', 'tennis'
  const [format, setFormat] = React.useState('individual_americano'); // 'individual_americano', 'team_americano', 'mexicano', 'single_match'
  const [scoringMode, setScoringMode] = React.useState('points'); // 'points' (Raw points), 'tennis' (Sets)
  
  // Scoring rules
  const [pointsLimit, setPointsLimit] = React.useState(24); // 16, 24, 32, 40 points
  const [setsFormat, setSetsFormat] = React.useState('best3'); // 'best3', 'best4', 'best5', 'first3'
  const [advantageRule, setAdvantageRule] = React.useState('goldenPoint'); // 'goldenPoint', 'deuce'
  const [tiebreakerTarget, setTiebreakerTarget] = React.useState(7); // 7, 10
  
  // Courts count
  const [courtsCount, setCourtsCount] = React.useState(1);
  
  // Players / Teams list
  const [newPlayerName, setNewPlayerName] = React.useState('');
  const [playerList, setPlayerList] = React.useState([
    'Kenichi', 'Echa', 'Alex', 'Bob', 'Chris', 'David', 'Emma', 'Frank'
  ]); // Default 8 players for quick demonstration

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
      tiebreakerTarget
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

  return (
    <AppLayout
      tweaks={tweaks}
      title="Setup Tournament"
      eyebrow="Matchmaker Wizard"
      onBack={onBack}
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {step > 1 && (
            <button className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => setStep(step - 1)}>
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
              <div style={{ display: 'flex', gap: 10 }}>
                <button 
                  className={`ag-pill ${sport === 'padel' ? 'ag-pill-active' : ''}`}
                  onClick={() => {
                    setSport('padel');
                    // Padel defaults to raw points typically, or tennis sets
                  }}
                  style={{ flex: 1, height: 44, justifyContent: 'center' }}
                >
                  <Icon name="activity" size={16} /> Padel Scorer
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                
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

          </div>
        )}

        {/* STEP 2: Scoring Rules */}
        {step === 2 && (
          <div className="ag-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h3 className="ag-h3" style={{ margin: 0 }}>Configure Match Scoring Rules</h3>
            
            {/* Scoring Mode */}
            <div>
              <label className="ag-label">Scoring Method</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {sport !== 'tennis' && (
                  <button 
                    className={`ag-pill ${scoringMode === 'points' ? 'ag-pill-active' : ''}`}
                    onClick={() => setScoringMode('points')}
                    style={{ flex: 1, height: 40, justifyContent: 'center' }}
                  >
                    Raw Americano Points (e.g. 16/24/32 pts)
                  </button>
                )}
                <button 
                  className={`ag-pill ${scoringMode === 'tennis' ? 'ag-pill-active' : ''}`}
                  onClick={() => setScoringMode('tennis')}
                  style={{ flex: 1, height: 40, justifyContent: 'center' }}
                >
                  Traditional Sets (Tennis / Set scoring)
                </button>
              </div>
            </div>

            {/* Sub options based on scoring mode */}
            {scoringMode === 'points' ? (
              <div>
                <label className="ag-label">Total Points per Match</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[16, 24, 32, 40].map(p => (
                    <button 
                      key={p} 
                      className={`ag-pill ${pointsLimit === p ? 'ag-pill-active' : ''}`}
                      onClick={() => setPointsLimit(p)}
                      style={{ flex: 1, justifyContent: 'center', height: 36 }}
                    >
                      {p} Points
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>
                  Every single point scored counts toward the individual's standings pool. Match service alternates every 4 points.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                
                {/* Sets format */}
                <div>
                  <label className="ag-label">Sets Format (Best-Of / First-To)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    <button 
                      className={`ag-pill ${setsFormat === 'best3' ? 'ag-pill-active' : ''}`}
                      onClick={() => setSetsFormat('best3')}
                      style={{ justifyContent: 'center', height: 36 }}
                    >
                      Best of 3 sets
                    </button>
                    <button 
                      className={`ag-pill ${setsFormat === 'best4' ? 'ag-pill-active' : ''}`}
                      onClick={() => setSetsFormat('best4')}
                      style={{ justifyContent: 'center', height: 36 }}
                    >
                      Best of 4 sets (Ties ok)
                    </button>
                    <button 
                      className={`ag-pill ${setsFormat === 'best5' ? 'ag-pill-active' : ''}`}
                      onClick={() => setSetsFormat('best5')}
                      style={{ justifyContent: 'center', height: 36 }}
                    >
                      Best of 5 sets
                    </button>
                    <button 
                      className={`ag-pill ${setsFormat === 'first3' ? 'ag-pill-active' : ''}`}
                      onClick={() => setSetsFormat('first3')}
                      style={{ justifyContent: 'center', height: 36 }}
                    >
                      First to 3 sets
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>
                    {setsFormat === 'best4' && "Best of 4 sets allows matches to end in a 2-2 tie. Points are tallies of total games/points won."}
                    {setsFormat === 'first3' && "Match finishes immediately when a side achieves 3 set wins (equivalent to best of 5, but speedier)."}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {/* Advantage rule */}
                  <div>
                    <label className="ag-label">Advantage / Deuce Rule</label>
                    <select 
                      className="ag-select" 
                      value={advantageRule} 
                      onChange={(e) => setAdvantageRule(e.target.value)}
                    >
                      <option value="goldenPoint">Golden Point (Deciding point at 40-40)</option>
                      <option value="deuce">Standard Advantage (Must win by 2 points)</option>
                    </select>
                  </div>

                  {/* Tiebreaker Target */}
                  <div>
                    <label className="ag-label">Tiebreaker Target</label>
                    <select 
                      className="ag-select" 
                      value={tiebreakerTarget} 
                      onChange={(e) => setTiebreakerTarget(parseInt(e.target.value))}
                    >
                      <option value="7">First to 7 Points (Must win by 2)</option>
                      <option value="10">Match Tiebreak: First to 10 Points</option>
                    </select>
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

        {/* STEP 3: Players & Courts */}
        {step === 3 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
            
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

              {/* Add Input */}
              <div style={{ display: 'flex', gap: 8 }}>
                <input 
                  type="text" 
                  className="ag-input" 
                  placeholder={format === 'team_americano' ? 'Add team name...' : 'Add player name...'} 
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddPlayer(); }}
                />
                <button className="ag-btn ag-btn-primary" onClick={handleAddPlayer} style={{ padding: '0 18px' }}>
                  <Icon name="plus" size={16} />
                </button>
              </div>

              {/* Quick load presets */}
              <div>
                <label className="ag-label">Roster Size Presets</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[4, 5, 8, 12, 16].map(n => (
                    <button 
                      key={n} 
                      className="ag-pill" 
                      onClick={() => loadPreset(n)}
                      style={{ height: 26, fontSize: 10.5 }}
                    >
                      {n} {format === 'team_americano' ? 'Teams' : 'Players'}
                    </button>
                  ))}
                </div>
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
                      <span style={{ fontSize: 12.5, fontWeight: 500 }}>
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

            {/* Arena Config (Courts) */}
            <div className="ag-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h3 className="ag-h3" style={{ margin: 0 }}>Courts & Arena Layout</h3>
              
              <div>
                <label className="ag-label">Available Courts</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[1, 2, 3, 4].map(c => (
                    <button 
                      key={c} 
                      className={`ag-pill ${courtsCount === c ? 'ag-pill-active' : ''}`}
                      onClick={() => setCourtsCount(c)}
                      style={{ flex: 1, justifyContent: 'center', height: 40 }}
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

          </div>
        )}

      </div>
    </AppLayout>
  );
}

window.SetupScreen = SetupScreen;
