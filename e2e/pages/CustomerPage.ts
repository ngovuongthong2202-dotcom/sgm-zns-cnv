import { Page, Locator } from '@playwright/test';

export class CustomerPage {
  readonly page: Page;
  readonly listPath = '/customers';
  readonly addBtn: Locator;
  readonly nameInput: Locator;
  readonly phoneInput: Locator;
  readonly saveBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addBtn = page.getByRole('button', { name: /thêm khách hàng/i });
    this.nameInput = page.getByLabel(/tên khách hàng/i);
    this.phoneInput = page.getByLabel(/số điện thoại/i);
    this.saveBtn = page.getByRole('button', { name: /lưu/i });
  }

  async goto() {
    await this.page.goto(this.listPath);
  }

  async create(name: string, phone: string) {
    await this.addBtn.click();
    await this.nameInput.fill(name);
    await this.phoneInput.fill(phone);
    await this.saveBtn.click();
  }
}
