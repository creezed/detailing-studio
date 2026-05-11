export class AddPhotoCommand {
  constructor(
    public readonly workOrderId: string,
    public readonly type: 'BEFORE' | 'AFTER',
    public readonly file: Buffer,
    public readonly mime: string,
    public readonly uploadedBy: string,
  ) {}
}
