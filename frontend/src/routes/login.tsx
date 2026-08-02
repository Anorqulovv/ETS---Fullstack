import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Loader2, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import type { Role } from "@/lib/roles";
import type { Gender } from "@/lib/api/types";
import { api } from "@/lib/api/client";
import { readStoredToken, readStoredUser } from "@/lib/auth-storage";
import { toast } from "sonner";
import axios from "axios";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Edu CRM" },
      { name: "description", content: "Sign in to Edu CRM to manage your organization." },
    ],
  }),
  // Already-authenticated users (valid token still in storage) skip the form.
  // The real verification of that token happens once in the app shell via
  // GET /auth/me — this is just a cheap "don't show the form" pre-check.
  beforeLoad: () => {
    if (readStoredToken() && readStoredUser()) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const schema = z.object({
    username: z.string().min(2, t("validation.min", { n: 2 })),
    password: z.string().min(4, t("validation.min", { n: 4 })),
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      // Real login against the Edu-backend NestJS API. Response shape is
      // `{ statusCode, message, data: { token: { accessToken, refreshToken }, user } }`
      // (see AuthService.signIn in the backend) — token is nested one level deeper
      // than most APIs and is itself an object, not a bare string.
      //
      // The role ALWAYS comes from `user.role` in this response — never from
      // anything the person typed or picked on this form. There is no "login
      // as" role picker here on purpose: the backend is the only source of
      // truth for what a given account is allowed to do.
      const { data } = await api.post("/auth/login", {
        username: values.username,
        password: values.password,
      });

      const accessToken: string | undefined = data?.data?.token?.accessToken;
      const refreshToken: string | undefined = data?.data?.token?.refreshToken;
      const rawUser = data?.data?.user;

      if (!accessToken || !rawUser?.role) {
        throw new Error("Login response did not include a token and role");
      }

      login(
        {
          id: rawUser.id,
          fullName: rawUser.fullName ?? values.username,
          username: rawUser.username ?? values.username,
          phone: rawUser.phone,
          role: rawUser.role as Role,
          gender: rawUser.gender as Gender | undefined,
          avatar: rawUser.avatar as string | undefined,
          grantedRoles: (rawUser.grantedRoles as Role[] | undefined) ?? [],
          salary: rawUser.salary as number | undefined,
        },
        accessToken,
        refreshToken,
        rememberMe,
      );
      toast.success(t("auth.loginButton"));
      void navigate({ to: "/dashboard" });
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (() => {
            const raw = (error.response?.data as { message?: string | string[] } | undefined)
              ?.message;
            return Array.isArray(raw) ? raw.join(", ") : raw;
          })()
        : undefined;
      toast.error(message ?? "Login failed. Please check your username and password.");
    }
  });

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Left brand panel */}
      <div
        className="relative hidden overflow-hidden bg-surface-2 lg:block"
        style={{
          backgroundImage: "url(/branding/login-bg.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative flex h-full flex-col p-10">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-white shadow-soft">
              <img src="/branding/ets-logo.png" alt="" className="h-full w-full object-contain p-1" />
            </div>
            <div className="text-sm font-semibold tracking-tight text-white">{t("app.name")}</div>
          </div>
          <div className="mt-auto max-w-md">
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              {t("app.tagline")}
            </h1>
            <p className="mt-3 text-sm text-white/80">
              A modern, opinionated CRM for schools and learning centers. Built for staff, teachers
              and students.
            </p>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center px-6 py-10">
        <div className="absolute right-4 top-4 flex items-center gap-1">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-sm"
        >
          <div className="mb-6">
            <h2 className="text-xl font-semibold tracking-tight">{t("auth.loginTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("auth.loginSubtitle")}</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">{t("auth.usernameOrPhone")}</Label>
              <Input id="username" autoComplete="username" {...form.register("username")} />
              {form.formState.errors.username ? (
                <p className="text-xs text-destructive">{form.formState.errors.username.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t("common.password")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="pr-10"
                  {...form.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? t("common.hidePassword") : t("common.showPassword")}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password ? (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              ) : null}
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={rememberMe}
                onCheckedChange={(v) => setRememberMe(v === true)}
              />
              {t("auth.rememberMe", "Meni eslab qol")}
            </label>
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t("auth.loginButton")}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
