import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { Radio, MapPin, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function LiveLocations() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    try {
      const d = await api.liveLocations();
      setLocations(d.locations || d.guards || []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      <PageHeader
        title="Live Locations"
        subtitle={`${locations.length} guard${locations.length !== 1 ? 's' : ''} reporting · Updated ${format(lastRefresh, 'HH:mm:ss')}`}
        action={
          <button onClick={load} disabled={refreshing} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      />

      {/* Live indicator */}
      <div className="flex items-center gap-2 mb-5">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-sm text-slate-400">Auto-refreshes every 30 seconds</span>
      </div>

      {loading ? <div className="text-slate-400 text-sm">Loading…</div> : (
        !locations.length ? (
          <EmptyState
            icon={Radio}
            title="No active location data"
            subtitle="Guards appear here when they send GPS pings while on shift"
          />
        ) : (
          <div className="space-y-3">
            {/* Map link prompt */}
            <div className="card bg-blue-500/5 border-blue-500/20 flex items-center gap-3 mb-4">
              <MapPin size={18} className="text-blue-400 flex-shrink-0" />
              <p className="text-slate-300 text-sm flex-1">
                Click any location to open in Google Maps. Full map integration can be added with a Google Maps API key.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {locations.map((loc, i) => (
                <div key={loc.user_id || i} className="card space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-semibold text-sm flex-shrink-0">
                      {(loc.full_name || loc.user?.full_name || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{loc.full_name || loc.user?.full_name || 'Unknown'}</p>
                      {loc.site_name && <p className="text-xs text-slate-400 truncate">{loc.site_name}</p>}
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                  </div>

                  {(loc.lat && loc.lng) ? (
                    <a
                      href={`https://maps.google.com/?q=${loc.lat},${loc.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-surface-700/50 hover:bg-surface-700 rounded-lg px-3 py-3 transition-colors group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin size={14} className="text-brand-400" />
                        <span className="text-xs text-brand-400 group-hover:text-brand-300">Open in Maps →</span>
                      </div>
                      <p className="font-mono text-xs text-slate-400">{Number(loc.lat).toFixed(5)}, {Number(loc.lng).toFixed(5)}</p>
                      {loc.accuracy && <p className="text-xs text-slate-500 mt-0.5">±{loc.accuracy}m accuracy</p>}
                    </a>
                  ) : (
                    <div className="bg-surface-700/50 rounded-lg px-3 py-2 text-xs text-slate-500">
                      No GPS coordinates available
                    </div>
                  )}

                  {loc.last_ping && (
                    <p className="text-xs text-slate-500">
                      Last ping: {format(parseISO(loc.last_ping), 'HH:mm:ss')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
