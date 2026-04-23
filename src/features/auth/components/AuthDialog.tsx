import { useState } from "react";
import { EyeIcon, EyeOffIcon, LoaderCircleIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import {
  useLoginMutation,
  useRegisterMutation,
} from "@/features/auth/queries";
import {
  mapAuthApiError,
  normalizeUsername,
  validatePassword,
  validateUsername,
  type AuthFieldErrors,
} from "@/features/auth/validation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type AuthMode = "login" | "register";

interface AuthDialogProps {
  mode: AuthMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getErrorMessage(error: unknown, fallback = "操作失败，请稍后重试") {
  if (error instanceof ApiError) {
    return error.message;
  }

  return fallback;
}

export default function AuthDialog({
  mode,
  open,
  onOpenChange,
}: AuthDialogProps) {
  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<AuthFieldErrors>({});

  const isLogin = mode === "login";
  const isSubmitting = loginMutation.isPending || registerMutation.isPending;
  const canSubmit = username.trim().length > 0 && password.length > 0 && !isSubmitting;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: AuthFieldErrors = {};
    const normalizedUsername = normalizeUsername(username);
    const usernameError = validateUsername(normalizedUsername);
    const passwordError = validatePassword(password);

    if (usernameError) {
      nextErrors.username = usernameError;
    }

    if (passwordError) {
      nextErrors.password = passwordError;
    }

    if (nextErrors.username || nextErrors.password) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});

    try {
      if (isLogin) {
        await loginMutation.mutateAsync({
          username: normalizedUsername,
          password,
          storage: remember ? "local" : "session",
        });
        toast.success("登录成功");
      } else {
        await registerMutation.mutateAsync({
          username: normalizedUsername,
          password,
          displayName: normalizedUsername,
          storage: "local",
        });
        toast.success("注册成功");
      }

      onOpenChange(false);
    } catch (error) {
      const message = getErrorMessage(error);
      const mappedErrors = mapAuthApiError(message);

      setErrors(mappedErrors);

      if (message === "invalid username or password") {
        toast.error("账号密码错误！");
        return;
      }

      toast.error(mappedErrors.form ?? mappedErrors.username ?? mappedErrors.password ?? message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[400px] max-w-[calc(100vw-2rem)] gap-0 rounded-[20px] border-0 bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.14)] sm:max-w-[400px]"
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
          <DialogTitle className="text-[20px] font-semibold leading-7 tracking-tight text-[#000311]">
            {isLogin ? "账号登录解锁更多功能" : "注册为Talon用户"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isLogin ? "登录表单" : "注册表单"}
          </DialogDescription>
        </DialogHeader>

        <form className="mt-6 flex flex-col gap-3" onSubmit={handleSubmit}>
          <div>
            <Label className="sr-only" htmlFor="auth-username">
              用户账号
            </Label>
            <Input
              id="auth-username"
              aria-invalid={Boolean(errors.username)}
              autoComplete="username"
              className="h-12 rounded-xl border-slate-200 bg-white px-4 text-sm text-[#000311] shadow-none placeholder:text-slate-400"
              placeholder="输入用户账号"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setErrors((current) => ({ ...current, username: undefined, form: undefined }));
              }}
            />
            {errors.username ? (
              <p className="mt-1 text-xs text-rose-500">{errors.username}</p>
            ) : null}
          </div>

          <div>
            <Label className="sr-only" htmlFor="auth-password">
              登录密码
            </Label>
            <div className="relative">
              <Input
                id="auth-password"
                aria-invalid={Boolean(errors.password)}
                autoComplete={isLogin ? "current-password" : "new-password"}
                className="h-12 rounded-xl border-slate-200 bg-white px-4 pr-11 text-sm text-[#000311] shadow-none placeholder:text-slate-400"
                placeholder="输入6-30位密码"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setErrors((current) => ({ ...current, password: undefined, form: undefined }));
                }}
              />
              <button
                aria-label={showPassword ? "隐藏密码" : "显示密码"}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition hover:text-slate-600"
                type="button"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? (
                  <EyeIcon className="size-4" />
                ) : (
                  <EyeOffIcon className="size-4" />
                )}
              </button>
            </div>
            {errors.password ? (
              <p className="mt-1 text-xs text-rose-500">{errors.password}</p>
            ) : null}
          </div>

          {errors.form ? (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-500">
              {errors.form}
            </div>
          ) : null}

          <Button
            className="mt-1 h-12 w-full rounded-xl bg-[#000311] text-sm font-medium text-white shadow-none hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:bg-[#f2f3f5] disabled:text-slate-400 disabled:opacity-100"
            disabled={!canSubmit}
            type="submit"
          >
            {isSubmitting ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : null}
            {isLogin ? "登录" : "注册/登录"}
          </Button>

          {isLogin ? (
            <Label className="mt-2 flex w-fit items-center gap-2 text-sm font-normal text-[#000311]">
              <Checkbox
                checked={remember}
                className="size-[18px] rounded-full border-slate-300 data-checked:border-[#1976f0] data-checked:bg-[#1976f0] [&_svg]:size-3"
                onCheckedChange={(checked) => setRemember(checked === true)}
              />
              自动登录
            </Label>
          ) : null}

          <p className="mt-4 text-center text-xs leading-5 text-slate-400">
            {isLogin ? "登录" : "注册"}视为您已阅读并同意
            <button
              className="mx-1 text-[#1976f0] transition hover:text-sky-700"
              type="button"
            >
              用户协议
            </button>
            、
            <button
              className="text-[#1976f0] transition hover:text-sky-700"
              type="button"
            >
              隐私政策
            </button>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
