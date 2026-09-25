export class Guard {
  public static againstNullOrUndefined(argument: unknown, argumentName: string): void {
    if (argument === null || argument === undefined) {
      throw new Error(`${argumentName} is null or undefined`);
    }
  }

  public static againstEmptyString(argument: string, argumentName: string): void {
    if (typeof argument !== 'string' || argument.trim() === '') {
      throw new Error(`${argumentName} is empty`);
    }
  }
}
