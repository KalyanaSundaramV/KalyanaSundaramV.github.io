import { Check, Circle } from "lucide-react";
import { LayeredGlassAsset } from "@/components/glass/LayeredGlassAsset";
import type { Contract, ContractAssessment } from "@/lib/contracts";

/**
 * Contract picker and live progress for the destruction demo: objectives,
 * meters for the contract's limits, and the pass or fail result.
 */
export function ContractCard({
  contracts,
  contract,
  assessment,
  reputation,
  lockReason,
  onChoose,
  onRetry,
}: {
  contracts: readonly Contract[];
  contract: Contract;
  assessment: ContractAssessment;
  reputation: number;
  // Why a contract can't be picked right now, or null.
  lockReason: (item: Contract) => string | null;
  onChoose: (id: string) => void;
  onRetry: () => void;
}) {
  return (
    <LayeredGlassAsset
      asset="environment_selector"
      className="lab-contract-glass"
      contentClassName="lab-contract"
    >
      <div className="lab-contract-head">
        <label className="lab-control-label" htmlFor="lab-contract-select">
          Contract
        </label>
        <span className="lab-contract-reputation">
          Reputation <strong>{reputation}</strong>
        </span>
      </div>
      <select
        id="lab-contract-select"
        value={contract.id}
        onChange={(event) => onChoose(event.target.value)}
      >
        {contracts.map((item) => {
          const reason = item.id === contract.id ? null : lockReason(item);
          return (
            <option key={item.id} value={item.id} disabled={Boolean(reason)}>
              {reason ? `${item.title} (${reason})` : item.title}
            </option>
          );
        })}
      </select>
      {contract.id !== "free" ? (
        <>
          <p className="lab-contract-brief">{contract.brief}</p>
          <ul className="lab-contract-objectives">
            {assessment.objectives.map((objective, index) => (
              <li key={objective.label} data-done={objective.done}>
                {objective.done ? (
                  <Check aria-hidden="true" />
                ) : (
                  <Circle aria-hidden="true" />
                )}
                <span>
                  {contract.sequential ? `${index + 1}. ` : ""}
                  {objective.label}
                  <span className="sr-only">
                    {objective.done ? " (done)" : " (to do)"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <dl className="lab-contract-meters">
            {assessment.meters.map((meter) => (
              <div key={meter.label} data-ok={meter.ok}>
                <dt>{meter.label}</dt>
                <dd>{meter.value}</dd>
              </div>
            ))}
          </dl>
          <p
            className="lab-contract-result"
            data-result={assessment.result}
            aria-live="polite"
          >
            {assessment.result === "passed"
              ? "Contract complete"
              : assessment.result === "failed"
                ? `Contract failed: ${assessment.reason}`
                : null}
            {assessment.result !== "running" ? (
              <button type="button" onClick={onRetry}>
                Retry
              </button>
            ) : null}
          </p>
        </>
      ) : null}
    </LayeredGlassAsset>
  );
}
