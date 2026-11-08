import { expect, test } from "@playwright/test";

// Necesita al menos dos perfiles con historial. E2E_API como en app.spec.js.
const API = process.env.E2E_API ?? "http://127.0.0.1:8080/api/wrapped";

function vigilarErrores(page) {
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("Failed to load resource")) errores.push(m.text());
  });
  return errores;
}

async function dosPerfilesConDatos(request) {
  const perfiles = await (await request.get(`${API}/perfiles`)).json();
  return perfiles.filter((p) => p.reproducciones > 0).slice(0, 2);
}

test.describe("comparar", () => {
  test("muestra coberturas, listas en común y quién llegó primero", async ({ page, request }) => {
    const pareja = await dosPerfilesConDatos(request);
    test.skip(pareja.length < 2, "hacen falta dos perfiles con historial");
    const [a, b] = pareja;
    const datos = await (await request.get(`${API}/compare?a=${a.id}&b=${b.id}`)).json();

    const errores = vigilarErrores(page);
    await page.goto(`/#/comparar?a=${a.id}&b=${b.id}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(a.nombre);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(b.nombre);
    await expect(page.locator(".cp-cobertura strong").first()).toHaveText(`${Math.round(datos.coberturaB * 100)} %`);
    await expect(page.locator("#cp-artistas ~ .cp-lista .cp-fila")).toHaveCount(datos.artistas.length);
    await expect(page.locator(".cp-marca strong").first()).toHaveText(String(datos.descubrimientos.primeroA));

    // Intercambiar invierte la pareja en la URL y en el título.
    await page.getByRole("button", { name: "Intercambiar perfiles" }).click();
    await expect(page).toHaveURL(new RegExp(`a=${b.id}&b=${a.id}`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(new RegExp(`^${b.nombre}`));

    const { ancho, visible } = await page.evaluate(() => ({
      ancho: document.documentElement.scrollWidth, visible: document.documentElement.clientWidth,
    }));
    expect(ancho).toBeLessThanOrEqual(visible);
    expect(errores).toEqual([]);
  });

  test("la API rechaza comparar un perfil consigo mismo", async ({ request }) => {
    const res = await request.get(`${API}/compare?a=1&b=1`);
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toBe("Elige dos perfiles distintos");
  });
});

test.describe("tarjeta para compartir", () => {
  test("crea un PNG de 1080x1920 y lo descarga", async ({ page }) => {
    const errores = vigilarErrores(page);
    await page.goto("/#/mi-epoca?from=2023-01-01&to=2023-12-31");
    await page.locator("#wx-resumen").scrollIntoViewIfNeeded();
    const boton = page.getByRole("button", { name: "Crear tarjeta para compartir" });
    await boton.scrollIntoViewIfNeeded();
    await boton.click();

    const previa = page.locator(".tarjeta-previa img");
    await expect(previa).toBeVisible({ timeout: 20_000 });
    const tamano = await previa.evaluate((img) => [img.naturalWidth, img.naturalHeight]);
    expect(tamano).toEqual([1080, 1920]);

    const [descarga] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Descargar PNG" }).click(),
    ]);
    expect(descarga.suggestedFilename()).toMatch(/^wrapped-.*2023-01-01-a-2023-12-31\.png$/);

    await page.getByRole("button", { name: "Cerrar" }).click();
    await expect(page.locator(".tarjeta-dialogo")).not.toBeVisible();
    expect(errores).toEqual([]);
  });
});
