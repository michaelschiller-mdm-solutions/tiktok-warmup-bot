import React from 'react';

interface MonthSelectorProps {
  selectedMonths: number[];
  onChange: (selectedMonths: number[]) => void;
}

const months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const MonthSelector: React.FC<MonthSelectorProps> = ({ selectedMonths, onChange }) => {
  const handleMonthClick = (monthIndex: number) => {
    const month = monthIndex + 1;
    const newSelectedMonths = selectedMonths.includes(month)
      ? selectedMonths.filter((m) => m !== month)
      : [...selectedMonths, month];
    onChange(newSelectedMonths.sort((a, b) => a - b));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Available Months
      </label>
      <div className="grid grid-cols-6 gap-2">
        {months.map((name, index) => {
          const month = index + 1;
          const isSelected = selectedMonths.includes(month);
          return (
            <button
              key={name}
              type="button"
              onClick={() => handleMonthClick(index)}
              className={`px-3 py-2 text-sm font-medium text-center rounded-md transition-colors ${
                isSelected
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              {name}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Select the months this content will be available for posting. Leave empty for all year.
      </p>
    </div>
  );
}; 