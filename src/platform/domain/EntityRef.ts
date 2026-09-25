import { Result } from './Result';

export class EntityRef {
  private readonly _id: string;
  private readonly _label: string;

  private constructor(id: string, label: string) {
    this._id = id;
    this._label = label;
  }

  /**
   * Lưu ý id chỉ nên dùng nội bộ hoặc tra cứu, không lộ rõ lên UI (theo yêu cầu)
   */
  get id(): string {
    return this._id;
  }

  get label(): string {
    return this._label;
  }

  public static create(id: string, label: string): Result<EntityRef> {
    if (!id || id.trim() === '') {
       return Result.fail<EntityRef>("Entity ID không được để trống");
    }
    if (!label || label.trim() === '') {
       return Result.fail<EntityRef>("Entity Label không được để trống");
    }
    return Result.ok<EntityRef>(new EntityRef(id.trim(), label.trim()));
  }
  
  public toDisplay(): string {
    return this._label;
  }
}
