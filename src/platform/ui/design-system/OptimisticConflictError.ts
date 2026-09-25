export class OptimisticConflictError extends Error {
  constructor(public serverData: any) {
    super('OPTIMISTIC_CONCURRENCY_ABORTED');
    this.name = 'OptimisticConflictError';
  }
}
