// client/components/MultiInfractionsSelect.tsx
import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";

type Props = {
  options: string[];
  value: string[];                 // sélection courante
  onChange: (v: string[]) => void; // setter
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
};

export function MultiInfractionsSelect({
  options,
  value,
  onChange,
  placeholder = "Sélectionner une ou plusieurs infractions…",
  disabled,
  error,
}: Props) {
  const [open, setOpen] = React.useState(false);

  const toggle = (item: string) => {
    if (value.includes(item)) {
      onChange(value.filter((v) => v !== item));
    } else {
      onChange([...value, item]);
    }
  };

  const remove = (item: string) => {
    onChange(value.filter((v) => v !== item));
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-between",
              error && "border-destructive focus-visible:ring-destructive"
            )}
          >
            <span className={cn("truncate", value.length === 0 && "text-muted-foreground")}>
              {value.length === 0 ? placeholder : `${value.length} infraction(s) sélectionnée(s)`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-60" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Rechercher…" />
            <CommandEmpty>Aucune infraction trouvée.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {options.map((opt) => {
                const selected = value.includes(opt);
                return (
                  <CommandItem
                    key={opt}
                    value={opt}
                    onSelect={() => toggle(opt)}
                    className="flex items-center justify-between"
                  >
                    <span className="mr-2">{opt}</span>
                    <Check className={cn("h-4 w-4", selected ? "opacity-100" : "opacity-0")} />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((v) => (
            <Badge key={v} variant="secondary" className="gap-1 pr-1">
              <span className="max-w-[260px] truncate">{v}</span>
              <button
                type="button"
                onClick={() => remove(v)}
                className="rounded-sm hover:bg-muted p-0.5"
                aria-label={`Retirer ${v}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
