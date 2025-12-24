'use client';

import { useState } from 'react';
import { Campaign } from '@/lib/api/campaigns';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

interface StatusManagerProps {
  campaign: Campaign;
  onStatusChange: (action: 'open' | 'close' | 'launch' | 'publish') => Promise<void>;
  onPublishResponses: () => Promise<{ merkleRoot: string; totalResponses: number }>;
  onPublishClaims: () => Promise<{ merkleRoot: string; totalClaimed: number }>;
}

export const StatusManager = ({ campaign, onStatusChange, onPublishResponses, onPublishClaims }: StatusManagerProps) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [currentAction, setCurrentAction] = useState<'open' | 'close' | 'launch' | 'publish' | null>(null);
  const [loading, setLoading] = useState(false);
  const [publishProgress, setPublishProgress] = useState('');

  const getAvailableActions = () => {
    switch (campaign.status) {
      case 'draft':
        return [{
          action: 'open' as const,
          label: 'Open for Teachers',
          description: 'Open this campaign for teachers to input their courses and students',
          color: 'bg-blue-600 hover:bg-blue-700',
          confirmMessage: 'This will allow teachers to start inputting course assignments and student enrollments.'
        }];

      case 'teachers_input':
        return [{
          action: 'close' as const,
          label: 'Close Teacher Input',
          description: 'Close teacher input and prepare for launch',
          color: 'bg-orange-600 hover:bg-orange-700',
          confirmMessage: 'This will close teacher input. Teachers will no longer be able to add courses or students.'
        }];

      case 'open':
        return [{
          action: 'launch' as const,
          label: 'Launch Campaign',
          description: 'Generate surveys and send tokens to students via email',
          color: 'bg-green-600 hover:bg-green-700',
          confirmMessage: 'This will generate all surveys based on course assignments and send tokens to all enrolled students via email. This action cannot be undone.'
        }];

      case 'launched':
        return [{
          action: 'close' as const,
          label: 'Close Campaign',
          description: 'Stop accepting new student submissions (does NOT finalize on blockchain)',
          color: 'bg-red-600 hover:bg-red-700',
          confirmMessage: 'This will close the campaign to new submissions. Students will no longer be able to submit responses. You can then publish Merkle roots and proceed with verification. Note: This does NOT finalize the campaign on blockchain - that is a separate action in the Danger Zone.'
        }];

      case 'closed':
        return [{
          action: 'publish' as const,
          label: 'Publish Results',
          description: 'Publish Merkle roots to blockchain and make results public',
          color: 'bg-purple-600 hover:bg-purple-700',
          confirmMessage: 'This will:\n1. Publish response commitments to blockchain (Tree #1)\n2. Publish participation claims to blockchain (Tree #2)\n3. Make campaign results public\n\nThis process may take a few moments. Continue?'
        }];

      default:
        return [];
    }
  };

  const handleActionClick = (action: 'open' | 'close' | 'launch' | 'publish') => {
    setCurrentAction(action);
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    if (!currentAction) return;

    try {
      setLoading(true);

      // For publish action, do blockchain operations first
      if (currentAction === 'publish') {
        // Step 1: Publish response commitments (Tree #1) - ignore if already published
        setPublishProgress('Publishing response commitments to blockchain...');
        try {
          await onPublishResponses();
        } catch (err: any) {
          // If already published, continue
          if (!err.message?.includes('already published')) {
            throw err;
          }
          console.log('Response Merkle root already published, continuing...');
        }

        // Step 2: Publish participation claims (Tree #2) - ignore if already published
        setPublishProgress('Publishing participation claims to blockchain...');
        try {
          await onPublishClaims();
        } catch (err: any) {
          // If already published, continue
          if (!err.message?.includes('already published')) {
            throw err;
          }
          console.log('Claims Merkle root already published, continuing...');
        }

        // Step 3: Change status to published
        setPublishProgress('Finalizing publication...');
        await onStatusChange(currentAction);
      } else {
        await onStatusChange(currentAction);
      }

      setShowConfirm(false);
      setCurrentAction(null);
      setPublishProgress('');
    } catch (error) {
      console.error('Status change failed:', error);
      setPublishProgress('');
    } finally {
      setLoading(false);
    }
  };

  const actions = getAvailableActions();

  if (actions.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Campaign Status</h3>
        <p className="text-gray-600">
          Campaign is {campaign.status}. No actions available at this time.
        </p>
      </div>
    );
  }

  const currentActionData = actions[0];

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Management</h3>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Current Status: {campaign.status.replace('_', ' ').toUpperCase()}</h4>
            <p className="text-sm text-blue-800 mb-4">{currentActionData.description}</p>

            <button
              onClick={() => handleActionClick(currentActionData.action)}
              disabled={loading}
              className={`${currentActionData.color} text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto`}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>{publishProgress || 'Processing...'}</span>
                </div>
              ) : currentActionData.label}
            </button>
          </div>

          {/* Status Flow Indicator */}
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Campaign Lifecycle</h4>
            <div className="flex items-center space-x-2 overflow-x-auto pb-2">
              {['draft', 'teachers_input', 'open', 'launched', 'closed', 'published'].map((status, index) => (
                <div key={status} className="flex items-center">
                  <div className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                    campaign.status === status
                      ? 'bg-blue-600 text-white'
                      : index < ['draft', 'teachers_input', 'open', 'launched', 'closed', 'published'].indexOf(campaign.status)
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {status.replace('_', ' ')}
                  </div>
                  {index < 5 && (
                    <svg className="w-4 h-4 text-gray-400 mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {currentAction && (
        <ConfirmDialog
          isOpen={showConfirm}
          onClose={() => setShowConfirm(false)}
          onConfirm={handleConfirm}
          title={`Confirm: ${actions.find(a => a.action === currentAction)?.label}`}
          message={actions.find(a => a.action === currentAction)?.confirmMessage || ''}
          confirmText="Proceed"
          type="warning"
        />
      )}
    </>
  );
};
