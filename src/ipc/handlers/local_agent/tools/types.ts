export interface Todo {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed";
}

export type UserMessageContentPart =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image-url";
      url: string;
    };
