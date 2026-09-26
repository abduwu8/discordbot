export type ResumeEntry = {
  organization: string;
  dates: string;
  title: string;
  details: string;
};

export type OptimizedResume = {
  name: string;
  title: string;
  phone: string;
  email: string;
  location: string;
  about: string;
  education: ResumeEntry[];
  experience: ResumeEntry[];
  skills: string[];
  improvements: string[];
};
