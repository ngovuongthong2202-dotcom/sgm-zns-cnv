import { Result } from './Result';

export class PhoneNumber {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  get value(): string {
    return this._value;
  }

  /**
   * Khởi tạo số điện thoại, chuẩn hóa theo định dạng Việt Nam
   */
  public static create(phone: string): Result<PhoneNumber> {
    if (!phone) {
      return Result.fail<PhoneNumber>("Số điện thoại không được để trống");
    }

    const cleaned = phone.replace(/\D/g, '');
    let normalized = cleaned;
    
    // Đổi 84 ở đầu thành 0
    if (normalized.startsWith('84')) {
      normalized = '0' + normalized.slice(2);
    }
    
    // Kiểm tra định dạng SĐT VN cơ bản (10 số, bắt đầu bằng 0)
    if (!/^0[3|5|7|8|9][0-9]{8}$/.test(normalized)) {
       return Result.fail<PhoneNumber>("Định dạng số điện thoại Việt Nam không hợp lệ");
    }

    return Result.ok<PhoneNumber>(new PhoneNumber(normalized));
  }

  /**
   * Trả về chuỗi format (vd: 0912 345 678)
   */
  public format(): string {
    return this._value.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
  }
}
