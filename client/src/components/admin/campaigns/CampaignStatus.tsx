interface CampaignStatusProps {
  status: 'draft' | 'teachers_input' | 'open' | 'launched' | 'closed' | 'published';
  size?: 'sm' | 'md' | 'lg';
}

export const CampaignStatus = ({ status, size = 'md' }: CampaignStatusProps) => {
  const statusConfig = {
    draft: {
      label: 'Draft',
      color: 'bg-gray-100 text-gray-800',
      icon: '📝'
    },
    teachers_input: {
      label: 'Teachers Input',
      color: 'bg-yellow-100 text-yellow-800',
      icon: '👩‍🏫'
    },
    open: {
      label: 'Open',
      color: 'bg-blue-100 text-blue-800',
      icon: '📖'
    },
    launched: {
      label: 'Launched',
      color: 'bg-green-100 text-green-800',
      icon: '🚀'
    },
    closed: {
      label: 'Closed',
      color: 'bg-orange-100 text-orange-800',
      icon: '🔒'
    },
    published: {
      label: 'Published',
      color: 'bg-purple-100 text-purple-800',
      icon: '✅'
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center space-x-1 rounded-full font-medium ${sizeClasses[size]} ${config.color}`}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
};
