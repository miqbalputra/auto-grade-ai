import { createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

type RenderedPdfPage = {
  pageNumber: number;
  mimeType: "image/png";
  base64: string;
};

export async function renderPdfToImages(buffer: Buffer, scale = 0.5) {
  const loadingTask = getDocument(
    {
      data: new Uint8Array(buffer),
      disableWorker: true,
      useSystemFonts: true
    } as never
  );

  const pdf = await loadingTask.promise;
  const pages: RenderedPdfPage[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas.getContext("2d");

    await page.render({ canvas: canvas as never, canvasContext: context as never, viewport }).promise;

    pages.push({
      pageNumber,
      mimeType: "image/png",
      base64: canvas.toBuffer("image/png").toString("base64")
    });
  }

  return pages;
}
