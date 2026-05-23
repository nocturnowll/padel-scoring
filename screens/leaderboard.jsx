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

  // Check if tournament is ready to finalize (all matches completed)
  const allMatchesCompleted = tournament.rounds.every(round => 
    round.matches.every(match => match.completed)
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
              {tournament.rounds.map((round, rIdx) => (
                <div key={rIdx} className="ag-inset" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand-primary)', borderBottom: '1px solid var(--hairline-soft)', paddingBottom: 4 }}>
                    {round.name}
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {round.matches.map((match, mIdx) => {
                      const scoreA = match.score ? match.score.teamAScore : 0;
                      const scoreB = match.score ? match.score.teamBScore : 0;
                      
                      return (
                        <div key={mIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            Crt {match.court}: {match.teamA.p1.name} {match.teamA.p2.name && `+ ${match.teamA.p2.name}`} vs {match.teamB.p1.name} {match.teamB.p2.name && `+ ${match.teamB.p2.name}`}
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
