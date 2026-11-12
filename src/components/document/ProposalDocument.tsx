"use client";
/* eslint-disable @next/next/no-img-element */

import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { computeSummary, formatIdr, TAX_RATE_LABEL, type PricedRow, type Summary } from "@/lib/pricing";
import { longDate, replacePlaceholders, timeRange, venueLabel } from "@/lib/format";
import { t, type Dict } from "@/lib/i18n";
import type { ProposalData } from "@/lib/schemas/proposal";
import type { VenueDto } from "@/lib/venues";

/* ------------------------------------------------------------------ */
/* Design tokens (Oshom Bali wedding package palette)                  */
/* ------------------------------------------------------------------ */
const C = {
  ink: "#1c1814",
  deep: "#2a241c",
  teal: "#9a7b4f",
  sky: "#c4a574",
  muted: "#6e6458",
  mint: "#e8dfd0",
  hair: "#e2d8c8",
  body: "#3d342a",
};
const MX = 18; // page side margin (mm)
const CONTENT_TOP = 70; // mm, below a two-line title
const CONTENT_TOP_SINGLE = 59.5; // mm, below a one-line title
const CONTENT_CAP = 200; // usable content height (mm), kept slightly conservative

/* ------------------------------------------------------------------ */
/* Inline-edit context                                                 */
/* ------------------------------------------------------------------ */
interface EditCtx {
  edits: Record<string, string>;
  editable: boolean;
  onEdit?: (id: string, value: string, fallback: string) => void;
}
const Ctx = createContext<EditCtx>({ edits: {}, editable: false });

function Ed({
  id,
  text,
  as: Tag = "span",
  style,
}: {
  id: string;
  text: string;
  as?: "span" | "div" | "p";
  style?: CSSProperties;
}) {
  const { edits, editable, onEdit } = useContext(Ctx);
  const value = edits[id] ?? text;
  if (!editable) return <Tag style={{ ...style, whiteSpace: "pre-line" }}>{value}</Tag>;
  return (
    <Tag
      className="editable-text"
      data-edited={id in edits}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      style={{ ...style, whiteSpace: "pre-line" }}
      onBlur={(e) => onEdit?.(id, e.currentTarget.textContent ?? "", text)}
    >
      {value}
    </Tag>
  );
}

/* ------------------------------------------------------------------ */
/* Layout atoms                                                        */
/* ------------------------------------------------------------------ */
const labelStyle: CSSProperties = {
  fontSize: "6.6pt",
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: C.muted,
};

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: "7.6pt",
        fontWeight: 700,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: C.teal,
        borderBottom: `0.3mm solid ${C.teal}`,
        paddingBottom: "1.8mm",
        marginBottom: "3mm",
      }}
    >
      {children}
    </div>
  );
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <li style={{ display: "flex", gap: "3mm", alignItems: "flex-start", fontSize: "8.4pt", padding: "0.9mm 0", color: C.ink, breakInside: "avoid" }}>
      <span style={{ width: "1.5mm", height: "1.5mm", background: C.teal, marginTop: "1.7mm", flex: "none" }} />
      <span>{children}</span>
    </li>
  );
}

function Field({ label, children, sub, labelWidth = 28 }: { label: string; children: ReactNode; sub?: string; labelWidth?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `${labelWidth}mm 1fr`, padding: "1.7mm 0", alignItems: "start" }}>
      <div style={{ ...labelStyle, paddingTop: "0.6mm" }}>{label}</div>
      <div style={{ fontSize: "9pt", color: C.ink, overflowWrap: "anywhere" }}>
        {children}
        {sub ? <div style={{ fontSize: "7.4pt", color: C.muted, marginTop: "0.4mm" }}>{sub}</div> : null}
      </div>
    </div>
  );
}

function Sheet({
  pageNo,
  title,
  accent,
  data,
  tr,
  children,
  showMark = true,
}: {
  pageNo: number;
  title: string;
  accent?: string;
  data: ProposalData;
  tr: Dict;
  children: ReactNode;
  showMark?: boolean;
}) {
  const date = longDate(data.issueDate, data.lang).toUpperCase();
  return (
    <section className="sheet">
      <div style={{ position: "absolute", left: `${MX}mm`, right: `${MX}mm`, top: "16mm", display: "flex", justifyContent: "space-between" }}>
        <img src="/brand/logo-teal.png" alt="Oshom Bali" style={{ width: "24mm", height: "auto", display: "block" }} />
        <div style={{ textAlign: "right", fontSize: "6.4pt", letterSpacing: "0.12em", color: C.muted, textTransform: "uppercase", lineHeight: 1.6 }}>
          <div>{tr.eventProposal}</div>
          <div>{date}</div>
        </div>
      </div>
      <div style={{ position: "absolute", left: `${MX}mm`, right: `${MX}mm`, top: "29.5mm", borderTop: `0.25mm solid ${C.hair}` }} />
      <div style={{ position: "absolute", left: `${MX}mm`, right: `${MX}mm`, top: "39mm" }}>
        <div style={{ fontSize: "19pt", fontWeight: 700, lineHeight: 1.12, textTransform: "uppercase", color: C.ink }}>
          {title}
          {accent ? <div style={{ color: C.teal }}>{accent}</div> : null}
        </div>
        {showMark ? (
          <img src="/brand/mark-teal.png" alt="" style={{ width: "11mm", marginTop: "3.5mm", opacity: 0.35, display: "block" }} />
        ) : null}
      </div>
      <div style={{ position: "absolute", left: `${MX}mm`, right: `${MX}mm`, top: `${accent ? CONTENT_TOP : CONTENT_TOP_SINGLE}mm`, bottom: "17mm", overflow: "hidden" }}>
        {children}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "11mm",
          background: C.deep,
          color: C.mint,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `0 ${MX}mm`,
          fontSize: "5.9pt",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        <span style={{ color: "#9cc2c5" }}>{tr.footer}</span>
        <span style={{ color: "#fff", fontWeight: 700 }}>
          {tr.page} {pageNo}
        </span>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Pagination                                                          */
/* ------------------------------------------------------------------ */
interface Block {
  key: string;
  /** Estimated rendered height in mm. Estimates are deliberately a little generous. */
  h: number;
  node: ReactNode;
  keepNext?: boolean;
}

function paginate(blocks: Block[], cap = CONTENT_CAP): Block[][] {
  const pages: Block[][] = [[]];
  let used = 0;
  blocks.forEach((b, i) => {
    const next = blocks[i + 1];
    const need = b.h + (b.keepNext && next ? Math.min(next.h, 24) : 0);
    if (used > 0 && used + need > cap) {
      pages.push([]);
      used = 0;
    }
    pages[pages.length - 1].push(b);
    used += b.h;
  });
  return pages;
}

const textLines = (text: string, charsPerLine: number) =>
  text.split("\n").reduce((n, l) => n + Math.max(1, Math.ceil(l.length / charsPerLine)), 0);

/* ------------------------------------------------------------------ */
/* Pricing blocks                                                      */
/* ------------------------------------------------------------------ */
const COLS = "1fr 14mm 30mm 32mm";

function PriceHead({ tr }: { tr: Dict }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: COLS, gap: "2mm", ...labelStyle, padding: "1.2mm 2mm" }}>
      <span>{tr.description}</span>
      <span style={{ textAlign: "right" }}>{tr.qty}</span>
      <span style={{ textAlign: "right" }}>{tr.unitPrice}</span>
      <span style={{ textAlign: "right" }}>{tr.amount}</span>
    </div>
  );
}

function PriceRow({ row }: { row: PricedRow }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: COLS,
        gap: "2mm",
        padding: "1.6mm 2mm",
        borderTop: `0.2mm solid ${C.hair}`,
        fontSize: "8.4pt",
        alignItems: "start",
      }}
    >
      <div style={{ overflowWrap: "anywhere" }}>
        <div style={{ fontWeight: 500 }}>{row.name || "—"}</div>
        {row.desc ? <div style={{ fontSize: "7.4pt", color: C.muted, whiteSpace: "pre-line" }}>{row.desc}</div> : null}
      </div>
      <div style={{ textAlign: "right", color: C.body }}>
        {row.qty.toLocaleString("id-ID")}
        {row.perPax ? "×" : ""}
      </div>
      <div style={{ textAlign: "right", color: C.body }}>{formatIdr(row.unit)}</div>
      <div style={{ textAlign: "right", fontWeight: 600 }}>{formatIdr(row.amount)}</div>
    </div>
  );
}

const rowHeight = (r: PricedRow) => 7.2 + (textLines(r.name, 52) - 1) * 3.6 + (r.desc ? textLines(r.desc, 70) * 3.2 : 0);

function summaryBlock(data: ProposalData, s: Summary, tr: Dict): Block {
  const split = data.opts.splitTax && data.opts.taxMode !== "none";
  const taxLabel = `${tr.taxService} ${TAX_RATE_LABEL}`;
  const noteText =
    data.opts.taxMode === "incl" ? tr.priceNoteIncl : data.opts.taxMode === "none" ? tr.priceNoteNone : tr.priceNoteExcl;
  const line = (label: string, value: string, key: string, bold = false) => (
    <div
      key={key}
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "2.2mm 3mm",
        fontSize: bold ? "9pt" : "8.4pt",
        fontWeight: bold ? 700 : 400,
        color: bold ? C.ink : C.muted,
        borderBottom: `0.2mm solid ${C.hair}`,
      }}
    >
      <span>{label}</span>
      <span style={{ color: C.ink, fontWeight: bold ? 700 : 400 }}>{value}</span>
    </div>
  );
  const rows: ReactNode[] = [];
  if (s.seatDiscountAmount > 0) {
    rows.push(line(`${tr.discount}${data.seatDisc.label ? `: ${data.seatDisc.label}` : ""} (${s.seatDiscountPct}%)`, formatIdr(-s.seatDiscountAmount), "disc"));
  }
  rows.push(line(tr.subtotal, formatIdr(s.subtotal), "sub", true));
  if (data.opts.taxMode !== "none") {
    if (split) {
      rows.push(line(`${tr.govTax} 10%`, formatIdr(s.taxParts.government), "gov"));
      rows.push(line(`${tr.serviceCharge} 11%`, formatIdr(s.taxParts.service), "svc"));
    } else {
      rows.push(line(taxLabel, formatIdr(s.tax), "tax"));
    }
  }
  const h = 8 + rows.length * 7.4 + 12 + (data.opts.perPerson && s.perPerson ? 8 : 0) + 14;
  return {
    key: "summary",
    h,
    node: (
      <div>
        <div style={{ borderTop: `0.3mm solid ${C.teal}`, marginTop: "4mm" }}>{rows}</div>
        <div
          style={{
            background: C.deep,
            color: "#fff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "3.4mm 3mm",
          }}
        >
          <span style={{ fontSize: "7.4pt", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" }}>{tr.total}</span>
          <span style={{ fontSize: "11pt", fontWeight: 700 }}>{formatIdr(s.total)}</span>
        </div>
        {data.opts.perPerson && s.perPerson ? (
          <div style={{ display: "flex", justifyContent: "space-between", padding: "2mm 3mm", fontSize: "8pt", color: C.muted }}>
            <span>
              {tr.perPerson} ({s.pax} {tr.pax})
            </span>
            <span style={{ color: C.ink, fontWeight: 600 }}>{formatIdr(s.perPerson)}</span>
          </div>
        ) : null}
        <div style={{ borderTop: `0.2mm solid ${C.hair}`, marginTop: "4mm", paddingTop: "3mm", fontSize: "7pt", color: C.muted }}>
          <Ed id="pricing.note" text={noteText} as="div" />
        </div>
      </div>
    ),
  };
}

function pricingBlocks(data: ProposalData, s: Summary, tr: Dict): Block[] {
  const blocks: Block[] = [{ key: "h-cost", h: 10, keepNext: true, node: <SectionHeading>{tr.costSummary}</SectionHeading> }];
  const usedSections = s.sections.filter((sec) => sec.rows.length > 0);
  usedSections.forEach((sec) => {
    blocks.push({
      key: `sh-${sec.key}`,
      h: 14,
      keepNext: true,
      node: (
        <div style={{ marginTop: "1mm" }}>
          <div style={{ fontSize: "8.6pt", fontWeight: 700, color: C.ink, padding: "1.5mm 2mm 0" }}>{tr.sections[sec.key]}</div>
          <PriceHead tr={tr} />
        </div>
      ),
    });
    sec.rows.forEach((r, i) => blocks.push({ key: `r-${sec.key}-${i}`, h: rowHeight(r), node: <PriceRow row={r} /> }));
    if (sec.key === "seats" && data.seatCredit) {
      blocks.push({
        key: "seatcredit",
        h: 6,
        node: <div style={{ padding: "1.5mm 2mm", fontSize: "7.2pt", color: C.teal, borderTop: `0.2mm solid ${C.hair}` }}>{tr.seatCreditNote}</div>,
      });
    }
  });
  blocks.push(summaryBlock(data, s, tr));

  const rundown = data.rundown.filter((r) => r.t.trim() || r.a.trim());
  if (rundown.length) {
    blocks.push({ key: "h-rundown", h: 22, keepNext: true, node: <div style={{ marginTop: "8mm" }}><SectionHeading>{tr.rundown}</SectionHeading></div> });
    rundown.forEach((r, i) =>
      blocks.push({
        key: `rd-${i}`,
        h: 4 + textLines(r.a, 80) * 3.8,
        node: (
          <div style={{ display: "grid", gridTemplateColumns: "28mm 1fr", gap: "3mm", padding: "1.6mm 2mm", borderTop: `0.2mm solid ${C.hair}`, fontSize: "8.4pt" }}>
            <span style={{ fontWeight: 700, color: C.teal }}>{r.t}</span>
            <span style={{ whiteSpace: "pre-line", overflowWrap: "anywhere" }}>{r.a}</span>
          </div>
        ),
      }),
    );
  }
  if (data.extrasCustom.trim()) {
    blocks.push({ key: "h-extras", h: 22, keepNext: true, node: <div style={{ marginTop: "8mm" }}><SectionHeading>{tr.extrasNotes}</SectionHeading></div> });
    blocks.push({
      key: "extras-text",
      h: 4 + textLines(data.extrasCustom, 100) * 3.8,
      node: <div style={{ fontSize: "8.4pt", whiteSpace: "pre-line", color: C.body }}>{data.extrasCustom}</div>,
    });
  }
  return blocks;
}

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */
function CoverPage({ data, tr, venueName, summaryDate }: { data: ProposalData; tr: Dict; venueName: string; summaryDate: string }) {
  const prepared = [data.guestName.trim(), data.company.trim()].filter(Boolean).join(" · ") || "—";
  const dayDate = longDate(data.eventDate, data.lang) || tr.tbc;
  return (
    <section className="sheet" style={{ background: C.deep }}>
      <img src="/brand/cover.jpg" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "url(/brand/background.png)", backgroundSize: "100% 100%", opacity: 0.92 }} />
      <img src="/brand/lockup-white.png" alt="Oshom Bali" style={{ position: "absolute", left: "17.5mm", top: "17mm", width: "47mm" }} />
      <img src="/brand/mark-white.png" alt="" style={{ position: "absolute", left: "18mm", top: "249mm", width: "14mm", opacity: 0.55 }} />
      <div style={{ position: "absolute", left: "18mm", right: "18mm", top: "211mm" }}>
        <div style={{ fontSize: "6.4pt", fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color: C.mint }}>{tr.eventProposal}</div>
        <div style={{ fontSize: "30pt", fontWeight: 700, lineHeight: 1.08, textTransform: "uppercase", color: "#fff", marginTop: "3mm" }}>{tr.yourEvent}</div>
        <div style={{ fontSize: "30pt", fontWeight: 700, lineHeight: 1.08, textTransform: "uppercase", color: C.sky }}>{venueName}</div>
      </div>
      <div style={{ position: "absolute", left: "18mm", right: "18mm", top: "266mm", borderTop: `0.3mm solid ${C.sky}`, paddingTop: "3mm", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6mm", color: "#fff" }}>
        {[
          [tr.preparedFor, prepared],
          [tr.dayDate, dayDate],
          [tr.issuedOn, summaryDate],
        ].map(([label, value]) => (
          <div key={label}>
            <div style={{ fontSize: "5.9pt", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: C.mint }}>{label}</div>
            <div style={{ fontSize: "7.4pt", marginTop: "1mm", color: "#e7ded0", overflowWrap: "anywhere" }}>{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ContactPage({ data, tr, venueName, pageNo }: { data: ProposalData; tr: Dict; venueName: string; pageNo: number }) {
  const dash = "—";
  const pics = [
    { name: data.picName, title: data.picTitle, email: data.picEmail, phone: data.picPhone },
    { name: data.pic2Name, title: data.pic2Title, email: data.pic2Email, phone: data.pic2Phone },
  ].filter((p) => p.name.trim());
  return (
    <Sheet pageNo={pageNo} title={tr.eventPart1} accent={tr.eventPart2} data={data} tr={tr}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9mm" }}>
        <div>
          <SectionHeading>{tr.contactDetails}</SectionHeading>
          <Field label={tr.guestName}>{data.guestName || dash}</Field>
          <Field label={tr.company}>{data.company || dash}</Field>
          {pics.map((p, i) => (
            <div key={i}>
              <Field label={tr.oshomPic} sub={p.title}>
                {p.name}
              </Field>
              <Field label={tr.email}>{p.email || dash}</Field>
              <Field label={tr.phone}>{p.phone || dash}</Field>
            </div>
          ))}
        </div>
        <div>
          <SectionHeading>{tr.eventDetails}</SectionHeading>
          <Field label={tr.eventName} labelWidth={40}>{data.eventName || dash}</Field>
          <Field label={tr.dayDate} labelWidth={40}>{longDate(data.eventDate, data.lang) || tr.tbc}</Field>
          <Field label={tr.time} labelWidth={40}>{timeRange(data.timeFrom, data.timeTo, tr.tbc)}</Field>
          <Field label={tr.venue} labelWidth={40}>{venueName}</Field>
          <Field label={tr.guestAttendance} labelWidth={40}>
            {data.pax || dash} {tr.pax}
          </Field>
        </div>
      </div>
      <div style={{ marginTop: "10mm" }}>
        <SectionHeading>{tr.included}</SectionHeading>
        <ul style={{ columnCount: 2, columnGap: "9mm", listStyle: "none", padding: 0, margin: 0 }}>
          {tr.includedList.map((item, i) => (
            <Bullet key={i}>
              <Ed id={`included.${i}`} text={item} />
            </Bullet>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}

function VenuePage({ data, tr, venue, pageNo }: { data: ProposalData; tr: Dict; venue: VenueDto; pageNo: number }) {
  const pax = data.pax.trim() ? data.pax : "—";
  return (
    <Sheet pageNo={pageNo} title={venue.name} data={data} tr={tr}>
      {venue.tagline ? (
        <div style={{ fontSize: "7.4pt", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: C.teal, marginBottom: "3mm" }}>
          <Ed id="venue.tagline" text={venue.tagline} />
        </div>
      ) : null}
      {venue.imageUrl ? (
        <img src={venue.imageUrl} alt={venue.name} style={{ width: "100%", height: "62mm", objectFit: "cover", display: "block" }} />
      ) : null}
      <p style={{ fontSize: "9.4pt", lineHeight: 1.75, margin: "6mm 0", color: C.ink, maxWidth: "136mm" }}>
        <Ed id="venue.description" text={venue.description} />
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", border: `0.2mm solid ${C.hair}`, borderLeft: `0.8mm solid ${C.teal}` }}>
        {[
          [tr.seated, venue.seated ?? "—"],
          [tr.standing, venue.standing ?? "—"],
          [tr.guestAttendance, pax],
        ].map(([label, value], i) => (
          <div key={i} style={{ padding: "3mm 4mm", borderLeft: i ? `0.2mm solid ${C.hair}` : undefined }}>
            <div style={{ fontSize: "5.9pt", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: C.muted }}>{label}</div>
            <div style={{ fontSize: "13pt", fontWeight: 700, color: C.teal }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9mm", marginTop: "8mm" }}>
        <div>
          <SectionHeading>{tr.features}</SectionHeading>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {venue.features.map((f, i) => (
              <Bullet key={i}>{f}</Bullet>
            ))}
          </ul>
        </div>
        <div>
          <SectionHeading>{tr.suitableFor}</SectionHeading>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {venue.suitableFor.map((f, i) => (
              <Bullet key={i}>{f}</Bullet>
            ))}
          </ul>
        </div>
      </div>
    </Sheet>
  );
}

function ClosingPage({ data, tr, pageNo }: { data: ProposalData; tr: Dict; pageNo: number }) {
  const signer = data.pic2Name.trim()
    ? { name: data.pic2Name, title: data.pic2Title }
    : { name: data.picName, title: data.picTitle };
  const contacts = [
    { name: data.picName, title: data.picTitle, email: data.picEmail, phone: data.picPhone },
    { name: data.pic2Name, title: data.pic2Title, email: data.pic2Email, phone: data.pic2Phone },
  ].filter((p) => p.name.trim());
  return (
    <Sheet pageNo={pageNo} title={tr.acceptancePart1} accent={tr.acceptancePart2} data={data} tr={tr}>
      <SectionHeading>{tr.acceptance}</SectionHeading>
      <p style={{ fontSize: "9pt", lineHeight: 1.7, maxWidth: "130mm", margin: 0 }}>
        <Ed id="accept.text" text={tr.acceptanceText} />
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9mm", marginTop: "13mm" }}>
        <div>
          <div style={{ borderTop: `0.3mm solid ${C.ink}`, height: "1mm" }} />
          <div style={{ ...labelStyle, marginTop: "6mm" }}>{tr.clientSignature}</div>
          <div style={{ fontSize: "7pt", color: C.muted, marginTop: "5mm" }}>{tr.nameDate}</div>
        </div>
        <div>
          <div style={{ borderTop: `0.3mm solid ${C.ink}`, height: "1mm" }} />
          <div style={{ ...labelStyle, marginTop: "6mm" }}>{tr.onBehalf}</div>
          <div style={{ fontSize: "7pt", color: C.muted, marginTop: "1.6mm" }}>
            {signer.name}
            {signer.title ? ` · ${signer.title}` : ""}
          </div>
          <div style={{ fontSize: "7pt", color: C.muted }}>{tr.nameDate}</div>
        </div>
      </div>
      <div style={{ position: "relative", background: C.deep, color: "#fff", marginTop: "11mm", padding: "8mm 8mm 9mm", overflow: "hidden" }}>
        <img src="/brand/mark-white.png" alt="" style={{ position: "absolute", right: "6mm", top: "5mm", width: "32mm", opacity: 0.22 }} />
        <div style={{ fontSize: "12pt", fontWeight: 700, textTransform: "uppercase" }}>
          {tr.letsPlan1} <span style={{ color: C.sky }}>{tr.letsPlan2}</span>
        </div>
        <p style={{ fontSize: "8pt", lineHeight: 1.6, maxWidth: "95mm", margin: "2.5mm 0 5mm", color: "#dbeeee" }}>
          <Ed id="closing.text" text={tr.letsPlanText} />
        </p>
        {contacts.map((p, i) => (
          <div key={i} style={{ fontSize: "7.6pt", lineHeight: 1.7, color: C.mint }}>
            <div>
              {p.name}
              {p.title ? ` · ${p.title}` : ""}
            </div>
            <div>{[p.email, p.phone].filter(Boolean).join(" · ")}</div>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Document                                                            */
/* ------------------------------------------------------------------ */
export interface ProposalDocumentProps {
  data: ProposalData;
  venue: VenueDto | null;
  editable?: boolean;
  onEdit?: (id: string, value: string, fallback: string) => void;
}

export function ProposalDocument({ data, venue, editable = false, onEdit }: ProposalDocumentProps) {
  const tr = t(data.lang);
  const s = computeSummary(data);
  const venueName = venueLabel(data, venue?.name);
  const issued = longDate(data.issueDate, data.lang) || "—";

  type Page = (n: number) => ReactNode;
  const pages: Page[] = [];

  pages.push((n) => <ContactPage key="contact" data={data} tr={tr} venueName={venueName} pageNo={n} />);

  const pricing = paginate(pricingBlocks(data, s, tr));
  pricing.forEach((blocks, idx) =>
    pages.push((n) => (
      <Sheet key={`pricing-${idx}`} pageNo={n} title={tr.proposalPart1} accent={tr.proposalPart2} data={data} tr={tr}>
        {blocks.map((b) => (
          <div key={b.key}>{b.node}</div>
        ))}
      </Sheet>
    )),
  );

  if (data.opts.venuePage && venue && data.venueKey !== "other") {
    pages.push((n) => <VenuePage key="venue" data={data} tr={tr} venue={venue} pageNo={n} />);
  }

  const menuItems = s.sections.find((x) => x.key === "fb")?.rows ?? [];
  if (data.opts.menuPage && (menuItems.length > 0 || data.fbNotes.trim())) {
    const blocks: Block[] = [];
    menuItems.forEach((r, i) =>
      blocks.push({
        key: `m${i}`,
        h: 8 + (r.desc ? textLines(r.desc, 95) * 3.6 : 0),
        node: (
          <div style={{ padding: "2mm 0", borderBottom: `0.2mm solid ${C.hair}` }}>
            <div style={{ fontSize: "9pt", fontWeight: 600 }}>{r.name || "—"}</div>
            {r.desc ? <div style={{ fontSize: "8pt", color: C.muted, whiteSpace: "pre-line" }}>{r.desc}</div> : null}
          </div>
        ),
      }),
    );
    if (data.fbNotes.trim()) {
      blocks.push({ key: "mn-h", h: 20, keepNext: true, node: <div style={{ marginTop: "7mm" }}><SectionHeading>{tr.fbNotes}</SectionHeading></div> });
      blocks.push({
        key: "mn",
        h: 4 + textLines(data.fbNotes, 100) * 3.8,
        node: <div style={{ fontSize: "8.4pt", whiteSpace: "pre-line", color: C.body }}>{data.fbNotes}</div>,
      });
    }
    paginate(blocks).forEach((pg, idx) =>
      pages.push((n) => (
        <Sheet key={`menu-${idx}`} pageNo={n} title={tr.sections.fb} data={data} tr={tr}>
          {pg.map((b) => (
            <div key={b.key}>{b.node}</div>
          ))}
        </Sheet>
      )),
    );
  }

  // Terms
  const paymentLines = replacePlaceholders(data.paymentTerms, data, s)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const termBlocks: Block[] = [];
  if (paymentLines.length) {
    termBlocks.push({ key: "ph", h: 10, keepNext: true, node: <SectionHeading>{tr.paymentTerms}</SectionHeading> });
    paymentLines.forEach((l, i) =>
      termBlocks.push({
        key: `pl${i}`,
        h: 1.2 + textLines(l, 108) * 4.1,
        node: <div style={{ fontSize: "8.4pt", lineHeight: 1.55, padding: "0.5mm 0", overflowWrap: "anywhere" }}>{l}</div>,
      }),
    );
  }
  if (data.terms.length) {
    termBlocks.push({ key: "th", h: 20, keepNext: true, node: <div style={{ marginTop: "7mm" }}><SectionHeading>{tr.termsAndConditions}</SectionHeading></div> });
    data.terms.forEach((term, i) =>
      termBlocks.push({
        key: `t${i}`,
        h: 2.4 + textLines(term, 100) * 4.1,
        node: (
          <div style={{ display: "grid", gridTemplateColumns: "5mm 1fr", fontSize: "8.1pt", lineHeight: 1.55, padding: "0.9mm 0" }}>
            <span style={{ fontWeight: 700, color: C.teal }}>{i + 1}.</span>
            <span style={{ overflowWrap: "anywhere" }}>{term}</span>
          </div>
        ),
      }),
    );
  }
  if (termBlocks.length) {
    paginate(termBlocks).forEach((pg, idx) =>
      pages.push((n) => (
        <Sheet key={`terms-${idx}`} pageNo={n} title={tr.termsPart1} accent={tr.termsPart2} data={data} tr={tr}>
          {pg.map((b) => (
            <div key={b.key}>{b.node}</div>
          ))}
        </Sheet>
      )),
    );
  }

  if (data.opts.closing) pages.push((n) => <ClosingPage key="closing" data={data} tr={tr} pageNo={n} />);

  return (
    <Ctx.Provider value={{ edits: data.edits, editable, onEdit }}>
      <div className="doc-root">
        {data.opts.cover ? <CoverPage data={data} tr={tr} venueName={venueName} summaryDate={issued} /> : null}
        {pages.map((render, i) => render(i + 1))}
      </div>
    </Ctx.Provider>
  );
}
