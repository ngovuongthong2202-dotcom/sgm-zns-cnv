export class ZnsBaseError extends Error {
  public code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ZnsConfigurationError extends ZnsBaseError {
  constructor(message: string) {
    super(message, 'VENDOR_NOT_CONFIGURED');
  }
}

export class ZnsPreflightBlockedError extends ZnsBaseError {
  public missingVars: string[];
  constructor(message: string, missingVars: string[]) {
    super(message, 'ZALO_REQUIRED_VARS_EMPTY');
    this.missingVars = missingVars;
  }
}

export class ZnsQuotaExceededError extends ZnsBaseError {
  constructor(message: string) {
    super(message, 'LIMIT_EXCEEDED');
  }
}

export class ZnsVendorApiError extends ZnsBaseError {
  public status: number;
  constructor(message: string, status: number) {
    super(message, 'ZNS_API_FAILURE');
    this.status = status;
  }
}
