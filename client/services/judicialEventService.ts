// client/services/judicialEventService.ts
import { apiClient } from "./api";
import { JudicialEvent } from "@/components/EventForm";

// Interface correspondant exactement à l'API Laravel
export interface JudicialEventApi {
  id: number;
  numero: number;
  date_evenement: string;
  infractions: string;
  saisine: string | null;
  partie_civile_identites: string | null;
  partie_civile_pv_numero: string | null;
  partie_civile_pv_reference: string | null;
  mis_en_cause_identites: string | null;
  mis_en_cause_pv_numero: string | null;
  mis_en_cause_pv_reference: string | null;
  observation: string | null;
  resultat: string | null;
  created_at: string;
  updated_at: string;
}

// Conversion API → Frontend
const fromApi = (apiEvent: JudicialEventApi): JudicialEvent => ({
  id: apiEvent.id,
  numero: apiEvent.numero,
  date: apiEvent.date_evenement.slice(0, 10),
  infractions: apiEvent.infractions,
  saisine: apiEvent.saisine ?? "",
  partieCivileNoms: apiEvent.partie_civile_identites ?? "",
  partieCivilePVNumero: apiEvent.partie_civile_pv_numero ?? "",
  partieCivilePVTexte: apiEvent.partie_civile_pv_reference ?? "",
  misEnCauseNoms: apiEvent.mis_en_cause_identites ?? "",
  misEnCausePVNumero: apiEvent.mis_en_cause_pv_numero ?? "",
  misEnCausePVTexte: apiEvent.mis_en_cause_pv_reference ?? "",
  observations: apiEvent.observation ?? "",
  resultat: apiEvent.resultat ?? "",
});

// Conversion Frontend → API
const toApiPayload = (event: JudicialEvent) => ({
  date_evenement: event.date,
  infractions: event.infractions,
  saisine: event.saisine || null,
  partie_civile_identites: event.partieCivileNoms || null,
  partie_civile_pv_numero: event.partieCivilePVNumero || null,
  partie_civile_pv_reference: event.partieCivilePVTexte || null,
  mis_en_cause_identites: event.misEnCauseNoms || null,
  mis_en_cause_pv_numero: event.misEnCausePVNumero || null,
  mis_en_cause_pv_reference: event.misEnCausePVTexte || null,
  observation: event.observations || null,
  resultat: event.resultat || null,
});

// Service Axios
export const judicialEventService = {
  async list(search?: string): Promise<JudicialEvent[]> {
    const response = await apiClient.get<JudicialEventApi[]>("/judicial-events", {
      params: search ? { q: search } : {},
    });

    return response.data.map(fromApi);
  },

  async create(data: JudicialEvent): Promise<JudicialEvent> {
    const response = await apiClient.post<JudicialEventApi>(
      "/judicial-events",
      toApiPayload(data)
    );

    return fromApi(response.data);
  },

  async update(event: JudicialEvent): Promise<JudicialEvent> {
    if (!event.id) throw new Error("ID manquant pour la mise à jour");

    const response = await apiClient.put<JudicialEventApi>(
      `/judicial-events/${event.id}`,
      toApiPayload(event)
    );

    return fromApi(response.data);
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(`/judicial-events/${id}`);
  },
};
