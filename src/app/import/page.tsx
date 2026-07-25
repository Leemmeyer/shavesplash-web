"use client";

import { useState, useRef } from "react";
import { useSession } from "@/lib/session-context";
import { api } from "@/lib/api";

// Default categories matching mobile app
const DEFAULT_CATEGORIES: { id: string; name: string; hasPlates?: boolean }[] = [
  { id: "razors", name: "Razors", hasPlates: true },
  { id: "blades", name: "Blades" },
  { id: "brushes", name: "Brushes" },
  { id: "soaps", name: "Shave Soaps" },
  { id: "aftershaves", name: "Aftershaves" },
  { id: "balms", name: "Balms" },
  { id: "preshaves", name: "Preshaves" },
  { id: "edpedt", name: "EDP/EDT" },
];

// Default score parameters matching mobile app
const DEFAULT_SCORE_PARAMS = [
  { id: "efficiency", name: "Efficiency", shortName: "Eff" },
  { id: "comfort", name: "Comfort", shortName: "Comf" },
  { id: "easeOfUse", name: "Ease of Use", shortName: "Ease" },
  { id: "consistency", name: "Consistency", shortName: "Cons" },
];

// Default result options for rank calculation
const DEFAULT_RESULT_OPTIONS = [
  "DFS", "DFS+/DFS", "DFS+", "BBS-/DFS+", "BBS-", "BBS/BBS-", "BBS", "BBS+/BBS", "BBS+",
];

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') { current += '"'; i++; }
      else if (char === '"') { inQuotes = false; }
      else { current += char; }
    } else {
      if (char === '"') { inQuotes = true; }
      else if (char === ',') { result.push(current); current = ""; }
      else { current += char; }
    }
  }
  result.push(current);
  return result;
}

function parseCSVRows(csv: string): string[] {
  const rows: string[] = [];
  let currentRow = "";
  let inQuotes = false;
  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    const next = csv[i + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') { currentRow += '""'; i++; }
      else if (char === '"') { inQuotes = false; currentRow += char; }
      else { currentRow += char; }
    } else {
      if (char === '"') { inQuotes = true; currentRow += char; }
      else if (char === '\n' || (char === '\r' && next === '\n')) {
        if (currentRow.trim()) rows.push(currentRow);
        currentRow = "";
        if (char === '\r') i++;
      } else if (char === '\r') {
        if (currentRow.trim()) rows.push(currentRow);
        currentRow = "";
      } else { currentRow += char; }
    }
  }
  if (currentRow.trim()) rows.push(currentRow);
  return rows;
}

function parseDateStr(dateStr: string): number | null {
  // Handles "Jul 25, 2026" format from mobile export
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.getTime();
  return null;
}

interface ImportResult {
  inventoryAdded: number;
  logsAdded: number;
  errors: string[];
}

export default function ImportPage() {
  const { session } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "parsing" | "uploading" | "done" | "error">("idle");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [fileName, setFileName] = useState("");

  if (!session) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <p className="text-gray-500">Please sign in to import data.</p>
      </div>
    );
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setStatus("parsing");
    setResult(null);
    setErrorMsg("");

    try {
      const text = await file.text();
      const lines = parseCSVRows(text);

      if (lines.length < 2) {
        setErrorMsg("The CSV file appears to be empty or invalid.");
        setStatus("error");
        return;
      }

      const errors: string[] = [];

      // ── INVENTORY ──────────────────────────────────────────────
      let headerLineIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith("===")) continue;
        const parsed = parseCSVLine(lines[i]);
        if (parsed.some(h => h.toLowerCase() === "category") && parsed.some(h => h.toLowerCase() === "name")) {
          headerLineIndex = i;
          break;
        }
      }

      const inventoryItems: Record<string, unknown>[] = [];

      if (headerLineIndex >= 0) {
        const headers = parseCSVLine(lines[headerLineIndex]);
        const col = (name: string) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase());

        const categoryIndex = col("category");
        const nameIndex = col("name");
        const brandIndex = col("brand");
        const notesIndex = col("notes");
        const platesIndex = col("plates");
        const metalIndex = col("metal");
        const finishIndex = col("finish");
        const weightIndex = col("weight");
        const constructionIndex = col("construction");
        const handleModelIndex = col("handle model");
        const bladeGapIndex = col("blade gap");
        const exposureIndex = col("exposure");
        const edgeTypeIndex = col("edge type");
        const bladeFormatIndex = col("blade format");
        const knotIndex = col("knot");
        const diameterIndex = col("diameter");
        const sharpnessIndex = col("sharpness");
        const soapDensityIndex = col("soap density");
        const soapCushionIndex = col("soap cushion");
        const soapSlicknessIndex = col("soap slickness");
        const soapStabilityIndex = col("soap stability");
        const soapScentStrengthIndex = col("soap scent strength");
        const soapHasMentholIndex = col("soap has menthol");
        const soapIsTallowIndex = col("soap is tallow");
        const aftershaveScentStrengthIndex = col("aftershave scent strength");
        const edpedtScentStrengthIndex = col("edp/edt scent strength");
        const topNotesIndex = col("top notes");
        const heartNotesIndex = col("heart notes");
        const baseNotesIndex = col("base notes");
        const scentDescriptionIndex = col("scent description");
        const inspirationIndex = col("inspiration");
        const scentFamilyIndex = col("scent family");
        const familySubtypeIndex = col("family subtype");

        const categoryMap: Record<string, string> = {};
        DEFAULT_CATEGORIES.forEach(cat => {
          categoryMap[cat.name.toLowerCase()] = cat.id;
        });

        for (let i = headerLineIndex + 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.includes("===") && line.includes("SHAVE LOGS")) break;

          const values = parseCSVLine(lines[i]);
          const categoryName = values[categoryIndex]?.trim().toLowerCase();
          const name = values[nameIndex]?.trim();
          const brand = brandIndex >= 0 ? (values[brandIndex]?.trim() ?? "") : "";

          if (!categoryName || !name) continue;
          const categoryId = categoryMap[categoryName];
          if (!categoryId) { errors.push(`Unknown category: ${categoryName}`); continue; }

          const num = (idx: number) => { const v = parseFloat(values[idx]); return isNaN(v) ? undefined : v; };
          const int = (idx: number) => { const v = parseInt(values[idx]); return isNaN(v) ? undefined : v; };
          const str = (idx: number) => (idx >= 0 && values[idx]?.trim()) ? values[idx].trim() : undefined;
          const bool = (idx: number) => {
            if (idx < 0 || !values[idx]) return undefined;
            const v = values[idx].toLowerCase();
            if (v === "true" || v === "yes" || v === "1" || v === "tallow") return true;
            if (v === "false" || v === "no" || v === "0" || v === "vegan") return false;
            return undefined;
          };

          const data: Record<string, unknown> = {};
          if (platesIndex >= 0 && values[platesIndex]) {
            data.plates = values[platesIndex].split(";").map(p => p.trim()).filter(Boolean).map(entry => {
              const match = entry.match(/^(.+?)\s*\(([^)]+)\)$/);
              if (!match) return { name: entry, type: "SB" };
              const pName = match[1].trim();
              const parts = match[2].split(",").map((s: string) => s.trim());
              const plate: Record<string, unknown> = { name: pName, type: "SB" };
              parts.forEach((part: string) => {
                if (part === "SB" || part === "OC" || part === "DC") plate.type = part;
                const gapMatch = part.match(/gap:\s*([\d.]+)/i);
                if (gapMatch) plate.bladeGap = parseFloat(gapMatch[1]);
                const expMatch = part.match(/exp:\s*([\d.]+)/i);
                if (expMatch) plate.exposure = parseFloat(expMatch[1]);
              });
              return plate;
            });
          }
          if (str(metalIndex)) data.metal = str(metalIndex);
          if (str(finishIndex)) data.finish = str(finishIndex);
          if (num(weightIndex) !== undefined) data.weight = num(weightIndex);
          if (str(constructionIndex)) data.construction = str(constructionIndex);
          if (str(handleModelIndex)) data.handleModel = str(handleModelIndex);
          if (num(bladeGapIndex) !== undefined) data.bladeGap = num(bladeGapIndex);
          if (num(exposureIndex) !== undefined) data.exposure = num(exposureIndex);
          if (str(edgeTypeIndex)) data.edgeType = str(edgeTypeIndex);
          if (str(bladeFormatIndex)) data.bladeFormat = str(bladeFormatIndex);
          if (str(knotIndex)) data.knot = str(knotIndex);
          if (str(diameterIndex)) data.diameter = str(diameterIndex);
          if (int(sharpnessIndex) !== undefined) data.sharpness = int(sharpnessIndex);
          if (int(soapDensityIndex) !== undefined) data.soapDensity = int(soapDensityIndex);
          if (int(soapCushionIndex) !== undefined) data.soapCushion = int(soapCushionIndex);
          if (int(soapSlicknessIndex) !== undefined) data.soapSlickness = int(soapSlicknessIndex);
          if (int(soapStabilityIndex) !== undefined) data.soapStability = int(soapStabilityIndex);
          if (int(soapScentStrengthIndex) !== undefined) data.soapScentStrength = int(soapScentStrengthIndex);
          if (bool(soapHasMentholIndex) !== undefined) data.soapHasMenthol = bool(soapHasMentholIndex);
          if (bool(soapIsTallowIndex) !== undefined) data.soapIsTallow = bool(soapIsTallowIndex);
          if (int(aftershaveScentStrengthIndex) !== undefined) data.aftershaveScentStrength = int(aftershaveScentStrengthIndex);
          if (int(edpedtScentStrengthIndex) !== undefined) data.edpedtScentStrength = int(edpedtScentStrengthIndex);
          if (str(topNotesIndex)) data.topNotes = str(topNotesIndex);
          if (str(heartNotesIndex)) data.heartNotes = str(heartNotesIndex);
          if (str(baseNotesIndex)) data.baseNotes = str(baseNotesIndex);
          if (str(scentDescriptionIndex)) data.scentDescription = str(scentDescriptionIndex);
          if (str(inspirationIndex)) data.inspiration = str(inspirationIndex);
          if (str(scentFamilyIndex)) data.scentFamily = str(scentFamilyIndex);
          if (str(familySubtypeIndex)) data.familySubtype = str(familySubtypeIndex);

          inventoryItems.push({
            id: generateId(),
            categoryId,
            name,
            brand,
            notes: str(notesIndex),
            createdAt: Date.now(),
            data,
          });
        }
      }

      // ── SHAVE LOGS ─────────────────────────────────────────────
      let shaveLogHeaderIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.includes("SHAVE LOGS") && line.includes("===")) {
          for (let j = i + 1; j < lines.length; j++) {
            const next = lines[j].trim();
            if (next && !next.startsWith("===")) { shaveLogHeaderIndex = j; break; }
          }
          break;
        }
      }

      const logs: Record<string, unknown>[] = [];

      if (shaveLogHeaderIndex >= 0) {
        const shaveLogHeaders = parseCSVLine(lines[shaveLogHeaderIndex]);
        const dateIdx = shaveLogHeaders.findIndex(h => h.toLowerCase() === "date");
        const resultIdx = shaveLogHeaders.findIndex(h => h.toLowerCase() === "result");
        const notesIdx = shaveLogHeaders.findIndex(h => h.toLowerCase() === "notes");

        const scoreIndices = DEFAULT_SCORE_PARAMS.map(p => ({
          paramId: p.id,
          shortName: p.shortName,
          index: shaveLogHeaders.findIndex(h => h.toLowerCase() === p.name.toLowerCase()),
        })).filter(s => s.index >= 0);

        const categoryIndices = DEFAULT_CATEGORIES.map(cat => {
          const nameIdx = shaveLogHeaders.findIndex(h => h.toLowerCase() === cat.name.toLowerCase());
          const plateIdx = cat.hasPlates
            ? shaveLogHeaders.findIndex(h => h.toLowerCase() === `${cat.name.toLowerCase()} plate`)
            : -1;
          const bladeUsesIdx = cat.id === "blades"
            ? shaveLogHeaders.findIndex(h => h.toLowerCase() === "blade uses")
            : -1;
          return { catId: cat.id, nameIdx, plateIdx, bladeUsesIdx };
        }).filter(c => c.nameIdx >= 0);

        for (let i = shaveLogHeaderIndex + 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          const dateStr = dateIdx >= 0 ? values[dateIdx]?.trim() : "";
          const resultStr = resultIdx >= 0 ? values[resultIdx]?.trim() : "";

          if (!dateStr || !resultStr) continue;
          const date = parseDateStr(dateStr);
          if (!date) continue;

          const scores: Record<string, unknown> = {};
          scoreIndices.forEach(({ paramId, shortName, index }) => {
            const v = parseFloat(values[index]);
            if (!isNaN(v)) scores[paramId] = { value: v, shortName };
          });

          const selectedItems: Record<string, unknown> = {};
          categoryIndices.forEach(({ catId, nameIdx, plateIdx, bladeUsesIdx }) => {
            const itemName = values[nameIdx]?.trim();
            if (!itemName) return;
            const sel: Record<string, unknown> = { itemName };
            if (plateIdx >= 0 && values[plateIdx]?.trim()) sel.plate = values[plateIdx].trim();
            if (bladeUsesIdx >= 0 && values[bladeUsesIdx]?.trim()) {
              const uses = parseInt(values[bladeUsesIdx]);
              if (!isNaN(uses)) sel.bladeUses = uses;
            }
            selectedItems[catId] = sel;
          });

          const resultRank = DEFAULT_RESULT_OPTIONS.indexOf(resultStr) + 1;

          logs.push({
            id: generateId(),
            date,
            scores,
            result: resultStr,
            ...(resultRank > 0 && { resultRank, resultOptionsCount: DEFAULT_RESULT_OPTIONS.length }),
            selectedItems,
            ...(notesIdx >= 0 && values[notesIdx]?.trim() && { notes: values[notesIdx].trim() }),
          });
        }
      }

      if (inventoryItems.length === 0 && logs.length === 0) {
        setErrorMsg("No inventory items or shave logs found in the file. Make sure it's a ShaveSplash CSV export.");
        setStatus("error");
        return;
      }

      // ── UPLOAD ─────────────────────────────────────────────────
      setStatus("uploading");
      const CHUNK = 50;

      let inventoryAdded = 0;
      for (let i = 0; i < inventoryItems.length; i += CHUNK) {
        await api.post("/api/inventory/bulk", { items: inventoryItems.slice(i, i + CHUNK) });
        inventoryAdded += Math.min(CHUNK, inventoryItems.length - i);
      }

      let logsAdded = 0;
      for (let i = 0; i < logs.length; i += CHUNK) {
        await api.post("/api/logs/bulk", { logs: logs.slice(i, i + CHUNK) });
        logsAdded += Math.min(CHUNK, logs.length - i);
      }

      setResult({ inventoryAdded, logsAdded, errors });
      setStatus("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Import failed. Please try again.");
      setStatus("error");
    }

    // Reset file input so the same file can be re-selected if needed
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <h1 className="font-[family-name:var(--font-fredericka)] text-3xl text-[#c9a050] mb-2">
        Import Data
      </h1>
      <p className="text-gray-500 text-sm mb-10">
        Upload a ShaveSplash CSV export file to import your inventory and shave logs.
        Existing data is preserved — imports only add new records.
      </p>

      {/* Upload area */}
      {(status === "idle" || status === "error") && (
        <div>
          <label
            htmlFor="csv-upload"
            className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer bg-[#1c1c1c] hover:border-[#c9a050]/40 hover:bg-[#1f1f1f] transition-colors"
          >
            <svg className="w-10 h-10 text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <span className="text-[#c9a050] text-sm font-medium">Choose CSV file</span>
            <span className="text-gray-600 text-xs mt-1">ShaveSplash export format</span>
            <input
              id="csv-upload"
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFile}
            />
          </label>

          {status === "error" && (
            <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
              {errorMsg}
            </div>
          )}
        </div>
      )}

      {/* Parsing / uploading */}
      {(status === "parsing" || status === "uploading") && (
        <div className="flex flex-col items-center justify-center h-48 gap-4">
          <div className="w-8 h-8 border-2 border-[#c9a050]/30 border-t-[#c9a050] rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">
            {status === "parsing" ? `Reading ${fileName}…` : "Uploading to your account…"}
          </p>
        </div>
      )}

      {/* Done */}
      {status === "done" && result && (
        <div className="space-y-4">
          <div className="bg-[#1c1c1c] border border-white/5 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#c9a050]/15 flex items-center justify-center">
                <svg className="w-4 h-4 text-[#c9a050]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-[#f5f2eb] font-semibold">Import complete</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#242424] rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-[#c9a050]">{result.inventoryAdded}</div>
                <div className="text-xs text-gray-500 mt-1">inventory items</div>
              </div>
              <div className="bg-[#242424] rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-[#c9a050]">{result.logsAdded}</div>
                <div className="text-xs text-gray-500 mt-1">shave logs</div>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 text-yellow-400 text-xs space-y-1">
                <p className="font-medium">Some rows were skipped:</p>
                {result.errors.slice(0, 5).map((e, i) => <p key={i}>{e}</p>)}
                {result.errors.length > 5 && <p>…and {result.errors.length - 5} more</p>}
              </div>
            )}
          </div>
          <button
            onClick={() => { setStatus("idle"); setResult(null); setFileName(""); }}
            className="w-full py-3 rounded-xl border border-white/10 text-gray-400 text-sm hover:text-[#f5f2eb] transition-colors"
          >
            Import another file
          </button>
        </div>
      )}
    </div>
  );
}
