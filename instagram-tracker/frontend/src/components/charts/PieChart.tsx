import React from 'react';
import { Pie } from 'react-chartjs-2';
import ChartWrapper from './ChartWrapper';

interface PieChartProps {
  data: Array<{
    label: string;
    value: number;
    color: string;
  }>;
  title?: string;
  className?: string;
}

const PieChart: React.FC<PieChartProps> = ({ data, title, className }) => {
  const chartData = {
    labels: data.map(item => item.label),
    datasets: [
      {
        data: data.map(item => item.value),
        backgroundColor: data.map(item => item.color),
        borderColor: data.map(item => item.color),
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <ChartWrapper title={title} className={className}>
      <Pie data={chartData} options={options} />
    </ChartWrapper>
  );
};

export default PieChart; 