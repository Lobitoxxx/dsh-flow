# dsh-flow

**Plugin para [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)**: un selector de modo de trabajo al lado del chip de permisos, con tres modos y un bloqueo real de la escritura cuando toca asesorar.

> A work-mode selector for DeepSeek Harness — **plan**, **build** or **advise** — with writing and editing genuinely blocked in advise mode.

- **Programa anfitrión:** DeepSeek Harness (`0.2.0-rc.2` o compatible).
- **Qué es este repositorio:** un *bundle* que se instala en un **perfil** del Harness.
- **Nombre del paquete:** `dsh-flow`.
- **Plataforma:** cualquiera.

## Los tres modos

| Modo | Para qué | Qué queda bloqueado |
|---|---|---|
| **Planear** | Pensar contigo: preguntar, debatir alternativas y dejar el plan por escrito | Escribir y editar archivos |
| **Construir** | Implementar: escribir, ejecutar, probar y verificar | Nada |
| **Asesorar** | Consultoría: leer, analizar, explicar y recomendar | **Escribir y editar, de verdad** |

El modo **planear no está reimplementado**: es el modo plan del propio Harness, así que conserva sus tarjetas en la conversación, su estado registrado por agente, su comando `/plan` y su salida revisada. `dsh-flow` solo lo manda y añade los otros dos modos al mismo control.

## Cómo se usa

- **El chip**, junto al de permisos («Full access») en la fila de herramientas del compositor: se pulsa, se elige modo y listo.
- **El comando** `/modo estado | planear | construir | asesorar`.
- **El usuario manda.** El plugin no cambia de modo por su cuenta; si el agente ve que conviene cambiar, lo propone y espera.

## Cómo funciona

| Pieza | Mecanismo |
|---|---|
| Estado del modo | Por agente, en memoria del host (`Map` agente → modo) |
| Bloqueo de escritura | `agent.ctx.tools.restrict({ deny: ['write', 'edit'] })`, una máscara de herramientas que se levanta al cambiar de modo |
| Comportamiento de asesorar | `agent.ctx.systemPrompt.section({ name, order, text })`, una sección de prompt por agente |
| Modo plan | Se delega: el host ejecuta `/plan on` o `/plan off` en el agente |
| Interfaz | Un chip desplegable en `conversation.input.left`, junto al grupo donde el compositor renderiza el chip de permisos y el de plan |

## Requisitos

- DeepSeek Harness `0.2.0-rc.2` o compatible: usa `ctx.commands`, `agent.ctx.systemPrompt.section` y `agent.ctx.tools.restrict`.
- Que el modo plan del Harness esté disponible (viene en el preset `standard` y en el preset `cordis` como grupo `planning`).

## Instalación

```sh
dsh plugin --profile desktop add github:Lobitoxxx/dsh-flow
```

1. **Reinicia la aplicación** una vez: la mitad de host es código de proceso.
2. La mitad de navegador entra al **refrescar la página**.

## Verificación

En `%USERPROFILE%\.dsh\dsh-flow.log`:

```
dsh-flow 1.0.0 activo (host; modos: planear, construir, asesorar)
comando /modo recibido: estado          ← el chip está montado y preguntando
modo asesorar aplicado | plan: ...
```

- La primera línea prueba que el host cargó.
- La segunda, que el chip del navegador renderizó.
- La tercera, que un cambio de modo se aplicó (y deja ver qué respondió el modo plan).

## Límites conocidos

- El bloqueo es real para las herramientas de archivo, pero **el shell sigue disponible** porque hace falta para leer cosas legítimas. Rodear el bloqueo escribiendo desde el shell queda prohibido por la sección de prompt, no por una barrera técnica.
- **El modo no sobrevive al reinicio**: al arrancar, todo agente está en «construir». El modo plan del Harness sí persiste, porque lo registra él.
- Los modos cambian el comportamiento por prompt y por herramientas disponibles; no son una jaula infalible, son un contrato claro.
- Los subagentes que lance el agente principal no heredan la máscara de herramientas.

## Licencia

MIT. Ver [LICENSE](LICENSE).
