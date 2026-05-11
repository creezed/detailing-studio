export class RemovePhotoCommand {
  constructor(
    public readonly workOrderId: string,
    public readonly photoId: string,
    public readonly by: string,
  ) {}
}
