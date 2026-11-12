"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().min(1, "Enter your email").email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});
type Values = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  const login = useMutation({
    mutationFn: async (values: Values) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Could not sign in");
      }
    },
    onSuccess: () => {
      router.replace("/proposals");
      router.refresh();
    },
  });

  return (
    <form onSubmit={handleSubmit((v) => login.mutate(v))} className="space-y-4" noValidate>
      <div>
        <label htmlFor="email" className="mb-1 block text-xs font-semibold tracking-wide text-muted uppercase">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          className="h-11 w-full rounded-lg border border-hair px-3 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email ? <p className="mt-1 text-xs text-red-700">{errors.email.message}</p> : null}
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-xs font-semibold tracking-wide text-muted uppercase">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className="h-11 w-full rounded-lg border border-hair px-3 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password ? <p className="mt-1 text-xs text-red-700">{errors.password.message}</p> : null}
      </div>
      {login.error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {login.error.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={login.isPending}
        className="h-11 w-full rounded-lg bg-teal text-sm font-semibold text-white transition hover:bg-teal-dark disabled:opacity-60"
      >
        {login.isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
