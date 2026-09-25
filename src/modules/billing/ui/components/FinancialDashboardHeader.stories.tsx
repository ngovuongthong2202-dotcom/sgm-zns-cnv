import type { Meta, StoryObj } from '@storybook/react';
import { FinancialDashboardHeader } from './FinancialDashboardHeader';

const meta: Meta<typeof FinancialDashboardHeader> = {
  title: 'Features/Payments/FinancialDashboardHeader',
  component: FinancialDashboardHeader,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="bg-slate-100 p-8 min-h-[300px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FinancialDashboardHeader>;

export const Default: Story = {
  args: {
    collectedToday: 45000000,
    collectedThisWeek: 320000000,
    collectedThisMonth: 1200000000,
    totalDebt: 500000000,
  },
};

export const ZeroData: Story = {
  args: {
    collectedToday: 0,
    collectedThisWeek: 0,
    collectedThisMonth: 0,
    totalDebt: 0,
  },
};

export const CriticalOverdue: Story = {
  args: {
    collectedToday: 0,
    collectedThisWeek: 15000000,
    collectedThisMonth: 100000000,
    totalDebt: 400000000,
  },
};
