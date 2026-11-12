import { describe, expect, it } from "vitest";
import sample from "./__fixtures__/sample.proposal.json";
import { proposalDataSchema, proposalFileSchema } from "@/lib/schemas/proposal";
import { computeSummary, formatIdr, parsePax, TAX_RATE } from "@/lib/pricing";
import { newProposalData } from "@/lib/proposal-defaults";
import { longDate, replacePlaceholders } from "@/lib/format";

describe("proposal schema", () => {
  it("imports the saved sample file unchanged", () => {
    const file = proposalFileSchema.parse(sample);
    expect(file.app).toBe("oshom-proposal");
    expect(file.data.picName).toBe("Oshom Bali Events Team");
    expect(file.data.terms.length).toBeGreaterThanOrEqual(7);
    expect(file.data.opts.taxMode).toBe("excl");
    expect(file.data.venueKey).toBe("lawn");
    // Round trip: the envelope's data re-parses to the same value.
    expect(proposalDataSchema.parse(file.data)).toEqual(file.data);
    expect(file.data.paymentTerms).toBe(sample.data.paymentTerms);
  });

  it("fills defaults for partial data", () => {
    const d = proposalDataSchema.parse({});
    expect(d.lang).toBe("en");
    expect(d.rundown).toEqual([{ t: "", a: "" }]);
    expect(d.opts.perPerson).toBe(true);
  });

  it("rejects a wrong app id and negative prices", () => {
    expect(proposalFileSchema.safeParse({ ...sample, app: "other" }).success).toBe(false);
    expect(proposalDataSchema.safeParse({ rentalPrice: -1 }).success).toBe(false);
  });
});

describe("pricing", () => {
  it("returns zeros for an empty proposal", () => {
    const s = computeSummary(newProposalData());
    expect(s.subtotal).toBe(0);
    expect(s.tax).toBe(0);
    expect(s.total).toBe(0);
    expect(s.perPerson).toBeNull();
  });

  it("adds 21% tax and service on top in excl mode", () => {
    const d = newProposalData({
      pax: "50",
      rentalPrice: 10_000_000,
      fb: [{ id: "1", name: "Dinner", desc: "", qty: 1, price: 500_000, perPax: true }],
    });
    const s = computeSummary(d);
    expect(s.subtotal).toBe(35_000_000);
    expect(s.tax).toBe(Math.round(35_000_000 * TAX_RATE));
    expect(s.total).toBe(35_000_000 + 7_350_000);
    expect(s.taxParts.government + s.taxParts.service).toBe(s.tax);
    expect(s.taxParts.government).toBe(3_500_000);
    expect(s.deposit + s.balance).toBe(s.total);
    expect(s.perPerson).toBe(Math.round(s.total / 50));
  });

  it("extracts tax from a tax-inclusive total", () => {
    const d = newProposalData({ rentalPrice: 1_210_000 });
    d.opts.taxMode = "incl";
    const s = computeSummary(d);
    expect(s.total).toBe(1_210_000);
    expect(s.subtotal).toBe(1_000_000);
    expect(s.tax).toBe(210_000);
  });

  it("applies no tax in none mode", () => {
    const d = newProposalData({ rentalPrice: 1_000_000 });
    d.opts.taxMode = "none";
    const s = computeSummary(d);
    expect(s.tax).toBe(0);
    expect(s.total).toBe(1_000_000);
  });

  it("applies the seat discount only to seats", () => {
    const d = newProposalData({
      rentalPrice: 1_000_000,
      seats: [{ id: "s", name: "Daybed", desc: "", qty: 4, price: 500_000, perPax: false }],
      seatDisc: { label: "Early bird", pct: "10" },
    });
    d.opts.taxMode = "none";
    const s = computeSummary(d);
    expect(s.seatDiscountAmount).toBe(200_000);
    expect(s.total).toBe(1_000_000 + 2_000_000 - 200_000);
  });

  it("can leave the rental out of the cost summary", () => {
    const d = newProposalData({ rentalPrice: 5_000_000, rentalInSummary: false });
    d.opts.taxMode = "none";
    expect(computeSummary(d).total).toBe(0);
  });

  it("ignores blank rows", () => {
    const d = newProposalData({
      fb: [{ id: "x", name: " ", desc: "", qty: 3, price: 0, perPax: false }],
    });
    expect(computeSummary(d).sections.find((x) => x.key === "fb")?.rows).toHaveLength(0);
  });

  it("parses guest counts defensively", () => {
    expect(parsePax("")).toBe(0);
    expect(parsePax("120 pax")).toBe(120);
    expect(parsePax("-5")).toBe(5);
  });
});

describe("formatting", () => {
  it("formats rupiah with dot grouping", () => {
    expect(formatIdr(0)).toBe("Rp 0");
    expect(formatIdr(1_250_000)).toBe("Rp 1.250.000");
  });

  it("formats long dates without timezone drift", () => {
    expect(longDate("2026-11-11", "en")).toBe("Wednesday 11 November 2026");
    expect(longDate("", "en")).toBe("");
    expect(longDate("nope", "en")).toBe("");
  });

  it("replaces payment placeholders", () => {
    const d = newProposalData({ rentalPrice: 1_000_000 });
    d.opts.taxMode = "none";
    d.balanceDate = "2026-12-01";
    const s = computeSummary(d);
    const out = replacePlaceholders("{DEPOSIT} / {BALANCE_DATE} / {BALANCE}", d, s);
    expect(out).toBe("Rp 500.000 / Tuesday 1 December 2026 / Rp 500.000");
  });
});
