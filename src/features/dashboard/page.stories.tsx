import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import DashboardPage from './page';

export default {
  title: 'Features/Dashboard/DashboardPage',
  component: DashboardPage,
  decorators: [
    (Story: React.FC) => (
      <BrowserRouter>
        <div className="bg-slate-50 min-h-screen">
          <Story />
        </div>
      </BrowserRouter>
    )
  ]
};

export const Default = () => <DashboardPage />;
