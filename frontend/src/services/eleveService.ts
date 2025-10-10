import authService from './authService';
import { config } from '../config';

export interface Eleve {
  id: number;
  nom: string;
  prenom?: string;
  dateNaissance?: string;
  numRegNationalEleve?: string;
  idMyLogiscool?: string;
  mdpMyLogiscool?: string;
  contingent?: string;
  periodeInscription?: string;
  nomCompletParent?: string;
  adresseEleve?: string;
  codePostalEleve?: string;
  localiteEleve?: string;
  paysEleve?: string;
  retourSeul?: boolean;
  recuperePar?: string;
  rrRestantes?: number;
  abandon?: boolean;
  dateAbandon?: string;
  remarques?: string;
  nomCompletResponsable1?: string;
  relationResponsable1?: string;
  gsmResponsable1?: string;
  mailResponsable1?: string;
  nomCompletResponsable2?: string;
  relationResponsable2?: string;
  gsmResponsable2?: string;
  mailResponsable2?: string;
  nomCompletResponsable3?: string;
  relationResponsable3?: string;
  gsmResponsable3?: string;
  mailResponsable3?: string;
  madhesionCIB?: boolean;
  nomSociete?: string;
  cpas?: boolean;
  boursier?: boolean;
  typeBourse?: string;
  nombreVersements?: number;
  montantBourseQ1?: number;
  montantBrutQ1?: number;
  montantNetQ1?: number;
  montantBourseQ2?: number;
  montantBrutQ2?: number;
  montantNetQ2?: number;
  montantTotalBrut?: number;
  montantTotalNet?: number;
  montantPayment1?: number;
  datePayment1?: string;
  montantPayment2?: number;
  datePayment2?: string;
  montantPayment3?: number;
  datePayment3?: string;
  montantPayment4?: number;
  datePayment4?: string;
  reductionQ1?: number;
  montantDuQ1?: number;
  montantFinalQ1?: number;
  montantPayeQ1?: number;
  datePaymentQ1?: string;
  periodePaymentQ1?: string;
  reductionQ2?: number;
  montantDuQ2?: number;
  montantFinalQ2?: number;
  montantPayeQ2?: number;
  datePaymentQ2?: string;
  periodePaymentQ2?: string;
  nomResponsableFiscal?: string;
  numRegNatResponsableFiscal?: string;
  dateNaissanceResponsableFiscal?: string;
  adresseResponsableFiscal?: string;
  codePostalResponsableFiscal?: string;
  localiteResponsableFiscal?: string;
  paysResponsableFiscal?: string;
}

export interface CreateEleveData {
  nom: string;
  prenom?: string;
  dateNaissance?: string;
  numRegNationalEleve?: string;
  idMyLogiscool?: string;
  mdpMyLogiscool?: string;
  contingent?: string;
  periodeInscription?: string;
  nomCompletParent?: string;
  adresseEleve?: string;
  codePostalEleve?: string;
  localiteEleve?: string;
  paysEleve?: string;
  retourSeul?: boolean;
  recuperePar?: string;
  rrRestantes?: number;
  abandon?: boolean;
  dateAbandon?: string;
  remarques?: string;
  nomCompletResponsable1?: string;
  relationResponsable1?: string;
  gsmResponsable1?: string;
  mailResponsable1?: string;
  nomCompletResponsable2?: string;
  relationResponsable2?: string;
  gsmResponsable2?: string;
  mailResponsable2?: string;
  nomCompletResponsable3?: string;
  relationResponsable3?: string;
  gsmResponsable3?: string;
  mailResponsable3?: string;
  madhesionCIB?: boolean;
  nomSociete?: string;
  cpas?: boolean;
  boursier?: boolean;
  typeBourse?: string;
  nombreVersements?: number;
  montantBourseQ1?: number;
  montantBrutQ1?: number;
  montantNetQ1?: number;
  montantBourseQ2?: number;
  montantBrutQ2?: number;
  montantNetQ2?: number;
  montantTotalBrut?: number;
  montantTotalNet?: number;
  montantPayment1?: number;
  datePayment1?: string;
  montantPayment2?: number;
  datePayment2?: string;
  montantPayment3?: number;
  datePayment3?: string;
  montantPayment4?: number;
  datePayment4?: string;
  reductionQ1?: number;
  montantDuQ1?: number;
  montantFinalQ1?: number;
  montantPayeQ1?: number;
  datePaymentQ1?: string;
  periodePaymentQ1?: string;
  reductionQ2?: number;
  montantDuQ2?: number;
  montantFinalQ2?: number;
  montantPayeQ2?: number;
  datePaymentQ2?: string;
  periodePaymentQ2?: string;
  nomResponsableFiscal?: string;
  numRegNatResponsableFiscal?: string;
  dateNaissanceResponsableFiscal?: string;
  adresseResponsableFiscal?: string;
  codePostalResponsableFiscal?: string;
  localiteResponsableFiscal?: string;
  paysResponsableFiscal?: string;
}

class EleveService {
  private baseURL: string;

  constructor() {
    this.baseURL = config.API_URL || 'http://localhost:4000';
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = authService.getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        // Token is invalid or expired, logout user
        authService.logout();
        const errorData = await response.json().catch(() => ({ error: 'Authentication failed' }));
        throw new Error('AUTH_ERROR:' + (errorData.error || `HTTP ${response.status}`));
      }

      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getAllEleves(): Promise<Eleve[]> {
    return this.makeRequest('/admin/eleves');
  }

  async createEleve(eleveData: CreateEleveData): Promise<Eleve> {
    const response = await this.makeRequest('/admin/eleves', {
      method: 'POST',
      body: JSON.stringify(eleveData),
    });
    return response.eleve;
  }

  async updateEleve(id: number, updateData: Partial<CreateEleveData>): Promise<Eleve> {
    const response = await this.makeRequest(`/admin/eleves/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
    return response.eleve;
  }

  async deleteEleve(id: number): Promise<void> {
    await this.makeRequest(`/admin/eleves/${id}`, {
      method: 'DELETE',
    });
  }

  async getEleveDetails(id: number): Promise<{ eleve: Eleve; seances: Array<{ id: number; dateHeure: string; duree: number; statut: string; weekNumber?: number | null; classe: { id: number; nom: string; level?: string | null; teacher?: { id: number; nom: string; prenom: string } }; attendance: { presenceId: number; statut: string; notes?: string | null } | null; rr: { type: 'origin' | 'destination'; id: number; destStatut?: string | null } | null }>; }> {
    return this.makeRequest(`/admin/eleves/${id}/details`);
  }
}

const eleveService = new EleveService();
export default eleveService;
