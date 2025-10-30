interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner = ({
  size = 'md',
  message = 'Loading...',
  fullScreen = false
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-4',
    lg: 'w-12 h-12 border-4'
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center">
      <div className={`animate-spin ${sizeClasses[size]} border-green-500 border-t-transparent rounded-full`}></div>
      {message && (
        <p className={`mt-4 ${fullScreen ? 'text-white/80' : 'text-gray-600'} ${size === 'sm' ? 'text-sm' : ''}`}>
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-700 via-purple-600 to-slate-700 flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return <div className="flex items-center justify-center py-8">{spinner}</div>;
};
