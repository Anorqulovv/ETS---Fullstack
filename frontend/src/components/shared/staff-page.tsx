import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/shared/crud-page";
import type { Column } from "@/components/shared/data-table";
import { GenderSelect } from "@/components/shared/gender-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { NavKey } from "@/lib/roles";
import type { User } from "@/lib/api/types";

interface StaffQ {
  useList: (params?: { limit?: number; page?: number }) => {
    data?: { data: User[]; total: number };
    isLoading: boolean;
  };
  useCreate: (onDone?: () => void) => { mutate: (payload: Partial<User>) => void; isPending: boolean };
  useUpdate: (onDone?: () => void) => {
    mutate: (args: { id: number | string; payload: Partial<User> }) => void;
    isPending: boolean;
  };
  useRemove: (onDone?: () => void) => { mutate: (id: number | string) => void; isPending: boolean };
}

/**
 * Manager/Marketing/Sales/Finance accounts are all just User rows filtered by role on the
 * backend (see modules/staff/*), identical in shape — one shared page instead of four
 * near-identical copies. Each route file just plugs in its own title + hooks.
 */
export function StaffPage({
  navKey,
  title,
  description,
  q,
}: {
  navKey: NavKey;
  title: string;
  description: string;
  q: StaffQ;
}) {
  const { t } = useTranslation();

  const columns: Column<User>[] = [
    { key: "fullName", header: t("common.name"), cell: (r) => <span className="font-medium">{r.fullName}</span> },
    { key: "username", header: t("common.username"), cell: (r) => `@${r.username ?? "—"}` },
    { key: "phone", header: t("common.phone"), cell: (r) => r.phone ?? "—" },
  ];

  return (
    <CrudPage<User>
      title={title}
      description={description}
      navKey={navKey}
      columns={columns}
      useList={q.useList}
      useCreate={q.useCreate}
      useUpdate={q.useUpdate}
      useRemove={q.useRemove}
      createTitle={t("common.create")}
      validate={(row) => (!row.gender ? t("common.genderRequired") : null)}
      renderForm={(row, onChange) => (
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>{t("common.name")}</Label>
            <Input value={row?.fullName ?? ""} onChange={(e) => onChange({ fullName: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{t("common.username")}</Label>
              <Input value={row?.username ?? ""} onChange={(e) => onChange({ username: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("common.phone")}</Label>
              <Input value={row?.phone ?? ""} onChange={(e) => onChange({ phone: e.target.value })} />
            </div>
          </div>

          <GenderSelect value={row?.gender} onChange={(gender) => onChange({ gender })} />

          <div className="grid gap-1.5">
            <Label>{t("common.password")}</Label>
            <Input
              type="password"
              placeholder={row?.id ? t("common.passwordUnchangedHint") : undefined}
              value={row?.password ?? ""}
              onChange={(e) => onChange({ password: e.target.value })}
            />
            <p className="text-[11px] text-muted-foreground">
              Kamida 8 belgi, katta-kichik harf, raqam va maxsus belgi (masalan: Ab1@cdef)
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label>{t("common.salary")}</Label>
            <Input
              type="number"
              placeholder="4000000"
              value={row?.salary ?? ""}
              onChange={(e) => onChange({ salary: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
        </div>
      )}
    />
  );
}
