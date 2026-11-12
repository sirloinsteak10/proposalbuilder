"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import type { ProposalInput } from "@/lib/schemas/proposal";
import { inputClass, labelClass, toNum } from "./fields";

type ItemsName = "extraVenues" | "seats" | "ent" | "fb" | "extras" | "items";

const newId = () => Math.random().toString(36).slice(2, 10);

/**
 * Editable list of priced rows. All six item arrays share the same row shape, so the field paths
 * are typed against "fb" and reused for the others.
 */
export function LineItems({ name, addLabel, namePlaceholder }: { name: ItemsName; addLabel: string; namePlaceholder?: string }) {
  const { control, register } = useFormContext<ProposalInput>();
  const { fields, append, remove } = useFieldArray({ control, name });
  const path = (i: number, key: "name" | "desc" | "qty" | "price" | "perPax") => `${name}.${i}.${key}` as `fb.${number}.${typeof key}`;

  return (
    <div className="space-y-3">
      {fields.length === 0 ? <p className="text-xs text-muted">Nothing added yet.</p> : null}
      {fields.map((f, i) => (
        <div key={f.id} className="rounded-lg border border-hair bg-paper/60 p-3">
          <div className="grid grid-cols-1 gap-2">
            <div>
              <label htmlFor={`${name}-${i}-name`} className={labelClass}>
                Name
              </label>
              <input id={`${name}-${i}-name`} className={inputClass} placeholder={namePlaceholder} {...register(path(i, "name"))} />
            </div>
            <div>
              <label htmlFor={`${name}-${i}-desc`} className={labelClass}>
                Description
              </label>
              <input id={`${name}-${i}-desc`} className={inputClass} {...register(path(i, "desc"))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor={`${name}-${i}-qty`} className={labelClass}>
                  Qty
                </label>
                <input
                  id={`${name}-${i}-qty`}
                  type="number"
                  min={0}
                  step={1}
                  className={inputClass}
                  {...register(path(i, "qty"), { setValueAs: toNum })}
                />
              </div>
              <div>
                <label htmlFor={`${name}-${i}-price`} className={labelClass}>
                  Unit price (Rp)
                </label>
                <input
                  id={`${name}-${i}-price`}
                  type="number"
                  min={0}
                  step={1000}
                  className={inputClass}
                  {...register(path(i, "price"), { setValueAs: toNum })}
                />
              </div>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-ink">
              <input type="checkbox" className="h-4 w-4 accent-teal" {...register(path(i, "perPax"))} />
              Price per guest (qty = pax)
            </label>
            <button type="button" onClick={() => remove(i)} className="rounded-md px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50">
              Remove
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => append({ id: newId(), name: "", desc: "", qty: 1, price: 0, perPax: false })}
        className="h-9 w-full rounded-lg border border-dashed border-teal/60 text-sm font-medium text-teal transition hover:bg-teal/5"
      >
        + {addLabel}
      </button>
    </div>
  );
}
