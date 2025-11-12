import api from "../utils/api";
import apiAuth from "../utils/apiAuth";
import { handelException } from "./handelException";

function normalizeScoreResult(response) {
  if (!response || typeof response !== "object") {
    return response;
  }

  if (response.data && typeof response.data === "object") {
    return response.data;
  }

  if (response.result !== undefined) {
    return response.result;
  }

  return response;
}

function normalizeReasons(row) {
  if (Array.isArray(row.reasons)) {
    return row.reasons;
  }
  if (typeof row.reasons_json === "string") {
    try {
      const parsed = JSON.parse(row.reasons_json);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapSingleScore(result) {
  if (!result) {
    return null;
  }

  const score =
    typeof result.score === "number" ? result.score : Number(result.score);

  return {
    ...result,
    transaction_seq: result.transaction_seq ?? result.id ?? null,
    score: Number.isFinite(score) ? score : null,
    decision: result.decision ?? result.outcome ?? null,
    threshold_low: result.threshold_low,
    threshold_high: result.threshold_high,
    model_version: result.model_version,
    registry_version: result.registry_version,
    reasons: normalizeReasons(result),
    raw: result,
  };
}

function mapBatchScore(result) {
  if (!result || typeof result !== "object") {
    return {
      count: 0,
      results: [],
      threshold_low: null,
      threshold_high: null,
      model_version: null,
      registry_version: null,
      raw: result,
    };
  }

  const rows = Array.isArray(result.results) ? result.results : [];
  return {
    count: result.count ?? rows.length,
    threshold_low: result.threshold_low ?? null,
    threshold_high: result.threshold_high ?? null,
    model_version: result.model_version ?? null,
    registry_version: result.registry_version ?? null,
    results: rows.map((row) => {
      const score =
        typeof row.score === "number" ? row.score : Number(row.score);
      return {
        ...row,
        transaction_seq: row.transaction_seq ?? row.id ?? null,
        score: Number.isFinite(score) ? score : null,
        decision: row.decision ?? row.outcome ?? null,
        reasons: normalizeReasons(row),
        raw: row,
      };
    }),
    raw: result,
  };
}

async function scoreTransaction(transaction) {
  try {
    const response = await apiAuth.post("/score", transaction);
    const normalized = normalizeScoreResult(response);
    return mapSingleScore(normalized);
  } catch (error) {
    handelException.handelExceptions(error);
    throw error;
  }
}

async function scoreBatch(transactions) {
  try {
    const payload = Array.isArray(transactions)
      ? { transactions }
      : transactions;
    const response = await apiAuth.post("/score/batch", payload);
    const normalized = normalizeScoreResult(response);
    return mapBatchScore(normalized);
  } catch (error) {
    handelException.handelExceptions(error);
    throw error;
  }
}

async function scoreUpload(file, options = {}) {
  if (!(file instanceof File)) {
    throw new Error("A CSV file must be provided for upload scoring.");
  }

  const formData = new FormData();
  formData.append("file", file);

  if (typeof options.includeAllow === "boolean") {
    formData.append("include_allow", String(options.includeAllow));
  }
  if (typeof options.topK === "number") {
    formData.append("top_k", String(options.topK));
  }

  try {
    const response = await apiAuth.post("/score/upload", formData);
    const normalized = normalizeScoreResult(response);
    return mapBatchScore(normalized);
  } catch (error) {
    handelException.handelExceptions(error);
    throw error;
  }
}

async function fetchHealth() {
  try {
    const response = await api.get("/health");
    return normalizeScoreResult(response);
  } catch (error) {
    handelException.handelExceptions(error);
    throw error;
  }
}

async function reloadModel() {
  try {
    const response = await apiAuth.post("/reload");
    return normalizeScoreResult(response);
  } catch (error) {
    handelException.handelExceptions(error);
    throw error;
  }
}

export const fraudService = {
  scoreTransaction,
  scoreBatch,
  scoreUpload,
  fetchHealth,
  reloadModel,
};
