import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { BellOff, Check, CheckCheck, Send } from "lucide-react";

import { PageMotion } from "@/components/shared/page-motion";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  groupsQ,
  useBroadcastNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useMyNotifications,
  type NotificationAudience,
} from "@/lib/api/hooks";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_app/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Edu CRM" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canBroadcast = user?.role === "SUPERADMIN" || user?.role === "ADMIN";
  const { data, isLoading } = useMyNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const [composeOpen, setComposeOpen] = useState(false);

  const items = data ?? [];
  const hasUnread = items.some((n) => !n.isRead);

  return (
    <PageMotion>
      <div className="space-y-5">
        <PageHeader
          title={t("pages.notifications.title")}
          description={t("pages.notifications.subtitle")}
          actions={
            <div className="flex items-center gap-2">
              {hasUnread ? (
                <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()}>
                  <CheckCheck className="mr-1.5 h-4 w-4" />
                  {t("pages.notifications.markAllRead")}
                </Button>
              ) : null}
              {canBroadcast ? (
                <Button size="sm" onClick={() => setComposeOpen(true)}>
                  <Send className="mr-1.5 h-4 w-4" />
                  {t("pages.notifications.compose")}
                </Button>
              ) : null}
            </div>
          }
        />

        {isLoading ? (
          <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
        ) : items.length === 0 ? (
          <Card className="shadow-soft">
            <CardContent className="flex flex-col items-center gap-2 py-14 text-center text-muted-foreground">
              <BellOff className="h-8 w-8" />
              <p className="text-sm">{t("pages.notifications.empty")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {items.map((n) => (
              <Card
                key={n.id}
                className={"shadow-soft transition-colors " + (n.isRead ? "" : "bg-primary/5")}
              >
                <CardContent className="flex items-start justify-between gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{n.title}</span>
                      <Badge variant="secondary">{n.type}</Badge>
                      {!n.isRead ? (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                    {n.createdAt ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                  {!n.isRead ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markRead.mutate(n.id)}
                      className="shrink-0"
                    >
                      <Check className="mr-1.5 h-4 w-4" />
                      {t("pages.notifications.markRead")}
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {canBroadcast ? <ComposeDialog open={composeOpen} onOpenChange={setComposeOpen} /> : null}
    </PageMotion>
  );
}

function ComposeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useTranslation();
  const broadcast = useBroadcastNotification();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<NotificationAudience>("ALL");
  const [groupId, setGroupId] = useState<string>("");
  // Only fetches while this dialog's parent is mounted for a broadcasting role — not while closed
  // and not for roles that can't broadcast, since NotificationsPage only renders ComposeDialog at
  // all when canBroadcast is true.
  const groups = groupsQ.useList({ limit: 100 }).data?.data ?? [];

  const AUDIENCE_LABELS: Record<NotificationAudience, string> = {
    ALL: t("pages.notifications.audienceAll"),
    STUDENTS: t("pages.notifications.audienceStudents"),
    PARENTS: t("pages.notifications.audienceParents"),
    TEACHERS: t("pages.notifications.audienceTeachers"),
    GROUP: t("pages.notifications.audienceGroup"),
  };

  const reset = () => {
    setTitle("");
    setMessage("");
    setAudience("ALL");
    setGroupId("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("pages.notifications.compose")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>{t("pages.notifications.formTitle")}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("pages.notifications.formTitlePlaceholder")}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>{t("pages.notifications.formMessage")}</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder={t("pages.notifications.formMessagePlaceholder")}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>{t("pages.notifications.audience")}</Label>
            <Select value={audience} onValueChange={(v) => setAudience(v as NotificationAudience)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(AUDIENCE_LABELS) as NotificationAudience[]).map((a) => (
                  <SelectItem key={a} value={a}>
                    {AUDIENCE_LABELS[a]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {audience === "GROUP" ? (
            <div className="grid gap-1.5">
              <Label>{t("nav.groups")}</Label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("pages.notifications.selectGroup")} />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            className="w-full"
            disabled={
              !title || !message || (audience === "GROUP" && !groupId) || broadcast.isPending
            }
            onClick={() =>
              broadcast.mutate(
                {
                  title,
                  message,
                  audience,
                  groupId: audience === "GROUP" ? Number(groupId) : undefined,
                },
                { onSuccess: () => onOpenChange(false) },
              )
            }
          >
            <Send className="mr-1.5 h-4 w-4" />
            {t("pages.notifications.send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
