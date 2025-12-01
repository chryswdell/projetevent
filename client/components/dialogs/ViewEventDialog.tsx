import { useState, useMemo, useEffect } from "react";
import Layout from "@/components/Layout";
import EventForm, { JudicialEvent } from "@/components/EventForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import { judicialEventService } from "@/services/judicialEventService";

// 📦 libs d’export
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function Dashboard() {
  const [events, setEvents] = useState<JudicialEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<JudicialEvent | null>(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<number | null>(null);

  const [viewingEvent, setViewingEvent] = useState<JudicialEvent | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  // Chargement initial depuis le backend
  useEffect(() => {
    const load = async () => {
      try {
        const data = await judicialEventService.list();
        setEvents(data);
      } catch (err) {
        console.error("Erreur lors du chargement des événements", err);
      }
    };
    load();
  }, []);

  const filteredEvents = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return events.filter((event) => {
      const numeroStr =
        event.numero !== undefined && event.numero !== null
          ? String(event.numero)
          : "";
      return (
        numeroStr.includes(query) ||
        event.infractions.toLowerCase().includes(query) ||
        event.partieCivileNoms.toLowerCase().includes(query) ||
        event.misEnCauseNoms.toLowerCase().includes(query) ||
        event.date.includes(query)
      );
    });
  }, [events, searchQuery]);

  const handleAddEvent = async (formEvent: JudicialEvent) => {
    try {
      if (editingEvent && editingEvent.id) {
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
      } else {
        const created = await judicialEventService.create(formEvent);
        setEvents((prev) => [...prev, created]);
      }
    } catch (err) {
      console.error("Erreur lors de l'enregistrement de l'événement", err);
    }
  };

  const handleEditEvent = (event: JudicialEvent) => {
    setEditingEvent(event);
    setFormOpen(true);
  };

  const handleDeleteEvent = (id: number) => {
    setEventToDelete(id);
    setDeleteAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (eventToDelete == null) return;
    try {
      await judicialEventService.remove(eventToDelete);
      setEvents((prev) => prev.filter((e) => e.id !== eventToDelete));
    } catch (err) {
      console.error("Erreur lors de la suppression", err);
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

  // 📁 Export Excel
  const exportToExcel = () => {
    const data = events.map((e) => ({
      Numero: e.numero ?? "",
      Date: e.date ? new Date(e.date).toLocaleDateString("fr-FR") : "",
      Infractions: e.infractions,
      "PC_identites": e.partieCivileNoms || "",
      "PC_N°": e.partieCivilePVNumero || "",
      "PC_proces_verbal": e.partieCivilePVTexte || "",
      "MC_identites": e.misEnCauseNoms || "",
      "MC_N°": e.misEnCausePVNumero || "",
      "MC_proces_verbal": e.misEnCausePVTexte || "",
      Observation: e.observations || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Evenements");

    XLSX.writeFile(workbook, "evenements_police_judiciaire.xlsx");
  };

  // 📄 Export PDF
  const exportToPDF = () => {
    const doc = new jsPDF("l", "mm", "a4");

    const title = "Enregistrement de la police judiciaire";
    doc.setFontSize(14);
    doc.text(title, 148, 12, { align: "center" });

    const head = [
      [
        "Numéro",
        "Date",
        "Infractions",
        "PC identité(s)",
        "PC N°",
        "PC PV",
        "MC identité(s)",
        "MC N°",
        "MC PV",
        "Observation",
      ],
    ];

    const body = events.map((e) => [
      e.numero ?? "",
      e.date ? new Date(e.date).toLocaleDateString("fr-FR") : "",
      e.infractions,
      e.partieCivileNoms || "",
      e.partieCivilePVNumero || "",
      e.partieCivilePVTexte || "",
      e.misEnCauseNoms || "",
      e.misEnCausePVNumero || "",
      e.misEnCausePVTexte || "",
      e.observations || "",
    ]);

    (doc as any).autoTable({
      head,
      body,
      startY: 18,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [200, 200, 200] },
    });

    doc.save("evenements_police_judiciaire.pdf");
  };

  return (
    <Layout title="Gestion des Événements">
      <div className="space-y-6">
        {/* Barre de recherche + boutons */}
        <div className="flex gap-4 justify-between items-center flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Rechercher par numéro, date, infraction, partie civile..."
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

        {/* Tableau principal */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {/* Ligne 1 — titre global */}
                <TableRow className="bg-gray-300">
                  <TableHead
                    colSpan={11}
                    className="text-center font-bold text-base border-b-2 border-gray-400 py-3"
                  >
                    Enregistrement de la police judiciaire
                  </TableHead>
                </TableRow>

                {/* Ligne 2 — groupes */}
                <TableRow className="bg-gray-200">
                  <TableHead
                    colSpan={3}
                    className="border-b-2 border-gray-300"
                  ></TableHead>

                  <TableHead
                    colSpan={3}
                    className="text-center font-semibold border-b-2 border-gray-300"
                  >
                    partie civile
                  </TableHead>

                  <TableHead
                    colSpan={3}
                    className="text-center font-semibold border-b-2 border-gray-300"
                  >
                    mise en cause
                  </TableHead>

                  <TableHead className="border-b-2 border-gray-300"></TableHead>
                  <TableHead className="border-b-2 border-gray-300"></TableHead>
                </TableRow>

                {/* Ligne 3 — en-têtes de colonnes */}
                <TableRow className="bg-gray-100">
                  <TableHead className="font-semibold border-b border-gray-300">
                    Numéro
                  </TableHead>
                  <TableHead className="font-semibold border-b border-gray-300">
                    Date
                  </TableHead>
                  <TableHead className="font-semibold border-b border-gray-300">
                    Infractions
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
                  <TableHead className="font-semibold border-b border-gray-300 text-center">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">
                      <p className="text-muted-foreground">
                        {searchQuery
                          ? "Aucun événement ne correspond à votre recherche"
                          : "Aucun événement enregistré"}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEvents.map((event) => (
                    <TableRow
                      key={event.id}
                      className="hover:bg-muted/20"
                    >
                      {/* Numéro / Date / Infractions */}
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

                      {/* Partie civile */}
                      <TableCell>{event.partieCivileNoms || "-"}</TableCell>
                      <TableCell>
                        {event.partieCivilePVNumero || "-"}
                      </TableCell>
                      <TableCell>
                        {event.partieCivilePVTexte || "-"}
                      </TableCell>

                      {/* Mise en cause */}
                      <TableCell>{event.misEnCauseNoms || "-"}</TableCell>
                      <TableCell>
                        {event.misEnCausePVNumero || "-"}
                      </TableCell>
                      <TableCell>
                        {event.misEnCausePVTexte || "-"}
                      </TableCell>

                      {/* Observation */}
                      <TableCell className="max-w-xs text-sm">
                        {event.observations || "-"}
                      </TableCell>

                      {/* Action */}
                      <TableCell className="text-center">
                        <div className="inline-flex gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => handleViewEvent(event)}
                            title="Voir"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
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

      {/* Dialog de visualisation (bouton œil) */}
      {viewingEvent && (
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Détails de l&apos;événement {viewingEvent.numero}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
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
                  Infractions
                </p>
                <p className="text-base">{viewingEvent.infractions}</p>
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
