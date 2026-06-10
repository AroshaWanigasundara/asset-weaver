import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ExtrinsicForm } from "@/components/ExtrinsicForm";
import { Field, TxtInput } from "@/components/forms/Field";
import { HexHashInput } from "@/components/forms/HexHashInput";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info, History } from "lucide-react";
import { isValidHex32 } from "@/lib/polkadot/utils";
import { fireRefresh } from "@/lib/polkadot/refreshBus";
import { usePolkadot } from "@/lib/polkadot/PolkadotContext";
import { FileUploadField } from "@/components/forms/FileUploadField";
import { toast } from "sonner";

export default function Contracts() {
  return (
    <>
      <PageHeader title="Contracts" description="Sign asset contracts, push updates (auto-archived), and review the audit trail." />
      <div className="grid gap-6 lg:grid-cols-2">
        <SignContractForm />
        <UpdateContractForm />
      </div>
      <div className="mt-6">
        <ContractHistoryViewer />
      </div>
    </>
  );
}

function SignContractForm() {
  const [assetId, setAssetId] = useState("");
  const ok = /^\d+$/.test(assetId);
  return (
    <ExtrinsicForm
      title="Sign Contract"
      description="Cryptographically attest that you've reviewed the contract for this asset."
      canSubmit={ok}
      submitLabel="Sign"
      buildTx={(api) => api.tx.assetTokenization.signContract(Number(assetId))}
      onSuccess={() => fireRefresh()}
    >
      <Field label="Asset ID">
        <TxtInput value={assetId} onChange={setAssetId} placeholder="0" mono />
      </Field>
    </ExtrinsicForm>
  );
}

function UpdateContractForm() {
  const [assetId, setAssetId] = useState("");
  const [uri, setUri] = useState("");
  const [hash, setHash] = useState("");
  const uriBytes = new TextEncoder().encode(uri).length;
  const ok = /^\d+$/.test(assetId) && uri && uriBytes <= 256 && isValidHex32(hash);

  return (
    <ExtrinsicForm
      title="Update Contract"
      description="Replace the active URI/hash. Past versions remain queryable."
      canSubmit={!!ok}
      submitLabel="Push update"
      banner={
        <Alert className="border-primary/30 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle>Auditable</AlertTitle>
          <AlertDescription className="text-xs">
            Each update is permanently archived on-chain for auditability.
          </AlertDescription>
        </Alert>
      }
      buildTx={(api) => api.tx.assetTokenization.updateContract(Number(assetId), uri, hash)}
      onSuccess={() => fireRefresh()}
    >
      <Field label="Asset ID">
        <TxtInput value={assetId} onChange={setAssetId} placeholder="0" mono />
      </Field>
      <Field label={`New contract URI (${uriBytes}/256 bytes)`} error={uriBytes > 256 ? "Max 256 bytes" : null}>
        <TxtInput value={uri} onChange={setUri} placeholder="ipfs://Qm..." mono />
      </Field>
      <Field label="New SHA-256 hash" hint="0x + 64 hex chars">
        <HexHashInput value={hash} onChange={setHash} />
      </Field>
    </ExtrinsicForm>
  );
}

function ContractHistoryViewer() {
  const { api, blockNumber } = usePolkadot();
  const [assetId, setAssetId] = useState("");
  const [rows, setRows] = useState<{ index: number; hash: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);

  const load = async () => {
    if (!api || !assetId) return;
    setLoading(true);
    try {
      const id = Number(assetId);
      const P = (api.query as any).assetTokenization;
      const cnt = (await P.contractHistoryCount(id)).toString();
      const total = Number(cnt);
      const promises = [];
      for (let i = 0; i < total; i++) promises.push(P.contractHistory(id, i));
      const results = await Promise.all(promises);
      setRows(results.map((r: any, i: number) => ({
        index: i,
        hash: r.isSome ? r.unwrap().toString() : r.toString(),
      })));
      setFetchedAt(blockNumber);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="surface-card border-border">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          Contract History Viewer
        </CardTitle>
        {fetchedAt != null && <span className="text-[10px] text-muted-foreground font-mono">@ #{fetchedAt}</span>}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1 max-w-xs">
            <Field label="Asset ID">
              <TxtInput value={assetId} onChange={setAssetId} placeholder="0" mono />
            </Field>
          </div>
          <Button onClick={load} disabled={!api || !assetId || loading} className="bg-gradient-primary">
            Load history
          </Button>
        </div>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No archived versions for this asset (yet).</p>
        ) : (
          <ol className="relative border-l border-border ml-2 space-y-3">
            {rows.map((r) => (
              <li key={r.index} className="ml-4">
                <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-primary shadow-glow" />
                <div className="rounded-md border border-border bg-card/50 p-3">
                  <div className="text-xs text-muted-foreground mb-1">Version #{r.index}</div>
                  <code className="font-mono text-xs break-all">{r.hash}</code>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
