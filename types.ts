
export type Language = 'en' | 'zh';
export type ViewMode = 'client' | 'staff';

export interface FormData {
  name: string;
  email: string;
  insurance: string;
  painArea: string[];
  painSide: string;
  duration: string;
  painDesc: string[];
  painLevel: number;
  activity: string;
  sitting: string;
  goals: string[];
  notes: string;
  consent: boolean;
}

export interface ClientRecord extends FormData {
  id: string;
  timestamp: string;
  aiResult?: string;
}

export interface Translation {
  lang_btn: string;
  title: string;
  subtitle: string;
  lbl_name: string;
  lbl_email: string;
  lbl_ins: string;
  privacy: string;
  lbl_area: string;
  lbl_side: string;
  lbl_duration: string;
  lbl_desc: string;
  lbl_level: string;
  lbl_job: string;
  lbl_sit: string;
  lbl_goal: string;
  lbl_note: string;
  lbl_consent: string;
  btn_submit: string;
  loading: string;
  success: string;
  result_title: string;
  btn_new: string;
  opt_area: string[];
  opt_side: string[];
  opt_dur: string[];
  opt_desc: string[];
  opt_job: string[];
  opt_goal: string[];
  opt_sit: string[];
  required_warning: string;
  consent_warning: string;
  nav_client: string;
  nav_staff: string;
  staff_title: string;
  btn_gen_report: string;
  btn_print: string;
  status_pending: string;
  status_done: string;
  no_records: string;
  lbl_clear_all: string;
}
