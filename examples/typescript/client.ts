/**
 * Minimal TypeScript client for a self-hosted Laya /v1/systemone API.
 *
 * Run with: npx --yes tsx examples/typescript/client.ts
 * Requires Node 18+ (built-in fetch).
 */

const BASE_URL = (process.env.LAYA_BASE_URL ?? "https://laya.example.com").replace(
  /\/$/,
  "",
);
const API_KEY = process.env.LAYA_API_KEY ?? "";

type ChoiceQuestion = {
  type: "choice";
  instructions: string;
  criteria: Record<string, string>;
};

type ScoreQuestion = {
  type: "score";
  instructions: string;
  criteria: string[];
};

type NoulQuestion = {
  type: "noul";
  instructions: string;
};

type Questions = Record<string, ChoiceQuestion | ScoreQuestion | NoulQuestion>;

async function predict(state: string, questions: Questions): Promise<unknown> {
  if (!API_KEY) {
    throw new Error("Set LAYA_API_KEY in the environment.");
  }

  const res = await fetch(`${BASE_URL}/v1/systemone`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ state, questions }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return JSON.parse(text) as unknown;
}

async function main(): Promise<void> {
  const state =
    "Hi, we were billed twice for March. Please refund the duplicate today " +
    "or we will cancel our plan.";

  const questions: Questions = {
    department: {
      type: "choice",
      instructions: "Which department should handle this?",
      criteria: {
        billing: "invoices, payments, refunds",
        technical: "bugs, outages, system errors",
        other: "everything else",
      },
    },
    urgency: {
      type: "score",
      instructions: "How urgent is this?",
      criteria: ["not urgent", "soon", "blocking"],
    },
    churn_risk: {
      type: "noul",
      instructions: "Does the user threaten to cancel or leave?",
    },
  };

  const result = (await predict(state, questions)) as {
    answers?: Record<string, Record<string, unknown>>;
  };

  console.log(JSON.stringify(result, null, 2));
  console.log("---");
  console.log("department:", result.answers?.department?.choice);
  console.log("urgency:", result.answers?.urgency?.score);
  console.log("churn_risk:", result.answers?.churn_risk?.noul);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
