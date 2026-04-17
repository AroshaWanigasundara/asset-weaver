import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ExtrinsicForm } from "@/components/ExtrinsicForm";
import { Field, TxtInput } from "@/components/forms/Field";
import { HexHashInput } from "@/components/forms/HexHashInput";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isValidHex32 } from "@/lib/polkadot/utils";
import { fireRefresh } from "@/lib/polkadot/refreshBus";
import { AssetLookup } from "@/components/queries/AssetLookup";

export default function Assets() {
  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState<"Physical" | "Digital">("Digital");
  const [contractUri, setContractUri] = useState("");
  const [contractHash, setContractHash] = useState("");
  const [isFungible, setIsFungible] = useState(false);
  const [supply, setSupply] = useState("");
  const [collectionId, setCollectionId] = useState("");

  const nameBytes = new TextEncoder().encode(name).length;
  const uriBytes = new TextEncoder().encode(contractUri).length;

  const nameErr = nameBytes > 64 ? "Max 64 bytes" : null;
  const uriErr = uriBytes > 256 ? "Max 256 bytes" : null;
  const hashErr = contractHash && !isValidHex32(contractHash) ? "Must be 0x + 64 hex chars" : null;
  const supplyErr = isFungible && !/^\d+$/.test(supply) ? "Required positive integer" : null;
  const colErr = collectionId && !/^\d+$/.test(collectionId) ? "Must be a number" : null;

  const canSubmit =
    !!name && !nameErr &&
    !!contractUri && !uriErr &&
    isValidHex32(contractHash) &&
    !supplyErr && !colErr;

  const reset = () => {
    setName(""); setContractUri(""); setContractHash("");
    setIsFungible(false); setSupply(""); setCollectionId("");
  };

  return (
    <>
      <PageHeader
        title="Assets"
        description="Mint a new tokenized asset and look up any asset by ID."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <ExtrinsicForm
          title="Mint New Asset"
          description="Create a new on-chain asset bound to a contract URI and SHA-256 hash."
          canSubmit={canSubmit}
          submitLabel="Mint asset"
          buildTx={(api) =>
            api.tx.assetTokenization.mintAsset(
              name,
              { [assetType]: null },
              contractUri,
              contractHash,
              isFungible,
              isFungible ? supply : null,
              collectionId ? Number(collectionId) : null,
            )
          }
          onSuccess={() => { fireRefresh(); reset(); }}
        >
          <Field label={`Name (${nameBytes}/64 bytes)`} error={nameErr}>
            <TxtInput value={name} onChange={setName} placeholder="My Tokenized Painting" />
          </Field>

          <Field label="Asset type">
            <Select value={assetType} onValueChange={(v: any) => setAssetType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Digital">Digital</SelectItem>
                <SelectItem value="Physical">Physical</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label={`Contract URI (${uriBytes}/256 bytes)`} error={uriErr} hint="e.g. ipfs://Qm…">
            <TxtInput value={contractUri} onChange={setContractUri} placeholder="ipfs://Qm..." mono />
          </Field>

          <Field label="SHA-256 hash of contract" error={hashErr} hint="32 bytes — exactly 64 hex characters">
            <HexHashInput value={contractHash} onChange={setContractHash} />
          </Field>

          <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-3">
            <div>
              <div className="text-sm font-medium">Fungible asset</div>
              <p className="text-xs text-muted-foreground">Toggle for ERC-20-style divisible tokens.</p>
            </div>
            <Switch checked={isFungible} onCheckedChange={setIsFungible} />
          </div>

          {isFungible && (
            <Field label="Fungible supply (u128)" error={supplyErr}>
              <TxtInput value={supply} onChange={setSupply} placeholder="1000000" mono />
            </Field>
          )}

          <Field label="Collection ID (optional)" error={colErr} hint="Leave blank to mint outside any collection.">
            <TxtInput value={collectionId} onChange={setCollectionId} placeholder="42" mono />
          </Field>
        </ExtrinsicForm>

        <AssetLookup />
      </div>
    </>
  );
}
