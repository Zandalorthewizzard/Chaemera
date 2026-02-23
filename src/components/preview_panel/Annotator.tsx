import { useState } from "react";
import { Button } from "@/components/ui/button";

interface AnnotatorProps {
  screenshotUrl: string;
  onSubmit: (files: File[]) => void;
  handleAnnotatorClick: () => void;
}

async function screenshotToFile(dataUrl: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const extension = blob.type.split("/")[1] || "png";
  return new File(
    [blob],
    `annotated-screenshot-${Date.now()}.${extension}`,
    { type: blob.type || "image/png" },
  );
}

export const Annotator = ({
  screenshotUrl,
  onSubmit,
  handleAnnotatorClick,
}: AnnotatorProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAttach = async () => {
    setIsSubmitting(true);
    try {
      const file = await screenshotToFile(screenshotUrl);
      onSubmit([file]);
      handleAnnotatorClick();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="text-sm font-medium">Screenshot ready</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleAnnotatorClick}>
            Back
          </Button>
          <Button onClick={handleAttach} disabled={isSubmitting}>
            {isSubmitting ? "Attaching..." : "Attach to chat"}
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3 bg-muted/20">
        <img
          src={screenshotUrl}
          alt="Screenshot preview"
          className="max-w-full rounded border shadow-sm"
        />
      </div>
    </div>
  );
};
