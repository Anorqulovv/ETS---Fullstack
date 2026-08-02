import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CircleDollarSign, Receipt, Wallet, CreditCard, Sparkles, AlertTriangle } from "lucide-react";

import { CrudPage } from "@/components/shared/crud-page";
import type { Column } from "@/components/shared/data-table";
import { PageMotion } from "@/components/shared/page-motion";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  paymentsQ,
  studentsQ,
  useChildrenPayments,
  useMyBalance,
  useMyPayments,
  usePayFull,
  usePayMonthly,
  usePayRemainder,
  usePaymentSettings,
  usePaymentsSummary,
  useSetStudentDiscount,
  useStudentBalance,
  useUpdatePaymentSettings,
} from "@/lib/api/hooks";
import type { Payment, PaymentMethod, PaymentStatus, StudentBalance } from "@/lib/api/types";
import { mockStudents } from "@/lib/api/mock-data";
import { useAuth } from "@/lib/auth-context";
import { formatMoney, useCurrency } from "@/lib/currency";

export const Route = createFileRoute("/_app/payments")({
  head: () => ({ meta: [{ title: "Payments — Edu CRM" }] }),
  component: PaymentsRoute,
});

function PaymentsRoute() {
  const { user } = useAuth();
  if (user?.role === "STUDENT") return <StudentPaymentsView />;
  if (user?.role === "PARENT") return <ParentPaymentsView />;
  return <PaymentsPage />;
}

const METHODS: PaymentMethod[] = ["CASH", "CARD", "CLICK", "PAYME", "TRANSFER"];
const STATUSES: PaymentStatus[] = ["PAID", "UNPAID", "PARTIAL"];

function paymentStatusColor(status: PaymentStatus) {
  return status === "PAID"
    ? "bg-success/15 text-success"
    : status === "PARTIAL"
      ? "bg-warning/15 text-warning-foreground"
      : "bg-destructive/15 text-destructive";
}

function nextUnpaidMonth(balance?: StudentBalance): string {
  return balance?.unpaidDueMonths?.[0] ?? balance?.remainingUnpaidMonths?.[0] ?? "";
}

/**
 * Course billing for one student: price/discount/monthly amount from their group's direction,
 * current debt, and the three ways to pay (full up front, one month, or — when 3 or fewer
 * months remain — the whole remainder at once). Also lets SUPERADMIN tune discounts.
 */
function CourseBillingPanel() {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const { user } = useAuth();
  const isSuperadmin = user?.role === "SUPERADMIN";
  const [studentId, setStudentId] = useState<string>("");
  const [month, setMonth] = useState("");
  const students = studentsQ.useList({ limit: 200 }).data?.data ?? mockStudents;

  const sid = studentId ? Number(studentId) : undefined;
  const { data: balance, isLoading } = useStudentBalance(sid);

  const payFull = usePayFull();
  const payMonthly = usePayMonthly();
  const payRemainder = usePayRemainder();

  const { data: settings } = usePaymentSettings();
  const updateSettings = useUpdatePaymentSettings();
  const setStudentDiscount = useSetStudentDiscount();
  const [globalDiscount, setGlobalDiscount] = useState("");
  const [studentFullDiscount, setStudentFullDiscount] = useState("");
  const [studentMonthlyDiscount, setStudentMonthlyDiscount] = useState("");

  const activeMonth = month || nextUnpaidMonth(balance);

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-base">{t("pages.payments.courseBilling")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-1.5">
          <Label>{t("nav.students")}</Label>
          <Select value={studentId} onValueChange={setStudentId}>
            <SelectTrigger className="w-full sm:w-72">
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

        {!sid ? null : isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : !balance?.hasCoursePricing ? (
          <p className="text-sm text-muted-foreground">
            {balance?.message ?? t("pages.payments.noCoursePricing")}
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 rounded-md border p-3 text-sm sm:grid-cols-4">
              <div>
                <div className="text-xs text-muted-foreground">{t("pages.payments.coursePrice")}</div>
                <div className="font-medium tabular-nums">
                  {format(balance.direction!.price)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t("pages.payments.monthlyPayment")}</div>
                <div className="font-medium tabular-nums">
                  {format(balance.discountedMonthlyAmount ?? 0)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t("pages.payments.fullDiscount")}</div>
                <div className="font-medium tabular-nums">{balance.fullPaymentDiscountPercent}%</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t("common.status")}</div>
                <div>
                  {balance.fullyPaid ? (
                    <Badge className="bg-success/15 text-success">{t("pages.payments.noDebt")}</Badge>
                  ) : balance.hasDebt ? (
                    <Badge className="bg-destructive/15 text-destructive">
                      {t("pages.payments.debt")}: {format(balance.debtAmount ?? 0)}
                    </Badge>
                  ) : (
                    <Badge className="bg-success/15 text-success">{t("pages.payments.noDebt")}</Badge>
                  )}
                </div>
              </div>
            </div>

            {!balance.fullyPaid ? (
              <div className="flex flex-wrap items-end gap-2">
                <Button
                  size="sm"
                  disabled={payFull.isPending}
                  onClick={() => payFull.mutate({ studentId: sid, groupId: balance.groupId ?? undefined })}
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  {t("pages.payments.payFullBtn")} ({format(balance.discountedFullPrice ?? 0)})
                </Button>

                <div className="flex items-end gap-1.5">
                  <div className="grid gap-1">
                    <Label className="text-xs">{t("common.month")}</Label>
                    <Input
                      type="month"
                      className="w-40"
                      value={activeMonth}
                      onChange={(e) => setMonth(e.target.value)}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!activeMonth || payMonthly.isPending}
                    onClick={() =>
                      sid &&
                      payMonthly.mutate({
                        studentId: sid,
                        groupId: balance.groupId ?? undefined,
                        month: activeMonth,
                      })
                    }
                  >
                    {t("pages.payments.payThisMonth")}
                  </Button>
                </div>

                {balance.canPayRemainder ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={payRemainder.isPending}
                    onClick={() =>
                      payRemainder.mutate({ studentId: sid, groupId: balance.groupId ?? undefined })
                    }
                  >
                    {t("pages.payments.payRemainderBtn", { count: balance.remainingUnpaidMonths?.length })}
                  </Button>
                ) : null}
              </div>
            ) : null}

            {isSuperadmin ? (
              <div className="space-y-2 rounded-md border border-dashed p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("pages.payments.studentDiscountTitle")}
                </p>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="grid gap-1">
                    <Label className="text-xs">{t("pages.payments.fullDiscountPercent")}</Label>
                    <Input
                      type="number"
                      className="w-36"
                      placeholder={String(balance.fullPaymentDiscountPercent ?? 10)}
                      value={studentFullDiscount}
                      onChange={(e) => setStudentFullDiscount(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">{t("pages.payments.monthlyDiscountPercent")}</Label>
                    <Input
                      type="number"
                      className="w-36"
                      placeholder={String(balance.monthlyDiscountPercent ?? 0)}
                      value={studentMonthlyDiscount}
                      onChange={(e) => setStudentMonthlyDiscount(e.target.value)}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={setStudentDiscount.isPending}
                    onClick={() =>
                      setStudentDiscount.mutate({
                        studentId: sid,
                        fullPaymentDiscountPercent: studentFullDiscount
                          ? Number(studentFullDiscount)
                          : undefined,
                        monthlyDiscountPercent: studentMonthlyDiscount
                          ? Number(studentMonthlyDiscount)
                          : undefined,
                      })
                    }
                  >
                    {t("common.save")}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {isSuperadmin ? (
          <div className="flex flex-wrap items-end gap-2 border-t pt-4">
            <div className="grid gap-1">
              <Label className="text-xs">
                {t("pages.payments.defaultDiscountLabel")}
              </Label>
              <Input
                type="number"
                className="w-56"
                placeholder={String(settings?.fullPaymentDiscountPercent ?? 10)}
                value={globalDiscount}
                onChange={(e) => setGlobalDiscount(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={!globalDiscount || updateSettings.isPending}
              onClick={() =>
                updateSettings.mutate({ fullPaymentDiscountPercent: Number(globalDiscount) })
              }
            >
              {t("pages.payments.updateDefault")}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function PaymentsPage() {
  const { t } = useTranslation();
  const { format } = useCurrency();
  // GET /payments/summary is SUPERADMIN/ADMIN only — other roles just won't see this card
  // (query silently stays empty, see usePaymentsSummary's throwOnError: false).
  const { data: summary } = usePaymentsSummary();

  const columns: Column<Payment>[] = [
    {
      key: "student",
      header: t("nav.students"),
      cell: (r) => r.studentName ?? "—",
    },
    {
      key: "amount",
      header: t("payments.amount"),
      cell: (r) => <span className="tabular-nums font-medium">{format(r.amount)}</span>,
    },
    { key: "method", header: t("payments.method"), cell: (r) => r.method },
    {
      key: "month",
      header: t("payments.month"),
      cell: (r) => <span className="font-mono text-xs">{r.month ?? "—"}</span>,
    },
    {
      key: "date",
      header: t("payments.paidAt"),
      cell: (r) => (
        <span className="font-mono text-xs">
          {r.paidAt ? new Date(r.paidAt).toLocaleDateString("uz-UZ") : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: t("common.status"),
      cell: (r) => (
        <Badge variant="secondary" className={paymentStatusColor(r.status)}>
          {t(`status.${r.status.toLowerCase()}`, r.status)}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <CourseBillingPanel />

      {summary ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className="shadow-soft">
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <CircleDollarSign className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t("payments.totalRevenue")}</div>
                <div className="text-xl font-semibold tabular-nums">{format(summary.totalAmount)}</div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t("payments.totalPayments")}</div>
                <div className="text-xl font-semibold tabular-nums">
                  {summary.totalPayments} ({summary.byStatus.PAID} {t("status.paid")})
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <CrudPage<Payment>
        title={t("pages.payments.title")}
        description={t("pages.payments.subtitle")}
        navKey="payments"
        columns={columns}
        useList={paymentsQ.useList}
        useCreate={paymentsQ.useCreate}
        useUpdate={paymentsQ.useUpdate}
        useRemove={paymentsQ.useRemove}
        createTitle={t("pages.payments.createTitle")}
        renderForm={(row, onChange) => (
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>{t("nav.students")}</Label>
              <Select
                value={row?.studentId ? String(row.studentId) : undefined}
                onValueChange={(v) => onChange({ studentId: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("common.selectPlaceholder")} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {(studentsQ.useList({ limit: 100 }).data?.data ?? mockStudents).map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>{t("payments.amount")}</Label>
                <Input
                  type="number"
                  value={row?.amount ?? 0}
                  onChange={(e) => onChange({ amount: Number(e.target.value) })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("payments.paidAt")}</Label>
                <Input
                  type="date"
                  value={row?.paidAt?.slice(0, 10) ?? ""}
                  onChange={(e) => onChange({ paidAt: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>{t("payments.method")}</Label>
                <Select
                  value={row?.method}
                  onValueChange={(v) => onChange({ method: v as PaymentMethod })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("common.selectPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {METHODS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>{t("common.status")}</Label>
                <Select
                  value={row?.status}
                  onValueChange={(v) => onChange({ status: v as PaymentStatus })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("common.selectPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`status.${s.toLowerCase()}`, s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>{t("payments.month")}</Label>
                <Input
                  type="month"
                  value={row?.month ?? ""}
                  onChange={(e) => onChange({ month: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("payments.comment")}</Label>
                <Input
                  value={row?.comment ?? ""}
                  onChange={(e) => onChange({ comment: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}
      />
    </div>
  );
}

/**
 * Student's own payment history — GET /payments/my — plus a "pay now" flow. The flow is fully
 * visual (card form, processing spinner, success screen) but never actually calls a payment
 * gateway or creates a real Payment row — this backend has no PSP integration (Click/Payme/etc.)
 * wired up yet, so a real charge isn't possible. This is an intentional demo/UI placeholder,
 * not a bug — see the note in the confirmation dialog.
 */
function StudentPaymentsView() {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const { data, isLoading } = useMyPayments();
  const { data: balance } = useMyBalance();
  const [payOpen, setPayOpen] = useState(false);
  const rows = data ?? [];

  const totalPaid = rows.filter((r) => r.status === "PAID").reduce((s, r) => s + Number(r.amount), 0);
  const totalUnpaid = rows
    .filter((r) => r.status === "UNPAID" || r.status === "PARTIAL")
    .reduce((s, r) => s + Number(r.amount), 0);

  return (
    <PageMotion>
      <div className="space-y-5">
        <PageHeader
          title={t("pages.payments.title")}
          description={t("pages.payments.studentSubtitle")}
          actions={
            <Button onClick={() => setPayOpen(true)}>
              <CreditCard className="mr-1.5 h-4 w-4" />
              {t("pages.payments.pay")}
            </Button>
          }
        />

        {balance?.hasCoursePricing ? (
          <Card className="shadow-soft">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
              <div>
                <div className="text-xs text-muted-foreground">{t("pages.payments.courseStatus")}</div>
                <div className="text-sm text-muted-foreground">
                  {t("pages.payments.monthlyPayment")}: {format(balance.discountedMonthlyAmount ?? 0)} · {t("pages.payments.fullDiscount")}:{" "}
                  {balance.fullPaymentDiscountPercent}%
                </div>
              </div>
              {balance.fullyPaid ? (
                <Badge className="bg-success/15 text-success">{t("pages.payments.noDebt")}</Badge>
              ) : balance.hasDebt ? (
                <Badge className="flex items-center gap-1 bg-destructive/15 text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {t("pages.payments.debt")}: {format(balance.debtAmount ?? 0)}
                </Badge>
              ) : (
                <Badge className="bg-success/15 text-success">{t("pages.payments.noDebt")}</Badge>
              )}
            </CardContent>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className="shadow-soft">
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-success/10 text-success">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">To'langan</div>
                <div className="text-xl font-semibold tabular-nums">{format(totalPaid)}</div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Qarzdorlik</div>
                <div className="text-xl font-semibold tabular-nums">{format(totalUnpaid)}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : rows.length === 0 ? (
          <EmptyState title={t("common.empty")} description="Hali to'lovlar mavjud emas." />
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <th className="p-3 font-medium">{t("payments.amount")}</th>
                  <th className="p-3 font-medium">{t("payments.method")}</th>
                  <th className="p-3 font-medium">{t("payments.month")}</th>
                  <th className="p-3 font-medium">{t("payments.paidAt")}</th>
                  <th className="p-3 font-medium">{t("common.status")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="p-3 font-medium tabular-nums">{format(p.amount)}</td>
                    <td className="p-3 text-muted-foreground">{p.method}</td>
                    <td className="p-3 font-mono text-xs">{p.month ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">
                      {p.paidAt ? new Date(p.paidAt).toLocaleDateString("uz-UZ") : "—"}
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary" className={paymentStatusColor(p.status)}>
                        {t(`status.${p.status.toLowerCase()}`, p.status)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <FakePaymentDialog open={payOpen} onOpenChange={setPayOpen} />
    </PageMotion>
  );
}

/** Read-only view of a parent's children's payments — GET /payments/children. */
function ParentPaymentsView() {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const { data, isLoading } = useChildrenPayments();
  const rows = data ?? [];

  return (
    <PageMotion>
      <div className="space-y-5">
        <PageHeader title={t("pages.payments.title")} description="Farzandingiz to'lovlari" />

        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : rows.length === 0 ? (
          <EmptyState title={t("common.empty")} description="Hali to'lovlar mavjud emas." />
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <th className="p-3 font-medium">{t("nav.students")}</th>
                  <th className="p-3 font-medium">{t("payments.amount")}</th>
                  <th className="p-3 font-medium">{t("payments.month")}</th>
                  <th className="p-3 font-medium">{t("common.status")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">
                      {p.studentName ?? p.student?.user?.fullName ?? "—"}
                    </td>
                    <td className="p-3 tabular-nums">{format(p.amount)}</td>
                    <td className="p-3 font-mono text-xs">{p.month ?? "—"}</td>
                    <td className="p-3">
                      <Badge variant="secondary" className={paymentStatusColor(p.status)}>
                        {t(`status.${p.status.toLowerCase()}`, p.status)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageMotion>
  );
}

type PayPhase = "form" | "processing" | "done";

/**
 * Purely visual "pay now" flow — card number/expiry/CVC + a processing spinner + a success
 * screen. Deliberately does NOT call any API: this backend has no payment-gateway integration,
 * so there is nothing to actually charge. Wire this up to Click/Payme/Stripe/etc. once one
 * exists — until then this exists to show the intended UX, not to move real money.
 */
function FakePaymentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<PayPhase>("form");
  const [amount, setAmount] = useState("");
  const [card, setCard] = useState("");

  const reset = () => {
    setPhase("form");
    setAmount("");
    setCard("");
  };

  const handlePay = () => {
    setPhase("processing");
    setTimeout(() => setPhase("done"), 1400);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("pages.payments.pay")}</DialogTitle>
        </DialogHeader>

        {phase === "form" ? (
          <div className="space-y-4">
            <div className="grid gap-1.5">
              <Label>{t("common.amount")}</Label>
              <Input
                type="number"
                placeholder="500000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("pages.payments.cardNumber")}</Label>
              <Input
                placeholder="8600 0000 0000 0000"
                value={card}
                onChange={(e) => setCard(e.target.value)}
                maxLength={19}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>{t("pages.payments.expiry")}</Label>
                <Input placeholder="12/28" maxLength={5} />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("pages.payments.cvc")}</Label>
                <Input placeholder="•••" maxLength={3} />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t("pages.payments.demoDisclaimer")}
            </p>
            <DialogFooter>
              <Button className="w-full" disabled={!amount || !card} onClick={handlePay}>
                {t("pages.payments.payLabel")}
              </Button>
            </DialogFooter>
          </div>
        ) : phase === "processing" ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">{t("pages.payments.processing")}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-warning/10 text-warning-foreground">
              <Receipt className="h-7 w-7" />
            </div>
            <div>
              <p className="font-medium">{t("pages.payments.demoMode")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("pages.payments.demoDetail")}
              </p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              {t("common.close")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
