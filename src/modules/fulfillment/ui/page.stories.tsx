import type { Meta, StoryObj } from '@storybook/react';
import DeliveriesFeature from './page';

const meta = {
  title: 'Features/DeliveriesFeature',
  component: DeliveriesFeature,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DeliveriesFeature>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
