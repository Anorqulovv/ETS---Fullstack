import type { ReactNode } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface FilterBarProps {
  search: string;
  onSearch: (v: string) => void;
  filters?: ReactNode;
  activeFilterCount?: number;
  onClear?: () => void;
  rightSlot?: ReactNode;
}

export function FilterBar({
  search,
  onSearch,
  filters,
  activeFilterCount = 0,
  onClear,
  rightSlot,
}: FilterBarProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={t("common.searchPlaceholder")}
          className="h-9 pl-9"
        />
      </div>
      <div className="flex items-center gap-2">
        {filters ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                {t("common.filters")}
                {activeFilterCount > 0 ? (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                    {activeFilterCount}
                  </Badge>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[320px] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-medium">{t("common.filters")}</div>
                {onClear && activeFilterCount > 0 ? (
                  <Button variant="ghost" size="sm" className="h-7" onClick={onClear}>
                    <X className="mr-1 h-3.5 w-3.5" /> {t("common.clear")}
                  </Button>
                ) : null}
              </div>
              <div className="space-y-3">{filters}</div>
            </PopoverContent>
          </Popover>
        ) : null}
        {rightSlot}
      </div>
    </div>
  );
}
