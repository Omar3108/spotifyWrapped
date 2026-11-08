import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

// Igual que app.spec.js: E2E_API permite apuntar a la API de Docker a través del proxy de Vite.
const API = process.env.E2E_API ?? "http://127.0.0.1:8080/api/wrapped";
const HISTORIAL = join(dirname(fileURLToPath(import.meta.url)), "../../data/raw/Streaming_History_Audio_2017.json");
const CUANTAS = 300;

const omar = {
  id: 1, nombre: "Omar", reproducciones: 197023,
  primeraReproduccion: "2017-04-26T00:59:44", ultimaReproduccion: "2026-08-02T18:00:47",
  datosActualizados: "2026-11-07T00:26:45",
};
const sinDatos = { id: 2, nombre: "Gaby", reproducciones: 0, primeraReproduccion: null, ultimaReproduccion: null, datosActualizados: null };

const simularPerfiles = (page, lista) => page.route("**/api/wrapped/perfiles", (r) => r.fulfill({ json: lista }));

test.describe("pantallas sin datos", () => {
  test("sin perfiles ofrece crear el primero en lugar de una página vacía", async ({ page }) => {
    await simularPerfiles(page, []);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Aún no hay perfiles" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Crear un perfil" })).toHaveAttribute("href", "#/datos");
  });

  test("un perfil sin datos explica cómo cargarlos", async ({ page }) => {
    await simularPerfiles(page, [omar, sinDatos]);
    await page.addInitScript(() => localStorage.setItem("wrapped.perfil", "2"));
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Gaby aún no tiene datos" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Subir historial" })).toBeVisible();
    await page.getByText("¿Cómo pido el historial a Spotify?").click();
    await expect(page.getByText("Historial de reproducción ampliado").first()).toBeVisible();
    // Explorar y Mi época muestran lo mismo, no pantallas rotas.
    await page.goto("/#/explorar");
    await expect(page.getByRole("heading", { name: "Gaby aún no tiene datos" })).toBeVisible();
  });

  test("fuera del equipo local no se ofrece la gestión", async ({ page }) => {
    // «localhost.» (con punto) llega al mismo servidor pero no cuenta como equipo local.
    await page.goto("http://localhost.:5173/#/datos");
    await expect(page.getByRole("heading", { name: "Solo disponible en el equipo local" })).toBeVisible();
    await page.getByRole("button", { name: /Perfil/ }).click();
    await expect(page.getByText("Gestionar perfiles y datos")).toHaveCount(0);
  });
});

test.describe("gestión de perfiles", () => {
  test("crear, cargar historial, ver su Wrapped, limpiar y borrar sin tocar a Omar", async ({ page, request }) => {
    test.skip(!existsSync(HISTORIAL), "necesita data/raw con el historial real");
    test.setTimeout(120_000);

    const nombre = `E2E ${Date.now()}`;
    const resumenOmar = async () => (await request.get(`${API}/summary?perfil=1`)).json();
    const antes = await resumenOmar();

    // 300 reproducciones reales que ya existen en el catálogo: la prueba no lo ensucia.
    const reales = JSON.parse(readFileSync(HISTORIAL, "utf8"))
      .filter((r) => r.master_metadata_track_name && r.ms_played >= 30000)
      .slice(0, CUANTAS);
    expect(reales).toHaveLength(CUANTAS);
    const json = { name: "Streaming_History_Audio_2017.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(reales)) };

    try {
      await page.goto("/#/datos");
      await expect(page.locator(".dt-tarjeta", { hasText: "Omar" })).toBeVisible();

      // Crear
      await page.getByLabel("Nuevo perfil").fill(nombre);
      await page.getByRole("button", { name: "Crear perfil" }).click();
      const tarjeta = page.locator(".dt-tarjeta", { hasText: nombre });
      await expect(tarjeta).toContainText("Sin datos todavía");

      // Un archivo que no es del historial se rechaza con el motivo y no toca nada
      await tarjeta.locator("input[type=file]").setInputFiles([{ name: "notas.txt", mimeType: "text/plain", buffer: Buffer.from("hola") }]);
      await expect(tarjeta.getByRole("status")).toContainText("Sube el .zip que envía Spotify");
      await tarjeta.getByRole("button", { name: "Cerrar" }).click();

      // Cargar JSON sueltos: el navegador los empaqueta y el servidor los lee
      await tarjeta.locator("input[type=file]").setInputFiles([json]);
      await expect(tarjeta.getByRole("status")).toContainText("Listo.", { timeout: 60_000 });
      await expect(tarjeta).toContainText(`${CUANTAS} reproducciones`);

      // Su Wrapped existe y es suyo
      await tarjeta.getByRole("link", { name: "Ver su Wrapped" }).click();
      await expect(page.locator(".pt-cifra", { hasText: "Reproducciones" })).toContainText(String(CUANTAS));
      await page.goto("/#/datos");
      await expect(page.locator(".dt-tarjeta", { hasText: nombre })).toContainText(`${CUANTAS} reproducciones`);

      // Reemplazar pide confirmación
      await tarjeta.locator("input[type=file]").setInputFiles([json]);
      await expect(tarjeta.getByText("Esto reemplaza")).toBeVisible();
      await tarjeta.getByRole("button", { name: "Cancelar" }).click();

      // Limpiar datos
      await tarjeta.getByRole("button", { name: "Limpiar datos" }).click();
      await tarjeta.getByRole("button", { name: "Limpiar datos" }).last().click();
      await expect(tarjeta).toContainText("Sin datos todavía");

      // Borrar exige escribir el nombre
      await tarjeta.getByRole("button", { name: "Borrar perfil" }).click();
      const confirmar = tarjeta.getByRole("button", { name: "Borrar perfil" }).last();
      await expect(confirmar).toBeDisabled();
      await tarjeta.getByRole("textbox").fill(nombre);
      await confirmar.click();
      await expect(page.locator(".dt-tarjeta", { hasText: nombre })).toHaveCount(0);
    } finally {
      // Si la prueba falló a medias, no deja el perfil de prueba en la base real.
      const perfiles = await (await request.get(`${API}/perfiles`)).json();
      for (const p of perfiles.filter((x) => x.nombre === nombre)) {
        await request.delete(`${API}/gestion/perfiles/${p.id}`, { headers: { "X-Wrapped-Gestion": "1" } });
      }
    }

    expect(await resumenOmar()).toEqual(antes);
  });
});
