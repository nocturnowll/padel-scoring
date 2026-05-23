/* screens/active-matches.jsx — Active Match Schedule Grid */

function ActiveMatchesScreen({ tweaks, tournament, onBack, onCancelTournament, onSelectMatch, onViewLeaderboard }) {
  const [activeRoundIndex, setActiveRoundIndex] = React.useState(0);

  if (!tournament) {
    return (
      <div className="ag-body" style={{ padding: 24, textAlign: 'center' }}>
        No active tournament found. Go back to Court Central and create one.
        <br /><br />
        <button className="ag-btn ag-btn-primary" onClick={onBack}>Back to Dashboard</button>
      </div>
    );
  }

  const rounds = tournament && tournament.rounds ? tournament.rounds : [];
  const totalRounds = rounds.length;
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
        <div className="ag-card" style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ color: scoreA >= scoreB && hasScore ? 'var(--brand-primary)' : 'var(--text-primary)' }}>
                            {getTeamAPlayersString(match)}
                          </span>
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>vs</div>
                        <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center' }}>
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
                            <div style={{ display: 'flex', gap: 4 }}>
                              {sets.map((set, sIdx) => (
                                <div key={sIdx} className="ag-inset" style={{ padding: '4px 8px', fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 600 }}>
                                  {set.teamA} - {set.teamB}
                                </div>
                              ))}
                              {/* Live Score if in-progress */}
                              {!match.completed && (
                                <div className="ag-badge ag-badge-brand" style={{ fontFamily: 'JetBrains Mono', marginLeft: 4 }}>
                                  {scoreA} - {scoreB}
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
          <div className="ag-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
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
