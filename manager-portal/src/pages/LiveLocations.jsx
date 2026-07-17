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
      <div className="flex items-center gap-2 mb-6">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-sm text-gray-500 font-medium">Auto-refreshes every 30 seconds</span>
      </div>

      {loading ? <div className="text-gray-400 text-sm">Loading…</div> : (
        !locations.length ? (
          <EmptyState
            icon={Radio}
            title="No active location data"
            subtitle="Guards appear here when they send GPS pings while on shift"
          />
        ) : (
          <div className="space-y-4">
            {/* Map link prompt */}
            <div className="card bg-blue-50 border-blue-100 flex items-center gap-4 mb-4 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <MapPin size={16} className="text-blue-600" />
              </div>
              <p className="text-gray-700 text-sm flex-1 font-medium">
                Click any location to open in Google Maps. Full map integration can be added with a Google Maps API key.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {locations.map((loc, i) => (
                <div key={loc.user_id || i} className="card space-y-4 hover:border-gray-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-700 font-semibold text-sm flex-shrink-0 border border-green-200">
                      {(loc.full_name || loc.user?.full_name || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{loc.full_name || loc.user?.full_name || 'Unknown'}</p>
                      {loc.site_name && <p className="text-xs text-gray-500 truncate font-medium">{loc.site_name}</p>}
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                  </div>

                  {(loc.lat && loc.lng) ? (
                    <a
                      href={`https://maps.google.com/?q=${loc.lat},${loc.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-lg px-4 py-3 transition-colors group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin size={14} className="text-blue-600" />
                        <span className="text-xs text-blue-600 font-medium group-hover:text-blue-800">Open in Maps →</span>
                      </div>
                      <p className="font-mono text-xs text-gray-600 font-medium mt-1">{Number(loc.lat).toFixed(5)}, {Number(loc.lng).toFixed(5)}</p>
                      {loc.accuracy && <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">±{loc.accuracy}m accuracy</p>}
                    </a>
                  ) : (
                    <div className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-xs text-gray-500 italic font-medium">
                      No GPS coordinates available
                    </div>
                  )}

                  {loc.last_ping && (
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                       <Radio size={12} className="text-gray-400" />
                       <p className="text-xs text-gray-500 font-medium">
                         Last ping: <span className="text-gray-900">{format(parseISO(loc.last_ping), 'HH:mm:ss')}</span>
                       </p>
                    </div>
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
