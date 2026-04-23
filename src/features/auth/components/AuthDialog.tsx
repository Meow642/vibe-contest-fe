import { useState } from "react";
import { useNavigate } from "react-router";
import { EyeIcon, EyeOffIcon, LoaderCircleIcon } from "lucide-react";
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
  const navigate = useNavigate();
  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<AuthFieldErrors>({});

  const isLogin = mode === "login";
  const isSubmitting = loginMutation.isPending || registerMutation.isPending;

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

  function goTo(nextMode: AuthMode) {
    navigate(nextMode === "login" ? "/login" : "/register", { replace: true });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[min(92vw,33rem)] rounded-[28px] border border-white/80 bg-white/96 px-6 pb-6 pt-7 shadow-[0_28px_80px_rgba(15,23,42,0.16)] sm:px-8"
      >
        <DialogHeader className="gap-2 pr-10">
          <DialogTitle className="text-[1.75rem] font-semibold tracking-tight text-slate-950">
            {isLogin ? "账号登录解锁更多功能" : "注册为 Talon 用户"}
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-slate-500">
            {isLogin
              ? "登录后即可发表评论、移动自己的贴纸，并参与实时互动。"
              : "注册成功后会直接进入登录态，后续可继续完善昵称和头像。"}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label className="sr-only" htmlFor="auth-username">
              用户账号
            </Label>
            <Input
              id="auth-username"
              aria-invalid={Boolean(errors.username)}
              autoComplete="username"
              className="h-12 rounded-2xl border-slate-200 bg-white px-4 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
              placeholder="输入用户账号"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setErrors((current) => ({ ...current, username: undefined, form: undefined }));
              }}
            />
            {errors.username ? (
              <p className="text-xs text-rose-500">{errors.username}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label className="sr-only" htmlFor="auth-password">
              登录密码
            </Label>
            <div className="relative">
              <Input
                id="auth-password"
                aria-invalid={Boolean(errors.password)}
                autoComplete={isLogin ? "current-password" : "new-password"}
                className="h-12 rounded-2xl border-slate-200 bg-white px-4 pr-11 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
                placeholder="输入 6-30 位密码"
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
                  <EyeOffIcon className="size-4" />
                ) : (
                  <EyeIcon className="size-4" />
                )}
              </button>
            </div>
            {errors.password ? (
              <p className="text-xs text-rose-500">{errors.password}</p>
            ) : null}
          </div>

          {isLogin ? (
            <Label className="flex items-center gap-2 text-sm text-slate-500">
              <Checkbox
                checked={remember}
                onCheckedChange={(checked) => setRemember(checked === true)}
              />
              自动登录
            </Label>
          ) : null}

          {errors.form ? (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-500">
              {errors.form}
            </div>
          ) : null}

          <Button
            className="h-12 w-full rounded-2xl bg-slate-950 text-base font-medium text-white shadow-[0_16px_32px_rgba(15,23,42,0.18)] hover:bg-slate-800"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : null}
            {isLogin ? "登录" : "注册 / 登录"}
          </Button>

          <div className="space-y-3 pt-1 text-center">
            <p className="text-xs leading-6 text-slate-400">
              {isLogin ? "登录" : "注册"}视为您已阅读并同意
              <button className="mx-1 text-sky-600 transition hover:text-sky-700" type="button">
                用户协议
              </button>
              、
              <button className="ml-1 text-sky-600 transition hover:text-sky-700" type="button">
                隐私政策
              </button>
            </p>

            <p className="text-sm text-slate-500">
              {isLogin ? "还没有账号？" : "已有账号？"}
              <button
                className="ml-1 font-medium text-slate-950 transition hover:text-sky-700"
                type="button"
                onClick={() => goTo(isLogin ? "register" : "login")}
              >
                {isLogin ? "立即注册" : "去登录"}
              </button>
            </p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
