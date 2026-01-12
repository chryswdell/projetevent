// client/components/EventForm.tsx
import React, { useEffect, useMemo, useState } from "react";
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
import {
  X,
  Image as ImageIcon,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { MultiInfractionsSelect } from "@/components/MultiInfractionsSelect";

export interface JudicialEvent {
  id?: number;
  numero?: number;
  date: string;
  infractions: string; // backend attend string
  saisine: string;
  partieCivileNoms: string;
  partieCivilePVNumero: string;
  partieCivilePVTexte: string;
  misEnCauseNoms: string;
  misEnCausePVNumero: string;
  misEnCausePVTexte: string;
  observations: string;
  resultat: string;
  photoUrl?: string;
  photoFile?: File | null;
}

interface EventFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: JudicialEvent) => void | Promise<void>;
  initialData?: JudicialEvent | null;
}

const RESULTATS_OPTIONS: string[] = [
  "MANDAT DE DÉPÔT",
  "LIBERTÉ PROVISOIRE",
  "SOUS CONTRÔLE JUDICIAIRE",
  "CLASSE SANS SUITE",
  "DÉSISTEMENT",
];

const MAX_IMAGE_MB = 5;
const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;

// ===== INFRACTIONS HELPERS (string <-> array) =====
const INFRACTIONS_SEPARATOR = ";";

function parseInfractions(str: string | undefined | null) {
  if (!str) return [];
  return str
    .split(INFRACTIONS_SEPARATOR)
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatInfractions(list: string[]) {
  return list.join(`${INFRACTIONS_SEPARATOR} `);
}

// ===== ZOD SCHEMA =====
// NB: on n'utilise plus "infractions" comme champ input text,
// donc on le retire du schema ou on le garde optionnel.
// Ici on le retire pour éviter la validation inutile.
const schema = z.object({
  date: z.string().min(1, "La date est obligatoire."),

  saisine: z.string().min(1, "La saisine est obligatoire."),

  partieCivileNoms: z.string().min(1, "Champ obligatoire."),
  partieCivilePVNumero: z.string().min(1, "Champ obligatoire."),
  partieCivilePVTexte: z.string().min(1, "Champ obligatoire."),

  misEnCauseNoms: z.string().min(1, "Champ obligatoire."),
  misEnCausePVNumero: z.string().min(1, "Champ obligatoire."),
  misEnCausePVTexte: z.string().min(1, "Champ obligatoire."),

  // OPTIONNELS (comme demandé)
  observations: z.string().optional(),
  resultat: z.string().optional(),

  photoFile: z
    .any()
    .optional()
    .refine((file) => file == null || file instanceof File, "Fichier invalide.")
    .refine(
      (file) => file == null || file.size <= MAX_IMAGE_BYTES,
      `La photo ne doit pas dépasser ${MAX_IMAGE_MB} MB.`
    )
    .refine(
      (file) =>
        file == null ||
        ["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(file.type),
      "Formats acceptés : JPG, PNG, WEBP."
    ),
});


type FormValues = z.infer<typeof schema>;

function Section({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border bg-background p-4 md:p-5", className)}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description ? (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground mt-1">{children}</p>;
}

function RequiredMark() {
  return <span className="text-destructive"> *</span>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

export default function EventForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
}: EventFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [showPVDetails, setShowPVDetails] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // ===== multi infractions state =====
  const [infractionsSelected, setInfractionsSelected] = useState<string[]>(
    parseInfractions(initialData?.infractions ?? "")
  );
  const [infractionsError, setInfractionsError] = useState<string | null>(null);

  const defaultValues: FormValues = {
    date: initialData?.date ?? "",
    saisine: initialData?.saisine ?? "",
    partieCivileNoms: initialData?.partieCivileNoms ?? "",
    partieCivilePVNumero: initialData?.partieCivilePVNumero ?? "",
    partieCivilePVTexte: initialData?.partieCivilePVTexte ?? "",
    misEnCauseNoms: initialData?.misEnCauseNoms ?? "",
    misEnCausePVNumero: initialData?.misEnCausePVNumero ?? "",
    misEnCausePVTexte: initialData?.misEnCausePVTexte ?? "",
    observations: initialData?.observations ?? "",
    resultat: initialData?.resultat ?? "",
    photoFile: null,
  };

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
    setFocus,
    setValue,
    clearErrors,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onSubmit",
  });

  const photoFile = watch("photoFile") as File | null | undefined;

  const previewUrl = useMemo(() => {
    if (!photoFile) return null;
    return URL.createObjectURL(photoFile);
  }, [photoFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    reset(defaultValues);
    setSubmitting(false);
    setShowPVDetails(true);
    setFormError(null);
    setInfractionsError(null);
    setInfractionsSelected(parseInfractions(initialData?.infractions ?? ""));
    clearErrors();
  }, [open, initialData, reset, clearErrors]); // eslint-disable-line react-hooks/exhaustive-deps

  const title = initialData ? "Modifier un événement" : "Nouvel événement";

  const removeSelectedFile = () => {
    setValue("photoFile", null, { shouldValidate: true });
  };

  const onInvalid = () => {
    setFormError("Certains champs obligatoires sont manquants. Vérifie les champs en rouge.");

    // priorité au champ date si erreur, sinon focus sur premier champ en erreur
    const firstErrorKey = Object.keys(errors)[0] as keyof FormValues | undefined;
    if (firstErrorKey) setFocus(firstErrorKey);
  };

  const onValid = async (values: FormValues) => {
    setFormError(null);

    // ✅ Validation multi-infractions (obligatoire)
    if (infractionsSelected.length === 0) {
      setInfractionsError("Sélectionne au moins une infraction.");
      setFormError("Certains champs obligatoires sont manquants. Vérifie les champs en rouge.");
      // petit scroll/focus UX: on met le focus sur la section (pas de vrai input)
      // => on focus la date si elle existe, sinon rien
      return;
    } else {
      setInfractionsError(null);
    }

    if (submitting) return;
    setSubmitting(true);

    const payload: JudicialEvent = {
      id: initialData?.id,
      numero: initialData?.numero,
      date: values.date,
      infractions: formatInfractions(infractionsSelected), // ✅ convert array -> string
      saisine: values.saisine ?? "",
      partieCivileNoms: values.partieCivileNoms ?? "",
      partieCivilePVNumero: values.partieCivilePVNumero ?? "",
      partieCivilePVTexte: values.partieCivilePVTexte ?? "",
      misEnCauseNoms: values.misEnCauseNoms ?? "",
      misEnCausePVNumero: values.misEnCausePVNumero ?? "",
      misEnCausePVTexte: values.misEnCausePVTexte ?? "",
      observations: values.observations ?? "",
      resultat: values.resultat ?? "",
      photoUrl: initialData?.photoUrl,
      photoFile: (values.photoFile as File | null) ?? null,
    };

    try {
      await Promise.resolve(onSubmit(payload));
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 py-4 border-b">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-base md:text-lg">{title}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Les champs obligatoires sont marqués <span className="text-destructive">*</span>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full p-2 hover:bg-muted transition"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </DialogHeader>

        {/* Body scrollable */}
        <div className="max-h-[75vh] overflow-y-auto px-5 py-4">
          <form
            onSubmit={handleSubmit(onValid, onInvalid)}
            className="space-y-4"
            noValidate
          >
            {/* Erreur globale */}
            {formError ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-destructive">Formulaire incomplet</p>
                  <p className="text-xs text-muted-foreground mt-1">{formError}</p>
                </div>
              </div>
            ) : null}

            {/* Numéro auto */}
            {initialData?.numero != null && (
              <Section title="Référence" description="Numéro généré automatiquement par le système.">
                <div className="space-y-2 max-w-sm">
                  <Label htmlFor="numero">Numéro</Label>
                  <Input id="numero" value={initialData.numero} disabled />
                </div>
              </Section>
            )}

            {/* Infos générales */}
            <Section title="Informations générales" description="Informations principales de l’événement.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date */}
                <div className="space-y-2">
                  <Label htmlFor="date">
                    Date de l’événement<RequiredMark />
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    {...register("date")}
                    aria-invalid={!!errors.date}
                    className={cn(errors.date && "border-destructive focus-visible:ring-destructive")}
                  />
                  <FieldError message={errors.date?.message} />
                </div>

                {/* ✅ Infractions MULTI */}
                <div className="space-y-2">
                  <Label>
                    Infraction(s)<RequiredMark />
                  </Label>

                  <MultiInfractionsSelect
                    options={INFRACTIONS}
                    value={infractionsSelected}
                    onChange={(v) => {
                      setInfractionsSelected(v);
                      if (v.length > 0) setInfractionsError(null);
                    }}
                    placeholder="Sélectionner une ou plusieurs infractions…"
                    error={!!infractionsError}
                  />

                  <FieldError message={infractionsError ?? undefined} />
                  <FieldHint>
                    Tu peux sélectionner plusieurs infractions. Clique sur une chip pour la retirer.
                  </FieldHint>
                </div>

                {/* Saisine */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="saisine">Saisine <RequiredMark /></Label>
                  <Input
                    id="saisine"
                    placeholder="Ex: plainte, signalement, réquisition, flagrant délit…"
                    {...register("saisine")}
                  />
                  <FieldHint>Indique l’origine ou la base de la saisine.</FieldHint>
                </div>
              </div>
            </Section>

            {/* Photo */}
            <Section title="Pièce jointe" description="Ajoute une photo si nécessaire (facultatif).">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="photo">Photo</Label>
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setValue("photoFile", file, { shouldValidate: true });
                    }}
                    aria-invalid={!!errors.photoFile}
                    className={cn(errors.photoFile && "border-destructive focus-visible:ring-destructive")}
                  />
                  <FieldError message={errors.photoFile?.message as string | undefined} />
                  {initialData?.photoUrl && !photoFile ? (
                    <p className="text-xs text-muted-foreground">
                      Une photo est déjà enregistrée. Tu peux en sélectionner une nouvelle pour la remplacer.
                    </p>
                  ) : null}
                  <FieldHint>Formats: JPG/PNG/WEBP — max {MAX_IMAGE_MB}MB.</FieldHint>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium">Aperçu</p>
                    {photoFile ? (
                      <button
                        type="button"
                        onClick={removeSelectedFile}
                        className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"
                      >
                        <Trash2 className="w-3 h-3" />
                        Retirer
                      </button>
                    ) : null}
                  </div>

                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Aperçu"
                      className="w-full h-28 object-cover rounded-md"
                    />
                  ) : (
                    <div className="h-28 rounded-md flex flex-col items-center justify-center text-muted-foreground">
                      <ImageIcon className="w-5 h-5 mb-1" />
                      <p className="text-xs">Aucun fichier</p>
                    </div>
                  )}
                </div>
              </div>
            </Section>

            {/* Parties */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Section title="Partie civile" description="Identité et références PV (si disponibles).">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="partieCivileNoms">Identité(s)<RequiredMark /></Label>
                    <Input
                      id="partieCivileNoms"
                      placeholder="Nom(s) de la partie civile"
                      {...register("partieCivileNoms")}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowPVDetails((s) => !s)}
                    className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-xs flex items-center justify-between hover:bg-muted/40 transition"
                  >
                    <span>Détails PV (optionnel)</span>
                    {showPVDetails ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {showPVDetails && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="partieCivilePVNumero">N° PV<RequiredMark /></Label>
                        <Input
                          id="partieCivilePVNumero"
                          placeholder="Numéro du PV"
                          {...register("partieCivilePVNumero")}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="partieCivilePVTexte">Référence / résumé PV<RequiredMark /></Label>
                        <Input
                          id="partieCivilePVTexte"
                          placeholder="Ex: PV d’audition du … / résumé…"
                          {...register("partieCivilePVTexte")}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Section>

              <Section title="Mis en cause" description="Identité et références PV (si disponibles).">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="misEnCauseNoms">Identité(s)<RequiredMark /></Label>
                    <Input
                      id="misEnCauseNoms"
                      placeholder="Nom(s) du/des mis en cause"
                      {...register("misEnCauseNoms")}
                    />
                  </div>

                  {showPVDetails ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="misEnCausePVNumero">N° PV<RequiredMark /></Label>
                        <Input
                          id="misEnCausePVNumero"
                          placeholder="Numéro du PV"
                          {...register("misEnCausePVNumero")}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="misEnCausePVTexte">Référence / résumé PV<RequiredMark /></Label>
                        <Input
                          id="misEnCausePVTexte"
                          placeholder="Ex: PV d’audition du … / résumé…"
                          {...register("misEnCausePVTexte")}
                        />
                      </div>
                    </div>
                  ) : (
                    <FieldHint>Cliquer pour afficher les détails.</FieldHint>
                  )}
                </div>
              </Section>
            </div>

            {/* Synthèse */}
            <Section title="Synthèse" description="Observation et résultat (si applicable).">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="observations">Observations</Label>
                  <Textarea
                    id="observations"
                    placeholder="Remarques supplémentaires…"
                    rows={4}
                    {...register("observations")}
                  />
                </div>

                <div className="space-y-2 md:col-span-1">
                  <Label>Résultat</Label>
                  <Controller
                    name="resultat"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value || ""} onValueChange={field.onChange}>
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
                    )}
                  />
                  <FieldHint>Optionnel si l’enquête n’a pas encore abouti.</FieldHint>
                </div>
              </div>
            </Section>

            <div className="h-2" />

            {/* Footer sticky */}
            <div className="sticky bottom-0 bg-background border-t -mx-5 px-5 py-4 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting || isSubmitting}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={submitting || isSubmitting}>
                {submitting || isSubmitting
                  ? "Enregistrement..."
                  : initialData
                  ? "Mettre à jour"
                  : "Créer l'événement"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}



