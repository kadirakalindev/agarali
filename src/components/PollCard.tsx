'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { Poll, PollOption, PollVote, Profile } from '@/types';

interface PollCardProps {
  poll: Poll;
  currentUserId?: string;
  onVoteChange?: () => void;
}

export function PollCard({ poll, currentUserId, onVoteChange }: PollCardProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [voting, setVoting] = useState(false);
  const [showVotersModal, setShowVotersModal] = useState(false);
  const [selectedOptionForVoters, setSelectedOptionForVoters] = useState<PollOption | null>(null);
  const supabase = createClient();

  // Calculate vote counts
  const options = poll.poll_options || [];
  const allVotes = poll.poll_votes || [];
  const totalVotes = allVotes.length;

  // Get current user's votes
  const userVotes = allVotes.filter((v) => v.user_id === currentUserId);
  const hasVoted = userVotes.length > 0;

  // Check if poll is still active
  const isExpired = poll.ends_at ? new Date(poll.ends_at) < new Date() : false;
  const canVote = poll.is_active && !isExpired && currentUserId && !hasVoted;

  const getVoteCount = (optionId: string) => {
    return allVotes.filter((v) => v.poll_option_id === optionId).length;
  };

  const getVotePercentage = (optionId: string) => {
    if (totalVotes === 0) return 0;
    return Math.round((getVoteCount(optionId) / totalVotes) * 100);
  };

  const getVotersForOption = (optionId: string) => {
    return allVotes.filter((v) => v.poll_option_id === optionId);
  };

  const handleOptionClick = (optionId: string) => {
    if (!canVote) return;

    if (poll.poll_type === 'single') {
      setSelectedOptions([optionId]);
    } else {
      if (selectedOptions.includes(optionId)) {
        setSelectedOptions(selectedOptions.filter((id) => id !== optionId));
      } else {
        setSelectedOptions([...selectedOptions, optionId]);
      }
    }
  };

  const handleVote = async () => {
    if (!currentUserId || selectedOptions.length === 0) return;

    setVoting(true);

    try {
      // Insert votes
      const votes = selectedOptions.map((optionId) => ({
        poll_id: poll.id,
        poll_option_id: optionId,
        user_id: currentUserId,
      }));

      const { error } = await supabase.from('poll_votes').insert(votes);

      if (error) throw error;

      onVoteChange?.();
    } catch (error) {
      console.error('Vote error:', error);
    } finally {
      setVoting(false);
      setSelectedOptions([]);
    }
  };

  const handleRemoveVote = async () => {
    if (!currentUserId) return;

    setVoting(true);

    try {
      const { error } = await supabase
        .from('poll_votes')
        .delete()
        .eq('poll_id', poll.id)
        .eq('user_id', currentUserId);

      if (error) throw error;

      onVoteChange?.();
    } catch (error) {
      console.error('Remove vote error:', error);
    } finally {
      setVoting(false);
    }
  };

  const showVoters = (option: PollOption) => {
    setSelectedOptionForVoters(option);
    setShowVotersModal(true);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <div className="flex-1">
          <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
            {poll.poll_type === 'single' ? 'Tek Seçimli Anket' : 'Çok Seçimli Anket'}
          </span>
          <span className="text-xs text-gray-500 ml-2">
            {formatDistanceToNow(new Date(poll.created_at), { addSuffix: true, locale: tr })}
          </span>
        </div>
        {isExpired && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
            Sona Erdi
          </span>
        )}
      </div>

      {/* Question */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {poll.question}
      </h3>

      {poll.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {poll.description}
        </p>
      )}

      {/* Options */}
      <div className="space-y-2 mb-4">
        {options.map((option) => {
          const voteCount = getVoteCount(option.id);
          const percentage = getVotePercentage(option.id);
          const isSelected = selectedOptions.includes(option.id);
          const userVotedThis = userVotes.some((v) => v.poll_option_id === option.id);

          return (
            <div key={option.id}>
              <button
                type="button"
                onClick={() => handleOptionClick(option.id)}
                disabled={!canVote}
                className={`w-full text-left relative overflow-hidden rounded-xl border-2 transition-all ${
                  canVote
                    ? isSelected
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                    : userVotedThis
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {/* Progress bar background */}
                {(hasVoted || isExpired) && (
                  <div
                    className="absolute inset-0 bg-purple-100 dark:bg-purple-900/30 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                )}

                <div className="relative px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Checkbox/Radio */}
                    <div
                      className={`w-5 h-5 rounded-${poll.poll_type === 'single' ? 'full' : 'md'} border-2 flex items-center justify-center transition-colors ${
                        isSelected || userVotedThis
                          ? 'border-purple-500 bg-purple-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {(isSelected || userVotedThis) && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>

                    <span className="font-medium text-gray-900 dark:text-white">
                      {option.option_text}
                    </span>
                  </div>

                  {/* Vote count */}
                  {(hasVoted || isExpired) && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {percentage}%
                      </span>
                      <span className="text-xs text-gray-500">
                        ({voteCount})
                      </span>
                    </div>
                  )}
                </div>
              </button>

              {/* Show voters button */}
              {(hasVoted || isExpired) && voteCount > 0 && (
                <button
                  onClick={() => showVoters(option)}
                  className="text-xs text-purple-600 hover:text-purple-700 mt-1 ml-2"
                >
                  Oy verenleri gör
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        <span className="text-sm text-gray-500">
          {totalVotes} kişi oy kullandı
        </span>

        {canVote && selectedOptions.length > 0 && (
          <Button size="sm" onClick={handleVote} loading={voting}>
            Oy Ver
          </Button>
        )}

        {hasVoted && !isExpired && poll.is_active && (
          <Button size="sm" variant="ghost" onClick={handleRemoveVote} loading={voting}>
            Oyumu Geri Al
          </Button>
        )}

        {poll.ends_at && !isExpired && (
          <span className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(poll.ends_at), { addSuffix: true, locale: tr })} sona erecek
          </span>
        )}
      </div>

      {/* Voters Modal */}
      <Modal
        isOpen={showVotersModal}
        onClose={() => {
          setShowVotersModal(false);
          setSelectedOptionForVoters(null);
        }}
        title={`"${selectedOptionForVoters?.option_text}" seçeneğine oy verenler`}
      >
        <div className="p-4 max-h-96 overflow-y-auto">
          {selectedOptionForVoters && (
            <div className="space-y-2">
              {getVotersForOption(selectedOptionForVoters.id).map((vote) => (
                <div key={vote.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <Avatar
                    src={vote.profiles?.avatar_url}
                    alt={vote.profiles?.full_name || ''}
                    size="sm"
                  />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {vote.profiles?.full_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(vote.created_at), { addSuffix: true, locale: tr })}
                    </p>
                  </div>
                </div>
              ))}
              {getVotersForOption(selectedOptionForVoters.id).length === 0 && (
                <p className="text-center text-gray-500 py-4">
                  Henüz kimse oy vermedi
                </p>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
