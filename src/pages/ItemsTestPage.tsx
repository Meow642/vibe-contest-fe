import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";

import { ApiError, parseServerTime } from "@/lib/api";
import {
  useCreateItemMutation,
  useDeleteItemMutation,
  useItemsQuery,
  useUpdateItemMutation,
} from "@/features/items/queries";
import type { Item } from "@/features/items/types";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

function formatTime(s: string) {
  try {
    return parseServerTime(s).toLocaleString();
  } catch {
    return s;
  }
}

function errMsg(e: unknown, fallback = "操作失败") {
  return e instanceof ApiError ? e.message : fallback;
}

type DoneFilter = "all" | "true" | "false";

export default function ItemsTestPage() {
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [q, setQ] = useState("");
  const [qDraft, setQDraft] = useState("");
  const [doneFilter, setDoneFilter] = useState<DoneFilter>("all");

  const params = useMemo(
    () => ({
      limit,
      offset,
      q: q || undefined,
      done: doneFilter === "all" ? undefined : doneFilter === "true",
    }),
    [limit, offset, q, doneFilter],
  );

  const { data, isLoading, isFetching, error, refetch } = useItemsQuery(params);

  const total = data?.total ?? 0;
  const items = data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Items 联调测试页</h1>
        <p className="text-sm text-muted-foreground">
          测试 <code className="rounded bg-muted px-1 py-0.5">/items</code> 的增删改查、分页、过滤、搜索。
        </p>
      </header>

      <CreateItemCard />

      <Card>
        <CardHeader>
          <CardTitle>列表</CardTitle>
          <CardDescription>
            按 <code>createdAt DESC</code> 排序，最新在前。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1 space-y-1.5">
              <Label htmlFor="search">搜索 (title / content)</Label>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  setOffset(0);
                  setQ(qDraft.trim());
                }}
              >
                <Input
                  id="search"
                  placeholder="输入关键字，回车搜索"
                  value={qDraft}
                  onChange={(e) => setQDraft(e.target.value)}
                />
                <Button type="submit" variant="outline" size="default">
                  <SearchIcon />
                  搜索
                </Button>
              </form>
            </div>

            <div className="space-y-1.5">
              <Label>完成状态</Label>
              <Select
                value={doneFilter}
                onValueChange={(v) => {
                  setDoneFilter(v as DoneFilter);
                  setOffset(0);
                }}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="false">未完成</SelectItem>
                  <SelectItem value="true">已完成</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>每页</Label>
              <Select
                value={String(limit)}
                onValueChange={(v) => {
                  setLimit(Number(v));
                  setOffset(0);
                }}
              >
                <SelectTrigger className="w-[90px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCwIcon className={isFetching ? "animate-spin" : ""} />
              刷新
            </Button>
          </div>

          <Separator />

          {error ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              加载失败：{errMsg(error, "未知错误")}
            </div>
          ) : isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>暂无数据</EmptyTitle>
                <EmptyDescription>
                  试试清空筛选条件，或在上方创建一条新的 Item。
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">ID</TableHead>
                    <TableHead>标题 / 内容</TableHead>
                    <TableHead className="w-20 text-right">分数</TableHead>
                    <TableHead className="w-24 text-center">完成</TableHead>
                    <TableHead className="w-44">创建时间</TableHead>
                    <TableHead className="w-28 text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it) => (
                    <ItemRow key={it.id} item={it} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              共 <span className="font-medium text-foreground">{total}</span> 条，第{" "}
              <span className="font-medium text-foreground">{currentPage}</span> /{" "}
              {pageCount} 页
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0 || isFetching}
                onClick={() => setOffset(Math.max(0, offset - limit))}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={offset + limit >= total || isFetching}
                onClick={() => setOffset(offset + limit)}
              >
                下一页
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- Create ----------

function CreateItemCard() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [score, setScore] = useState("0");
  const [done, setDone] = useState(false);

  const createMut = useCreateItemMutation();

  const reset = () => {
    setTitle("");
    setContent("");
    setScore("0");
    setDone(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("title 必填");
      return;
    }
    const scoreNum = Number(score);
    if (!Number.isInteger(scoreNum)) {
      toast.error("score 必须是整数");
      return;
    }
    createMut.mutate(
      { title: title.trim(), content, score: scoreNum, done },
      {
        onSuccess: (it) => {
          toast.success(`已创建 #${it.id}`);
          reset();
        },
        onError: (e) => toast.error(errMsg(e, "创建失败")),
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>创建</CardTitle>
        <CardDescription>POST /items — title 必填，其他字段走默认值。</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="title">标题 *</Label>
            <Input
              id="title"
              placeholder="写需求"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="content">内容</Label>
            <Textarea
              id="content"
              placeholder="梳理 MVP"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="score">分数（整数）</Label>
            <Input
              id="score"
              type="number"
              step="1"
              value={score}
              onChange={(e) => setScore(e.target.value)}
            />
          </div>

          <div className="flex items-end gap-3">
            <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
              <Switch id="done" checked={done} onCheckedChange={setDone} />
              <Label htmlFor="done" className="cursor-pointer">
                已完成
              </Label>
            </div>
          </div>

          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={createMut.isPending}>
              <PlusIcon />
              {createMut.isPending ? "创建中…" : "创建"}
            </Button>
            <Button type="button" variant="ghost" onClick={reset}>
              重置
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------- Row ----------

function ItemRow({ item }: { item: Item }) {
  const updateMut = useUpdateItemMutation();
  const deleteMut = useDeleteItemMutation();

  const toggleDone = (next: boolean) => {
    updateMut.mutate(
      { id: item.id, payload: { done: next } },
      {
        onError: (e) => toast.error(errMsg(e, "更新失败")),
      },
    );
  };

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">#{item.id}</TableCell>
      <TableCell>
        <div className="space-y-0.5">
          <div className="font-medium">{item.title}</div>
          {item.content && (
            <div className="line-clamp-2 text-xs text-muted-foreground">
              {item.content}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <Badge variant={item.score > 0 ? "default" : "secondary"}>
          {item.score}
        </Badge>
      </TableCell>
      <TableCell className="text-center">
        <Switch
          checked={item.done}
          disabled={updateMut.isPending}
          onCheckedChange={toggleDone}
          aria-label="toggle done"
        />
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {formatTime(item.createdAt)}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <EditItemDialog item={item} />
          <DeleteItemButton id={item.id} title={item.title} pending={deleteMut.isPending} onConfirm={() => {
            deleteMut.mutate(item.id, {
              onSuccess: () => toast.success(`已删除 #${item.id}`),
              onError: (e) => toast.error(errMsg(e, "删除失败")),
            });
          }} />
        </div>
      </TableCell>
    </TableRow>
  );
}

// ---------- Edit dialog ----------

function EditItemDialog({ item }: { item: Item }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [content, setContent] = useState(item.content);
  const [score, setScore] = useState(String(item.score));

  const updateMut = useUpdateItemMutation();

  const onOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) {
      setTitle(item.title);
      setContent(item.content);
      setScore(String(item.score));
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const scoreNum = Number(score);
    if (!Number.isInteger(scoreNum)) {
      toast.error("score 必须是整数");
      return;
    }
    updateMut.mutate(
      { id: item.id, payload: { title: title.trim(), content, score: scoreNum } },
      {
        onSuccess: () => {
          toast.success(`已更新 #${item.id}`);
          setOpen(false);
        },
        onError: (e) => toast.error(errMsg(e, "更新失败")),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label="edit">
          <PencilIcon />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑 #{item.id}</DialogTitle>
          <DialogDescription>PUT /items/{item.id}（partial update）</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`edit-title-${item.id}`}>标题</Label>
            <Input
              id={`edit-title-${item.id}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`edit-content-${item.id}`}>内容</Label>
            <Textarea
              id={`edit-content-${item.id}`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`edit-score-${item.id}`}>分数</Label>
            <Input
              id={`edit-score-${item.id}`}
              type="number"
              step="1"
              value={score}
              onChange={(e) => setScore(e.target.value)}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                取消
              </Button>
            </DialogClose>
            <Button type="submit" disabled={updateMut.isPending}>
              {updateMut.isPending ? "保存中…" : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Delete ----------

function DeleteItemButton({
  id,
  title,
  pending,
  onConfirm,
}: {
  id: number;
  title: string;
  pending: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label="delete" disabled={pending}>
          <Trash2Icon />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除 #{id}？</AlertDialogTitle>
          <AlertDialogDescription>
            即将删除「{title}」，该操作不可撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>删除</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
