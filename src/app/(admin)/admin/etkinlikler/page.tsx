'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import type { Event, Profile } from '@/types';

interface ExtendedEvent extends Event {
  profiles: Profile;
  _count?: {
    going: number;
    interested: number;
  };
}

export default function EventsManagement() {
  const [events, setEvents] = useState<ExtendedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [selectedEvent, setSelectedEvent] = useState<ExtendedEvent | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('*, profiles(*), event_participants(*)')
      .order('event_date', { ascending: false });

    if (data) {
      const eventsWithCounts = data.map((event) => ({
        ...event,
        _count: {
          going: event.event_participants?.filter((p: { status: string }) => p.status === 'going').length || 0,
          interested: event.event_participants?.filter((p: { status: string }) => p.status === 'interested').length || 0,
        },
      }));
      setEvents(eventsWithCounts);
    }

    setLoading(false);
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;

    setDeleteLoading(true);

    // Delete participants first
    await supabase.from('event_participants').delete().eq('event_id', selectedEvent.id);

    // Delete event
    const { error } = await supabase.from('events').delete().eq('id', selectedEvent.id);

    if (!error) {
      setEvents(events.filter((e) => e.id !== selectedEvent.id));
    }

    setDeleteLoading(false);
    setShowDeleteModal(false);
    setSelectedEvent(null);
  };

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.profiles?.full_name.toLowerCase().includes(searchQuery.toLowerCase());

    const now = new Date();
    const eventDate = new Date(event.event_date);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'upcoming' && eventDate >= now) ||
      (statusFilter === 'past' && eventDate < now);

    return matchesSearch && matchesStatus;
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('tr-TR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Etkinlik Yönetimi</h1>
        <p className="text-gray-500 mt-1">{events.length} etkinlik</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Etkinlik ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'upcoming' | 'past')}
          className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">Tüm Etkinlikler</option>
          <option value="upcoming">Yaklaşan</option>
          <option value="past">Geçmiş</option>
        </select>
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center">
            <p className="text-gray-500">Etkinlik bulunamadı</p>
          </div>
        ) : (
          filteredEvents.map((event, index) => {
            const isPast = new Date(event.event_date) < new Date();

            return (
              <div
                key={event.id}
                className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden animate-slideUp ${
                  isPast ? 'opacity-70' : ''
                }`}
                style={{ animationDelay: `${index * 0.02}s` }}
              >
                <div className="flex">
                  {/* Date Box */}
                  <div className={`w-24 flex-shrink-0 flex flex-col items-center justify-center p-4 ${
                    isPast ? 'bg-gray-100 dark:bg-gray-700' : 'bg-emerald-50 dark:bg-emerald-900/20'
                  }`}>
                    <span className={`text-sm font-medium ${isPast ? 'text-gray-500' : 'text-emerald-600'}`}>
                      {new Date(event.event_date).toLocaleDateString('tr-TR', { month: 'short' }).toUpperCase()}
                    </span>
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                      {new Date(event.event_date).getDate()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(event.event_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isPast && (
                      <span className="mt-2 text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                        Geçti
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {event.title}
                        </h3>
                        {event.location && (
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {event.location}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => {
                          setSelectedEvent(event);
                          setShowDeleteModal(true);
                        }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    </div>

                    {event.description && (
                      <p className="text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                        {event.description}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <span className="text-emerald-600 font-medium">
                        {event._count?.going || 0} katılıyor
                      </span>
                      <span className="text-blue-600 font-medium">
                        {event._count?.interested || 0} ilgileniyor
                      </span>
                    </div>

                    {/* Organizer */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                      {event.profiles?.avatar_url ? (
                        <img
                          src={event.profiles.avatar_url}
                          alt={event.profiles.full_name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-semibold">
                          {event.profiles?.full_name?.charAt(0)}
                        </div>
                      )}
                      <span className="text-sm text-gray-500">
                        {event.profiles?.full_name} tarafından oluşturuldu
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedEvent(null);
        }}
        title="Etkinlik Silme"
      >
        <div className="p-6">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center mb-2">
            "{selectedEvent?.title}" etkinliğini silmek istediğinize emin misiniz?
          </h3>
          <p className="text-gray-500 text-center mb-6">
            Bu işlem geri alınamaz. Tüm katılım bilgileri de silinecektir.
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedEvent(null);
              }}
              className="flex-1"
            >
              İptal
            </Button>
            <Button
              onClick={handleDelete}
              loading={deleteLoading}
              className="flex-1 bg-red-500 hover:bg-red-600"
            >
              Sil
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
