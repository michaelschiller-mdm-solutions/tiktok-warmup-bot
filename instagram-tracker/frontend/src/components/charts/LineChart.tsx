import React from 'react';
import { Line } from 'react-chartjs-2';
import { format } from 'date-fns';
import ChartWrapper from './ChartWrapper';

interface LineChartProps {
  data: Array<{
    period: string;
    [key: string]: any;
  }>;
  title?: string;
  dataKeys: Array<{
    key: string;
    label: string;
    color: string;
  }>;
  className?: string;
}

const LineChart: React.FC<LineChartProps> = ({ data, title, dataKeys, className }) => {
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM dd');
    } catch {
      return dateStr;
    }
  };

  const chartData = {
    labels: data.map(item => formatDate(item.period)),
    datasets: dataKeys.map(({ key, label, color }) => ({
      label,
      data: data.map(item => item[key] || 0),
      borderColor: color,
      backgroundColor: color + '20',
      borderWidth: 2,
      fill: false,
      tension: 0.4,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: '#f3f4f6',
        },
      },
      x: {
        grid: {
          color: '#f3f4f6',
        },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  return (
    <ChartWrapper title={title} className={className}>
      <Line data={chartData} options={options} />
    </ChartWrapper>
  );
};

export default LineChart; 