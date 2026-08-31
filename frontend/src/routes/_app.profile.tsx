import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Camera, Trash2 } from "lucide-react";

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
import { getAvatarUrl } from "@/lib/avatar";
import { AvatarCropDialog } from "@/components/shared/avatar-crop-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [viewLargeOpen, setViewLargeOpen] = useState(false);

  const initials =
    user?.fullName
      ?.split(" ")
      .map((s) => s[0])
      .slice(0, 2)
      .join("") || "EC";

  const wantsPasswordChange = Boolean(oldPassword || newPassword || confirmPassword);

  // Backend @IsStrongPassword talabi bilan bir xil: kamida 8 belgi, katta va kichik
  // harf, raqam hamda maxsus belgi. Foydalanuvchi "Saqlash"ni bosishidan oldin shu
  // yerda ko'rsatib, keraksiz server xatoligini oldini olamiz.
  const STRONG_PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
  const isNewPasswordStrong = !newPassword || STRONG_PASSWORD_RE.test(newPassword);

  function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setCropOpen(true);
    };
    reader.onerror = () => toast.error(t("pages.profile.uploadFailed"));
    reader.readAsDataURL(file);
  }

  function handleCropped(dataUrl: string) {
    setAvatarUploading(true);
    updateProfile.mutate(
      { avatar: dataUrl },
      {
        onSuccess: (fresh) => {
          updateUser({ avatar: fresh?.avatar ?? dataUrl });
          toast.success(t("toast.updated"));
        },
        onError: () => toast.error(t("pages.profile.uploadFailed")),
        onSettled: () => setAvatarUploading(false),
      },
    );
  }

  function handleAvatarDelete() {
    if (!user?.avatar) return;
    updateProfile.mutate(
      { avatar: null },
      {
        onSuccess: (fresh) => {
          updateUser({ avatar: fresh?.avatar ?? null });
          toast.success(t("toast.updated"));
        },
      },
    );
  }

  function handleSave() {
    if (wantsPasswordChange && newPassword !== confirmPassword) {
      toast.error(t("pages.profile.confirmPassword") + " ≠ " + t("pages.profile.newPassword"));
      return;
    }

    if (wantsPasswordChange && !isNewPasswordStrong) {
      toast.error(
        "Yangi parol kuchli bo'lishi kerak: kamida 8 belgi, katta-kichik harf, raqam va maxsus belgi (masalan: Ab1@cdef)",
      );
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
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => user?.avatar && setViewLargeOpen(true)}
                className="block rounded-full ring-2 ring-transparent transition-shadow hover:ring-primary/30"
                aria-label="Rasmni kattaroq ko'rish"
              >
                <Avatar className="h-16 w-16">
                  <AvatarImage src={getAvatarUrl(user)} alt={user?.fullName} />
                  <AvatarFallback className="bg-primary/10 text-lg font-medium text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                  aria-label={t("pages.profile.uploadPhoto")}
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
                {user?.avatar ? (
                  <button
                    type="button"
                    onClick={handleAvatarDelete}
                    disabled={avatarUploading || updateProfile.isPending}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50"
                    aria-label={t("pages.profile.deletePhoto")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
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
                    aria-invalid={!isNewPasswordStrong}
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
              <p
                className={`text-[11px] ${
                  newPassword && !isNewPasswordStrong ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                {t("pages.profile.passwordStrengthHint")}
              </p>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={updateProfile.isPending}>
                {updateProfile.isPending ? t("pages.profile.saving") : t("common.save")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <AvatarCropDialog
        imageSrc={cropSrc}
        open={cropOpen}
        onOpenChange={setCropOpen}
        onCropped={handleCropped}
      />

      <Dialog open={viewLargeOpen} onOpenChange={setViewLargeOpen}>
        <DialogContent className="flex items-center justify-center border-none bg-transparent p-0 shadow-none sm:max-w-lg">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user?.fullName}
              className="max-h-[80vh] w-full rounded-lg object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </PageMotion>
  );
}
