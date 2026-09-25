import { customerRepo } from '../../infrastructure/CustomerRepoFirestore';

export interface CustomerSummaryDTO {
  id: string;
  maKh: string;
  tenKhachHang: string;
  sdt?: string;
  isArchived: boolean;
}

export class GetCustomerSummary {
  static async execute(id: string): Promise<CustomerSummaryDTO | null> {
    const data = await customerRepo.getById(id);
    if (!data) return null;
    
    return {
      id: data.id || id,
      maKh: data.maKh,
      tenKhachHang: data.tenKhachHang,
      sdt: data.sdt,
      isArchived: !!data.isArchived,
    };
  }
}
