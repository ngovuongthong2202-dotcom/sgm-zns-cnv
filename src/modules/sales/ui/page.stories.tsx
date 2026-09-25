import type { Meta, StoryObj } from '@storybook/react';
import QuotationsFeature from './page';

const meta: Meta<typeof QuotationsFeature> = {
  title: 'Features/Quotations/QuotationsFeature',
  component: QuotationsFeature,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof QuotationsFeature>;

export const Default: Story = {
  args: {},
};
