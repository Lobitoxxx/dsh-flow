/**
 * dsh-flow — mitad de HOST.
 *
 * Tres modos de trabajo por agente, con un solo control:
 *
 *   planear   → el modo plan del Harness: se debate y se deja el plan por escrito.
 *               No lo reimplemento: ejecuto su comando para conservar sus tarjetas,
 *               su estado registrado y su salida revisada.
 *   construir → modo normal: implementar.
 *   asesorar  → consultor: leer, analizar y proponer. Escritura y edición
 *               bloqueadas de verdad con una máscara de herramientas.
 *
 * APIs verificadas en esta instalación (0.2.0-rc.2):
 *   ctx.commands.register({ name, description, input, handler })
 *   ctx.commands.execute(agent, line, attachments, signal)
 *   agent.ctx.systemPrompt.section({ name, order, text })   // por agente
 *   agent.ctx.tools.restrict({ allow, deny })               // solo en contexto de agente
 *   ctx.on('agent/created', (agent) => ...)                 // para el ciclo de vida
 */
import { appendFileSync } from 'node:fs';

export const inject = ['commands'];

const PLANEAR = 'planear';
const CONSTRUIR = 'construir';
const ASESORAR = 'asesorar';
const MODOS = [PLANEAR, CONSTRUIR, ASESORAR];

const TEXTO_ASESOR = [
  'Estás en modo asesorar.',
  '',
  'Tu trabajo es entender, explicar y proponer: responde preguntas, analiza el código y el entorno, contrasta alternativas y recomienda con fundamento. Tienes las herramientas de lectura, búsqueda y ejecución de solo lectura.',
  '',
  'No puedes escribir ni editar archivos: esas herramientas están bloqueadas en esta sesión, no es una sugerencia. Si el trabajo exige cambiar algo, dilo con claridad, deja la propuesta lista y espera a que la persona cambie al modo construir. No intentes rodear el bloqueo con el shell.',
  '',
  'Formato: primero la respuesta, después la evidencia en la que te apoyas, y al final lo que no has podido comprobar.',
].join('\n');

export function apply(ctx, config) {
  const cfg = { logFile: '', ...(config ?? {}) };
  /** Modo por agente. Por defecto, construir. */
  const modos = new Map();
  /** Deshechadores por agente: se sueltan al cambiar de modo o al morir el agente. */
  const liberaciones = new Map();
  const offs = [];

  const log = (linea) => {
    if (!cfg.logFile) return;
    try {
      appendFileSync(cfg.logFile, `${new Date().toISOString()} ${linea}\n`, 'utf8');
    } catch {
      /* el registro nunca debe romper nada */
    }
  };

  const modoDe = (agent) => modos.get(agent) ?? CONSTRUIR;

  function soltar(agent) {
    for (const off of liberaciones.get(agent) ?? []) {
      try {
        off();
      } catch {
        /* ya retirado */
      }
    }
    liberaciones.delete(agent);
  }

  /** Aplica el modo: sección de prompt y máscara de herramientas según toque. */
  function aplicarModo(agent, modo) {
    soltar(agent);
    modos.set(agent, modo);
    if (modo !== ASESORAR) return;

    const deshechadores = [];
    try {
      const off = agent.ctx.systemPrompt.section({ name: 'modo:asesorar', order: 500, text: TEXTO_ASESOR });
      if (typeof off === 'function') deshechadores.push(off);
    } catch (error) {
      log(`no se pudo añadir la sección de asesorar: ${error?.message ?? error}`);
    }
    try {
      const off = agent.ctx.tools.restrict({ deny: ['write', 'edit'] });
      if (typeof off === 'function') deshechadores.push(off);
    } catch (error) {
      log(`no se pudo bloquear la escritura: ${error?.message ?? error}`);
    }
    liberaciones.set(agent, deshechadores);
  }

  /** El modo plan sigue siendo del Harness: se manda con su comando. */
  async function mandarPlan(agent, entrar) {
    try {
      const resultado = await ctx.commands.execute(agent, entrar ? '/plan on' : '/plan off', [], undefined);
      const valor = resultado && typeof resultado === 'object' && 'value' in resultado ? resultado.value : resultado;
      const texto = valor && typeof valor.text === 'string' ? valor.text : '';
      return { ok: true, texto };
    } catch (error) {
      return { ok: false, error: String(error?.message ?? error) };
    }
  }

  const normalizar = (bruto) => {
    const arg = String(bruto ?? '').trim().toLowerCase();
    if (!arg) return null;
    if (['planear', 'plan', 'pl', 'p'].includes(arg)) return PLANEAR;
    if (['construir', 'build', 'constr', 'c', 'b'].includes(arg)) return CONSTRUIR;
    if (['asesorar', 'asesor', 'consulta', 'consultar', 'a'].includes(arg)) return ASESORAR;
    return undefined;
  };

  try {
    const off = ctx.commands.register({
      name: 'modo',
      description: 'Cambia el modo de trabajo: planear, construir o asesorar',
      input: { hint: 'planear | construir | asesorar | estado' },
      handler: async ({ agent, rawInput } = {}) => {
        const arg = String(rawInput ?? '').trim().toLowerCase();
        log(`comando /modo recibido: ${arg || 'estado'}`);
        if (!agent) return { kind: 'error', text: 'El comando /modo necesita una sesión con agente.' };
        if (!arg || arg === 'estado') {
          return { kind: 'success', text: JSON.stringify({ modo: modoDe(agent), modos: MODOS }) };
        }
        const modo = normalizar(arg);
        if (modo === null || modo === undefined) {
          return {
            kind: 'error',
            text: `No conozco el modo «${arg}». Usa: planear, construir o asesorar.`,
          };
        }
        const plan = await mandarPlan(agent, modo === PLANEAR);
        aplicarModo(agent, modo);
        log(
          `modo ${modo} aplicado${plan.ok ? '' : ` (aviso al mandar /plan: ${plan.error})`}` +
            `${plan.texto ? ` | plan: ${plan.texto.slice(0, 120)}` : ''}`,
        );
        const aviso =
          modo === ASESORAR
            ? ' Escritura y edición bloqueadas.'
            : modo === PLANEAR
              ? ' Se debate y se deja el plan por escrito; no se toca código.'
              : ' Modo normal: implementación disponible.';
        return { kind: 'success', text: `Modo ${modo}.${aviso}` };
      },
    });
    if (typeof off === 'function') offs.push(off);
  } catch (error) {
    log(`no se pudo registrar /modo: ${error?.message ?? error}`);
  }

  try {
    // El evento entrega `{ agent }`, no el agente: de ahí venía el fallo anterior.
    const off = ctx.on('agent/created', ({ agent } = {}) => {
      if (!agent || !agent.ctx) return;
      try {
        agent.ctx.effect(() => () => {
          soltar(agent);
          modos.delete(agent);
        });
      } catch (error) {
        log(`no se pudo enganchar el ciclo de vida del agente: ${error?.message ?? error}`);
      }
    });
    if (typeof off === 'function') offs.push(off);
  } catch (error) {
    log(`no se pudo escuchar agent/created: ${error?.message ?? error}`);
  }

  log('dsh-flow 1.0.0 activo (host; modos: planear, construir, asesorar)');

  return () => {
    for (const off of offs) {
      try {
        off();
      } catch {
        /* ya retirado */
      }
    }
    for (const agent of [...liberaciones.keys()]) soltar(agent);
  };
}
