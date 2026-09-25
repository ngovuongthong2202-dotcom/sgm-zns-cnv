import { Result } from './Result';

export class BusinessKey {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  get value(): string {
    return this._value;
  }

  public static create(key: string): Result<BusinessKey> {
    if (!key || key.trim() === '') {
       return Result.fail<BusinessKey>("Số phiếu/HĐ (BusinessKey) không được để trống");
    }
    return Result.ok<BusinessKey>(new BusinessKey(key.trim()));
  }
}
