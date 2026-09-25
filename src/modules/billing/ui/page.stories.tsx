import type { Meta, StoryObj } from '@storybook/react';
import PaymentsFeature from './page';

const meta = {
  title: 'Features/PaymentsFeature',
  component: PaymentsFeature,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof PaymentsFeature>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
