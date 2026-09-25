import type { Meta, StoryObj } from '@storybook/react';
import ContractsFeature from './page';

const meta: Meta<typeof ContractsFeature> = {
  title: 'Features/Contracts/ContractsFeature',
  component: ContractsFeature,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof ContractsFeature>;

export const Default: Story = {
  args: {},
};
