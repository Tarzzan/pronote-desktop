// Types Pronote basés sur la bibliothèque pronotepy

export interface Subject {
  id: string;
  name: string;
  groups: boolean;
}

export interface Lesson {
  id: string;
  subject: Subject | null;
  teacher_name: string | null;
  classroom: string | null;
  start: Date;
  end: Date;
  is_cancelled: boolean;
  is_outing: boolean;
  is_detention: boolean;
  is_exempted: boolean;
  background_color: string | null;
  status: string | null;
  group_name: string | null;
  group_names?: string[];
  teacher_names?: string[];
  classrooms?: string[];
  memo: string | null;
}

export interface Homework {
  id: string;
  subject: Subject;
  description: string;
  done: boolean;
  date: Date;
  files: Attachment[];
}

export interface Grade {
  id: string;
  grade: string;
  out_of: string;
  default_out_of: string;
  date: Date;
  subject: Subject;
  period: Period;
  average: string;
  max: string;
  min: string;
  coefficient: string;
  comment: string;
  is_bonus: boolean;
  is_optionnal: boolean;
  is_out_of_20: boolean;
}

export interface Average {
  student: string;
  class_average: string;
  max: string;
  min: string;
  out_of: string;
  default_out_of: string;
  subject: Subject;
  background_color: string;
}

export interface Period {
  id: string;
  name: string;
  start: Date;
  end: Date;
}

export interface Absence {
  id: string;
  from_date: Date;
  to_date: Date;
  justified: boolean;
  hours: string;
  days: number;
  reasons: string[];
}

export interface Delay {
  id: string;
  date: Date;
  minutes: number;
  justified: boolean;
  justification: string;
  reasons: string[];
}

export interface Message {
  id: string;
  author: string;
  content: string;
  date: Date;
  seen: boolean;
}

export interface Discussion {
  id: string;
  subject: string;
  creator: string;
  unread: boolean;
  date: Date;
  messages: Message[];
  participants: string[];
}

export interface Information {
  id: string;
  title: string;
  author: string;
  content: string;
  date: Date;
  read: boolean;
  category: string;
}

export interface Recipient {
  id: string;
  name: string;
  kind: string;
}

export interface MenuEntry {
  [key: string]: unknown;
}

export interface Attachment {
  name: string;
  id: string;
  url: string;
  type: 0 | 1; // 0 = lien, 1 = fichier
}

export interface ClientInfo {
  name: string;
  profile_picture_url: string | null;
  establishment: string;
  class_name: string | null;
}

export interface PronoteCredentials {
  pronote_url: string;
  username: string;
  password: string;
  uuid: string;
  client_identifier?: string;
  device_name?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  credentials: PronoteCredentials | null;
  clientInfo: ClientInfo | null;
  token: string | null;
}
