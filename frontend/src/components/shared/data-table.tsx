import { useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, ArrowUpDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableSkeleton } from "./table-skeleton";
import { EmptyState } from "./empty-state";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  /** Ustun sarlavhasiga bosib saralash yoqiladi (joriy sahifadagi qatorlar bo'yicha). */
  sortable?: boolean;
  /** Saralash uchun taqqoslanadigan qiymat — berilmasa, `cell()` natijasi matn sifatida ishlatiladi. */
  sortValue?: (row: T) => string | number | null | undefined;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  total: number;
  page: number;
  limit: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  rowActions?: (row: T) => ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  keyOf?: (row: T) => string | number;
}

export function DataTable<T extends { id?: string | number }>({
  columns,
  rows,
  total,
  page,
  limit,
  loading,
  onPageChange,
  onLimitChange,
  onEdit,
  onDelete,
  rowActions,
  emptyTitle,
  emptyDescription,
  keyOf,
}: DataTableProps<T>) {
  const { t } = useTranslation();
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasActions = Boolean(onEdit || onDelete || rowActions);

  // Saralash faqat joriy sahifadagi qatorlar bo'yicha ishlaydi (backend butun
  // ma'lumotlar to'plamini emas, faqat shu sahifani qaytaradi). Ustun sarlavhasiga
  // bosilganda: yo'q -> o'sish -> kamayish -> yo'q tartibida almashadi.
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function toggleSort(col: Column<T>) {
    if (!col.sortable) return;
    if (sortKey !== col.key) {
      setSortKey(col.key);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortKey(null);
    }
  }

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return rows;
    const valueOf = (row: T): string | number => {
      const raw = col.sortValue ? col.sortValue(row) : (col.cell(row) as unknown);
      if (raw == null) return "";
      if (typeof raw === "number") return raw;
      return String(raw).toLowerCase();
    };
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = valueOf(a);
      const bv = valueOf(b);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [rows, columns, sortKey, sortDir]);

  return (
    <div className="rounded-xl border bg-card shadow-soft">
      <div className="scrollbar-thin overflow-x-auto">
        {loading ? (
          <TableSkeleton cols={columns.length + (hasActions ? 1 : 0)} />
        ) : rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={emptyTitle ?? t("common.empty")}
              description={emptyDescription ?? t("common.emptyDesc")}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {columns.map((c) => (
                  <TableHead key={c.key} className={c.className}>
                    {c.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c)}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        {c.header}
                        {sortKey === c.key ? (
                          sortDir === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                        )}
                      </button>
                    ) : (
                      c.header
                    )}
                  </TableHead>
                ))}
                {hasActions ? (
                  <TableHead className="w-[60px] text-right">{t("common.actions")}</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence initial={false}>
                {sortedRows.map((row, i) => (
                  <motion.tr
                    key={keyOf ? keyOf(row) : (row.id ?? i)}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18, delay: i * 0.015 }}
                    className="border-b transition-colors hover:bg-surface"
                  >
                    {columns.map((c) => (
                      <TableCell key={c.key} className={c.className}>
                        {c.cell(row)}
                      </TableCell>
                    ))}
                    {hasActions ? (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">{t("common.openMenu")}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {rowActions ? rowActions(row) : null}
                            {onEdit ? (
                              <DropdownMenuItem onClick={() => onEdit(row)}>
                                <Pencil className="mr-2 h-4 w-4" /> {t("common.edit")}
                              </DropdownMenuItem>
                            ) : null}
                            {onDelete ? (
                              <>
                                {rowActions || onEdit ? <DropdownMenuSeparator /> : null}
                                <DropdownMenuItem
                                  onClick={() => onDelete(row)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> {t("common.delete")}
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    ) : null}
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 sm:flex-row">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{t("common.rowsPerPage")}</span>
          <Select value={String(limit)} onValueChange={(v) => onLimitChange(Number(v))}>
            <SelectTrigger className="h-8 w-[72px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            {t("common.page")} {page} {t("common.of")} {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            {t("common.previous")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            {t("common.next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
