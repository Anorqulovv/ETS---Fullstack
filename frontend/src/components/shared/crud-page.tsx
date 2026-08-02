import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PageHeader } from "./page-header";
import { FilterBar } from "./filter-bar";
import { DataTable, type Column } from "./data-table";
import { FormDialog } from "./form-dialog";
import { ConfirmDialog } from "./confirm-dialog";
import { PageMotion } from "./page-motion";
import type { Paginated, ListParams } from "@/lib/api/client";
import { useAuth, useCurrentRole } from "@/lib/auth-context";
import { effectiveCanDelete, effectiveCanMutate, type NavKey } from "@/lib/roles";

interface CrudPageProps<T> {
  title: string;
  description?: string;
  navKey: NavKey;
  columns: Column<T>[];
  useList: (params: ListParams) => { data?: Paginated<T>; isLoading: boolean };
  useCreate: (onDone?: () => void) => { mutate: (v: Partial<T>) => void; isPending: boolean };
  useUpdate: (onDone?: () => void) => {
    mutate: (v: { id: number | string; payload: Partial<T> }) => void;
    isPending: boolean;
  };
  useRemove: (onDone?: () => void) => { mutate: (id: number | string) => void; isPending: boolean };
  renderForm: (
    initial: Partial<T> | null,
    onChange: (patch: Partial<T>) => void,
  ) => React.ReactNode;
  filters?: React.ReactNode;
  activeFilterCount?: number;
  onClearFilters?: () => void;
  extraListParams?: Record<string, unknown>;
  createTitle?: string;
  editTitle?: string;
  emptyTitle?: string;
  keyOf?: (row: T) => string | number;
  dialogSize?: "sm" | "md" | "lg";
  /** Client-side check run right before create/update — return an error message to block the
   * save (shown as a toast), or null/undefined when the form is fine. */
  validate?: (row: Partial<T>) => string | null | undefined;
}

export function CrudPage<T extends { id?: string | number }>({
  title,
  description,
  navKey,
  columns,
  useList,
  useCreate,
  useUpdate,
  useRemove,
  renderForm,
  filters,
  activeFilterCount,
  onClearFilters,
  extraListParams,
  createTitle,
  editTitle,
  emptyTitle,
  keyOf,
  dialogSize,
  validate,
}: CrudPageProps<T>) {
  const { t } = useTranslation();
  const role = useCurrentRole();
  const { user } = useAuth();
  const allowed = effectiveCanMutate(role, navKey, user?.grantedRoles ?? []);
  const deleteAllowed = effectiveCanDelete(role, navKey, user?.grantedRoles ?? []);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [formState, setFormState] = useState<Partial<T>>({});
  const [toDelete, setToDelete] = useState<T | null>(null);

  const listParams = useMemo(
    () => ({ page, limit, search, ...(extraListParams ?? {}) }),
    [page, limit, search, extraListParams],
  );

  const { data, isLoading } = useList(listParams);

  const create = useCreate(() => {
    setDialogOpen(false);
    setFormState({});
  });
  const update = useUpdate(() => {
    setDialogOpen(false);
    setEditing(null);
    setFormState({});
  });
  const remove = useRemove(() => setToDelete(null));

  const openCreate = () => {
    setEditing(null);
    setFormState({});
    setDialogOpen(true);
  };
  const openEdit = (row: T) => {
    setEditing(row);
    setFormState(row);
    setDialogOpen(true);
  };

  const submit = () => {
    const error = validate?.(formState);
    if (error) {
      toast.error(error);
      return;
    }
    if (editing && editing.id != null) {
      update.mutate({ id: editing.id, payload: formState });
    } else {
      create.mutate(formState);
    }
  };

  return (
    <PageMotion>
      <div className="space-y-5">
        <PageHeader
          title={title}
          description={description}
          actions={
            allowed ? (
              <Button onClick={openCreate}>
                <Plus className="mr-1.5 h-4 w-4" />
                {t("common.create")}
              </Button>
            ) : null
          }
        />

        <FilterBar
          search={search}
          onSearch={(v) => {
            setPage(1);
            setSearch(v);
          }}
          filters={filters}
          activeFilterCount={activeFilterCount}
          onClear={onClearFilters}
        />

        <DataTable<T>
          columns={columns}
          rows={data?.data ?? []}
          total={data?.total ?? 0}
          page={page}
          limit={limit}
          loading={isLoading}
          onPageChange={setPage}
          onLimitChange={(n) => {
            setLimit(n);
            setPage(1);
          }}
          onEdit={allowed ? openEdit : undefined}
          onDelete={deleteAllowed ? (row) => setToDelete(row) : undefined}
          emptyTitle={emptyTitle}
          keyOf={keyOf}
        />

        <FormDialog
          open={dialogOpen}
          onOpenChange={(v) => {
            setDialogOpen(v);
            if (!v) {
              setEditing(null);
              setFormState({});
            }
          }}
          title={editing ? (editTitle ?? t("common.edit")) : (createTitle ?? t("common.create"))}
          loading={create.isPending || update.isPending}
          onSubmit={submit}
          size={dialogSize}
        >
          {renderForm(formState, (patch) =>
            setFormState((prev) => ({ ...prev, ...patch })),
          )}
        </FormDialog>

        <ConfirmDialog
          open={Boolean(toDelete)}
          onOpenChange={(v) => !v && setToDelete(null)}
          title={t("common.delete") + "?"}
          description={t("common.emptyDesc")}
          loading={remove.isPending}
          onConfirm={() => {
            if (toDelete?.id != null) remove.mutate(toDelete.id);
          }}
        />
      </div>
    </PageMotion>
  );
}
