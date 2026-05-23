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
