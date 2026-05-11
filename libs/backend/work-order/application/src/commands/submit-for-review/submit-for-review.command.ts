export class SubmitForReviewCommand {
  constructor(
    public readonly workOrderId: string,
    public readonly by: string,
  ) {}
}
