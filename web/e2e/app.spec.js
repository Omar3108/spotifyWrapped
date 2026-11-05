import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:8080/api/wrapped";
const ANIO = "#/mi-epoca?from=2023-01-01&to=2023-12-31";

const esMovil = (testInfo) => testInfo.project.name === "movil";

// Errores que no deben aparecer nunca durante la navegación.
function vigilarErrores(page) {
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("Failed to load resource")) errores.push(m.text());
  });
  return errores;
}

async function sinScrollHorizontal(page) {
  const { ancho, visible } = await page.evaluate(() => ({
    ancho: document.documentElement.scrollWidth,
    visible: document.documentElement.clientWidth,
  }));
  expect(ancho).toBeLessThanOrEqual(visible);
}

test.describe("portada", () => {
  test("mantiene sus secciones y anclas", async ({ page }) => {
    const errores = vigilarErrores(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Mi Wrapped" })).toBeVisible();
    await expect(page.locator(".pt-cifra").first()).toBeVisible();
    for (const id of ["artistas", "canciones", "evolucion", "habitos", "destacados"]) {
      await expect(page.locator(`#${id}`)).toBeAttached();
    }
    // "Viaje en el tiempo" desapareció: ahora es Mi época.
    await expect(page.locator("#anio")).toHaveCount(0);
    await expect(page.getByText("Viaje en el tiempo")).toHaveCount(0);
    await page.goto("/#habitos");
    await expect(page.locator("#habitos")).toBeInViewport();
    expect(errores).toEqual([]);
  });

  test("las cifras del hero coinciden con la API", async ({ page, request }) => {
    const r = await (await request.get(`${API}/summary`)).json();
    await page.goto("/");
    await expect(page.locator(".pt-cifras")).toContainText(r.totalReproducciones.toLocaleString("es"));
    await expect(page.locator(".pt-cifras")).toContainText(r.cancionesDistintas.toLocaleString("es"));
  });

  test("una canción abre Explorar y un año abre Mi época", async ({ page }) => {
    // Los elementos se revelan al llegar con el scroll: se baja hasta ellos como haría una persona.
    await page.goto("/");
    await page.locator(".pt-canciones").scrollIntoViewIfNeeded();
    await page.locator("#canciones .pt-cancion a").first().click();
    await expect(page).toHaveURL(/#\/explorar\/\d+$/);
    await page.goto("/");
    await page.locator(".pt-anios").scrollIntoViewIfNeeded();
    await page.locator("#evolucion .pt-anio a").first().click();
    await expect(page).toHaveURL(/#\/mi-epoca\?from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}$/);
  });

  test("el filtro Top N cambia los artistas visibles", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#artistas .pt-podio-item, #artistas .pt-fila")).toHaveCount(10);
    await page.getByRole("button", { name: "Top 5" }).click();
    await expect(page.locator("#artistas .pt-podio-item, #artistas .pt-fila")).toHaveCount(5);
    await page.getByRole("button", { name: "Top 20" }).click();
    await expect(page.locator("#artistas .pt-podio-item, #artistas .pt-fila")).toHaveCount(20);
  });

  test("los totales de la portada coinciden con Mi época", async ({ page, request }) => {
    const resumen = await (await request.get(`${API}/summary`)).json();
    const from = resumen.primeraReproduccion.slice(0, 10);
    const to = resumen.ultimaReproduccion.slice(0, 10);
    const rango = await (await request.get(`${API}/range?from=${from}&to=${to}`)).json();
    expect(rango.reproducciones).toBe(resumen.totalReproducciones);
    expect(rango.cancionesDistintas).toBe(resumen.cancionesDistintas);

    await page.goto(`/#/mi-epoca?from=${from}&to=${to}`);
    await expect(page.locator("#wx-tiempo .wx-datos")).toContainText(
      resumen.totalReproducciones.toLocaleString("es")
    );
  });
});

test.describe("navegación", () => {
  test("alterna entre vistas sin dejar ScrollTriggers vivos", async ({ page }) => {
    const errores = vigilarErrores(page);
    await page.goto("/");

    for (let vuelta = 0; vuelta < 3; vuelta++) {
      await page.getByRole("link", { name: "Mi época" }).click();
      await page.goto(`/${ANIO}`);
      await expect(page.locator("#wx-intro")).toBeVisible();
      expect(await page.evaluate(() => window.__scrollTriggers())).toBeGreaterThan(0);

      await page.getByRole("link", { name: "Explorar" }).click();
      await expect(page.getByRole("combobox")).toBeVisible();
      expect(await page.evaluate(() => window.__scrollTriggers())).toBe(0);
      await expect(page.locator(".pin-spacer")).toHaveCount(0);

      await page.getByRole("link", { name: "Mi Wrapped" }).click();
      await expect(page.getByRole("heading", { name: "Mi Wrapped" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Mi Wrapped" })).toHaveAttribute("aria-current", "page");
      // La portada sí usa ScrollTrigger; al salir a Explorar deben quedar 0 (se comprueba arriba).
      expect(await page.evaluate(() => window.__scrollTriggers())).toBeGreaterThan(0);
    }
    expect(errores).toEqual([]);
  });

  test("atrás y adelante recuperan la vista", async ({ page }) => {
    await page.goto("/#/explorar");
    await expect(page.getByRole("combobox")).toBeVisible();
    await page.locator(".sugerencias button").first().click();
    await expect(page).toHaveURL(/#\/explorar\/\d+$/);
    await expect(page.locator(".detalle-principal")).toBeVisible();
    await page.goBack();
    await expect(page.locator(".sugerencias")).toBeVisible();
    await page.goForward();
    await expect(page.locator(".detalle-principal")).toBeVisible();
  });
});

test.describe("explorar", () => {
  test("encuentra sin distinguir acentos ni mayúsculas", async ({ page }) => {
    await page.goto("/#/explorar");
    await page.getByRole("combobox").fill("BEYONCE");
    await expect(page.getByRole("option").first()).toContainText("Beyoncé");
  });

  test("agrupa las peticiones con debounce y cancela las anteriores", async ({ page }) => {
    await page.goto("/#/explorar");
    const pedidas = [];
    page.on("request", (r) => {
      if (r.url().includes("/tracks/search")) pedidas.push(r.url());
    });
    await page.getByRole("combobox").pressSequentially("linkin", { delay: 40 });
    await expect(page.getByRole("option").first()).toBeVisible();
    expect(pedidas).toHaveLength(1);
    expect(pedidas[0]).toContain("q=linkin");
  });

  test("funciona con teclado", async ({ page }) => {
    await page.goto("/#/explorar");
    const campo = page.getByRole("combobox");
    await campo.fill("linkin");
    await expect(page.getByRole("option").first()).toBeVisible();
    await campo.press("ArrowDown");
    await campo.press("ArrowDown");
    await expect(page.getByRole("option").nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(campo).toHaveAttribute("aria-activedescendant", /opcion-\d+/);
    await campo.press("Enter");
    await expect(page).toHaveURL(/#\/explorar\/\d+$/);
    await expect(page.locator(".detalle-principal")).toBeVisible();
  });

  test("explica cuando no hay resultados", async ({ page }) => {
    await page.goto("/#/explorar");
    await page.getByRole("combobox").fill("zzzqqxxy");
    await expect(page.locator(".buscador-aviso")).toContainText("zzzqqxxy");
  });

  test("el detalle coincide con la API y desglosa versiones", async ({ page, request }) => {
    const [hit] = await (await request.get(`${API}/tracks/search?q=Heavy Is the Crown`)).json();
    const song = await (await request.get(`${API}/tracks/${hit.trackId}`)).json();
    expect(song.versiones.length).toBeGreaterThan(1);

    await page.goto(`/#/explorar/${hit.trackId}`);
    await expect(page.locator(".detalle-principal .tabular")).toHaveText(String(song.reproducciones));
    await expect(page.locator(".linea-grafico svg").first()).toBeVisible();

    const version = song.versiones[0];
    await page.locator(".versiones-lista button").nth(1).click();
    await expect(page.locator(".detalle-principal .tabular")).toHaveText(String(version.reproducciones));
  });

  test("una canción inexistente muestra un error claro", async ({ page }) => {
    await page.goto("/#/explorar/99999999");
    await expect(page.locator(".panel-error")).toBeVisible();
  });
});

test.describe("mi época", () => {
  test("valida el rango antes de consultar", async ({ page }) => {
    await page.goto("/#/mi-epoca");
    await page.locator('input[type="date"]').first().fill("2024-05-01");
    await page.locator('input[type="date"]').nth(1).fill("2024-01-01");
    await page.getByRole("button", { name: "Generar mi época" }).click();
    await expect(page.locator(".rango-mensaje")).toHaveClass(/error/);
    await expect(page.locator("#wx-intro")).toHaveCount(0);
  });

  test("un preset genera el año y coincide con la API", async ({ page, request }) => {
    const rango = await (await request.get(`${API}/range?from=2023-01-01&to=2023-12-31`)).json();
    await page.goto("/#/mi-epoca");
    await page.getByRole("button", { name: "2023", exact: true }).click();
    await expect(page).toHaveURL(/from=2023-01-01&to=2023-12-31/);
    await expect(page.locator("#wx-intro")).toContainText("2023");
    await expect(page.locator("#wx-tiempo .wx-datos")).toContainText(rango.reproducciones.toLocaleString("es"));
    await expect(page.locator(".wx-lider-nombre")).toHaveText(rango.topArtistas[0].nombre);
  });

  test("cambiar el rango actualiza las estadísticas", async ({ page, request }) => {
    const r2021 = await (await request.get(`${API}/range?from=2021-01-01&to=2021-12-31`)).json();
    await page.goto(`/${ANIO}`);
    await expect(page.locator("#wx-intro")).toContainText("2023");
    await page.getByRole("button", { name: "2021", exact: true }).click();
    await expect(page.locator("#wx-intro")).toContainText("2021");
    await expect(page.locator("#wx-tiempo .wx-datos")).toContainText(r2021.reproducciones.toLocaleString("es"));
    await expect(page.locator(".wx-lider-nombre")).toHaveText(r2021.topArtistas[0].nombre);
  });

  test("un rango sin datos lo explica", async ({ page }) => {
    await page.goto("/#/mi-epoca?from=2018-01-01&to=2018-01-01");
    await expect(page.locator("#wx-intro, .epoca-aviso").first()).toBeVisible();
    await page.goto("/#/mi-epoca?from=2010-01-01&to=2010-02-01");
    await expect(page.locator("#wx-intro")).toHaveCount(0);
    await expect(page.locator(".rango-mensaje")).toContainText("empieza");
  });

  test("los controles recorren las siete escenas", async ({ page }) => {
    await page.goto(`/${ANIO}`);
    await expect(page.locator("#wx-intro")).toBeVisible();
    const siguiente = page.getByRole("button", { name: "Escena siguiente" });
    await page.locator("#wx-intro").scrollIntoViewIfNeeded();

    const ids = ["wx-tiempo", "wx-artistas", "wx-canciones", "wx-albumes", "wx-evolucion", "wx-resumen"];
    for (const id of ids) {
      await siguiente.click();
      await expect(page.locator(`#${id}`)).toBeInViewport({ timeout: 4000 });
      await page.waitForTimeout(1100);
    }
    await expect(siguiente).toBeDisabled();
    await expect(page.getByRole("button", { name: "Escena anterior" })).toBeEnabled();
  });

  test("las flechas del teclado cambian de escena", async ({ page }, info) => {
    test.skip(esMovil(info), "Solo con teclado físico");
    await page.goto(`/${ANIO}`);
    await expect(page.locator("#wx-intro")).toBeVisible();
    await page.getByRole("button", { name: "Inicio" }).click();
    await page.waitForTimeout(1100);
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#wx-tiempo")).toBeInViewport({ timeout: 4000 });
    await page.waitForTimeout(1100);
    await page.keyboard.press("ArrowLeft");
    await expect(page.locator("#wx-intro")).toBeInViewport({ timeout: 4000 });
  });

  test("el progreso avanza con el scroll", async ({ page }) => {
    await page.goto(`/${ANIO}`);
    await expect(page.locator("#wx-intro")).toBeVisible();
    const escala = () => page.locator(".wx-progreso-relleno").evaluate(
      (el) => new DOMMatrix(getComputedStyle(el).transform).a
    );
    const inicial = await escala();
    await page.locator("#wx-albumes").evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + scrollY));
    await page.waitForTimeout(300);
    expect(await escala()).toBeGreaterThan(inicial + 0.3);
  });

  test("el pin solo existe en escritorio", async ({ page }, info) => {
    await page.goto(`/${ANIO}`);
    await expect(page.locator("#wx-intro")).toBeVisible();
    await expect(page.locator(".pin-spacer")).toHaveCount(esMovil(info) ? 0 : 1);
  });

  test("con todas las escenas vistas quedan solo el progreso y el pin", async ({ page }, info) => {
    await page.goto(`/${ANIO}`);
    await expect(page.locator("#wx-intro")).toBeVisible();
    await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(700);
    const vivos = await page.evaluate(() => window.__scrollTriggers());
    expect(vivos).toBeLessThanOrEqual(esMovil(info) ? 1 : 2);
  });
});

test.describe("responsive", () => {
  for (const ruta of ["/#/explorar", "/#/explorar/2255", `/${ANIO}`]) {
    test(`sin scroll horizontal en ${ruta}`, async ({ page }) => {
      await page.goto(ruta);
      await page.waitForLoadState("networkidle");
      await sinScrollHorizontal(page);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      await sinScrollHorizontal(page);
    });
  }

  test("los controles de escena son cómodos en móvil", async ({ page }, info) => {
    test.skip(!esMovil(info), "Solo móvil");
    await page.goto(`/${ANIO}`);
    await expect(page.locator(".wx-etiqueta")).toBeVisible();
    await expect(page.locator(".wx-puntos")).toBeHidden();
    const caja = await page.getByRole("button", { name: "Escena siguiente" }).boundingBox();
    expect(caja.height).toBeGreaterThanOrEqual(44);
    expect(caja.width).toBeGreaterThanOrEqual(44);
  });
});

test.describe("movimiento reducido", () => {
  test.use({ reducedMotion: "reduce" });

  test("todo el contenido se ve sin animaciones ni pin", async ({ page }) => {
    await page.goto(`/${ANIO}`);
    await expect(page.locator(".pin-spacer")).toHaveCount(0);
    await page.locator("#wx-resumen").scrollIntoViewIfNeeded();
    for (const sel of [".wx-lider-nombre", ".wx-fila", ".wx-cancion", ".wx-album", ".wx-grafico", ".wx-mosaico .cover"]) {
      const el = page.locator(sel).first();
      await expect(el).toBeVisible();
      await expect(el).toHaveCSS("opacity", "1");
    }
  });

  test("la portada se ve completa sin animaciones", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".pt-cifra").first()).toBeVisible();
    await page.locator("#destacados").scrollIntoViewIfNeeded();
    for (const sel of ["#artistas .pt-podio-item", "#canciones .pt-cancion", "#canciones .pt-album", "#evolucion .pt-anio", ".pt-record"]) {
      const el = page.locator(sel).first();
      await expect(el).toBeVisible();
      await expect(el).toHaveCSS("opacity", "1");
    }
    expect(await page.evaluate(() => window.__scrollTriggers())).toBe(0);
  });

  test("el contador muestra el valor final directamente", async ({ page, request }) => {
    const rango = await (await request.get(`${API}/range?from=2023-01-01&to=2023-12-31`)).json();
    await page.goto(`/${ANIO}`);
    await expect(page.locator(".wx-cifra")).toHaveText(Math.round(rango.minutos).toLocaleString("es"));
  });
});

test("un 500 de la API no rompe la vista ni expone detalles", async ({ page }) => {
  await page.route("**/api/wrapped/range**", (r) => r.fulfill({
    status: 500,
    contentType: "application/json",
    body: JSON.stringify({ status: 500, error: "Internal Server Error", path: "/api/wrapped/range" }),
  }));
  await page.goto(`/${ANIO}`);
  await expect(page.locator(".epoca-aviso")).toContainText("No se pudieron calcular");
  await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
});
