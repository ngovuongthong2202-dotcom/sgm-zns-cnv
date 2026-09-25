export class GenerateMaKh {
  static async execute(): Promise<string> {
    const res = await fetch('/api/customers/generate-makh', { method: 'POST' });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Lỗi khi tạo mã KH');
    }
    return data.maKh;
  }
}
