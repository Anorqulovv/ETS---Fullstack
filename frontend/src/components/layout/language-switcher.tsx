import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LANG_LABELS, SUPPORTED_LANGS, type SupportedLang } from "@/i18n";
import { toast } from "sonner";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage as SupportedLang) || "uz";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Languages className="h-4 w-4" />
          <span className="hidden sm:inline text-xs font-medium uppercase">{current}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{t("common.language")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SUPPORTED_LANGS.map((lng) => (
          <DropdownMenuItem
            key={lng}
            onClick={() => {
              void i18n.changeLanguage(lng);
              try {
                localStorage.setItem("edu-crm-lang", lng);
                document.cookie = `edu-crm-lang=${lng}; path=/; max-age=${60 * 60 * 24 * 365}`;
              } catch {
                // ignore storage errors (private browsing, etc.)
              }
              toast.success(t("toast.languageChanged"));
            }}
            className={current === lng ? "bg-accent" : ""}
          >
            <span className="mr-2 text-xs font-medium uppercase text-muted-foreground">{lng}</span>
            {LANG_LABELS[lng]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
