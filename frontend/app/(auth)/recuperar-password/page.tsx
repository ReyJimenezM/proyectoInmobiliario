"use client";

import { useState } from "react";

export default function RecuperarPasswordPage() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviado(true);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-center text-2xl font-semibold text-ink-900">Recuperar contraseña</h1>

      <div className="card mt-8 p-6">
        {enviado ? (
          <p className="text-sm text-ink-700">
            Si existe una cuenta asociada a <strong>{email}</strong>, en producción se enviaría un
            correo con instrucciones para restablecer la contraseña.
            <span className="mt-2 block rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
              Flujo simulado para este demo — no se envía ningún correo real.
            </span>
          </p>
        ) : (
          <form onSubmit={enviar} className="space-y-4">
            <div>
              <label className="label-field">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
              />
            </div>
            <button type="submit" className="btn-primary w-full">
              Enviar instrucciones
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
