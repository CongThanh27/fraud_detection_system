const NUMERIC_FIELDS = [
  "transaction_seq",
  "deposit_amount",
  "transaction_count_24hour",
  "transaction_amount_24hour",
  "transaction_count_1week",
  "transaction_amount_1week",
  "transaction_count_1month",
  "transaction_amount_1month",
];

const DATE_FIELDS = [
  "register_date",
  "first_transaction_date",
  "birth_date",
  "recheck_date",
  "face_pin_date",
];

const DATETIME_FIELDS = ["create_dt"];

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatDateTime(value) {
  if (!value) {
    return undefined;
  }

  if (typeof value === "string" && value.includes(":") && value.includes("-")) {
    if (value.includes("T")) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
          date.getDate()
        )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
          date.getSeconds()
        )}`;
      }
      return value.replace("T", " ");
    }
    return value;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}`;
}

function formatDate(value) {
  if (!value) {
    return undefined;
  }
  if (typeof value === "string" && value.length >= 10) {
    if (value.includes("T")) {
      return value.split("T")[0];
    }
    return value.slice(0, 10);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
}

export function normalizeTransactionPayload(values) {
  if (!values || typeof values !== "object") {
    return {};
  }
  const payload = {};

  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) {
        return;
      }
      payload[key] = trimmed;
    } else {
      payload[key] = value;
    }
  });

  NUMERIC_FIELDS.forEach((field) => {
    if (field in payload) {
      const numeric = Number(payload[field]);
      if (!Number.isNaN(numeric)) {
        payload[field] = numeric;
      } else {
        delete payload[field];
      }
    }
  });

  DATETIME_FIELDS.forEach((field) => {
    if (field in payload) {
      const formatted = formatDateTime(payload[field]);
      if (formatted) {
        payload[field] = formatted;
      } else {
        delete payload[field];
      }
    }
  });

  DATE_FIELDS.forEach((field) => {
    if (field in payload) {
      const formatted = formatDate(payload[field]);
      if (formatted) {
        payload[field] = formatted;
      } else {
        delete payload[field];
      }
    }
  });

  return payload;
}

export function normalizeTransactions(list) {
  if (!Array.isArray(list)) {
    return [];
  }
  return list
    .map((item) => normalizeTransactionPayload(item))
    .filter((item) => Object.keys(item).length > 0);
}

export function resolveDecision(decision) {
  const normalized = (decision || "").toString().toLowerCase();
  if (normalized === "allow" || normalized === "approved") {
    return { label: "Allow", color: "green" };
  }
  if (normalized === "review" || normalized === "manual_review") {
    return { label: "Manual review", color: "gold" };
  }
  if (
    normalized === "deny" ||
    normalized === "reject" ||
    normalized === "block"
  ) {
    return { label: "Deny", color: "red" };
  }
  if (!normalized) {
    return { label: "Không xác định", color: "default" };
  }
  return {
    label: decision,
    color: "blue",
  };
}

export function formatScore(score) {
  if (score === null || score === undefined) {
    return null;
  }
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  if (numeric <= 1) {
    return (numeric * 100).toFixed(2);
  }
  return numeric.toFixed(2);
}

export function mapReasons(reasons) {
  if (!Array.isArray(reasons)) {
    return [];
  }
  return reasons.map((reason, index) => {
    if (!reason || typeof reason !== "object") {
      return {
        key: `reason-${index}`,
        title: `Lý do ${index + 1}`,
        description: "",
        impact: null,
        direction: null,
        raw: reason,
      };
    }
    const title =
      reason.feature ||
      reason.field ||
      reason.reason ||
      reason.label ||
      reason.name ||
      `Lý do ${index + 1}`;

    const description =
      reason.description ||
      reason.detail ||
      reason.message ||
      reason.explanation ||
      reason.summary ||
      "";

    const impact =
      reason.delta_score ??
      reason.impact ??
      reason.weight ??
      reason.score ??
      reason.value ??
      reason.direction ??
      null;

    return {
      key: `${title}-${index}`,
      title,
      description,
      impact,
      direction: reason.direction ?? null,
      raw: reason,
    };
  });
}

export function toLocalDateTimeInput(date = new Date()) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}
