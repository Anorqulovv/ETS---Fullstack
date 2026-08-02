import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Camera } from "lucide-react";

import { PageMotion } from "@/components/shared/page-motion";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth-context";
import { useUpdateProfile } from "@/lib/api/hooks";
import { fileToAvatarDataUrl, getAvatarUrl } from "@/lib/avatar";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profile — Edu CRM" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const updateProfile = useUpdateProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Faqat SUPERADMIN/ADMIN o'z ismi va telefonini shu yerdan o'zgartira oladi — backend
  // boshqa rollar uchun bu ikkalasini e'tiborsiz qoldiradi (AuthService.updateProfile).
  const canEditNameAndPhone = user?.role === "SUPERADMIN" || user?.role === "ADMIN";

  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);

  const initials =
    user?.fullName
      ?.split(" ")
      .map((s) => s[0])
      .slice(0, 2)
      .join("") || "EC";

  const wantsPasswordChange = Boolean(oldPassword || newPassword || confirmPassword);

  async function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarUploading(true);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      updateProfile.mutate(
        { avatar: dataUrl },
        {
          onSuccess: (fresh) => {
            updateUser({ avatar: fresh?.avatar ?? dataUrl });
            toast.success(t("toast.updated"));
          },
        },
      );
    } catch {
      toast.error(t("pages.profile.uploadFailed"));
    } finally {
      setAvatarUploading(false);
    }
  }

  function handleSave() {
    if (wantsPasswordChange && newPassword !== confirmPassword) {
      toast.error(t("pages.profile.confirmPassword") + " ≠ " + t("pages.profile.newPassword"));
      return;
    }

    const payload: Parameters<typeof updateProfile.mutate>[0] = {};
    if (username && username !== user?.username) payload.username = username;
    if (canEditNameAndPhone) {
      if (fullName && fullName !== user?.fullName) payload.fullName = fullName;
      if (phone && phone !== user?.phone) payload.phone = phone;
    }
    if (wantsPasswordChange) {
      payload.oldPassword = oldPassword;
      payload.newPassword = newPassword;
      payload.confirmPassword = confirmPassword;
    }

    if (Object.keys(payload).length === 0) {
      toast.success(t("toast.updated"));
      return;
    }

    updateProfile.mutate(payload, {
      onSuccess: (fresh) => {
        updateUser({
          username: fresh?.username ?? username,
          ...(canEditNameAndPhone ? { fullName: fresh?.fullName ?? fullName, phone: fresh?.phone ?? phone } : {}),
        });
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        toast.success(t("toast.updated"));
      },
    });
  }

  return (
    <PageMotion>
      <div className="space-y-6">
        <PageHeader title={t("pages.profile.title")} description={t("pages.profile.subtitle")} />

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="group relative">
              <Avatar className="h-16 w-16">
                <AvatarImage src={getAvatarUrl(user)} alt={user?.fullName} />
                <AvatarFallback className="bg-primary/10 text-lg font-medium text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label={t("pages.profile.uploadPhoto")}
              >
                <Camera className="h-5 w-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarPick}
              />
            </div>
            <div>
              <CardTitle className="text-lg">{user?.fullName}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                @{user?.username}
                {user?.role ? <Badge variant="secondary">{t(`roles.${user.role}`)}</Badge> : null}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>{t("common.name")}</Label>
                <Input
                  value={canEditNameAndPhone ? fullName : (user?.fullName ?? "")}
                  disabled={!canEditNameAndPhone}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("common.phone")}</Label>
                <Input
                  value={canEditNameAndPhone ? phone : (user?.phone ?? "")}
                  disabled={!canEditNameAndPhone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label>{t("common.username")}</Label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              {!canEditNameAndPhone ? (
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  {t("pages.profile.readOnlyNote")}
                </p>
              ) : null}
            </div>

            <Separator />

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium">{t("pages.profile.changePassword")}</h3>
                <p className="text-xs text-muted-foreground">{t("pages.profile.passwordHint")}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-1.5">
                  <Label>{t("pages.profile.currentPassword")}</Label>
                  <Input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>{t("pages.profile.newPassword")}</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>{t("pages.profile.confirmPassword")}</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={updateProfile.isPending}>
                {updateProfile.isPending ? t("pages.profile.saving") : t("common.save")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageMotion>
  );
}
