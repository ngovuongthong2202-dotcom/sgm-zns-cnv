import { test as base, expect } from '@playwright/test';

// Declare the types of your fixtures.
type MyFixtures = {
  loginPage: any;
  seedData: any;
};

// This is a basic fixture that sets up test context
export const test = base.extend<MyFixtures>({
  loginPage: async ({ page }, use) => {
    // Navigate to local app
    await page.goto('/');
    
    // We assume the app is auto-logged in via emulator, or we do a mock login here
    // Replace with real login commands if needed
    // await page.getByRole('button', { name: 'Login' }).click();
    
    await use(page);
  },
  // eslint-disable-next-line no-empty-pattern
  seedData: async ({}, use) => {
    // Provide a helper to generate random strings for seed data
    const helper = {
      randomPhone: () => `09${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
      randomName: () => `Khách Hàng ${Math.floor(Math.random() * 10000)}`,
    };
    await use(helper);
  }
});

export { expect };
