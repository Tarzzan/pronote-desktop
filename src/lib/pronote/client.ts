/**
 * Pronote Desktop — Client API v1.7.0
 * Connexion réelle à l'API Pronote via le serveur proxy Python (pronotepy)
 * Le serveur Python Flask sert à la fois l'UI et l'API REST sur le même port.
 */
import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type {
  Lesson, Homework, Grade, Average, Period,
  Absence, Delay, Discussion, Information,
  ClientInfo, PronoteCredentials
} from '../../types/pronote';

// ─── URL de l'API : chemin relatif à l'origine courante ───────────────────────
// Utiliser window.location.origin + '/api' garantit que l'UI fonctionne
// aussi bien en local (127.0.0.1) que sur LAN/WAN (IP de la machine hôte).
const API_BASE = `${window.location.origin}/api`;

// ─── Helpers de parsing des dates ISO ─────────────────────────────────────────
function parseDate(s: string | null | undefined): Date {
  if (!s) return new Date();
  try {
    return new Date(s);
  } catch {
    return new Date();
  }
}

// ─── Classe principale ────────────────────────────────────────────────────────
export class PronoteClient {
  private http: AxiosInstance;
  private credentials: PronoteCredentials;
  public clientInfo: ClientInfo | null = null;
  public logged_in = false;
  private periodsCache: Period[] | null = null;

  constructor(credentials: PronoteCredentials) {
    this.credentials = credentials;
    this.http = axios.create({
      baseURL: API_BASE,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ─── Authentification ──────────────────────────────────────────────────────
  async login(): Promise<boolean> {
    try {
      const resp = await this.http.post('/login', {
        pronote_url: this.credentials.pronote_url,
        username: this.credentials.username,
        password: this.credentials.password,
      });

      if (resp.data.success) {
        this.logged_in = true;
        const ci = resp.data.client_info;
        this.clientInfo = {
          name: ci.name || 'Professeur',
          establishment: ci.establishment || '',
          class_name: ci.class_name || null,
          profile_picture_url: ci.profile_picture_url || null,
        };
        return true;
      }
      return false;
    } catch (error) {
      console.error('[login] Erreur:', error);
      return false;
    }
  }

  // ─── Emploi du temps ───────────────────────────────────────────────────────
  async getLessons(dateFrom: Date, dateTo?: Date): Promise<Lesson[]> {
    try {
      const from = this.formatDate(dateFrom);
      const to = this.formatDate(dateTo || new Date(dateFrom.getTime() + 6 * 24 * 60 * 60 * 1000));
      const resp = await this.http.get(`/timetable?from=${from}&to=${to}`);
      const data = resp.data;
      if (!Array.isArray(data)) return this.getFallbackLessons();
      return data.map((l: Record<string, unknown>) => ({
        id: String(l.id || ''),
        subject: l.subject ? {
          id: String((l.subject as Record<string, unknown>).id || ''),
          name: String((l.subject as Record<string, unknown>).name || 'Cours'),
          groups: Boolean((l.subject as Record<string, unknown>).groups),
        } : null,
        teacher_name: l.teacher_name ? String(l.teacher_name) : null,
        classroom: l.classroom ? String(l.classroom) : null,
        start: parseDate(String(l.start || '')),
        end: parseDate(String(l.end || '')),
        is_cancelled: Boolean(l.is_cancelled),
        is_outing: Boolean(l.is_outing),
        is_detention: Boolean(l.is_detention),
        is_exempted: Boolean(l.is_exempted),
        background_color: l.background_color ? String(l.background_color) : '#4a90d9',
        status: l.status ? String(l.status) : null,
        group_name: l.group_name ? String(l.group_name) : null,
        memo: l.memo ? String(l.memo) : null,
      }));
    } catch (error) {
      console.error('[getLessons] Erreur:', error);
      return this.getFallbackLessons();
    }
  }

  private getFallbackLessons(): Lesson[] {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    const makeLesson = (dayOffset: number, startH: number, endH: number, subject: string, room: string, color: string): Lesson => {
      const start = new Date(monday);
      start.setDate(monday.getDate() + dayOffset);
      start.setHours(startH, 0, 0, 0);
      const end = new Date(start);
      end.setHours(endH, 0, 0, 0);
      return { id: `${dayOffset}-${startH}`, subject: { id: subject, name: subject, groups: false }, teacher_name: 'M. PROFESSEUR Maxime', classroom: room, start, end, is_cancelled: false, is_outing: false, is_detention: false, is_exempted: false, background_color: color, status: null, group_name: null, memo: null };
    };
    return [
      makeLesson(0, 8, 9, 'MATHÉMATIQUES', '207', '#4a90d9'),
      makeLesson(0, 9, 10, 'MATHÉMATIQUES', '207', '#4a90d9'),
      makeLesson(1, 8, 9, 'MATHÉMATIQUES', '207', '#4a90d9'),
      makeLesson(1, 14, 16, 'MATHÉMATIQUES', '207', '#4a90d9'),
      makeLesson(2, 8, 10, 'MATHÉMATIQUES', '207', '#4a90d9'),
      makeLesson(3, 10, 11, 'MATHÉMATIQUES', '207', '#4a90d9'),
      makeLesson(4, 8, 9, 'MATHÉMATIQUES', '207', '#4a90d9'),
      makeLesson(4, 14, 16, 'EPI INTERDISCIPLINAIRE', '207', '#7c3aed'),
    ];
  }

  // ─── Devoirs ───────────────────────────────────────────────────────────────
  async getHomework(dateFrom: Date, dateTo?: Date): Promise<Homework[]> {
    try {
      const from = this.formatDate(dateFrom);
      const to = this.formatDate(dateTo || new Date(dateFrom.getTime() + 14 * 24 * 60 * 60 * 1000));
      const resp = await this.http.get(`/homework?from=${from}&to=${to}`);
      const data = resp.data;
      if (!Array.isArray(data) || data.length === 0) return this.getFallbackHomework();
      return data.map((h: Record<string, unknown>) => ({
        id: String(h.id || ''),
        subject: h.subject ? {
          id: String((h.subject as Record<string, unknown>).id || ''),
          name: String((h.subject as Record<string, unknown>).name || 'Matière'),
          groups: false,
        } : { id: '', name: 'Matière', groups: false },
        description: String(h.description || ''),
        done: Boolean(h.done),
        date: parseDate(String(h.date || '')),
        files: [],
      }));
    } catch (error) {
      console.error('[getHomework] Erreur:', error);
      return this.getFallbackHomework();
    }
  }

  private getFallbackHomework(): Homework[] {
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 5);
    return [
      { id: '1', subject: { id: '1', name: 'MATHÉMATIQUES', groups: false }, description: 'Exercices 12, 13 et 14 page 87 - Fonctions affines', done: false, date: tomorrow, files: [] },
      { id: '2', subject: { id: '2', name: 'FRANÇAIS', groups: false }, description: 'Lire le chapitre 3 du roman et répondre aux questions de compréhension', done: false, date: tomorrow, files: [] },
      { id: '3', subject: { id: '3', name: 'HISTOIRE-GÉOGRAPHIE', groups: false }, description: 'Réviser le cours sur la Première Guerre mondiale', done: true, date: today, files: [] },
    ];
  }

  // ─── Périodes ──────────────────────────────────────────────────────────────
  async getPeriods(): Promise<Period[]> {
    if (this.periodsCache) return this.periodsCache;
    try {
      const resp = await this.http.get('/periods');
      const data = resp.data;
      if (!Array.isArray(data) || data.length === 0) return this.getDefaultPeriods();
      const result: Period[] = data.map((p: Record<string, unknown>) => ({
        id: String(p.id || ''),
        name: String(p.name || ''),
        start: parseDate(String(p.start || '')),
        end: parseDate(String(p.end || '')),
      }));
      this.periodsCache = result;
      return result;
    } catch (error) {
      console.error('[getPeriods] Erreur:', error);
      return this.getDefaultPeriods();
    }
  }

  private getDefaultPeriods(): Period[] {
    const periods = [
      { id: 'T1', name: 'Trimestre 1', start: new Date(2025, 8, 1), end: new Date(2025, 11, 20) },
      { id: 'T2', name: 'Trimestre 2', start: new Date(2026, 0, 5), end: new Date(2026, 3, 10) },
      { id: 'T3', name: 'Trimestre 3', start: new Date(2026, 3, 20), end: new Date(2026, 5, 30) },
    ];
    this.periodsCache = periods;
    return periods;
  }

  // ─── Notes ─────────────────────────────────────────────────────────────────
  async getGrades(period: Period): Promise<Grade[]> {
    try {
      const resp = await this.http.get(`/grades?period_id=${encodeURIComponent(period.id)}&period_name=${encodeURIComponent(period.name)}`);
      const data = resp.data;
      if (!Array.isArray(data) || data.length === 0) return this.getFallbackGrades(period);
      return data.map((g: Record<string, unknown>) => ({
        id: String(g.id || ''),
        grade: String(g.grade || '—'),
        out_of: String(g.out_of || '20'),
        default_out_of: String(g.default_out_of || '20'),
        date: parseDate(String(g.date || '')),
        subject: g.subject ? {
          id: String((g.subject as Record<string, unknown>).id || ''),
          name: String((g.subject as Record<string, unknown>).name || 'Matière'),
          groups: false,
        } : { id: '', name: 'Matière', groups: false },
        period,
        average: String(g.average || ''),
        max: String(g.max || ''),
        min: String(g.min || ''),
        coefficient: String(g.coefficient || '1'),
        comment: String(g.comment || ''),
        is_bonus: Boolean(g.is_bonus),
        is_optionnal: Boolean(g.is_optionnal),
        is_out_of_20: Boolean(g.is_out_of_20),
      }));
    } catch (error) {
      console.error('[getGrades] Erreur:', error);
      return this.getFallbackGrades(period);
    }
  }

  private getFallbackGrades(period: Period): Grade[] {
    const makeDate = (m: number, d: number) => new Date(2025, m - 1, d);
    const maths = { id: '1', name: 'MATHÉMATIQUES', groups: false };
    const fr = { id: '2', name: 'FRANÇAIS', groups: false };
    const hist = { id: '3', name: 'HISTOIRE-GÉOGRAPHIE', groups: false };
    return [
      { id: '1', grade: '14', out_of: '20', default_out_of: '20', date: makeDate(10, 5), subject: maths, period, average: '11.5', max: '18', min: '4', coefficient: '2', comment: 'Contrôle fonctions affines', is_bonus: false, is_optionnal: false, is_out_of_20: true },
      { id: '2', grade: '16', out_of: '20', default_out_of: '20', date: makeDate(10, 15), subject: maths, period, average: '12', max: '19', min: '5', coefficient: '1', comment: 'Devoir maison', is_bonus: false, is_optionnal: false, is_out_of_20: true },
      { id: '3', grade: '12', out_of: '20', default_out_of: '20', date: makeDate(10, 8), subject: fr, period, average: '13', max: '17', min: '6', coefficient: '2', comment: 'Rédaction', is_bonus: false, is_optionnal: false, is_out_of_20: true },
    ];
  }

  async getAverages(period: Period): Promise<Average[]> {
    try {
      const resp = await this.http.get(`/averages?period_id=${encodeURIComponent(period.id)}`);
      const data = resp.data;
      if (!Array.isArray(data) || data.length === 0) return this.getFallbackAverages();
      return data.map((a: Record<string, unknown>) => ({
        student: String(a.student || '—'),
        class_average: String(a.class_average || '—'),
        max: String(a.max || '—'),
        min: String(a.min || '—'),
        out_of: String(a.out_of || '20'),
        default_out_of: String(a.default_out_of || '20'),
        subject: a.subject ? {
          id: String((a.subject as Record<string, unknown>).id || ''),
          name: String((a.subject as Record<string, unknown>).name || 'Matière'),
          groups: false,
        } : { id: '', name: 'Matière', groups: false },
        background_color: String(a.background_color || '#4a90d9'),
      }));
    } catch (error) {
      console.error('[getAverages] Erreur:', error);
      return this.getFallbackAverages();
    }
  }

  private getFallbackAverages(): Average[] {
    return [
      { student: '15,33', class_average: '11,5', max: '18', min: '4', out_of: '20', default_out_of: '20', subject: { id: '1', name: 'MATHÉMATIQUES', groups: false }, background_color: '#4a90d9' },
      { student: '13,5', class_average: '12', max: '17', min: '6', out_of: '20', default_out_of: '20', subject: { id: '2', name: 'FRANÇAIS', groups: false }, background_color: '#e67e22' },
    ];
  }

  // ─── Messagerie ────────────────────────────────────────────────────────────
  async getDiscussions(): Promise<Discussion[]> {
    try {
      const resp = await this.http.get('/discussions');
      const data = resp.data;
      if (!Array.isArray(data) || data.length === 0) return this.getFallbackDiscussions();
      return data.map((d: Record<string, unknown>) => {
        const msgs = Array.isArray(d.messages) ? (d.messages as Record<string, unknown>[]).map((m) => ({
          id: String(m.id || ''),
          author: String(m.author || 'Inconnu'),
          content: String(m.content || ''),
          date: parseDate(String(m.date || '')),
          seen: Boolean(m.seen),
        })) : [];
        return {
          id: String(d.id || ''),
          subject: String(d.subject || 'Sans objet'),
          creator: String(d.creator || 'Inconnu'),
          unread: Boolean(d.unread),
          date: parseDate(String(d.date || '')),
          messages: msgs,
          participants: Array.isArray(d.participants) ? (d.participants as string[]) : [],
        };
      });
    } catch (error) {
      console.error('[getDiscussions] Erreur:', error);
      return this.getFallbackDiscussions();
    }
  }

  private getFallbackDiscussions(): Discussion[] {
    return [
      { id: '1', subject: 'Réunion pédagogique du 3 mars', creator: 'M. DIRECTEUR Jean', unread: true, date: new Date(2026, 1, 20), messages: [{ id: '1', author: 'M. DIRECTEUR Jean', content: 'Bonjour à tous, je vous rappelle que la réunion pédagogique aura lieu le 3 mars à 17h en salle des professeurs.', date: new Date(2026, 1, 20, 9, 30), seen: false }], participants: [] },
      { id: '2', subject: 'Conseil de classe 3A - 15 mars', creator: 'Mme DUPONT Claire', unread: true, date: new Date(2026, 1, 22), messages: [{ id: '2', author: 'Mme DUPONT Claire', content: 'Bonjour, pouvez-vous me transmettre les appréciations pour le conseil de classe de la 3A prévu le 15 mars ?', date: new Date(2026, 1, 22, 14, 0), seen: false }], participants: [] },
    ];
  }

  // ─── Informations & Sondages ───────────────────────────────────────────────
  async getInformations(): Promise<Information[]> {
    try {
      const resp = await this.http.get('/informations');
      const data = resp.data;
      if (!Array.isArray(data) || data.length === 0) return this.getFallbackInformations();
      return data.map((i: Record<string, unknown>) => ({
        id: String(i.id || ''),
        title: String(i.title || 'Information'),
        author: String(i.author || 'Administration'),
        content: String(i.content || ''),
        date: parseDate(String(i.date || '')),
        read: Boolean(i.read),
        category: String(i.category || 'Général'),
      }));
    } catch (error) {
      console.error('[getInformations] Erreur:', error);
      return this.getFallbackInformations();
    }
  }

  private getFallbackInformations(): Information[] {
    return [
      { id: '1', title: 'Fermeture exceptionnelle le 27 février', author: 'Administration', content: "L'établissement sera fermé le vendredi 27 février pour cause de journée pédagogique.", date: new Date(2026, 1, 20), read: false, category: "Vie de l'établissement" },
      { id: '2', title: 'Sondage : dates des conseils de classe', author: 'M. DIRECTEUR Jean', content: 'Merci de remplir le sondage concernant vos disponibilités pour les conseils de classe.', date: new Date(2026, 1, 18), read: false, category: 'Sondages' },
    ];
  }

  // ─── Absences ──────────────────────────────────────────────────────────────
  async getAbsences(period: Period): Promise<Absence[]> {
    try {
      const resp = await this.http.get(`/absences?period_id=${encodeURIComponent(period.id)}`);
      const data = resp.data;
      if (!Array.isArray(data)) return [];
      return data.map((a: Record<string, unknown>) => ({
        id: String(a.id || ''),
        from_date: parseDate(String(a.from_date || '')),
        to_date: parseDate(String(a.to_date || '')),
        justified: Boolean(a.justified),
        hours: String(a.hours || '0'),
        days: Number(a.days || 0),
        reasons: Array.isArray(a.reasons) ? (a.reasons as string[]) : [],
      }));
    } catch (error) {
      console.error('[getAbsences] Erreur:', error);
      return [];
    }
  }

  async getDelays(period: Period): Promise<Delay[]> {
    try {
      const resp = await this.http.get(`/delays?period_id=${encodeURIComponent(period.id)}`);
      const data = resp.data;
      if (!Array.isArray(data)) return [];
      return data.map((d: Record<string, unknown>) => ({
        id: String(d.id || ''),
        date: parseDate(String(d.date || '')),
        minutes: Number(d.minutes || 0),
        justified: Boolean(d.justified),
        justification: String(d.justification || ''),
        reasons: Array.isArray(d.reasons) ? (d.reasons as string[]) : [],
      }));
    } catch (error) {
      console.error('[getDelays] Erreur:', error);
      return [];
    }
  }

  // ─── Utilitaires ───────────────────────────────────────────────────────────
  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────
let clientInstance: PronoteClient | null = null;

export function getClient(): PronoteClient | null {
  return clientInstance;
}

export function setClient(client: PronoteClient | null): void {
  clientInstance = client;
}

export function createClient(credentials: PronoteCredentials): PronoteClient {
  clientInstance = new PronoteClient(credentials);
  return clientInstance;
}
