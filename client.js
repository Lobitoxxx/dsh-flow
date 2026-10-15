/**
 * dsh-flow — mitad de CLIENTE (navegador).
 *
 * Un selector de modo con la misma forma que el chip de permisos («Full access»):
 * una barra compacta con icono, nombre del modo y flecha, que abre una lista
 * desplegable. Va en el asiento `conversation.input.plan`, que el compositor
 * renderiza **dentro del mismo grupo `.modes`** que el de permisos, es decir,
 * literalmente al lado.
 *
 * No decide nada por su cuenta: envía `/modo <x>` al host y lee `/modo estado`.
 */
window.__ModuleLoader__.load({
  id: 'dsh-flow',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const css = `
.df-wrap{position:relative;display:inline-flex;flex:none}
.df-chip{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 8px;border:1px solid var(--dsw-alias-border-secondary,ButtonBorder);border-radius:var(--dsw-radius-sm,6px);background:0 0;color:var(--dsw-alias-label-secondary,CanvasText);cursor:pointer;font:inherit;font-size:12px;line-height:1;white-space:nowrap}
.df-chip:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.18))}
.df-chip[data-mode="planear"]{color:#7C8CF8;border-color:color-mix(in srgb,#7C8CF8 45%,transparent)}
.df-chip[data-mode="construir"]{color:#3FB950;border-color:color-mix(in srgb,#3FB950 45%,transparent)}
.df-chip[data-mode="asesorar"]{color:var(--dsw-alias-label-secondary,CanvasText)}
.df-chip svg{width:14px;height:14px}
.df-caret{opacity:.65;font-size:9px}
.df-menu{position:fixed;z-index:90;min-width:268px;padding:6px;display:flex;flex-direction:column;gap:2px;border-radius:var(--dsw-radius-md,10px);background:var(--dsw-alias-bg-elevated,Canvas);border:1px solid var(--dsw-alias-border-secondary,ButtonBorder);box-shadow:0 12px 32px rgba(0,0,0,.34)}
.df-item{display:flex;align-items:flex-start;gap:8px;width:100%;padding:7px 9px;border:none;border-radius:var(--dsw-radius-sm,6px);background:0 0;color:var(--dsw-alias-label-primary,CanvasText);cursor:pointer;font:inherit;text-align:left}
.df-item:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.18))}
.df-item[data-active]{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.14))}
.df-check{width:14px;flex:none;color:#3FB950;font-size:11px;line-height:1.5}
.df-text{display:flex;flex-direction:column;gap:2px}
.df-name{font-size:12.5px;font-weight:600}
.df-desc{font-size:11px;color:var(--dsw-alias-label-tertiary,CanvasText);line-height:1.35}
.df-note{font-size:11px;color:var(--dsw-alias-label-tertiary,CanvasText);padding:5px 9px 3px;border-top:1px solid var(--dsw-alias-border-secondary,ButtonBorder);margin-top:3px}
`;

    const MODOS = [
      { id: 'planear', nombre: 'Planear', desc: 'Debatir y dejar el plan por escrito; no se toca código.' },
      { id: 'construir', nombre: 'Construir', desc: 'Implementar: escribir, ejecutar y verificar.' },
      { id: 'asesorar', nombre: 'Asesorar', desc: 'Leer, analizar y proponer; escritura y edición bloqueadas.' },
    ];

    function FlowIcon() {
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.9,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
        },
        h('circle', { cx: 6, cy: 6, r: 2.4 }),
        h('circle', { cx: 18, cy: 18, r: 2.4 }),
        h('path', { d: 'M8.4 6h5.1a4.5 4.5 0 0 1 0 9H10' }),
        h('path', { d: 'M10 12.5 8.2 15l1.8 2.5' }),
      );
    }

    /** Identidad del modo actual a partir de la respuesta del host. */
    function leerModo(texto) {
      try {
        const datos = JSON.parse(texto);
        if (datos && typeof datos.modo === 'string') return datos.modo;
      } catch (error) {
        /* respuesta ilegible: se deja el modo anterior */
      }
      return null;
    }

    function ModeSelect(props) {
      const { execute } = props;
      const wrapRef = React.useRef(null);
      const [modo, setModo] = React.useState(null);
      const [abierto, setAbierto] = React.useState(false);
      const [ancla, setAncla] = React.useState(null);
      const [nota, setNota] = React.useState('');
      const [ocupado, setOcupado] = React.useState(false);

      /** `execute` cambia de identidad en cada render: se guarda en un ref para que
       *  los callbacks sean estables y el efecto de montaje no se repita en bucle. */
      const executeRef = React.useRef(execute);
      executeRef.current = execute;

      const refrescar = React.useCallback(async () => {
        const resultado = await executeRef.current('/modo estado');
        if (resultado && resultado.ok && resultado.text) {
          const leido = leerModo(resultado.text);
          if (leido) setModo(leido);
          return leido;
        }
        if (resultado && resultado.error) setNota(String(resultado.error).slice(0, 120));
        return null;
      }, []);

      // Al montar: leer el estado. Eso mismo deja constancia en el registro del host
      // de que este chip llegó a renderizar.
      React.useEffect(() => {
        void refrescar();
      }, [refrescar]);

      React.useEffect(() => {
        if (!abierto) return undefined;
        const fuera = (evento) => {
          if (wrapRef.current && !wrapRef.current.contains(evento.target)) setAbierto(false);
        };
        const escape = (evento) => {
          if (evento.key === 'Escape') setAbierto(false);
        };
        const redimension = () => setAbierto(false);
        document.addEventListener('pointerdown', fuera);
        document.addEventListener('keydown', escape);
        window.addEventListener('resize', redimension);
        return () => {
          document.removeEventListener('pointerdown', fuera);
          document.removeEventListener('keydown', escape);
          window.removeEventListener('resize', redimension);
        };
      }, [abierto]);

      const abrir = () => {
        const el = wrapRef.current;
        if (el && typeof el.getBoundingClientRect === 'function') {
          const r = el.getBoundingClientRect();
          setAncla({
            left: Math.max(8, Math.round(r.left)),
            bottom: Math.max(8, Math.round(window.innerHeight - r.top + 8)),
          });
        }
        void refrescar();
        setAbierto(true);
      };

      const elegir = async (id) => {
        setOcupado(true);
        try {
          const resultado = await executeRef.current(`/modo ${id}`);
          if (resultado && resultado.ok) {
            setModo(id);
            setNota(resultado.text ? String(resultado.text).slice(0, 160) : '');
          } else {
            setNota(String((resultado && resultado.error) || 'no se pudo cambiar el modo').slice(0, 160));
          }
          await refrescar();
        } finally {
          setOcupado(false);
          setAbierto(false);
        }
      };

      const actual = MODOS.find((m) => m.id === modo) ?? null;
      const etiqueta = actual ? actual.nombre : modo ? modo : 'Modo';

      return h(
        React.Fragment,
        null,
        h('style', { 'data-plugin': 'dsh-flow', dangerouslySetInnerHTML: { __html: css } }),
        h(
          'span',
          { className: 'df-wrap', ref: wrapRef },
          h(
            'button',
            {
              type: 'button',
              className: 'df-chip',
              'data-mode': modo ?? undefined,
              'aria-haspopup': 'listbox',
              'aria-expanded': abierto,
              title: 'Modo de trabajo (dsh-flow)',
              disabled: ocupado,
              onClick: () => (abierto ? setAbierto(false) : abrir()),
            },
            h(FlowIcon, null),
            etiqueta,
            h('span', { className: 'df-caret' }, '▼'),
          ),
          abierto
            ? h(
                'div',
                {
                  className: 'df-menu',
                  role: 'listbox',
                  style: ancla
                    ? { left: `${ancla.left}px`, bottom: `${ancla.bottom}px` }
                    : { left: '12px', bottom: '80px' },
                },
                MODOS.map((m) =>
                  h(
                    'button',
                    {
                      key: m.id,
                      type: 'button',
                      className: 'df-item',
                      role: 'option',
                      'aria-selected': m.id === modo,
                      'data-active': m.id === modo || undefined,
                      disabled: ocupado,
                      onClick: () => void elegir(m.id),
                    },
                    h('span', { className: 'df-check' }, m.id === modo ? '✓' : ''),
                    h(
                      'span',
                      { className: 'df-text' },
                      h('span', { className: 'df-name' }, m.nombre),
                      h('span', { className: 'df-desc' }, m.desc),
                    ),
                  ),
                ),
                nota ? h('div', { className: 'df-note' }, nota) : null,
              )
            : null,
        ),
      );
    }

    return {
      inject: ['slots', 'remote', 'remote.commands'],
      apply(ctx) {
        ctx.slots.inject('conversation.input.plan', () =>
          ctx.slots.register(
            {
              name: 'conversation.input.left',
              inject: (sessionId) => ({
                execute: async (line) => {
                  try {
                    const resultado = await ctx.remote.commands.execute(sessionId, line, []);
                    if (!resultado || resultado.ok !== true) {
                      return {
                        ok: false,
                        error: resultado && resultado.error ? resultado.error.message : 'comando no disponible',
                      };
                    }
                    const valor = resultado.value;
                    return { ok: true, text: valor && typeof valor.text === 'string' ? valor.text : '' };
                  } catch (error) {
                    return { ok: false, error: String(error && error.message ? error.message : error) };
                  }
                },
              }),
            },
            ModeSelect,
          ),
        );
      },
    };
  },
});
