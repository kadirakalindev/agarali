'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { EventSkeleton } from '@/components/ui/Skeleton';
import type { Event, Profile } from '@/types';

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const supabase = createClient();

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setCurrentUser(data);
      }
      fetchEvents();
    }
    init();
  }, [supabase]);

  const fetchEvents = async () => {
    const now = new Date().toISOString();

    // Upcoming events
    const { data: upcoming } = await supabase
      .from('events')
      .select('*, profiles(*), event_participants(*, profiles(*))')
      .gte('event_date', now)
      .order('event_date', { ascending: true });

    // Past events
    const { data: past } = await supabase
      .from('events')
      .select('*, profiles(*), event_participants(*, profiles(*))')
      .lt('event_date', now)
      .order('event_date', { ascending: false })
      .limit(10);

    setEvents(upcoming || []);
    setPastEvents(past || []);
    setLoading(false);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!currentUser) return;

    if (!title.trim()) {
      setFormError('Başlık gerekli');
      return;
    }

    if (!eventDate) {
      setFormError('Tarih seçin');
      return;
    }

    const selectedDate = new Date(eventDate);
    if (selectedDate < new Date()) {
      setFormError('Geçmiş bir tarih seçemezsiniz');
      return;
    }

    setCreating(true);

    const { error } = await supabase.from('events').insert({
      user_id: currentUser.id,
      title: title.trim(),
      description: description.trim() || null,
      location: location.trim() || null,
      event_date: selectedDate.toISOString(),
    });

    if (error) {
      setFormError('Etkinlik oluşturulamadı: ' + error.message);
    } else {
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setLocation('');
      setEventDate('');
      fetchEvents();
    }

    setCreating(false);
  };

  const handleParticipate = async (eventId: string, status: 'going' | 'interested') => {
    if (!currentUser) return;

    const { data: existing } = await supabase
      .from('event_participants')
      .select('id, status')
      .eq('event_id', eventId)
      .eq('user_id', currentUser.id)
      .single();

    if (existing) {
      if (existing.status === status) {
        await supabase
          .from('event_participants')
          .delete()
          .eq('id', existing.id);
      } else {
        await supabase
          .from('event_participants')
          .update({ status })
          .eq('id', existing.id);
      }
    } else {
      await supabase.from('event_participants').insert({
        event_id: eventId,
        user_id: currentUser.id,
        status,
      });
    }

    fetchEvents();
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return {
      day: d.getDate(),
      month: d.toLocaleDateString('tr-TR', { month: 'short' }).toUpperCase(),
      time: d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      full: d.toLocaleDateString('tr-TR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    };
  };

  const displayEvents = activeTab === 'upcoming' ? events : pastEvents;

  if (loading) {
    return (
      <div className="space-y-4 animate-fadeIn">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-10 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <EventSkeleton />
        <EventSkeleton />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Etkinlikler</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Etkinlik Oluştur
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${
            activeTab === 'upcoming'
              ? 'bg-white dark:bg-gray-700 text-emerald-600 shadow-sm'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          Yaklaşan ({events.length})
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${
            activeTab === 'past'
              ? 'bg-white dark:bg-gray-700 text-emerald-600 shadow-sm'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          Geçmiş ({pastEvents.length})
        </button>
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {displayEvents.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {activeTab === 'upcoming' ? 'Yaklaşan etkinlik yok' : 'Geçmiş etkinlik yok'}
            </h3>
            <p className="text-gray-500 mb-4">
              {activeTab === 'upcoming' && 'İlk etkinliği sen oluştur!'}
            </p>
            {activeTab === 'upcoming' && (
              <Button onClick={() => setShowCreateModal(true)}>
                Etkinlik Oluştur
              </Button>
            )}
          </div>
        ) : (
          displayEvents.map((event, index) => {
            const date = formatDate(event.event_date);
            const goingUsers = event.event_participants?.filter((p) => p.status === 'going') || [];
            const interestedUsers = event.event_participants?.filter((p) => p.status === 'interested') || [];
            const userParticipation = event.event_participants?.find((p) => p.user_id === currentUser?.id);
            const isPast = new Date(event.event_date) < new Date();

            return (
              <div
                key={event.id}
                style={{ animationDelay: `${index * 0.05}s` }}
                className="animate-slideUp"
              >
                <div
                  className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow ${isPast ? 'opacity-70' : ''}`}
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className="flex">
                    {/* Date Box */}
                    <div className="w-20 flex-shrink-0 bg-emerald-50 dark:bg-emerald-900/20 flex flex-col items-center justify-center p-4 border-r border-gray-100 dark:border-gray-700">
                      <span className="text-sm font-medium text-emerald-600">{date.month}</span>
                      <span className="text-3xl font-bold text-gray-900 dark:text-white">{date.day}</span>
                      <span className="text-xs text-gray-500">{date.time}</span>
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
                      </div>

                      {event.description && (
                        <p className="text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                          {event.description}
                        </p>
                      )}

                      {/* Participants */}
                      <div className="flex items-center gap-4 mt-3 text-sm">
                        <span className="text-emerald-600 font-medium">
                          {goingUsers.length} katılıyor
                        </span>
                        <span className="text-blue-600 font-medium">
                          {interestedUsers.length} ilgileniyor
                        </span>
                      </div>

                      {/* Organizer */}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <Avatar src={event.profiles?.avatar_url} alt={event.profiles?.full_name || ''} size="xs" />
                        <span className="text-sm text-gray-500">
                          {event.profiles?.full_name} tarafından
                        </span>
                      </div>

                      {/* Actions */}
                      {!isPast && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant={userParticipation?.status === 'going' ? 'primary' : 'secondary'}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleParticipate(event.id, 'going');
                            }}
                          >
                            {userParticipation?.status === 'going' ? '✓ Katılıyorum' : 'Katıl'}
                          </Button>
                          <Button
                            size="sm"
                            variant={userParticipation?.status === 'interested' ? 'primary' : 'ghost'}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleParticipate(event.id, 'interested');
                            }}
                          >
                            {userParticipation?.status === 'interested' ? '★ İlgileniyorum' : '☆ İlgileniyorum'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Event Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setFormError('');
        }}
        title="Yeni Etkinlik Oluştur"
      >
        <form onSubmit={handleCreateEvent} className="p-6 space-y-4">
          {formError && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 px-4 py-3 rounded-xl text-sm">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Etkinlik Adı *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Köy Şenliği 2024"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Açıklama
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Etkinlik hakkında detaylar..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Konum
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Köy Meydanı"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tarih ve Saat *
            </label>
            <input
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false);
                setFormError('');
              }}
              className="flex-1"
            >
              İptal
            </Button>
            <Button type="submit" loading={creating} className="flex-1">
              {creating ? 'Oluşturuluyor...' : 'Oluştur'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Event Detail Modal */}
      <Modal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.title || 'Etkinlik Detayı'}
      >
        {selectedEvent && (() => {
          const date = formatDate(selectedEvent.event_date);
          const goingUsers = selectedEvent.event_participants?.filter((p) => p.status === 'going') || [];
          const interestedUsers = selectedEvent.event_participants?.filter((p) => p.status === 'interested') || [];
          const userParticipation = selectedEvent.event_participants?.find((p) => p.user_id === currentUser?.id);
          const isPast = new Date(selectedEvent.event_date) < new Date();

          return (
            <div className="p-6 space-y-5">
              {/* Date and Location */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 flex-shrink-0 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex flex-col items-center justify-center">
                  <span className="text-xs font-medium text-emerald-600">{date.month}</span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{date.day}</span>
                </div>
                <div>
                  <p className="text-gray-900 dark:text-white font-medium">{date.full}</p>
                  <p className="text-sm text-gray-500">{date.time}</p>
                  {selectedEvent.location && (
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {selectedEvent.location}
                    </p>
                  )}
                </div>
              </div>

              {/* Description */}
              {selectedEvent.description && (
                <div>
                  <p className="text-gray-600 dark:text-gray-400">{selectedEvent.description}</p>
                </div>
              )}

              {/* Organizer */}
              <div className="flex items-center gap-2 pb-4 border-b border-gray-200 dark:border-gray-700">
                <Avatar src={selectedEvent.profiles?.avatar_url} alt={selectedEvent.profiles?.full_name || ''} size="sm" />
                <div>
                  <p className="text-sm text-gray-500">Düzenleyen</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedEvent.profiles?.full_name}</p>
                </div>
              </div>

              {/* Participants */}
              <div className="space-y-4">
                {/* Going */}
                <div>
                  <h4 className="text-sm font-semibold text-emerald-600 mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-xs">
                      {goingUsers.length}
                    </span>
                    Katılıyor
                  </h4>
                  {goingUsers.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {goingUsers.map((p) => (
                        <div key={p.user_id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 px-3 py-1.5 rounded-full">
                          <Avatar src={p.profiles?.avatar_url} alt={p.profiles?.full_name || ''} size="xs" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{p.profiles?.full_name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Henüz kimse katılmıyor</p>
                  )}
                </div>

                {/* Interested */}
                <div>
                  <h4 className="text-sm font-semibold text-blue-600 mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      {interestedUsers.length}
                    </span>
                    İlgileniyor
                  </h4>
                  {interestedUsers.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {interestedUsers.map((p) => (
                        <div key={p.user_id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 px-3 py-1.5 rounded-full">
                          <Avatar src={p.profiles?.avatar_url} alt={p.profiles?.full_name || ''} size="xs" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{p.profiles?.full_name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Henüz kimse ilgilenmiyor</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {!isPast && (
                <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant={userParticipation?.status === 'going' ? 'primary' : 'secondary'}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleParticipate(selectedEvent.id, 'going');
                      // Update the selected event locally
                      setSelectedEvent(null);
                    }}
                    className="flex-1"
                  >
                    {userParticipation?.status === 'going' ? '✓ Katılıyorum' : 'Katıl'}
                  </Button>
                  <Button
                    variant={userParticipation?.status === 'interested' ? 'primary' : 'ghost'}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleParticipate(selectedEvent.id, 'interested');
                      setSelectedEvent(null);
                    }}
                    className="flex-1"
                  >
                    {userParticipation?.status === 'interested' ? '★ İlgileniyorum' : '☆ İlgileniyorum'}
                  </Button>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
