// src/pages/ReviewPage.tsx
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

export default function ReviewPage() {
  const { id } = useParams();          // captionId
  const [data, setData] = useState<any>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/captions/${id}`);
      const json = await res.json();
      setData(json);
      setDraft(json.generated || "");
    })();
  }, [id]);

  if (!data) return <p className="p-6">Loading…</p>;

  return (
    <main className="p-6 space-y-6">
      <img src={data.imageUrl} className="max-w-full rounded-xl shadow" />
      <textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        className="w-full border rounded p-3 font-mono" rows={5}
      />
      {/* sliders for accuracy/context/usability */}
      {/* Save button calls PUT /api/captions/{id} */}
    </main>
  );
}
