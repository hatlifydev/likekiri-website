# Integrar una app externa (askmypast) con la vigencia de LikeKiri

La app pregunta a LikeKiri si un cliente tiene plan vigente y **qué plan aplicar**.
LikeKiri ya resuelve la regla "sin plan / vencido → free".

## Endpoint

```
GET https://likekiri.com/modules/clientes/api/entitlement?email=CORREO_DEL_CLIENTE
Header  x-api-key: <API KEY del producto>   (askmypast: lk_askmypast_...)
```

- La API key identifica al producto y es **secreta**: usala desde el **backend** de la app.
- Desde navegador solo funciona si el origen está en "Orígenes permitidos" del producto
  (ya configurado: `https://askmypast.com`), y ahí la key queda expuesta a los usuarios;
  por eso lo recomendado es server-to-server.

## Respuesta

```json
{
  "producto": "askmypast",
  "email": "cliente@correo.com",
  "encontrado": true,
  "vigente": true,
  "plan": "premium",            // plan contratado (aunque esté vencido)
  "planEfectivo": "premium",    // lo que hay que APLICAR (free si venció o no existe)
  "premium": true,              // conveniencia: plan efectivo es premium u onpremise
  "onpremise": false,           // conveniencia: plan efectivo es onpremise
  "features": ["export_pdf"],   // features del plan efectivo (definidas en el generador)
  "cicloFacturacion": "anual",
  "finVigencia": "2027-06-07T..."
}
```

Regla de negocio (ya aplicada por LikeKiri):
- **Sin cliente / sin plan** → `planEfectivo: "free"`, `premium:false`, `onpremise:false`.
- **Plan vencido** (no vigente) → cae a `free` igual.
- **Vigente** → `planEfectivo` = el plan contratado.

## Snippet (backend Node/JS)

```js
const API_KEY = process.env.LIKEKIRI_API_KEY; // lk_askmypast_...
const ENDPOINT = 'https://likekiri.com/modules/clientes/api/entitlement';

/** Devuelve el entitlement del cliente; ante cualquier fallo, degrada a FREE. */
export async function obtenerVigencia(email) {
  try {
    const res = await fetch(`${ENDPOINT}?email=${encodeURIComponent(email)}`, {
      headers: { 'x-api-key': API_KEY },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return { planEfectivo: 'free', premium: false, onpremise: false, features: [] };
  }
}

// Uso al iniciar sesión / al cargar el usuario:
const ent = await obtenerVigencia(usuario.email);
usuario.premium = ent.premium;        // activa/desactiva funciones premium
usuario.onpremise = ent.onpremise;    // activa/desactiva on-premise
// o por feature concreta:
const puedeExportar = ent.features.includes('export_pdf');
```

## Recomendaciones

- **Cachear** el resultado por usuario unos minutos (p. ej. 5–10 min) para no consultar
  en cada request; refrescar al iniciar sesión.
- **Fail-safe a free**: si LikeKiri no responde, tratar al usuario como free (no romper la app).
- Guardar la key en el entorno del backend (no en el bundle del cliente).

---

# Sincronizar usuarios de Firebase con el registro de likekiri

Firebase = login/identidad; likekiri = plan/vigencia. Se unen por **email** y **UID de Firebase**.
Tres mecanismos (se pueden combinar):

## 1) Auto-alta al consultar (JIT) — sin tocar nada más
En `admin.likekiri.com → Clientes → (producto) → Ajustes`, activá **"Auto-alta como Free al consultar"**.
Con eso, cuando la app consulta la vigencia de un email/UID que no existe, likekiri lo crea como **Free**.
Para que quede bien identificado, la app debe pasar también `uid` y (opcional) `nombre`:

```
GET https://likekiri.com/modules/clientes/api/entitlement?email=CORREO&uid=FIREBASE_UID&nombre=NOMBRE
Header  x-api-key: <API KEY del producto>
```
(La respuesta trae `premium`/`onpremise`/`planEfectivo`/`features` como siempre.)

## 2) Push al registrarse — Cloud Function de Firebase
Crea/actualiza el cliente en likekiri apenas alguien se registra en Firebase.

Guardá la key como secreto (no la hardcodees):
```
firebase functions:config:set likekiri.api_key="lk_askmypast_..."
```

`functions/index.js` (Functions 1ª gen, trigger de Auth onCreate; runtime Node 18+ trae fetch global):
```js
const functions = require('firebase-functions');
const API_KEY = functions.config().likekiri.api_key;
const ENDPOINT = 'https://likekiri.com/modules/clientes/api/clients';

exports.syncClienteLikekiri = functions.auth.user().onCreate(async (user) => {
  if (!user.email) return;
  try {
    await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': API_KEY },
      body: JSON.stringify({ email: user.email, uid: user.uid, nombre: user.displayName || '' }),
    });
  } catch (e) { console.error('sync likekiri falló', e); }
});
```
Deploy: `firebase deploy --only functions:syncClienteLikekiri`.
(Alternativa 2ª gen: función bloqueante `beforeUserCreated` + `defineSecret('LIKEKIRI_API_KEY')`.)

El upsert es idempotente (por `producto`+`uid`, o `producto`+`email`); si mandás `plan`/`cicloFacturacion`
los aplica, si no, queda Free.

## 3) Backfill de los usuarios existentes
Exportá los usuarios de Firebase y empujalos al mismo endpoint:
```
firebase auth:export users.json --format=JSON
LIKEKIRI_API_KEY=lk_askmypast_... node backfill.mjs users.json
```

`backfill.mjs`:
```js
import fs from 'node:fs';
const API_KEY = process.env.LIKEKIRI_API_KEY;
const ENDPOINT = 'https://likekiri.com/modules/clientes/api/clients';
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const users = data.users || data;           // el export usa { users: [...] }
let ok = 0, fail = 0;
for (const u of users) {
  if (!u.email) continue;
  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': API_KEY },
      body: JSON.stringify({ email: u.email, uid: u.localId || u.uid, nombre: u.displayName || '' }),
    });
    r.ok ? ok++ : fail++;
  } catch { fail++; }
  await new Promise((r) => setTimeout(r, 50)); // throttle suave
}
console.log(`backfill: ${ok} ok, ${fail} fallidos`);
```

## Notas
- La key es la del producto (misma que `entitlement`), **secreta y server-side**. Rotable en el admin.
- Los clientes creados por sync no tienen contraseña de portal (no la necesitan; se autentican en Firebase).
- El vínculo estable es el `firebaseUid`; el email puede cambiar y el upsert lo actualiza sin duplicar.
