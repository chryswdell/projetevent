// client/pages/Dashboard.tsx
import { useState, useMemo, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import Layout from "@/components/Layout";
import EventForm, { JudicialEvent } from "@/components/EventForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  FileText,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { judicialEventService } from "@/services/judicialEventService";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { cn } from "@/lib/utils";

// ✅ TanStack Table
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  SortingState,
  PaginationState,
  useReactTable,
} from "@tanstack/react-table";

// Librairies d’export
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Dashboard() {
  const [events, setEvents] = useState<JudicialEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // 🔎 Filtres date
  const [filterDate, setFilterDate] = useState(""); // date exacte
  const [filterStartDate, setFilterStartDate] = useState(""); // du
  const [filterEndDate, setFilterEndDate] = useState(""); // au

  // 🧭 Mode de filtre date (UX)
  const [dateFilterMode, setDateFilterMode] = useState<"exact" | "range">(
    "exact"
  );
  const [dateRangeError, setDateRangeError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<JudicialEvent | null>(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<number | null>(null);

  const [viewingEvent, setViewingEvent] = useState<JudicialEvent | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  // on garde en mémoire si l'utilisateur est admin
  const [isAdmin, setIsAdmin] = useState(false);

  // ✅ sorting TanStack
  const [sorting, setSorting] = useState<SortingState>([]);

  // ✅ pagination TanStack (AJOUT)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const { toast } = useToast();
  const navigate = useNavigate();

  // Helpers dates (pour chips)
  const toISODate = (d: Date) => d.toISOString().slice(0, 10);

  const startOfWeekMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay(); // 0=dimanche, 1=lundi...
    const diff = day === 0 ? -6 : 1 - day; // ramener à lundi
    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const endOfWeekSunday = (d: Date) => {
    const start = startOfWeekMonday(d);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  };

  const startOfMonth = (d: Date) => {
    const date = new Date(d.getFullYear(), d.getMonth(), 1);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const endOfMonth = (d: Date) => {
    const date = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    date.setHours(23, 59, 59, 999);
    return date;
  };

  const applyExactDate = (iso: string) => {
    setDateFilterMode("exact");
    setFilterDate(iso);
  };

  const applyRangeDates = (startIso: string, endIso: string) => {
    setDateFilterMode("range");
    setFilterStartDate(startIso);
    setFilterEndDate(endIso);
  };

  const applyPreset = (
    preset: "today" | "week" | "month" | "last7" | "last30"
  ) => {
    const now = new Date();
    const todayIso = toISODate(now);

    if (preset === "today") {
      applyExactDate(todayIso);
      return;
    }

    if (preset === "week") {
      const s = startOfWeekMonday(now);
      const e = endOfWeekSunday(now);
      applyRangeDates(toISODate(s), toISODate(e));
      return;
    }

    if (preset === "month") {
      const s = startOfMonth(now);
      const e = endOfMonth(now);
      applyRangeDates(toISODate(s), toISODate(e));
      return;
    }

    if (preset === "last7") {
      const s = new Date(now);
      s.setDate(now.getDate() - 6); // inclut aujourd'hui = 7 jours
      s.setHours(0, 0, 0, 0);
      applyRangeDates(toISODate(s), todayIso);
      return;
    }

    if (preset === "last30") {
      const s = new Date(now);
      s.setDate(now.getDate() - 29); // inclut aujourd'hui = 30 jours
      s.setHours(0, 0, 0, 0);
      applyRangeDates(toISODate(s), todayIso);
      return;
    }
  };

  // Redirection si non authentifié + détection admin
  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate("/login");
      return;
    }

    const current = authService.getCurrentUser();
    if (current && (current as any).is_admin) {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  }, [navigate]);

  // Chargement initial des événements
  useEffect(() => {
    const load = async () => {
      try {
        const data = await judicialEventService.list();
        setEvents(data);
      } catch (err: any) {
        console.error("Erreur lors du chargement des événements", err);

        if (axios.isAxiosError(err) && err.response?.status === 401) {
          await authService.logout();
          toast({
            variant: "destructive",
            title: "Session expirée",
            description: (
              <div className="flex items-center gap-2">
                <XCircle className="text-red-600 w-5 h-5" />
                <span>Votre session a expiré. Veuillez vous reconnecter.</span>
              </div>
            ),
          });
          navigate("/login");
          return;
        }

        toast({
          variant: "destructive",
          title: "Erreur de chargement",
          description: (
            <div className="flex items-center gap-2">
              <XCircle className="text-red-600 w-5 h-5" />
              <span>
                Impossible de charger les événements. Veuillez réessayer plus
                tard.
              </span>
            </div>
          ),
        });
      }
    };

    load();
  }, [toast, navigate]);

  // UX: éviter ambiguïté exact vs intervalle
  useEffect(() => {
    if (dateFilterMode === "exact") {
      if (filterStartDate) setFilterStartDate("");
      if (filterEndDate) setFilterEndDate("");
      setDateRangeError(null);
    } else {
      if (filterDate) setFilterDate("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilterMode]);

  // Validation intervalle
  useEffect(() => {
    if (!filterStartDate || !filterEndDate) {
      setDateRangeError(null);
      return;
    }
    if (filterStartDate > filterEndDate) {
      setDateRangeError("La date de fin doit être après la date de début.");
    } else {
      setDateRangeError(null);
    }
  }, [filterStartDate, filterEndDate]);

  const filteredEvents = useMemo(() => {
    const query = searchQuery.toLowerCase();

    return events.filter((event) => {
      const numeroStr =
        event.numero !== undefined && event.numero !== null
          ? String(event.numero)
          : "";

      const eventDate = event.date ? event.date.slice(0, 10) : "";

      const matchesText =
        numeroStr.includes(query) ||
        event.infractions.toLowerCase().includes(query) ||
        (event.saisine || "").toLowerCase().includes(query) ||
        (event.partieCivileNoms || "").toLowerCase().includes(query) ||
        (event.misEnCauseNoms || "").toLowerCase().includes(query) ||
        (event.resultat || "").toLowerCase().includes(query) ||
        (event.date || "").includes(query);

      if (filterDate) {
        if (!eventDate || eventDate !== filterDate) return false;
      }

      if (filterStartDate) {
        if (!eventDate || eventDate < filterStartDate) return false;
      }

      if (filterEndDate) {
        if (!eventDate || eventDate > filterEndDate) return false;
      }

      return matchesText;
    });
  }, [events, searchQuery, filterDate, filterStartDate, filterEndDate]);

  // ✅ reset pageIndex quand les filtres changent (AJOUT sans changer la logique)
  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [searchQuery, filterDate, filterStartDate, filterEndDate]);

  const handleAddEvent = async (formEvent: JudicialEvent) => {
    try {
      if (editingEvent && editingEvent.id) {
        if (!isAdmin) {
          toast({
            variant: "destructive",
            title: "Action non autorisée",
            description: (
              <div className="flex items-center gap-2">
                <XCircle className="text-red-600 w-5 h-5" />
                <span>
                  Seul l&apos;administrateur peut modifier un événement.
                </span>
              </div>
            ),
          });
          return;
        }

        const updated = await judicialEventService.update({
          ...editingEvent,
          ...formEvent,
          id: editingEvent.id,
          numero: editingEvent.numero,
        });

        setEvents((prev) =>
          prev.map((e) => (e.id === updated.id ? updated : e))
        );
        setEditingEvent(null);

        toast({
          title: "Modification réussie",
          description: (
            <div className="flex items-center gap-2">
              <CheckCircle className="text-blue-600 w-5 h-5" />
              <span>L&apos;événement a été modifié avec succès.</span>
            </div>
          ),
        });
      } else {
        const created = await judicialEventService.create(formEvent);
        setEvents((prev) => [...prev, created]);

        toast({
          title: "Ajout réussi",
          description: (
            <div className="flex items-center gap-2">
              <CheckCircle className="text-green-600 w-5 h-5" />
              <span>L&apos;événement a été ajouté avec succès.</span>
            </div>
          ),
        });
      }
    } catch (err) {
      console.error("Erreur lors de l'enregistrement de l'événement", err);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: (
          <div className="flex items-center gap-2">
            <XCircle className="text-red-600 w-5 h-5" />
            <span>
              Une erreur est survenue lors de l&apos;enregistrement de
              l&apos;événement.
            </span>
          </div>
        ),
      });
    }
  };

  const handleEditEvent = (event: JudicialEvent) => {
    if (!isAdmin) {
      toast({
        variant: "destructive",
        title: "Action non autorisée",
        description: (
          <div className="flex items-center gap-2">
            <XCircle className="text-red-600 w-5 h-5" />
            <span>Seul l&apos;administrateur peut modifier un événement.</span>
          </div>
        ),
      });
      return;
    }

    setEditingEvent(event);
    setFormOpen(true);
  };

  const handleDeleteEvent = (id: number) => {
    if (!isAdmin) {
      toast({
        variant: "destructive",
        title: "Action non autorisée",
        description: (
          <div className="flex items-center gap-2">
            <XCircle className="text-red-600 w-5 h-5" />
            <span>Seul l&apos;administrateur peut supprimer un événement.</span>
          </div>
        ),
      });
      return;
    }

    setEventToDelete(id);
    setDeleteAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (eventToDelete == null) return;
    try {
      await judicialEventService.remove(eventToDelete);
      setEvents((prev) => prev.filter((e) => e.id !== eventToDelete));

      toast({
        title: "Suppression réussie",
        description: (
          <div className="flex items-center gap-2">
            <Trash2 className="text-red-600 w-5 h-5" />
            <span>L&apos;événement a été supprimé avec succès.</span>
          </div>
        ),
      });
    } catch (err) {
      console.error("Erreur lors de la suppression", err);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: (
          <div className="flex items-center gap-2">
            <XCircle className="text-red-600 w-5 h-5" />
            <span>
              Une erreur est survenue lors de la suppression de l&apos;événement.
            </span>
          </div>
        ),
      });
    } finally {
      setDeleteAlertOpen(false);
      setEventToDelete(null);
    }
  };

  const handleViewEvent = (event: JudicialEvent) => {
    setViewingEvent(event);
    setViewDialogOpen(true);
  };

  const handleFormOpenChange = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditingEvent(null);
  };

  // Export Excel
 // Export Excel (✅ lignes filtrées + triées)
const exportToExcel = () => {
  // ✅ récupère les lignes affichables après filtre + tri (sans pagination)
  const rows = table.getSortedRowModel().rows;

  const data = rows.map((r) => {
    const e = r.original;
    return {
      Numero: e.numero ?? "",
      Date: e.date ? new Date(e.date).toLocaleDateString("fr-FR") : "",
      Infraction: e.infractions,
      Saisine: e.saisine || "",
      PC_identites: e.partieCivileNoms || "",
      "PC_N°": e.partieCivilePVNumero || "",
      PC_proces_verbal: e.partieCivilePVTexte || "",
      MC_identites: e.misEnCauseNoms || "",
      "MC_N°": e.misEnCausePVNumero || "",
      MC_proces_verbal: e.misEnCausePVTexte || "",
      Observation: e.observations || "",
      Résultat: e.resultat || "",
    };
  });

  if (data.length === 0) {
    toast({
      variant: "destructive",
      title: "Export impossible",
      description: "Aucune ligne filtrée à exporter.",
    });
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Evenements");

  XLSX.writeFile(workbook, "evenements_police_judiciaire_filtre.xlsx");

  toast({
    title: "Export Excel",
    description: (
      <div className="flex items-center gap-2">
        <FileSpreadsheet className="text-green-600 w-5 h-5" />
        <span>{data.length} ligne(s) exportée(s) (filtrées).</span>
      </div>
    ),
  });
};


  // Export PDF
 // Export PDF (✅ lignes filtrées + triées)
const exportToPDF = () => {
  // ✅ lignes filtrées + triées (sans pagination)
  const rows = table.getSortedRowModel().rows;

  if (rows.length === 0) {
    toast({
      variant: "destructive",
      title: "Export impossible",
      description: "Aucune ligne filtrée à exporter.",
    });
    return;
  }

  try {
    const doc = new jsPDF("l", "mm", "a4");

    const title = "Enregistrement de la police judiciaire (filtré)";
    doc.setFontSize(14);
    doc.text(title, 148, 12, { align: "center" });

    const head = [
      [
        "Numéro",
        "Date",
        "Infraction",
        "Saisine",
        "PC identité(s)",
        "PC N°",
        "PC PV",
        "MC identité(s)",
        "MC N°",
        "MC PV",
        "Observation",
        "Résultat",
      ],
    ];

    const body = rows.map((r) => {
      const e = r.original;
      return [
        e.numero ?? "",
        e.date ? new Date(e.date).toLocaleDateString("fr-FR") : "",
        e.infractions,
        e.saisine || "",
        e.partieCivileNoms || "",
        e.partieCivilePVNumero || "",
        e.partieCivilePVTexte || "",
        e.misEnCauseNoms || "",
        e.misEnCausePVNumero || "",
        e.misEnCausePVTexte || "",
        e.observations || "",
        e.resultat || "",
      ];
    });

    autoTable(doc, {
      head,
      body,
      startY: 18,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [200, 200, 200] },
    });

    doc.save("evenements_police_judiciaire_filtre.pdf");

    toast({
      title: "Export PDF",
      description: (
        <div className="flex items-center gap-2">
          <FileText className="text-blue-600 w-5 h-5" />
          <span>{rows.length} ligne(s) exportée(s) (filtrées).</span>
        </div>
      ),
    });
  } catch (err) {
    console.error("Erreur lors de l'export PDF", err);
    toast({
      variant: "destructive",
      title: "Erreur",
      description: (
        <div className="flex items-center gap-2">
          <XCircle className="text-red-600 w-5 h-5" />
          <span>Une erreur est survenue lors de l&apos;export en PDF.</span>
        </div>
      ),
    });
  }
};


  // ✅ chips (actif si valeurs correspondantes)
  const isPresetActive = (
    preset: "today" | "week" | "month" | "last7" | "last30"
  ) => {
    const now = new Date();
    const todayIso = toISODate(now);

    if (preset === "today") {
      return dateFilterMode === "exact" && filterDate === todayIso;
    }

    if (preset === "week") {
      const s = toISODate(startOfWeekMonday(now));
      const e = toISODate(endOfWeekSunday(now));
      return (
        dateFilterMode === "range" &&
        filterStartDate === s &&
        filterEndDate === e
      );
    }

    if (preset === "month") {
      const s = toISODate(startOfMonth(now));
      const e = toISODate(endOfMonth(now));
      return (
        dateFilterMode === "range" &&
        filterStartDate === s &&
        filterEndDate === e
      );
    }

    if (preset === "last7") {
      const s = new Date(now);
      s.setDate(now.getDate() - 6);
      s.setHours(0, 0, 0, 0);
      const sIso = toISODate(s);
      return (
        dateFilterMode === "range" &&
        filterStartDate === sIso &&
        filterEndDate === todayIso
      );
    }

    // last30
    const s = new Date(now);
    s.setDate(now.getDate() - 29);
    s.setHours(0, 0, 0, 0);
    const sIso = toISODate(s);
    return (
      dateFilterMode === "range" &&
      filterStartDate === sIso &&
      filterEndDate === todayIso
    );
  };

  // =========================
  // ✅ TanStack columns
  // (on garde la forme : colonnes + groupe PC / MC)
  // =========================
  const columns = useMemo<ColumnDef<JudicialEvent>[]>(() => {
    const sortIcon = (dir: false | "asc" | "desc") =>
      dir === "asc" ? (
        <ChevronUp className="ml-2 h-4 w-4 opacity-70" />
      ) : dir === "desc" ? (
        <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
      ) : null;

    const sortableHeader = (label: string) => (ctx: any) => {
      const dir = ctx.column.getIsSorted();
      return (
        <button
          type="button"
          className="inline-flex items-center text-left font-semibold"
          onClick={ctx.column.getToggleSortingHandler()}
          title="Trier"
        >
          {label}
          {sortIcon(dir)}
        </button>
      );
    };

    return [
      {
        accessorKey: "numero",
        header: sortableHeader("Numéro"),
        cell: ({ row }) => (
          <span className="font-semibold text-primary">
            {row.original.numero ?? ""}
          </span>
        ),
        size: 90,
      },
      {
        accessorKey: "date",
        header: sortableHeader("Date"),
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {row.original.date
              ? new Date(row.original.date).toLocaleDateString("fr-FR")
              : ""}
          </span>
        ),
        sortingFn: (a, b) => {
          const ad = a.original.date ?? "";
          const bd = b.original.date ?? "";
          return ad.localeCompare(bd);
        },
        size: 120,
      },
      {
        accessorKey: "infractions",
        header: sortableHeader("Infraction"),
        cell: ({ row }) => (
          <div
            className="max-w-[320px] truncate"
            title={row.original.infractions}
          >
            {row.original.infractions}
          </div>
        ),
        size: 220,
      },
      {
        accessorKey: "saisine",
        header: sortableHeader("Saisine"),
        cell: ({ row }) => (
          <div
            className="max-w-[260px] truncate text-sm"
            title={row.original.saisine || "-"}
          >
            {row.original.saisine || "-"}
          </div>
        ),
        size: 180,
      },

      // ✅ Partie civile (3 colonnes)
      {
        id: "pc_group",
        header: "Partie civile",
        columns: [
          {
            accessorKey: "partieCivileNoms",
            header: sortableHeader("Identité(s)"),
            cell: ({ row }) => (
              <div
                className="max-w-[240px] truncate"
                title={row.original.partieCivileNoms || "-"}
              >
                {row.original.partieCivileNoms || "-"}
              </div>
            ),
            size: 180,
          },
          {
            accessorKey: "partieCivilePVNumero",
            header: sortableHeader("N°"),
            cell: ({ row }) => (
              <span className="whitespace-nowrap">
                {row.original.partieCivilePVNumero || "-"}
              </span>
            ),
            size: 90,
          },
          {
            accessorKey: "partieCivilePVTexte",
            header: sortableHeader("Procès verbal"),
            cell: ({ row }) => (
              <div
                className="max-w-[260px] truncate"
                title={row.original.partieCivilePVTexte || "-"}
              >
                {row.original.partieCivilePVTexte || "-"}
              </div>
            ),
            size: 200,
          },
        ],
      },

      // ✅ Mise en cause (3 colonnes)
      {
        id: "mc_group",
        header: "Mise en cause",
        columns: [
          {
            accessorKey: "misEnCauseNoms",
            header: sortableHeader("Identité(s)"),
            cell: ({ row }) => (
              <div
                className="max-w-[240px] truncate"
                title={row.original.misEnCauseNoms || "-"}
              >
                {row.original.misEnCauseNoms || "-"}
              </div>
            ),
            size: 180,
          },
          {
            accessorKey: "misEnCausePVNumero",
            header: sortableHeader("N°"),
            cell: ({ row }) => (
              <span className="whitespace-nowrap">
                {row.original.misEnCausePVNumero || "-"}
              </span>
            ),
            size: 90,
          },
          {
            accessorKey: "misEnCausePVTexte",
            header: sortableHeader("Procès verbal"),
            cell: ({ row }) => (
              <div
                className="max-w-[260px] truncate"
                title={row.original.misEnCausePVTexte || "-"}
              >
                {row.original.misEnCausePVTexte || "-"}
              </div>
            ),
            size: 200,
          },
        ],
      },

      {
        accessorKey: "observations",
        header: sortableHeader("Observation"),
        cell: ({ row }) => (
          <div
            className="max-w-[280px] truncate text-sm"
            title={row.original.observations || "-"}
          >
            {row.original.observations || "-"}
          </div>
        ),
        size: 220,
      },
      {
        accessorKey: "resultat",
        header: sortableHeader("Résultat"),
        cell: ({ row }) => (
          <div
            className="max-w-[260px] truncate text-sm"
            title={row.original.resultat || "-"}
          >
            {row.original.resultat || "-"}
          </div>
        ),
        size: 200,
      },
      {
        id: "actions",
        header: () => <div className="text-center font-semibold">Action</div>,
        enableSorting: false,
        cell: ({ row }) => {
          const event = row.original;
          return (
            <div className="text-center">
              <div className="inline-flex gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 rounded-lg"
                  onClick={() => handleViewEvent(event)}
                  title="Voir"
                >
                  <Eye className="w-4 h-4" />
                </Button>

                {isAdmin && (
                  <>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 rounded-lg"
                      onClick={() => handleEditEvent(event)}
                      title="Modifier"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 rounded-lg text-destructive"
                      onClick={() =>
                        event.id && handleDeleteEvent(event.id as number)
                      }
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        },
        size: 140,
      },
    ];
  }, [isAdmin]);

  // ✅ TanStack table instance (+ pagination)
  const table = useReactTable({
    data: filteredEvents,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    // Important: sorting se fait ici sur filteredEvents (déjà filtré)
  });

  return (
    <Layout title="Gestion des Événements">
      <div className="space-y-6">
        {/* Barre de recherche + filtres date + boutons */}
        <div className="flex flex-col gap-4">
          <div className="flex gap-4 justify-between items-center flex-wrap">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Rechercher "
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" className="gap-2" onClick={exportToExcel}>
                <FileSpreadsheet className="w-4 h-4" />
                Export Excel
              </Button>
              <Button variant="outline" className="gap-2" onClick={exportToPDF}>
                <FileText className="w-4 h-4" />
                Export PDF
              </Button>
              <Button onClick={() => setFormOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Ajouter un événement
              </Button>
            </div>
          </div>

          {/* Filtres date */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={isPresetActive("today") ? "default" : "outline"}
                onClick={() => applyPreset("today")}
              >
                Aujourd’hui
              </Button>
              <Button
                type="button"
                size="sm"
                variant={isPresetActive("week") ? "default" : "outline"}
                onClick={() => applyPreset("week")}
              >
                Cette semaine
              </Button>
              <Button
                type="button"
                size="sm"
                variant={isPresetActive("month") ? "default" : "outline"}
                onClick={() => applyPreset("month")}
              >
                Ce mois
              </Button>
              <Button
                type="button"
                size="sm"
                variant={isPresetActive("last7") ? "default" : "outline"}
                onClick={() => applyPreset("last7")}
              >
                7 derniers jours
              </Button>
              <Button
                type="button"
                size="sm"
                variant={isPresetActive("last30") ? "default" : "outline"}
                onClick={() => applyPreset("last30")}
              >
                30 derniers jours
              </Button>
            </div>

            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-1">
                <Label>Mode</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={dateFilterMode === "exact" ? "default" : "outline"}
                    onClick={() => setDateFilterMode("exact")}
                  >
                    Date exacte
                  </Button>
                  <Button
                    type="button"
                    variant={dateFilterMode === "range" ? "default" : "outline"}
                    onClick={() => setDateFilterMode("range")}
                  >
                    Intervalle
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="filterDate">Date exacte</Label>
                <Input
                  id="filterDate"
                  type="date"
                  value={filterDate}
                  onChange={(e) => {
                    setFilterDate(e.target.value);
                    if (dateFilterMode !== "exact") setDateFilterMode("exact");
                  }}
                  className="w-[180px]"
                  disabled={dateFilterMode !== "exact"}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="filterStart">Du</Label>
                <Input
                  id="filterStart"
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => {
                    setFilterStartDate(e.target.value);
                    if (dateFilterMode !== "range") setDateFilterMode("range");
                  }}
                  className="w-[180px]"
                  disabled={dateFilterMode !== "range"}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="filterEnd">Au</Label>
                <Input
                  id="filterEnd"
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => {
                    setFilterEndDate(e.target.value);
                    if (dateFilterMode !== "range") setDateFilterMode("range");
                  }}
                  className={cn(
                    "w-[180px]",
                    dateRangeError &&
                      "border-destructive focus-visible:ring-destructive"
                  )}
                  disabled={dateFilterMode !== "range"}
                />
                {dateRangeError ? (
                  <p className="text-xs text-destructive mt-1">
                    {dateRangeError}
                  </p>
                ) : null}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFilterDate("");
                  setFilterStartDate("");
                  setFilterEndDate("");
                  setDateRangeError(null);
                }}
              >
                Réinitialiser les dates
              </Button>
            </div>
          </div>
        </div>

        {/* ✅ Tableau (TanStack + shadcn style) */}
        <div className="bg-card border border-border rounded-xl shadow-sm">
          {/* scroll interne X + Y + hauteur max */}
          <div className="relative overflow-x-auto max-h-[45vh] overflow-y-auto">
            <Table className="min-w-[1200px]">
              <TableHeader className="sticky top-0 z-50 shadow-sm">
                {/* Ligne 1 : Titre global (fixé) */}
                <TableRow className="bg-muted/60">
                  <TableHead
                    colSpan={13}
                    className="text-center font-bold text-base border-b border-border py-3"
                  >
                    Enregistrement de la police judiciaire
                  </TableHead>
                </TableRow>

                {/* Lignes TanStack : groupes + colonnes (fixés) */}
                {table.getHeaderGroups().map((headerGroup, index) => {
                  const isGroupRow = index === 0; // PC / MC
                  const bgClass = isGroupRow ? "bg-muted/40" : "bg-background";

                  return (
                    <TableRow key={headerGroup.id} className={bgClass}>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          colSpan={header.colSpan}
                          className={cn(
                            "border-b border-border",
                            isGroupRow
                              ? "text-center font-semibold"
                              : "font-semibold"
                          )}
                          style={{
                            width: header.getSize()
                              ? `${header.getSize()}px`
                              : undefined,
                          }}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  );
                })}
              </TableHeader>

              <TableBody>
                {table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-10">
                      <p className="text-muted-foreground">
                        {searchQuery ||
                        filterDate ||
                        filterStartDate ||
                        filterEndDate
                          ? "Aucun événement ne correspond à vos filtres"
                          : "Aucun événement enregistré"}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row, idx) => (
                    <TableRow
                      key={row.id}
                      className={cn(
                        "transition-colors",
                        "hover:bg-muted/30",
                        idx % 2 === 0 ? "bg-background" : "bg-muted/10"
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="align-top">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* petit fade en bas */}
            <div className="pointer-events-none sticky bottom-0 h-8 bg-gradient-to-t from-background to-transparent z-10" />
          </div>

          {/* ✅ Pagination (hors du scroll, garde la forme) */}
        {/* ✅ Pagination (hors du scroll, style moderne) */}
<div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border">
  {/* Infos */}
  <div className="text-sm text-muted-foreground">
    {(() => {
      const { pageIndex, pageSize } = table.getState().pagination;
      const total = table.getFilteredRowModel().rows.length;
      const from = total === 0 ? 0 : pageIndex * pageSize + 1;
      const to = Math.min(total, (pageIndex + 1) * pageSize);
      return (
        <>
          <span className="font-medium">{from}</span>–{" "}
          <span className="font-medium">{to}</span> sur{" "}
          <span className="font-medium">{total}</span>
        </>
      );
    })()}
  </div>

  {/* Controls */}
  <div className="flex items-center gap-2">
    {/* Page size */}
    <select
      className="h-9 rounded-md border border-border bg-background px-2 text-sm"
      value={table.getState().pagination.pageSize}
      onChange={(e) => table.setPageSize(Number(e.target.value))}
      aria-label="Taille de page"
    >
      {[10, 20, 30, 50, 100].map((size) => (
        <option key={size} value={size}>
          {size}/page
        </option>
      ))}
    </select>

    {/* Prev */}
    <Button
      variant="outline"
      size="icon"
      className="h-9 w-9 rounded-lg"
      onClick={() => table.previousPage()}
      disabled={!table.getCanPreviousPage()}
      aria-label="Page précédente"
      title="Page précédente"
    >
      ‹
    </Button>

    {/* Pages */}
    <div className="flex items-center gap-1">
      {(() => {
        const pageIndex = table.getState().pagination.pageIndex;
        const pageCount = table.getPageCount();

        // nombre max de boutons visibles
        const maxVisible = 5;
        const pages: (number | "dots")[] = [];

        if (pageCount <= maxVisible + 2) {
          // 1..N
          for (let i = 0; i < pageCount; i++) pages.push(i);
        } else {
          // Always show first + last
          const start = Math.max(1, pageIndex - 1);
          const end = Math.min(pageCount - 2, pageIndex + 1);

          pages.push(0);

          if (start > 1) pages.push("dots");

          for (let i = start; i <= end; i++) pages.push(i);

          if (end < pageCount - 2) pages.push("dots");

          pages.push(pageCount - 1);
        }

        return pages.map((p, idx) => {
          if (p === "dots") {
            return (
              <span
                key={`dots-${idx}`}
                className="px-2 text-sm text-muted-foreground"
              >
                …
              </span>
            );
          }

          const isActive = p === pageIndex;

          return (
            <Button
              key={p}
              variant={isActive ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-9 min-w-[36px] rounded-lg px-2",
                isActive && "pointer-events-none"
              )}
              onClick={() => table.setPageIndex(p)}
              aria-label={`Aller à la page ${p + 1}`}
            >
              {p + 1}
            </Button>
          );
        });
      })()}
    </div>

    {/* Next */}
    <Button
      variant="outline"
      size="icon"
      className="h-9 w-9 rounded-lg"
      onClick={() => table.nextPage()}
      disabled={!table.getCanNextPage()}
      aria-label="Page suivante"
      title="Page suivante"
    >
      ›
    </Button>
  </div>
</div>

        </div>

        <div className="text-sm text-muted-foreground">
          {table.getRowModel().rows.length} événement(s) affiché(s) sur{" "}
          {events.length}
        </div>
      </div>

      {/* Formulaire d'ajout / édition */}
      <EventForm
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        onSubmit={handleAddEvent}
        initialData={editingEvent}
      />

      {/* Dialog de visualisation */}
      {viewingEvent && (
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-3xl p-0 overflow-hidden">
            <div className="border-b px-6 py-4">
              <DialogHeader>
                <DialogTitle className="text-lg md:text-xl font-semibold">
                  Détails de l&apos;événement
                </DialogTitle>
              </DialogHeader>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium">
                  Numéro :{" "}
                  <span className="ml-1 font-semibold">
                    {viewingEvent.numero ?? "-"}
                  </span>
                </span>

                <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium">
                  Date :{" "}
                  <span className="ml-1 font-semibold">
                    {viewingEvent.date
                      ? new Date(viewingEvent.date).toLocaleDateString("fr-FR")
                      : "-"}
                  </span>
                </span>

                {viewingEvent.resultat ? (
                  <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs">
                    {viewingEvent.resultat}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="max-h-[75vh] overflow-y-auto px-6 py-5 space-y-4">
              {viewingEvent.photoUrl ? (
                <section className="rounded-xl border bg-background p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="text-sm font-semibold">Photo</h3>
                    <span className="text-xs text-muted-foreground">
                      Pièce jointe
                    </span>
                  </div>

                  <div className="rounded-lg border bg-muted/20 overflow-hidden">
                    <img
                      src={viewingEvent.photoUrl}
                      alt="Photo de l'événement"
                      className="w-full max-h-[320px] object-contain bg-black/5"
                      loading="lazy"
                    />
                  </div>
                </section>
              ) : null}

              <section className="rounded-xl border bg-background p-4">
                <h3 className="text-sm font-semibold mb-3">
                  Informations générales
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Infraction</p>
                    <p className="text-sm font-medium whitespace-pre-wrap break-words">
                      {viewingEvent.infractions || "-"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Saisine</p>
                    <p className="text-sm font-medium whitespace-pre-wrap break-words">
                      {viewingEvent.saisine || "-"}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border bg-background p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Partie civile</h3>
                  <span className="text-xs text-muted-foreground">
                    PV & Identités
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Identité(s)</p>
                    <p className="text-sm font-medium whitespace-pre-wrap break-words">
                      {viewingEvent.partieCivileNoms || "-"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">N° PV</p>
                    <p className="text-sm font-medium whitespace-pre-wrap break-words">
                      {viewingEvent.partieCivilePVNumero || "-"}
                    </p>
                  </div>

                  <div className="space-y-1 md:col-span-3">
                    <p className="text-xs text-muted-foreground">
                      Procès-verbal
                    </p>
                    <p className="text-sm font-medium whitespace-pre-wrap break-words">
                      {viewingEvent.partieCivilePVTexte || "-"}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border bg-background p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Mise en cause</h3>
                  <span className="text-xs text-muted-foreground">
                    PV & Identités
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Identité(s)</p>
                    <p className="text-sm font-medium whitespace-pre-wrap break-words">
                      {viewingEvent.misEnCauseNoms || "-"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">N° PV</p>
                    <p className="text-sm font-medium whitespace-pre-wrap break-words">
                      {viewingEvent.misEnCausePVNumero || "-"}
                    </p>
                  </div>

                  <div className="space-y-1 md:col-span-3">
                    <p className="text-xs text-muted-foreground">
                      Procès-verbal
                    </p>
                    <p className="text-sm font-medium whitespace-pre-wrap break-words">
                      {viewingEvent.misEnCausePVTexte || "-"}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border bg-background p-4">
                <h3 className="text-sm font-semibold mb-3">Observations</h3>
                <p className="text-sm font-medium whitespace-pre-wrap break-words">
                  {viewingEvent.observations || "-"}
                </p>
              </section>

              <section className="rounded-xl border bg-muted/20 p-4">
                <h3 className="text-sm font-semibold mb-2">Résultat</h3>
                <p className="text-sm font-medium whitespace-pre-wrap break-words">
                  {viewingEvent.resultat || "-"}
                </p>
              </section>

              <div className="h-2" />
            </div>

            <div className="sticky bottom-0 border-t bg-background px-6 py-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                Fermer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirmation de suppression */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
          <AlertDialogDescription>
            Êtes-vous sûr de vouloir supprimer cet événement ? Cette action ne
            peut pas être annulée.
          </AlertDialogDescription>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
