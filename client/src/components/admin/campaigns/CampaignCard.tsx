import Link from 'next/link';
import { Campaign } from '@/lib/api/campaigns';
import { CampaignStatus } from './CampaignStatus';

interface CampaignCardProps {
  campaign: Campaign;
  semesterId: string;
  onStatusChange?: (campaignId: string, action: string) => void;
  showActions?: boolean;
}

export const CampaignCard = ({ campaign, semesterId, onStatusChange, showActions = true }: CampaignCardProps) => {
  const getStatusActions = (status: string) => {
    switch (status) {
      case 'draft':
        return [{ action: 'open', label: 'Open for Teachers', color: 'bg-blue-600 hover:bg-blue-700' }];
      case 'teachers_input':
        return [{ action: 'close', label: 'Close Input', color: 'bg-orange-600 hover:bg-orange-700' }];
      case 'open':
        return [{ action: 'launch', label: 'Launch', color: 'bg-green-600 hover:bg-green-700' }];
      case 'launched':
        return [{ action: 'publish', label: 'Publish', color: 'bg-purple-600 hover:bg-purple-700' }];
      default:
        return [];
    }
  };

  const actions = getStatusActions(campaign.status);

  return (
    <div className="flex items-center justify-between p-6 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex-1">
        <div className="flex items-center space-x-4 mb-2">
          <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
          <CampaignStatus status={campaign.status} />
          <span className={`px-3 py-1 text-sm rounded-full ${
            campaign.type === 'course' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
          }`}>
            {campaign.type === 'course' ? 'Course Survey' : 'Event Survey'}
          </span>
        </div>
        <p className="text-sm text-gray-500">
          Created {new Date(campaign.createdAt).toLocaleDateString()}
          {campaign.createdByName && ` by ${campaign.createdByName}`}
        </p>
        {campaign.blockchainAddress && (
          <p className="text-xs text-gray-400 mt-1 font-mono">
            Blockchain: {campaign.blockchainAddress.slice(0, 8)}...{campaign.blockchainAddress.slice(-6)}
          </p>
        )}
      </div>

      {showActions && (
        <div className="flex items-center space-x-2 ml-6">
          <Link
            href={`/admin/semesters/${semesterId}/campaigns/${campaign.id}`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            View Details
          </Link>
          {onStatusChange && actions.map(({ action, label, color }) => (
            <button
              key={action}
              onClick={() => onStatusChange(campaign.id, action)}
              className={`${color} text-white px-4 py-2 rounded-lg text-sm transition-colors`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
