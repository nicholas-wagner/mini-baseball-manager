export type StatGrade = 'S+' | 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface GradeMeta {
  grade: StatGrade;
  bg: string;
  text: string;
}

export function getStatGrade(value: number): GradeMeta {
  const clamped = Math.max(0, Math.min(99, Math.round(value)));
  if (clamped >= 94) return { grade: 'S+', bg: '#FF4D6D', text: '#FFFFFF' };
  if (clamped >= 86) return { grade: 'S', bg: '#FFC300', text: '#181B2C' };
  if (clamped >= 75) return { grade: 'A', bg: '#2FB356', text: '#FFFFFF' };
  if (clamped >= 62) return { grade: 'B', bg: '#4CC3FF', text: '#181B2C' };
  if (clamped >= 48) return { grade: 'C', bg: '#F1E4C8', text: '#181B2C' };
  if (clamped >= 35) return { grade: 'D', bg: '#D98A4E', text: '#FFFFFF' };
  return { grade: 'F', bg: '#6C757D', text: '#FFFFFF' };
}
