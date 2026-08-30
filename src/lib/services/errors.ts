export class DomainError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string) {
    super(message, 'NOT_FOUND_ERROR');
  }
}

export class InvalidTransactionError extends DomainError {
  constructor(message: string) {
    super(message, 'INVALID_TRANSACTION_ERROR');
  }
}
