import { useState } from "react";
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
  const [plainText, setPlainText] = useState("");
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
        className="max-w-[min(92vw,48rem)] rounded-[30px] border border-white/80 bg-white/96 px-6 pb-6 pt-7 shadow-[0_28px_80px_rgba(15,23,42,0.16)] sm:px-7"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="gap-2 pr-10">
          <DialogTitle className="text-[1.6rem] font-semibold tracking-tight text-slate-950">
            {isEditing ? "编辑想法" : "发表新想法"}
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-slate-500">
            {isEditing
              ? "修改后会同步覆盖原有贴纸内容。"
              : "支持基础富文本。提交后会以便签形式出现在评论墙中央区域，后续可继续编辑与拖动。"}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <RichTextEditor
            initialValue={initialContent}
            key={initialContent}
            onChange={(html, nextPlainText) => {
              setContentHtml(html);
              setPlainText(nextPlainText.trim());
              setErrors((current) => ({ ...current, content: undefined, form: undefined }));
            }}
          />

          <div className="flex items-center justify-end gap-3">
            <p className="text-xs text-slate-400">
              纯文本 {plainText.length}/2000，HTML {contentHtml.length}/5000
            </p>
          </div>

          {errors.content ? (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-500">
              {errors.content}
            </div>
          ) : null}

          {errors.form ? (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-500">
              {errors.form}
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-4 pt-1">
            <p className="text-xs leading-6 text-slate-400">
              当前默认发布位置为画布中央附近，便签角度会自动生成轻微随机偏转。
            </p>

            <Button
              className="h-12 min-w-32 rounded-2xl bg-slate-950 px-6 text-base font-medium text-white shadow-[0_16px_32px_rgba(15,23,42,0.18)] hover:bg-slate-800"
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
