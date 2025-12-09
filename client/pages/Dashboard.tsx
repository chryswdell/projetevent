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
} from "lucide-react";
import { judicialEventService } from "@/services/judicialEventService";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";

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

  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<JudicialEvent | null>(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<number | null>(null);

  const [viewingEvent, setViewingEvent] = useState<JudicialEvent | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  // on garde en mémoire si l'utilisateur est admin
  const [isAdmin, setIsAdmin] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();

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
          // Token invalide ou expiré
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

  const filteredEvents = useMemo(() => {
    const query = searchQuery.toLowerCase();

    return events.filter((event) => {
      const numeroStr =
        event.numero !== undefined && event.numero !== null
          ? String(event.numero)
          : "";

      // date au format "YYYY-MM-DD" (compatible avec <input type="date" />)
      const eventDate = event.date ? event.date.slice(0, 10) : "";

      const matchesText =
        numeroStr.includes(query) ||
        event.infractions.toLowerCase().includes(query) ||
        (event.saisine || "").toLowerCase().includes(query) ||
        event.partieCivileNoms.toLowerCase().includes(query) ||
        event.misEnCauseNoms.toLowerCase().includes(query) ||
        (event.resultat || "").toLowerCase().includes(query) ||
        event.date.includes(query);

      // Filtre par date exacte
      if (filterDate) {
        if (!eventDate || eventDate !== filterDate) {
          return false;
        }
      }

      // Filtre intervalle "Du"
      if (filterStartDate) {
        if (!eventDate || eventDate < filterStartDate) {
          return false;
        }
      }

      // Filtre intervalle "Au"
      if (filterEndDate) {
        if (!eventDate || eventDate > filterEndDate) {
          return false;
        }
      }

      return matchesText;
    });
  }, [events, searchQuery, filterDate, filterStartDate, filterEndDate]);

  const handleAddEvent = async (formEvent: JudicialEvent) => {
    try {
      if (editingEvent && editingEvent.id) {
        //  Modification réservée à l'admin
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
              <span>L'événement a été modifié avec succès.</span>
            </div>
          ),
        });
      } else {
        //  Ajout autorisé pour tout le monde
        const created = await judicialEventService.create(formEvent);
        setEvents((prev) => [...prev, created]);

        toast({
          title: "Ajout réussi",
          description: (
            <div className="flex items-center gap-2">
              <CheckCircle className="text-green-600 w-5 h-5" />
              <span>L'événement a été ajouté avec succès.</span>
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
    //  clic sur Modifier : seulement admin
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
    //  Suppression réservée à l’admin aussi (logique)
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
    if (!open) {
      setEditingEvent(null);
    }
  };

  // Export Excel
  const exportToExcel = () => {
    const data = events.map((e) => ({
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
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Evenements");

    XLSX.writeFile(workbook, "evenements_police_judiciaire.xlsx");

    toast({
      title: "Export Excel",
      description: (
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="text-green-600 w-5 h-5" />
          <span>Le fichier Excel a été généré avec succès.</span>
        </div>
      ),
    });
  };

  // Export PDF
  const exportToPDF = () => {
    try {
      const doc = new jsPDF("l", "mm", "a4");

      const title = "Enregistrement de la police judiciaire";
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

      const body = events.map((e) => [
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
      ]);

      autoTable(doc, {
        head,
        body,
        startY: 18,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [200, 200, 200] },
      });

      doc.save("evenements_police_judiciaire.pdf");

      toast({
        title: "Export PDF",
        description: (
          <div className="flex items-center gap-2">
            <FileText className="text-blue-600 w-5 h-5" />
            <span>Le fichier PDF a été généré avec succès.</span>
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
            <span>
              Une erreur est survenue lors de l&apos;export en PDF.
            </span>
          </div>
        ),
      });
    }
  };

  return (
    <Layout title="Gestion des Événements">
      <div className="space-y-6">
        {/* Barre de recherche + filtres date + boutons */}
        <div className="flex flex-col gap-4">
          <div className="flex gap-4 justify-between items-center flex-wrap">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Rechercher par numéro, date, infraction, saisine, partie civile..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                className="gap-2"
                onClick={exportToExcel}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export Excel
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={exportToPDF}
              >
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
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label htmlFor="filterDate">Date exacte</Label>
              <Input
                id="filterDate"
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-[180px]"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="filterStart">Du</Label>
              <Input
                id="filterStart"
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-[180px]"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="filterEnd">Au</Label>
              <Input
                id="filterEnd"
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-[180px]"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFilterDate("");
                setFilterStartDate("");
                setFilterEndDate("");
              }}
            >
              Réinitialiser les dates
            </Button>
          </div>
        </div>

        {/* Tableau principal */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {/* Ligne 1 — titre global */}
                <TableRow className="bg-gray-300">
                  <TableHead
                    colSpan={13}
                    className="text-center font-bold text-base border-b-2 border-gray-400 py-3"
                  >
                    Enregistrement de la police judiciaire
                  </TableHead>
                </TableRow>

                {/* Ligne 2 — groupes */}
                <TableRow className="bg-gray-200">
                  <TableHead
                    colSpan={4}
                    className="border-b-2 border-gray-300"
                  ></TableHead>

                  <TableHead
                    colSpan={3}
                    className="text-center font-semibold border-b-2 border-gray-300"
                  >
                    Partie civile
                  </TableHead>

                  <TableHead
                    colSpan={3}
                    className="text-center font-semibold border-b-2 border-gray-300"
                  >
                    Mise en cause
                  </TableHead>

                  <TableHead className="border-b-2 border-gray-300"></TableHead>
                  <TableHead className="border-b-2 border-gray-300"></TableHead>
                  <TableHead className="border-b-2 border-gray-300"></TableHead>
                </TableRow>

                {/* Ligne 3 — en-têtes de colonnes */}
                <TableRow className="bg-gray-10">
                  <TableHead className="font-semibold border-b border-gray-300">
                    Numéro
                  </TableHead>
                  <TableHead className="font-semibold border-b border-gray-300">
                    Date
                  </TableHead>
                  <TableHead className="font-semibold border-b border-gray-300">
                    Infraction
                  </TableHead>
                  <TableHead className="font-semibold border-b border-gray-300">
                    Saisine
                  </TableHead>

                  <TableHead className="font-semibold border-b border-gray-300">
                    identité(s)
                  </TableHead>
                  <TableHead className="font-semibold border-b border-gray-300">
                    N°
                  </TableHead>
                  <TableHead className="font-semibold border-b border-gray-300">
                    procès verbal
                  </TableHead>

                  <TableHead className="font-semibold border-b border-gray-300">
                    identité(s)
                  </TableHead>
                  <TableHead className="font-semibold border-b border-gray-300">
                    N°
                  </TableHead>
                  <TableHead className="font-semibold border-b border-gray-300">
                    procès verbal
                  </TableHead>

                  <TableHead className="font-semibold border-b border-gray-300">
                    Observation
                  </TableHead>
                  <TableHead className="font-semibold border-b border-gray-300">
                    Résultat
                  </TableHead>
                  <TableHead className="font-semibold border-b border-gray-300 text-center">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8">
                      <p className="text-muted-foreground">
                        {searchQuery || filterDate || filterStartDate || filterEndDate
                          ? "Aucun événement ne correspond à vos filtres"
                          : "Aucun événement enregistré"}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEvents.map((event) => (
                    <TableRow key={event.id} className="hover:bg-muted/20">
                      {/* Numéro / Date / Infraction / Saisine */}
                      <TableCell className="font-medium text-primary">
                        {event.numero}
                      </TableCell>
                      <TableCell>
                        {event.date
                          ? new Date(event.date).toLocaleDateString("fr-FR")
                          : ""}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {event.infractions}
                      </TableCell>
                      <TableCell className="max-w-xs text-sm">
                        {event.saisine || "-"}
                      </TableCell>

                      {/* Partie civile */}
                      <TableCell>{event.partieCivileNoms || "-"}</TableCell>
                      <TableCell>{event.partieCivilePVNumero || "-"}</TableCell>
                      <TableCell>{event.partieCivilePVTexte || "-"}</TableCell>

                      {/* Mise en cause */}
                      <TableCell>{event.misEnCauseNoms || "-"}</TableCell>
                      <TableCell>{event.misEnCausePVNumero || "-"}</TableCell>
                      <TableCell>{event.misEnCausePVTexte || "-"}</TableCell>

                      {/* Observation */}
                      <TableCell className="max-w-xs text-sm">
                        {event.observations || "-"}
                      </TableCell>

                      {/* Résultat */}
                      <TableCell className="max-w-xs text-sm">
                        {event.resultat || "-"}
                      </TableCell>

                      {/* Action */}
                      <TableCell className="text-center">
                        <div className="inline-flex gap-2">
                          {/* Voir : tout le monde */}
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => handleViewEvent(event)}
                            title="Voir"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {/* Modifier / Supprimer : uniquement admin */}
                          {isAdmin && (
                            <>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                onClick={() => handleEditEvent(event)}
                                title="Modifier"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 text-destructive"
                                onClick={() =>
                                  event.id && handleDeleteEvent(event.id)
                                }
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          {filteredEvents.length} événement(s) affiché(s) sur {events.length}
        </div>
      </div>

      {/* Formulaire d'ajout / édition */}
      <EventForm
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        onSubmit={handleAddEvent}
        initialData={editingEvent}
      />

      {/* Dialog de visualisation (œil) */}
      {viewingEvent && (
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Détails de l&apos;événement {viewingEvent.numero}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/*  Photo si disponible */}
              {viewingEvent.photoUrl && (
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-base mb-2">Photo</h3>
                  <img
                    src={viewingEvent.photoUrl}
                    alt="Photo de l'événement"
                    className="max-h-80 rounded-md border object-contain mx-auto"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Numéro
                  </p>
                  <p className="text-lg font-semibold">
                    {viewingEvent.numero}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Date
                  </p>
                  <p className="text-lg font-semibold">
                    {viewingEvent.date
                      ? new Date(viewingEvent.date).toLocaleDateString("fr-FR")
                      : ""}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Infraction
                </p>
                <p className="text-base">{viewingEvent.infractions}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Saisine
                </p>
                <p className="text-base">{viewingEvent.saisine || "-"}</p>
              </div>

              {/* Partie civile */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-base mb-4">Partie civile</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Identité(s)
                    </p>
                    <p className="text-base">
                      {viewingEvent.partieCivileNoms || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      N°
                    </p>
                    <p className="text-base">
                      {viewingEvent.partieCivilePVNumero || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Procès-verbal
                    </p>
                    <p className="text-base">
                      {viewingEvent.partieCivilePVTexte || "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Mise en cause */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-base mb-4">Mis en cause</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Identité(s)
                    </p>
                    <p className="text-base">
                      {viewingEvent.misEnCauseNoms || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      N°
                    </p>
                    <p className="text-base">
                      {viewingEvent.misEnCausePVNumero || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Procès-verbal
                    </p>
                    <p className="text-base">
                      {viewingEvent.misEnCausePVTexte || "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Observations */}
              {viewingEvent.observations && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Observations
                  </p>
                  <p className="text-base">{viewingEvent.observations}</p>
                </div>
              )}

              {/* Résultat */}
              {viewingEvent.resultat && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Résultat
                  </p>
                  <p className="text-base">{viewingEvent.resultat}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 border-t pt-6">
                <Button
                  variant="outline"
                  onClick={() => setViewDialogOpen(false)}
                >
                  Fermer
                </Button>
              </div>
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
