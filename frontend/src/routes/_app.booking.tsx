import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  CalendarClock,
  Clock,
  Plus,
  Trash2,
  User2,
  CalendarCheck2,
  X,
  Sunrise,
  Sun,
  Sunset,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { PageMotion } from "@/components/shared/page-motion";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useSupportAvailability,
  useCreateAvailability,
  useRemoveAvailability,
  useAvailableSupports,
  useFreeSlots,
  useCreateBooking,
  useMyBookings,
  useCancelBooking,
} from "@/lib/api/hooks";
import type { SupportAvailability, SupportBooking } from "@/lib/api/types";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_app/booking")({
  head: () => ({ meta: [{ title: "Support bandlik — Edu CRM" }] }),
  component: BookingRoute,
});

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function initials(name?: string) {
  return name?.split(" ").map((s) => s[0]).slice(0, 2).join("") ?? "—";
}
function formatDay(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("uz-UZ", { day: "2-digit", month: "long" });
}
function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);
}

// Har bir ism uchun barqaror (har doim bir xil) rangli halqa -- bir xil odam har doim bir
// xil rangda ko'rinadi, ro'yxat professional va farqlanadigan ko'rinishga ega bo'ladi.
const AVATAR_TONES = [
  "bg-blue-500/10 text-blue-600",
  "bg-violet-500/10 text-violet-600",
  "bg-emerald-500/10 text-emerald-600",
  "bg-amber-500/10 text-amber-600",
  "bg-rose-500/10 text-rose-600",
  "bg-cyan-500/10 text-cyan-600",
];
function avatarTone(seed: number) {
  return AVATAR_TONES[Math.abs(seed) % AVATAR_TONES.length];
}

const TIME_OPTIONS = Array.from({ length: (22 - 7) * 2 + 1 }, (_, i) => {
  const total = 7 * 60 + i * 30;
  const h = String(Math.floor(total / 60)).padStart(2, "0");
  const m = String(total % 60).padStart(2, "0");
  return `${h}:${m}`;
});

const QUICK_TEMPLATES = [
  { label: "Ertalab", start: "09:00", end: "11:00" },
  { label: "Tushdan keyin", start: "14:00", end: "16:00" },
  { label: "Kechqurun", start: "17:00", end: "19:00" },
];

function DateStrip({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, []);

  return (
    <div className="scrollbar-thin flex gap-2 overflow-x-auto pb-1">
      {days.map((d, i) => {
        const dateStr = d.toISOString().slice(0, 10);
        const isSelected = dateStr === value;
        const isToday = i === 0;
        return (
          <button
            key={dateStr}
            type="button"
            onClick={() => onChange(dateStr)}
            className={`flex shrink-0 flex-col items-center gap-0.5 rounded-xl border px-3.5 py-2.5 transition-all ${
              isSelected
                ? "border-primary bg-primary text-primary-foreground shadow-elevated"
                : "hover:border-primary/40 hover:bg-accent"
            }`}
          >
            <span className={`text-[10px] font-medium uppercase tracking-wide ${isSelected ? "opacity-90" : "text-muted-foreground"}`}>
              {isToday ? "Bugun" : d.toLocaleDateString("uz-UZ", { weekday: "short" })}
            </span>
            <span className="text-lg font-semibold tabular-nums leading-none">{d.getDate()}</span>
            <span className={`text-[10px] ${isSelected ? "opacity-90" : "text-muted-foreground"}`}>
              {d.toLocaleDateString("uz-UZ", { month: "short" })}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string | number; tone: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-soft"
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-xl font-semibold tabular-nums">{value}</div>
      </div>
    </motion.div>
  );
}

/** Ro'yxat/karta shaklidagi kontent yuklanayotganda ko'rsatiladigan skeleton -- oddiy
 * "Yuklanmoqda..." matnidan ko'ra ancha professional ko'rinadi. */
function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-3 rounded-xl border p-3">
          <div className="h-9 w-9 shrink-0 rounded-lg bg-muted" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-1/3 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function WindowTimeline({ window: w, bookings }: { window: SupportAvailability; bookings: SupportBooking[] }) {
  const total = toMinutes(w.endTime) - toMinutes(w.startTime);
  if (total <= 0) return null;
  const relevant = bookings.filter(
    (b) => b.date === w.date && overlaps(b.startTime, b.endTime, w.startTime, w.endTime),
  );
  return (
    <div className="relative mt-2 h-2 w-full overflow-hidden rounded-full bg-success/15">
      {relevant.map((b) => {
        const left = Math.max(0, ((toMinutes(b.startTime) - toMinutes(w.startTime)) / total) * 100);
        const width = Math.min(100 - left, ((toMinutes(b.endTime) - toMinutes(b.startTime)) / total) * 100);
        return (
          <div
            key={b.id}
            className="absolute top-0 h-full bg-destructive/70"
            style={{ left: `${left}%`, width: `${width}%` }}
          />
        );
      })}
    </div>
  );
}

function BookingRoute() {
  const { user } = useAuth();
  return user?.role === "SUPPORT" ? <SupportView /> : <StudentView />;
}

/* ==================== SUPPORT: bo'sh vaqt belgilash ==================== */

function SupportView() {
  const { data: windows, isLoading } = useSupportAvailability();
  const { data: bookings } = useMyBookings();
  const createAvailability = useCreateAvailability();
  const removeAvailability = useRemoveAvailability();
  const cancelBooking = useCancelBooking();

  const [date, setDate] = useState(todayStr());
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("16:00");
  const [windowToDelete, setWindowToDelete] = useState<SupportAvailability | null>(null);
  const [bookingToCancel, setBookingToCancel] = useState<SupportBooking | null>(null);

  const endOptions = TIME_OPTIONS.filter((t) => toMinutes(t) > toMinutes(startTime));

  function handleStartChange(next: string) {
    setStartTime(next);
    if (toMinutes(endTime) <= toMinutes(next)) {
      const firstValid = TIME_OPTIONS.find((t) => toMinutes(t) > toMinutes(next));
      if (firstValid) setEndTime(firstValid);
    }
  }

  function handleCreate() {
    const sameDay = (windows ?? []).filter((w) => w.date === date);
    const conflict = sameDay.find((w) => overlaps(w.startTime, w.endTime, startTime, endTime));
    if (conflict) {
      toast.error(`Bu vaqt ${conflict.startTime}–${conflict.endTime} oynasi bilan mos kelmaydi`);
      return;
    }
    createAvailability.mutate({ date, startTime, endTime });
  }

  const totalOpenHours = (windows ?? []).reduce(
    (sum, w) => sum + (toMinutes(w.endTime) - toMinutes(w.startTime)) / 60,
    0,
  );
  const upcomingBookings = (bookings ?? []).filter((b) => b.date >= todayStr());
  const totalBookedHours = upcomingBookings.reduce((sum, b) => sum + b.durationMinutes / 60, 0);

  const windowsByDate = useMemo(() => {
    const map = new Map<string, SupportAvailability[]>();
    for (const w of windows ?? []) {
      const arr = map.get(w.date) ?? [];
      arr.push(w);
      map.set(w.date, arr);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1));
  }, [windows]);

  // Keyingi 7 kunlik "ochiq soat" vs "band soat" taqqoslash grafigi -- support bir qarashda
  // qaysi kunlar to'lib borayotganini ko'radi.
  const weeklyChart = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
    return days.map((d) => {
      const dayWindows = (windows ?? []).filter((w) => w.date === d);
      const dayBookings = (bookings ?? []).filter((b) => b.date === d);
      const open = dayWindows.reduce((s, w) => s + (toMinutes(w.endTime) - toMinutes(w.startTime)) / 60, 0);
      const booked = dayBookings.reduce((s, b) => s + b.durationMinutes / 60, 0);
      return {
        label: new Date(`${d}T00:00:00`).toLocaleDateString("uz-UZ", { weekday: "short" }),
        Ochiq: Math.max(0, open - booked),
        Band: booked,
      };
    });
  }, [windows, bookings]);

  return (
    <PageMotion>
      <div className="space-y-5">
        <PageHeader title="Bo'sh vaqtlarim" description="O'quvchilar band qilishi uchun vaqt oynalarini oching" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MiniStat icon={Clock} label="Ochiq soatlar" value={`${totalOpenHours} soat`} tone="bg-primary/10 text-primary" />
          <MiniStat icon={CalendarCheck2} label="Bandliklar" value={upcomingBookings.length} tone="bg-success/10 text-success" />
          <MiniStat icon={CalendarClock} label="Vaqt oynalari" value={windows?.length ?? 0} tone="bg-orange-500/10 text-orange-500" />
        </div>

        <Card className="shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4 text-primary" />
              Haftalik yuklanish
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeklyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="Band" stackId="a" fill="var(--color-destructive)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Ochiq" stackId="a" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4 text-primary" />
              Yangi vaqt oynasi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-1.5">
              <Label className="text-xs">Sana</Label>
              <DateStrip value={date} onChange={setDate} />
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr,1fr,auto] sm:items-end">
              <div className="grid gap-1.5">
                <Label className="text-xs">Boshlanish</Label>
                <Select value={startTime} onValueChange={handleStartChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {TIME_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Tugash</Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {endOptions.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button disabled={createAvailability.isPending || !endOptions.length} onClick={handleCreate}>
                <Plus className="mr-1.5 h-4 w-4" />
                Qo'shish
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t pt-3">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                Tezkor shablonlar:
              </span>
              {QUICK_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() => {
                    setStartTime(tpl.start);
                    setEndTime(tpl.end);
                  }}
                  className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                >
                  {tpl.label} ({tpl.start}–{tpl.end})
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarClock className="h-4 w-4 text-primary" />
                Ochiq vaqt oynalari
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ListSkeleton />
              ) : !windowsByDate.length ? (
                <div className="rounded-xl border border-dashed p-8 text-center">
                  <CalendarClock className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Hozircha vaqt oynasi yo'q</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {windowsByDate.map(([d, dayWindows]) => (
                    <div key={d}>
                      <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {formatDay(d)}
                      </div>
                      <div className="space-y-2">
                        <AnimatePresence initial={false}>
                          {dayWindows.map((w) => (
                            <motion.div
                              key={w.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, height: 0 }}
                              className="rounded-xl border bg-card p-3 transition-colors hover:bg-surface"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <Clock className="h-4 w-4" />
                                  </div>
                                  <div className="text-sm font-medium">
                                    {w.startTime} — {w.endTime}
                                  </div>
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-muted-foreground hover:text-destructive"
                                  onClick={() => setWindowToDelete(w)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <WindowTimeline window={w} bookings={bookings ?? []} />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarCheck2 className="h-4 w-4 text-success" />
                Band qilingan uchrashuvlar
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!bookings?.length ? (
                <div className="rounded-xl border border-dashed p-8 text-center">
                  <User2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Hozircha bandlik yo'q</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {bookings.map((b) => (
                      <motion.div
                        key={b.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center justify-between rounded-xl border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className={`text-[11px] font-medium ${avatarTone(b.studentId)}`}>
                              {initials(b.student?.user?.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium">{b.student?.user?.fullName ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDay(b.date)} · {b.startTime}—{b.endTime}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{b.durationMinutes} daq</Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => setBookingToCancel(b)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(windowToDelete)}
        onOpenChange={(v) => !v && setWindowToDelete(null)}
        title="Vaqt oynasini o'chirish?"
        description="Bu amalni ortga qaytarib bo'lmaydi."
        loading={removeAvailability.isPending}
        onConfirm={() => {
          if (windowToDelete) removeAvailability.mutate(windowToDelete.id);
          setWindowToDelete(null);
        }}
      />
      <ConfirmDialog
        open={Boolean(bookingToCancel)}
        onOpenChange={(v) => !v && setBookingToCancel(null)}
        title="Bandlikni bekor qilish?"
        description="O'quvchiga bandlik bekor qilingani haqida bildirishnoma yuborilmaydi."
        loading={cancelBooking.isPending}
        onConfirm={() => {
          if (bookingToCancel) cancelBooking.mutate(bookingToCancel.id);
          setBookingToCancel(null);
        }}
      />
    </PageMotion>
  );
}

/* ==================== O'QUVCHI: band qilish ==================== */

const TIME_GROUPS = [
  { key: "morning", label: "Ertalab", icon: Sunrise, from: 0, to: 12 * 60 },
  { key: "afternoon", label: "Kunduzi", icon: Sun, from: 12 * 60, to: 17 * 60 },
  { key: "evening", label: "Kechqurun", icon: Sunset, from: 17 * 60, to: 24 * 60 },
];

function StudentView() {
  const [date, setDate] = useState(todayStr());
  const [selectedSupport, setSelectedSupport] = useState<number | null>(null);
  const [duration, setDuration] = useState<30 | 60>(30);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookingToCancel, setBookingToCancel] = useState<SupportBooking | null>(null);

  const { data: supports, isLoading } = useAvailableSupports(date);
  const { data: slots } = useFreeSlots(selectedSupport ?? undefined, date);
  const { data: myBookings } = useMyBookings();
  const cancelBooking = useCancelBooking();
  const createBooking = useCreateBooking(() => setSelectedSlot(null));

  function isSlotSelectable(startTime: string): boolean {
    if (duration === 30) return true;
    const nextMin = toMinutes(startTime) + 30;
    const nextStr = `${String(Math.floor(nextMin / 60)).padStart(2, "0")}:${String(nextMin % 60).padStart(2, "0")}`;
    return (slots ?? []).some((s) => s.startTime === nextStr);
  }

  const groupedSlots = TIME_GROUPS.map((g) => ({
    ...g,
    slots: (slots ?? []).filter((s) => toMinutes(s.startTime) >= g.from && toMinutes(s.startTime) < g.to),
  })).filter((g) => g.slots.length > 0);

  const selectedSupportInfo = supports?.find((s) => s.supportId === selectedSupport);
  const upcomingBookings = (myBookings ?? []).filter((b) => b.date >= todayStr());

  return (
    <PageMotion>
      <div className="space-y-5">
        <PageHeader
          title="Support bilan uchrashuv"
          description="Bo'sh vaqtni tanlab, yordamchi ustoz bilan uchrashuvni band qiling"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <MiniStat icon={CalendarCheck2} label="Rejalashtirilgan uchrashuvlar" value={upcomingBookings.length} tone="bg-success/10 text-success" />
          <MiniStat icon={User2} label="Bugun bo'sh ustozlar" value={supports?.length ?? 0} tone="bg-primary/10 text-primary" />
        </div>

        <Card className="shadow-soft">
          <CardContent className="space-y-4 py-4">
            <div className="grid gap-1.5">
              <Label className="text-xs">Sana</Label>
              <DateStrip
                value={date}
                onChange={(d) => {
                  setDate(d);
                  setSelectedSupport(null);
                  setSelectedSlot(null);
                }}
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Davomiyligi</Label>
              <div className="flex gap-1.5">
                {([30, 60] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDuration(d);
                      setSelectedSlot(null);
                    }}
                    className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-all sm:flex-none ${
                      duration === d
                        ? "border-primary bg-primary text-primary-foreground shadow-soft"
                        : "text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {d === 30 ? "30 daqiqa" : "1 soat"}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User2 className="h-4 w-4 text-primary" />
                Bo'sh ustozlar
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ListSkeleton rows={4} />
              ) : !supports?.length ? (
                <div className="rounded-xl border border-dashed p-8 text-center">
                  <User2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Bu kunda bo'sh ustoz yo'q</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {supports.map((s) => (
                    <motion.button
                      key={s.supportId}
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedSupport(s.supportId);
                        setSelectedSlot(null);
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                        selectedSupport === s.supportId
                          ? "border-primary bg-primary/5 shadow-elevated"
                          : "hover:bg-surface"
                      }`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className={`text-xs font-medium ${avatarTone(s.supportId)}`}>
                          {initials(s.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{s.fullName}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {s.windows.map((w) => `${w.startTime}—${w.endTime}`).join(", ")}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-primary" />
                Bo'sh vaqtlar
                {selectedSupportInfo ? (
                  <span className="ml-1 font-normal text-muted-foreground">— {selectedSupportInfo.fullName}</span>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedSupport ? (
                <div className="rounded-xl border border-dashed p-10 text-center">
                  <Clock className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Avval chapdan ustozni tanlang</p>
                </div>
              ) : !slots?.length ? (
                <div className="rounded-xl border border-dashed p-10 text-center">
                  <Clock className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Bo'sh vaqt qolmagan</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedSlots.map((group) => (
                    <div key={group.key}>
                      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <group.icon className="h-3.5 w-3.5" />
                        {group.label}
                      </div>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                        {group.slots.map((slot) => {
                          const selectable = isSlotSelectable(slot.startTime);
                          const isSelected = selectedSlot === slot.startTime;
                          return (
                            <motion.button
                              key={slot.startTime}
                              type="button"
                              whileTap={selectable ? { scale: 0.95 } : undefined}
                              disabled={!selectable}
                              onClick={() => setSelectedSlot(slot.startTime)}
                              className={`rounded-lg border py-2.5 text-sm font-medium tabular-nums transition-all ${
                                isSelected
                                  ? "border-primary bg-primary text-primary-foreground shadow-soft"
                                  : selectable
                                    ? "hover:border-primary/40 hover:bg-accent"
                                    : "cursor-not-allowed opacity-30"
                              }`}
                            >
                              {slot.startTime}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  <AnimatePresence>
                    {selectedSlot ? (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="flex items-center justify-between rounded-xl border bg-primary/5 p-4"
                      >
                        <div className="flex items-center gap-3 text-sm">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <CalendarCheck2 className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {formatDay(date)} · {selectedSlot}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {selectedSupportInfo?.fullName} bilan {duration === 30 ? "30 daqiqa" : "1 soat"}
                            </div>
                          </div>
                        </div>
                        <Button
                          disabled={createBooking.isPending}
                          onClick={() =>
                            createBooking.mutate({
                              supportId: selectedSupport,
                              date,
                              startTime: selectedSlot,
                              durationMinutes: duration,
                            })
                          }
                        >
                          <CalendarCheck2 className="mr-1.5 h-4 w-4" />
                          Tasdiqlash
                        </Button>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarCheck2 className="h-4 w-4 text-success" />
              Mening uchrashuvlarim
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!myBookings?.length ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <CalendarCheck2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Hozircha bandlik yo'q</p>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence initial={false}>
                  {myBookings.map((b) => (
                    <motion.div
                      key={b.id}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      className="flex items-center justify-between rounded-xl border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className={`text-[11px] font-medium ${avatarTone(b.supportId)}`}>
                            {initials(b.support?.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium">{b.support?.fullName ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDay(b.date)} · {b.startTime}—{b.endTime}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setBookingToCancel(b)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(bookingToCancel)}
        onOpenChange={(v) => !v && setBookingToCancel(null)}
        title="Uchrashuvni bekor qilish?"
        description="Bu vaqt boshqa o'quvchilar uchun qayta bo'shab qoladi."
        loading={cancelBooking.isPending}
        onConfirm={() => {
          if (bookingToCancel) cancelBooking.mutate(bookingToCancel.id);
          setBookingToCancel(null);
        }}
      />
    </PageMotion>
  );
}
