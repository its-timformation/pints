import { useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { trpc } from "../lib/trpc";
import { useAppStore } from "../lib/store";
import { Upload, CheckCircle2, ChevronLeft, Camera } from "lucide-react";

const DRINK_SUGGESTIONS = [
  "Kronenbourg 1664", "1664 Blanc", "Heineken", "Stella Artois", "Carlsberg",
  "Mutzig", "Guinness", "Local IPA", "Vin Chaud", "Génépi Shot",
  "Aperol Spritz", "House Red", "House White", "Espresso", "Hot Chocolate",
  "Picon Bière", "Jägertee", "Mulled Cider"
];
const SIZE_OPTIONS = ["Pint", "50cl", "33cl", "25cl", "4cl Shot", "Glass", "Mug", "Cup"];

export default function SubmitPrice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currency: storeCurrency } = useAppStore();

  const isUpdate = searchParams.get("update") === "1";
  const initialDrink = searchParams.get("drink") || "";
  const initialSize = searchParams.get("size") || "Pint";

  const [drinkName, setDrinkName] = useState(initialDrink);
  const [size, setSize] = useState(initialSize || "Pint");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState(storeCurrency);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: bar } = trpc.bars.getById.useQuery({ id: Number(id) }, { enabled: !!id });
  const submitMutation = trpc.bars.submitPrice.useMutation();

  // For update flow, find existing drink to record previous price
  const existingDrink = isUpdate && bar
    ? bar.drinks.find(d => d.name.toLowerCase() === drinkName.toLowerCase())
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !price || !drinkName) return;
    setUploading(true);
    setErrorMessage(null);
    try {
      let imageUrl: string | undefined;
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          imageUrl = data.url;
        }
      }
      await submitMutation.mutateAsync({
        barId: Number(id),
        drinkName,
        drinkSize: size,
        price: parseFloat(price),
        currency,
        imageUrl,
        submitterName: name.trim() || undefined,
        kind: isUpdate ? "update" : "new",
        previousPrice: existingDrink?.price,
      });
      setSuccess(true);
      setTimeout(() => navigate(`/bar/${id}`), 1800);
    } catch (err: any) {
      const msg = err?.message ?? "Something went wrong. Try again in a moment.";
      setErrorMessage(msg);
    } finally {
      setUploading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[70vh] grain-blaze text-[var(--color-paper)] flex flex-col items-center justify-center px-6 text-center">
        <CheckCircle2 size={56} strokeWidth={2.5} className="mb-6" />
        <div className="text-eyebrow opacity-80 mb-3">SUBMISSION RECEIVED</div>
        <h2 className="text-headline mb-4">PINTS ON<br/>YOU.</h2>
        <p className="opacity-80 text-sm max-w-[28ch]">
          Thanks for keeping the index honest. An admin will review your submission shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="grain-ink pb-10 max-w-md mx-auto">
      <div className="px-4 py-3">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-meta opacity-70 !min-h-0" aria-label="Go back">
          <ChevronLeft size={16} strokeWidth={1.6} />
          BACK
        </button>
      </div>

      <section className="grain-paper text-[var(--color-ink)] px-5 py-6 mx-4">
        <div className="text-eyebrow opacity-60">CONTRIBUTE · {isUpdate ? "PRICE UPDATE" : "NEW PRICE"}</div>
        <h1 className="text-headline mt-2">
          {isUpdate ? <>UPDATE A<br/>PRICE</> : <>REPORT A<br/>NEW PRICE</>}
        </h1>
        {bar && <div className="text-meta opacity-60 mt-3">{bar.name.toUpperCase()} · {bar.area?.toUpperCase()}</div>}
      </section>

      <form onSubmit={handleSubmit} className="px-5 mt-5 space-y-4">
        <Field label="DRINK NAME">
          <input
            type="text"
            list="drink-suggestions"
            value={drinkName}
            onChange={(e) => setDrinkName(e.target.value)}
            required
            disabled={isUpdate}
            className="w-full bg-transparent border border-[var(--color-rule)] text-[var(--color-paper)] px-3 py-3 focus:outline-none focus:border-[var(--color-blaze)] disabled:opacity-50"
            placeholder="e.g. Kronenbourg 1664"
          />
          <datalist id="drink-suggestions">
            {DRINK_SUGGESTIONS.map(d => <option key={d} value={d} />)}
          </datalist>
        </Field>

        <Field label="SIZE">
          <select value={size} onChange={(e) => setSize(e.target.value)}
            className="w-full bg-transparent border border-[var(--color-rule)] text-[var(--color-paper)] px-3 py-3 focus:outline-none focus:border-[var(--color-blaze)]">
            {SIZE_OPTIONS.map(s => <option key={s} value={s} className="bg-[var(--color-ink)]">{s}</option>)}
          </select>
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Field label={isUpdate && existingDrink ? `NEW PRICE (was ${existingDrink.price.toFixed(2)})` : "PRICE"}>
              <input
                type="number" step="0.10" min="0"
                value={price} onChange={(e) => setPrice(e.target.value)} required
                className="w-full bg-transparent border border-[var(--color-rule)] text-[var(--color-paper)] px-3 py-3 focus:outline-none focus:border-[var(--color-blaze)]"
                placeholder="6.50"
              />
            </Field>
          </div>
          <Field label="CURRENCY">
            <select value={currency} onChange={(e) => setCurrency(e.target.value as any)}
              className="w-full bg-transparent border border-[var(--color-rule)] text-[var(--color-paper)] px-3 py-3 focus:outline-none focus:border-[var(--color-blaze)]">
              <option value="GBP" className="bg-[var(--color-ink)]">GBP £</option>
              <option value="EUR" className="bg-[var(--color-ink)]">EUR €</option>
              <option value="CHF" className="bg-[var(--color-ink)]">CHF Fr</option>
            </select>
          </Field>
        </div>

        <Field label="YOUR NAME (OPTIONAL)">
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            maxLength={32}
            className="w-full bg-transparent border border-[var(--color-rule)] text-[var(--color-paper)] px-3 py-3 focus:outline-none focus:border-[var(--color-blaze)]"
            placeholder="Submit anonymously, or add a name"
          />
        </Field>

        <div>
          <label className="block text-eyebrow opacity-60 mb-1.5">PHOTO PROOF</label>
          <label htmlFor="photo-input" className="block border border-dashed border-[var(--color-rule)] px-4 py-6 text-center cursor-pointer hover:border-[var(--color-blaze)] transition-colors">
            {file ? (
              <div className="flex items-center justify-center gap-2 text-meta">
                <CheckCircle2 size={16} className="text-[var(--color-verified)]" />
                {file.name}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Camera size={28} strokeWidth={1.6} className="opacity-60" />
                <span className="text-meta opacity-70">TAP TO ADD PHOTO</span>
                <span className="text-meta opacity-50 normal-case tracking-normal">No faces, please</span>
              </div>
            )}
            <input id="photo-input" type="file" accept="image/*" capture="environment"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="sr-only"
            />
          </label>
          <div className="text-meta opacity-50 mt-2">OPTIONAL · ENABLES VERIFICATION</div>
        </div>

        {errorMessage && (
          <div className="border border-[var(--color-blaze)] bg-[var(--color-blaze)] bg-opacity-10 px-3 py-2.5 text-meta text-[var(--color-blaze)] uppercase">
            {errorMessage}
          </div>
        )}

        <button type="submit" disabled={uploading || !price || !drinkName}
          className="w-full bg-[var(--color-blaze)] text-[var(--color-paper)] py-4 font-display text-xl uppercase disabled:opacity-40 flex items-center justify-center gap-2">
          <Upload size={18} strokeWidth={1.8} />
          {uploading ? "SENDING…" : (isUpdate ? "SUGGEST UPDATE" : "SUBMIT PRICE")}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-eyebrow opacity-60 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
