export interface IpcSenderLike {
  isDestroyed?: () => boolean;
  isCrashed?: () => boolean;
  send(channel: string, ...args: unknown[]): void;
}

export interface IpcEventLike {
  sender: IpcSenderLike;
}
