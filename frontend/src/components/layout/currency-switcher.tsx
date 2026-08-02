import { Banknote } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCIES, useCurrency } from "@/lib/currency";

export function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();

  return (
    <Select value={currency} onValueChange={(v) => setCurrency(v as typeof currency)}>
      <SelectTrigger className="h-9 w-[84px] gap-1.5 border-none bg-transparent px-2 shadow-none hover:bg-accent">
        <Banknote className="h-4 w-4 shrink-0" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {CURRENCIES.map((c) => (
          <SelectItem key={c} value={c}>
            {c}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
