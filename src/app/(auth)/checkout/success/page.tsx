import Link from "next/link"
import { CheckCircle2, Mail } from "lucide-react"

export default function CheckoutSuccessPage(): React.ReactElement {
  return (
    <div className="border border-border bg-card" style={{ borderRadius: 0 }}>
      <div className="border-b border-border px-6 py-4 border-l-4 border-l-primary">
        <div className="flex flex-col leading-none mb-1">
          <span className="text-[18px] font-black tracking-[0.2em] uppercase text-foreground">PULSE</span>
          <span className="text-[9px] font-semibold tracking-[0.3em] uppercase text-primary">PAGAMENTO CONFIRMADO</span>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-status-success-subtle border border-status-success-border flex items-center justify-center shrink-0" style={{ borderRadius: 0 }}>
            <CheckCircle2 className="w-6 h-6 text-status-success" />
          </div>
          <div>
            <h1 className="text-[13px] font-black uppercase tracking-wider mb-1">Conta sendo criada</h1>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              Em instantes você receberá um e-mail com o link para definir sua senha e acessar a plataforma.
            </p>
          </div>
        </div>

        <div className="border border-border bg-muted/30 px-4 py-3 flex items-start gap-3">
          <Mail className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-foreground mb-0.5">Verifique sua caixa de entrada</p>
            <p className="text-[11px] text-muted-foreground">
              O convite é válido por 7 dias. Se não receber, verifique a pasta de spam.
            </p>
          </div>
        </div>

        <Link
          href="/"
          className="flex items-center justify-center w-full border border-border bg-muted/30 text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all px-4 py-3"
          style={{ borderRadius: 0 }}
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  )
}
