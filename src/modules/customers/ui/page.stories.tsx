import type { Meta, StoryObj } from '@storybook/react';
import CustomersFeature from './page';

const meta: Meta<typeof CustomersFeature> = {
  title: 'Features/Customers/CustomersFeature',
  component: CustomersFeature,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof CustomersFeature>;

export const Default: Story = {
  args: {},
};
