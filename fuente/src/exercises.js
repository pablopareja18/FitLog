// Biblioteca de ejercicios. [id, nombre, músculo principal, material, alias...]
export const MUSCLES = [
  'Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Antebrazo', 'Trapecio',
  'Cuádriceps', 'Isquios', 'Glúteos', 'Aductores', 'Gemelos', 'Abdomen', 'Lumbar', 'Cuerpo completo', 'Otro',
];

export const EQUIPMENT = ['Barra', 'Mancuernas', 'Máquina', 'Polea', 'Peso corporal', 'Multipower', 'Kettlebell', 'Barra Z', 'Otro'];

const RAW = [
  // Pecho
  ['press-banca', 'Press banca', 'Pecho', 'Barra', 'press de banca', 'bench press', 'press banca plano'],
  ['press-banca-mancuernas', 'Press banca con mancuernas', 'Pecho', 'Mancuernas'],
  ['press-inclinado-barra', 'Press inclinado con barra', 'Pecho', 'Barra', 'press inclinado', 'press banca inclinado'],
  ['press-inclinado-mancuernas', 'Press inclinado con mancuernas', 'Pecho', 'Mancuernas'],
  ['press-declinado', 'Press declinado con barra', 'Pecho', 'Barra', 'press declinado'],
  ['press-banca-multipower', 'Press banca en multipower', 'Pecho', 'Multipower'],
  ['press-inclinado-multipower', 'Press inclinado en multipower', 'Pecho', 'Multipower'],
  ['press-pecho-maquina', 'Press de pecho en máquina', 'Pecho', 'Máquina', 'chest press'],
  ['press-inclinado-maquina', 'Press inclinado en máquina', 'Pecho', 'Máquina'],
  ['aperturas-mancuernas', 'Aperturas con mancuernas', 'Pecho', 'Mancuernas', 'aperturas'],
  ['aperturas-inclinadas', 'Aperturas inclinadas con mancuernas', 'Pecho', 'Mancuernas'],
  ['cruces-polea', 'Cruces en polea', 'Pecho', 'Polea', 'cruce de poleas', 'crossover'],
  ['cruces-polea-baja', 'Cruces en polea baja', 'Pecho', 'Polea'],
  ['contractor-pecho', 'Contractor de pecho', 'Pecho', 'Máquina', 'pec deck', 'peck deck'],
  ['fondos-paralelas', 'Fondos en paralelas', 'Pecho', 'Peso corporal', 'fondos', 'dips'],
  ['flexiones', 'Flexiones', 'Pecho', 'Peso corporal', 'push ups', 'flexiones de pecho'],
  ['pullover-mancuerna', 'Pullover con mancuerna', 'Pecho', 'Mancuernas', 'pullover'],
  ['floor-press', 'Press en el suelo', 'Pecho', 'Barra', 'floor press'],
  ['press-squeeze', 'Press squeeze con mancuernas', 'Pecho', 'Mancuernas'],

  // Espalda
  ['dominadas', 'Dominadas', 'Espalda', 'Peso corporal', 'pull ups'],
  ['dominadas-supinas', 'Dominadas supinas', 'Espalda', 'Peso corporal', 'chin ups'],
  ['dominadas-lastradas', 'Dominadas lastradas', 'Espalda', 'Otro'],
  ['dominadas-asistidas', 'Dominadas asistidas', 'Espalda', 'Máquina'],
  ['jalon-pecho', 'Jalón al pecho', 'Espalda', 'Polea', 'jalon', 'jalón', 'lat pulldown', 'jalon al pecho'],
  ['jalon-estrecho', 'Jalón agarre estrecho', 'Espalda', 'Polea', 'jalón triángulo'],
  ['jalon-supino', 'Jalón supino', 'Espalda', 'Polea'],
  ['jalon-unilateral', 'Jalón unilateral', 'Espalda', 'Polea'],
  ['remo-barra', 'Remo con barra', 'Espalda', 'Barra', 'remo', 'barbell row'],
  ['remo-pendlay', 'Remo Pendlay', 'Espalda', 'Barra'],
  ['remo-mancuerna', 'Remo con mancuerna', 'Espalda', 'Mancuernas', 'remo unilateral'],
  ['remo-polea-baja', 'Remo en polea baja', 'Espalda', 'Polea', 'remo gironda', 'remo sentado'],
  ['remo-maquina', 'Remo en máquina', 'Espalda', 'Máquina'],
  ['remo-t', 'Remo en T', 'Espalda', 'Barra', 'remo t'],
  ['remo-pecho-apoyado', 'Remo con pecho apoyado', 'Espalda', 'Mancuernas', 'remo en banco inclinado'],
  ['remo-invertido', 'Remo invertido', 'Espalda', 'Peso corporal'],
  ['remo-seal', 'Remo Seal', 'Espalda', 'Barra', 'seal row'],
  ['pullover-polea', 'Pullover en polea', 'Espalda', 'Polea', 'pulldown brazos rectos'],
  ['peso-muerto', 'Peso muerto', 'Espalda', 'Barra', 'deadlift', 'peso muerto convencional'],
  ['rack-pull', 'Rack pull', 'Espalda', 'Barra'],
  ['hiperextensiones', 'Hiperextensiones', 'Lumbar', 'Peso corporal', 'extensiones lumbares'],
  ['buenos-dias', 'Buenos días', 'Isquios', 'Barra', 'good morning'],

  // Trapecio
  ['encogimientos-barra', 'Encogimientos con barra', 'Trapecio', 'Barra', 'encogimientos'],
  ['encogimientos-mancuernas', 'Encogimientos con mancuernas', 'Trapecio', 'Mancuernas'],

  // Hombros
  ['press-militar', 'Press militar', 'Hombros', 'Barra', 'press militar con barra', 'overhead press'],
  ['press-hombro-mancuernas', 'Press de hombro con mancuernas', 'Hombros', 'Mancuernas', 'press militar con mancuernas'],
  ['press-arnold', 'Press Arnold', 'Hombros', 'Mancuernas'],
  ['press-hombro-maquina', 'Press de hombro en máquina', 'Hombros', 'Máquina'],
  ['press-militar-multipower', 'Press militar en multipower', 'Hombros', 'Multipower'],
  ['elevaciones-laterales', 'Elevaciones laterales', 'Hombros', 'Mancuernas', 'laterales'],
  ['elevaciones-laterales-polea', 'Elevaciones laterales en polea', 'Hombros', 'Polea'],
  ['elevaciones-laterales-maquina', 'Elevaciones laterales en máquina', 'Hombros', 'Máquina'],
  ['elevaciones-frontales', 'Elevaciones frontales', 'Hombros', 'Mancuernas', 'frontales'],
  ['pajaros', 'Pájaros', 'Hombros', 'Mancuernas', 'elevaciones posteriores', 'vuelos posteriores'],
  ['contractor-inverso', 'Contractor inverso', 'Hombros', 'Máquina', 'reverse pec deck', 'deltoides posterior máquina'],
  ['face-pull', 'Face pull', 'Hombros', 'Polea', 'facepull', 'face pulls'],
  ['remo-menton', 'Remo al mentón', 'Hombros', 'Barra', 'upright row'],
  ['press-landmine', 'Press landmine', 'Hombros', 'Barra'],

  // Bíceps
  ['curl-barra', 'Curl con barra', 'Bíceps', 'Barra', 'curl barra'],
  ['curl-barra-z', 'Curl con barra Z', 'Bíceps', 'Barra Z'],
  ['curl-mancuernas', 'Curl con mancuernas', 'Bíceps', 'Mancuernas', 'curl bíceps', 'curl biceps', 'curl'],
  ['curl-martillo', 'Curl martillo', 'Bíceps', 'Mancuernas', 'hammer curl'],
  ['curl-inclinado', 'Curl inclinado con mancuernas', 'Bíceps', 'Mancuernas'],
  ['curl-predicador', 'Curl predicador', 'Bíceps', 'Barra Z', 'curl scott', 'banco scott'],
  ['curl-concentrado', 'Curl concentrado', 'Bíceps', 'Mancuernas'],
  ['curl-polea', 'Curl en polea', 'Bíceps', 'Polea'],
  ['curl-bayesian', 'Curl bayesian en polea', 'Bíceps', 'Polea'],
  ['curl-arana', 'Curl araña', 'Bíceps', 'Barra Z', 'spider curl'],
  ['curl-maquina', 'Curl en máquina', 'Bíceps', 'Máquina'],

  // Tríceps
  ['press-frances', 'Press francés', 'Tríceps', 'Barra Z', 'skull crusher', 'rompecráneos'],
  ['extension-triceps-polea', 'Extensión de tríceps en polea', 'Tríceps', 'Polea', 'tríceps polea', 'triceps polea', 'extensión tríceps', 'extension triceps', 'pushdown'],
  ['extension-triceps-cuerda', 'Extensión de tríceps con cuerda', 'Tríceps', 'Polea', 'tríceps cuerda'],
  ['extension-overhead-polea', 'Extensión sobre la cabeza en polea', 'Tríceps', 'Polea'],
  ['extension-overhead-mancuerna', 'Extensión sobre la cabeza con mancuerna', 'Tríceps', 'Mancuernas', 'copa', 'extensión trasnuca'],
  ['patada-triceps', 'Patada de tríceps', 'Tríceps', 'Mancuernas'],
  ['press-cerrado', 'Press banca agarre cerrado', 'Tríceps', 'Barra', 'press cerrado'],
  ['fondos-banco', 'Fondos en banco', 'Tríceps', 'Peso corporal'],
  ['flexiones-diamante', 'Flexiones diamante', 'Tríceps', 'Peso corporal'],
  ['extension-unilateral-polea', 'Extensión unilateral en polea', 'Tríceps', 'Polea'],

  // Antebrazo
  ['curl-muneca', 'Curl de muñeca', 'Antebrazo', 'Barra'],
  ['curl-muneca-inverso', 'Curl de muñeca inverso', 'Antebrazo', 'Barra'],
  ['curl-inverso', 'Curl inverso', 'Antebrazo', 'Barra Z'],
  ['paseo-granjero', 'Paseo del granjero', 'Antebrazo', 'Mancuernas', 'farmer walk'],

  // Cuádriceps
  ['sentadilla', 'Sentadilla', 'Cuádriceps', 'Barra', 'sentadilla trasera', 'squat', 'sentadilla con barra'],
  ['sentadilla-frontal', 'Sentadilla frontal', 'Cuádriceps', 'Barra', 'front squat'],
  ['sentadilla-goblet', 'Sentadilla goblet', 'Cuádriceps', 'Mancuernas'],
  ['sentadilla-hack', 'Sentadilla hack', 'Cuádriceps', 'Máquina', 'hack squat'],
  ['sentadilla-multipower', 'Sentadilla en multipower', 'Cuádriceps', 'Multipower'],
  ['sentadilla-pendulo', 'Sentadilla péndulo', 'Cuádriceps', 'Máquina'],
  ['sentadilla-bulgara', 'Sentadilla búlgara', 'Cuádriceps', 'Mancuernas', 'búlgaras', 'bulgaras', 'zancada búlgara', 'zancada bulgara'],
  ['prensa', 'Prensa de piernas', 'Cuádriceps', 'Máquina', 'prensa', 'leg press'],
  ['extension-cuadriceps', 'Extensión de cuádriceps', 'Cuádriceps', 'Máquina', 'extensiones', 'leg extension'],
  ['zancadas', 'Zancadas', 'Cuádriceps', 'Mancuernas', 'lunges'],
  ['zancadas-caminando', 'Zancadas caminando', 'Cuádriceps', 'Mancuernas'],
  ['step-up', 'Subida al cajón', 'Cuádriceps', 'Mancuernas', 'step up'],
  ['sissy-squat', 'Sissy squat', 'Cuádriceps', 'Peso corporal'],

  // Isquios
  ['peso-muerto-rumano', 'Peso muerto rumano', 'Isquios', 'Barra', 'rumano', 'rdl'],
  ['peso-muerto-rumano-mancuernas', 'Peso muerto rumano con mancuernas', 'Isquios', 'Mancuernas'],
  ['peso-muerto-piernas-rigidas', 'Peso muerto piernas rígidas', 'Isquios', 'Barra'],
  ['curl-femoral-tumbado', 'Curl femoral tumbado', 'Isquios', 'Máquina', 'femoral tumbado', 'curl femoral'],
  ['curl-femoral-sentado', 'Curl femoral sentado', 'Isquios', 'Máquina', 'femoral sentado'],
  ['curl-nordico', 'Curl nórdico', 'Isquios', 'Peso corporal', 'nordic curl'],

  // Glúteos
  ['hip-thrust', 'Hip thrust', 'Glúteos', 'Barra', 'hip thrust con barra', 'empuje de cadera'],
  ['hip-thrust-maquina', 'Hip thrust en máquina', 'Glúteos', 'Máquina'],
  ['puente-gluteo', 'Puente de glúteo', 'Glúteos', 'Peso corporal', 'glute bridge'],
  ['patada-gluteo-polea', 'Patada de glúteo en polea', 'Glúteos', 'Polea'],
  ['abduccion-maquina', 'Abducción de cadera en máquina', 'Glúteos', 'Máquina', 'abductores'],
  ['peso-muerto-sumo', 'Peso muerto sumo', 'Glúteos', 'Barra', 'sumo'],
  ['pull-through', 'Pull through en polea', 'Glúteos', 'Polea'],

  // Aductores
  ['aduccion-maquina', 'Aducción de cadera en máquina', 'Aductores', 'Máquina', 'aductores'],

  // Gemelos
  ['talones-pie', 'Elevación de talones de pie', 'Gemelos', 'Máquina', 'gemelos', 'gemelo de pie'],
  ['talones-sentado', 'Elevación de talones sentado', 'Gemelos', 'Máquina', 'gemelo sentado'],
  ['talones-prensa', 'Elevación de talones en prensa', 'Gemelos', 'Máquina'],

  // Abdomen
  ['plancha', 'Plancha', 'Abdomen', 'Peso corporal', 'plank'],
  ['plancha-lateral', 'Plancha lateral', 'Abdomen', 'Peso corporal'],
  ['crunch', 'Crunch abdominal', 'Abdomen', 'Peso corporal', 'crunch', 'abdominales'],
  ['crunch-polea', 'Crunch en polea', 'Abdomen', 'Polea', 'crunch polea'],
  ['crunch-maquina', 'Crunch en máquina', 'Abdomen', 'Máquina'],
  ['elevacion-piernas-colgado', 'Elevación de piernas colgado', 'Abdomen', 'Peso corporal', 'elevaciones de piernas'],
  ['rueda-abdominal', 'Rueda abdominal', 'Abdomen', 'Otro', 'ab wheel'],
  ['russian-twist', 'Giros rusos', 'Abdomen', 'Peso corporal', 'russian twist'],
  ['pallof', 'Press Pallof', 'Abdomen', 'Polea', 'pallof press'],
  ['dead-bug', 'Dead bug', 'Abdomen', 'Peso corporal'],

  // Peso corporal (planes en casa)
  ['sentadilla-peso-corporal', 'Sentadilla con peso corporal', 'Cuádriceps', 'Peso corporal', 'air squat'],
  ['zancada-peso-corporal', 'Zancadas con peso corporal', 'Cuádriceps', 'Peso corporal'],
  ['peso-muerto-una-pierna', 'Peso muerto a una pierna', 'Isquios', 'Peso corporal', 'peso muerto unilateral'],
  ['talones-peso-corporal', 'Elevación de talones a una pierna', 'Gemelos', 'Peso corporal'],
  ['flexiones-pica', 'Flexiones en pica', 'Hombros', 'Peso corporal', 'pike push up'],
  ['flexiones-declinadas', 'Flexiones declinadas', 'Pecho', 'Peso corporal'],
  ['puente-gluteo-una-pierna', 'Puente de glúteo a una pierna', 'Glúteos', 'Peso corporal'],
  ['dominadas-negativas', 'Dominadas negativas', 'Espalda', 'Peso corporal'],
  ['superman', 'Superman', 'Lumbar', 'Peso corporal'],
  ['ytw', 'Y-T-W tumbado', 'Hombros', 'Peso corporal', 'ytw'],
  // Cuerpo completo
  ['kettlebell-swing', 'Swing con kettlebell', 'Cuerpo completo', 'Kettlebell', 'kb swing'],
  ['thruster', 'Thruster', 'Cuerpo completo', 'Barra'],
  ['cargada-potencia', 'Cargada de potencia', 'Cuerpo completo', 'Barra', 'power clean'],
  ['burpees', 'Burpees', 'Cuerpo completo', 'Peso corporal'],
];

export const LIBRARY = RAW.map(([id, name, muscle, equipment, ...aliases]) => ({ id, name, muscle, equipment, aliases }));
export const LIBRARY_BY_ID = Object.fromEntries(LIBRARY.map(e => [e.id, e]));

export const norm = s => (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

const NAME_INDEX = new Map();
LIBRARY.forEach(e => {
  NAME_INDEX.set(norm(e.name), e.id);
  e.aliases.forEach(a => { if (!NAME_INDEX.has(norm(a))) NAME_INDEX.set(norm(a), e.id); });
});

export function findLibraryIdByName(name) {
  return NAME_INDEX.get(norm(name)) || null;
}

export function matchesQuery(ex, q) {
  const nq = norm(q);
  if (!nq) return true;
  const hay = norm([ex.name, ex.muscle, ex.equipment, ...(ex.aliases || [])].join(' '));
  return nq.split(' ').every(tok => hay.includes(tok));
}
