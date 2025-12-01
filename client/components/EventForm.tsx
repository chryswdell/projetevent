// client/components/EventForm.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { INFRACTIONS } from "@/data/infractions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

export interface JudicialEvent {
  id?: number;
  numero?: number; // généré par Laravel
  date: string;
  infractions: string;
  saisine: string;
  partieCivileNoms: string;
  partieCivilePVNumero: string;
  partieCivilePVTexte: string;
  misEnCauseNoms: string;
  misEnCausePVNumero: string;
  misEnCausePVTexte: string;
  observations: string;
  resultat: string;
}

interface EventFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: JudicialEvent) => void;
  initialData?: JudicialEvent | null;
}

// A compléter avec la vraie liste d'infractions depuis ton document
// const INFRACTIONS_OPTIONS: string[] = [
//   "Vol simple",
//   "Vol qualifié",
//   "Coups et blessures volontaires",
//   "Homicide volontaire",
//   "Escroquerie",
//   "Abus de confiance",
//   "Recel",
//   "Stupéfiants",
//   "Port illégal d'arme",
//   "Autre infraction",
// ];

const RESULTATS_OPTIONS: string[] = [
  "MANDAT DE DÉPÔT",
  "LIBERTÉ PROVISOIRE",
  "SOUS CONTRÔLE JUDICIAIRE",
  "CLASSE SANS SUITE",
  "DÉSISTEMENT",
];

const emptyEvent: JudicialEvent = {
  id: undefined,
  numero: undefined,
  date: "",
  infractions: "",
  saisine: "",
  partieCivileNoms: "",
  partieCivilePVNumero: "",
  partieCivilePVTexte: "",
  misEnCauseNoms: "",
  misEnCausePVNumero: "",
  misEnCausePVTexte: "",
  observations: "",
  resultat: "",
};

export default function EventForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
}: EventFormProps) {
  const [formData, setFormData] = useState<JudicialEvent>(
    initialData || emptyEvent
  );

  useEffect(() => {
    setFormData(initialData || emptyEvent);
  }, [initialData, open]);

  const handleInputChange = (field: keyof JudicialEvent, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onOpenChange(false);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0">
          <DialogTitle>
            {initialData ? "Modifier un événement" : "Nouvel événement"}
          </DialogTitle>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-1 hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {formData.numero != null && (
            <div className="space-y-2">
              <Label htmlFor="numero">Numéro (généré automatiquement)</Label>
              <Input id="numero" value={formData.numero} disabled />
            </div>
          )}

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date de l&apos;événement *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange("date", e.target.value)}
              required
            />
          </div>

          {/* Infraction (liste) */}
          <div className="space-y-2">
            <Label htmlFor="infractions">Infraction *</Label>
            <Input
              id="infractions"
              list="infractions-list"
              placeholder="Rechercher ou saisir une infraction..."
              value={formData.infractions}
              onChange={(e) => handleInputChange("infractions", e.target.value)}
              required
            />
            <datalist id="infractions-list">
              {INFRACTIONS.map((infraction) => (
                <option key={infraction} value={infraction} />
              ))}
            </datalist>
          </div>

          {/* Saisine */}
          <div className="space-y-2">
            <Label htmlFor="saisine">Saisine</Label>
            <Input
              id="saisine"
              placeholder="Par qui ou sur quelle base le dossier a été saisi"
              value={formData.saisine}
              onChange={(e) => handleInputChange("saisine", e.target.value)}
            />
          </div>

          {/* Partie civile */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-semibold text-base">Partie civile</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2 col-span-1">
                <Label htmlFor="partieCivileNoms">Identité(s)</Label>
                <Input
                  id="partieCivileNoms"
                  placeholder="Nom(s) de la partie civile"
                  value={formData.partieCivileNoms}
                  onChange={(e) =>
                    handleInputChange("partieCivileNoms", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partieCivilePVNumero">N°</Label>
                <Input
                  id="partieCivilePVNumero"
                  placeholder="Numéro du PV"
                  value={formData.partieCivilePVNumero}
                  onChange={(e) =>
                    handleInputChange("partieCivilePVNumero", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partieCivilePVTexte">Procès-verbal</Label>
                <Input
                  id="partieCivilePVTexte"
                  placeholder="Référence / résumé du PV"
                  value={formData.partieCivilePVTexte}
                  onChange={(e) =>
                    handleInputChange("partieCivilePVTexte", e.target.value)
                  }
                />
              </div>
            </div>
          </div>

          {/* Mis en cause */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-semibold text-base">Mis en cause</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2 col-span-1">
                <Label htmlFor="misEnCauseNoms">Identité(s)</Label>
                <Input
                  id="misEnCauseNoms"
                  placeholder="Nom(s) du/des mis en cause"
                  value={formData.misEnCauseNoms}
                  onChange={(e) =>
                    handleInputChange("misEnCauseNoms", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="misEnCausePVNumero">N°</Label>
                <Input
                  id="misEnCausePVNumero"
                  placeholder="Numéro du PV"
                  value={formData.misEnCausePVNumero}
                  onChange={(e) =>
                    handleInputChange("misEnCausePVNumero", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="misEnCausePVTexte">Procès-verbal</Label>
                <Input
                  id="misEnCausePVTexte"
                  placeholder="Référence / résumé du PV"
                  value={formData.misEnCausePVTexte}
                  onChange={(e) =>
                    handleInputChange("misEnCausePVTexte", e.target.value)
                  }
                />
              </div>
            </div>
          </div>

          {/* Observations */}
          <div className="border-t pt-4 space-y-2">
            <Label htmlFor="observations">Observations</Label>
            <Textarea
              id="observations"
              placeholder="Remarques supplémentaires..."
              value={formData.observations}
              onChange={(e) =>
                handleInputChange("observations", e.target.value)
              }
              rows={3}
            />
          </div>

          {/* Résultat */}
          <div className="space-y-2">
            <Label>Résultat</Label>
            <Select
              value={formData.resultat}
              onValueChange={(value) => handleInputChange("resultat", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un résultat" />
              </SelectTrigger>
              <SelectContent>
                {RESULTATS_OPTIONS.map((res) => (
                  <SelectItem key={res} value={res}>
                    {res}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 border-t pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit">
              {initialData ? "Mettre à jour" : "Créer l'événement"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
