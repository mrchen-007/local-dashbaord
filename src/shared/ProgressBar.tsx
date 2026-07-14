interface ProgressBarProps {
  current: number;
  total: number;
  message: string;
  variant?: 'primary' | 'success' | 'warning';
  label?: string;
}

const variantClasses = {
  primary: 'bg-primary',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
};

export default function ProgressBar({
  current,
  total,
  message,
  variant = 'primary',
  label,
}: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const displayLabel = label !== undefined ? label : `${percentage}%`;

  return (
    <div className="card mb-6">
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-400 truncate">{message}</span>
        <span className="text-gray-400">{displayLabel}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className={`${variantClasses[variant]} h-2 rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
