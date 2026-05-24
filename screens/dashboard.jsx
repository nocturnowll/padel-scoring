/* screens/dashboard.jsx — Dashboard / Welcome screen */

function DashboardScreen({ 
  tweaks, 
  tournamentHistory, 
  activeTournament, 
  onNewTournament, 
  onResumeTournament, 
  onQuickMatch, 
  onViewHistory,
  onImportHistory
}) {
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
              
              {/* Backup & Restore controls */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                <button 
                  className="ag-btn ag-btn-ghost ag-btn-sm" 
                  style={{ padding: '4px 8px', fontSize: 10.5, display: 'flex', alignItems: 'center', gap: 4, height: 'auto', border: '1px solid var(--hairline)' }}
                  title="Export History Backup File"
                  onClick={(e) => {
                    e.stopPropagation();
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tournamentHistory));
                    const downloadAnchor = document.createElement('a');
                    downloadAnchor.setAttribute("href", dataStr);
                    downloadAnchor.setAttribute("download", `padel_history_backup_${new Date().toISOString().split('T')[0]}.json`);
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                  }}
                >
                  <Icon name="download" size={11} /> Export
                </button>
                
                <button 
                  className="ag-btn ag-btn-ghost ag-btn-sm" 
                  style={{ padding: '4px 8px', fontSize: 10.5, display: 'flex', alignItems: 'center', gap: 4, height: 'auto', border: '1px solid var(--hairline)' }}
                  title="Import History Backup File"
                  onClick={(e) => {
                    e.stopPropagation();
                    const fileInput = document.createElement('input');
                    fileInput.setAttribute("type", "file");
                    fileInput.setAttribute("accept", ".json");
                    fileInput.style.display = 'none';
                    fileInput.onchange = (evt) => {
                      const file = evt.target.files[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (re) => {
                        try {
                          const parsed = JSON.parse(re.target.result);
                          if (Array.isArray(parsed)) {
                            if (confirm(`Are you sure you want to import ${parsed.length} tournament records? This will merge with your existing history.`)) {
                              // Merge history based on unique IDs
                              const existingIds = new Set(tournamentHistory.map(t => t.id));
                              const merged = [...tournamentHistory];
                              parsed.forEach(item => {
                                if (item && item.id && !existingIds.has(item.id)) {
                                  merged.push(item);
                                }
                              });
                              // Sort by finished date desc
                              merged.sort((a, b) => new Date(b.finishedAt || 0) - new Date(a.finishedAt || 0));
                              
                              if (onImportHistory) {
                                onImportHistory(merged);
                              }
                              alert("History backup successfully imported and merged!");
                            }
                          } else {
                            alert("Invalid backup file format. Must be a JSON array of past tournaments.");
                          }
                        } catch(err) {
                          alert("Error parsing backup file: " + err.message);
                        }
                      };
                      reader.readAsText(file);
                    };
                    document.body.appendChild(fileInput);
                    fileInput.click();
                    fileInput.remove();
                  }}
                >
                  <Icon name="upload" size={11} /> Import
                </button>
                <Icon name="history" size={15} color="var(--text-tertiary)" />
              </div>
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
