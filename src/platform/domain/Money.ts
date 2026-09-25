import { Result } from './Result';

export class Money {
  private readonly _amount: number;

  private constructor(amount: number) {
    this._amount = amount;
  }

  get amount(): number {
    return this._amount;
  }

  /**
   * Tạo đối tượng Money. Số tiền phải là số nguyên (VND) và không âm.
   */
  public static create(amount: number): Result<Money> {
    if (!Number.isInteger(amount)) {
      // Làm tròn thành số nguyên nếu cần thiết (phụ thuộc quy định, hoặc trả về lỗi)
      amount = Math.round(amount);
    }
    if (amount < 0) {
      return Result.fail<Money>("Số tiền không được âm");
    }
    return Result.ok<Money>(new Money(amount));
  }

  public add(other: Money): Money {
    return new Money(this._amount + other.amount);
  }

  public subtract(other: Money): Result<Money> {
    if (this._amount < other.amount) {
      return Result.fail<Money>("Không thể trừ số tiền lớn hơn số hiện có (kết quả âm)");
    }
    return Result.ok<Money>(new Money(this._amount - other.amount));
  }

  public multiply(multiplier: number): Money {
    return new Money(Math.round(this._amount * multiplier));
  }

  /**
   * Tính VAT (trả về số tiền VAT)
   */
  public calculateVAT(vatPercentage: number): Money {
    return new Money(Math.round(this._amount * (vatPercentage / 100)));
  }

  /**
   * Tính chiết khấu (trả về số tiền chiết khấu)
   */
  public calculateDiscount(discountPercentage: number): Result<Money> {
    if (discountPercentage < 0 || discountPercentage > 100) {
      return Result.fail<Money>("Phần trăm chiết khấu phải từ 0 đến 100");
    }
    return Result.ok<Money>(new Money(Math.round(this._amount * (discountPercentage / 100))));
  }
}
