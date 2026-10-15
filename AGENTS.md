# Guía para agentes: instalar y configurar dsh-flow

Este repositorio es un **bundle de DeepSeek Harness** con dos mitades: host (`index.js`, que guarda el modo y aplica el bloqueo) y navegador (`client.js`, que dibuja el chip). Si un humano te pide instalarlo, sigue estos pasos y no improvises.

## 0. Comprueba antes de tocar nada

- ¿El Harness es `0.2.0-rc.2` o compatible? El plugin usa `ctx.commands.register`, `ctx.commands.execute`, `agent.ctx.systemPrompt.section` y `agent.ctx.tools.restrict`.
- ¿El perfil? La aplicación de escritorio usa `desktop`; `$env:DSH_PROFILE` lo dice.
- ¿Está disponible el modo plan del Harness? Sin él, el modo «planear» no tiene a quién delegar.

## 1. Instala con el gestor

```sh
dsh plugin --profile desktop add <ruta o github:usuario/repo>
```

No escribas el `package.json` ni el `cordis.patch.yml` del perfil a mano, y no uses pnpm directamente en el perfil.

## 2. Reinicia y refresca

- **Reinicio de la aplicación**: obligatorio para la mitad de host (código de proceso).
- **Refresco de la página**: necesario para que el chip entre en el grafo de clientes.

## 3. Verifica con evidencia

Registro `%USERPROFILE%\.dsh\dsh-flow.log`:

```
dsh-flow 1.0.0 activo (host; modos: planear, construir, asesorar)
comando /modo recibido: estado
modo asesorar aplicado
```

- Sin la primera línea, el host no cargó.
- Sin la segunda, **el chip no renderizó**: revisa que el bundle esté seleccionado, que la aplicación se haya reiniciado y que se haya refrescado la página.
- Si aparece `no se pudo bloquear la escritura: ...`, el nombre de alguna herramienta de la máscara no existe en esa instalación: mira el catálogo real antes de tocar `deny`.

**Prueba de fuego del bloqueo**: en modo asesorar, pide al agente que escriba un archivo. Debe negarse porque la herramienta no está disponible, no porque no quiera.

## 4. Configura

- El usuario cambia de modo con el chip o con `/modo <planear|construir|asesorar>`.
- El agente **no** cambia de modo por su cuenta: como mucho, lo propone.
- El comportamiento de cada modo vive en el host: el texto de asesorar está en `TEXTO_ASESOR` y la máscara en `aplicarModo`.

## 5. Diagnóstico rápido

| Síntoma | Comprobación |
|---|---|
| No aparece el chip | Refresco de página y reinicio; busca `comando /modo recibido: estado` en el registro |
| El chip está pero no cambia | Mira si `/modo <x>` devuelve error en el registro |
| No bloquea la escritura | Busca `no se pudo bloquear la escritura` en el registro |
| El modo plan no entra | El aviso va en la misma línea de `modo planear aplicado | plan: ...` |

## 6. Desinstalar

```sh
dsh plugin --profile desktop remove dsh-flow
```

## Reglas duras

- No edites el `app.asar` ni el código de DeepSeek Harness: todo se extiende desde el perfil.
- No prometas que el bloqueo impide escribir desde el shell: impide usar las herramientas de escritura y edición.
- Di siempre qué has verificado y qué no: el aspecto del chip necesita ojos humanos.
