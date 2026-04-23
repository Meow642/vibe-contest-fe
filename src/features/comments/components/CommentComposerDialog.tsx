import { useState } from "react";
import { XIcon } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import {
  pickRandomCommentColor,
  pickRandomCommentRotation,
} from "@/features/comments/constants";
import {
  useCreateCommentMutation,
  useUpdateCommentMutation,
} from "@/features/comments/queries";
import type { CommentColor } from "@/features/comments/types";
import {
  mapCommentApiError,
  validateCommentContent,
} from "@/features/comments/validation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import RichTextEditor from "./RichTextEditor";

interface CommentComposerDialogProps {
  commentId?: number | null;
  defaultPosition: {
    x: number;
    y: number;
  };
  initialContent?: string;
  mode?: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ComposerErrors {
  content?: string;
  form?: string;
}

function getErrorMessage(error: unknown, fallback = "发布失败，请稍后重试") {
  if (error instanceof ApiError) {
    return error.message;
  }

  return fallback;
}

export default function CommentComposerDialog({
  commentId = null,
  defaultPosition,
  initialContent = "<p></p>",
  mode = "create",
  open,
  onOpenChange,
}: CommentComposerDialogProps) {
  const createCommentMutation = useCreateCommentMutation();
  const updateCommentMutation = useUpdateCommentMutation();

  const [contentHtml, setContentHtml] = useState(initialContent);
  const [color] = useState<CommentColor>(pickRandomCommentColor);
  const [rotation] = useState(() => pickRandomCommentRotation());
  const [errors, setErrors] = useState<ComposerErrors>({});
  const isEditing = mode === "edit";
  const isPending =
    createCommentMutation.isPending || updateCommentMutation.isPending;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const contentError = validateCommentContent(contentHtml);

    if (contentError) {
      setErrors({
        content: contentError ? "请先输入要发布的内容" : undefined,
      });
      return;
    }

    setErrors({});

    try {
      if (isEditing && commentId) {
        await updateCommentMutation.mutateAsync({
          id: commentId,
          payload: { content: contentHtml },
        });
        toast.success("修改已保存");
      } else {
        await createCommentMutation.mutateAsync({
          content: contentHtml,
          x: defaultPosition.x,
          y: defaultPosition.y,
          color,
          rotation,
        });

        toast.success("新想法已发布");
      }

      onOpenChange(false);
    } catch (error) {
      const message = getErrorMessage(error);
      const mapped = mapCommentApiError(message);

      setErrors(mapped);
      toast.error(mapped.form ?? mapped.content ?? message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[452px] w-[600px] max-w-[calc(100vw-2rem)] flex-col gap-0 rounded-[24px] border-0 bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.14)] sm:max-w-[600px]"
        showCloseButton={false}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogClose asChild>
          <button
            aria-label="关闭"
            className="absolute right-5 top-5 flex size-6 items-center justify-center text-slate-400 transition hover:text-slate-600"
            type="button"
          >
            <XIcon className="size-5" />
          </button>
        </DialogClose>

        <DialogHeader className="gap-0 pr-8">
          <DialogTitle className="text-[18px] font-semibold leading-7 tracking-tight text-[#000311]">
            {isEditing ? "编辑想法" : "发表新想法"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isEditing ? "编辑已发布的想法" : "发表一条新的想法"}
          </DialogDescription>
        </DialogHeader>

        <form
          className="mt-3 flex min-h-0 flex-1 flex-col"
          onSubmit={handleSubmit}
        >
          <RichTextEditor
            initialValue={initialContent}
            key={initialContent}
            onChange={(html) => {
              setContentHtml(html);
              setErrors((current) => ({
                ...current,
                content: undefined,
                form: undefined,
              }));
            }}
          />

          {errors.content ? (
            <p className="mt-2 text-xs text-rose-500">{errors.content}</p>
          ) : null}

          {errors.form ? (
            <p className="mt-2 text-xs text-rose-500">{errors.form}</p>
          ) : null}

          <div className="mt-4 flex shrink-0 justify-center">
            <Button
              className="h-12 min-w-[180px] rounded-xl bg-[#000311] px-10 text-sm font-medium text-white shadow-none hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending}
              type="submit"
            >
              {isPending ? <Spinner className="size-4" /> : null}
              {isEditing ? "保存修改" : "马上发表"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
