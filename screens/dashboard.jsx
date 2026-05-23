/* screens/dashboard.jsx — Dashboard / Welcome screen */

function DashboardScreen({ tweaks, tournamentHistory, activeTournament, onNewTournament, onResumeTournament, onQuickMatch, onViewHistory }) {
  // Sum stats from history
  const totalCompleted = tournamentHistory.length;
  const totalActive = activeTournament ? 1 : 0;
  
  // Calculate total players registered across history
  const allPlayers = new Set();
  tournamentHistory.forEach(t => t.players.forEach(p => allPlayers.add(p.name)));
  if (activeTournament) activeTournament.players.forEach(p => allPlayers.add(p.name));
  
  return (
    <AppLayout 
      tweaks={tweaks}
      title="Court Central"
      eyebrow="Atelier Glass Scorer"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="ag-btn ag-btn-ghost ag-btn-sm" onClick={onQuickMatch}>
            <Icon name="play" size={14} /> Quick Scorer
          </button>
          <button className="ag-btn ag-btn-primary ag-btn-sm" onClick={onNewTournament}>
            <Icon name="plus" size={14} /> Host Tournament
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
                <Icon name="activity" size={15} /> Resume Tournament
              </button>
            ) : (
              <button className="ag-btn ag-btn-primary" onClick={onNewTournament}>
                <Icon name="swords" size={15} /> Start Tournament
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          
          {/* Ongoing Panel */}
          <div className="ag-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="ag-meta">Active Events</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="score-glow-sub" style={{ fontSize: 32, fontWeight: 700, color: totalActive > 0 ? 'var(--brand-primary)' : 'var(--text-primary)' }}>
                {totalActive}
              </span>
              <span className="ag-body" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>running</span>
            </div>
            <div style={{ marginTop: 'auto', fontSize: 11, color: 'var(--text-secondary)' }}>
              {activeTournament ? `${activeTournament.name} in progress` : "No ongoing tournament"}
            </div>
          </div>

          {/* History Count Panel */}
          <div className="ag-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="ag-meta">Archived Tourneys</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="score-glow-sub" style={{ fontSize: 32, fontWeight: 700 }}>{totalCompleted}</span>
              <span className="ag-body" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>saved</span>
            </div>
            <div style={{ marginTop: 'auto', fontSize: 11, color: 'var(--text-secondary)' }}>
              Local tournament record history
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
              <h3 className="ag-h3" style={{ margin: 0 }}>Tournament Roster History</h3>
              <Icon name="history" size={16} color="var(--text-tertiary)" />
            </div>
            
            {tournamentHistory.length === 0 ? (
              <div style={{ padding: '30px 10px', textAlign: 'center', border: '1px dashed var(--hairline)', borderRadius: 12 }}>
                <Icon name="archive" size={28} color="var(--text-tertiary)" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>No completed tournaments</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Host your first event to see it logged here!</div>
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
                        <span>Players: {t.players.length}</span>
                        <span>•</span>
                        <span>Date: {new Date(t.finishedAt).toLocaleDateString()}</span>
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
