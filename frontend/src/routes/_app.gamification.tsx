import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Trophy, Medal, Gift, Plus, Trash2, ShoppingBag } from "lucide-react";

import { PageMotion } from "@/components/shared/page-motion";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  studentsQ,
  groupsQ,
  useAwardPoints,
  useCreateShopItem,
  useDeleteShopItem,
  useLeaderboard,
  useMyPoints,
  usePurchaseShopItem,
  useShopItems,
} from "@/lib/api/hooks";
import { mockStudents } from "@/lib/api/mock-data";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_app/gamification")({
  head: () => ({ meta: [{ title: "Gamification — Edu CRM" }] }),
  component: GamificationPage,
});

const MEDAL_COLORS = ["text-yellow-500", "text-zinc-400", "text-amber-700"];
const CAN_AWARD_ROLES = ["SUPERADMIN", "ADMIN", "TEACHER"];
const CAN_MANAGE_SHOP_ROLES = ["SUPERADMIN", "ADMIN"];

function AwardPointsCard() {
  const { t } = useTranslation();
  const [studentId, setStudentId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const students = studentsQ.useList({ limit: 200 }).data?.data ?? mockStudents;
  const award = useAwardPoints();

  function handleAward() {
    if (!studentId || !amount) return;
    award.mutate(
      { studentId: Number(studentId), amount: Number(amount), note: note || undefined },
      { onSuccess: () => { setAmount(""); setNote(""); } },
    );
  }

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-base">{t("pages.gamification.awardTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr,120px,1fr,auto] sm:items-end">
          <div className="grid gap-1.5">
            <Label className="text-xs">{t("nav.students")}</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger>
                <SelectValue placeholder={t("common.selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {students.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">{t("pages.gamification.points")}</Label>
            <Input type="number" placeholder="+10" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">{t("pages.gamification.reasonOptional")}</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("pages.gamification.reasonPlaceholder")} />
          </div>
          <Button onClick={handleAward} disabled={!studentId || !amount || award.isPending}>
            {t("common.add")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("pages.gamification.negativeHint")}
        </p>
      </CardContent>
    </Card>
  );
}

function ShopSection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isStudent = user?.role === "STUDENT";
  const canManage = CAN_MANAGE_SHOP_ROLES.includes(user?.role ?? "");
  const { data: items, isLoading } = useShopItems(canManage);
  const purchase = usePurchaseShopItem();
  const createItem = useCreateShopItem();
  const deleteItem = useDeleteShopItem();

  const [name, setName] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");

  function handleCreate() {
    if (!name || !cost) return;
    createItem.mutate(
      {
        name,
        cost: Number(cost),
        stock: stock ? Number(stock) : undefined,
        description: description || undefined,
      },
      {
        onSuccess: () => {
          setName("");
          setCost("");
          setStock("");
          setDescription("");
        },
      },
    );
  }

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShoppingBag className="h-4 w-4" />
          {t("pages.gamification.shopTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("pages.gamification.loading")}</p>
        ) : !items?.length ? (
          <p className="text-sm text-muted-foreground">{t("pages.gamification.noItems")}</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div key={item.id} className="flex flex-col gap-2 rounded-md border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{item.name}</div>
                    {item.description ? (
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    ) : null}
                  </div>
                  {!item.isActive ? <Badge variant="secondary">{t("pages.gamification.inactive")}</Badge> : null}
                </div>
                <div className="flex items-center justify-between">
                  <Badge className="flex items-center gap-1 bg-primary/10 text-primary">
                    <Gift className="h-3 w-3" />
                    {item.cost} {t("pages.gamification.pointsUnit")}
                  </Badge>
                  {item.stock != null ? (
                    <span className="text-xs text-muted-foreground">{t("pages.gamification.left")}: {item.stock}</span>
                  ) : null}
                </div>
                {isStudent ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={purchase.isPending || (item.stock != null && item.stock <= 0)}
                    onClick={() => purchase.mutate(item.id)}
                  >
                    {t("pages.gamification.buy")}
                  </Button>
                ) : null}
                {canManage ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    disabled={deleteItem.isPending}
                    onClick={() => deleteItem.mutate(item.id)}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    {t("common.delete")}
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {canManage ? (
          <div className="space-y-2 rounded-md border border-dashed p-3">
            <p className="text-xs font-medium text-muted-foreground">{t("pages.gamification.addNewItem")}</p>
            <div className="grid gap-2 sm:grid-cols-4">
              <Input placeholder={t("pages.gamification.itemName")} value={name} onChange={(e) => setName(e.target.value)} />
              <Input
                type="number"
                placeholder={t("pages.gamification.itemCost")}
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
              <Input
                type="number"
                placeholder={t("pages.gamification.itemStock")}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
              <Button onClick={handleCreate} disabled={!name || !cost || createItem.isPending}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {t("common.add")}
              </Button>
            </div>
            <Textarea
              placeholder={t("pages.gamification.itemDescription")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function GamificationPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isStudent = user?.role === "STUDENT";
  const canAward = CAN_AWARD_ROLES.includes(user?.role ?? "");
  const [groupId, setGroupId] = useState<string>("");
  const groups = groupsQ.useList({ limit: 200 }).data?.data ?? [];

  const { data: myPoints, isLoading: myPointsLoading } = useMyPoints();
  const { data: leaderboard, isLoading: leaderboardLoading } = useLeaderboard(
    groupId ? Number(groupId) : undefined,
    20,
  );

  return (
    <PageMotion>
      <div className="space-y-5">
        <PageHeader
          title={t("pages.gamification.title")}
          description={t("pages.gamification.subtitle")}
        />

        {isStudent ? (
          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{t("pages.gamification.myPoints")}</CardTitle>
              <div className="flex items-center gap-1.5 text-2xl font-semibold tabular-nums">
                <Trophy className="h-5 w-5 text-yellow-500" />
                {myPointsLoading ? "…" : (myPoints?.points ?? 0)}
              </div>
            </CardHeader>
            {myPoints?.logs?.length ? (
              <CardContent className="space-y-2 pt-0">
                {myPoints.logs.slice(0, 8).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between border-b border-border/50 py-2 text-sm last:border-0"
                  >
                    <div>
                      <span className="font-medium">
                        {log.source === "ATTENDANCE" ? t("nav.attendance") : t("pages.tests.title")}
                      </span>
                      {log.note ? (
                        <span className="ml-2 text-muted-foreground">{log.note}</span>
                      ) : null}
                    </div>
                    <span className={"tabular-nums " + (log.amount >= 0 ? "text-success" : "text-destructive")}>
                      {log.amount >= 0 ? "+" : ""}
                      {log.amount}
                    </span>
                  </div>
                ))}
              </CardContent>
            ) : null}
          </Card>
        ) : null}

        {canAward ? <AwardPointsCard /> : null}

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-base">{t("pages.gamification.leaderboard")}</CardTitle>
            <Select value={groupId || "all"} onValueChange={(v) => setGroupId(v === "all" ? "" : v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t("nav.groups")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {leaderboardLoading ? (
              <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
            ) : !leaderboard?.length ? (
              <p className="text-sm text-muted-foreground">{t("common.empty")}</p>
            ) : (
              <div className="space-y-1">
                {leaderboard.map((entry) => (
                  <div
                    key={entry.studentId}
                    className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted/50"
                  >
                    <div className="flex w-8 items-center justify-center">
                      {entry.rank <= 3 ? (
                        <Medal className={"h-4 w-4 " + MEDAL_COLORS[entry.rank - 1]} />
                      ) : (
                        <span className="text-xs text-muted-foreground">{entry.rank}</span>
                      )}
                    </div>
                    <span className="flex-1 truncate font-medium">{entry.fullName}</span>
                    <Badge variant="secondary" className="tabular-nums">
                      {entry.points}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <ShopSection />
      </div>
    </PageMotion>
  );
}
