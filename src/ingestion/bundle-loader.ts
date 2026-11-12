import path from "node:path";
import type { Contract } from "../types/contract.js";
import { loadCrm } from "./crm-loader.js";
import { loadErp } from "./erp-loader.js";

export interface LoadedBundle {
  pdfPath: string;
  crm: Contract;
  erp: Contract;
}

export async function loadBundle(bundlePath: string): Promise<LoadedBundle> {
  const pdfPath = path.join(bundlePath, "order-form.pdf");
  const crmPath = path.join(bundlePath, "crm.json");
  const erpPath = path.join(bundlePath, "erp.json");

  const [crm, erp] = await Promise.all([
    loadCrm(crmPath),
    loadErp(erpPath),
  ]);

  return {
    pdfPath,
    crm,
    erp,
  };
}
