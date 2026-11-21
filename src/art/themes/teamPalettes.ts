export interface TeamColorScheme {
  id: string;
  name: string;
  city: string;
  mascot: string;
  monogram: string;
  primary: string;
  secondary: string;
  accent: string;
}

export const SAMPLE_TEAM_PALETTES: readonly TeamColorScheme[] = [
  {
    id: 'sandlot-comets',
    name: 'Comets',
    city: 'Sandlot',
    mascot: 'Comet',
    monogram: 'SC',
    primary: '#E63946',
    secondary: '#1D3557',
    accent: '#FFC300',
  },
  {
    id: 'bayview-pelicans',
    name: 'Pelicans',
    city: 'Bayview',
    mascot: 'Pelican',
    monogram: 'BP',
    primary: '#0096C7',
    secondary: '#023E8A',
    accent: '#FFD166',
  },
  {
    id: 'neon-geckos',
    name: 'Geckos',
    city: 'Citrus',
    mascot: 'Gecko',
    monogram: 'CG',
    primary: '#2FB356',
    secondary: '#1B4332',
    accent: '#FF4D6D',
  },
  {
    id: 'thunder-pugs',
    name: 'Pugs',
    city: 'Thunder',
    mascot: 'Pug',
    monogram: 'TP',
    primary: '#7209B7',
    secondary: '#240046',
    accent: '#00E5FF',
  },
  {
    id: 'sunset-sluggers',
    name: 'Sluggers',
    city: 'Sunset',
    mascot: 'Sun',
    monogram: 'SS',
    primary: '#F77F00',
    secondary: '#3D1E00',
    accent: '#FCBF49',
  },
] as const;
