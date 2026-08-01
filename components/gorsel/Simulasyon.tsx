"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { Simulasyon } from "@/lib/schema";
import { branchColor } from "@/lib/theme";

/**
 * Simülasyon — hareketi KOD hesaplar.
 *
 * Modelden gelen tek şey hangi olayın gösterileceği ve başlangıç değerleridir.
 * Yörünge, süre, menzil — hepsi burada, kapalı formülle hesaplanır. Gerekçe
 * MizanBar'daki hükümle aynı: modelin hesapladığı bir yörünge sessizce yanlış
 * olabilir, kapalı formülün hesapladığı olamaz. Öğrenci resme metinden daha
 * çok inanır; o yüzden resmin doğruluğu modele bırakılamaz.
 *
 * Kullanıcı değerleri değiştirebilir — simülasyonun öğrettiği şey zaten tek bir
 * atış değil, açı ve hız değişince ne olduğudur.
 */

const G = 9.81;

const W = 640;
const H = 300;
const PAD = 34;

type Nokta = { x: number; y: number };

/** Eğik atış: kapalı formül, sürtünmesiz. */
function atisYorunge(hiz: number, aciDerece: number): { yol: Nokta[]; sure: number; menzil: number; tepe: number } {
  const aci = (aciDerece * Math.PI) / 180;
  const vx = hiz * Math.cos(aci);
  const vy = hiz * Math.sin(aci);
  const sure = (2 * vy) / G;
  const menzil = vx * sure;
  const tepe = (vy * vy) / (2 * G);

  const yol: Nokta[] = [];
  const adim = 60;
  for (let i = 0; i <= adim; i++) {
    const t = (sure * i) / adim;
    yol.push({ x: vx * t, y: vy * t - 0.5 * G * t * t });
  }
  return { yol, sure, menzil, tepe };
}

/** Serbest düşüş: yatay hareket yok, yükseklik zamana göre düşer. */
function dususYorunge(yukseklik: number): { yol: Nokta[]; sure: number; carpmaHizi: number } {
  const sure = Math.sqrt((2 * yukseklik) / G);
  const yol: Nokta[] = [];
  const adim = 60;
  for (let i = 0; i <= adim; i++) {
    const t = (sure * i) / adim;
    yol.push({ x: t, y: yukseklik - 0.5 * G * t * t });
  }
  return { yol, sure, carpmaHizi: G * sure };
}

/** Basit sarkaç: küçük genlik yaklaşımı. */
function sarkacPeriyot(uzunluk: number): number {
  return 2 * Math.PI * Math.sqrt(uzunluk / G);
}

function Kaydirici({
  ad,
  birim,
  deger,
  min,
  max,
  adim,
  onChange,
}: {
  ad: string;
  birim: string;
  deger: number;
  min: number;
  max: number;
  adim: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-1 flex-col gap-1">
      <span className="flex items-baseline justify-between">
        <span className="lbl text-[9px] text-muted" lang="tr">
          {ad}
        </span>
        <span className="text-[12px] font-semibold text-ink">
          {deger.toFixed(adim < 1 ? 1 : 0)} {birim}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={adim}
        value={deger}
        onChange={(e) => onChange(Number(e.target.value))}
        className="sim-kaydirici"
        aria-label={`${ad} (${birim})`}
      />
    </label>
  );
}

export default function SimulasyonGorsel({ veri }: { veri: Simulasyon }) {
  const [hiz, setHiz] = useState(veri.hiz ?? 20);
  const [aci, setAci] = useState(veri.aci ?? 45);
  const [yukseklik, setYukseklik] = useState(veri.yukseklik ?? 40);
  const [uzunluk, setUzunluk] = useState(veri.uzunluk ?? 1);

  const [t, setT] = useState(0);
  const [oynuyor, setOynuyor] = useState(false);
  const cerceve = useRef<number | null>(null);
  const sonAn = useRef<number>(0);

  const hesap = useMemo(() => {
    if (veri.model === "atis") {
      const { yol, sure, menzil, tepe } = atisYorunge(hiz, aci);
      return {
        yol,
        sure,
        olcumler: [
          ["Menzil", `${menzil.toFixed(1)} m`],
          ["En yüksek nokta", `${tepe.toFixed(1)} m`],
          ["Havada kalış", `${sure.toFixed(2)} s`],
        ] as const,
      };
    }
    if (veri.model === "serbest-dusus") {
      const { yol, sure, carpmaHizi } = dususYorunge(yukseklik);
      return {
        yol,
        sure,
        olcumler: [
          ["Düşüş süresi", `${sure.toFixed(2)} s`],
          ["Çarpma hızı", `${carpmaHizi.toFixed(1)} m/s`],
        ] as const,
      };
    }
    const periyot = sarkacPeriyot(uzunluk);
    return { yol: [] as Nokta[], sure: periyot, olcumler: [["Periyot", `${periyot.toFixed(2)} s`]] as const };
  }, [veri.model, hiz, aci, yukseklik, uzunluk]);

  // Parametre değişince baştan başla; yarım kalmış bir animasyon yeni
  // yörüngenin ortasından devam ederse gösterdiği şey yanlış olur.
  useEffect(() => {
    setT(0);
  }, [hiz, aci, yukseklik, uzunluk]);

  useEffect(() => {
    if (!oynuyor) {
      if (cerceve.current !== null) cancelAnimationFrame(cerceve.current);
      cerceve.current = null;
      return;
    }
    sonAn.current = performance.now();
    const tik = (an: number) => {
      const fark = (an - sonAn.current) / 1000;
      sonAn.current = an;
      setT((onceki) => {
        const sonraki = onceki + fark;
        // Sarkaç sürekli salınır; atış ve düşüş bitince başa döner.
        return sonraki > hesap.sure ? (veri.model === "sarkac" ? sonraki % hesap.sure : 0) : sonraki;
      });
      cerceve.current = requestAnimationFrame(tik);
    };
    cerceve.current = requestAnimationFrame(tik);
    return () => {
      if (cerceve.current !== null) cancelAnimationFrame(cerceve.current);
    };
  }, [oynuyor, hesap.sure, veri.model]);

  const renk = branchColor(0);
  const vurgu = branchColor(3);

  // Ölçek: yörünge her zaman sahneye sığsın, değerler değişse bile.
  const xMax = Math.max(...hesap.yol.map((p) => p.x), 1);
  const yMax = Math.max(...hesap.yol.map((p) => p.y), 1);
  const px = (x: number) => PAD + (x / xMax) * (W - 2 * PAD);
  const py = (y: number) => H - PAD - (y / yMax) * (H - 2 * PAD);

  const oran = hesap.sure > 0 ? Math.min(t / hesap.sure, 1) : 0;
  const indis = Math.min(Math.round(oran * (hesap.yol.length - 1)), hesap.yol.length - 1);
  const cisim = hesap.yol[indis];

  // Sarkaç yörünge listesiyle değil, açıyla çizilir.
  const sarkacAci = (Math.PI / 7) * Math.cos((2 * Math.PI * t) / hesap.sure);
  const sarkacBoy = H - 2 * PAD;

  return (
    <figure className="gorsel">
      <figcaption className="gorsel-baslik">{veri.baslik}</figcaption>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full min-w-[320px]"
          role="img"
          aria-label={`${veri.baslik} simülasyonu. ${hesap.olcumler
            .map(([ad, deger]) => `${ad}: ${deger}`)
            .join(", ")}.`}
        >
          {veri.model === "sarkac" ? (
            <>
              <line x1={PAD} y1={PAD} x2={W - PAD} y2={PAD} stroke="var(--line)" />
              <line
                x1={W / 2}
                y1={PAD}
                x2={W / 2 + Math.sin(sarkacAci) * sarkacBoy}
                y2={PAD + Math.cos(sarkacAci) * sarkacBoy}
                stroke={renk}
                strokeWidth={1.5}
              />
              <circle
                cx={W / 2 + Math.sin(sarkacAci) * sarkacBoy}
                cy={PAD + Math.cos(sarkacAci) * sarkacBoy}
                r={11}
                fill={vurgu}
              />
            </>
          ) : (
            <>
              <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--line)" />
              <path
                d={hesap.yol
                  .map((p, i) => `${i === 0 ? "M" : "L"} ${px(p.x).toFixed(1)} ${py(p.y).toFixed(1)}`)
                  .join(" ")}
                fill="none"
                stroke={renk}
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
              {/* Katedilen yol kesintisiz, kalan yol kesikli çizilir. */}
              <path
                d={hesap.yol
                  .slice(0, indis + 1)
                  .map((p, i) => `${i === 0 ? "M" : "L"} ${px(p.x).toFixed(1)} ${py(p.y).toFixed(1)}`)
                  .join(" ")}
                fill="none"
                stroke={renk}
                strokeWidth={2.5}
              />
              {cisim ? <circle cx={px(cisim.x)} cy={py(cisim.y)} r={8} fill={vurgu} /> : null}
            </>
          )}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-4">
        <button
          type="button"
          onClick={() => setOynuyor((o) => !o)}
          className="lbl rounded-md px-4 py-2 text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--gold)" }}
          lang="tr"
        >
          {oynuyor ? "Durdur" : "Oynat"}
        </button>

        {veri.model === "atis" ? (
          <>
            <Kaydirici ad="Hız" birim="m/s" deger={hiz} min={5} max={80} adim={1} onChange={setHiz} />
            <Kaydirici ad="Açı" birim="°" deger={aci} min={5} max={85} adim={1} onChange={setAci} />
          </>
        ) : null}
        {veri.model === "serbest-dusus" ? (
          <Kaydirici
            ad="Yükseklik"
            birim="m"
            deger={yukseklik}
            min={5}
            max={200}
            adim={1}
            onChange={setYukseklik}
          />
        ) : null}
        {veri.model === "sarkac" ? (
          <Kaydirici
            ad="İp boyu"
            birim="m"
            deger={uzunluk}
            min={0.2}
            max={10}
            adim={0.1}
            onChange={setUzunluk}
          />
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-1.5">
        {hesap.olcumler.map(([ad, deger]) => (
          <span key={ad} className="text-[12px] text-muted">
            {ad}: <span className="font-semibold text-ink">{deger}</span>
          </span>
        ))}
      </div>

      <p className="mt-2.5 text-center text-[11.5px] italic text-muted">
        Değerleri hesaplayan modelin kendisi değil, uygulamadır.
      </p>
    </figure>
  );
}
