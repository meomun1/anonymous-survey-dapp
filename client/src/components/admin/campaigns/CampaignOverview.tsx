import { Campaign } from '@/lib/api/campaigns';
import { CampaignStatus } from './CampaignStatus';

interface CampaignOverviewProps {
  campaign: Campaign;
}

export const CampaignOverview = ({ campaign }: CampaignOverviewProps) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{campaign.name}</h2>
        </div>
        <CampaignStatus status={campaign.status} size="lg" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Campaign Type</h3>
          <p className="text-base font-semibold text-gray-900">
            {campaign.type === 'course' ? 'Course Survey' : 'Event Survey'}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Campaign ID</h3>
          <p className="text-sm font-mono text-gray-600">{campaign.id}</p>
        </div>
      </div>
    </div>
  );
};
