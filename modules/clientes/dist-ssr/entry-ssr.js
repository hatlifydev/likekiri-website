import { createElement, useCallback, useEffect, useState } from "react";
import { renderToString } from "react-dom/server";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/api.ts
/**
* Cliente HTTP del módulo. La API es DEL MÓDULO (server.mjs), no del core:
* Caddy la expone bajo /modules/clientes/api en ambos orígenes, así que la
* misma ruta relativa sirve para las islas del front (likekiri.com) y para
* las páginas del admin (admin.likekiri.com), cada una con su propia sesión.
*/
var BASE = "/modules/clientes/api";
var ApiError = class extends Error {
	status;
	constructor(status, message) {
		super(message);
		this.status = status;
	}
};
async function request(path, init = {}) {
	const response = await fetch(`${BASE}${path}`, {
		credentials: "same-origin",
		...init,
		headers: init.body !== void 0 ? { "content-type": "application/json" } : void 0
	});
	if (!response.ok) {
		let message = `error ${response.status}`;
		try {
			const data = await response.json();
			if (typeof data.message === "string") message = data.message;
		} catch {}
		throw new ApiError(response.status, message);
	}
	return await response.json();
}
var post = (path, body) => request(path, {
	method: "POST",
	body: JSON.stringify(body ?? {})
});
var put = (path, body) => request(path, {
	method: "PUT",
	body: JSON.stringify(body ?? {})
});
var del = (path) => request(path, { method: "DELETE" });
var api = {
	registro: (datos) => post("/registro", datos),
	acceso: (email, password) => post("/acceso", {
		email,
		password
	}),
	salir: () => post("/salir", {}),
	miCuenta: () => request("/mi-cuenta"),
	cambiarPlan: (plan) => post("/cambiar-plan", { plan }),
	adminCuentas: () => request("/admin/cuentas"),
	adminFacturas: () => request("/admin/facturas"),
	adminCambiarPlan: (id, plan) => post(`/admin/cuentas/${id}/plan`, { plan }),
	adminEstado: (id, activo) => post(`/admin/cuentas/${id}/estado`, { activo }),
	adminProductos: () => request("/admin/productos"),
	adminRotarApiKey: (slug) => post(`/admin/productos/${slug}/rotar-apikey`, {}),
	adminActualizarProducto: (slug, origenesPermitidos) => put(`/admin/productos/${slug}`, { origenesPermitidos }),
	adminClientesDeProducto: (slug) => request(`/admin/cuentas?producto=${encodeURIComponent(slug)}`),
	adminCrearCliente: (datos) => post("/admin/cuentas", datos),
	adminEditarCliente: (id, datos) => put(`/admin/cuentas/${id}`, datos),
	adminEliminarCliente: (id) => del(`/admin/cuentas/${id}`),
	adminPlanes: () => request("/admin/planes"),
	adminCrearPlan: (datos) => post("/admin/planes", datos),
	adminEditarPlan: (id, datos) => put(`/admin/planes/${id}`, datos),
	adminEliminarPlan: (id) => del(`/admin/planes/${id}`),
	adminAsociarPlanes: (slug, planIds) => put(`/admin/productos/${slug}/planes`, { planIds })
};
//#endregion
//#region src/planes.ts
var PLANES = [
	{
		id: "gratis",
		nombre: "Gratis",
		precio: 0,
		descripcion: "Simuladores, material público y boletín técnico."
	},
	{
		id: "profesional",
		nombre: "Profesional",
		precio: 29990,
		descripcion: "Automatizaciones personales, asistente con tus documentos y soporte por correo."
	},
	{
		id: "empresa",
		nombre: "Empresa",
		precio: 189990,
		descripcion: "Procesos a medida, SLA, cumplimiento y modelos on-premise."
	}
];
function formatoCLP(monto) {
	return monto === 0 ? "Gratis" : `$${monto.toLocaleString("es-CL")} /mes`;
}
var TIPOS = [{
	id: "persona",
	nombre: "Persona",
	descripcion: "Profesional independiente o equipo pequeño."
}, {
	id: "empresa",
	nombre: "Empresa",
	descripcion: "Organización con procesos y datos regulados."
}];
/** Planes sugeridos según el tipo (el server acepta cualquiera del catálogo). */
var PLANES_POR_TIPO = {
	persona: ["gratis", "profesional"],
	empresa: ["profesional", "empresa"]
};
//#endregion
//#region src/RegistroIsland.tsx
/** Isla pública: alta de una cuenta de cliente con elección de plan. */
function RegistroIsland() {
	const [nombre, setNombre] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [tipo, setTipo] = useState("persona");
	const [plan, setPlan] = useState("gratis");
	const [error, setError] = useState(null);
	const [busy, setBusy] = useState(false);
	const [creada, setCreada] = useState(false);
	const submit = async (event) => {
		event.preventDefault();
		setBusy(true);
		setError(null);
		try {
			await api.registro({
				nombre,
				email,
				password,
				plan,
				tipo
			});
			setCreada(true);
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "no se pudo crear la cuenta");
		} finally {
			setBusy(false);
		}
	};
	if (creada) return /* @__PURE__ */ jsxs("section", {
		style: { maxWidth: "30rem" },
		children: [
			/* @__PURE__ */ jsx("h1", { children: "Cuenta creada" }),
			/* @__PURE__ */ jsx("p", {
				style: {
					color: "var(--lk-color-textMuted)",
					margin: "0.75rem 0 1.5rem"
				},
				children: "Ya tienes acceso al portal de clientes con el plan elegido."
			}),
			/* @__PURE__ */ jsx("a", {
				className: "boton",
				href: "/clientes/portal",
				children: "Ir a mi portal"
			})
		]
	});
	return /* @__PURE__ */ jsxs("section", {
		style: { maxWidth: "34rem" },
		children: [
			/* @__PURE__ */ jsx("h1", {
				style: { letterSpacing: "-0.02em" },
				children: "Crea tu cuenta"
			}),
			/* @__PURE__ */ jsx("p", {
				style: {
					color: "var(--lk-color-textMuted)",
					margin: "0.5rem 0 1.5rem"
				},
				children: "Elige un plan (puedes cambiarlo cuando quieras) y define tu contraseña."
			}),
			/* @__PURE__ */ jsxs("form", {
				onSubmit: (e) => void submit(e),
				style: {
					display: "flex",
					flexDirection: "column",
					gap: "1rem"
				},
				children: [
					/* @__PURE__ */ jsxs("label", { children: ["Nombre", /* @__PURE__ */ jsx("input", {
						value: nombre,
						onChange: (e) => setNombre(e.target.value),
						required: true,
						minLength: 2,
						style: campo$1
					})] }),
					/* @__PURE__ */ jsxs("label", { children: ["Correo", /* @__PURE__ */ jsx("input", {
						type: "email",
						autoComplete: "username",
						value: email,
						onChange: (e) => setEmail(e.target.value),
						required: true,
						style: campo$1
					})] }),
					/* @__PURE__ */ jsxs("label", { children: ["Contraseña (mínimo 12 caracteres)", /* @__PURE__ */ jsx("input", {
						type: "password",
						autoComplete: "new-password",
						value: password,
						onChange: (e) => setPassword(e.target.value),
						required: true,
						minLength: 12,
						style: campo$1
					})] }),
					/* @__PURE__ */ jsxs("fieldset", {
						style: {
							border: "none",
							padding: 0,
							margin: 0
						},
						children: [/* @__PURE__ */ jsx("legend", {
							style: { marginBottom: "0.5rem" },
							children: "Tipo de cuenta"
						}), /* @__PURE__ */ jsx("div", {
							style: {
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: "0.6rem"
							},
							children: TIPOS.map((opcion) => /* @__PURE__ */ jsxs("label", {
								style: {
									border: `1px solid ${tipo === opcion.id ? "var(--lk-color-brand)" : "var(--lk-color-border)"}`,
									borderRadius: "var(--lk-radius-md)",
									padding: "0.75rem 1rem",
									cursor: "pointer"
								},
								children: [
									/* @__PURE__ */ jsx("input", {
										type: "radio",
										name: "tipo",
										checked: tipo === opcion.id,
										onChange: () => {
											setTipo(opcion.id);
											const sugeridos = PLANES_POR_TIPO[opcion.id];
											if (!sugeridos.includes(plan)) setPlan(sugeridos[0] ?? "gratis");
										},
										style: { marginRight: "0.5rem" }
									}),
									/* @__PURE__ */ jsx("strong", { children: opcion.nombre }),
									/* @__PURE__ */ jsx("div", {
										style: {
											color: "var(--lk-color-textMuted)",
											fontSize: "0.88rem"
										},
										children: opcion.descripcion
									})
								]
							}, opcion.id))
						})]
					}),
					/* @__PURE__ */ jsxs("fieldset", {
						style: {
							border: "none",
							padding: 0,
							margin: 0
						},
						children: [/* @__PURE__ */ jsx("legend", {
							style: { marginBottom: "0.5rem" },
							children: "Plan"
						}), /* @__PURE__ */ jsx("div", {
							style: {
								display: "grid",
								gap: "0.6rem"
							},
							children: PLANES.filter((p) => PLANES_POR_TIPO[tipo].includes(p.id)).map((opcion) => /* @__PURE__ */ jsxs("label", {
								style: {
									display: "flex",
									gap: "0.75rem",
									alignItems: "flex-start",
									border: `1px solid ${plan === opcion.id ? "var(--lk-color-brand)" : "var(--lk-color-border)"}`,
									borderRadius: "var(--lk-radius-md)",
									padding: "0.75rem 1rem",
									cursor: "pointer"
								},
								children: [/* @__PURE__ */ jsx("input", {
									type: "radio",
									name: "plan",
									checked: plan === opcion.id,
									onChange: () => setPlan(opcion.id),
									style: { marginTop: "0.3rem" }
								}), /* @__PURE__ */ jsxs("span", { children: [
									/* @__PURE__ */ jsx("strong", { children: opcion.nombre }),
									" ",
									/* @__PURE__ */ jsx("span", {
										style: { color: "var(--lk-color-brand)" },
										children: formatoCLP(opcion.precio)
									}),
									/* @__PURE__ */ jsx("br", {}),
									/* @__PURE__ */ jsx("span", {
										style: {
											color: "var(--lk-color-textMuted)",
											fontSize: "0.92rem"
										},
										children: opcion.descripcion
									})
								] })]
							}, opcion.id))
						})]
					}),
					error !== null && /* @__PURE__ */ jsx("div", {
						style: { color: "var(--lk-color-danger)" },
						children: error
					}),
					/* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx("button", {
						className: "boton",
						type: "submit",
						disabled: busy,
						children: busy ? "Creando…" : "Crear cuenta"
					}) }),
					/* @__PURE__ */ jsxs("p", {
						style: {
							color: "var(--lk-color-textMuted)",
							fontSize: "0.92rem"
						},
						children: [
							"¿Ya tienes cuenta? ",
							/* @__PURE__ */ jsx("a", {
								href: "/clientes/acceso",
								children: "Inicia sesión"
							}),
							"."
						]
					})
				]
			})
		]
	});
}
var campo$1 = {
	display: "block",
	width: "100%",
	marginTop: "0.3rem",
	padding: "0.55rem 0.7rem",
	border: "1px solid var(--lk-color-border)",
	borderRadius: "var(--lk-radius-md)",
	font: "inherit"
};
//#endregion
//#region src/AccesoIsland.tsx
/** Isla pública: acceso de clientes (sesión propia del módulo, no del admin). */
function AccesoIsland() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState(null);
	const [busy, setBusy] = useState(false);
	const submit = async (event) => {
		event.preventDefault();
		setBusy(true);
		setError(null);
		try {
			await api.acceso(email, password);
			window.location.href = "/clientes/portal";
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "no se pudo iniciar sesión");
			setBusy(false);
		}
	};
	return /* @__PURE__ */ jsxs("section", {
		style: { maxWidth: "26rem" },
		children: [
			/* @__PURE__ */ jsx("h1", {
				style: { letterSpacing: "-0.02em" },
				children: "Portal de clientes"
			}),
			/* @__PURE__ */ jsx("p", {
				style: {
					color: "var(--lk-color-textMuted)",
					margin: "0.5rem 0 1.5rem"
				},
				children: "Accede para ver tu plan y tu facturación."
			}),
			/* @__PURE__ */ jsxs("form", {
				onSubmit: (e) => void submit(e),
				style: {
					display: "flex",
					flexDirection: "column",
					gap: "1rem"
				},
				children: [
					/* @__PURE__ */ jsxs("label", { children: ["Correo", /* @__PURE__ */ jsx("input", {
						type: "email",
						autoComplete: "username",
						value: email,
						onChange: (e) => setEmail(e.target.value),
						required: true,
						style: campo
					})] }),
					/* @__PURE__ */ jsxs("label", { children: ["Contraseña", /* @__PURE__ */ jsx("input", {
						type: "password",
						autoComplete: "current-password",
						value: password,
						onChange: (e) => setPassword(e.target.value),
						required: true,
						style: campo
					})] }),
					error !== null && /* @__PURE__ */ jsx("div", {
						style: { color: "var(--lk-color-danger)" },
						children: error
					}),
					/* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx("button", {
						className: "boton",
						type: "submit",
						disabled: busy,
						children: busy ? "Entrando…" : "Entrar"
					}) }),
					/* @__PURE__ */ jsxs("p", {
						style: {
							color: "var(--lk-color-textMuted)",
							fontSize: "0.92rem"
						},
						children: [
							"¿Aún sin cuenta? ",
							/* @__PURE__ */ jsx("a", {
								href: "/clientes/registro",
								children: "Regístrate"
							}),
							"."
						]
					})
				]
			})
		]
	});
}
var campo = {
	display: "block",
	width: "100%",
	marginTop: "0.3rem",
	padding: "0.55rem 0.7rem",
	border: "1px solid var(--lk-color-border)",
	borderRadius: "var(--lk-radius-md)",
	font: "inherit"
};
//#endregion
//#region src/PortalIsland.tsx
/**
* Isla pública: el portal del cliente. Muestra plan, estado y facturación, y
* permite cambiar de plan o cerrar sesión. Si no hay sesión de cliente,
* ofrece acceso/registro (la isla decide; el SSR solo puso el placeholder).
*/
function PortalIsland() {
	const [estado, setEstado] = useState({ fase: "cargando" });
	const [planNuevo, setPlanNuevo] = useState("");
	const [error, setError] = useState(null);
	const cargar = useCallback(() => {
		api.miCuenta().then((datos) => setEstado({
			fase: "dentro",
			datos
		})).catch(() => setEstado({ fase: "anonimo" }));
	}, []);
	useEffect(cargar, [cargar]);
	if (estado.fase === "cargando") return /* @__PURE__ */ jsx("p", {
		style: { color: "var(--lk-color-textMuted)" },
		children: "Cargando tu cuenta…"
	});
	if (estado.fase === "anonimo") return /* @__PURE__ */ jsxs("section", {
		style: { maxWidth: "30rem" },
		children: [
			/* @__PURE__ */ jsx("h1", { children: "Portal de clientes" }),
			/* @__PURE__ */ jsx("p", {
				style: {
					color: "var(--lk-color-textMuted)",
					margin: "0.75rem 0 1.5rem"
				},
				children: "Necesitas una sesión activa para ver tu cuenta."
			}),
			/* @__PURE__ */ jsxs("p", {
				style: {
					display: "flex",
					gap: "0.75rem"
				},
				children: [/* @__PURE__ */ jsx("a", {
					className: "boton",
					href: "/clientes/acceso",
					children: "Iniciar sesión"
				}), /* @__PURE__ */ jsx("a", {
					className: "boton secundario",
					href: "/clientes/registro",
					children: "Crear cuenta"
				})]
			})
		]
	});
	const { cuenta, facturas } = estado.datos;
	const plan = PLANES.find((p) => p.id === cuenta.plan);
	const cambiar = async () => {
		if (planNuevo === "" || planNuevo === cuenta.plan) return;
		setError(null);
		try {
			const datos = await api.cambiarPlan(planNuevo);
			setEstado({
				fase: "dentro",
				datos
			});
			setPlanNuevo("");
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "no se pudo cambiar el plan");
		}
	};
	const salir = async () => {
		await api.salir().catch(() => void 0);
		window.location.href = "/clientes/acceso";
	};
	return /* @__PURE__ */ jsxs("section", {
		style: { maxWidth: "40rem" },
		children: [
			/* @__PURE__ */ jsxs("h1", {
				style: { letterSpacing: "-0.02em" },
				children: ["Hola, ", cuenta.nombre]
			}),
			/* @__PURE__ */ jsxs("p", {
				style: {
					color: "var(--lk-color-textMuted)",
					margin: "0.5rem 0 1.5rem"
				},
				children: [
					cuenta.email,
					" · cuenta",
					" ",
					/* @__PURE__ */ jsx("strong", { children: TIPOS.find((t) => t.id === cuenta.tipo)?.nombre ?? cuenta.tipo }),
					" · cliente desde ",
					new Date(cuenta.creadaEn).toLocaleDateString("es-CL")
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				style: {
					border: "1px solid var(--lk-color-border)",
					borderRadius: "var(--lk-radius-lg)",
					padding: "1.25rem 1.5rem",
					marginBottom: "1.5rem",
					background: "var(--lk-color-surface)"
				},
				children: [
					/* @__PURE__ */ jsx("div", {
						style: {
							fontSize: "0.85rem",
							textTransform: "uppercase",
							letterSpacing: "0.05em",
							color: "var(--lk-color-brand)",
							fontWeight: 600
						},
						children: "Plan contratado"
					}),
					/* @__PURE__ */ jsxs("div", {
						style: {
							fontSize: "1.6rem",
							fontWeight: 700
						},
						children: [
							plan?.nombre ?? cuenta.plan,
							" ",
							/* @__PURE__ */ jsx("span", {
								style: {
									fontSize: "1rem",
									color: "var(--lk-color-textMuted)",
									fontWeight: 400
								},
								children: plan ? formatoCLP(plan.precio) : ""
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						style: {
							display: "flex",
							gap: "0.6rem",
							marginTop: "1rem",
							flexWrap: "wrap"
						},
						children: [/* @__PURE__ */ jsxs("select", {
							value: planNuevo,
							onChange: (e) => setPlanNuevo(e.target.value),
							style: {
								padding: "0.5rem",
								border: "1px solid var(--lk-color-border)",
								borderRadius: "var(--lk-radius-md)",
								font: "inherit"
							},
							children: [/* @__PURE__ */ jsx("option", {
								value: "",
								children: "Cambiar de plan…"
							}), PLANES.filter((p) => p.id !== cuenta.plan).map((p) => /* @__PURE__ */ jsxs("option", {
								value: p.id,
								children: [
									p.nombre,
									" — ",
									formatoCLP(p.precio)
								]
							}, p.id))]
						}), /* @__PURE__ */ jsx("button", {
							className: "boton",
							onClick: () => void cambiar(),
							disabled: planNuevo === "",
							children: "Confirmar cambio"
						})]
					}),
					error !== null && /* @__PURE__ */ jsx("div", {
						style: {
							color: "var(--lk-color-danger)",
							marginTop: "0.5rem"
						},
						children: error
					})
				]
			}),
			/* @__PURE__ */ jsx("h2", {
				style: { marginBottom: "0.75rem" },
				children: "Facturación"
			}),
			facturas.length === 0 ? /* @__PURE__ */ jsx("p", {
				style: { color: "var(--lk-color-textMuted)" },
				children: "Sin movimientos todavía."
			}) : /* @__PURE__ */ jsxs("table", {
				style: {
					width: "100%",
					borderCollapse: "collapse",
					fontSize: "0.95rem"
				},
				children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsx("tr", { children: [
					"Fecha",
					"Concepto",
					"Monto",
					"Estado"
				].map((h) => /* @__PURE__ */ jsx("th", {
					style: celda(true),
					children: h
				}, h)) }) }), /* @__PURE__ */ jsx("tbody", { children: facturas.map((factura) => /* @__PURE__ */ jsxs("tr", { children: [
					/* @__PURE__ */ jsx("td", {
						style: celda(),
						children: new Date(factura.fecha).toLocaleDateString("es-CL")
					}),
					/* @__PURE__ */ jsx("td", {
						style: celda(),
						children: factura.concepto
					}),
					/* @__PURE__ */ jsxs("td", {
						style: celda(),
						children: ["$", factura.monto.toLocaleString("es-CL")]
					}),
					/* @__PURE__ */ jsx("td", {
						style: celda(),
						children: /* @__PURE__ */ jsx("span", {
							style: {
								color: factura.estado === "pagada" ? "var(--lk-color-brand)" : "var(--lk-color-accent)",
								fontWeight: 600
							},
							children: factura.estado
						})
					})
				] }, factura.id)) })]
			}),
			/* @__PURE__ */ jsx("p", {
				style: { marginTop: "2rem" },
				children: /* @__PURE__ */ jsx("button", {
					className: "boton secundario",
					onClick: () => void salir(),
					children: "Cerrar sesión"
				})
			})
		]
	});
}
function celda(header = false) {
	return {
		textAlign: "left",
		padding: "0.5rem 0.75rem",
		borderBottom: "1px solid var(--lk-color-border)",
		...header ? {
			color: "var(--lk-color-textMuted)",
			fontWeight: 600
		} : {}
	};
}
//#endregion
//#region src/entry-ssr.ts
/**
* Bundle SSR del módulo (ssr: 'server'): lo ejecuta EL SERVIDOR DEL MÓDULO
* cuando el core le pide el HTML de una isla (POST /render), nunca el core.
* El primer render debe ser determinista (mismo HTML en server y cliente) o
* React reportará hydration mismatch.
*/
var COMPONENTS = {
	"./RegistroIsland": RegistroIsland,
	"./AccesoIsland": AccesoIsland,
	"./PortalIsland": PortalIsland
};
function render(component, props) {
	const Component = COMPONENTS[component];
	if (Component === void 0) return null;
	return renderToString(createElement(Component, props));
}
//#endregion
export { render };
