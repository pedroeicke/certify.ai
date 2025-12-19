
import { PDFDocument } from 'pdf-lib';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';
import { Participant, LayoutConfig } from '../types';

// Sincronizado com a versão instalada no package.json (4.0.379)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.mjs';

/**
 * Limpa o nome para evitar caracteres invisíveis de cópia/cola.
 */
const cleanName = (name: any): string => {
  if (name === null || name === undefined) return "";
  return String(name).replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
};

/**
 * Renderiza o texto em um canvas e retorna os bytes de uma imagem PNG.
 */
const textToImageBytes = async (text: string, fontSize: number, color: string): Promise<{ bytes: Uint8Array, width: number, height: number }> => {
  await document.fonts.load(`${fontSize}px "Great Vibes"`);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Não foi possível criar contexto 2D");

  ctx.font = `${fontSize * 2}px "Great Vibes"`;
  const metrics = ctx.measureText(text);
  
  const padding = fontSize * 0.5;
  canvas.width = metrics.width + (padding * 2);
  canvas.height = (fontSize * 3);

  ctx.font = `${fontSize * 2}px "Great Vibes"`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        resolve({
          bytes: new Uint8Array(arrayBuffer),
          width: canvas.width / 2,
          height: canvas.height / 2
        });
      };
      reader.readAsArrayBuffer(blob!);
    }, 'image/png');
  });
};

export const parseParticipants = async (file: File): Promise<Participant[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
        
        const participants = jsonData.map(row => {
          const rawValue = row.nome || row.Nome || row.name || row.Name || Object.values(row)[0];
          return { ...row, nome: cleanName(rawValue) };
        }).filter(p => p.nome.length > 0);
        
        resolve(participants);
      } catch (err) {
        reject(new Error("Erro ao ler planilha. Verifique o formato."));
      }
    };
    reader.readAsArrayBuffer(file);
  });
};

export const generateCertificatesZip = async (
  templateBytes: ArrayBuffer,
  participants: Participant[],
  config: LayoutConfig,
  onProgress: (current: number) => void
): Promise<Blob> => {
  const zip = new JSZip();
  
  for (let i = 0; i < participants.length; i++) {
    const participant = participants[i];
    
    try {
      const pdfDoc = await PDFDocument.load(templateBytes.slice(0));
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width } = firstPage.getSize();

      const text = participant.nome;
      const fontSize = config.fontSize || 60;

      const { bytes, width: imgW, height: imgH } = await textToImageBytes(text, fontSize, config.color || '#FFFFFF');
      const nameImage = await pdfDoc.embedPng(bytes);
      
      const xPos = (width - imgW) / 2;
      const yPos = config.y - (imgH / 2);

      firstPage.drawImage(nameImage, {
        x: xPos,
        y: yPos,
        width: imgW,
        height: imgH,
      });

      const pdfBytes = await pdfDoc.save();
      const fileNameSafe = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "_");
      zip.file(`${String(i+1).padStart(3, '0')}_${fileNameSafe}.pdf`, pdfBytes);
      
      onProgress(i + 1);
    } catch (err: any) {
      console.error(`Erro no participante ${participant.nome}:`, err);
    }
  }

  return await zip.generateAsync({ type: 'blob' });
};

export const pdfToImageBase64 = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: context, viewport }).promise;
    return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
};
