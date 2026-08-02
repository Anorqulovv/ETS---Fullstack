import { useTranslation } from "react-i18next";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Gender } from "@/lib/api/types";

export function GenderSelect({
  value,
  onChange,
}: {
  value?: Gender;
  onChange: (v: Gender) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-1.5">
      <Label>
        {t("common.gender")} <span className="text-destructive">*</span>
      </Label>
      <Select value={value ?? ""} onValueChange={(v) => onChange(v as Gender)}>
        <SelectTrigger>
          <SelectValue placeholder={t("common.gender")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="MALE">{t("common.male")}</SelectItem>
          <SelectItem value="FEMALE">{t("common.female")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
